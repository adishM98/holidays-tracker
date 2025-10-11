#!/bin/bash

echo "🚀 Starting Leave Management System Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your database and email configuration before running the application"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start PostgreSQL with Docker Compose
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start the application
echo "🎯 Starting the application..."
npm run start:dev