#############################################
# 1️⃣ Frontend build stage
#############################################
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY club_frontend/package*.json ./

RUN npm install --legacy-peer-deps

COPY club_frontend/ .

# Accept build arguments for Vite environment variables
ARG VITE_API_BASE_URL
ARG VITE_AUTH_HEADER_PREFIX

# Set them as environment variables during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AUTH_HEADER_PREFIX=$VITE_AUTH_HEADER_PREFIX

RUN npm run build

#############################################
# 2️⃣ Backend runtime stage
#############################################
FROM python:3.12-slim AS backend
ENV PYTHONUNBUFFERED=1 \
    PATH="/venv/bin:$PATH"


RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*


RUN python -m venv /venv

WORKDIR /app

# Backend dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY club_backend/ .


COPY --from=frontend /app/frontend/dist /app/frontend/dist


COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
