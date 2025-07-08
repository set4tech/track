#!/bin/bash

# Test email sender for decision tracker
# Usage: ./test-email.sh "decision text" "subject"

DECISION_TEXT="${1:-We decided to use React for the frontend project}"
SUBJECT="${2:-Test Decision from CLI}"

curl -X POST "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"personalizations\": [{
      \"to\": [{\"email\": \"test@example.com\"}],
      \"cc\": [{\"email\": \"decisions@bot.set4.io\"}]
    }],
    \"from\": {\"email\": \"will@set4.io\"},
    \"subject\": \"$SUBJECT\",
    \"content\": [{\"type\": \"text/plain\", \"value\": \"$DECISION_TEXT\"}]
  }"

echo "Test email sent! Check the decision log at: https://track-sigma-nine.vercel.app/api/decisions-ui"
