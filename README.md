# Holy Flavor Rater

A high-density, community-driven platform for "Holy Energy" enthusiasts. Browse every flavor ever released—from current bestsellers to retired legacy editions—rate them, and build your own personal tiered leaderboard to share with the world.

## 🚀 Key Features

- **Personalized Taste Profiles:** Interactive, tiered (S-D) leaderboards based on your personal ratings.
- **Dynamic Hall of Fame:** Automatic carousel featuring community-favorite flavors and highlighted reviews.
- **Advanced Search & Discovery:** Typo-friendly search with category-aware filtering and relevance sorting.
- **Interactive Banners:** 10+ procedurally generated Canvas banners (Fireflies, Hextech, Nebula, etc.) that react to your mouse.
- **Pro Themes:** Over 15 built-in themes including Catppuccin, Nord, and T0P (Twenty One Pilots) inspired aesthetics.
- **Social Interaction:** Follow other collectors, receive follow notifications, and leave messages in profile guestbooks.
- **Enterprise Verification:** Secure one-click email verification and password recovery.
- **Automated Catalog:** Real-time syncing with Shopify APIs and historical legacy flavor data.

---

## 🛠️ Setup & Installation

### Option 1: Docker (Recommended)
The easiest way to get the full stack (Rust backend + Frontend) running behind a production-ready proxy.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nvrl/Holy-Flavor-Rater.git
    cd Holy-Flavor-Rater
    ```
2.  **Environment Configuration:**
    ```bash
    cp .env.example .env
    # Edit .env: set SECRET_KEY, DOMAIN, and SMTP settings
    ```
3.  **Start Services:**
    ```bash
    docker compose up -d --build
    ```
    The stack brings up two containers: `backend-rs` (`holy-rust:8001`, the Rust API) and `frontend` (Nginx — serves the SPA, proxies `/api` to the backend, serves `/media` from the shared mount). `docker-compose.override.yml` adds the Traefik production overlay.

    The Rust backend reads the existing `backend/db.sqlite3` directly (no migration step). Seeding (flavor catalog, legacy data, banners) runs as background jobs — trigger them from the admin Jobs tab or let the scheduler run them.

### Option 2: Local Manual Setup (Development)

#### Backend
```bash
cd backend-rs
cp .env.example .env       # set SECRET_KEY; point DATABASE_URL at ../backend/db.sqlite3
cargo run                  # listens on 0.0.0.0:8001
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

> The Rust backend uses the existing SQLite database under `backend/db.sqlite3`. The `backend/` directory is retained as the data store (db, `media/`, `banners/`) and historical reference for the retired Django implementation — it is no longer run.

---

## 🏗️ Architecture

The Holy Flavor Rater uses a **decoupled architecture**:

### Backend (Rust — Axum + SeaORM)
- **Web/DB:** Axum 0.8 over SeaORM (SQLite), utoipa for OpenAPI + Swagger UI. Lives in `backend-rs/`.
- **Models:** Custom User, Flavors (with `UniqueConstraint(name, category)`), Ratings (with `@mention` parsing), Tickets, Notifications, and Dynamic Banners.
- **Background jobs:** An in-process tokio scheduler runs Shopify syncs, duplicate cleanup, legacy seeding, banner seeding, and database backups (`src/jobs/`). Status is logged to the `api_job` table; intervals are editable from the admin UI Jobs tab. Replaces the old Celery + beat + Redis stack.
- **Security:** SimpleJWT-compatible HS256 auth with refresh-token rotation + blacklist, email-verified activation, an in-process rate limiter, constant-time code comparison, and Django-parity password validators.
- **Monitoring:** `GET /health/` (runs `SELECT 1`) for the docker healthcheck.

See **`backend-rs/README.md`** for the full endpoint matrix, parity notes, and security details.

### Frontend (React 19 + TypeScript)
- **State Management:** React Hooks and local state for high performance.
- **UI Framework:** Material UI (MUI) with heavy customization for "Holy" branding.
- **Visualization:** Procedural generative art system using HTML5 Canvas for profile backgrounds.
- **Internationalization:** Full i18next integration (English & German).

---

## 💻 Development Workflow

### Integrity Protection
This project includes a **Pre-Push Git Hook** to ensure code quality. It automatically:
1.  Attempts a full Frontend build (`tsc` + `vite build`).
2.  Runs Rust backend checks (`cargo check`).

**To install the hooks:**
```bash
bash scripts/install-hooks.sh
```

### Background Jobs
Run by the scheduler on their interval, or triggered from the admin Jobs tab (`POST /api/admin-custom/{pk}/trigger_job/`):
- `sync_flavors`: Syncs the latest products from the official Holy Energy (Shopify) catalog.
- `cleanup_duplicates`: Merges duplicate entries and maintains rating integrity.
- `seed_legacy`: Loads retired flavors from `legacy/*.json`.
- `seed_banners`: Updates procedurally generated banner configurations from `backend/banners/*.json`.
- `backup_db`: Creates a consistent SQLite + media snapshot in `backend/backups/`.

#### Categories
`sync_flavors` derives a flavor's category from the Shopify `product_type` (e.g. `42 - Syrup Bottle` → **Syrup**), stripping the numeric prefix and form-factor word. Any new drink line Holy ships **auto-creates** its category on the next sync. Packs, shakers, merch, stickers and other non-drink types funnel to **Packs and other**.

`sync_flavors` only assigns a category when it **creates** a row — existing flavors keep their original category. To re-shelve already-stored rows, the retired Django app's `recategorize_flavors` management command remains available under `backend/` for occasional manual use (it is not part of the Rust job registry).

---

## 💾 Backups & Restoration

### Create a Backup
```bash
bash scripts/backup.sh
```
Creates a `.tar.gz` (DB + media) in `backend/backups/`. WAL-safe: uses `sqlite3 .backup` when available, otherwise copies the DB plus its `-wal`/`-shm` sidecars. The backend also runs `backup_db` on its own schedule.

**Automating with Cron** — nightly at 2:00 AM:
```bash
0 2 * * * /path/to/Holy-Flavor-Rater/scripts/backup.sh
```

### Restore from Backup
1. Extract the archive: `tar -xzf backup_filename.tar.gz`
2. Stop the containers: `docker compose down`
3. Replace the current files:
   ```bash
   cp extracted_folder/db.sqlite3 backend/db.sqlite3
   cp -r extracted_folder/media/* backend/media/
   ```
4. Restart: `docker compose up -d`

---

## 🌍 Production Configuration

Set these in `.env` (see also `backend-rs/.env.example`):
- `SECRET_KEY`: long random string that signs JWTs — **keep it constant** or all tokens invalidate.
- `DOMAIN`: your domain (e.g. `holy.narl.io`); derives `FRONTEND_URL` / CORS defaults.
- `FRONTEND_URL`: base URL for one-click email verification links.
- `JWT_AUTH_COOKIE_SECURE=true`: set `Secure` on auth cookies.
- `RUST_ENABLE_SCHEDULER=true`: lets the backend own `api_job` scheduling. **Exactly one** running instance may have this enabled.
- `EMAIL_*`: SMTP settings for transactional email (unset `EMAIL_HOST` logs to console).

## 📄 License
MIT
