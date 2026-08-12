# Decoration Textures

## Purpose
Reserved for **decoration-specific texture overrides** — texture maps that
apply to the global decoration models in `models/`. Currently this folder is
empty as all decoration models use shared material textures from
`assets/textures/` (e.g. `building_stone.png`, `deco_bushes.png`).

## What is expected here
Future decoration texture files would be **PNG**, 1024×1024, SRGB, named after
the decoration they apply to (e.g. `flowers.png`, `ruins.png`).

## How assets are consumed
Textures here would be referenced by the OBJ `mtl` files in `models/` via
`map_Kd` directives.

## Asset Policy
No original Siedler 4 assets. All textures are generated from scratch.
See `AGENTS.md`.
