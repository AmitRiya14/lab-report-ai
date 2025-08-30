#!/bin/bash

echo "🏥 Health Check Dashboard"
echo "========================"

# Check Next.js app
echo -n "Next.js App: "
if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo "✅ Healthy"
    
    # Get detailed health info
    health_info=$(curl -s http://localhost:3000/api/health | jq -r '.timestamp')
    echo "  Last check: $health_info"
else
    echo "❌ Unhealthy"
fi

# Check ML service
echo -n "ML Service: "
if curl -s -f http://localhost:8000/health > /dev/null; then
    echo "✅ Healthy"
    
    # Get model info
    model_info=$(curl -s http://localhost:8000/health | jq -r '.models_loaded')
    echo "  Models loaded: $model_info"
else
    echo "❌ Unhealthy"
    echo "  Try: npm run ml:start"
fi

# Check database connections
echo -n "Database: "
if curl -s -f http://localhost:3000/api/test-supabase > /dev/null; then
    echo "✅ Connected"
else
    echo "❌ Connection failed"
fi

# Check disk space for ML models
echo -n "ML Cache Size: "
if [ -d "ml-service/.cache" ]; then
    cache_size=$(du -sh ml-service/.cache 2>/dev/null | cut -f1)
    echo "$cache_size"
else
    echo "Not found"
fi

# Memory usage
echo -n "ML Service Memory: "
ml_pid=$(pgrep -f "uvicorn main:app")
if [ ! -z "$ml_pid" ]; then
    memory=$(ps -p $ml_pid -o rss= 2>/dev/null)
    if [ ! -z "$memory" ]; then
        memory_mb=$((memory / 1024))
        echo "${memory_mb}MB"
    else
        echo "Unknown"
    fi
else
    echo "Not running"
fi

echo ""
echo "🔗 Useful URLs:"
echo "  Next.js App: http://localhost:3000"
echo "  ML Service: http://localhost:8000"
echo "  ML Docs: http://localhost:8000/docs"
echo "  Health Dashboard: http://localhost:3000/api/health"