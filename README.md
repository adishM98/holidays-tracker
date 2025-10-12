# Leave Management System

A comprehensive leave management application with role-based access control, featuring a modern React frontend and a robust NestJS backend API.

## 🌟 Features

### For Employees
- **Self-Service Portal**: Apply for leaves, view balance, and track request status
- **Leave Calendar**: Visual representation of approved leaves and holidays
- **Dashboard**: Overview of leave balances and recent activities
- **Profile Management**: Update personal information and view employment details
- **Google Calendar Integration**: Sync approved leaves to personal Google Calendar (optional)

### For Managers
- **Team Management**: Approve/reject team member leave requests
- **Team Calendar**: View team's leave schedule
- **Reporting**: Access to team leave statistics
- **Pending Approvals**: Quick view of requests awaiting approval

### For Administrators
- **Modern Admin Dashboard**: Data-rich overview with real-time metrics and insights
  - Pending approvals with quick approve/reject actions
  - System-wide statistics (employees, leaves, departments)
  - Leave trends visualization with interactive charts
  - Upcoming holidays calendar
  - Quick action shortcuts for common tasks
- **Employee Management**: Full CRUD operations for employees with invite system
- **Bulk Import**: CSV-based employee data import with validation
- **Department Management**: Organize employees by departments with manager assignments
- **Holiday Management**: Create, update, and manage company-wide holidays
- **Settings & Customization**:
  - Auto-approve leave requests toggle
  - White-labeling (custom logo and favicon)
  - Google Calendar integration configuration
- **Advanced Reporting**: Employee leave reports, department comparisons, approval bottlenecks

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** for styling
- **React Router** for navigation
- **TanStack Query** for data fetching
- **React Hook Form** with Zod validation
- **Recharts** for data visualization

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

2. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your settings (database, email, etc.)
   # The single .env file in the root configures both frontend and backend
   nano .env  # or use your preferred editor
   ```

   **Important**: Update at minimum:
   - Database credentials (if not using defaults)
   - SMTP settings for email notifications
   - JWT secrets (change from defaults for security)

3. **Start the backend server**
   ```bash
   cd server

   # Install dependencies
   npm install

   # Start database and backend
   docker-compose up -d  # Start PostgreSQL database
   npm run start:dev     # Start backend server
   ```

4. **Start the frontend development server** (in a new terminal)
   ```bash
   cd frontend

   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

5. **Access the applications**
   - Frontend: http://localhost:8081
   - Backend API: http://localhost:3000/api
   - API Documentation: http://localhost:3000/api/docs

   **Note**: The frontend dev server automatically proxies `/api` requests to the backend server.

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
├── frontend/                     # React frontend application
│   ├── src/                     # Frontend source code
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Application pages/routes
│   │   ├── contexts/            # React contexts (Auth, Theme, etc.)
│   │   ├── services/            # API service layer
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # TypeScript type definitions
│   ├── public/                  # Static assets
│   └── package.json             # Frontend dependencies
├── server/                       # NestJS backend API
│   ├── src/                     # Backend source code
│   │   ├── auth/               # Authentication & JWT
│   │   ├── admin/              # Admin management module
│   │   ├── employee/           # Employee self-service module
│   │   ├── employees/          # Employee management
│   │   ├── manager/            # Manager operations module
│   │   ├── leaves/             # Leave management
│   │   ├── departments/        # Department management
│   │   ├── holidays/           # Holiday management
│   │   ├── google-calendar/    # Google Calendar integration
│   │   ├── settings/           # System settings (white-labeling, etc.)
│   │   ├── mail/               # Email service
│   │   └── users/              # User management
│   ├── docs/                   # Backend documentation
│   └── README.md               # Backend-specific documentation
├── docs/                        # Project documentation
│   ├── DEPLOYMENT.md           # Deployment guide
│   ├── GOOGLE_CALENDAR_INTEGRATION.md  # Google Calendar setup
│   ├── IMPLEMENTATION_STATUS.md        # Feature status
│   └── CODEBASE-DOCUMENTATION.md       # Technical documentation
├── deploy/                      # Production deployment files
│   ├── docker-compose.yml      # Production Docker Compose
│   ├── .env.example            # Environment template
│   └── README.md               # Deployment guide
├── .env                         # Environment configuration (root)
├── .env.example                # Environment template (root)
├── Dockerfile                  # Production Docker build
├── nginx.conf                  # Nginx configuration for production
└── sample-employees-corrected.csv  # Sample CSV for bulk import
```

## 🔧 Development

### Frontend Development
```bash
cd frontend

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
cd server

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

### Development (Local)
```bash
# Start development services (database only)
cd server
docker-compose up -d
```

### Production Deployment
For production deployment with Docker, see the comprehensive guide:
**[deploy/README.md](deploy/README.md)**

Quick start for production:
```bash
cd deploy
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

The `deploy/` folder contains:
- Production-ready `docker-compose.yml`
- Environment configuration template
- Comprehensive deployment guide

**Note:** SSL/reverse proxy setup is left to users to configure based on their infrastructure (Nginx, Caddy, Traefik, Cloudflare, etc.)

## 📖 API Documentation

When the backend is running, visit:
- **Swagger UI**: http://localhost:3000/api/docs
- **API Base URL**: http://localhost:3000/api

## ⚙️ Configuration

The project uses a **single `.env` file** in the root directory to configure both frontend and backend. This simplifies configuration management and makes it easier for developers.

### Environment Variables Structure

```bash
# Root directory
.env                    # Single configuration file for both frontend and backend
.env.example           # Template with all available options
```

The `.env` file includes:
- Application settings (ports, environment)
- Database configuration
- JWT authentication secrets
- Email/SMTP settings
- File upload configuration
- CORS and API settings
- Frontend configuration (Vite)
- Google Calendar integration (optional)

**Backend**: Loads `../.env` from the parent directory
**Frontend**: Vite automatically loads `.env` from the project root

### Development vs Production API Configuration

**Development Mode:**
- Frontend runs on `http://localhost:8081`
- Backend runs on `http://localhost:3000`
- Vite dev server proxies `/api` requests to backend automatically
- No additional configuration needed

