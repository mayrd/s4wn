# Asset Structure — Nations & Themes

```
assets/
├── models/
│   ├── buildings/              # Generic (non-nation) buildings
│   │   ├── basic/              # Woodcutter, Sawmill, Stonecutter
│   │   ├── food/               # Farm, Mill, Bakery, Ranch
│   │   ├── mining/             # Mine, Quarry, Smelter
│   │   ├── military/           # Barracks, Forge, Workshop
│   │   ├── logistics/          # Storehouse, Road Layer, Market
│   │   └── specialists/        # Healer, Distillery, Temple
│   │
│   ├── nations/                # Nation-specific assets
│   │   ├── romans/
│   │   │   ├── buildings/      # Roman-style building OBJs
│   │   │   ├── units/          # Roman settler/worker/soldier OBJs
│   │   │   └── textures/       # Roman-specific textures
│   │   ├── vikings/            # (same structure)
│   │   ├── mayans/             # (same structure)
│   │   ├── trojans/            # (same structure)
│   │   └── dark/               # Dark Tribe
│   │
│   ├── units/                  # Generic unit models (base meshes)
│   │   ├── worker/
│   │   ├── soldier/
│   │   ├── settler/
│   │   ├── archer/
│   │   └── specialist/
│   │
│   └── decorations/           # Environment decoration models
│       ├── trees/
│       ├── rocks/
│       ├── plants/
│       └── props/
│
├── textures/                   # Textures (see asset_prompts.md)
│   ├── terrain_*.png           # 7 terrain types
│   ├── building_*.png          # Building materials
│   ├── ui_*.png                # UI elements
│   ├── icon_*.png              # Resource icons
│   ├── deco_*.png              # Decoration sprites
│   └── particle_*.png          # Particle textures
│
└── images/                     # Brand/UI images
    ├── splash.png
    ├── logo-1024.png
    └── favicon-256.png
```

## Nation-Specific Textures

Each nation gets a tinted/restyled version of the base unit textures:
- **Romans**: Red/maroon tunics, gold trim, marble buildings
- **Vikings**: Blue/grey tunics, wood/pine buildings, snow accents
- **Mayans**: Green/emerald tunics, sandstone buildings, jungle motifs
- **Trojans**: Gold/tan tunics, sun-baked clay buildings
- **Dark Tribe**: Purple/black, obsidian buildings, dark magic motifs

Generate nation variants with Gemini using `nations/{nation}/textures/`.

## 3D Model Sources

| Source | License | Format | Notes |
|--------|---------|--------|-------|
| **Kenney.nl** | CC0 | glTF, OBJ, FBX | Gold standard for free game assets. Fantasy Town Kit, Castle Kit |
| **Kay Lousberg** (KayKit) | Paid (~$13-20/pack) | FBX, OBJ | High-quality low-poly medieval packs. Medieval Hexagon Pack (200+ assets) |
| **itch.io** | Mixed (free/paid) | Various | Search: "low-poly village building OBJ free" |
| **Gemini Image Gen** | Generated | PNG | For textures only, not 3D models |

**Priority downloads:**
1. Kenney Fantasy Town Kit (CC0) → `assets/models/buildings/`
2. Kenney Castle Kit (CC0) → `assets/models/buildings/military/`
3. KayKit Medieval Hexagon Pack (if purchased) → `assets/models/buildings/`
