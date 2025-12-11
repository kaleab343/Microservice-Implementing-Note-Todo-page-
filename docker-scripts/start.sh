#!/bin/bash

# MicroNote - Start all services
echo "🚀 Starting MicroNote Microservices..."

# Create necessary directories
mkdir -p logs

# Start services in development mode
echo "📦 Building and starting services..."
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
docker-compose ps

echo ""
echo "🎉 MicroNote is starting up!"
echo ""
echo "📱 Frontend: http://localhost"
echo "🔧 API Gateway: http://localhost:8080/health"
echo "🔐 Auth Service: http://localhost:3001/health"
echo "📝 Notes Service: http://localhost:3002/health"
echo "✅ Todos Service: http://localhost:3003/health"
echo "👤 User Service: http://localhost:3004/health"
echo ""
echo "📊 View logs: docker-compose logs -f [service-name]"
echo "🛑 Stop all: docker-compose down"