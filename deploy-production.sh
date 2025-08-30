#!/bin/bash
echo "🚀 Deploying to production..."

# Build Next.js app
echo "📦 Building Next.js application..."
npm run build

# Build ML service
echo "🤖 Building ML service..."
cd ml-service
docker build -t ml-humanization:prod .
cd ..

# Deploy with docker-compose
echo "🐳 Deploying with Docker Compose..."
docker-compose -f docker-compose.full-stack.yml up -d

# Health check
echo "🏥 Running health checks..."
sleep 30

# Check Next.js
if curl -f http://localhost:3000/api/health; then
    echo "✅ Next.js app is healthy"
else
    echo "❌ Next.js app health check failed"
    exit 1
fi

# Check ML service
if curl -f http://localhost:8000/health; then
    echo "✅ ML service is healthy"
else
    echo "❌ ML service health check failed"
    exit 1
fi

echo "🎉 Deployment successful!"