#!/bin/sh
set -e

echo "==> Running Prisma Database Sync..."
npx prisma db push --accept-data-loss --skip-generate

echo "==> Starting application..."
exec "$@"
