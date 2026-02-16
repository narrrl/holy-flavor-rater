#!/bin/sh

# Exit on error
set -e

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Ensure media and cache directories exist
mkdir -p media/flavors
mkdir -p django_cache
chmod -R 777 django_cache

# Sync flavors from the API
echo "Syncing flavors..."
python manage.py sync_flavors

# Start the server using Gunicorn
echo "Starting Gunicorn..."
exec gunicorn holy_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
