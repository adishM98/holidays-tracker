#!/bin/sh
set -e

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🚀 Starting Leave Management System..."

# Validate required environment variables
if [ -z "$DATABASE_HOST" ]; then
    log "❌ ERROR: DATABASE_HOST environment variable is required"
    exit 1
fi

if [ -z "$JWT_SECRET" ]; then
    log "⚠️  WARNING: JWT_SECRET not set, using default (not secure for production)"
    export JWT_SECRET="default-jwt-secret-change-in-production"
fi

# Wait for database to be ready (optional)
if [ -n "$WAIT_FOR_DB" ] && [ "$WAIT_FOR_DB" = "true" ]; then
    log "⏳ Waiting for database to be ready..."
    
    # Simple database connection check
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if npm run db:status >/dev/null 2>&1; then
            log "✅ Database is ready!"
            break
        fi
        
        log "🔄 Database not ready yet (attempt $attempt/$max_attempts), waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log "❌ Database failed to become ready within $((max_attempts * 2)) seconds"
        exit 1
    fi
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads
log "📁 Uploads directory ready"

# Check if frontend build exists
if [ -d "public" ] && [ -f "public/index.html" ]; then
    log "🌐 Frontend build detected"
else
    log "⚠️  Frontend build not found - API-only mode"
fi

# Print startup information
log "📊 Application Configuration:"
log "   NODE_ENV: ${NODE_ENV:-development}"
log "   PORT: ${PORT:-3000}"
log "   DATABASE_HOST: $DATABASE_HOST"
log "   API_PREFIX: ${API_PREFIX:-api}"

# Start the application
log "🎯 Starting NestJS application..."

# Add error handling and debugging
set -x  # Enable debug mode

# Use exec to replace the shell process with npm/node
# This ensures proper signal handling
if [ -f "package.json" ]; then
    log "📦 Using npm start command"
    
    # Add some debugging
    log "📋 Checking main.js file..."
    if [ -f "dist/src/main.js" ]; then
        log "✅ Main file exists at dist/src/main.js"
        ls -la dist/src/main.js
    else
        log "❌ Main file NOT found at dist/src/main.js"
        log "📁 Available files in dist/:"
        find dist/ -name "*.js" | head -10
        exit 1
    fi
    
    # Start with direct node execution for better error visibility
    log "🔧 Running node directly to capture errors..."
    node dist/src/main.js
else
    log "🔧 Direct node execution"
    log "📋 Checking main.js file..."
    if [ -f "dist/src/main.js" ]; then
        log "✅ Main file exists"
        node dist/src/main.js
    else
        log "❌ Main file NOT found"
        exit 1
    fi
fi