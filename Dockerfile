# Multi-stage build for Leave Management System
# Stage 1: Build Frontend (React + Vite)
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY package.json package-lock.json* ./
COPY vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js ./
COPY index.html ./

# Install frontend dependencies (including dev dependencies for build)
RUN npm ci --silent

# Copy frontend source code
COPY src ./src
COPY public ./public

# Build frontend for production
RUN npm run build

# Clean up node_modules to reduce layer size (optional)
RUN rm -rf node_modules

# Stage 2: Build Backend (NestJS)
FROM node:18-alpine AS backend-builder

# Set working directory for backend
WORKDIR /app/backend

# Copy backend package files
COPY leave-management-backend/package.json leave-management-backend/package-lock.json* ./
COPY leave-management-backend/tsconfig.json leave-management-backend/nest-cli.json ./

# Install backend dependencies (including dev dependencies for build)
RUN npm ci --silent

# Copy backend source code
COPY leave-management-backend/src ./src
COPY leave-management-backend/scripts ./scripts

# Build backend for production
RUN npm run build

# Install only production dependencies for runtime
RUN npm ci --only=production --silent && npm cache clean --force

# Stage 3: Production Runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Copy backend build and dependencies
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package.json ./
COPY --from=backend-builder /app/backend/scripts ./scripts

# Copy database initialization script
COPY leave-management-backend/init-db.sql ./

# Copy entrypoint script
COPY leave-management-backend/entrypoint.sh ./entrypoint.sh

# Copy frontend build to be served by backend
COPY --from=frontend-builder /app/frontend/dist ./public

# Create uploads directory and set permissions
RUN mkdir -p uploads && \
    chmod +x entrypoint.sh && \
    chown -R nodeuser:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Use the entrypoint script
ENTRYPOINT ["./entrypoint.sh"]