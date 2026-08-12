# Nation Packs

## Purpose
This folder is the **source of truth for all building, unit, and decoration
visuals** in S4WN. Each subfolder is a self-contained *nation pack* — a complete
set of assets for one playable faction.

There is **no generic (non-nation) building or unit set.** Every building mesh,
unit texture, and icon is resolved *relative to the owning nation pack* via the
pack's `nation.json` manifest.

## Folder structure
```
nations/
├── romans/                     # Romans nation pack
│   ├── nation.json            # ← Manifest: the single source of truth
│   ├── models/                # 3D meshes (buildings, units, decorations)
│   ├── textures/              # Texture atlases / material textures
│   ├── icons/                 # UI icons (buildings, units, resources, UI)
│   └── animations/            # Animation clip definitions (JSON)
├── vikings/
├── mayans/
├── trojans/
└── dark/                      # Dark Tribe (NPC antagonist)
```

## Nation packs
| ID | Name | Playable | Primary colour | Description |
|----|------|:--------:|:--------------:|-------------|
| `romans` | Romans | ✅ | `#cc3333` | Engineering & military discipline |
| `vikings` | Vikings | ✅ | `#3366cc` | Seafaring & axe warriors |
| `mayans` | Mayans | ✅ | `#33cc33` | Jungle agriculture & astronomy |
| `trojans` | Trojans | ✅ | `#cc9933` | Bronze-age siege & trade |
| `dark` | Dark Tribe | ❌ (NPC) | `#9933cc` | Dark magic & obsidian fortresses |

## Manifest (`nation.json`)
Every nation pack **must** contain a `nation.json` file conforming to the schema
documented in `src/game/NationRegistry.ts` (`NationManifest` interface).

Key fields and their corresponding asset folders:
- `visuals.color` / `visuals.secondary` — nation palette colours.
- `visuals.flag` → `models/decorations/flag_*.glb`
- `units.*.model` → `models/units/{unitKey}.glb`
- `units.*.texture` → `textures/units/{unitKey}.png`
- `units.*.animations` → `animations/units/{unitKey}.json`
- `units.*.icon` → `icons/units/{unitKey}.png`
- `buildings.*.model` → `models/buildings/{buildingKey}.obj` or `.glb`
- `buildings.*.texture` → `textures/buildings/{buildingKey}.png` or `building_*.png`
- `buildings.*.icon` → `icons/buildings/{buildingKey}.png`
- `buildings.*.animations` → `animations/buildings/{buildingKey}.json`

## Asset resolution / fallback chain
`src/rendering/BuildingMesh.ts` → `resolveBuildingModel()` /
`resolveBuildingTexture()` resolves assets in this order:
1. **Nation-specific override** from `nation.json` (if the building has an
   override entry).
2. **Nation pack path**: `assets/nations/{nation}/models/buildings/{key}.glb`
   (or `.obj`).
3. **Global fallback** (procedural) mesh generated in code.

## Validation
Nation packs are validated at startup by `src/game/NationLoader.ts` and
`src/game/NationValidator.ts`. All built-in packs must pass validation.
