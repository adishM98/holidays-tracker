#!/bin/bash

# ====================================================================
# ADMIN PASSWORD RESET SCRIPT
# ====================================================================
# This script helps reset admin password directly from database level
# Password: admin123
# ====================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_LOCAL_HOST="localhost"
DEFAULT_LOCAL_PORT="5432"
DEFAULT_LOCAL_USER="postgres"
DEFAULT_LOCAL_PASSWORD="postgres"
DEFAULT_LOCAL_DB="leave_management"

DEFAULT_AZURE_HOST="ee-test-system.postgres.database.azure.com"
DEFAULT_AZURE_PORT="5432"
DEFAULT_AZURE_USER="postgres"
DEFAULT_AZURE_PASSWORD="T4mZ8rW2qK9E"
DEFAULT_AZURE_DB="leave_management"

# Admin credentials
ADMIN_EMAIL="admin@company.com"
ADMIN_PASSWORD_HASH="\$2b\$10\$rKZSYPJA1wdHJEZLdYwJ9O7mC9XmMK5zR4X8U6yCJtQLZqJtGJqTS"
BACKUP_EMAIL="backup@company.com"

print_header() {
    echo -e "${BLUE}=====================================================================${NC}"
    echo -e "${BLUE}                    ADMIN PASSWORD RESET SCRIPT${NC}"
    echo -e "${BLUE}=====================================================================${NC}"
    echo -e "Admin Email: ${GREEN}${ADMIN_EMAIL}${NC}"
    echo -e "Admin Password: ${GREEN}admin123${NC}"
    echo -e "${BLUE}=====================================================================${NC}"
    echo ""
}

print_usage() {
    echo -e "${YELLOW}Usage:${NC}"
    echo -e "  $0 [local|azure] [option]"
    echo ""
    echo -e "${YELLOW}Database Types:${NC}"
    echo -e "  local   - Local PostgreSQL (localhost:5432)"
    echo -e "  azure   - Azure PostgreSQL (ee-test-system.postgres.database.azure.com)"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  1|reset     - Reset existing admin password"
    echo -e "  2|recreate  - Delete and recreate admin user"
    echo -e "  3|backup    - Create backup admin user"
    echo -e "  4|check     - Check admin user status"
    echo -e "  5|all       - Show all users"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 local reset      # Reset admin password on local DB"
    echo -e "  $0 azure check      # Check admin status on Azure DB"
    echo -e "  $0 local backup     # Create backup admin on local DB"
    echo ""
}

setup_connection() {
    local db_type=$1
    
    if [ "$db_type" = "local" ]; then
        export PGHOST="${PGHOST:-$DEFAULT_LOCAL_HOST}"
        export PGPORT="${PGPORT:-$DEFAULT_LOCAL_PORT}"
        export PGUSER="${PGUSER:-$DEFAULT_LOCAL_USER}"
        export PGPASSWORD="${PGPASSWORD:-$DEFAULT_LOCAL_PASSWORD}"
        export PGDATABASE="${PGDATABASE:-$DEFAULT_LOCAL_DB}"
        export PGSSLMODE="prefer"
        echo -e "${BLUE}📍 Connecting to LOCAL PostgreSQL:${NC}"
    elif [ "$db_type" = "azure" ]; then
        export PGHOST="${PGHOST:-$DEFAULT_AZURE_HOST}"
        export PGPORT="${PGPORT:-$DEFAULT_AZURE_PORT}"
        export PGUSER="${PGUSER:-$DEFAULT_AZURE_USER}"
        export PGPASSWORD="${PGPASSWORD:-$DEFAULT_AZURE_PASSWORD}"
        export PGDATABASE="${PGDATABASE:-$DEFAULT_AZURE_DB}"
        export PGSSLMODE="require"
        echo -e "${BLUE}📍 Connecting to AZURE PostgreSQL:${NC}"
    else
        echo -e "${RED}❌ Invalid database type. Use 'local' or 'azure'${NC}"
        exit 1
    fi
    
    echo -e "   Host: ${GREEN}$PGHOST:$PGPORT${NC}"
    echo -e "   User: ${GREEN}$PGUSER${NC}"
    echo -e "   Database: ${GREEN}$PGDATABASE${NC}"
    echo ""
}

