# Manual Test: Authentication Flow

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
- Sign-in/out flows work smoothly
- Sessions persist across page refreshes
- Decisions are properly linked to user accounts
- Only authenticated users can view decisions