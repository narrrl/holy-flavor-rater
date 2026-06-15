# holy_backend_rs — Rust backend (strangler migration)

Incremental Rust rewrite of the Django backend. Both backends run side by side
and **share the same SQLite file**; an nginx proxy routes already-ported
endpoint groups to Rust and everything else to Django. Endpoints move group by
group until Django can be retired.

- **Web**: Axum 0.8 + utoipa (OpenAPI) + Swagger UI
- **DB**: SeaORM over the existing SQLite (`backend/db.sqlite3`), schema unchanged
- **Auth**: SimpleJWT-compatible — verifies *and issues* HS256 tokens signed
  with the same `SECRET_KEY` as Django (`Authorization: Bearer` or `access_token`
  cookie). Login/refresh/verify/logout are ported; tokens are interchangeable
  with Django (verified both directions).
- **Jobs**: tokio-cron-scheduler in-process (not yet wired; replaces Celery+beat)

## Ported so far (read slice)

| Method + path | Notes |
|---|---|
| `GET /health/` | liveness |
| `GET /api/categories/` `…/{id}/` | DRF paginated |
| `GET /api/flavors/` `…/{id}/` | paginated, `?category=`, `?category__slug=`, `?search=`, ordered by -average_rating |
| `GET /api/flavors/top/` `?category=` | top 10 rated |
| `GET /api/flavors/newest/` | 10 newest |
| `GET /api/flavors/search/?q=` | ranked hits (≤15) |
| `GET /api/flavors/followed_top/` | auth required |
| `GET /api/banners/` `…/{id}/` `…/active/` | enabled-only for non-superusers |
| `GET /api/schema/` + `/api/schema/swagger-ui` | OpenAPI |

### Auth slice (issuance)

| Method + path | Notes |
|---|---|
| `POST /api/auth/token/` | login; validates Django PBKDF2 password, sets httpOnly cookies, body `{"status":"ok"}` |
| `POST /api/auth/token/refresh/` | refresh from body or `refresh_token` cookie; rotates + blacklists old (BLACKLIST_AFTER_ROTATION) |
| `POST /api/auth/token/verify/` | validate any token; rejects blacklisted jti |
| `POST /api/auth/logout/` | blacklists the refresh cookie, clears both cookies |
| `POST /api/token/` | legacy alias of login |

### Ratings + replies slice (writes)

| Method + path | Notes |
|---|---|
| `GET /api/ratings/` | paginated (size 50), `-created_at`, nested replies (read-only OK anon) |
| `POST /api/ratings/` | auth; one rating per (user, flavor); parses `@mentions` in comment |
| `GET /api/ratings/{id}/` | retrieve |
| `PUT/PATCH /api/ratings/{id}/` | owner or superuser; no mention parsing on edit (matches Django) |
| `DELETE /api/ratings/{id}/` | owner or superuser; cascades replies + notifications |
| `GET /api/ratings/feed/` | auth; ratings by followed users, FeedPagination (size 10) |
| `GET /api/ratings/recent/` | AllowAny; 10 newest with a non-empty comment (plain array) |
| `POST /api/ratings/{id}/reply/` | auth; notifies the rating owner, parses `@mentions` |
| `GET /api/replies/` `…/{id}/` | auth |
| `PUT/PATCH /api/replies/{id}/` | owner or superuser; re-parses `@mentions` |
| `DELETE /api/replies/{id}/` | owner or superuser; cascades notifications |

Mirrors `RatingViewSet`/`ReplyViewSet` + `services/mentions.py`. Validation
errors reproduce DRF's field-keyed / top-level-list bodies. Django's
`on_delete=CASCADE` is emulated in the handlers (collect + delete dependent
notifications/replies in a transaction) because SQLite enforces the FKs but has
no `ON DELETE CASCADE`. Datetimes are written truncated to microseconds so the
on-disk format matches Django's; verified Django reads Rust-written rows back.

