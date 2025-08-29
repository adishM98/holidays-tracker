#!/bin/bash

# Leave Management System Deployment Script
# This script builds and deploys the Leave Management System using Docker

set -e  # Exit on any error

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Prerequisites check passed!"
}

# Create required directories
create_directories() {
    print_status "Creating required directories..."
    
    mkdir -p ssl
    mkdir -p logs
    
    print_success "Directories created!"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.production ]; then
            cp .env.production .env
            print_warning "Copied .env.production to .env"
            print_warning "Please review and update the .env file with your specific configuration!"
        else
            print_error ".env file not found and no .env.production template available"
            exit 1
        fi
    else
        print_success "Environment file already exists"
    fi
}

# Build and start services
build_and_start() {
    print_status "Building and starting services..."
    
    # Stop any existing services
    docker-compose down
    
    # Build the application
    print_status "Building the application image..."
    docker-compose build --no-cache app
    
    # Start the services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services started!"
}

# Wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for database
    print_status "Waiting for database to be ready..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
            print_success "Database is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Database failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for application
    print_status "Waiting for application to be ready..."
    timeout=120
    while [ $timeout -gt 0 ]; do
        if curl -f -s http://localhost:3000/api/health >/dev/null 2>&1; then
            print_success "Application is ready!"
            break
        fi
        sleep 5
        timeout=$((timeout - 5))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Application failed to start within 120 seconds"
        print_error "Check logs with: docker-compose logs app"
        exit 1
    fi
}

# Show deployment summary
show_summary() {
    print_success "🎉 Deployment completed successfully!"
    echo
    echo "Access your application:"
    echo "  📱 Application: http://localhost:3000"
    echo "  📚 API Documentation: http://localhost:3000/api/docs"
    echo "  🔍 Health Check: http://localhost:3000/api/health"
    echo
    echo "Default admin credentials:"
    echo "  📧 Email: admin@company.com"
    echo "  🔑 Password: Admin@123"
    echo
    echo "Useful commands:"
    echo "  📋 Check status: docker-compose ps"
    echo "  📜 View logs: docker-compose logs -f app"
    echo "  🛑 Stop services: docker-compose down"
    echo "  🗑️  Remove everything: docker-compose down -v"
    echo
    print_warning "⚠️  Remember to:"
    print_warning "   1. Update JWT secrets in .env file"
    print_warning "   2. Configure email settings in .env file"
    print_warning "   3. Change default admin password"
    print_warning "   4. Set up SSL certificates for production"
}

# Production deployment with Nginx
deploy_production() {
    print_status "Starting production deployment with Nginx..."
    
    # Check if SSL certificates exist
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        print_warning "SSL certificates not found in ssl/ directory"
        print_warning "HTTPS will not be available. Add certificates and update nginx.conf for SSL support."
    fi
    
    # Start with production profile
    docker-compose --profile production up -d
    
    print_success "Production deployment completed!"
    echo "  🌐 HTTP: http://localhost"
    echo "  🔒 HTTPS: https://localhost (if certificates configured)"
}

# Main execution
main() {
    echo "🚀 Leave Management System Deployment Script"
    echo "=============================================="
    
    # Parse command line arguments
    PRODUCTION=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            --production)
                PRODUCTION=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --production    Deploy with Nginx reverse proxy"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    check_prerequisites
    create_directories
    setup_environment
    build_and_start
    wait_for_services
    
    if [ "$PRODUCTION" = true ]; then
        deploy_production
    fi
    
    show_summary
}

# Run main function
main "$@"