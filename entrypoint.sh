#!/bin/sh
set -e
echo "=== Starting container ==="

# Wait for PostgreSQL
echo "==> Waiting for database..."
host=${DB_HOST:-db}
user=${DB_USER:-postgres}
db=${DB_NAME:-postgres}
password=${DB_PASS:-password}

until PGPASSWORD=$password psql -h "$host" -U "$user" -d "$db" -c "SELECT 1"; do
  echo "PostgreSQL not available, waiting..."
  sleep 1
done
echo "🟢 PostgreSQL available"

if [ -d "/app/frontend_dist" ] && [ "$(ls -A /app/frontend_dist)" ]; then
    echo "Copying frontend files to nginx directory..."
    cp -r /app/frontend_dist/* /app/frontend_dist/ 2>/dev/null || true
    echo "Frontend files copied successfully"
else
    echo "No frontend files found to copy"
fi

# Stay in /app (not /app/backend)
echo "==> Collecting Django static files..."
python manage.py collectstatic --noinput

echo "==> Running migrations..."
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput

# Setup permissions (optional)
echo "==> Setting up roles and permissions..."
python manage.py setup_permissions || true

# Start Gunicorn with correct module name
echo "==> Starting Gunicorn..."
exec gunicorn club_backend.wsgi:application --workers 2 --bind 0.0.0.0:8000
