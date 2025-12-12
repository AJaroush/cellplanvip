#!/bin/bash

echo "🚀 Starting Cellular Network Planning Dashboard..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔧 Starting data server on port 3001..."
npm run server &
SERVER_PID=$!

# Wait a bit for server to start
sleep 2

echo "⚛️  Starting React app on port 3000..."
echo "📱 Open http://localhost:3000 in your browser"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null" EXIT

