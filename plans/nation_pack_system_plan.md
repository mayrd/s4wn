# Nation Pack System — Implementation Plan

## Overview

S4WN adopts a **modular nation pack architecture** where each nation is a self-contained
directory under `assets/nations/`. A nation pack bundles all data — game rules, 3D models,
textures, animations, and icons — into a single folder. Adding a new nation requires only
adding a new folder; no code changes needed.

## Folder Structure

```
assets/nations/{nation_id}/
├── nation.json          # Mandatory — all game data and metadata
├── models/              # 3D models (glTF 2.0 /.glb preferred, OBJ accepted)
│   ├── buildings/       # Per-building meshes: woodcutter.glb, sawmill.glb, ...
│   ├── units/           # Per-unit meshes: worker.glb, soldier.glb, settler.glb, ...
│   └── decorations/     # Props, flags, monuments specific to this nation
├── textures/            # Textures mapped to the models above
│   ├── buildings/       # Building material textures (stone, timber, thatch, …)
│   ├── units/           # Unit skin/texture atlases (worker sheet, soldier sheet, …)
│   └── shared/          # Shared nation effects (banner, emblem, particle …)
├── animations/          # Animation definitions (JSON descriptors)
│   ├── units/           # Per-unit animation clips (idle, walk, attack, die, …)
│   └── buildings/       # Building animations (flag wave, smoke, water wheel, …)
├── icons/               # UI icons
│   ├── buildings/       # 48×48 PNG per building type
│   ├── units/           # 48×48 PNG per unit kind
│   └── ui/              # Nation-specific UI elements (tab icon, banner, loading)
└── audio/               # (Future) Nation-specific SFX / music
```

## `nation.json` Schema

The file uses a **versioned, extensible** JSON structure. Unknown keys are silently
ignored so older engine versions can load packs built for newer schemas (forward
compatibility), and newer engines fall back to defaults for missing keys (backward
compatibility).

### Top-Level Structure

```jsonc
{
  "$schema": "https://s4wn.mayrd.org/schemas/nation/v1.json",
  "version": 1,

  "id": "romans",
  "name": { "en": "Romans", "de": "Römer" },
  "description": {
    "en": "The Roman Empire — masters of engineering and military discipline.",
    "de": "Das Römische Reich — Meister der Baukunst und militärischen Disziplin."
  },

  "visuals": { … },
  "economy": { … },
  "units": { … },
  "buildings": { … },
  "balancing": { … },
  "specialResources": { … },
  "techTree": { … },
  "ai": { … }
}
```

### `visuals` — Appearance & Identity

```jsonc
"visuals": {
  "color":      "#cc3333",             // Territory / UI accent color
  "secondary":  "#ff6644",             // Highlight color
  "emoji":      "🏛️",
  "flag":       "models/decorations/flag_roman.glb",
  "emblem":     "icons/ui/emblem.png",
  "loadingBg":  "icons/ui/loading_bg.png",
  "uiTheme":    "default",             // "default" | "stone" | "wood" | "gold" | "dark"
  "particles": {
    "dustColor":      [0.6, 0.5, 0.4],  // RGB float
    "magicColor":      [0.8, 0.2, 0.2],
    "constructionSpark": [1.0, 0.8, 0.2]
  },
  "terrainModifiers": {                 // Optional — tint terrain textures
    "grassHue":       0,
    "desertSaturation": 1.0
  }
}
```

### `economy` — Production Chains & Resources

```jsonc
"economy": {
  "livestock": {
    "kind":       "sheep",           // "sheep" | "pig" | "goat" | "geese"
    "building":   "sheep_ranch",
    "product":    "meat"
  },
  "divine": {
    "crop":       "grapes",          // "grapes" | "honey" | "agave" | "sunflowers"
    "rawResource":  "grapes",
    "processedInto": "wine",
    "building":   "vineyard",
    "processor":  "wine_press"
  },
  "munitions": null,                 // Mayans: { "building": "powder_mill", … }
  "startingResources": {
    "wood":       40,
    "stone":      30,
    "food":       20,
    "gold":       0,
    "iron":       0,
    "coal":       0,
    "sulfur":     0
  },
  "resourceBonuses": {               // Production multipliers (1.0 = normal)
    "wood":        1.0,
    "stone":       1.0,
    "food":        1.0,
    "gold":        1.0,
    "iron":        1.0
  }
}
```

