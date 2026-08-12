# Decorations

## Purpose
This folder holds **environment decoration models** — flat, standalone 3D props
that are placed on the terrain to flesh out the world. These are *not* building
or unit meshes; they are purely decorative or represent static resource deposits.

All models in this folder are **shared across all nations** (i.e., they are
nation-agnostic). Nation-specific decoration variants (such as border posts with
nation-pennant colours) live under each nation pack in
`assets/nations/{nation}/models/decorations/`.

## Folder structure
```
decorations/
├── models/                # 3D meshes (OBJ + MTL) for all environment props
├── textures/              # (Future) decoration-specific texture overrides
└── animations/            # (Future) decoration animation clips (JSON)
```

## What is expected here
### `models/`
Flat OBJ/MTL pairs for environment decorations. Every `.obj` is paired with a
matching `.mtl` of the same base name. Models are low-poly and authored to sit
on the ground plane at the origin (`y = 0`).

| Category | Example files | Notes |
|----------|--------------|-------|
| Vegetation | `bush.obj`, `cactus.obj`, `flowers.obj`, `mushrooms.obj`, `reed.obj`, `driftwood.obj` | Low-poly plants |
| Rocks / terrain features | `rock.obj`, `rock_large.obj` | Simple geometry |
| Resource deposits | `deposit_coal`, `deposit_iron`, `deposit_gold`, `deposit_stone`, `deposit_sulfur`, `deposit_grain`, `deposit_fish`, `deposit_game` | Mark resource locations |
| Structures | `ruins.obj`, `runestone.obj` | Ruins / lore props |
| Dynamic props | `bridge.obj`, `cart.obj`, `construction.obj` | Bridges, carts, scaffolding |
| Flags | `flag.obj` | Generic flag pole (nation-specific flags are in nation packs) |
| Geysers | `geyser.obj` | Environmental effect props |

### `textures/`
Reserved for future decoration-specific texture overrides. Currently empty
(contains `.gitkeep`).

### `animations/`
Reserved for future decoration animation clips. Currently empty
(contains `.gitkeep`).

## How assets are consumed
Decoration meshes are loaded by `src/rendering/` modules (e.g.,
`BuildingMesh.ts`, `BorderPost.ts`) and placed on the map by the terrain / map
rendering pipeline. The Object Explorer (`src/ui/explorer/ObjectExplorer.ts`)
references decoration models via the path `/decorations/models/{filename}`.

## Regeneration
Decoration models are generated from scratch using procedural scripts. See
`scripts/` and `assets/MODEL_LISTING.md` for the canonical catalog of expected
models.

## Asset Policy
**No original Siedler 4 assets.** Everything in this folder is generated from
scratch or sourced from CC0 libraries. See the Asset Policy in `AGENTS.md`.
