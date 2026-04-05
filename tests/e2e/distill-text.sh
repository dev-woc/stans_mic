#!/bin/bash
set -e

echo "=== E2E: Distill Text Input Flow ==="

# Requires env vars from test runner
: "${TEST_USER_EMAIL:?TEST_USER_EMAIL not set}"
: "${TEST_USER_PASSWORD:?TEST_USER_PASSWORD not set}"

# Log in first
agent-browser open http://localhost:3000/login
agent-browser wait --load networkidle
agent-browser find label "Email" fill "$TEST_USER_EMAIL"
agent-browser find label "Password" fill "$TEST_USER_PASSWORD"
agent-browser find role button click --name "Sign In"
agent-browser wait --url "**/distill"
agent-browser wait --load networkidle
echo "Logged in"

# Verify distill page loaded
agent-browser snapshot -i
SNAPSHOT=$(agent-browser snapshot)
if echo "$SNAPSHOT" | grep -qi "Turn your chaos"; then
  echo "PASS: Distill page loaded"
else
  echo "FAIL: Distill page headline not found"
  exit 1
fi

agent-browser screenshot tests/e2e/screenshots/distill-page.png

# Select Text tab (should be default) and fill input
agent-browser find role tab click --name "Text"
agent-browser wait 300

SAMPLE_TEXT="I've been thinking a lot about consistency. Everyone talks about motivation but motivation is garbage. What actually works is systems. I set up a system three years ago where I write for 20 minutes every morning before I check my phone. No exceptions. That single habit compounded into three books. The key is making the bar so low you can't fail. Not 2 hours of writing. 20 minutes. Anyone can do 20 minutes."
agent-browser find role textbox fill "$SAMPLE_TEXT"
agent-browser screenshot tests/e2e/screenshots/distill-text-filled.png

# Submit
agent-browser find role button click --name "Distill It"
echo "Session submitted"

# Wait for redirect to output page
agent-browser wait --url "**/output/**"
agent-browser wait --load networkidle
agent-browser screenshot tests/e2e/screenshots/output-loading.png

URL=$(agent-browser get url)
if [[ "$URL" == *"/output/"* ]]; then
  echo "PASS: Redirected to output page"
else
  echo "FAIL: Expected /output/[sessionId], got $URL"
  exit 1
fi

# Poll until pipeline completes (max 120s)
MAX_ATTEMPTS=60
ATTEMPT=0
STATUS="pending"

while [[ "$STATUS" != "complete" && "$STATUS" != "failed" && $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
  ATTEMPT=$((ATTEMPT + 1))
  agent-browser wait 2000

  SNAPSHOT=$(agent-browser snapshot)
  if echo "$SNAPSHOT" | grep -qi "final script\|voice match\|Looks Good\|Start Over"; then
    STATUS="complete"
  elif echo "$SNAPSHOT" | grep -qi "failed\|something went wrong"; then
    STATUS="failed"
  fi

  echo "Attempt $ATTEMPT — status: $STATUS"
done

agent-browser screenshot tests/e2e/screenshots/output-final.png

if [[ "$STATUS" == "complete" ]]; then
  echo "PASS: Pipeline completed, output page rendered"
elif [[ "$STATUS" == "failed" ]]; then
  echo "FAIL: Pipeline reported failure"
  exit 1
else
  echo "FAIL: Pipeline did not complete within 120 seconds"
  exit 1
fi

# Verify feedback bar is present
SNAPSHOT=$(agent-browser snapshot)
if echo "$SNAPSHOT" | grep -qi "Looks Good\|Export\|Start Over"; then
  echo "PASS: Feedback bar visible"
else
  echo "FAIL: Feedback bar not found"
  exit 1
fi

echo "=== Distill Text Input Flow: PASSED ==="
