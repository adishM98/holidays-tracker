# Leave Management System - Production Deployment Guide

This guide covers deploying the Leave Management System using Docker for production environments. The system combines both frontend (React) and backend (NestJS) into a single container for simplified deployment.

## 🏗️ Architecture

The production deployment includes:

- **Single Application Container**: Frontend build served by NestJS backend
- **PostgreSQL Database**: Data persistence
- **Redis Cache**: Session management and caching (optional)
- **Nginx Reverse Proxy**: Load balancing and SSL termination (optional)

## 📋 Prerequisites

### System Requirements
- **Docker** (version 20.10+)
- **Docker Compose** (version 2.0+)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 10GB minimum for containers and data
- **CPU**: 2 cores recommended

### Network Requirements
- Port 3000: Application (required)
- Port 5432: PostgreSQL (optional, for external access)
- Port 6379: Redis (optional, for external access)
- Port 80/443: Nginx (optional, for reverse proxy)

## 🚀 Quick Deployment

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd holidays-tracker
```

### 2. Run Automated Deployment
```bash
# Basic deployment
./deploy.sh

# Production deployment with Nginx
./deploy.sh --production
```

### 3. Access Your Application
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health

### 4. Default Admin Login
- **Email**: `admin@company.com`
- **Password**: `admin123`

## 🔧 Manual Deployment

### Step 1: Environment Configuration

Create your environment file:
```bash
cp .env.production .env
```

Edit `.env` with your configuration:
```bash
# Critical settings to change
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
```

### Step 2: Build and Deploy

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Check service status
docker-compose ps
```

### Step 3: Verify Deployment

```bash
# Check application health
curl http://localhost:3000/api/health

# Check database connection
docker-compose exec postgres pg_isready -U postgres
```

### Understanding the Startup Sequence

The application uses a three-step sequential startup process to ensure database integrity:

```
🚀 Leave Management System - Starting...
⏳ Waiting for database...
✅ Database ready!
📋 Step 1: Initializing database schema...
📊 Step 2: Running database migrations...
✅ Migrations completed successfully!
🎯 Step 3: Starting application...
🚀 Application is running on: http://localhost:80
```

**What happens in each step:**

1. **Step 1: Schema Initialization**
   - TypeORM creates base tables (users, employees, departments, etc.)
   - Runs briefly (10 seconds) then automatically stops
   - Application is NOT accessible during this phase

2. **Step 2: Database Migrations**
   - Executes all pending migrations
   - Adds additional tables (leave_balances_history, system_settings, google_calendar_tokens, etc.)
   - Creates indexes and constraints
   - Application is NOT accessible during this phase

3. **Step 3: Application Startup**
   - Starts the full application
   - Creates initial data (admin user, departments)
   - Application becomes accessible on port 80

This sequential approach ensures users never access an incomplete database during deployment.

## 🌐 Production Configuration

### Environment Variables

#### Required Settings
```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_HOST=postgres
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=leave_management

# JWT (MUST change these!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
```

#### Email Configuration
```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@yourcompany.com
```

#### Optional Settings
```env
# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DEST=./uploads

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### SSL/HTTPS Setup

1. **Obtain SSL Certificates**:
   ```bash
   # Using Let's Encrypt (recommended)
   certbot certonly --standalone -d yourdomain.com
   
   # Or use your existing certificates
   cp your-cert.pem ssl/cert.pem
   cp your-key.pem ssl/key.pem
   ```

2. **Update Nginx Configuration**:
   - Uncomment HTTPS server block in `nginx.conf`
   - Update server name with your domain

3. **Deploy with SSL**:
   ```bash
   ./deploy.sh --production
   ```

## 📊 Monitoring and Maintenance

### Health Checks

The application includes built-in health checks:

```bash
# Application health
curl http://localhost:3000/api/health

# Database health
docker-compose exec postgres pg_isready -U postgres

# Redis health  
docker-compose exec redis redis-cli ping
```

### Log Management

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f postgres

# View all service logs
docker-compose logs -f

# Follow logs with timestamps
docker-compose logs -f -t
```

### Database Management

```bash
# Access database shell
docker-compose exec postgres psql -U postgres -d leave_management

# Backup database
docker-compose exec postgres pg_dump -U postgres leave_management > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres leave_management < backup.sql
```

### Container Management

```bash
# Restart application
docker-compose restart app

# Update application (after code changes)
docker-compose build app
docker-compose up -d app

# Scale application (if needed)
docker-compose up -d --scale app=2
```

## 🔒 Security Considerations

### Essential Security Steps

1. **Change Default Secrets**:
   ```bash
   # Generate secure secrets
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For JWT_REFRESH_SECRET
   ```

2. **Update Default Admin Password**:
   - Login with default credentials
   - Change password immediately
   - Consider creating additional admin users

3. **Database Security**:
   ```env
   DATABASE_PASSWORD=very-secure-password-here
   ```

4. **Network Security**:
   - Use firewall to restrict port access
   - Only expose necessary ports (80, 443)
   - Consider VPN for admin access

5. **File Permissions**:
   ```bash
   chmod 600 .env
   chmod 600 ssl/*
   ```

### Nginx Security Headers

The provided `nginx.conf` includes:
- XSS Protection
- Content Type Options
- Frame Options
- Referrer Policy
- Rate Limiting

## 🔄 Backup and Recovery

### Automated Backup Script

Create `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres leave_management > "backup_${DATE}.sql"
tar czf "uploads_backup_${DATE}.tar.gz" uploads/
```

### Recovery Process

1. **Database Recovery**:
   ```bash
   docker-compose exec -T postgres psql -U postgres leave_management < backup.sql
   ```

2. **File Recovery**:
   ```bash
   tar xzf uploads_backup.tar.gz
   ```

## 🐛 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs app

# Common causes:
# - Database not ready
# - Environment variables missing
# - Port conflicts
```

#### Database Connection Issues
```bash
# Check database status
docker-compose ps postgres

# Test connection
docker-compose exec app npm run db:status

# Reset database
docker-compose exec app npm run db:reset
```

#### Frontend Not Loading
```bash
# Check if static files exist
docker-compose exec app ls -la public/

# Rebuild application
docker-compose build --no-cache app
docker-compose up -d app
```

### Performance Tuning

#### Database Optimization
```sql
-- Increase shared_buffers for better performance
-- Add to custom PostgreSQL config
shared_buffers = 256MB
effective_cache_size = 1GB
```

#### Application Scaling
```bash
# Scale application containers
docker-compose up -d --scale app=3

# Use load balancer (requires nginx)
./deploy.sh --production
```

## 📚 Additional Resources

### Docker Commands Reference
```bash
# View resource usage
docker stats

# Clean unused resources
docker system prune -a

# View container details
docker inspect <container-name>

# Execute commands in container
docker-compose exec app bash
```

### Environment Management
```bash
# Different environments
cp .env.production .env.prod
cp .env.development .env.dev

# Use specific env file
docker-compose --env-file .env.prod up -d
```

## 🆘 Support

For deployment issues:

1. Check logs: `docker-compose logs -f`
2. Verify environment: `docker-compose config`
3. Test connectivity: Health check endpoints
4. Review this documentation
5. Check application documentation

---

**⚠️ Important Notes:**

- Always backup before updates
- Test deployments in staging first  
- Monitor resource usage
- Keep secrets secure and rotated
- Update dependencies regularly