# AGENTS.md — S4WN AI Agent Operational Rules

> **⚠️ Read BASE.md first.** BASE.md is the foundational source of truth. This file contains operational rules for AI agents working on this project. All rules here derive from BASE.md. When in doubt, BASE.md wins.

---

## Priority Order

1. **BASE.md** — foundational knowledge (read first, never override)
2. **This file (AGENTS.md)** — operational rules
3. **IMPLEMENTATION_PLAN.md** — roadmap and session log
4. **TECHNOLOGY_CHOICE.md** — tech stack rationale

---

## Session Protocol

### Start of every session:
1. Read `BASE.md`
2. Fetch open GitHub issues via API (token in `/opt/data/.env`)
3. Read `IMPLEMENTATION_PLAN.md` "Next Session" section

### During session:
- Resolve open issues FIRST (stability > features)
- One small atomic task per run
- `cargo test` after every Rust change — all 519 tests must pass
- Raise GitHub issues for genuinely ambiguous design decisions

### End of every session (MANDATORY):
1. `cargo test` green
2. `git add -A && git commit` with meaningful message
3. `git push` — if fails, `git pull --rebase` then retry
4. Update `IMPLEMENTATION_PLAN.md` — mark completed, log session, write 3-5 next steps
5. Update `README.md` if status changed

---

## Critical Pitfalls (from BASE.md §4)

- `parent.clientHeight` on `position:fixed` canvas returns ~19px on mobile → use `window.innerHeight`
- `spawn_rubble_effect` is internal-only → no `#[wasm_bindgen]` → never import in JS
- `map.width`/`map.height` are fields, not methods
- Adding enum variants → update ALL match arms → `cargo test --lib` finds missed ones
- `engine/pkg/` is gitignored → force-add with `git add -f`
- L3 maps are compressed → do NOT implement decompression

---

## WASM Export Checklist (from BASE.md §3)

1. `#[wasm_bindgen]` in `lib.rs`
2. `wasm-pack build --target web --release`
3. Verify exports: `grep "export function $fn" pkg/s4wn_engine.js`
4. Bump cache: `?v=N` → `?v=N+1` in `index.html`
5. Never add JS imports without rebuilding pkg/

---

## Communication

- Keep responses concise — short direct answers on Telegram
- Daniel prefers fewer, longer messages over many short ones

---

*Derived from BASE.md. Do not modify without explicit user request.*
