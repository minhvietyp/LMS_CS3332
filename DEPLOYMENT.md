# Deployment Guide

This guide covers production-like deployment for the LMS backend, frontend, PostgreSQL database, and Nginx reverse proxy.

## Prerequisites

- Docker and Docker Compose v2.
- A production PostgreSQL password and JWT access secret.
- A domain name if exposing the app publicly.
- TLS certificates managed by your hosting platform, Certbot, or a load balancer.

## Environment Setup

1. Copy the root compose example:

```bash
cp .env.production.example .env.production
```

2. Copy backend production settings:

```bash
cp be/.env.production.example be/.env.production
```

3. Replace every `CHANGE_ME` value before deploying.

4. Keep `DATABASE_URL` in `be/.env.production` aligned with the `postgres` service:

```env
DATABASE_URL="postgresql://lms_user:YOUR_PASSWORD@postgres:5432/lms_db?schema=public"
```

5. Set `CORS_ORIGINS` and `FRONTEND_URL` to the public application origin.

## Development Run

Use the existing development workflow:

```bash
cd be
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

```bash
cd fe
npm ci
npm run dev
```

Do not use `prisma db push` for production.

## Production Docker Compose

From the repository root:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

The production compose file starts:

- `postgres` with a persistent volume.
- `backend` using the production backend image.
- `frontend` using the built Vite static bundle.
- `nginx` as the reverse proxy.

## Database Migrations

The backend container command runs:

```bash
npx prisma migrate deploy && npm start
```

This applies committed Prisma migrations before starting the API. Production deployments should only use reviewed migrations committed under `be/prisma/migrations`.

## Seed Strategy

Seeds are intended for local or controlled staging bootstrap only:

```bash
cd be
npm run prisma:seed
```

Do not run seed data against production unless the seed file has been reviewed for that environment.

## Health Checks

Basic service health:

```bash
curl http://localhost/health
```

Readiness including database connectivity:

```bash
curl http://localhost/ready
```

The compose healthcheck uses `/ready` for backend readiness.

## Logs

View all service logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
```

Backend production logs are JSON-friendly through Winston. Slow requests are logged when they exceed `SLOW_REQUEST_THRESHOLD_MS`.

## Nginx and SSL

`nginx.prod.conf` proxies:

- `/` to the frontend container.
- `/api/` to the backend container.
- `/socket.io/` to Socket.IO.
- `/health` and `/ready` to the backend.

The included Nginx config is HTTP-only. For HTTPS, terminate TLS at a managed load balancer or extend the config with certificate paths managed outside git. Do not commit private keys or real certificates.

## Rollback

1. Identify the last known good image or commit.
2. Restore the commit.
3. Rebuild and restart:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

Database rollbacks require a specific Prisma migration rollback plan. Do not manually edit production tables without a reviewed recovery script.

## Troubleshooting

- If backend readiness fails, check `DATABASE_URL`, PostgreSQL health, and migration logs.
- If login or uploads fail behind Nginx, check `TRUST_PROXY=true`, `CORS_ORIGINS`, and cookie domain settings.
- If frontend API calls fail, confirm `VITE_API_BASE_URL=/api/v1` for the Docker deployment.
- If rate limiting blocks internal testing, adjust `RATE_LIMIT_*`, `AUTH_STRICT_*`, or `PUBLIC_RATE_LIMIT_*` values in the environment file.
- Redis is not configured in this deployment. Add it only if the backend is updated to use a Redis-backed cache.
