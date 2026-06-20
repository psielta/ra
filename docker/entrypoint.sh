#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting Ra on port ${PORT:-3000}..."
exec "$@"
