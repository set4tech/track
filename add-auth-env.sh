#!/bin/bash

echo "🔐 Setting up OAuth environment variables for Vercel"
echo ""

# Prompt for credentials
read -p "Enter your Google Client ID: " GOOGLE_CLIENT_ID
read -p "Enter your Microsoft Client ID (or press Enter to skip): " MICROSOFT_CLIENT_ID
read -sp "Enter your Microsoft Client Secret (or press Enter to skip): " MICROSOFT_CLIENT_SECRET
echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)
echo "✅ Generated JWT secret"

# Add to Vercel
echo ""
echo "Adding environment variables to Vercel..."

vercel env add GOOGLE_CLIENT_ID production <<< "$GOOGLE_CLIENT_ID"
vercel env add JWT_SECRET production <<< "$JWT_SECRET"

if [ ! -z "$MICROSOFT_CLIENT_ID" ]; then
  vercel env add MICROSOFT_CLIENT_ID production <<< "$MICROSOFT_CLIENT_ID"
fi

if [ ! -z "$MICROSOFT_CLIENT_SECRET" ]; then
  vercel env add MICROSOFT_CLIENT_SECRET production <<< "$MICROSOFT_CLIENT_SECRET"
fi

echo ""
echo "✅ Environment variables added!"
echo ""
echo "🚀 Redeploy your app to use the new variables:"
echo "   vercel --prod"