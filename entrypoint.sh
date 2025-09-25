#!/bin/sh
set -e

echo "=== Starting container ==="

# 1️⃣ Wait for PostgreSQL to be ready
echo "==> Waiting for database..."
host=${DB_HOST:-db}
user=${DB_USER:-postgres}
db=${DB_NAME:-postgres}
password=${DB_PASS:-password}

echo "⏳ Ожидаем PostgreSQL на $host..."
until PGPASSWORD=$password psql -h "$host" -U "$user" -d "$db" -c "SELECT 1"; do
  echo "PostgreSQL не доступна, ждем..."
  sleep 1
done
echo "🟢 PostgreSQL доступна"
echo "Database is ready."

# 2️⃣ Collect static files (Django)
echo "==> Collecting Django static files..."
cd /app/backend
python manage.py collectstatic --noinput

# 3️⃣ Apply database migrations
echo "==> Running migrations..."
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput

# 4️⃣ (Optional) Setup roles/permissions if you have a custom script
if [ -f manage.py ]; then
    echo "==> Setting up roles and permissions..."
    python manage.py setup_permissions || true
fi

# 5️⃣ Start Gunicorn
echo "==> Starting Gunicorn..."
exec gunicorn club_backend.wsgi:application --bind 0.0.0.0:8000
