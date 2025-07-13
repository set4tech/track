# Gmail OAuth Setup Guide

## Overview

The Gmail OAuth integration uses the `gmail.settings.basic` scope to set up automatic email forwarding. This approach avoids the restricted `gmail.readonly` scope and its associated verification requirements.

## How It Works

Instead of reading emails directly, we:
1. Use OAuth to access Gmail settings
2. Add our tracking email as a forwarding address
3. Create a filter to forward emails where the user is CC'd
4. Process forwarded emails through our existing webhook

## Understanding Gmail Settings Scope

The scope `https://www.googleapis.com/auth/gmail.settings.basic` allows:
- Managing filters
- Managing forwarding addresses
- No access to email content
- Less restricted than reading emails

## Google Cloud Console Setup

### 1. Configure OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services → OAuth consent screen**
3. Configure the following:
   - App name, support email, and developer contact
   - Scopes:
     - `https://www.googleapis.com/auth/gmail.settings.basic`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Publishing status can be either Testing or Production

### 2. Enable Gmail API

1. Navigate to **APIs & Services → Library**
2. Search for "Gmail API"
3. Click Enable

### 3. User Flow

Since we're using the less-restricted `gmail.settings.basic` scope:
- Users can authenticate without being added as test users
- No annual security assessment required
- Faster approval process for production

### 3. Configure Redirect URIs

In **APIs & Services → Credentials**, ensure your OAuth 2.0 Client ID has these authorized redirect URIs:

```
http://localhost:3000/api/auth/gmail-callback
https://dev.track.set4.io/api/auth/gmail-callback
https://track-set4.vercel.app/api/auth/gmail-callback
https://track.set4.io/api/auth/gmail-callback
```

Also add any preview deployment URLs like:
```
https://track-git-[branch]-[project].vercel.app/api/auth/gmail-callback
```

## User Experience

### Setup Flow

1. User clicks "Connect Gmail & Set Up Forwarding"
2. Authenticates with Google OAuth
3. We add `decisions@bot.set4.io` as a forwarding address
4. Gmail sends a verification email to that address
5. We create a filter to forward CC'd emails
6. User continues to dashboard

### Forwarding Verification

- Gmail requires verification of forwarding addresses
- A verification email is sent to `decisions@bot.set4.io`
- Our system needs to handle these verification emails
- Once verified, the filter becomes active

## Troubleshooting

### "Access blocked: authorisation error"

This is now less likely with `gmail.settings.basic` scope, but can occur if:
1. OAuth consent screen missing required fields
2. Redirect URI mismatch
3. Gmail API not enabled

### Redirect URI Issues

The app determines redirect URI based on environment:
- Production: `https://track-set4.vercel.app/api/auth/gmail-callback`
- Development: `http://localhost:3000/api/auth/gmail-callback`

To override, set `GOOGLE_REDIRECT_URI` environment variable.

### Filter Creation

The app creates a Gmail filter with:
- **Criteria**: `cc:me` (emails where user is CC'd)
- **Action**: Forward to `decisions@bot.set4.io`

This ensures all relevant decision emails are automatically forwarded without manual intervention.

## Environment Variables

```bash
# Required
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional (overrides automatic detection)
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/gmail-callback
```

## Security Notes

- Refresh tokens are encrypted before storage
- Access tokens expire and are refreshed automatically
- Only Gmail settings access is requested (no email content access)
- Forwarding ensures emails are processed through existing security measures