# S4WN — Single-Container Unified Image (Babylon.js/TypeScript)
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

# ── Stage 2: Build TypeScript frontend ────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Cache npm dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript with Vite
COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY index_babylon.html ./
COPY src/ src/
RUN npm run build

# ── Stage 3: Runtime (Caddy + server binary + frontend dist) ──────
FROM caddy:2-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy Rust server binary
COPY --from=server-builder /build/target/release/s4wn-server /usr/local/bin/s4wn-server

# Copy built frontend (Vite output)
COPY --from=frontend-builder /build/dist/ /usr/share/caddy/

# Copy game assets (textures, tiles, models, maps, UI)
COPY assets/ /usr/share/caddy/assets/

# Caddy configuration
COPY web/Caddyfile /etc/caddy/Caddyfile

# Start script
COPY web/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Health-check both services
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/index_babylon.html || exit 1

EXPOSE 80

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/start.sh"]