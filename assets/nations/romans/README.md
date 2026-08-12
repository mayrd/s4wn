# Romans Nation Pack

## Purpose
This folder is the complete asset pack for the **Romans** faction in S4WN.
All building meshes, unit models, textures, icons, and animation data for
this nation live here. The `nation.json` manifest at the root defines how
every asset file maps to an in-game building or unit.

There is **no generic (non-nation) building set** — global fallbacks in
`assets/textures/` and procedural meshes in code are only used when a nation
override is absent.

## Folder structure
```
romans/
├── nation.json            # Manifest: maps building/unit keys -> asset paths
├── models/                # 3D meshes
│   ├── buildings/         # Romans-themed building OBJ/GLB meshes
│   ├── decorations/       # Border posts, flags, and other scenery
│   └── units/             # Romans-themed unit GLB/OBJ meshes
├── textures/              # Texture maps
│   ├── buildings/         # Building material / diffuse textures
│   ├── shared/            # Common textures shared by units & buildings
│   └── units/             # Unit texture maps
├── icons/                 # UI icons
│   ├── buildings/         # Building icons for the build menu
│   ├── resources/         # Resource icons (wood, stone, iron, ...)
│   ├── ui/                # Nation-specific UI assets (emblem, loading)
│   └── units/             # Unit icons for the HUD / training menu
└── animations/            # Animation clip definitions (JSON)
    ├── buildings/
    └── units/
```

## The `nation.json` manifest
This is the single source of truth for the Romans pack. It defines:
- **Visual identity**: `visuals.color`, `visuals.secondary`, `visuals.emoji`,
  `visuals.flag`, `visuals.uiTheme`.
- **Units**: paths to model / texture / animations / icon for worker, soldier,
  archer, settler, and special units, plus their stats.
- **Buildings**: per-building overrides mapping each key to its model,
  texture, icon, cost, inputs, outputs, production interval, build time,
  max HP, settler capacity, etc.
- **Economy**: starting resources, resource bonuses, special resources.
- **Balancing**: multipliers and AI personality.

**All asset paths in `nation.json` are relative to this folder**
(`assets/nations/romans/`).

## Validation
Loaded at startup by `src/game/NationLoader.ts` and validated by
`src/game/NationValidator.ts`. The Romans pack must pass all validation rules.
