-- ====================================================================
-- ADMIN PASSWORD RESET QUERIES
-- ====================================================================
-- Use these queries to reset admin password directly from database level
-- Password: admin123
-- ====================================================================

-- Option 1: Update existing admin user password
-- This updates the password for admin@company.com to 'admin123'
UPDATE users 
SET 
    password_hash = '$2b$10$rKZSYPJA1wdHJEZLdYwJ9O7mC9XmMK5zR4X8U6yCJtQLZqJtGJqTS',
    updated_at = NOW(),
    must_change_password = false,
    is_active = true
WHERE email = 'admin@company.com';

-- Verify the update
SELECT email, role, is_active, must_change_password, updated_at 
FROM users 
WHERE email = 'admin@company.com';

-- ====================================================================

-- Option 2: Delete and recreate admin user (if corrupted)
-- Step 1: Delete existing admin user
DELETE FROM users WHERE email = 'admin@company.com';

-- Step 2: Create fresh admin user
INSERT INTO users (id, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@company.com',
    '$2b$10$rKZSYPJA1wdHJEZLdYwJ9O7mC9XmMK5zR4X8U6yCJtQLZqJtGJqTS',
    'admin',
    true,
    false,
    NOW(),
    NOW()
);

-- ====================================================================

-- Option 3: Create additional admin user (backup admin)
-- Useful to have a backup admin account
INSERT INTO users (id, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'backup@company.com',
    '$2b$10$rKZSYPJA1wdHJEZLdYwJ9O7mC9XmMK5zR4X8U6yCJtQLZqJtGJqTS',
    'admin',
    true,
    false,
    NOW(),
    NOW()
) 
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    updated_at = NOW();

-- ====================================================================

-- Option 4: Generate new password hash (if you want different password)
-- Use this in your application container to generate new hash:
-- docker exec leave_management_app node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_NEW_PASSWORD', 10).then(hash => console.log('HASH:', hash));"

-- Then use the generated hash in update query:
-- UPDATE users SET password_hash = 'GENERATED_HASH_HERE' WHERE email = 'admin@company.com';

-- ====================================================================

-- Troubleshooting queries:

-- Check if admin user exists
SELECT id, email, role, is_active, must_change_password, created_at, updated_at
FROM users 
WHERE email = 'admin@company.com';

-- Check all admin users
SELECT id, email, role, is_active, must_change_password
FROM users 
WHERE role = 'admin';

-- Check user count
SELECT role, COUNT(*) as user_count
FROM users 
GROUP BY role;

-- Check departments (should have 6)
SELECT id, name, created_at
FROM departments
ORDER BY name;

-- ====================================================================