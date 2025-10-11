#!/bin/bash

# Container Migration Helper Script
# This script helps run database operations inside the Docker container

# Default container name - can be overridden with environment variable
CONTAINER_NAME="${CONTAINER_NAME:-leave_management_app}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if container is running
check_container() {
    if ! docker ps | grep -q $CONTAINER_NAME; then
        echo -e "${RED}❌ Container $CONTAINER_NAME is not running!${NC}"
        echo "Please start the container first with: docker-compose up -d"
        echo "Or set CONTAINER_NAME environment variable if using a different name"
        exit 1
    fi
}

# Function to run migration
run_migrations() {
    echo -e "${YELLOW}🔄 Running database migrations...${NC}"
    docker exec $CONTAINER_NAME npm run migration:run:prod
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migrations completed successfully!${NC}"
    else
        echo -e "${RED}❌ Migration failed!${NC}"
        exit 1
    fi
}

# Function to revert migration
revert_migrations() {
    echo -e "${YELLOW}⏪ Reverting last migration...${NC}"
    docker exec $CONTAINER_NAME npm run migration:revert:prod
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration reverted successfully!${NC}"
    else
        echo -e "${RED}❌ Migration revert failed!${NC}"
        exit 1
    fi
}

# Function to generate migration
generate_migration() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ Please provide a migration name!${NC}"
        echo "Usage: $0 generate MigrationName"
        exit 1
    fi
    
    echo -e "${YELLOW}📝 Generating migration: $1${NC}"
    docker exec $CONTAINER_NAME npm run migration:generate:prod -- $1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Migration generated successfully!${NC}"
    else
        echo -e "${RED}❌ Migration generation failed!${NC}"
        exit 1
    fi
}

# Function to show database status
show_status() {
    echo -e "${YELLOW}📊 Checking database status...${NC}"
    docker exec $CONTAINER_NAME npm run db:status
}

# Function to show help
show_help() {
    echo "Container Database Migration Helper"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  run               Run pending migrations"
    echo "  revert            Revert the last migration"
    echo "  generate <name>   Generate a new migration"
    echo "  status            Show database status"
    echo "  shell             Open bash shell in container"
    echo "  help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  CONTAINER_NAME    Override default container name (default: leave_management_app)"
    echo ""
    echo "Examples:"
    echo "  $0 run"
    echo "  $0 generate AddNewTable"
    echo "  $0 revert"
    echo "  $0 status"
    echo "  CONTAINER_NAME=my_app_container $0 run"
}

# Main script logic
case "$1" in
    "run")
        check_container
        run_migrations
        ;;
    "revert")
        check_container
        revert_migrations
        ;;
    "generate")
        check_container
        generate_migration "$2"
        ;;
    "status")
        check_container
        show_status
        ;;
    "shell")
        check_container
        echo -e "${YELLOW}🐚 Opening shell in container...${NC}"
        docker exec -it $CONTAINER_NAME bash
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
