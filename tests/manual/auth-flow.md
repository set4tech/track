# Manual Test: Authentication Flow

This document outlines manual tests for the authentication system.

## Prerequisites

1. Set up OAuth credentials:
   - Google OAuth client ID
   - Microsoft Azure app registration
2. Configure `.env.local` with auth variables
3. Run database migrations: `npm run db:migrate`

## Test Scenarios

### 1. Google Sign-In Flow

1. Navigate to the main page `/`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify:
   - User menu appears with name/email
   - Decisions are visible
   - Session persists on page refresh

### 2. Microsoft Sign-In Flow

1. Navigate to the main page `/`
2. Click "Sign in with Microsoft"
3. Complete Microsoft OAuth flow
4. Verify:
   - User menu appears with name/email
   - Decisions are visible
   - Session persists on page refresh

### 3. Sign Out Flow

1. Sign in with either provider
2. Click "Sign Out" button
3. Verify:
   - Returns to sign-in screen
   - Decisions are no longer visible
   - Session is cleared

### 4. Decision Association

1. Sign in with an account
2. Send an email decision using the same email address
3. Verify:
   - Decision appears in the UI
   - Decision is linked to your user account

### 5. Session Expiry

1. Sign in successfully
2. Wait 15 minutes (session timeout)
3. Refresh the page
4. Verify:
   - Redirected to sign-in
   - Must authenticate again

## Expected Results

- Sign-in/out flows work smoothly
- Sessions persist across page refreshes
- Decisions are properly linked to user accounts
- Only authenticated users can view decisions