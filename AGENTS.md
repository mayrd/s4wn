# AGENTS.md — S4WN AI Agent Rules

> **⚠️ BASE.md is the priority source of truth.** Read BASE.md first. All work must respect the information there. Never modify BASE.md unless explicitly asked.

---

## Priority Order
1. **BASE.md** — foundational game knowledge (read first, never override)
2. **This file (AGENTS.md)** — operational rules for AI agents
3. **IMPLEMENTATION_PLAN.md** — roadmap and session log
4. **TECHNOLOGY_CHOICE.md** — tech stack rationale

---

## Non-Negotiable Constraints

### Asset Policy
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- All visuals and audio must be **generated from scratch** in `assets/`.
- Standard web formats: PNG, WebP, OGG, JSON — never proprietary containers.
- **Exception:** parse original `*.map` / `*.sav` for scenario data only, map to our own asset IDs.

### Base Knowledge
- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — authoritative source for buildings, units, production chains, and game mechanics.
- **BASE.md** contains building reference data — always consult it before implementing building-related features.

---

## Session Protocol

### Start:
1. Read `BASE.md`
2. Fetch open GitHub issues (API token in `/opt/data/.env`)
3. Read `IMPLEMENTATION_PLAN.md` "Next Session"

### During:
- Resolve open issues FIRST (stability > features)
- One small atomic task per run
- `cargo test` after every Rust change — all tests must pass

### End (MANDATORY):
1. `cargo test` green
2. `git add -A && git commit`
3. `git push` — if fails, `git pull --rebase` then retry
4. Update `IMPLEMENTATION_PLAN.md` — mark completed, log session, write 3-5 next steps

---

## WASM Export Checklist
1. `#[wasm_bindgen]` in `lib.rs`
2. `wasm-pack build --target web --release`
3. Verify: `grep "export function $fn" pkg/s4wn_engine.js`
4. Bump cache: `?v=N` → `?v=N+1` in `index.html`
5. Never add JS imports without rebuilding pkg/

## Critical Pitfalls
- `parent.clientHeight` on `position:fixed` canvas → ~19px on mobile → use `window.innerHeight`
- `spawn_rubble_effect` is internal-only → no `#[wasm_bindgen]` → never import in JS
- `map.width`/`map.height` are fields, not methods
- Adding enum variants → update ALL match arms → `cargo test --lib` finds missed ones
- `pkg/` is gitignored → `git add -f engine/pkg/`
- L3 maps are compressed → do NOT implement decompression

---

## Communication
- Keep responses concise — short direct answers on Telegram
- Daniel prefers fewer, longer messages over many short ones

---

*Never modify BASE.md without explicit user request.*