**Production Mode:**
- Set `VITE_API_BASE_URL` in `.env` to your backend URL
- Or use relative paths (frontend and backend served from same domain)
- See `deploy/README.md` for production deployment guide

See `.env.example` for all available configuration options with detailed comments.

## 🔐 Authentication & Security

- JWT-based authentication with refresh tokens
- Role-based access control (Admin, Manager, Employee)
- Secure password policies and reset functionality
- Input validation and sanitization
- Rate limiting to prevent abuse

## 📧 Email Notifications

The system sends automated emails for:
- Employee invite links with secure tokens
- Welcome messages for new employees
- Leave request notifications to managers
- Status updates when requests are approved/rejected
- Password reset tokens

## 🎨 Customization Features

### White-Labeling
- **Custom Logo**: Upload your company logo (visible on login and invite pages)
- **Custom Favicon**: Set a custom favicon for browser tabs
- Both are stored in the system settings and served dynamically

### Theme Support
- **Light/Dark Mode**: Full theme support with user preference persistence
- Seamless theme switching across all pages

## 🔗 Integrations

### Google Calendar (Backend Complete, Frontend Pending)
- **Personal Calendar Sync**: Employees can connect their Google Calendar
- **Automatic Sync**: Approved leaves automatically create calendar events
- **OAuth2 Integration**: Secure authentication with token refresh
- **Event Management**: Updates and deletions sync automatically

See [`docs/GOOGLE_CALENDAR_INTEGRATION.md`](docs/GOOGLE_CALENDAR_INTEGRATION.md) for setup instructions.

## 📋 Additional Features

### Holiday Management
- Create company-wide holidays
- Set recurring holidays (annual events)
- Mark holidays as active/inactive
- Holidays visible on all calendars

### Employee Invite System
- Generate secure invite links for new employees
- Time-limited tokens (24-hour expiration)
- Direct dashboard access after account setup
- No manual password sharing required

### Auto-Approve Settings
- Optional automatic approval for leave requests
- Admin toggle in Settings page
- Useful for small teams or specific leave types

### Advanced Leave Management
- **Half-day leaves**: Support for half-day requests
- **Leave types**: Earned, Sick, Casual, Compensation
- **Pro-rata calculations**: Automatic calculations for mid-year joiners
- **Year-end processing**: Automatic balance reset and archiving
- **Carry forward**: Configurable leave carry-forward rules

## 📚 Documentation

Additional documentation is available in the `/docs` folder:

- **[GOOGLE_CALENDAR_INTEGRATION.md](docs/GOOGLE_CALENDAR_INTEGRATION.md)** - Google Calendar integration setup
- **[IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md)** - Current feature implementation status
- **[CODEBASE-DOCUMENTATION.md](docs/CODEBASE-DOCUMENTATION.md)** - Technical architecture and code documentation

Backend-specific documentation:
- **[server/docs/DATABASE.md](server/docs/DATABASE.md)** - Database schema and relationships
- **[server/docs/MIGRATION_SETUP.md](server/docs/MIGRATION_SETUP.md)** - Database migration guide
- **[server/docs/ADMIN_PASSWORD_RESET.md](server/docs/ADMIN_PASSWORD_RESET.md)** - Admin password reset procedures

## 🆕 Recent Improvements

### Admin Dashboard Redesign (Latest)
- **Modern, data-rich interface** with real-time system metrics
- **Top navigation bar** with profile dropdown, notifications, and quick actions
- **3-column responsive grid** adapting seamlessly to mobile, tablet, and desktop
- **Pending approvals card** with inline approve/reject actions
- **Interactive charts** showing leave trends and type distribution
- **Quick actions panel** for frequently used admin operations
- **Visual enhancements**: Gradient cards, smooth animations, hover effects
- **Performance optimized**: Lazy loading and code splitting for faster initial load

### Vite Performance Optimizations
- **70% reduction in initial bundle size** (1,483KB → 141KB)
- **Route-based code splitting** with React.lazy() for on-demand page loading
- **Smart vendor chunking** for optimal browser caching
- **Vite dev server proxy** to fix API request routing issues
- **Build optimizations**: Terser minification, CSS code splitting, build caching
- **Result**: Initial load 70% faster, Time to Interactive ~0.8s (from ~2s)

### Project Reorganization
- Separated frontend and backend into dedicated `frontend/` and `server/` directories
- Improved project structure for better maintainability
- Clearer separation of concerns

### Direct Dashboard Access After Invite
- New employees are now automatically logged in after completing their invite
- Eliminates redundant login step after password setup
- Improved onboarding UX with seamless authentication flow

### Enhanced Authentication
- JWT-based authentication with automatic token refresh
- Secure invite system with time-limited tokens
- Role-based access control throughout the application

### UI/UX Enhancements
- Modern, responsive design with shadcn/ui components
- Intuitive navigation with role-specific menus
- Real-time validation and error handling
- Loading states and optimistic UI updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