### `units` — Military & Civilian Units

```jsonc
"units": {
  "worker": {
    "model":       "models/units/worker.glb",
    "texture":     "textures/units/worker.png",
    "animations":  "animations/units/worker.json",
    "icon":        "icons/units/worker.png",
    "stats": { "hp": 50, "speed": 2.5, "carryCapacity": 10 }
  },
  "soldier": {
    "model":       "models/units/soldier.glb",
    "texture":     "textures/units/soldier.png",
    "animations":  "animations/units/soldier.json",
    "icon":        "icons/units/soldier.png",
    "stats": { "hp": 80, "speed": 3.0, "attack": 12, "defence": 8, "range": 1 }
  },
  "archer": {
    "model":       "models/units/archer.glb",
    "texture":     "textures/units/archer.png",
    "animations":  "animations/units/archer.json",
    "icon":        "icons/units/archer.png",
    "stats": { "hp": 60, "speed": 2.8, "attack": 10, "defence": 4, "range": 6 }
  },
  "settler": {
    "model":       "models/units/settler.glb",
    "texture":     "textures/units/settler.png",
    "animations":  "animations/units/settler.json",
    "icon":        "icons/units/settler.png",
    "stats": { "hp": 40, "speed": 2.0, "carryCapacity": 15 }
  },
  "special": {                                 // Nation-unique unit
    "kind":       "medic",
    "displayName": { "en": "Medic", "de": "Feldarzt" },
    "model":       "models/units/medic.glb",
    "texture":     "textures/units/medic.png",
    "animations":  "animations/units/medic.json",
    "icon":        "icons/units/medic.png",
    "stats": { "hp": 45, "speed": 2.5, "healRate": 3, "healRange": 3 }
  }
}
```

### `buildings` — Construction Catalog

Each building entry maps a `BuildingType` discriminant to its nation-specific assets.
Only override buildings that differ from the default; the engine falls back to
`assets/models/buildings/{kind}.glb` for any missing entry.

```jsonc
"buildings": {
  "overrides": {
    "keep": {
      "model":     "models/buildings/keep.glb",
      "texture":   "textures/buildings/stone.png",
      "icon":      "icons/buildings/keep.png",
      "animations": "animations/buildings/keep.json"
    },
    "woodcutter": {
      "model":     "models/buildings/woodcutter.glb",
      "texture":   "textures/buildings/timber.png",
      "icon":      "icons/buildings/woodcutter.png"
    },
    "sheep_ranch": {
      "model":     "models/buildings/sheep_ranch.glb",
      "texture":   "textures/buildings/thatch.png",
      "icon":      "icons/buildings/sheep_ranch.png",
      "animations": "animations/buildings/sheep_ranch.json"
    }
  }
}
```

### `balancing` — Gameplay Tuning

```jsonc
"balancing": {
  "buildSpeedMultiplier":   1.0,   // 1.0 = normal
  "unitTrainSpeedMultiplier": 1.0,
  "resourceGatherMultiplier": 1.0,
  "combatDamageMultiplier":  1.0,
  "territoryExpansionRate":  1.0,
  "populationGrowthRate":   1.0,
  "startingUnits": {
    "worker":    6,
    "soldier":   4,
    "settler":   2
  }
}
```

### `specialResources` — Nation-Unique Materials

For nations with exclusive resources (e.g., Mayan gunpowder or Trojan explosive arrows).

