#!/bin/bash

echo "🚀 Starting Leave Management System..."

# Check if PostgreSQL is running via Docker
if ! docker ps | grep -q leave_management_db; then
    echo "🐘 Starting PostgreSQL database..."
    cd leave-management-backend
    docker-compose up -d postgres
    cd ..
    
    # Wait for database to be ready
    echo "⏳ Waiting for database to be ready..."
    sleep 10
else
    echo "✅ PostgreSQL is already running"
fi

# Start backend in background
echo "🔧 Starting Backend API..."
cd leave-management-backend
npm install > /dev/null 2>&1
npm run start:dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 15

# Start frontend
echo "🎨 Starting Frontend..."
npm install > /dev/null 2>&1
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ System is starting up!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:8081"
echo "   Backend API: http://localhost:3000"
echo "   API Documentation: http://localhost:3000/api/docs"
echo ""
echo "🔑 Default Admin Login:"
echo "   Email: admin@company.com"
echo "   Password: Admin@123"
echo ""
echo "📝 To stop all services:"
echo "   Press Ctrl+C and run: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Wait for user to stop
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait