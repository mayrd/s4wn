# Test Maps

## Purpose
This subfolder contains **small, deterministic map files** used by the
automated test suite. These maps are loaded by Jest unit tests, Playwright UI
tests, and the `scripts/validate_test_maps.py` validation script.

## What is expected here
| File | Dimensions | Purpose |
|------|-----------|---------|
| `test_island_32x32.map` | 32×32 | Minimal single-island map for fast unit tests |
| `test_rivervalley_64x64.map` | 64×64 | River / valley terrain for integration tests |
| `test_continents_128x128.map` | 128×128 | Large multi-island map for full-game smoke tests |

## Naming convention
- All files follow the `test_{descriptor}_{size}x{size}.map` pattern.
- `{descriptor}` is a short, snake_case word describing the topology
  (`island`, `rivervalley`, `continents`).
- `{size}` is the side length in tiles (e.g. `32`, `64`, `128`).

## Constraints
- Maps must be **deterministic** — no random generation at load time.
- All terrain types that the game supports should be represented across the
  set (grass, forest, water, mountain, desert, snow, swamp, deep water).
- Resource deposits should be placed in fixed, known positions so that test
  assertions on resource counts are stable.
- Player / territory seed positions must be reproducible.

## Validation
```bash
python3 scripts/validate_test_maps.py assets/maps/test
```
Every map here must pass validation before committing.
