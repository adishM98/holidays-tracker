# Leave Management System - Comprehensive Codebase Documentation

## Project Overview

The Leave Management System is a comprehensive full-stack application built for managing employee leave requests, approvals, and organizational workflows. It features role-based access control with distinct interfaces for employees, managers, and administrators.

## 🏗️ Architecture Overview

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for development and building
- shadcn/ui components (built on Radix UI)
- Tailwind CSS for styling
- React Router for navigation
- TanStack Query for data fetching and caching
- React Hook Form with Zod validation

**Backend:**
- NestJS 10 with TypeScript
- PostgreSQL database with TypeORM
- JWT Authentication with refresh tokens
- Role-based access control (RBAC)
- Swagger/OpenAPI documentation
- Email notifications with Nodemailer
- Docker support for deployment

## 📁 Project Structure

```
holidays-tracker/
├── src/                          # React frontend
│   ├── components/              # Reusable UI components
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── Layout/             # Layout components
│   │   └── admin/              # Admin-specific components
│   ├── pages/                  # Route pages
│   │   ├── admin/              # Admin pages
│   │   └── *.tsx               # Main application pages
│   ├── contexts/               # React contexts
│   │   ├── AuthContext.tsx     # Authentication context
│   │   └── ThemeContext.tsx    # Theme management
│   ├── services/               # API service layer
│   │   └── api.ts              # API client and methods
│   └── types/                  # TypeScript definitions
│       └── index.ts            # Main type definitions
├── leave-management-backend/    # NestJS backend
│   ├── src/
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User management
│   │   ├── employees/         # Employee management
│   │   ├── leaves/            # Leave management core
│   │   ├── departments/       # Department management
│   │   ├── holidays/          # Holiday management
│   │   ├── admin/             # Admin-specific controllers
│   │   ├── manager/           # Manager-specific controllers
│   │   ├── employee/          # Employee-specific controllers
│   │   ├── mail/              # Email service
│   │   ├── database/          # Database configuration
│   │   └── common/            # Shared utilities and enums
│   └── docker-compose.yml     # Database setup
└── Configuration files
    ├── package.json           # Frontend dependencies
    ├── docker-compose.yml     # Full stack deployment
    └── various config files
```

## 🗄️ Database Schema

### Core Entities

#### Users Table (`users`)
- Primary authentication entity
- Fields: `id`, `email`, `password_hash`, `role`, `is_active`, `must_change_password`
- Invitation system: `invite_status`, `invited_at`, `invite_expires_at`
- OneToOne relationship with Employee

#### Employees Table (`employees`)
- Extended profile information
- Fields: `id`, `employee_id`, `first_name`, `last_name`, `email`, `position`
- Relationships: Department (ManyToOne), Manager (self-referencing ManyToOne)
- Leave configuration: `annual_leave_days`, `sick_leave_days`, `casual_leave_days`
- Leave balance management: `use_manual_balances`

#### Leave Requests Table (`leave_requests`)
- Core leave management entity
- Fields: `id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `days_count`
- Status tracking: `status`, `applied_at`, `approved_by`, `approved_at`, `rejection_reason`
- Relationships: Employee (ManyToOne), Approver (ManyToOne to Employee)

#### Leave Balances Table (`leave_balances`)
- Annual leave balance tracking per employee per year
- Fields: `id`, `employee_id`, `year`, `leave_type`
- Balance tracking: `total_allocated`, `used_days`, `available_days`, `carry_forward`
- Unique constraint on `[employee_id, year, leave_type]`

#### Departments Table (`departments`)
- Organizational structure
- Fields: `id`, `name`, `description`, `head_id`
- Relationships: OneToMany with Employees

#### Holidays Table (`holidays`)
- Company-wide holiday management
- Fields: `id`, `name`, `date`, `description`, `is_active`

### Enums

```typescript
// User roles with hierarchical permissions
enum UserRole {
  EMPLOYEE = "employee",
  MANAGER = "manager", 
  ADMIN = "admin"
}

// Leave types supported by the system
enum LeaveType {
  SICK = "sick",
  CASUAL = "casual", 
  EARNED = "earned",
  COMPENSATION = "compensation"
}

