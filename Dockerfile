# S4WN — Single-Container Unified Image
# Build: docker buildx build --platform linux/amd64,linux/arm64 -t s4wn .
#
# Runs both Caddy (static files + reverse proxy) and s4wn-server (WebSocket game server)
# in one container. No external dependencies needed.

# ── Stage 1: Build Rust WebSocket server (musl for Alpine compat) ─
FROM rust:1.96-alpine AS server-builder

RUN apk add --no-cache musl-dev

WORKDIR /build

# Cache dependencies
COPY server/Cargo.toml server/Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true

# Build actual binary
COPY server/src/ src/
RUN cargo build --release

# ── Stage 2: Runtime (Caddy + server binary + all assets) ────────
FROM caddy:2-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy Rust server binary
COPY --from=server-builder /build/target/release/s4wn-server /usr/local/bin/s4wn-server

# Copy game engine (WASM + JS bindings)
COPY engine/pkg/ /usr/share/caddy/engine/pkg/
COPY engine/index.html /usr/share/caddy/engine/index.html
COPY engine/lobby.html /usr/share/caddy/engine/lobby.html
COPY engine/mobile-enhancements.js /usr/share/caddy/engine/mobile-enhancements.js
COPY engine/config/ /usr/share/caddy/engine/config/

# Copy game assets (textures, tiles, models, maps, UI)
COPY assets/ /usr/share/caddy/assets/


# Caddy configuration
COPY web/Caddyfile /etc/caddy/Caddyfile

# Start script
COPY web/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Health-check both services
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/engine/index.html || exit 1

EXPOSE 80

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/start.sh"]
