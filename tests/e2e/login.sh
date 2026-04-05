#!/bin/bash
set -e

echo "=== E2E: Login Flow ==="

# Navigate to login
agent-browser open http://localhost:3000/login
agent-browser wait --load networkidle
agent-browser screenshot tests/e2e/screenshots/login-page.png

# Snapshot to see form elements
agent-browser snapshot -i

# Fill login form (use credentials from a pre-seeded test user)
agent-browser find label "Email" fill "$TEST_USER_EMAIL"
agent-browser find label "Password" fill "$TEST_USER_PASSWORD"

# Submit
agent-browser find role button click --name "Sign In"

# Wait for redirect
agent-browser wait --url "**/distill"
agent-browser wait --load networkidle

# Verify
URL=$(agent-browser get url)
if [[ "$URL" == *"/distill"* ]]; then
  echo "PASS: Logged in and redirected to editor"
else
  echo "FAIL: Expected /distill, got $URL"
  exit 1
fi

agent-browser screenshot tests/e2e/screenshots/login-success.png

# Verify Google OAuth button exists
agent-browser open http://localhost:3000/login
agent-browser wait --load networkidle
agent-browser snapshot -i
SNAPSHOT=$(agent-browser snapshot)
if echo "$SNAPSHOT" | grep -qi "google"; then
  echo "PASS: Google OAuth button present"
else
  echo "FAIL: Google OAuth button not found"
  exit 1
fi

echo "=== Login Flow: PASSED ==="
