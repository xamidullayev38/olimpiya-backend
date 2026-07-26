#!/bin/sh
set -e

echo "==> Running Prisma Database Migrations..."
npx prisma migrate deploy

echo "==> Starting application..."
exec "$@"
