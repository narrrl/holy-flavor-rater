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
The easiest way to get the full stack (Backend + Frontend + DB) running behind a production-ready proxy.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/nvrl/Holy-Flavor-Rater.git
    cd Holy-Flavor-Rater
    ```
2.  **Environment Configuration:**
    ```bash
    cp .env.example .env
    # Edit .env with your SMTP settings and Domain
    ```
3.  **Start Services:**
    ```bash
    docker compose up -d --build
    ```
    *Note: On first startup, the backend runs `migrate` + `collectstatic`, then seeds the flavor catalog, legacy data, and banner configurations **once** (gated by a `/app/.seeded` marker so subsequent restarts don't repeat the work). Re-run individual seeds later from the admin Jobs tab.*

    The stack brings up six containers: `redis` (broker + cache), `backend` (Gunicorn), `worker` (Celery worker), `beat` (Celery beat w/ `django_celery_beat.DatabaseScheduler`), `flower` (Celery monitoring UI on `:5555`), and `frontend` (Nginx).

### Option 2: Local Manual Setup (Development)

#### Backend
1.  **Navigate and Install:**
    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # Linux/Mac
    pip install -r requirements.txt
    ```
2.  **Initialize DB:**
    ```bash
    python manage.py migrate
    python manage.py sync_flavors
    python manage.py seed_legacy_flavors
    python manage.py seed_banners
    ```
3.  **Run Server:**
    ```bash
    python manage.py runserver
    ```
    *By default `holy_backend.settings.dev` is active, which sets `CELERY_TASK_ALWAYS_EAGER=true` — tasks run inline with no broker required. To exercise the full async path locally, start a Redis server and run `celery -A holy_backend worker -l info` + `celery -A holy_backend beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler` in separate terminals.*

#### Frontend
1.  **Navigate and Install:**
    ```bash
    cd frontend
    npm install
    ```
2.  **Run Dev Server:**
    ```bash
    npm run dev
    ```

---

## 🏗️ Architecture

The Holy Flavor Rater uses a modern **decoupled architecture**:

### Backend (Django REST Framework)
- **Models:** Custom User model, Flavors (with category constraints), Ratings (with mention parsing), and Dynamic Banners.
- **Async jobs:** Celery workers backed by Redis handle Shopify syncs, duplicate cleanup, legacy seeding, banner seeding, database backups, and transactional email. Scheduling is owned by `django_celery_beat` (`PeriodicTask` + `IntervalSchedule`) and editable from the admin UI Jobs tab.
- **Caching & rate-limiting:** Django cache uses Redis (`RedisCache` on DB 1). `django_ratelimit` consumes the same cache.
- **Security:** JWT authentication (SimpleJWT) with refresh-token rotation, CSRF protection, and email-verified account activation.
- **Monitoring:** `/health/` endpoint for the backend; Flower UI on `:5555` for queue + worker state (basic-auth gated).

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
2.  Runs Backend system checks and validates missing migrations.

**To install the hooks:**
```bash
bash scripts/install-hooks.sh
```

### Management Commands
Each is also exposed as a Celery task (`api.<name>`) and triggerable from the admin Jobs tab.
- `python manage.py sync_flavors`: Syncs the latest products from the official Holy Energy API.
- `python manage.py cleanup_duplicates`: Merges duplicate entries and maintains rating integrity.
- `python manage.py seed_legacy_flavors`: Loads retired flavors from `legacy/*.json`.
- `python manage.py seed_banners`: Updates procedurally generated banner configurations from `backend/banners/*.json`.
- `python manage.py backup_db` (`--full` for media too): Creates a consistent SQLite snapshot in `backend/backups/`.

#### Categories & `recategorize_flavors`

`sync_flavors` derives a flavor's category from the Shopify `product_type` (e.g. `42 - Syrup Bottle` → **Syrup**), stripping the numeric prefix and the form-factor word. Any new drink line Holy ships **auto-creates** its category on the next sync — no code change needed. Packs, shakers, merch, stickers and other non-drink types funnel to **Packs and other**.

One catch: `sync_flavors` only assigns a category when it **creates** a row. Existing flavors keep their original category, so a categorization change won't retro-apply to rows already in the DB. Use the one-off command below to fix mis-shelved rows. It is run manually (not exposed as a Celery task / Jobs-tab entry) and is **dry-run by default** — nothing is written without `--apply`.

```bash
python manage.py recategorize_flavors                      # dry-run: report what would move
python manage.py recategorize_flavors --apply              # persist the moves
python manage.py recategorize_flavors --apply --merge-collisions  # also fold name-clashes
```

It re-fetches the catalog, matches rows by `external_id`, and re-runs the exact `sync_flavors` categorization logic. Rows not in the catalog (discontinued) are never touched. When a move would collide with an existing flavor of the same name in the target category (`UniqueConstraint(name, category)`), it is skipped and reported unless `--merge-collisions` is passed, which folds the rows via `merge_flavors` (preserving ratings and replies).

---

## 💾 Backups & Restoration

### Create a Backup
To create a full snapshot of your database and user-uploaded media:
```bash
bash scripts/backup.sh
```
This will create a `.tar.gz` file in `backend/backups/`.

**Automating with Cron:**
Add this to your `crontab -e` to backup every night at 2:00 AM:
```bash
0 2 * * * /path/to/Holy-Flavor-Rater/scripts/backup.sh
```

### Restore from Backup
1. Extract the archive: `tar -xzf backup_filename.tar.gz`
2. Stop the containers: `docker-compose down`
3. Replace the current files:
   ```bash
   cp extracted_folder/db.sqlite3 backend/db.sqlite3
   cp -r extracted_folder/media/* backend/media/
   ```
4. Restart: `docker-compose up -d`

---

## 🌍 Production Configuration

Ensure your `.env` contains:
- `DEBUG=false`
- `DJANGO_SETTINGS_MODULE=holy_backend.settings.prod`
- `SECRET_KEY`: A long random string.
- `ALLOWED_HOSTS`: Your domain (e.g., `holy.narl.io`).
- `FRONTEND_URL`: For one-click email verification links.
- `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND`: Default `redis://redis:6379/0` works inside the compose network.
- `DJANGO_CACHE_URL`: Default `redis://redis:6379/1` (DB 1 to avoid colliding with celery).
- `FLOWER_BASIC_AUTH`: `user:password` for the Flower UI — **change from the default before exposing**.

Restrict Flower's port `5555` (or reverse-proxy it behind basic-auth + TLS) since it exposes task payloads and worker internals.

## 📄 License
MIT
