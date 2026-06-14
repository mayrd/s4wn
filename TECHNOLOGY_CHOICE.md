# Technology Choice

> Decision document — Session 1 deliverable (to be filled by agent)

Status: **DRAFT** — awaiting Session 1 analysis

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

## Candidates: Engine Approach

### Option A: Native WASM Re-Implementation
- Rewrite game logic in Rust/C++ → compile to WASM
- WebGPU for rendering, Web Audio for sound
- **Pros:** Modern, performant, full control
- **Cons:** Massive effort, must reimplement all game logic

### Option B: Emulation via x86 WASM
- Compile original game binary to WASM (e.g., via CheerpX or similar)
- **Pros:** Preserves original game logic perfectly
- **Cons:** Performance overhead, x86 dependencies, licensing

### Option C: Hybrid — Reverse-Engineered Core + Original Assets
- Use community reverse-engineering (Settlers United) for game logic
- Write a new renderer in WebGL/WebGPU
- Load original `.dat` assets
- **Pros:** Best of both worlds, proven logic
- **Cons:** Legal grey area, dependency on reverse-engineering accuracy

---

## Candidates: Web Server

| Server | Pros | Cons |
|--------|------|------|
| **Caddy** | Auto-HTTPS, simple config, small binary | Less ecosystem than Nginx |
| **Nginx** | Battle-tested, extensive docs, multi-arch | More complex config |
| **lighttpd** | Very lightweight | Less features |

---

## Candidates: Build & CI

| Tool | Purpose |
|------|---------|
| Docker Buildx | Multi-arch images (amd64 + arm64) |
| GitHub Actions | CI/CD pipeline |
| Emscripten | C++ → WASM compilation |

---

## Decision (to be made in Session 1)

- [ ] Engine approach: ________________
- [ ] Web server: ________________
- [ ] Build toolchain: ________________
- [ ] Rationale: ________________