// Leave request status workflow
enum LeaveStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected", 
  CANCELLED = "cancelled"
}
```

## 🔐 Authentication & Authorization

### JWT-Based Authentication
- Access tokens with 1-hour expiration
- Refresh tokens for session management
- Automatic token refresh in frontend
- Secure password policies with bcrypt hashing

### Role-Based Access Control (RBAC)

**Admin (`UserRole.ADMIN`)**
- Full system access
- Employee management (CRUD operations)
- Bulk import via CSV
- Department management
- Holiday management
- All leave request operations
- System reporting and analytics
- Password reset capabilities

**Manager (`UserRole.MANAGER`)**  
- Team member leave approval/rejection
- Team leave calendar access
- Team reporting (subordinates only)
- Own leave request management
- Limited employee data access

**Employee (`UserRole.EMPLOYEE`)**
- Own leave request management
- Leave balance viewing
- Leave history access
- Profile management
- Password change capabilities

### Guards and Decorators
- `JwtAuthGuard`: Validates JWT tokens
- `RolesGuard`: Enforces role-based access
- `@Roles()`: Decorator for endpoint authorization
- `@CurrentUser()`: Injects authenticated user context

## 🌐 API Architecture

### Backend Structure (NestJS)

#### Main Modules
1. **AuthModule** (`/auth/auth.controller.ts:1`)
   - Login/logout endpoints
   - Password management (change, forgot, reset)
   - User invitation system
   - Token refresh mechanism

2. **AdminModule** (`/admin/admin.controller.ts:1`)
   - Complete system administration
   - Employee lifecycle management
   - Bulk operations and reporting
   - Department and holiday management

3. **ManagerModule** 
   - Team-specific operations
   - Approval workflows
   - Team reporting

4. **EmployeeModule**
   - Self-service leave operations  
   - Personal profile management

5. **LeavesModule**
   - Core leave request processing
   - Balance calculations
   - Leave calendar generation
   - Automated cleanup services

### API Endpoints Overview

**Authentication (`/auth`)**
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Token refresh
- `PUT /auth/change-password` - Password change
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Password reset completion
- `POST /auth/complete-invite` - New user activation

**Admin Operations (`/admin`)**
- `GET /admin/dashboard-stats` - System analytics
- `GET|POST|PUT|DELETE /admin/employees` - Employee management
- `POST /admin/employees/bulk-import` - CSV bulk import
- `GET|POST|PUT|DELETE /admin/departments` - Department management
- `GET|POST|PUT|DELETE /admin/holidays` - Holiday management
- `GET|POST|PUT|DELETE /admin/leave-requests` - Leave management
- `GET /admin/leave-calendar` - Organization-wide leave calendar
- `GET /admin/reports/*` - Various reporting endpoints

## 🎨 Frontend Architecture

### Component Organization

#### Core Components
- **Layout** (`/src/components/Layout/Layout.tsx`): Main application shell
- **ProtectedRoute** (`/src/components/ProtectedRoute.tsx:1`): Route authorization
- **UI Components** (`/src/components/ui/`): shadcn/ui component library

#### Pages Structure
- **Dashboard** (`/src/pages/Dashboard.tsx:1`): Role-based home page
- **ApplyLeave** (`/src/pages/ApplyLeave.tsx:1`): Leave request form
- **LeaveHistory** (`/src/pages/LeaveHistory.tsx:1`): Leave request history
- **PendingApprovals** (`/src/pages/PendingApprovals.tsx:1`): Manager approval interface
- **Profile** (`/src/pages/Profile.tsx:1`): User profile management
- **Admin Pages** (`/src/pages/admin/`): Administrative interfaces

### State Management

#### Authentication Context (`/src/contexts/AuthContext.tsx:1`)
- Centralized authentication state
- Automatic role synchronization
- Token management and refresh
- User data persistence
- Real-time role change detection

```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  checkRoleChange: () => Promise<void>;
}
```

#### API Integration (`/src/services/api.ts:1`)
- Centralized API client with automatic authentication
- Request/response interceptors
- Error handling and retry logic
- Type-safe API methods

## 🔄 Key Business Logic

### Leave Request Workflow

1. **Application Process**
   - Employee submits leave request with dates and reason
   - System calculates working days (excluding weekends/holidays)
   - Balance validation against available leave days
   - Automatic status set to 'PENDING'

2. **Approval Process**
   - Manager receives notification for team member requests
   - Admin can approve any request
   - Approval updates leave balances automatically
   - Email notifications sent to employee

3. **Balance Management**
   - Annual allocation based on employee configuration
   - Real-time balance updates on request approval
   - Carry-forward support for unused days
   - Manual balance adjustment for admin

### Role-Based Dashboard Logic

The system provides distinct dashboard experiences:

**Employee Dashboard:**
- Personal leave balance overview
- Recent request status
- Quick apply leave access
- Upcoming holidays

**Manager Dashboard:**
- Team leave requests requiring approval
- Team calendar view
- Team member balance overview
- Quick approval actions

**Admin Dashboard:**
- System-wide statistics
- Employee management overview
- Recent activities across organization
- System health indicators

### Invitation System

New employee onboarding workflow:
1. Admin creates employee record with email
2. System generates secure invitation token
3. Email sent with activation link
4. Employee clicks link to set initial password
5. Account activated and ready for use

### Year-End Balance Reset

Automated year-end processing:
- Calculates carry-forward days per policy
- Resets annual allocations
- Maintains historical balance records
- Notification system for employees
- Manual trigger available for admin

## 🎯 Key Features

### Employee Self-Service
- **Leave Application**: Multi-step form with date validation
- **Balance Tracking**: Real-time leave balance display
- **History Management**: Complete leave request history
- **Profile Management**: Personal information updates

### Manager Capabilities  
- **Team Oversight**: Subordinate leave request management
- **Quick Approvals**: Streamlined approval interface
- **Team Calendar**: Visual team leave schedule
- **Reporting**: Team-specific leave analytics

### Admin Features
- **Employee Lifecycle**: Complete employee management (CRUD)
- **Bulk Operations**: CSV-based bulk import with validation
- **System Configuration**: Department, holiday, and policy management
- **Advanced Reporting**: Comprehensive system analytics
- **Data Management**: Leave balance adjustments and corrections

### Email Notifications
- Welcome emails for new employees
- Leave request notifications for managers  
- Status updates for employees
- Password reset functionality
- System alerts and reminders

## 🔧 Development Workflow

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
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

# Start development server (http://localhost:3000)
npm run start:dev

# Build for production
npm run build

# Run tests
npm run test
```

### Database Management
```bash
# Start PostgreSQL with Docker
cd leave-management-backend
docker-compose up -d

# Access API documentation
# http://localhost:3000/api/docs
```

## 🚀 Deployment

### Docker Deployment
The project includes comprehensive Docker support:

```bash
# Start all services
./start-all.sh

# Or manually:
cd leave-management-backend
docker-compose up -d
```

### Environment Configuration
Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing key
- `SMTP_*`: Email service configuration
- `VITE_API_BASE_URL`: Frontend API endpoint

## 📊 Performance Considerations

### Frontend Optimizations
- React Query for efficient data fetching and caching
- Lazy loading for route-based code splitting
- Optimized re-renders through proper React patterns
- Local storage for authentication state persistence

### Backend Optimizations
- Database indexing on frequently queried fields
- Eager/lazy loading strategies for relationships
- Connection pooling for database efficiency
- Rate limiting and request throttling
- Pagination for large dataset endpoints

## 🛡️ Security Measures

- JWT tokens with secure expiration policies
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention through TypeORM
- Rate limiting on authentication endpoints
- Role-based access control at API level
- Secure cookie handling for refresh tokens

## 📝 Testing Strategy

The codebase supports comprehensive testing:
- Unit tests for business logic
- Integration tests for API endpoints  
- E2E tests for critical user workflows
- Database transaction testing
- Authentication flow testing

## 🔍 Monitoring & Logging

- Structured logging throughout the application
- Error tracking and reporting
- Performance monitoring capabilities
- Database query optimization tracking
- User activity audit trails

## 📚 Key Files Reference

### Backend Core Files
- `/leave-management-backend/src/app.module.ts:1` - Main application module
- `/leave-management-backend/src/users/entities/user.entity.ts:1` - User entity
- `/leave-management-backend/src/employees/entities/employee.entity.ts:1` - Employee entity  
- `/leave-management-backend/src/leaves/entities/leave-request.entity.ts:1` - Leave request entity
- `/leave-management-backend/src/leaves/entities/leave-balance.entity.ts:1` - Leave balance entity

### Frontend Core Files
- `/src/App.tsx:1` - Main application component and routing
- `/src/contexts/AuthContext.tsx:1` - Authentication management
- `/src/services/api.ts:1` - API client and methods
- `/src/types/index.ts:1` - TypeScript type definitions

### Configuration Files
- `/package.json:1` - Frontend dependencies and scripts
- `/leave-management-backend/package.json` - Backend dependencies
- `/docker-compose.yml` - Container orchestration
- `/README.md:1` - Project setup and usage instructions

This documentation provides a comprehensive overview of the Leave Management System codebase, covering architecture, functionality, and development workflows. It serves as a reference for future development, maintenance, and onboarding of new team members.