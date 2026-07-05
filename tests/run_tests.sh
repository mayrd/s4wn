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
echo "   Server: vite preview (port 8766)"
echo ""

# Start preview server in background
npx vite build
npx vite preview --port 8766 &
PREVIEW_PID=$!

# Give server time to start
sleep 8

# Run tests
if [ -n "$HEADED_FLAG" ]; then
    npx playwright test -c tests/playwright.config.ts --headed
else
    npx playwright test -c tests/playwright.config.ts
fi

# Kill preview server
kill $PREVIEW_PID 2>/dev/null || true