param(
  [string]$DbName = "lms_db",
  [string]$DbUser = "lms_user",
  [string]$DbPassword = "lms_password",
  [string]$PgHost = "localhost",
  [int]$PgPort = 5432,
  [string]$AdminUser = "postgres",
  [string]$JwtSecret = "change-me-in-local-dev",
  [string]$CorsOrigins = "http://localhost:5173"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
$envExamplePath = Join-Path $backendDir ".env.example"
$envPath = Join-Path $backendDir ".env"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command "psql"

$adminDsn = "postgresql://${AdminUser}@${PgHost}:$PgPort/postgres"
$databaseUrl = "postgresql://${DbUser}:${DbPassword}@${PgHost}:$PgPort/${DbName}?schema=public"

Write-Host "Ensuring PostgreSQL role '$DbUser' exists..."
psql $adminDsn -v ON_ERROR_STOP=1 -c "DO `$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$DbUser') THEN CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword'; ELSE ALTER ROLE $DbUser WITH LOGIN PASSWORD '$DbPassword'; END IF; END `$\$;"

Write-Host "Ensuring PostgreSQL database '$DbName' exists..."
psql $adminDsn -v ON_ERROR_STOP=1 -c "SELECT 'CREATE DATABASE $DbName OWNER $DbUser' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DbName')\gexec"

Write-Host "Granting database privileges..."
psql $adminDsn -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE $DbName TO $DbUser;"

if (-not (Test-Path $envExamplePath)) {
  throw "Missing .env.example at $envExamplePath"
}

$envContent = Get-Content $envExamplePath -Raw
$envContent = $envContent -replace 'DATABASE_URL="[^"]*"', "DATABASE_URL=""$databaseUrl"""
$envContent = $envContent -replace 'JWT_ACCESS_SECRET=.*', "JWT_ACCESS_SECRET=$JwtSecret"
$envContent = $envContent -replace 'CORS_ORIGINS=.*', "CORS_ORIGINS=$CorsOrigins"
$envContent = $envContent -replace 'ADMIN_SEED_PASSWORD=.*', 'ADMIN_SEED_PASSWORD=Admin@12345'
$envContent = $envContent -replace 'INSTRUCTOR_SEED_PASSWORD=.*', 'INSTRUCTOR_SEED_PASSWORD=Instructor@12345'
$envContent = $envContent -replace 'STUDENT_SEED_PASSWORD=.*', 'STUDENT_SEED_PASSWORD=Student@12345'

Set-Content -Path $envPath -Value $envContent -Encoding UTF8

Write-Host ""
Write-Host "Database setup complete."
Write-Host "DATABASE_URL:"
Write-Host "  $databaseUrl"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  cd $backendDir"
Write-Host "  npx prisma generate"
Write-Host "  npx prisma migrate dev --name init"
Write-Host "  npm run prisma:seed"
Write-Host "  npm run dev"
