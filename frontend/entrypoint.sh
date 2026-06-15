#!/bin/sh

# Wait for the Rust backend (holy-rust:8001) before serving.
echo "Waiting for backend (holy-rust:8001) to be available..."

MAX_RETRIES=30
COUNT=0

while ! nc -z holy-rust 8001; do
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
