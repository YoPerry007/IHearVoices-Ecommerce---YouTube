#!/bin/bash

echo "🚀 Starting Ghana Voice ML Service..."
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Navigate to service directory
cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements_simple.txt
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Start the service
echo
echo "🎤 Starting Ghana Voice ML Service..."
echo "🌐 Service will be available at: http://localhost:5000"
echo "🇬🇭 Optimized for Ghana accents and pronunciations"
echo
echo "Press Ctrl+C to stop the service"
echo

python3 simple_voice_service.py
