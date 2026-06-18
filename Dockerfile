# S4WN Multi-Arch Docker Image
# Build: docker buildx build --platform linux/amd64,linux/arm64 -t s4wn .

# Stage 1: Build Caddy with the game assets
FROM caddy:2-alpine

# Copy the game engine (pre-built WASM + JS + HTML)
COPY engine/pkg/ /usr/share/caddy/pkg/
COPY engine/index.html /usr/share/caddy/index.html
COPY engine/config/ /usr/share/caddy/config/
COPY web/Caddyfile /etc/caddy/Caddyfile

# Copy game assets (textures, sprites, etc.)
COPY assets/ /usr/share/caddy/assets/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80 443

# Caddy runs as non-root by default in the official image
