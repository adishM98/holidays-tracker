# Google Calendar Integration for Leave Management System

## Overview

This document describes the Google Calendar integration feature that automatically syncs leave entries to Google Calendar.

## Features Implemented

### ✅ Backend Implementation

1. **OAuth2 Integration for Personal Calendars**
   - OAuth flow for employees to connect their Google accounts
   - Secure token storage and automatic token refresh
   - Connection status tracking

2. **Calendar Event Management**
   - Create calendar events when leaves are approved
   - Update events when leave details change
   - Delete events when leaves are cancelled, rejected, or deleted
   - Support for full-day and half-day leaves

3. **Automatic Sync Integration**
   - Syncs with leave approval workflow
   - Async processing to avoid blocking leave operations
   - Error handling and logging

4. **Database Schema**
   - `google_calendar_tokens` table for storing OAuth credentials
   - `calendar_events` table for tracking synced events
   - Proper foreign key relationships and indexes

5. **API Endpoints**
   - `GET /google-calendar/auth/url` - Get OAuth authorization URL
   - `GET /google-calendar/auth/callback` - Handle OAuth callback
   - `GET /google-calendar/status` - Check connection status
   - `DELETE /google-calendar/disconnect` - Disconnect Google Calendar
   - `GET /google-calendar/events` - List synced calendar events

### 🚧 Pending Implementation

1. **Shared Calendar Integration (Google Workspace)**
   - Service account setup for company-wide calendar
   - Admin configuration interface
   - Sync mode selection (personal, shared, or both)

2. **Frontend UI Components**
   - Employee settings page for connecting Google Calendar
   - Admin settings for shared calendar configuration
   - Connection status indicators
   - Reconnection prompts on sync failures

3. **Enhanced Error Handling**
   - User-friendly error messages
   - Retry mechanisms for failed syncs
   - Notification system for sync status

## Setup Instructions

### 1. Google Cloud Console Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/google-calendar/auth/callback`
     - Production: `https://your-domain.com/api/google-calendar/auth/callback`
   - Save and copy the Client ID and Client Secret

### 2. Backend Environment Configuration

Add the following to your `.env` file:

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/auth/callback
FRONTEND_URL=http://localhost:5173
```

### 3. Database Migration

Run the migration to create the required tables:

```bash
cd leave-management-backend
npm run migration:run
```

### 4. Start the Backend

```bash
npm run start:dev
```

## How It Works

### Employee Flow (Personal Calendar)

1. **Connect Google Calendar**
   - Employee clicks "Connect Google Calendar" in settings
   - Frontend calls `GET /google-calendar/auth/url`
   - User is redirected to Google OAuth consent screen
   - After authorization, Google redirects back to `/google-calendar/auth/callback`
   - Backend stores OAuth tokens securely

2. **Automatic Sync**
   - When a leave is approved, the system automatically creates a calendar event
   - Event title: "On Leave - [Leave Type]"
   - Event description includes leave details and duration
   - Full-day leaves appear as all-day events
   - Half-day leaves appear as 9 AM - 1 PM events

3. **Updates and Deletions**
   - Editing an approved leave updates the calendar event
   - Cancelling, rejecting, or deleting a leave removes the event
   - Sync failures don't block leave operations

### Admin Flow (Shared Calendar)

**Note: This is pending implementation**

1. Admin configures shared Google Workspace calendar in settings
2. Admin selects sync mode:
   - Personal only
   - Shared only
   - Both
3. All approved leaves sync to the shared calendar for company-wide visibility

## API Usage Examples

### Get Authorization URL

```bash
curl -X GET http://localhost:3000/api/google-calendar/auth/url \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
  }
}
```

### Check Connection Status

```bash
curl -X GET http://localhost:3000/api/google-calendar/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "statusCode": 200,
  "data": {
    "connected": true,
    "lastSyncAt": "2025-10-07T10:30:00Z",
    "lastSyncError": null
  }
}
```

### Disconnect Calendar

```bash
curl -X DELETE http://localhost:3000/api/google-calendar/disconnect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Schema

### google_calendar_tokens

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| employee_id | uuid | Foreign key to employees |
| access_token | text | OAuth access token (encrypted) |
| refresh_token | text | OAuth refresh token (encrypted) |
| token_expiry | timestamp | Token expiration time |
| scope | text | OAuth scopes granted |
| is_active | boolean | Whether integration is active |
| last_sync_at | timestamp | Last successful sync time |
| last_sync_error | text | Last sync error message |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Record update time |

