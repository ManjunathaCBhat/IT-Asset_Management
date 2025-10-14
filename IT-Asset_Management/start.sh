#!/bin/bash

echo "================================================"
echo "  IT Asset Management - Starting Application"
echo "================================================"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

echo ""
echo "✅ Prerequisites check passed"
echo ""

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo "✅ Python dependencies installed"
echo ""

# Navigate to frontend and install dependencies
echo "📦 Installing frontend dependencies..."
cd frontend

if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install frontend dependencies"
        exit 1
    fi
fi

echo "✅ Frontend dependencies installed"
echo ""

# Build React app
echo "🔨 Building React application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build frontend"
    exit 1
fi

echo "✅ React app built successfully"
echo ""

# Go back to root
cd ..

# Start the FastAPI server (which now serves both backend and frontend)
echo "🚀 Starting FastAPI server..."
echo "================================================"
echo "  Backend API: http://localhost:8080/api"
echo "  Frontend: http://localhost:8080"
echo "  API Docs: http://localhost:8080/docs"
echo "================================================"
echo ""

python3 main.py