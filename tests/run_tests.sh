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
echo "   Server: vite preview (port 4173 by default)"
echo ""

# Start preview server in background
npm run build
npm run preview -- --port 8765 &
PREVIEW_PID=$!

# Give server time to start
sleep 5

# Run tests
if [ -n "$HEADED_FLAG" ]; then
    npx playwright test -c tests/playwright.config.ts --headed
else
    npx playwright test -c tests/playwright.config.ts
fi

# Kill preview server
kill $PREVIEW_PID