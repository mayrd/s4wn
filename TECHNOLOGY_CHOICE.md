# Technology Choice

> Decision document — Session 1 deliverable

Status: **DECIDED** — 2026-06-14

---

## Evaluation Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Browser compatibility | High | Must work on Chrome, Firefox, Safari, mobile |
| Performance | High | Settlers IV has complex simulation logic |
| Maintainability | Medium | Single codebase, modern tooling |
| Community | Medium | Active ecosystem, documentation |
| Arm64 support | Medium | Raspberry Pi 5 target |

---

## Decision: Engine Approach

### Selected: **Option A — Native WASM Re-Implementation (Rust)**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Browser compat | ✅ Excellent | WASM + WebGL works everywhere; WebGPU supported in all majors since Nov 2025 |
| Performance | ✅ Excellent | Near-native Rust → WASM with wasm-bindgen |
| Maintainability | ✅ Good | Single Rust codebase, modern tooling, strong type system |
| Community | ✅ Good | Rust game dev ecosystem growing (wgpu, winit, bevy) |
| Arm64 support | ✅ Built-in | Rust cross-compiles to wasm32 natively |

**Rationale:**
- **Option B (Emulation via x86 WASM)** was rejected due to performance overhead, x86 emulation complexity on ARM, and licensing concerns with the original binary.
- **Option C (Hybrid — Reverse-Engineered Core)** was rejected because it creates a dependency on reverse-engineering accuracy and operates in a legal grey area. We want a clean, legally distributable open-source project.
- **Option A** gives us full control, a modern tech stack, and a clean legal foundation. While it requires reimplementing game logic, we can reference the community's documented game mechanics (formulas, production chains, unit stats) without copying code.

**Key Technology Stack:**
- **Language:** Rust (safety, performance, WASM target)
- **WASM Bindings:** wasm-bindgen + web-sys
- **Graphics:** wgpu (targets WebGL2 for broad compat, WebGPU for modern browsers)
- **Audio:** Web Audio API (via web-sys)
- **Build:** wasm-pack → npm package

---

## Decision: Web Server

### Selected: **Caddy**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Auto-HTTPS | ✅ Built-in | Zero-config TLS via Let's Encrypt |
| Config simplicity | ✅ Excellent | Caddyfile is 5 lines for static hosting |
| Multi-arch | ✅ Good | Official images for amd64 + arm64 |
| Binary size | ✅ Small | ~35MB, much smaller than Nginx |

**Rationale:**
- **Nginx** has more ecosystem but Caddy's auto-HTTPS and simpler config reduce maintenance burden.
- **lighttpd** is too minimal — missing modern features like HTTP/2 push, easy TLS.
- Caddy handles TLS certificate renewal automatically, critical for a zero-maintenance deployment.

---

## Decision: Build & CI

### Selected Toolchain

| Tool | Purpose | Version |
|------|---------|---------|
| **Rust (stable)** | Game engine language | 1.96.0 |
| **wasm-pack** | Rust → WASM + JS bindings | 0.15.0 |
| **wasm-bindgen** | JS interop | bundled with wasm-pack |
| **wgpu** | Cross-platform graphics (WebGL/WebGPU) | latest |
| **Caddy** | Production web server | 2.x (Alpine-based) |
| **Docker Buildx** | Multi-arch images (amd64 + arm64) | latest |
| **GitHub Actions** | CI/CD pipeline | — |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│                 Browser                  │
│  ┌───────────────────────────────────┐  │
│  │         JavaScript Glue           │  │
│  │  (wasm-pack generated loader)     │  │
│  ├───────────────────────────────────┤  │
│  │         WASM Module               │  │
│  │  ┌──────────┐  ┌──────────────┐   │  │
│  │  │ Game     │  │ Renderer     │   │  │
│  │  │ Logic    │  │ (wgpu/WebGL) │   │  │
│  │  │ (Rust)   │  │              │   │  │
│  │  └──────────┘  └──────────────┘   │  │
│  └───────────────────────────────────┘  │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ Web Audio│  │  HTML5 Canvas      │   │
│  │ API      │  │                     │   │
│  └──────────┘  └────────────────────┘   │
└─────────────────────────────────────────┘
         ▲
         │ HTTP/2 + TLS
         ▼
┌─────────────────┐
│  Caddy Server   │
│  (Docker)       │
│  amd64 + arm64  │
└─────────────────┘
```

---

## Decisions Checklist

- [x] Engine approach: **Native WASM Re-Implementation in Rust**
- [x] Web server: **Caddy**
- [x] Build toolchain: **Rust + wasm-pack + wgpu + Docker Buildx + GitHub Actions**
- [x] Rationale: See above — clean legal foundation, modern stack, full control
