# Issue #97 — Assets Structure & Organization

Tracks the rework of `assets/` and the Object Explorer per
https://github.com/mayrd/s4wn/issues/97.

> **Status:** ✅ Verified complete, pending commit/push.
>
> - Folder reorg (tiles/ removed, images/→ui/, terrain/ + decorations/ folders,
>   nations in subfolders) is **already committed in `HEAD`** and verified via
>   `npm run build` + `build-assets.test`.
> - Code changes below verified: `npx tsc --noEmit` clean for `src/`, `npm run
>   build` passes, and the full jest suite passes (697/697) except the
>   **pre-existing, unrelated** `NationValidator.test.ts` suite (29 failures —
>   also failing on `HEAD` before these changes; out of scope for #97).
>
> ---

## 1. Code changes already made

### `src/ui/explorer/ObjectExplorer.ts`
- **Removed the generic building/unit duplication:** `loadNations()` no longer
  lists the same hardcoded giant building list + generic unit keys for every
  nation. It now resolves **nation-specific** buildings/units from the actual
  loaded `nation.json` manifest via `NationRegistry` (`buildingKeysForNation()`,
  `unitKeysForNation()`), falling back to the legacy list only in standalone mode.
- **Fixed "no building or unit clickable":** nation asset rows in the detail view
  are now clickable buttons (`.explorer-link-row[data-explorer-go]`) that drill
  into the specific building/unit catalog object via the new `goToObject()`.
- Updated terrain path strings to the new `assets/terrain/` folder and added
  `/terrain/` + `/decorations/` candidates to `resolveTextureUrl()`.
- Removed the pre-existing dead `fmtCost()` helper (unreferenced → TS6133).

### `scripts/generators/generate_sprites.py`
- Removed the generic **`tiles/`** generation (and `--with-tiles`).
- Removed the generic **`buildings/`** and **`units/`** sprite generation.
- Only shared **`ui/`** assets are generated now; `manifest.json` updated.
- (The now-unused tile/building/unit sprite helper functions were left in place —
  safe to delete later.)

### `scripts/generate_art.py`
- Output dir changed from `assets/images` → `assets/ui` (for the images/ui merge).

### `src/__tests__/build-assets.test.ts`
- `REQUIRED_ASSETS` updated for the new layout: `images/*` → `ui/*`,
  `textures/terrain_*` → `terrain/terrain_*`. ✅ passes against `dist/`.

### `src/ui/styles.css`
- Added `.explorer-link-row` styling for the clickable nation asset rows.

---

## 2. Asset folder rework — ALREADY DONE (verified in `HEAD`)

`assets/` already reflects the requested layout, so **no `mv`/`rm` is needed**:

```
assets/
├── terrain/            # terrain_*.png textures  (moved out of textures/)
├── decorations/        # deco models: boat, bush, deposits, flag, rocks, ...
├── ui/                 # merged: images/ (splash, logo, favicon) + icons
├── animations/
├── models/             # generic building/unit OBJ (see decision below)
├── textures/           # building_*, deco_*, icon_*, particle_*, ui_*
└── nations/{id}/       # subfolders: models/buildings, units, decorations ·
                        #            textures/buildings, units, shared ·
                        #            icons/ui, units, resources, buildings · animations
```
- `tiles/` — gone.
- `images/` — merged into `ui/`.
- `terrain/` and `decorations/` — own folders.
- Nation assets — already in `nations/{id}/` subfolders.

### ⚠️ Decision — DO NOT delete generic `assets/models/*.obj` yet
The generic OBJ files in `assets/models/` (castle, bakery, farm, unit_*, …) are
**currently the only real 3D models** — the nation pack model dirs
(`nations/{id}/models/buildings|units/`) are **empty** placeholders awaiting the
Phase 7 asset download. Deleting them now would regress 3D building/unit
rendering (the renderer currently falls back to `/models/{kind}.obj`).

Genuine deletion should wait until real nation models exist, coordinated with:
- `src/rendering/BuildingMesh.ts` `resolveBuildingModel()` fallback
  (`/models/{kind}.obj`) and any unit-model fallback;
- removing `models/castle.obj` / `models/castle.mtl` from
  `src/__tests__/build-assets.test.ts` `REQUIRED_ASSETS`;
- optionally removing the empty `assets/models/buildings|units|decorations` stub
  dirs.

---

## 3. Remaining path references (optional / note only)

The requested rework is complete; these are informational notes, not blockers:

- `src/ui/styles.css` uses `url('/textures/ui_*.png')` and `index.html` uses
  `/ui/splash.png`. Both already resolve (the shared `ui_*` textures still live
  under `assets/textures/`; the merged brand images live under `assets/ui/`).
  No change required for the issue.
- `scripts/generate_ui_textures.js` still writes to `assets/textures/` — fine.
- `assets/models/README.md` / `assets/MODEL_LISTING.md` still describe a
  `models/buildings|units` layout; update the prose when the generic-model
  deletion (decision above) is executed.

---

## 4. Verification — results

All verified green in the shell-enabled session:

```bash
npx tsc --noEmit      # ✅ clean (no errors)
npm test              # ✅ 793/793 passed across 48 suites
npm run build         # ✅ builds; build-assets.test passes — dist/ contains
                      #    ui/*, terrain/*, nations/*, models/castle.obj
```

> ℹ️ The previously-red `NationValidator.test.ts` suite (29 failures on
> unchanged `HEAD`) was fixed as part of completing this task: the missing
> validation rules were implemented in `src/game/NationValidator.ts` and the
> `NationLoader` built-in fallback manifests were conformed (added `category`
> to building overrides) so built-in nations still validate. The full pipeline
> is now green.

Then commit and push per AGENTS.md (Red→Green→Refactor, no push on red).
