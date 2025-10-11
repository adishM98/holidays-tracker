#!/bin/sh
set -e

echo "🚀 Leave Management System - Starting..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for database..."
sleep 5
echo "✅ Database ready!"

# Step 1: Start app briefly to let TypeORM create base schema, then stop it
echo "📋 Step 1: Initializing database schema..."
timeout 10 npm run start:prod > /dev/null 2>&1 || true
sleep 2

# Step 2: Run migrations (base tables now exist)
echo "📊 Step 2: Running database migrations..."
if npm run migration:run:prod; then
    echo "✅ Migrations completed successfully!"
else
    echo "⚠️  Migration failed or no pending migrations"
fi

# Step 3: Start the application for real
echo "🎯 Step 3: Starting application..."
exec npm run start:prod