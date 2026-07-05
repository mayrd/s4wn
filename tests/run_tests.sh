#!/bin/bash
# S4WN UI Test Runner
# Usage: ./run_tests.sh [--headed]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

# Default args
HEADED_FLAG=""

if [ "${1:-}" = "--headed" ]; then
    HEADED_FLAG="--headed"
fi

echo "🔍 Running TypeScript type check..."
npx tsc --noEmit

echo "🧪 Running S4WN UI tests with Playwright..."
npm run build
# Start preview server with explicit port & capture PID
npm run preview > /tmp/preview.log 2>&1 &
PREVIEW_PID=$!

# Wait for server to be healthy (max 30 seconds)
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
if curl -sf http://127.0.0.1:8766/ > /dev/null 2>&1; then
    echo "✓ Preview server ready"
    break
fi
attempt=$((attempt + 1))
sleep 1
done

if [ $attempt -eq $max_attempts ]; then
echo "✗ Preview server failed to start"
cat /tmp/preview.log
kill $PREVIEW_PID 2>/dev/null || true
exit 1
fi

# Run tests with explicit timeout
npm run test:ui || TEST_RESULT=$?

# Cleanup
kill $PREVIEW_PID 2>/dev/null || true
wait $PREVIEW_PID 2>/dev/null || true

exit ${TEST_RESULT:-0}