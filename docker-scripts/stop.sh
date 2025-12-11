#!/bin/bash

echo "🛑 Stopping MicroNote services..."

# Stop all services
docker-compose down

echo "🧹 Cleaning up..."

# Remove unused images (optional)
# docker image prune -f

echo "✅ All services stopped successfully!"