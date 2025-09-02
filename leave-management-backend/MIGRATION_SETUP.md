# Container Migration Setup - Quick Start Guide

## Problem Solved
The original issue was that migration commands were looking for TypeScript source files (`src/database/data-source.ts`) inside the Docker container, but the container only contains compiled JavaScript files in the `dist` directory.

## Solution Implemented

### 1. Created Production Data Source
- **File**: `src/database/data-source.prod.ts`
- **Purpose**: Configured to work with compiled JavaScript files in the container
- **Paths**: Points to `dist/src/**/*.entity.js` and `dist/src/database/migrations/*.js`

### 2. Updated Package.json Scripts
Added production migration commands:
- `npm run migration:run:prod` - Run migrations in production/container
- `npm run migration:revert:prod` - Revert migrations in production/container  
- `npm run migration:generate:prod` - Generate new migrations in production/container

### 3. Updated Dockerfile
- Changed from `npm ci --only=production` to `npm ci` to include dev dependencies
- This ensures TypeORM CLI is available in the container

### 4. Created Migration Helper Script
- **File**: `migrate.sh`
- **Usage**: Simplifies running migrations in containers
- **Commands**: `run`, `revert`, `generate`, `status`, `shell`, `help`

## How to Use

### Quick Commands (using helper script)
```bash
# Run migrations in container
./migrate.sh run

# Generate new migration  
./migrate.sh generate AddNewTable

# Check status
./migrate.sh status
```

### Manual Commands (inside container)
```bash
# Access container
docker exec -it leave_management_app bash

# Run migrations
npm run migration:run:prod

# Generate migration
npm run migration:generate:prod -- MigrationName
```

## Adding New Tables

1. **Create Entity**: Add your entity file in `src/entities/`
2. **Build**: Run `npm run build` to compile TypeScript
3. **Generate Migration**: 
   - Local: `npm run migration:generate -- MigrationName`
   - Container: `./migrate.sh generate MigrationName`
4. **Run Migration**:
   - Local: `npm run migration:run`
   - Container: `./migrate.sh run`

## Files Modified
- ✅ `package.json` - Added production migration scripts
- ✅ `leave-management-backend/Dockerfile` - Updated to include dev dependencies  
- ✅ `Dockerfile` (root) - Updated production multi-stage build for migrations
- ✅ `src/database/data-source.prod.ts` - New production data source
- ✅ `migrate.sh` - New helper script
- ✅ `DATABASE.md` - Updated documentation

### Production Dockerfile Changes
The main `Dockerfile` (root) now:
- ✅ Keeps dev dependencies in production for TypeORM CLI
- ✅ Copies source TypeScript files needed for migrations
- ✅ Includes TypeScript config files (tsconfig.json, nest-cli.json)
- ✅ Copies and makes the migration helper script executable

Your migration issue should now be resolved! 🎉
