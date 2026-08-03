#!/bin/sh
set -e

echo "==> Running Prisma Database Sync..."
npx prisma db push --skip-generate

echo "==> Starting application..."
exec "$@"
