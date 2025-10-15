#!/bin/bash

# Hawker Opportunity Score Platform Setup Script
# This script sets up the complete development environment

set -e

echo "🚀 Setting up Hawker Opportunity Score Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm $(npm -v) detected"

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Setup backend
print_status "Setting up backend..."
cd backend

# Install backend dependencies
print_status "Installing backend dependencies..."
npm install

# Copy environment file
if [ ! -f .env ]; then
    print_status "Creating backend environment file..."
    cp env.example .env
    print_warning "Please edit backend/.env with your database and API keys"
else
    print_success "Backend environment file already exists"
fi

# Setup Prisma
print_status "Setting up Prisma..."
npx prisma generate

print_warning "Please set up your PostgreSQL database and update DATABASE_URL in backend/.env"
print_warning "Then run: cd backend && npx prisma db push && npm run db:seed"

cd ..

# Setup frontend
print_status "Setting up frontend..."
cd frontend

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install

# Copy environment file
if [ ! -f .env.local ]; then
    print_status "Creating frontend environment file..."
    cp env.example .env.local
    print_warning "Please edit frontend/.env.local with your Mapbox token"
else
    print_success "Frontend environment file already exists"
fi

cd ..

print_success "Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set up PostgreSQL database"
echo "2. Update backend/.env with your database URL and API keys"
echo "3. Update frontend/.env.local with your Mapbox token"
echo "4. Run database migrations: cd backend && npx prisma db push"
echo "5. Seed the database: cd backend && npm run db:seed"
echo "6. Start the development servers: npm run dev"
echo ""
echo "🔗 Useful commands:"
echo "  npm run dev          - Start both frontend and backend"
echo "  npm run dev:backend  - Start only backend"
echo "  npm run dev:frontend - Start only frontend"
echo "  npm run build        - Build for production"
echo ""
echo "📚 Documentation:"
echo "  Backend API: http://localhost:3001/api"
echo "  Frontend: http://localhost:3000"
echo "  Health check: http://localhost:3001/health"
echo ""
print_success "Happy coding! 🎉"
