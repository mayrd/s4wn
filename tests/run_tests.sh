#!/bin/bash
# S4WN UI Test Runner
# Usage: ./run_tests.sh [test_file] [--headed] [--slow]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Activate venv if it exists
VENV_DIR="$SCRIPT_DIR/../.venv"
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
fi

# Set Chromium path if available
CHROMIUM_PATH="/opt/data/.playwright/chromium-1223/chrome-linux/chrome"
if [ -f "$CHROMIUM_PATH" ]; then
    export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="$CHROMIUM_PATH"
fi

# Default args
TEST_FILE="${1:-}"
HEADED_FLAG=""

if [ "$TEST_FILE" = "--headed" ]; then
    HEADED_FLAG="--headed"
    TEST_FILE="${2:-}"
fi

# Build pytest args
PYTEST_ARGS=(-v --tb=short)

if [ -n "$HEADED_FLAG" ]; then
    PYTEST_ARGS+=(--headed)
fi

if [ -n "$TEST_FILE" ]; then
    PYTEST_ARGS+=("$TEST_FILE")
fi

echo "🔍 Running TypeScript type check..."
cd "$SCRIPT_DIR/.."
npx tsc --noEmit
cd "$SCRIPT_DIR"

echo "🧪 Running S4WN UI tests..."
echo "   Server: auto-started on port 8765"
echo "   Browser: Chromium (Playwright)"
echo ""

python3 -m pytest "${PYTEST_ARGS[@]}"
