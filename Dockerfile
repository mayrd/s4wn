# S4WN — Single-Container Unified Image (Babylon.js/TypeScript)
# Build: docker buildx build --platform linux/amd64,linux/arm64 -t s4wn .
#
# Runs Caddy web server serving the built frontend.
# No Rust/WASM required.

# ── Stage 1: Build TypeScript frontend ────────────────────────────
FROM node:22-alpine AS frontend-builder

WORKDIR /build

# Cache npm dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build TypeScript with Vite
COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY index.html ./
COPY src/ src/
RUN npm run build

# ── Stage 2: Runtime (Caddy + server binary + frontend dist) ──────
FROM caddy:2-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built frontend (includes textures, models, etc. from Vite publicDir)
COPY --from=frontend-builder /build/dist/ /usr/share/caddy/

# Caddy configuration
COPY web/Caddyfile /etc/caddy/Caddyfile

# Start script
COPY web/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Health-check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/index.html || exit 1

EXPOSE 80

ENTRYPOINT ["dumb-init", "--"]
CMD ["/usr/local/bin/start.sh"]