# Admin Password Reset Guide

## Emergency Admin Password Reset

If the HR team forgets the admin password, use this SQL query to reset it back to the default password `Admin@123`:

```sql
-- Reset admin password to: Admin@123
-- This query updates the password hash for the admin user
UPDATE users 
SET 
  password_hash = '$2b$10$8K6I9JtNVJGF4w8j5fmUbuS5wn7c3E9ZV7a4a1qUaP9F2g6hNw8jK',
  must_change_password = false,
  is_active = true
WHERE email = 'admin@company.com' AND role = 'admin';
```

## How to Execute This Query

### Method 1: Using Docker (if using Docker setup)
```bash
# Access PostgreSQL container
docker exec -it leave_management_db psql -U postgres -d leave_management

# Run the reset query
UPDATE users SET password_hash = '$2b$10$8K6I9JtNVJGF4w8j5fmUbuS5wn7c3E9ZV7a4a1qUaP9F2g6hNw8jK', must_change_password = false, is_active = true WHERE email = 'admin@company.com' AND role = 'admin';

# Verify the update
SELECT email, role, is_active, must_change_password FROM users WHERE role = 'admin';

# Exit PostgreSQL
\q
```

### Method 2: Using pgAdmin or any PostgreSQL client
1. Connect to your PostgreSQL database
2. Navigate to the `leave_management` database
3. Execute the UPDATE query above
4. Verify the changes

### Method 3: Using PSQL directly
```bash
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d leave_management -c "UPDATE users SET password_hash = '$2b$10$8K6I9JtNVJGF4w8j5fmUbuS5wn7c3E9ZV7a4a1qUaP9F2g6hNw8jK', must_change_password = false, is_active = true WHERE email = 'admin@company.com' AND role = 'admin';"
```

## Default Admin Credentials After Reset
- **Email:** admin@company.com  
- **Password:** Admin@123

## Security Notes
- Change the default password immediately after logging in
- The system allows password changes through the admin profile page
- Always use strong passwords in production environments
- Consider implementing additional security measures like 2FA for admin accounts

## Troubleshooting
- If the query doesn't affect any rows, check if the admin user exists with: `SELECT * FROM users WHERE role = 'admin';`
- Ensure you're connected to the correct database (`leave_management`)
- Verify the email address matches exactly: `admin@company.com`