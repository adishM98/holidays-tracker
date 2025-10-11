# Database Management

This document describes the database setup and management scripts for the Leave Management Backend.

## Available Scripts

### `npm run db:create`
Creates the database and all tables if they don't exist.

```bash
npm run db:create
```

**What it does:**
1. ✅ Creates the PostgreSQL database if it doesn't exist
2. 📋 Creates all base database tables using TypeORM synchronization
3. ✅ Database is ready for use (initial data will be created when the app starts)

### `npm run db:status`
Checks the current database status and lists all tables.

```bash
npm run db:status
```

**Output example:**
```
📊 Database 'leave_management': ✅ EXISTS
📋 Tables (12):
   - calendar_events
   - departments
   - employees
   - google_calendar_tokens
   - holidays
   - leave_balances
   - leave_balances_history
   - leave_requests
   - migrations
   - password_reset_tokens
   - system_settings
   - users
```

### `npm run db:drop`
⚠️ **DANGEROUS** - Drops the entire database.

```bash
npm run db:drop
```

**Warning:** This will permanently delete all data! Use with caution.

### `npm run db:reset`
Completely resets the database (drops and recreates).

```bash
npm run db:reset
```

**What it does:**
1. 🗑️ Drops the existing database
2. 📊 Creates a fresh database (empty)
3. 📋 Creates all base tables using TypeORM synchronization
4. 📊 Runs all database migrations to add additional tables and schema changes
5. ✅ Database is ready for use (initial data will be created when the app starts)

## Manual Database Setup

If you prefer to set up the database manually:

### Using Docker Compose (Recommended)
```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Create database and tables
npm run db:create
```

### Using Local PostgreSQL
1. Make sure PostgreSQL is running locally
2. Update your `.env` file with database credentials:
   ```
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=your_password
   DATABASE_NAME=leave_management
   ```
3. Run the database creation script:
   ```bash
   npm run db:create
   ```

## Initial Data

The database setup includes:

### Default Admin User
- **Email:** `admin@company.com`
- **Password:** `Admin@123`
- **Role:** Admin

### Sample Departments
- Information Technology
- Human Resources  
- Finance
- Marketing

## Database Schema

The system includes the following main entities:

### Users Table
- Authentication and authorization
- Role management (employee, manager, admin)
- Password management and invites

### Employees Table
- Employee profiles and information
- Manager-employee relationships
- Leave entitlements

### Departments Table
- Organizational structure
- Department management

### Leave Requests Table
- Leave applications and approvals
- Leave history tracking

### Leave Balances Table
- Annual leave allocations
- Leave usage tracking

### Password Reset Tokens Table
- Secure password reset functionality

### Holidays Table
- Company-wide holidays
- Holiday calendar management

## Environment Variables

Required environment variables for database connection:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres  
DATABASE_PASSWORD=postgres
DATABASE_NAME=leave_management
```

## Troubleshooting

### Database Connection Issues
1. Ensure PostgreSQL is running
2. Verify environment variables in `.env`
3. Check network connectivity
4. Confirm database credentials

### Permission Issues
1. Ensure the database user has creation privileges
2. For Docker setups, ensure containers can communicate

### Script Failures
1. Check the console output for detailed error messages
2. Verify TypeORM entity definitions
3. Ensure all dependencies are installed (`npm install`)

## Development vs Production

### Development
- Uses `synchronize: true` for automatic schema updates
- Detailed query logging enabled
- Automatic database creation

### Production  
- Uses migrations for schema management
- Minimal logging for performance
- Manual database setup recommended

## Migration Management

For production environments, use TypeORM migrations:

```bash
# Generate migration (development)
npm run migration:generate -- CreateInitialSchema

# Run migrations (development)
npm run migration:run

# Revert migration (development)
npm run migration:revert
```

### Running Migrations in Docker Container

When running in a Docker container, use the production migration commands:

```bash
# Access the container
docker exec -it leave_management_app bash

# Run migrations in production
npm run migration:run:prod

# Revert migrations in production
npm run migration:revert:prod

# Generate new migration in production (after adding entities)
npm run migration:generate:prod -- MigrationName
```

### Adding New Tables

To add new tables to the system:

1. **Create Entity File**: Add your new entity in the appropriate module (e.g., `src/entities/new-entity.entity.ts`)

2. **Generate Migration**: 
   - Development: `npm run migration:generate -- AddNewEntity`
   - Production/Container: `npm run migration:generate:prod -- AddNewEntity`

3. **Run Migration**:
   - Development: `npm run migration:run`
   - Production/Container: `npm run migration:run:prod`

### Container Migration Example

```bash
# Connect to container
docker exec -it leave_management_app bash

# Check if there are pending migrations
npm run migration:run:prod

# If you need to create a new entity, first create it in your code
# Then generate and run the migration
npm run migration:generate:prod -- AddYourNewTable
npm run migration:run:prod
```

### Migration Helper Script

For easier container migrations, use the provided helper script:

```bash
# Make the script executable (first time only)
chmod +x migrate.sh

# Run migrations in container
./migrate.sh run

# Generate new migration
./migrate.sh generate AddNewTable

# Revert last migration
./migrate.sh revert

# Check database status
./migrate.sh status

# Open shell in container
./migrate.sh shell

# Show help
./migrate.sh help

# Use with custom container name
CONTAINER_NAME=my_custom_container ./migrate.sh run
```

**Note:** The script defaults to container name `leave_management_app`. Use the `CONTAINER_NAME` environment variable if your production container has a different name.