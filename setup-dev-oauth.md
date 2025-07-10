# OAuth Setup for Development & Preview Environments

## Recommended Approach: 3 OAuth Clients

### 1. Production Client
- Name: "Track1 Production"
- Authorized origins:
  - `https://track.set4.io`
  - `https://track-set4.vercel.app`

### 2. Preview Client  
- Name: "Track1 Preview"
- Authorized origins:
  - `https://track-set4.vercel.app`
  - Add specific preview URLs as needed

### 3. Development Client
- Name: "Track1 Development"
- Authorized origins:
  - `http://localhost:3000`
  - `http://localhost:3001`
  - `http://127.0.0.1:3000`

## Setting Environment Variables

### For Production:
```bash
vercel env add GOOGLE_CLIENT_ID production
# Use Production Client ID
```

### For Preview:
```bash
vercel env add GOOGLE_CLIENT_ID preview  
# Use Preview Client ID
```

### For Development:
```bash
vercel env add GOOGLE_CLIENT_ID development
# Use Development Client ID
```

### In your .env.local:
```env
GOOGLE_CLIENT_ID=your-dev-client-id.apps.googleusercontent.com
```

## Alternative: Single Client for Non-Production

Create one client for all non-production:
- Name: "Track1 Dev/Preview"
- Authorized origins:
  - `http://localhost:3000`
  - `https://track-set4.vercel.app`
  - Add preview URLs as you create PRs

Then use same client ID for both preview and development environments.