#!/bin/bash

# MicroNote - Quick Start Script
# This script sets up and starts the entire microservices architecture

echo "🎯 MicroNote Microservices Quick Start"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop first."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. You can customize it if needed."
else
    echo "✅ .env file already exists"
fi

echo ""

# Make scripts executable
echo "🔧 Setting up executable permissions..."
chmod +x docker-scripts/*.sh
chmod +x quick-start.sh

echo ""

# Check if ports are available
echo "🔍 Checking if required ports are available..."
ports=(80 3001 3002 3003 3004 3306 6379 8080)
occupied_ports=()

for port in "${ports[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        occupied_ports+=($port)
    fi
done

if [ ${#occupied_ports[@]} -ne 0 ]; then
    echo "⚠️  The following ports are occupied: ${occupied_ports[*]}"
    echo "   Please stop services using these ports or modify docker-compose.yml"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Setup cancelled"
        exit 1
    fi
else
    echo "✅ All required ports are available"
fi

echo ""

# Start services
echo "🚀 Starting MicroNote microservices..."
echo "   This may take a few minutes on first run..."
echo ""

docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 15

# Check service health
echo ""
echo "🏥 Checking service health..."

services=(
    "api-gateway:8080"
    "auth-service:3001"
    "notes-service:3002"
    "todos-service:3003"
    "user-service:3004"
)

for service in "${services[@]}"; do
    name=${service%:*}
    port=${service#*:}
    
    if curl -s -f "http://localhost:$port/health" >/dev/null; then
        echo "✅ $name (port $port) - healthy"
    else
        echo "❌ $name (port $port) - not responding"
    fi
done

echo ""

# Display final information
echo "🎉 MicroNote Microservices Setup Complete!"
echo "=========================================="
echo ""
echo "🌐 Access your application:"
echo "   📱 Frontend:        http://localhost"
echo "   🔧 API Gateway:     http://localhost:8080"
echo "   📊 Health Check:    http://localhost:8080/health"
echo ""
echo "🔧 Individual Services:"
echo "   🔐 Auth Service:    http://localhost:3001/health"
echo "   📝 Notes Service:   http://localhost:3002/health"
echo "   ✅ Todos Service:   http://localhost:3003/health"
echo "   👤 User Service:    http://localhost:3004/health"
echo ""
echo "🛠️  Management Commands:"
echo "   📊 View status:     docker-compose ps"
echo "   📋 View logs:       docker-compose logs -f"
echo "   🛑 Stop all:        docker-compose down"
echo "   🧹 Clean up:        make clean"
echo ""
echo "📚 Documentation:"
echo "   📖 Docker Guide:    README-DOCKER.md"
echo "   🔧 Makefile:        make help"
echo ""

# Check if frontend is accessible
echo "🔍 Testing frontend accessibility..."
if curl -s -f "http://localhost" >/dev/null; then
    echo "✅ Frontend is accessible!"
else
    echo "⚠️  Frontend might still be starting. Wait a moment and try http://localhost"
fi

echo ""
echo "🎯 Your microservices architecture is ready!"
echo "   Start building amazing features with MicroNote! 🚀"