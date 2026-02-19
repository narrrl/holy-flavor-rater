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
    cp .env.example .env.narl.io
    # Edit .env.narl.io with your SMTP settings and Domain
    ```
3.  **Start Services:**
    ```bash
    docker-compose up -d --build
    ```
    *Note: On first startup, the backend will automatically migrate, sync the flavor catalog, and clean up any duplicates.*

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
    ```
3.  **Run Server:**
    ```bash
    python manage.py runserver
    ```

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
- **Automation:** Management commands for periodic Shopify API syncing and database deduplication.
- **Security:** Token-based authentication, CSRF protection, and email-verified account activation.
- **Monitoring:** Integrated `/health/` endpoint for Docker container status.

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
- `python manage.py sync_flavors`: Syncs the latest products from the official Holy Energy API.
- `python manage.py cleanup_duplicates`: Merges duplicate entries and maintains rating integrity.
- `python manage.py seed_banners`: Updates procedurally generated banner configurations from JSON.

---

## 🌍 Production Configuration

Ensure your `.env` contains:
- `DEBUG=false`
- `SECRET_KEY`: A long random string.
- `ALLOWED_HOSTS`: Your domain (e.g., `holy.narl.io`).
- `FRONTEND_URL`: For one-click email verification links.

## 📄 License
MIT
