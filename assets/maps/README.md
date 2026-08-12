# Maps

## Purpose
This folder contains **map definition files** for the S4WN game. Maps define
the terrain layout, elevation, resource deposits, and player starting positions
for a playable scenario.

## Folder structure
```
maps/
├── *.map                  # Top-level or campaign maps (binary format)
└── test/                  # Test / sample maps used by unit & integration tests
```

## File format
Map files use the S4WN binary **`.map`** format (same magic header as the
original Siedler 4 `WRLD` container, but extended with UTF-8 resource metadata).
They are authored by the map editor or the `scripts/validate_test_maps.py`
validation tool.

Key characteristics:
- Dimensions are square (32×32, 64×64, 128×128, etc.).
- Each tile encodes: terrain type, elevation, resource deposit type (optional).
- Player starting positions and territory seeds are embedded.

## What is expected here
### Top-level (`maps/`)
- **`.map`** files for campaign or user-created maps.
- A future `campaigns/` subfolder for campaign-specific map sequences.

### `maps/test/`
- Small, deterministic maps used by automated tests
  (`scripts/validate_test_maps.py` and Jest/`build-assets.test.ts`).
- Currently ships:
  | File | Size | Purpose |
  |------|------|---------|
  | `test_island_32x32.map` | 32×32 | Minimal island for fast unit tests |
  | `test_rivervalley_64x64.map` | 64×64 | River / valley terrain for integration |
  | `test_continents_128x128.map` | 128×128 | Large multi-island map for full-game smoke tests |

## Validation
```bash
python3 scripts/validate_test_maps.py assets/maps/test
```

## Asset Policy
Maps are generated data, not original S4 assets. Do not commit S4 `.map` files
extracted from the original game.