### calendar_events

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| leave_request_id | uuid | Foreign key to leave_requests |
| google_event_id | varchar | Google Calendar event ID |
| calendar_id | varchar | Calendar ID (e.g., 'primary') |
| calendar_type | enum | 'personal' or 'shared' |
| employee_id | uuid | Employee ID |
| sync_status | varchar | 'synced', 'failed', 'pending' |
| sync_error | text | Error message if sync failed |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Record update time |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Leave Management                       │
│                                                               │
│  ┌──────────────┐         ┌──────────────────────────────┐  │
│  │   Leaves     │────────>│   Calendar Sync Service      │  │
│  │   Service    │         │   (Async Processing)         │  │
│  └──────────────┘         └──────────────────────────────┘  │
│        │                              │                      │
│        │                              │                      │
│        v                              v                      │
│  ┌──────────────┐         ┌──────────────────────────────┐  │
│  │   Leave      │         │   Google Calendar Service    │  │
│  │   Request    │         │   (Event CRUD Operations)    │  │
│  │   Entity     │         └──────────────────────────────┘  │
│  └──────────────┘                     │                      │
│                                       │                      │
│                                       v                      │
│                          ┌──────────────────────────────┐   │
│                          │   Google OAuth Service       │   │
│                          │   (Token Management)         │   │
│                          └──────────────────────────────┘   │
│                                       │                      │
└───────────────────────────────────────┼──────────────────────┘
                                        │
                                        v
                            ┌───────────────────────┐
                            │   Google Calendar API │
                            └───────────────────────┘
```

## Security Considerations

1. **Token Storage**
   - OAuth tokens are stored in the database
   - Consider encrypting tokens at rest in production
   - Tokens are excluded from API responses using `@Exclude()` decorator

2. **Token Refresh**
   - Automatic token refresh before expiration
   - Failed refresh disables integration and notifies user

3. **Scopes**
   - Requests minimum required scopes:
     - `calendar.events` - For creating/updating/deleting events
     - `calendar` - For calendar access

4. **Error Handling**
   - Calendar sync failures don't block leave operations
   - Errors are logged and stored for debugging
   - Users notified of sync failures

## Next Steps

To complete the implementation:

1. **Frontend Development**
   - Create Settings page with Google Calendar integration section
   - Add "Connect Google Calendar" button
   - Display connection status and last sync time
   - Show reconnection prompt if integration fails

2. **Shared Calendar (Google Workspace)**
   - Implement service account authentication
   - Add admin configuration UI
   - Support sync mode selection
   - Implement shared calendar event creation

3. **Testing**
   - Unit tests for calendar services
   - Integration tests for OAuth flow
   - E2E tests for leave-to-calendar sync

4. **Documentation**
   - User guide for connecting Google Calendar
   - Admin guide for shared calendar setup
   - Troubleshooting guide

5. **Enhancements**
   - Batch sync for historical leaves
   - Manual retry for failed syncs
   - Calendar event color customization
   - Timezone handling improvements

## Troubleshooting

### Common Issues

**Issue: "OAuth callback failed"**
- Ensure `GOOGLE_REDIRECT_URI` matches the authorized redirect URI in Google Cloud Console
- Check that `FRONTEND_URL` is correctly set

**Issue: "Token refresh failed"**
- User needs to reconnect their Google account
- Ensure `refresh_token` is being stored (use `prompt=consent` in OAuth URL)

**Issue: "Calendar sync not working"**
- Check if employee has connected their Google Calendar
- Verify leave status is "APPROVED" (only approved leaves sync)
- Check `last_sync_error` in `google_calendar_tokens` table

**Issue: "Events not appearing in calendar"**
- Verify Google Calendar API is enabled in Google Cloud Console
- Check OAuth scopes include calendar access
- Ensure calendar event is being created for the correct calendar ID

## Support

For issues or questions:
1. Check the application logs for error messages
2. Verify environment variables are set correctly
3. Check Google Cloud Console for API quota and errors
4. Review the `calendar_events` table for sync status

## License

This feature is part of the Leave Management System.
