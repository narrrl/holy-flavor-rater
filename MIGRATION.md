# Django → Rust migration runbook (seamless, reversible)

Migrate the running Django backend to the Rust backend (`backend-rs/`) with
**zero downtime** and a **per-step rollback**. Endpoint groups cut over one at a
time behind nginx; either backend can serve any request, so rollback is just the
reverse edit and data never forks.

There is a driver script that performs every step below:
`scripts/cutover.sh` (run `scripts/cutover.sh` with no args for the menu). Do the
steps manually or let the script do them — both edit the same files.

---

## Why it's safe

Both backends share one substrate, so a request is serviceable by either:

| Shared thing | How |
|---|---|
| Database | same `backend/db.sqlite3` (WAL on), bind-mounted into both containers |
| Media | same `backend/media/`; nginx serves `/media/` straight from the mount (`:ro`) |
| Auth | same `SECRET_KEY` → SimpleJWT HS256 tokens verify on both; cookies cross-valid |
| Token blacklist | shared `token_blacklist_*` tables → logout/refresh consistent across a flip |

**The one invariant — never violate:** exactly **one** scheduler may own the
`api_job` table at a time. Django's Celery `beat` owns it until Phase 3; the Rust
in-process scheduler (`ENABLE_SCHEDULER`) stays **false** until then. Never both,
or scheduled jobs fire twice.

---

## Prerequisites

1. **`SECRET_KEY` in `.env` must equal Django's exact value.** If it differs, all
   existing JWTs break the instant you cut over auth. Verify before starting.
2. Back up first: `bash scripts/backup.sh` (snapshots SQLite + media).
3. Optionally enable **live nginx reloads** so flips don't rebuild the frontend
   image. Add to the `frontend` service in `docker-compose.yml`:
   ```yaml
       volumes:
         - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf
         - ./frontend/proxy_params.conf:/etc/nginx/proxy_params.conf
   ```
   then `docker compose up -d frontend`. Without this, each phase rebuilds the
   frontend image (`docker compose up -d --build frontend`) — slower, but still
   no API downtime. (`scripts/cutover.sh dev-mount` prints these lines.)

---

## Phase 0 — Deploy Rust in shadow (no traffic)

Bring up `holy-rust` beside Django. It only reads; nginx still sends all traffic
to Django.

```bash
docker compose up -d --build backend-rs        # or: scripts/cutover.sh phase0
```

Smoke-test it directly, bypassing nginx:

```bash
docker exec holy-frontend wget -qO- http://holy-rust:8001/health/   # or: scripts/cutover.sh smoke
```

Spot-check a few endpoints against `holy-rust:8001` and compare to Django.

**Rollback:** `docker compose stop backend-rs`.

---

## Phase 1 — Reads

Lowest risk: read-only, no auth side effects.

Flip these locations in `frontend/nginx.conf` from `django_backend` →
`rust_backend`, then reload:

- `/api/categories/`
- `/api/flavors/`
- `/api/banners/`

```bash
scripts/cutover.sh phase1
```

Watch `docker logs holy-rust` and your error rate for a few minutes.

**Rollback:** `scripts/cutover.sh rollback 1`.

---

## Phase 2 — Auth + writes

JWTs and cookies are cross-valid, so logged-in sessions survive the flip.

Flip:

- `/api/auth/`
- `= /api/token/` (legacy JWT alias)
- `/api/ratings/`
- `/api/replies/`
- `/api/users/`
- `/api/notifications/`
- `/api/tickets/`

```bash
scripts/cutover.sh phase2
```

**Rollback:** `scripts/cutover.sh rollback 2`.

---

## Phase 3 — Admin + jobs (the careful one)

This is the only step that touches the scheduler invariant. Do it in order.

1. Flip `/api/admin-custom/` → `rust_backend`, reload.
2. **Stop Django's scheduler/workers** so nobody schedules:
   ```bash
   docker compose stop beat worker flower
   ```
3. **Hand scheduling to Rust:** set `RUST_ENABLE_SCHEDULER=true` in `.env`, then
   recreate the Rust container:
   ```bash
   docker compose up -d backend-rs
   ```
4. Confirm single ownership:
   ```bash
   docker logs holy-rust | grep "job scheduler ENABLED"
   ```

```bash
scripts/cutover.sh phase3        # does 1-4, prompts before the handover
```

At no point are both schedulers on → no double-run.

**Rollback:** `scripts/cutover.sh rollback 3` — sets `RUST_ENABLE_SCHEDULER=false`,
recreates `backend-rs`, restarts `beat worker flower`, flips admin back to Django.

---

## Phase 4 — Retire Django

Point the catch-all at Rust. Rust also serves OpenAPI + Swagger, so `/api/schema`
goes with it.

1. Flip `location /api/` and `/api/schema` → `rust_backend`, reload:
   ```bash
   scripts/cutover.sh phase4
   ```
   Django now receives only `/admin/` + `/static/` (its own admin site). `/media/`
   is already served straight from nginx, independent of either backend.
2. Decide the Django admin site's fate. The app's admin UI uses
   `/api/admin-custom/` (now on Rust), so Django `/admin/` is usually unneeded:
   - **Keep it:** leave `backend` up for `/admin/` + `/static/`.
   - **Drop it:** `docker compose stop backend`, then delete the `/admin/` and
     `/static/` location blocks from `nginx.conf` and reload.
3. Once Django is fully off, stop Redis (only a Celery broker + Django cache —
   Rust uses neither):
   ```bash
   docker compose stop redis
   ```
4. Eventually remove `backend`, `worker`, `beat`, `flower`, `redis` from
   `docker-compose.yml`.

**Rollback:** `scripts/cutover.sh rollback 4` (before removing services).

---

## Verify anytime

```bash
scripts/cutover.sh status     # current routing per group + scheduler ownership
```

---

## Notes / caveats

- **Rate-limit counters reset at cutover.** Django's `django_ratelimit` lives in
  Redis; Rust's throttle is in-process. Acceptable — windows are minutes/hours.
- **Reloads:** if the conf is baked into the image (default), a flip rebuilds the
  frontend image. Bind-mount the conf (see Prerequisites) for instant
  `nginx -s reload`. The script auto-detects which mode you're in.
- **Canonical data:** `backend/db.sqlite3` + `backend/media/` are host bind
  mounts — never recreated by rebuilds. Keep them; they're the source of truth
  the whole time.
- The same content lives in `backend-rs/README.md` ("Production cutover runbook")
  as the in-tree reference.