run_query() {
    local query="$1"
    local description="$2"
    
    echo -e "${YELLOW}🔧 $description...${NC}"
    if psql -c "$query"; then
        echo -e "${GREEN}✅ $description completed successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        echo ""
        return 1
    fi
}

reset_admin_password() {
    local query="
    UPDATE users 
    SET 
        password_hash = '$ADMIN_PASSWORD_HASH',
        updated_at = NOW(),
        must_change_password = false,
        is_active = true
    WHERE email = '$ADMIN_EMAIL';
    
    SELECT 
        CASE 
            WHEN EXISTS (SELECT 1 FROM users WHERE email = '$ADMIN_EMAIL') 
            THEN 'Admin password reset successful' 
            ELSE 'Admin user not found' 
        END as result;
    "
    
    run_query "$query" "Resetting admin password"
}

recreate_admin_user() {
    local query="
    -- Delete existing admin user
    DELETE FROM users WHERE email = '$ADMIN_EMAIL';
    
    -- Create fresh admin user
    INSERT INTO users (id, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        '$ADMIN_EMAIL',
        '$ADMIN_PASSWORD_HASH',
        'admin',
        true,
        false,
        NOW(),
        NOW()
    );
    
    SELECT 'Admin user recreated successfully' as result;
    "
    
    run_query "$query" "Recreating admin user"
}

create_backup_admin() {
    local query="
    INSERT INTO users (id, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        '$BACKUP_EMAIL',
        '$ADMIN_PASSWORD_HASH',
        'admin',
        true,
        false,
        NOW(),
        NOW()
    ) 
    ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = NOW(),
        is_active = true;
    
    SELECT 'Backup admin user created/updated successfully' as result;
    "
    
    echo -e "${YELLOW}📧 Creating backup admin: ${GREEN}$BACKUP_EMAIL${NC} / ${GREEN}admin123${NC}"
    run_query "$query" "Creating backup admin user"
}

check_admin_status() {
    local query="
    SELECT 
        id,
        email,
        role,
        is_active,
        must_change_password,
        created_at,
        updated_at
    FROM users 
    WHERE email = '$ADMIN_EMAIL';
    "
    
    echo -e "${YELLOW}🔍 Checking admin user status...${NC}"
    psql -c "$query"
    echo ""
}

show_all_users() {
    local query="
    SELECT 
        email,
        role,
        is_active,
        must_change_password,
        created_at
    FROM users 
    ORDER BY role, email;
    "
    
    echo -e "${YELLOW}👥 All users in database...${NC}"
    psql -c "$query"
    echo ""
    
    local count_query="
    SELECT role, COUNT(*) as user_count
    FROM users 
    GROUP BY role
    ORDER BY role;
    "
    
    echo -e "${YELLOW}📊 User count by role...${NC}"
    psql -c "$count_query"
    echo ""
}

test_connection() {
    echo -e "${YELLOW}🔗 Testing database connection...${NC}"
    if psql -c "SELECT version();" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        echo -e "${RED}Please check your connection parameters${NC}"
        echo ""
        return 1
    fi
}

main() {
    print_header
    
    # Check arguments
    if [ $# -lt 1 ]; then
        print_usage
        exit 1
    fi
    
    local db_type=$1
    local option=${2:-"reset"}
    
    # Setup database connection
    setup_connection "$db_type"
    
    # Test connection first
    if ! test_connection; then
        exit 1
    fi
    
    # Execute based on option
    case $option in
        "1"|"reset")
            reset_admin_password
            check_admin_status
            ;;
        "2"|"recreate")
            echo -e "${YELLOW}⚠️  This will DELETE and recreate the admin user!${NC}"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                recreate_admin_user
                check_admin_status
            else
                echo -e "${YELLOW}Operation cancelled${NC}"
            fi
            ;;
        "3"|"backup")
            create_backup_admin
            ;;
        "4"|"check")
            check_admin_status
            ;;
        "5"|"all")
            show_all_users
            ;;
        *)
            echo -e "${RED}❌ Invalid option: $option${NC}"
            print_usage
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}🎉 Script completed successfully!${NC}"
    echo -e "${BLUE}=====================================================================${NC}"
}

# Run main function with all arguments
main "$@"