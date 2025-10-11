# Production Deployment Guide

This folder contains everything needed for production deployment of the Leave Management System.

## 📁 Structure

```
deploy/
├── docker-compose.yml       # Production Docker Compose configuration
├── .env.example             # Environment variables template
├── .env                     # Your actual config (create from .env.example)
└── README.md               # This file
```

## 🚀 Quick Start (Docker Deployment)

### 1. Prerequisites
- Docker & Docker Compose installed
- Ports 80, 5432, 6379 available (or customize in docker-compose.yml)

### 2. Setup Environment

```bash
# Navigate to deploy directory
cd deploy

# Copy environment template
cp .env.example .env

# Edit with your production values
nano .env
```

**Critical values to change:**
- `DATABASE_PASSWORD` - Strong password for database
- `JWT_SECRET` - Random secret (at least 64 characters)
- `REFRESH_TOKEN_SECRET` - Different random secret
- `SMTP_*` - Your email service credentials
- `FRONTEND_URL` - Your production domain
- `GOOGLE_*` - Google Calendar credentials (if using)

### 3. Generate Strong Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64

# Generate another one for refresh token
openssl rand -base64 64
```

### 4. Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 5. Monitor Startup Sequence

The application automatically handles database setup during startup:

```bash
# Follow startup logs
docker-compose logs -f app

# You'll see a three-step sequential process:
# 📋 Step 1: Initializing database schema...
# 📊 Step 2: Running database migrations...
# 🎯 Step 3: Starting application...
```

**What happens automatically:**
- Base database tables are created (TypeORM sync)
- All migrations are executed sequentially
- Initial data is created (admin user, departments)
- Application becomes available only after all setup completes

**No manual migration commands are needed!** The entrypoint script handles everything sequentially to ensure database integrity.

### 6. Access the Application

The application will be available at:
- http://localhost:80 (or your server IP)

Default admin credentials (set during migration):
- Email: `admin@company.com`
- Password: `admin123`

**⚠️ Important:** Change the admin password immediately after first login!

## 🔒 SSL/Reverse Proxy Setup (Optional)

For production, you should set up a reverse proxy (Nginx, Caddy, Traefik) with SSL. The docker-compose setup exposes port 80, which you can proxy through your chosen solution.

### Example: Nginx with Let's Encrypt

1. Install Nginx and Certbot on your host machine
2. Configure Nginx to proxy to `http://localhost:80`
3. Use Certbot to obtain SSL certificates
4. Update `FRONTEND_URL` in environment variables to your https domain

### Example: Cloudflare Proxy

If using Cloudflare:
1. Point your domain to your server IP
2. Enable Cloudflare proxy (orange cloud)
3. SSL/TLS mode: "Full" or "Full (strict)"
4. Cloudflare handles SSL automatically

## 📊 Monitoring & Maintenance

### Check Service Health

```bash
# Check all services
docker-compose ps

# View specific service logs
docker-compose logs app
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f
```

### Database Backup

```bash
# Backup database
docker exec postgres_db pg_dump -U postgres leave_management > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20250101.sql | docker exec -i postgres_db psql -U postgres leave_management
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
cd deploy
docker-compose build --no-cache
docker-compose up -d

# Migrations run automatically on startup!
# Monitor logs to verify successful deployment
docker-compose logs -f app
```

## 🔧 Environment Variables Reference

See `deploy/docker/.env.example` for complete list of environment variables with descriptions.

### Critical Production Settings

See `deploy/.env.example` for complete configuration guide.

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_PASSWORD` | Strong DB password | Generated |
| `JWT_SECRET` | JWT signing secret | 64+ char random |
| `SMTP_HOST` | Email provider | `smtp.sendgrid.net` |
| `FRONTEND_URL` | Production URL | `https://yourdomain.com` |
| `DATABASE_SSL` | Enable DB SSL | `true` (for cloud DBs) |

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs app

# Common issues:
# - Database not ready: Wait for postgres healthcheck
# - Wrong credentials: Check docker-compose.yml
# - Port conflict: Check if port 80 is available
```

### Database connection failed
```bash
# Check postgres is running
docker-compose ps postgres

# Test connection
docker exec -it postgres_db psql -U postgres -d leave_management

# Check credentials in docker-compose.yml environment section
```

### Email not sending
```bash
# Verify SMTP settings in .env
# Test with: SendGrid, Mailgun, or AWS SES
# Check SMTP provider logs/dashboard
```

### SSL certificate issues
```bash
# Renew Let's Encrypt cert
sudo certbot renew

# Check certificate expiry
openssl x509 -in /path/to/cert.pem -noout -enddate
```

## 📈 Performance Optimization

### Resource Limits
The docker-compose.yml includes resource limits:
- PostgreSQL: 2GB RAM, 2 CPUs
- Backend: 2GB RAM, 2 CPUs

Adjust based on your server capacity.

### Database Tuning
```bash
# Enter postgres container
docker exec -it postgres_db psql -U postgres -d leave_management

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Analyze table statistics
ANALYZE;
```

## 🔐 Security Checklist

- [ ] Changed all default passwords
- [ ] Generated strong JWT secrets
- [ ] Enabled DATABASE_SSL for remote databases
- [ ] Using production SMTP service
- [ ] SSL/TLS certificate installed
- [ ] Firewall configured (only 80, 443 open)
- [ ] Database backups automated
- [ ] Monitoring/alerting set up
- [ ] Rate limiting enabled
- [ ] Regular security updates applied

## 📞 Support

For issues:
1. Check application logs: `docker-compose logs -f`
2. Review this deployment guide
3. Check main project README
4. Open an issue on GitHub

## 📄 License

This project is licensed under the MIT License.
