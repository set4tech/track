# Manual Test: Authentication Flow

<<<<<<< HEAD
## Prerequisites
1. Set up OAuth credentials:
   - Google: Create OAuth 2.0 Client ID at https://console.cloud.google.com/apis/credentials
   - Microsoft: Register app at https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
2. Add credentials to `.env.local`:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   JWT_SECRET=your-secure-random-string
   ```

## Test Steps

### 1. Initial Load
- Navigate to http://localhost:3000 (or your deployment URL)
- Verify the sign-in UI appears with Google and Microsoft buttons
- Verify no decisions are shown

### 2. Google Sign-In
- Click "Sign in with Google"
- Complete Google OAuth flow
- Verify you're redirected back and see your user menu
- Verify you can see your decisions (if any)

### 3. Microsoft Sign-In
- Sign out first
- Click "Sign in with Microsoft"
- Complete Microsoft OAuth flow
- Verify you're redirected back and see your user menu
- Verify you can see your decisions (if any)

### 4. Session Persistence
- Refresh the page
- Verify you remain signed in
- Check that the session cookie is set

### 5. Sign Out
- Click "Sign Out" button
- Verify you're signed out and see the sign-in UI again
- Verify session cookie is cleared

### 6. Email Decision Linking
- Sign in with an account
- Send a decision email from that email address
- Verify the decision appears in your account

## Expected Results
=======
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

>>>>>>> origin/dev
- Sign-in/out flows work smoothly
- Sessions persist across page refreshes
- Decisions are properly linked to user accounts
- Only authenticated users can view decisions