### Users / social slice

| Method + path | Notes |
|---|---|
| `POST /api/users/signup/` | AllowAny; creates inactive user, sends verification email; `{"error":...}` on dup/missing |
| `POST /api/users/resend_verification/` | AllowAny; new code + email |
| `POST /api/users/verify_signup/` | AllowAny; activates on matching code |
| `GET /api/users/me/` | auth; also logs client IP (XFF first hop, else peer addr) |
| `GET /api/users/profile/{username}/` | AllowAny; public profile aggregate (ratings, comments, followers, following) |
| `GET /api/users/following_list/` | auth; users the caller follows |
| `GET /api/users/dashboard/` | auth; rated/missing flavors + my ratings, with followed-average |
| `PATCH /api/users/update_preferences/` | auth; theme/language/drawer_anchor/selected_banner (validated) |
| `POST /api/users/update_avatar/` | auth; multipart; resizes >256px or non-JPEG to 256² JPEG q90 (PIL parity) |
| `POST /api/users/change_password/` | auth; checks old password |
| `PATCH /api/users/update_profile/` | auth; username (unique) + email change (confirmation code mailed) |
| `POST /api/users/confirm_email/` | auth; applies pending email on matching code |
| `POST /api/users/request_password_reset/` | AllowAny; always returns generic message |
| `POST /api/users/complete_password_reset/` | AllowAny; email+code → new password |
| `POST /api/users/request_account_deletion/` | auth; mails deletion code |
| `POST /api/users/confirm_account_deletion/` | auth; deletes account + all dependents (cascade) |
| `GET /api/users/{id}/` | auth; retrieve |
| `POST /api/users/{id}/follow/` `…/unfollow/` | auth; follow notification; self-follow rejected |
| `POST /api/users/{id}/add_comment/` | auth; profile comment + notification |
| `DELETE /api/users/{id}/delete_comment/{comment_id}/` | author or profile owner |
| `GET /api/notifications/` | auth; own, `-created_at`, plain array |
| `GET /api/notifications/{id}/` | auth; own only (404 otherwise) |
| `POST /api/notifications/{id}/mark_read/` | auth |
| `POST /api/notifications/mark_all_read/` | auth |

### Tickets / support slice

| Method + path | Notes |
|---|---|
| `GET /api/tickets/` | auth; superuser sees all, else own; `-updated_at`; paginated |
| `POST /api/tickets/` | auth; status defaults `open`; notifies other admins |
| `GET/PUT/PATCH /api/tickets/{id}/` | auth; own or superuser |
| `DELETE /api/tickets/{id}/` | superuser only; cascades messages + notifications |
| `POST /api/tickets/{id}/add_message/` | auth; notifies counterparty; `{"error":"Text is required"}` if empty |
| `POST /api/tickets/{id}/update_status/` | staff only (`IsAdminUser`); validates status enum |

Ports `UserViewSet`/`NotificationViewSet`/`TicketViewSet` + serializers
field-for-field. Generic `POST/PUT/PATCH/DELETE /api/users/` and `/api/users/{id}/`
are intentionally **not** exposed (Django's `ModelViewSet` lets any authenticated
user edit any user via `UserSerializer` — a footgun the frontend never uses; the
dedicated actions cover every real flow). They 405.

**Email is implemented** (lettre): when `EMAIL_HOST` is set, mail is sent over
SMTP — STARTTLS (`EMAIL_USE_TLS`) or implicit TLS (`EMAIL_USE_SSL`), with
optional cert/hostname skip (`EMAIL_SKIP_CERT_VERIFICATION`, mirrors Django's
`InsecureEmailBackend`). With no `EMAIL_HOST` it logs to the console (dev
parity). Sends are fire-and-forget (`tokio::spawn`), matching Django's Celery
`.delay()`.

