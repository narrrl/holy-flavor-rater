#!/bin/sh

set -e

# Worker/beat share the backend image but must not re-run migrate/seed on every
# restart. Set SKIP_INIT=true on those services. Only the primary backend
# container runs the init block below.
if [ "${SKIP_INIT:-false}" = "true" ]; then
    echo "SKIP_INIT=true — skipping migrations/seed."
    if [ "$#" -gt 0 ]; then
        echo "Executing: $@"
        exec "$@"
    fi
    echo "No command given with SKIP_INIT=true; exiting."
    exit 0
fi

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --no-input

mkdir -p media/flavors

# One-shot seed jobs. These should run on image first boot, not on every
# restart. A marker file on the bind-mounted volume gates them.
SEED_MARKER="/app/.seeded"
if [ ! -f "$SEED_MARKER" ]; then
    echo "First boot — running initial seed commands..."
    python manage.py sync_flavors || echo "sync_flavors failed (non-fatal on first boot)"
    python manage.py cleanup_duplicates || echo "cleanup_duplicates failed (non-fatal)"
    python manage.py seed_legacy_flavors || echo "seed_legacy_flavors failed (non-fatal)"
    python manage.py seed_banners || echo "seed_banners failed (non-fatal)"
    touch "$SEED_MARKER"
else
    echo "Seed marker present — skipping seed commands. Trigger them from /admin if needed."
fi

if [ "$#" -gt 0 ]; then
    echo "Executing custom command: $@"
    exec "$@"
fi

echo "Starting Gunicorn..."
exec gunicorn holy_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
