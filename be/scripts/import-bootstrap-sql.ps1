param(
  [Parameter(Mandatory = $true)]
  [string]$SqlFile,
  [string]$DbName = "lms_db",
  [string]$DbUser = "lms_user",
  [string]$PgHost = "localhost",
  [int]$PgPort = 5432
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Require-Command "psql"

if (-not (Test-Path $SqlFile)) {
  throw "SQL file not found: $SqlFile"
}

$dbDsn = "postgresql://${DbUser}@${PgHost}:$PgPort/${DbName}"

Write-Host "Importing SQL bootstrap into '$DbName' from:"
Write-Host "  $SqlFile"

psql $dbDsn -v ON_ERROR_STOP=1 -f $SqlFile

Write-Host ""
Write-Host "Import complete."
Write-Host "Recommended next step:"
Write-Host "  cd d:\Leanring\LMS\be"
Write-Host "  npx prisma generate"
