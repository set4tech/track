# Manual Test: Authentication Flow

This document outlines manual tests for the authentication system.

## Prerequisites

1. Set up OAuth credentials:
   - Google OAuth client ID
   - Microsoft Azure app registration
2. Configure `.env.local` with auth variables

## Test Scenarios

### 1. Google Sign-In
1. Navigate to the application
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Verify:
   - Redirected back to app
   - User menu appears with profile info
   - Can view decisions

### 2. Microsoft Sign-In
1. Sign out if already logged in
2. Click "Sign in with Microsoft"
3. Complete Microsoft OAuth flow
4. Verify:
   - Redirected back to app
   - User menu appears with profile info
   - Can view decisions

### 3. Sign Out
1. Click "Sign Out" in user menu
2. Verify:
   - Redirected to sign-in page
   - Session cookie cleared
   - Cannot access decisions

### 4. Session Persistence
1. Sign in with either provider
2. Refresh the page
3. Verify:
   - Still signed in
   - User info retained

### 5. Email-Based Decision Access
1. Sign in with email@example.com
2. Create decisions with that email
3. Verify:
   - Can see decisions made by that email
   - Cannot see other users' decisions

### 6. CSRF Protection
1. Open browser dev tools
2. Try to make auth request without CSRF token
3. Verify:
   - Request is rejected with 403

### 7. Domain Restrictions (if configured)
1. Try to sign in with non-allowed domain
2. Verify:
   - Login rejected with error message

### 8. Session Expiry
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