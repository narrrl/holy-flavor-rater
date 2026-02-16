#!/bin/sh

# Exit on error
set -e

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Create superuser if it doesn't exist
echo "Creating superuser..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'password123')
    print('Superuser created.')
else:
    print('Superuser already exists.')
EOF

# Sync flavors from the API
echo "Syncing flavors..."
python manage.py sync_flavors

# Start the server using Gunicorn
echo "Starting Gunicorn..."
exec gunicorn holy_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
