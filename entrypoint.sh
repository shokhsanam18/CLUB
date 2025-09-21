#!/bin/sh
set -e

echo "=== Starting container ==="

# 1️⃣ Build frontend
echo "==> Building frontend..."


# 2️⃣ Collect static files (Django)
echo "==> Collecting Django static files..."
cd /app
# Copy frontend build output into Django STATIC_ROOT
cp -r /app/frontend/build/* /app/static/ || true
python manage.py collectstatic --noinput

# 3️⃣ Apply database migrations
echo "==> Running migrations..."
python manage.py migrate --noinput

# 4️⃣ (Optional) Setup roles/permissions if you have a custom script
if [ -f /app/manage.py ] && [ -f /app/setup_permissions.py ]; then
    echo "==> Setting up roles and permissions..."
    python manage.py setup_permissions || true
fi

# 5️⃣ Start Gunicorn
echo "==> Starting Gunicorn..."
exec gunicorn club_backend.wsgi:application --bind 0.0.0.0:8000