## LMS Database Setup

This backend uses:

- PostgreSQL
- Prisma
- Prisma seed bootstrap

Two setup paths are supported.

### Recommended: Prisma-first local database

Use this when you want a clean local LMS database that matches the current Prisma schema.

1. Start PostgreSQL.
2. Create a database and user.
3. Configure `be/.env`.
4. Run Prisma generate, migrate, and seed.

PowerShell example:

```powershell
cd d:\Leanring\LMS\be

copy .env.example .env

npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Optional: Import an existing SQL bootstrap file

Use this only if you already have a PostgreSQL SQL script such as `lms_db.txt`.

Important:

- This is not the preferred long-term source of truth.
- Prisma schema and migrations should remain canonical for this project.
- If the SQL file contains placeholder passwords, login will not work until you replace or reseed those users.

PowerShell example:

```powershell
psql -U lms_user -d lms_db -f "C:\Users\minhviet\Downloads\lms_db.txt"
```

Then:

```powershell
cd d:\Leanring\LMS\be
npx prisma generate
npm run dev
```

## Supported local workflows

### Workflow A: Clean local database

Use:

- `prisma migrate dev`
- `prisma:seed`

This is the best path for development.

### Workflow B: Existing SQL bootstrap

Use:

- `psql -f your-file.sql`
- `prisma generate`

Do not start with `prisma migrate dev` unless you have confirmed the imported SQL schema is aligned with `prisma/schema.prisma`.

## Environment setup

Copy `be/.env.example` to `be/.env`.

Set at minimum:

```env
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db?schema=public"
PORT=3000
NODE_ENV=development
JWT_ACCESS_SECRET=change-me
CORS_ORIGINS=http://localhost:5173
ADMIN_SEED_PASSWORD=Admin@12345
INSTRUCTOR_SEED_PASSWORD=Instructor@12345
STUDENT_SEED_PASSWORD=Student@12345
```

## Windows helper scripts

This repo includes:

- `be/scripts/setup-local-db.ps1`
- `be/scripts/import-bootstrap-sql.ps1`

### Setup local DB

Creates or reuses:

- PostgreSQL role
- PostgreSQL database
- backend `.env`

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local-db.ps1 `
  -DbName lms_db `
  -DbUser lms_user `
  -DbPassword lms_password `
  -AdminUser postgres
```

### Import SQL bootstrap

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-bootstrap-sql.ps1 `
  -SqlFile "C:\Users\minhviet\Downloads\lms_db.txt" `
  -DbName lms_db `
  -DbUser lms_user
```

## Verification checklist

After setup:

1. Backend starts without Prisma connection errors.
2. Frontend can call the backend.
3. Login works with seeded credentials.
4. Courses load.
5. Course detail loads.
6. Lesson viewer loads.
7. Assignment and quiz pages load.

## Notes about this project

- Prisma schema is the canonical contract: `be/prisma/schema.prisma`
- Seed bootstrap is in: `be/prisma/seed.ts`
- Backend expects PostgreSQL only
- Docker Compose already defines a local Postgres option in `be/docker-compose.yml`
