# Leave Management System

A comprehensive leave management application with role-based access control, featuring a modern React frontend and a robust NestJS backend API.

## 🌟 Features

### For Employees
- **Self-Service Portal**: Apply for leaves, view balance, and track request status
- **Leave Calendar**: Visual representation of approved leaves
- **Dashboard**: Overview of leave balances and recent activities

### For Managers
- **Team Management**: Approve/reject team member leave requests
- **Team Calendar**: View team's leave schedule
- **Reporting**: Access to team leave statistics

### For Administrators
- **Employee Management**: Full CRUD operations for employees
- **Bulk Import**: CSV-based employee data import
- **System Analytics**: Comprehensive dashboard with system statistics
- **Department Management**: Organize employees by departments

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data fetching
- **React Hook Form** with Zod validation

### Backend
- **NestJS 10** with TypeScript
- **PostgreSQL** database with TypeORM
- **JWT Authentication** with role-based access control
- **Swagger/OpenAPI** documentation
- **Email notifications** with Nodemailer
- **Docker** support for easy deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd holidays-tracker
   ```

2. **Start the backend services**
   ```bash
   # Start all services (backend + database)
   ./start-all.sh
   ```

3. **Install frontend dependencies and start development server**
   ```bash
   npm install
   npm run dev
   ```

4. **Access the applications**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/api
   - API Documentation: http://localhost:3000/api/docs

### 🔑 Default Login Credentials

Use these credentials to log into the system for the first time:

**Admin Account**
- **Email**: admin@company.com
- **Password**: Admin@123

```
  UPDATE users
  SET
    password_hash = '$2b$10$8K6I9JtNVJGF4w8j5fmUbuS5wn7c3E9ZV7a4a1qUaP9F2g6hNw8jK',
    must_change_password = false,
    is_active = true
  WHERE email = 'admin@company.com' AND role = 'admin';
```

**Note**: After first login, you can create additional employees through the admin panel or use the bulk CSV import feature. It's recommended to change the default admin password after initial setup.

## 📁 Project Structure

```
holidays-tracker/
├── src/                          # React frontend application
│   ├── components/              # Reusable UI components
│   ├── pages/                   # Application pages/routes
│   ├── contexts/                # React contexts (Auth, etc.)
│   ├── services/                # API service layer
│   └── types/                   # TypeScript type definitions
├── leave-management-backend/     # NestJS backend API
│   ├── src/                     # Backend source code
│   │   ├── auth/               # Authentication module
│   │   ├── employees/          # Employee management
│   │   ├── leaves/             # Leave management
│   │   ├── departments/        # Department management
│   │   └── users/              # User management
│   ├── docker-compose.yml      # Database setup
│   └── README.md               # Backend-specific documentation
└── start-all.sh                # Startup script
```

## 🔧 Development

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

### Backend Development
```bash
cd leave-management-backend

# Install dependencies
npm install

# Start in development mode
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
```

## 🐳 Docker Deployment

The project includes Docker support for easy deployment:

```bash
# Start all services with Docker
cd leave-management-backend
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📖 API Documentation

When the backend is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000/api

## 🔐 Authentication & Security

- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Manager, Employee)
- Secure password policies and reset functionality
- Input validation and sanitization
- Rate limiting to prevent abuse

## 📧 Email Notifications

The system sends automated emails for:
- Welcome messages for new employees
- Leave request notifications to managers
- Status updates when requests are approved/rejected
- Password reset tokens

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

