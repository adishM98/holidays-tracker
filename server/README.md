# Leave Management System - Backend API

A comprehensive leave management system backend built with NestJS, TypeScript, and PostgreSQL.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Manager, Employee)
- Password reset functionality
- Secure password policies

### 👥 Employee Management
- CRUD operations for employee profiles
- Bulk CSV import with validation
- Department and manager assignments
- Pro-rata leave calculations for new joiners

### 🏖️ Leave Management
- Leave request creation and approval workflow
- Multiple leave types (Annual, Sick, Casual)
- Real-time leave balance calculations
- Leave calendar and reporting
- Year-end leave balance reset and archiving
- Historical leave balance records for auditing

### 📧 Email Notifications
- Welcome emails for new employees
- Leave request notifications to managers
- Status update notifications to employees
- Password reset emails

### 📊 Reporting & Analytics
- Admin dashboard with system statistics
- Manager dashboard for team oversight
- Employee self-service portal
- Leave summary and balance reports

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: TypeORM
- **Authentication**: JWT + Passport
- **Email**: Nodemailer
- **File Upload**: Multer
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Installation

1. **Clone and setup**
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```

2. **Configure environment**
   ```bash
   # Edit .env with your database and email settings
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=password
   DATABASE_NAME=leave_management
   
   SMTP_HOST=smtp.gmail.com
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```

3. **Database setup**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d postgres
   
   # Or setup PostgreSQL manually and create database
   createdb leave_management
   ```

4. **Run the application**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build && npm run start:prod
   ```

### Using Docker

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000/api

### Default Admin Credentials
- **Email**: admin@company.com
- **Password**: Admin@123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `PUT /api/auth/change-password` - Change password (authenticated)

### Admin Routes
- `GET /api/admin/dashboard-stats` - Dashboard statistics
- `GET /api/admin/employees` - List employees with pagination/filtering
- `POST /api/admin/employees` - Create employee
- `POST /api/admin/employees/bulk-import` - Bulk import from CSV
- `GET /api/admin/employees/import-template` - Download CSV template
- `GET /api/admin/reports/leave-summary` - Leave summary report

### Manager Routes
- `GET /api/manager/dashboard-stats` - Manager dashboard
- `GET /api/manager/team-requests` - Team leave requests
- `PUT /api/manager/leave-requests/:id/approve` - Approve leave request
- `PUT /api/manager/leave-requests/:id/reject` - Reject leave request
- `GET /api/manager/team-calendar` - Team leave calendar

### Employee Routes
- `GET /api/employee/dashboard` - Employee dashboard
- `GET /api/employee/leave-balance` - Leave balances
- `POST /api/employee/leave-requests` - Create leave request
- `GET /api/employee/leave-requests` - My leave requests
- `PUT /api/employee/leave-requests/:id/cancel` - Cancel leave request

## CSV Import Template

Download template: `GET /api/admin/employees/import-template`

```csv
employee_id,first_name,last_name,email,phone,department,position,manager_email,joining_date,annual_leave_days,sick_leave_days,casual_leave_days,probation_months
EMP001,John,Doe,john.doe@company.com,+1234567890,IT,Software Engineer,jane.smith@company.com,2023-01-15,21,10,6,3
```

## Key Features Explained

### Leave Calculation Engine
- **Pro-rata calculations** for new joiners based on joining date
- **Working days calculation** excluding weekends
- **Leave balance tracking** with carry-forward rules
- **Year-end processing** for balance rollovers

### Security Features
- **JWT tokens** with configurable expiration
- **Password hashing** with bcrypt
- **Role-based guards** for API protection
- **Input validation** on all endpoints
- **Rate limiting** to prevent abuse

### Email System
- **Welcome emails** with temporary passwords for new employees
- **Leave request notifications** sent to managers automatically
- **Status update emails** when requests are approved/rejected
- **Password reset** with secure tokens

## Development

### Database Migrations
```bash
# Generate migration
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Production Deployment

### Environment Variables
Set these environment variables in production:

```bash
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key
REFRESH_TOKEN_SECRET=your-refresh-token-secret
DATABASE_URL=postgresql://user:password@host:port/database
```

### Health Checks
- Application health: `GET /health`
- Database connectivity automatically checked

### Performance Considerations
- Database indexing on frequently queried fields
- Pagination on all list endpoints
- Connection pooling configured
- Rate limiting enabled

## Support

For issues and questions:
1. Check the API documentation at `/api/docs`
2. Review the error messages in the response
3. Check application logs for detailed error information

## License

This project is licensed under the MIT License.