#!/bin/sh

# The backend hostname is 'holy-backend' based on docker-compose.yml
# We wait for port 8000 to be open
echo "Waiting for backend (holy-backend:8000) to be available..."

MAX_RETRIES=30
COUNT=0

while ! nc -z holy-backend 8000; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "Backend timed out after $MAX_RETRIES attempts - starting Nginx anyway"
    break
  fi
  echo "Backend is unavailable (attempt $COUNT/$MAX_RETRIES) - sleeping"
  sleep 2
done

echo "Starting Nginx..."
exec nginx -g "daemon off;"
