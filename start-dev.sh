#!/bin/bash

# Quick Start Script for Local Development
echo "🚀 Starting Global IPI Platform - Local Development"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual credentials before continuing!"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL database
echo ""
echo "📦 Starting PostgreSQL database..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Start Backend
echo ""
echo "🔧 Starting Backend (Spring Boot)..."
cd backend
if [ ! -f .env ]; then
    cp ../.env .env
fi

# Build backend
echo "📦 Building backend..."
./mvnw clean install -DskipTests

# Run backend in background
echo "▶️  Running backend..."
./mvnw spring-boot:run > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 15

# Start Frontend
echo ""
echo "🎨 Starting Frontend (React)..."
cd frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

if [ ! -f .env ]; then
    cp ../.env .env
fi

# Run frontend
echo "▶️  Running frontend..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Application started successfully!"
echo "=================================================="
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:8080/api"
echo "🗄️  Database: localhost:5432"
echo "=================================================="
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f backend.log"
echo "   Frontend: docker-compose logs -f frontend"
echo ""
echo "🛑 To stop: docker-compose down && kill $BACKEND_PID $FRONTEND_PID"
