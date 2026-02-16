# Holy Energy Archive & Community Hub

A premium, responsive full-stack platform for "Holy Energy" fans to rate flavors, explore a categorized archive, and share personalized rating profiles.

## Features

- **Dynamic Hall of Fame:** An auto-rotating carousel featuring the top-rated flavors and community reviews.
- **Flavor Gallery:** A space-efficient, grid-based view of all rated and missing flavors.
- **Personalized Taste Profiles:** Share your ratings with the community using tiered (S-D) leaderboards.
- **Responsive Design:** Optimized for all devices, from ultra-wide monitors to vertical smartphones.
- **Secure Authentication:** SMTP-verified email signup, password resets, and session management.
- **Catalog Automation:** Automatic flavor syncing from official Shopify sources with local image caching.

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [SMTP Server](https://support.google.com/mail/answer/185833?hl=en) (e.g., Gmail App Password) for email verification.

---

## Quick Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/holy.git
    cd holy
    ```

2.  **Configure your environment:**
    Copy the example environment file and fill in your specific details (especially SMTP and your domain name):
    ```bash
    cp .env.example .env
    ```

3.  **Start the containers:**
    ```bash
    docker-compose up -d --build
    ```

4.  **Wait for initial setup:**
    The first time you start the backend, it will automatically:
    - Run database migrations.
    - Collect static files.
    - **Sync flavors** from the Holy Energy Shopify API (this might take a minute).

5.  **Access the application:**
    - **Frontend:** [http://localhost:5173](http://localhost:5173) (or your configured domain)
    - **API Docs:** [http://localhost:8000/api/schema/swagger-ui/](http://localhost:8000/api/schema/swagger-ui/)
    - **Admin Panel:** [http://localhost:8000/admin/](http://localhost:8000/admin/) (or your configured `ADMIN_URL`)

---

## Production Hosting

### Security Best Practices

When hosting this application publicly, ensure you update your `.env` with:

- `DEBUG=false`: Essential for disabling internal Django stack traces.
- `SECRET_KEY`: Use a long, random string.
- `ADMIN_URL`: Change this to something unique (e.g., `super-secret-gate/`) to hide your admin panel from scanners.
- `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`: Set these to your actual production domain (e.g., `https://holy.narl.io`).

### Performance

- The application uses **WhiteNoise** for efficient static file serving.
- **Gunicorn** is configured as the production WSGI server.
- **Compression Middleware** (Gzip/Brotli) is active for API responses.
- **Lazy Loading** is enabled for all flavor and carousel images.

---

## Project Structure

- `backend/`: Django REST Framework API.
- `frontend/`: React 19 application with Material UI and Catppuccin themes.
- `media/`: Locally cached product images and user avatars.
- `legacy/`: Static JSON data for historical flavors.

## License

MIT
