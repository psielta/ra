#!/bin/sh
set -e

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "Installing dependencies..."
  npm ci
  npx prisma generate
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Ra dev server on port ${PORT:-3000}..."
exec npm run dev