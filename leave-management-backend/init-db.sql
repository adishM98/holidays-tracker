-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create admin user with default credentials
-- Password: Admin@123
INSERT INTO users (id, email, password_hash, role, is_active, must_change_password) 
VALUES (
  gen_random_uuid(),
  'admin@company.com',
  '$2b$10$8K6I9JtNVJGF4w8j5fmUbuS5wn7c3E9ZV7a4a1qUaP9F2g6hNw8jK',
  'admin',
  true,
  false
) ON CONFLICT (email) DO NOTHING;

-- Create sample departments
INSERT INTO departments (id, name) VALUES 
  (gen_random_uuid(), 'Information Technology'),
  (gen_random_uuid(), 'Human Resources'),
  (gen_random_uuid(), 'Finance'),
  (gen_random_uuid(), 'Marketing')
ON CONFLICT (name) DO NOTHING;