# Year-End Leave Balance Reset

## Overview

The Year-End Leave Balance Reset feature automatically archives current year leave balances and resets them for the new year.

## Functionality

- **Automatic Reset:** Runs at 11:30 PM on December 31st of each year.
- **Manual Trigger:** Administrators can trigger the process manually if needed.
- **Historical Data:** All leave balance data is preserved in the `leave_balances_history` table.
- **New Year Defaults:**
  - Earned/Privilege Leave: 12 days
  - Sick Leave: 8 days
  - Casual Leave: 8 days
- **Email Notifications:** Optional notifications to employees about their new leave balances.

## API Endpoints

### Admin Endpoints

```
POST /admin/leave-balances/year-end-reset
```
Manually trigger the year-end reset process.

**Request Body:**
```json
{
  "notifyEmployees": true|false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Year-end reset process completed successfully",
  "archivedCount": 150,
  "resetCount": 150,
  "timestamp": "2025-12-31T23:30:00.000Z"
}
```

```
POST /admin/leave-balances/reset/:employeeId
```
Reset leave balances for a specific employee.

**Request Body:**
```json
{
  "targetYear": 2026,
  "notifyEmployee": true|false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave balances for employee 12345 reset successfully for year 2026",
  "archivedCount": 3,
  "resetCount": 3,
  "timestamp": "2025-09-02T15:45:00.000Z"
}
```

## Database Schema

### leave_balances_history

Archives historical leave balance records when they're reset.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | Foreign key to employees table |
| year | INT | The archived year |
| leave_type | VARCHAR | Type of leave (earned, sick, casual) |
| total_allocated | DECIMAL | Total days allocated |
| used_days | DECIMAL | Days used |
| available_days | DECIMAL | Days available |
| carry_forward | DECIMAL | Days carried forward from previous year |
| archived_at | TIMESTAMP | When the record was archived |
| archived_by | UUID | User who triggered the archive (null if system) |

## Configuration

The feature can be configured with the following environment variables:

```
# Enable email notifications for year-end reset (optional)
ENABLE_YEAR_END_NOTIFICATIONS=true
```
