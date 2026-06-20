#!/bin/sh
# S4WN — Start both Caddy and s4wn-server in one container
# Caddy handles static files + reverse-proxies /ws to localhost:8080

# Inject S4WN_LOG_LEVEL env var into HTML meta tag (Issue #48)
if [ -n "${S4WN_LOG_LEVEL:-}" ] && [ -f /usr/share/caddy/engine/index.html ]; then
    sed -i "s|content=\"3\" id=\"meta-log-level\"|content=\"$S4WN_LOG_LEVEL\" id=\"meta-log-level\"|" \
        /usr/share/caddy/engine/index.html
    echo "→ Log level set to $S4WN_LOG_LEVEL"
fi

set -e

echo "S4WN starting..."

# Start the WebSocket game server in background
echo "→ Starting game server on :8080"
s4wn-server &
SERVER_PID=$!

# Give the server a moment to bind
sleep 0.5

# Start Caddy in foreground (blocks; receives signals)
echo "→ Starting Caddy on :80"
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
