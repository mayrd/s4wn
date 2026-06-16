#!/usr/bin/env bash
# Build the S4WN engine WASM module
set -euo pipefail

cd "$(dirname "$0")"

echo "=== S4WN Engine Build ==="
echo "Building Rust → WASM…"

wasm-pack build \
    --target web \
    --out-dir pkg \
    --out-name s4wn_engine \
    --release \
    .

echo ""
echo "=== Build complete ==="
echo "Output: engine/pkg/"
ls -lh pkg/s4wn_engine_bg.wasm pkg/s4wn_engine.js

# Stamp build version into index.html (yyyy.mm.dd-HH.MM)
BUILD_VER=$(date '+%Y.%m.%d-%H.%M')
if [ -f index.html ]; then
    sed -i "s/BUILD_VERSION/${BUILD_VER}/g" index.html
    echo "  Version stamped: ${BUILD_VER}"
fi

echo ""
echo "To serve locally:"
echo "  cd engine && python3 -m http.server 8080"
echo "  Then open http://localhost:8080/index.html"
