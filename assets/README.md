# Asset Structure — Nations & Themes

> **Important:** there is **no "generic" (non-nation) building set.** Every building is
> **nation-scoped**: its model, texture, and icon resolve *relative to the owning nation
> pack* at `assets/nations/{nation}/nation.json` (e.g. `"model": "models/bakery.obj"`,
> `"texture": "textures/buildings/building_timber.png"`). The `nations/` folder below is
> the source of truth for building/unit visuals; the flat `assets/models/*.obj` files are
> procedural **base/fallback** meshes, not a generic per-category building library.
>
> (For the detailed per-model / per-texture catalog, see [`MODEL_LISTING.md`](MODEL_LISTING.md) in this folder.)

```
assets/
├── decorations/               # Environment decoration models
│   ├── models/                # Flat OBJ/MTL: trees, rocks, deposits, bridges
│   ├── textures/              # (Future) decoration texture overrides
│   └── animations/            # (Future) decoration animation clips
├── maps/                      # Map files (sample-island.map.json, test/)
│   ├── test/                  # Test maps
│   │   ├── test_continents_128x128.map
│   │   ├── test_island_32x32.map
│   │   └── test_rivervalley_64x64.map
│   └── README.md
├── terrain/                   # Terrain tiles / heightmaps / textures
│   ├── terrain_desert.png
│   ├── terrain_forest.png
│   ├── terrain_grass.png
│   ├── terrain_mountain.png
│   ├── terrain_snow.png
│   ├── terrain_swamp.png
│   └── terrain_water.png
├── textures/                  # Global/shared textures (UI, particles, deco …)
│   ├── building_marble.png
│   ├── building_stone.png
│   ├── building_thatch.png
│   ├── building_timber.png
│   ├── deco_bushes.png
│   ├── deco_flowers.png
│   ├── deco_grass.png
│   ├── deco_rocks.png
│   ├── icon_beer.png
│   ├── icon_coal.png
│   ├── icon_food.png
│   ├── icon_gold.png
│   ├── icon_iron.png
│   ├── icon_planks.png
│   ├── icon_stone.png
│   ├── icon_sulfur.png
│   ├── icon_tools.png
│   ├── icon_weapons.png
│   ├── icon_wood.png
│   ├── particle_smoke.png
│   ├── particle_spark.png
│   ├── PROMPTS.md
│   └── README.md
├── ui/                        # Brand/UI images (splash, logo, favicon, icons)
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-256.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   ├── logo-1024.png
│   ├── manifest.json
│   ├── PROMPTS.md
│   ├── README.md
│   ├── splash.png
│   ├── ui_button_hover.png
│   ├── ui_button.png
│   ├── ui_button_pressed.png
│   ├── ui_corner.png
│   ├── ui_divider.png
│   ├── ui_frame.png
│   ├── ui_header.png
│   ├── ui_medals.png
│   ├── ui_menu_bg.png
│   ├── ui_panel.png
│   ├── ui_progress_bg.png
│   ├── ui_progress_fill.png
│   ├── ui_separator_decor.png
│   └── ui_tab_ornament.png
├── animations/                # Animation data (JSON)
│   └── README.md
└── nations/                   # Nation packs — the source of truth for building visuals
    ├── dark/                  #   (also: vikings/, mayans/, trojans/)
    │   ├── nation.json          # Manifest: per-building model/texture/icon overrides
    │   ├── models/
    │   │   ├── buildings/       # {buildingKey}.glb/.obj — per building, per nation
    │   │   ├── units/           # {unitKey}.glb/.obj
    │   │   └── decorations/     # borderpost.obj/.mtl — nation-pennant territory post
    │   ├── textures/
    │   │   ├── buildings/       # building_*.png (timber, stone, marble, thatch, adobe, …)
    │   │   ├── shared/
    │   │   └── units/
    │   ├── icons/
    │   │   ├── buildings/
    │   │   ├── resources/       # icon_*.png
    │   │   └── ui/
    │   └── animations/
    │       ├── buildings/
    │       └── units/
    ├── romans/
    │   ├── nation.json
    │   ├── models/
    │   │   ├── buildings/
    │   │   ├── units/
    │   │   └── decorations/
    │   ├── textures/
    │   │   ├── buildings/
    │   │   ├── shared/
    │   │   └── units/
    │   ├── icons/
    │   │   ├── buildings/
    │   │   ├── resources/
    │   │   └── ui/
    │   └── animations/
    │       ├── buildings/
    │       └── units/
    ├── mayans/
    │   ├── nation.json
    │   ├── models/
    │   │   ├── buildings/
    │   │   ├── units/
    │   │   └── decorations/
    │   ├── textures/
    │   │   ├── buildings/
    │   │   ├── shared/
    │   │   └── units/
    │   ├── icons/
    │   │   ├── buildings/
    │   │   ├── resources/
    │   │   └── ui/
    │   └── animations/
    │       ├── buildings/
    │       └── units/
    ├── trojans/
    │   ├── nation.json
    │   ├── models/
    │   │   ├── buildings/
    │   │   ├── units/
    │   │   └── decorations/
    │   ├── textures/
    │   │   ├── buildings/
    │   │   ├── shared/
    │   │   └── units/
    │   ├── icons/
    │   │   ├── buildings/
    │   │   ├── resources/
    │   │   └── ui/
    │   └── animations/
    │       ├── buildings/
    │       └── units/
    └── vikings/
        ├── nation.json
        ├── models/
        │   ├── buildings/
        │   ├── units/
        │   └── decorations/
        ├── textures/
        │   ├── buildings/
        │   ├── shared/
        │   └── units/
        ├── icons/
        │   ├── buildings/
        │   ├── resources/
        │   └── ui/
        └── animations/
            ├── buildings/
            └── units/
```

## Buildings Are Nation-Specific

In the nation pack system (**[`plans/nation_pack_system_plan.md`](../plans/nation_pack_system_plan.md)**, parsed by
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