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
npm run preview &
sleep 15
npm run test:ui