```jsonc
"specialResources": {
  "gunpowder": {
    "displayName": { "en": "Gunpowder", "de": "Schießpulver" },
    "craftedAt": "powder_mill",
    "inputs":  { "sulfur": 2, "coal": 1 },
    "outputs": { "gunpowder": 1 },
    "icon":    "icons/resources/gunpowder.png"
  }
}
```

### `techTree` — Research / Upgrades (future)

```jsonc
"techTree": {
  "nodes": [
    { "id": "advanced_masonry",  "cost": { "stone": 100, "gold": 50 },
      "unlocks": ["keep_upgrade_2"], "prerequisites": [] }
  ]
}
```

### `ai` — AI Personality (future)

```jsonc
"ai": {
  "aggression":      0.5,    // 0.0=peaceful … 1.0=warmonger
  "expansionism":    0.7,    // Preference for claiming territory
  "economyFocus":    0.6,    // Preference for building economy vs military
  "preferredUnits":  ["soldier", "archer"]
}
```

---

## Animation Descriptor Format (`animations/*.json`)

```jsonc
{
  "source": "models/units/worker.glb",     // Which model this animates
  "clips": [
    {
      "name":        "idle",
      "startFrame":  0,
      "endFrame":    40,
      "loop":        true,
      "speed":       1.0,
      "trigger":     "onSpawn"
    },
    {
      "name":        "walk",
      "startFrame":  41,
      "endFrame":    80,
      "loop":        true,
      "speed":       1.2,
      "trigger":     "onMove"
    },
    {
      "name":        "attack",
      "startFrame":  81,
      "endFrame":    110,
      "loop":        false,
      "speed":       1.5,
      "trigger":     "onAttack"
    },
    {
      "name":        "die",
      "startFrame":  111,
      "endFrame":    140,
      "loop":        false,
      "speed":       1.0,
      "trigger":     "onDeath"
    },
    {
      "name":        "build",
      "startFrame":  141,
      "endFrame":    170,
      "loop":        true,
      "speed":       1.0,
      "trigger":     "onConstruct"
    }
  ]
}
```

For glTF models with embedded animations, only the clip names and triggers need to
be specified — `startFrame`/`endFrame` are optional when the glTF contains named
animation tracks.

---

## Loading System Architecture

### 1. Discovery

On startup, the engine scans `assets/nations/` for directories containing `nation.json`.
Each valid directory becomes an available nation. The scan is recursive but stops at
symlinks (no circular traversal).

```typescript
// src/game/NationLoader.ts
interface NationPack {
  id: string;
  path: string;          // Relative to assets/nations/
  manifest: NationManifest;
  loaded: boolean;
  errors: string[];
}

class NationLoader {
  static async discover(): Promise<NationPack[]>;
  static async load(pack: NationPack): Promise<void>;
  static validate(manifest: unknown): NationManifest;
}
```

### 2. Validation

`NationLoader.validate()` checks:
- `id` is a non-empty string matching `[a-z][a-z0-9_]*`
- `version` is a positive integer
- `name` has at least `en` entry
- `visuals.color` is a valid hex color
- Economy chains reference real `BuildingType` discriminants
- Unit and building `model` paths exist on disk
- No two packs share the same `id`

### 3. Fallback Chain

When a nation pack omits an asset (e.g., no custom `woodcutter.glb`), the engine falls
back through a priority chain:

1. `assets/nations/{nation_id}/models/buildings/woodcutter.glb`
2. `assets/models/buildings/woodcutter.glb` (generic fallback)
3. Built-in placeholder mesh (colored box with building icon decal)

Same chain applies for textures, animations, and icons.

### 4. Dynamic Enum Extension

`NationType` becomes a runtime-registered set instead of a compile-time enum:

```typescript
// src/game/NationRegistry.ts
class NationRegistry {
  private packs: Map<string, NationPack> = new Map();
  private builtIn: Set<string> = new Set(['romans', 'vikings', 'mayans', 'trojans']);

  register(pack: NationPack): void;
  get(id: string): NationPack | undefined;
  list(): NationPack[];
  isBuiltIn(id: string): boolean;
}
```

