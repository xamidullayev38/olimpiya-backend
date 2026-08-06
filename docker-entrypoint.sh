#!/bin/sh
set -e

echo "==> Running Prisma Database Sync..."
npx --yes prisma db push --skip-generate

echo "==> Starting application..."
exec "$@"
