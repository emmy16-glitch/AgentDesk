#!/bin/bash

echo "🚀 Setting up AgentTrust Camber integration..."

# Check Node
echo ""
echo "Checking Node..."
node -v || {
    echo "❌ Node.js not installed"
    exit 1
}

# Check npm
echo ""
echo "Checking npm..."
npm -v || {
    echo "❌ npm not installed"
    exit 1
}

# Install dependencies
echo ""
echo "Installing project dependencies..."
npm install


# Check Camber CLI
echo ""
echo "Checking Camber CLI..."

if command -v camber >/dev/null 2>&1
then
    echo "✅ Camber CLI already installed"
    camber --version
else
    echo "Installing Camber CLI..."
    
    curl -fsSL https://raw.githubusercontent.com/cambercloud/camber-cli/main/install.sh | bash
    
    echo "Checking installation..."
    camber --version
fi


# Create env file
echo ""
echo "Creating .env.local..."

if [ -f ".env.local" ]
then
    echo ".env.local already exists"
else
cat <<EOT > .env.local
# Camber AI Integration
CAMBER_TOKEN=
EOT

echo "✅ Created .env.local"
fi


# Add env to gitignore

echo ""
echo "Updating .gitignore..."

touch .gitignore

grep -qxF ".env.local" .gitignore || echo ".env.local" >> .gitignore

echo "✅ .env.local protected"


echo ""
echo "================================"
echo "Setup complete"
echo "================================"

echo ""
echo "Next step:"
echo "Open .env.local and add your Camber token:"
echo ""
echo "CAMBER_TOKEN=your_token_here"
echo ""