The old `NationType` enum values (0-4) remain as aliases for backward compatibility
but the canonical identity is the string `id` from `nation.json`.

---

## Implementation Steps

### Step 1 — Schema & Validation (1 day)
- [ ] Create `src/game/nations/NationManifest.ts` — TypeScript interfaces matching the JSON schema
- [ ] Create `src/game/nations/NationLoader.ts` — discovery + validation
- [ ] Write `src/__tests__/NationLoader.test.ts` — 15+ test cases

### Step 2 — Folder Reorganization (½ day)
- [ ] Move existing `assets/models/nations/` content into per-nation packs
- [ ] Create `nation.json` for Romans, Vikings, Mayans, Trojans
- [ ] Create stub folders: `models/`, `textures/`, `animations/`, `icons/`
- [ ] Verify old paths still resolve via fallback chain

### Step 3 — Engine Integration (2 days)
- [ ] Refactor `Nation.ts` → `NationRegistry.ts` (string IDs, dynamic registration)
- [ ] Update `GameConfig` to use nation pack ID instead of enum
- [ ] Update `Economy.ts` to read production chains from `nation.json`
- [ ] Update `UnitManager.ts` to resolve unit assets from nation pack
- [ ] Update `BuildingMesh.ts` to resolve building assets from nation pack
- [ ] Update `UIManager.ts` to read nation name/icon from pack

### Step 4 — UI & Polish (1 day)
- [ ] Nation selector screen scrolls discovered packs
- [ ] Nation pack validation errors shown in debug panel
- [ ] Hot-reload: editing `nation.json` reloads without restart

### Step 5 — Documentation (½ day)
- [ ] Add `assets/nations/README.md` — pack creation guide
- [ ] Add `nation.json` JSON Schema (`$schema` URL)
- [ ] Community pack tutorial in `plans/nation_pack_tutorial.md`

---

## Migration from Hardcoded Nations

| Old (`NationType` enum) | New (`nation.json`) |
|--------------------------|---------------------|
| `NationType.Romans = 0` | `id: "romans"` |
| `NATION_NAMES[0]` | `pack.manifest.name.en` |
| `NATION_INFO[0].color` | `pack.manifest.visuals.color` |
| `nation.getBuildings()` — hardcoded array | `pack.manifest.buildings.overrides` + generic fallback |
| `nationSpecific` hardcoded map | `pack.manifest.economy.livestock` etc. |
| `NATION_COUNT = 5` | `registry.list().length` |

---

## Base Nations — Implementation

Four base nation packs ship with S4WN:

| ID | Name | Color | Special Unit |
|----|------|-------|-------------|
| `romans` | Romans / Römer | `#cc3333` | **Medic** — heals nearby infantry |
| `vikings` | Vikings / Wikinger | `#3366cc` | **Axe Warrior** — high-damage shock troop |
| `mayans` | Mayans / Maya | `#33cc33` | **Blowgunner** — paralytic darts |
| `trojans` | Trojans / Trojaner | `#cc9933` | **Backpack Catapult** — long-range artillery |

Dark Tribe remains an NPC-only faction, also defined as a nation pack.

---

## Extensibility — Adding a New Nation

1. **Create folder**: `assets/nations/egyptians/`
2. **Write `nation.json`** — copy a base template, fill `id`, `name`, `visuals`, `economy`, `units`, `buildings`
3. **Add models** — drop `.glb` files into `models/buildings/` and `models/units/`
4. **Generate textures** — use Gemini (prompts in `plans/asset_prompts.md`)
5. **Add icons** — 48×48 PNG per building and unit
6. **Define animations** — create `animations/units/worker.json` with clip definitions
7. **Test** — run `npm test`, verify nation appears in selector screen

No engine rebuild required — the new nation is discovered at runtime.
