#!/bin/bash

# Deployment script for Route Optima Backend

set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# Pull latest Docker image
echo "🐳 Pulling latest Docker image..."
docker-compose pull

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker-compose down

# Start new containers
echo "✅ Starting new containers..."
docker-compose up -d

# Clean up unused Docker resources
echo "🧹 Cleaning up..."
docker system prune -f

# Show running containers
echo "📊 Running containers:"
docker-compose ps

echo "✨ Deployment completed successfully!"
