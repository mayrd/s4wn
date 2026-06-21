# ⚠️ S4WN AI Agent Rules — READ FIRST

**This file is AUTHORITATIVE. Do NOT override, ignore, or "improve" these rules unless explicitly asked by the user.**

Changes to this file require explicit user instruction.

---

## 1. ASSET POLICY (NON-NEGOTIABLE)

- **NO original Siedler 4 game assets** (sprites, textures, sounds, music) are ever extracted or committed.
- All visuals and audio must be **generated from scratch** and placed in `assets/`.
- Use standard web formats: PNG, WebP, OGG, JSON — never proprietary containers.
- **Exception — maps & campaigns:** parse original `*.map` / `*.sav` for scenario data only, map to our own asset IDs.

---

## 2. WASM EXPORT CHECKLIST (NEVER SKIP)

Adding a new `#[wasm_bindgen]` export to `engine/src/lib.rs`:

1. Add the function with `#[wasm_bindgen]` attribute
2. **MANDATORY: Rebuild WASM** — `cd engine && wasm-pack build --target web --release`
3. **VERIFY each new export exists:** `grep "export function $fn" pkg/s4wn_engine.js`
4. **If an export is MISSING**, the function is internal-only — remove it from the JS import
5. **Bump cache buster** in `index.html` — change `?v=N` to `?v=N+1`
6. Adding imports to `index.html` without rebuilding `pkg/` is the #1 cause of splash-screen stalls

---

## 3. WORKFLOW

### Every session MUST:
1. Resolve open GitHub issues FIRST — before any new features
2. Focus on ONE small atomic task per run
3. Run `cargo test` after every Rust change — all tests must pass
4. `git pull --rebase` before every push — cron jobs push concurrently

### Every session MUST end with:
1. `git add -A && git commit` with meaningful message
2. `git push` — if fails, `git pull --rebase` then retry
3. Update `IMPLEMENTATION_PLAN.md` — mark completed items, log session, write 3-5 next steps
4. Update `README.md` if status changed

---

## 4. CRITICAL PITFALLS

- **`parent.clientHeight` for canvas:** The DOM parent of `position:fixed` canvas has zero/meaningless height. Use `window.innerHeight` instead.
- **`spawn_rubble_effect`:** This is an INTERNAL Rust fn called from `tick_building_destructions`. It has NO `#[wasm_bindgen]` wrapper. Never import it in JS.
- **Map dimensions:** `map.width` and `map.height` are public fields, not methods. Use `map.width`, not `map.width()`.
- **Adding enum variants:** Must update ALL match arms across `lib.rs`, `units.rs`, etc. Run `cargo test --lib` to find all match sites.
- **`pkg/` is gitignored:** Force-add with `git add -f engine/pkg/` when rebuilding WASM.

---

## 5. GITHUB ISSUES

- **Raise proactively** for genuinely ambiguous design decisions
- **Close via commit message:** `Fixes #N` in the commit body
- **API access in cron:** Use `python3` heredoc with `urllib.request`, token from `/opt/data/.env`
- **GH CLI not available:** Use API directly

---

## 6. L3 MAP FORMAT

L3 maps are S4ME/Settlers United compressed format — NOT raw tile data. Do NOT attempt to implement L3 decompression. Direct users to re-save as WRLD in S4ME Editor.

---

## 7. COMMUNICATION

- Keep responses **concise** — short direct answers on Telegram
- Daniel prefers fewer, longer messages over many short ones

---

*Last updated: 2026-06-21*
*Do not modify without explicit user request.*
