#!/bin/bash

echo "🚀 Setting up ML Humanization Service..."

# Check if Python 3.11+ is installed
python_version=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
if [[ $(echo "$python_version < 3.9" | bc -l) -eq 1 ]]; then
    echo "❌ Python 3.9+ required. Current version: $python_version"
    exit 1
fi

echo "✅ Python version check passed"

# Create ML service directory
mkdir -p ml-service
cd ml-service

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install dependencies
echo "⬇️ Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Download required models
echo "🤖 Downloading ML models (this may take several minutes)..."
python -c "
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer
import spacy

print('Downloading FLAN-T5-Large...')
tokenizer = AutoTokenizer.from_pretrained('google/flan-t5-large')
model = AutoModelForSeq2SeqLM.from_pretrained('google/flan-t5-large')

print('Downloading BART-Large...')
bart_tokenizer = AutoTokenizer.from_pretrained('facebook/bart-large')
bart_model = AutoModelForSeq2SeqLM.from_pretrained('facebook/bart-large')

print('Downloading Sentence Transformer...')
semantic_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

print('Downloading T5-Small...')
t5_tokenizer = AutoTokenizer.from_pretrained('t5-small')
t5_model = AutoModelForSeq2SeqLM.from_pretrained('t5-small')

print('Models downloaded successfully!')
"

# Download spaCy model
echo "📝 Downloading spaCy models..."
python -m spacy download en_core_web_sm
python -m spacy download en_core_web_lg || echo "⚠️ Large model download failed, using small model"

# Create systemd service file (optional)
echo "⚙️ Creating systemd service file..."
cat > ml-humanization.service << EOF
[Unit]
Description=ML Humanization Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Setup complete!"
echo ""
echo "To start the service:"
echo "  cd ml-service"
echo "  source venv/bin/activate"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "Or using Docker:"
echo "  docker-compose up -d"