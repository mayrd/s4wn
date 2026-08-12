# Asset Structure — Nations & Themes

> **Important:** there is **no "generic" (non-nation) building set.** Every building is
> **nation-scoped**: its model, texture, and icon resolve *relative to the owning nation
> pack* at `assets/nations/{nation}/nation.json` (e.g. `"model": "models/bakery.obj"`,
> `"texture": "textures/buildings/building_timber.png"`). The `nations/` folder below is
> the source of truth for building/unit visuals; the flat `assets/models/*.obj` files are
> procedural **base/fallback** meshes, not a generic per-category building library.

```
assets/
├── models/                      # 3D meshes (NO nation-specific assets live here)
│   ├── *.obj                    # Base/procedural meshes: buildings, units, terrain tiles
│   │                            # (shared fallback meshes — see note above)
│   ├── kenney_fantasy_town/     # CC0 Fantasy Town Kit (flattened library)
│   ├── kenney_castle/           # CC0 Castle Kit (flattened library)
│   └── poly_pizza/              # CC0 glTF models (castle, house, donkey, windmill, …)
│
├── nations/                     # Nation packs — the source of truth for building visuals
│   ├── romans/                  #   (also: vikings/, mayans/, trojans/, dark/)
│   │   ├── nation.json          # Manifest: per-building model/texture/icon overrides
│   │   ├── models/
│   │   │   ├── buildings/       # {buildingKey}.glb/.obj — per building, per nation
│   │   │   ├── units/           # {unitKey}.glb/.obj
│   │   │   └── decorations/     # borderpost.obj/.mtl — nation-pennant territory post
│   │   ├── textures/
│   │   │   ├── buildings/       # building_*.png (timber, stone, marble, thatch, adobe, …)
│   │   │   └── units/
│   │   ├── icons/
│   │   │   ├── buildings/
│   │   │   └── resources/       # icon_*.png
│   │   └── animations/
│   │       └── buildings/ · units/
│
├── decorations/               # Environment decoration models (flat OBJ/MTL)
│   │                          # boat, bridge, bush, cactus, deposits, flowers,
│   │                          # rock, ruins, tree_*, flags, road, terrain tiles …
├── terrain/                   # Terrain tiles / heightmaps / textures
├── textures/                  # Global/shared textures (UI, particles, deco …)
├── ui/                        # Brand/UI images (splash, logo, favicon, icons)
├── animations/                # Animation data (JSON)
└── maps/                      # Map files (sample-island.map.json, test/)
```

## Buildings Are Nation-Specific

In the nation pack system (**`plans/nation_pack_system_plan.md`**, parsed by
`NationLoader`/`NationRegistry`/`NationValidator`), each nation's `nation.json` maps
building and unit keys to their own model/texture/icon paths, e.g.:

- `assets/nations/romans/models/buildings/castle.glb` (or per-key override in `nation.json`)
- `assets/nations/dark/textures/buildings/building_darkstone.png`

The resolver falls back to the procedural meshes under `assets/models/*.obj` only when a
nation override is absent — they are shared **fallbacks**, not a "generic buildings"
category. To re-skin a building for a nation, add/override it in that nation's pack.

## Nation-Specific Textures

Each nation gets a tinted/restyled version of the base unit/building textures:
- **Romans**: Red/maroon tunics, gold trim, marble buildings
- **Vikings**: Blue/grey tunics, wood/pine buildings, snow accents
- **Mayans**: Green/emerald tunics, sandstone buildings, jungle motifs
- **Trojans**: Gold/tan tunics, sun-baked clay buildings
- **Dark Tribe**: Purple/black, obsidian buildings, dark magic motifs

Generate nation variants with Gemini using `assets/nations/{nation}/textures/`.

## 3D Model Sources

| Source | License | Format | Notes |
|--------|---------|--------|-------|
| **Kenney.nl** | CC0 | glTF, OBJ, FBX | Gold standard for free game assets. Fantasy Town Kit, Castle Kit |
| **Kay Lousberg** (KayKit) | Paid (~$13-20/pack) | FBX, OBJ | High-quality low-poly medieval packs. Medieval Hexagon Pack (200+ assets) |
| **itch.io** | Mixed (free/paid) | Various | Search: "low-poly village building OBJ free" |
| **Gemini Image Gen** | Generated | PNG | For textures only, not 3D models |

**Priority downloads:**
1. Kenney Fantasy Town Kit (CC0) → `assets/models/kenney_fantasy_town/`
2. Kenney Castle Kit (CC0) → `assets/models/kenney_castle/`
3. KayKit Medieval Hexagon Pack (if purchased) → `assets/models/`

To make a kit's buildings visible in-game, add them per-nation under
`assets/nations/{nation}/models/buildings/` and reference them from that pack's
`nation.json`.

