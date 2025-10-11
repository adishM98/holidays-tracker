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

-- Create departments as per HR team requirements
INSERT INTO departments (id, name) VALUES 
  (gen_random_uuid(), 'Engineering'),
  (gen_random_uuid(), 'QA'),
  (gen_random_uuid(), 'Product'),
  (gen_random_uuid(), 'Sales'),
  (gen_random_uuid(), 'Devrel/ Support/ Solution'),
  (gen_random_uuid(), 'Marketing'),
  (gen_random_uuid(), 'HR')
ON CONFLICT (name) DO NOTHING;

-- Create employee record for admin user
INSERT INTO employees (
  id,
  user_id, 
  employee_id, 
  first_name, 
  last_name, 
  department_id, 
  position, 
  joining_date, 
  annual_leave_days, 
  sick_leave_days, 
  casual_leave_days
)
SELECT 
  gen_random_uuid(),
  u.id,
  'ADMIN001',
  'System',
  'Administrator',
  d.id,
  'System Administrator',
  '2024-01-01',
  25,
  12,
  8
FROM users u, departments d
WHERE u.email = 'admin@company.com' AND d.name = 'Engineering'
ON CONFLICT (employee_id) DO NOTHING;