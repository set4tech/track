#!/bin/bash

# Setup script for email router with CLI configuration
echo "🚀 Setting up Email Router for dev/PR deployments..."

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
    echo "❌ Please set VERCEL_TOKEN environment variable"
    echo "   Get token from: https://vercel.com/account/tokens"
    echo "   Then run: export VERCEL_TOKEN=your_token_here"
    exit 1
fi

# Add VERCEL_TOKEN to both environments
echo "📝 Adding VERCEL_TOKEN to production..."
echo "$VERCEL_TOKEN" | vercel env add VERCEL_TOKEN production

echo "📝 Adding VERCEL_TOKEN to preview..."
echo "$VERCEL_TOKEN" | vercel env add VERCEL_TOKEN preview

# Deploy with new environment variables
echo "🚀 Deploying with new environment variables..."
vercel deploy

# Configure SendGrid webhook (requires SENDGRID_API_KEY)
if [ ! -z "$SENDGRID_API_KEY" ]; then
    echo "📧 Configuring SendGrid webhook..."
    curl -X POST "https://api.sendgrid.com/v3/user/webhooks/event/settings" \
      -H "Authorization: Bearer $SENDGRID_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "enabled": true,
        "url": "https://track-sigma-nine.vercel.app/api/email-router",
        "event_types": ["delivered", "bounce", "dropped"]
      }'
    echo "✅ SendGrid webhook configured!"
else
    echo "⚠️  SENDGRID_API_KEY not set - skipping webhook configuration"
    echo "   Run this manually:"
    echo "   curl -X POST \"https://api.sendgrid.com/v3/user/webhooks/event/settings\" \\"
    echo "     -H \"Authorization: Bearer \$SENDGRID_API_KEY\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"enabled\": true, \"url\": \"https://track-sigma-nine.vercel.app/api/email-router\", \"event_types\": [\"delivered\", \"bounce\", \"dropped\"]}'"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📧 Email routing:"
echo "   • Normal emails → Production"
echo "   • Emails with [dev] in subject → Latest dev deployment"
echo "   • All confirmation links work from any deployment"
echo ""
echo "🧪 Test by sending email with subject containing [dev]"
