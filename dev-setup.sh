#!/bin/bash
echo "🔧 Setting up development environment..."

# Install Next.js dependencies
echo "📦 Installing Next.js dependencies..."
npm install

# Add ML service related dependencies
npm install concurrently --save-dev

# Setup ML service
echo "🤖 Setting up ML service..."
./setup-ml-service.sh

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local..."
    cat > .env.local << 'ENVEOF'
# ML Service Configuration
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_ENABLED=true
ML_SERVICE_TIMEOUT=120000

# Your existing environment variables...
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
CLAUDE_API_KEY=your-claude-api-key
ENVEOF
    
    echo "⚠️ Please update .env.local with your actual API keys"
fi

echo "✅ Development environment setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev:full  # Starts both Next.js and ML service"
echo ""
echo "Or separately:"
echo "  npm run dev       # Next.js only"
echo "  npm run ml:start  # ML service only"