#!/bin/bash

echo "🧪 Testing ML Integration..."

# Start services if not running
if ! curl -s -f http://localhost:8000/health > /dev/null; then
    echo "🚀 Starting ML service..."
    cd ml-service
    source venv/bin/activate
    uvicorn main:app --host 0.0.0.0 --port 8000 &
    ML_PID=$!
    cd ..
    
    # Wait for service to start
    echo "⏳ Waiting for ML service to start..."
    for i in {1..30}; do
        if curl -s -f http://localhost:8000/health > /dev/null; then
            echo "✅ ML service started"
            break
        fi
        sleep 2
    done
fi

# Test pattern analysis
echo "🔍 Testing pattern analysis..."
curl -X POST http://localhost:8000/analyze-patterns \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a test sentence. It should be analyzed for writing patterns. The analysis will help understand the user writing style.",
    "user_id": "test_user"
  }' | jq .

# Test text humanization (non-streaming)
echo "🤖 Testing text humanization..."
curl -X POST http://localhost:8000/humanize-text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The comprehensive analysis demonstrates that the implementation facilitates optimal performance through systematic optimization.",
    "user_id": "test_user",
    "target_style": "natural"
  }' > test_output.txt

echo "📄 Humanization result saved to test_output.txt"

# Test Next.js integration
if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo "🔗 Testing Next.js integration..."
    curl -X POST http://localhost:3000/api/humanize \
      -H "Content-Type: application/json" \
      -d '{
        "text": "The comprehensive analysis demonstrates systematic optimization."
      }' > nextjs_test_output.txt
    
    echo "📄 Next.js integration result saved to nextjs_test_output.txt"
else
    echo "⚠️ Next.js app not running, skipping integration test"
fi

# Cleanup
if [ ! -z "$ML_PID" ]; then
    echo "🧹 Cleaning up test processes..."
    kill $ML_PID 2>/dev/null
fi

echo "✅ ML integration testing complete!"