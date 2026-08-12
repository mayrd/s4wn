# UI Assets

This folder is the **single home for all creative assets used by the in-game UI, menus, and HUD** — splash screen, icons, logos, window chrome, buttons, and procedural texture patches.

> See [`PROMPTS.md`](./PROMPTS.md) for the Gemini prompt used to (re)generate every procedural UI texture in this folder.

## Contents

### Procedural UI textures (Gemini-generated, green-screen keyed)
These are regenerated from `PROMPTS.md` via the UI texture generator. Every one has a prompt entry in `PROMPTS.md`; **if you add a new `*.png` texture here, add a matching prompt entry too** (TDD-style: the asset-organization test pins the expected set).

- `ui_panel.png`, `ui_menu_bg.png`, `ui_frame.png` — panel backgrounds / frame borders
- `ui_header.png`, `ui_divider.png`, `ui_separator_decor.png` — header bars & dividers
- `ui_button.png`, `ui_button_hover.png`, `ui_button_pressed.png` — button states
- `ui_corner.png`, `ui_tab_ornament.png` — corner / tab ornaments
- `ui_progress_bg.png`, `ui_progress_fill.png` — progress-bar tracks
- `ui_medals.png` — campaign / achievement medal icons

### Brand & window-chrome assets (committed, not prompt-generated)
- `splash.png` — main menu full-bleed background
- `logo-1024.png` — title logo
- `favicon-*.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x192.png` — browser/desktop icons
- `manifest.json` — web app manifest

## Regeneration

```
# UI textures: requires a Gemini API key + the prompt in PROMPTS.md
python3 scripts/generate_ui_textures.py

# Build-time verification (asset-organization tests pin this folder's contents)
npm test -- asset-organization
```

## Design note
UI textures use a solid bright-green (`#00FF00`) key as their transparent background, keyed out at load time. They intentionally live **here in `assets/ui/`** rather than in the legacy `assets/textures/` folder, which now holds only shared *game* textures (resource icons, building materials, particle sheets).
