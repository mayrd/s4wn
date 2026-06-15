# S4WN Game Server Dockerfile
# Multi-stage build for minimal image size

# ── Stage 1: Build ──────────────────────────────────────────────
FROM rust:1.96-slim AS builder

WORKDIR /build

# Copy manifests
COPY server/Cargo.toml server/Cargo.lock* ./

# Build dependencies cache layer
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true

# Copy source code
COPY server/src/ src/

# Build release binary
RUN cargo build --release

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/target/release/s4wn-server /usr/local/bin/s4wn-server

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["s4wn-server"]