Account/ticket/comment deletion emulates Django's app-level CASCADE in a
transaction (SQLite has no `ON DELETE CASCADE`): account deletion removes the
user's notifications, replies (theirs + on their ratings), ratings, ticket
messages, tickets, profile comments (authored + owned), IP logs, follow rows,
and blacklisted tokens before the user row.

Mirrors `api/views/auth.py`. Tokens are HS256 with the SimpleJWT claim set
(`token_type, exp, iat, jti, user_id`), lifetimes 60 min / 14 days. The
refresh blacklist shares Django's `token_blacklist_*` tables, so rotation works
across both backends. Only the `pbkdf2_sha256` hasher is supported (the
project's default); change `password.rs` if the hasher ever changes.

Responses mirror the DRF serializers field-for-field (names, order, pagination
envelope) so the existing frontend is unchanged.

### Admin + jobs slice

Ports `AdminViewSet` (registered under the `admin-custom` prefix) and every
management command / Celery task. All endpoints require `IsAdminUser` (`is_staff`):
401 if anonymous, 403 if authenticated non-staff.

| Method + path | Notes |
|---|---|
| `GET /api/admin-custom/stats/` | counts + email/server config snapshot |
| `GET /api/admin-custom/config/` | `SystemConfig` pk=1 singleton (auto-created) |
| `PATCH /api/admin-custom/config/` | partial update; bumps `updated_at` |
| `GET /api/admin-custom/jobs/` | all job rows; `name_display` via registry, `next_run` derived (`last_run + interval_hours`) |
| `POST /api/admin-custom/{pk}/trigger_job/` | sets status `pending`, spawns the job; `{"status":"Job queued","task":"api.<name>"}` or 400 if unknown |
| `PATCH /api/admin-custom/{pk}/update_job_schedule/` | sets `interval_hours` |
| `POST /api/admin-custom/merge_flavors/` | `{keep_id, remove_id}`; 400 missing/diff-category, 404 not found, else merges |
| `POST /api/admin-custom/send_test_email/` | synchronous send; 200 or 500 with SMTP error |
| `GET /api/admin-custom/users/` | admin user list w/ IPs |
| `GET/PATCH/DELETE /api/admin-custom/{pk}/user_detail/` | full detail (IPs + ratings); DELETE cascades via shared `delete_user_cascade` |

**Job framework** (`src/jobs/`) replaces the Django management-command + Celery
layer with a single abstraction:

- `BackgroundJob` async trait (`name`, `display_name`, `run`) + a `registry()` of
  5 jobs: `sync_flavors`, `cleanup_duplicates`, `backup_db`, `seed_legacy`,
  `seed_banners`. `run_job()` is the lifecycle wrapper — it writes status /
  `last_run` / `last_output` / `error_message` into the `api_job` row (parity
  with Django's `_run_command_job`) and a per-process concurrency guard
  (`Arc<Mutex<HashSet>>`) prevents the same job running twice.
- **Scheduler** (`scheduler.rs`): an in-process 60 s poller replacing Celery
  beat. Each tick, any registry job whose row has `interval_hours > 0` and is due
  (`last_run` null, or `now - last_run >= interval_hours`) and not already running
  is dispatched. Restart-safe via the persisted `last_run`. Chosen over a cron
  crate so intervals stay editable at runtime through `update_job_schedule`.

> **Operational note:** once Rust owns jobs in production, the Python Celery
> `beat`/`worker` containers **must** be disabled, or jobs run twice (both
> backends share `api_job` and the same SQLite file).

Django-data parity for the shared DB + media tree:

- `slugify` reimplemented (NFKD + ASCII-fold) to match Django exactly, so image
  paths dedupe across both backends.
- Image filenames keyed by `sha1(url_path)[:10]`, matching Django's `hashlib.sha1`.
- Microsecond (6-frac-digit) timestamps; app-level CASCADE emulation.
- `merge_flavors` re-homes ratings (conflict resolution by comment length then
  `created_at`), re-points replies/notifications, inherits `external_id`, in a txn.
- `sync_flavors` is a full port including the **Syrup** special-case (the single
  bundle product's variants expand into individual `Flavor` rows keyed by variant id).

Verified live against a copy of the production SQLite: scheduler dispatched the
due `sync_flavors` job which fetched `weareholy.com` and reported
`Created: 24, Updated: 137, Marked Unavailable: 22`; the full endpoint matrix
(incl. 401/403 gates, merge, user_detail GET/PATCH/DELETE) passed.

## Run

```bash
cp .env.example .env      # set SECRET_KEY; point DATABASE_URL at the shared db
cargo run                 # listens on BIND_ADDR (default 0.0.0.0:8001)
```

`SECRET_KEY` signs the SimpleJWT-compatible tokens — **keep it constant** across
deploys/restarts, or every issued access/refresh token is invalidated. (It must
match the value the retired Django app used, so tokens already in the wild stay
valid.)

## Deployment

The Rust backend is the production API; Django/Celery/Redis were retired after
the strangler migration completed. `docker compose` (`docker-compose.yml` +
`docker-compose.override.yml`) runs two services: `backend-rs` (`holy-rust:8001`)
and `frontend` (nginx). nginx serves the SPA, proxies `/api` to the Rust backend,
and serves `/media` from the shared `./backend/media` bind mount; see
`frontend/nginx.conf`.

`X-Forwarded-Proto`/`Host` are required: absolute URLs (image links, pagination
`next`/`previous`) are rebuilt from them, matching DRF's `build_absolute_uri`.
`X-Forwarded-For` lets `/api/users/me/` log the real client IP (it falls back to
the peer address otherwise).

**Scheduler invariant:** exactly **one** process may own the `api_job` table.
Run a single `backend-rs` instance with `ENABLE_SCHEDULER=true`
(`RUST_ENABLE_SCHEDULER` in `.env`); any additional instances must leave it off.

The canonical data lives in host bind mounts — `backend/db.sqlite3` (WAL on) and
`backend/media/` — and survives image rebuilds. Keep them.

## Caveats / parity TODO

- `created_at` etc. are emitted as ISO-8601 with 6 fractional digits + `Z`. DRF
  (Python `isoformat`) omits the fraction when microseconds are zero — verify
  against live responses if a client parses strictly.
- The flavor `search` action approximates DRF's `SearchFilter` with word-level
  `LIKE` matching + the category-keyword extraction from `services/search.py`.
- Average-rating ordering is validated by construction; the current DB has zero
  ratings, so confirm ordering once rating data exists.
- `POST /api/replies/` is intentionally not exposed (Django marks `rating`
  read-only there; replies are only created via `/ratings/{id}/reply/`). It
  returns 405 rather than Django's 500.
- Generic `POST/PUT/PATCH/DELETE /api/users/` and `/api/users/{id}/` return 405
  by design (see Users/social slice) — Django allowed them but the frontend
  never used them.
- Admin endpoints + background jobs are ported (see the Admin + jobs slice).
  The job-trigger and admin write endpoints are **not** rate-limited (those are
  staff-only; `django_ratelimit` only covered the public flows below).

## Security & hardening

Rate limiting is ported in `throttle.rs` — an in-memory sliding-window limiter
(per-process; **resets on restart and fails open**, so keep nginx-level limits
in front for defence in depth, and run a single Rust instance). Limits mirror
`django_ratelimit`, plus a few the Django app lacked:

| Flow | Limit | Key | Parity |
|---|---|---|---|
| signup | 5 / h | IP | matches Django |
| password-reset request | 3 / h | IP | matches Django |
| complete password reset | 5 / h | IP | matches Django |
| account-deletion request | 3 / h | user | matches Django |
| rating `create` | 10 / min | user | matches Django (`reply` was never throttled, still isn't) |
| login | 10 / min | IP | **added** (Django had none) |
| resend verification | 5 / h | IP | **added** |
| confirmation-code attempts | 10 / h | account | **added** (brute-force lockout) |

Over-limit returns **429 + `Retry-After`** (DRF returned 403; the 429 body
includes both `detail` and `error` so existing frontend error handling still
reads a message).

Confirmation codes (signup / password reset / email change / account deletion)
now **expire after 15 minutes** and are cleared on use. Expiry is tracked
in-memory because the shared SQLite schema has no expiry column (adding one would
need a coordinated Django migration); the check **fails open on an unknown code
and only fails closed on a known-expired one**, so a process restart can't lock
anyone out — it only forgoes expiry enforcement for codes minted before restart.

Login runs a dummy PBKDF2 verify on the user-not-found branch so response time
can't be used to enumerate usernames. The signup/resend SMTP-failure path logs
the detail server-side and returns a generic message (no info disclosure to
anonymous callers).

Transport/process hardening (`main.rs`): static security headers
(`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
each set only if absent so nginx can override / own HSTS), an 8 MB request-body
cap, a 30 s whole-request timeout, a panic-catch layer (handler panic → 500
instead of a dropped connection), and graceful shutdown on SIGTERM/Ctrl+C so
in-flight requests drain. `/health/` now runs `SELECT 1` so the Docker
healthcheck fails when SQLite is unreachable.

SQLite runs in **WAL** journal mode (enabled once at startup, persistent in the
file header) so readers don't block behind the writer; `busy_timeout` is sqlx's
default 5 s, matching Django's SQLite timeout. The default `DATABASE_URL` uses `mode=rw` (not
`rwc`) so a wrong path fails loudly instead of silently creating an empty DB.

Confirmation codes are compared in **constant time** (`subtle::ConstantTimeEq`)
on signup verify / email confirm / account-deletion confirm.

CORS is **locked to an allow-list** (`config.cors_allowed_origins`, mirroring
Django's `CORS_ALLOWED_ORIGINS` derived from `DOMAIN`; override via the
`CORS_ALLOWED_ORIGINS` env var) rather than reflecting any origin — credentialed
CORS can't use a wildcard. Request *headers* are still mirrored; the origin is
the security boundary.

Password strength is enforced by `password_policy.rs`, a faithful port of
Django's four default `AUTH_PASSWORD_VALIDATORS` (minimum length 8, the shipped
20k common-password list embedded via `include_bytes!`, all-numeric rejection,
and user-attribute similarity using a `difflib.SequenceMatcher.quick_ratio`
reimplementation) applied on signup / change-password / complete-reset.
**Deliberate divergence:** the live Django app configures these validators but
never actually calls `validate_password`, so a weak password Django would accept
is rejected here. Verdicts and message ordering were cross-checked against
Django's `validate_password` on representative inputs.

Tested (`cargo test`): PBKDF2 verify against a known Django-produced hash + a
hash→verify round-trip; SimpleJWT mint/verify round-trips incl. wrong-secret and
tampered-token rejection; the rate limiter and code-TTL logic; and the password
validators. **Still open:** an integration test for cascade-delete completeness
(needs a seeded test DB harness, a different class of test from these unit
tests).

## Next slices (suggested order)

1. ~~Auth issuance (login/refresh)~~ — **done** (PBKDF2 verify + SimpleJWT minting
   + cookie views + refresh blacklist).
2. ~~Ratings/replies write + notifications (mentions parsing)~~ — **done**
   (CRUD + feed/recent/reply, mention notifications, CASCADE emulation).
3. ~~Users/social, tickets/support~~ — **done** (account lifecycle, follow
   graph, profile comments, notifications, tickets; SMTP email; avatar resize;
   account/ticket cascade).
4. ~~Admin + jobs~~ — **done** (`AdminViewSet` + a `BackgroundJob` trait/registry
   /runner, an in-process interval scheduler replacing Celery beat, all 5
   management commands incl. full `sync_flavors` Shopify port).
```
