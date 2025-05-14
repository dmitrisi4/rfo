#!/bin/bash

echo "Setting up RF Online MOBA project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js before continuing."
    exit 1
fi

# Check node version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "Node.js version 14 or higher is required. Please upgrade Node.js before continuing."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create directories if they don't exist
echo "Setting up project directories..."
mkdir -p src/assets/models
mkdir -p src/assets/textures
mkdir -p src/assets/sounds
mkdir -p src/components
mkdir -p src/scenes
mkdir -p src/utils

# Create build directory
echo "Creating build directory..."
mkdir -p dist

echo "Setup complete! You can now start the development server with 'npm start'" 