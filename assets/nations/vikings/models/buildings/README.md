# Building Models — Vikings

## Purpose
3D geometry (`.obj` + `.mtl` pairs or `.glb`) for **buildings**.

## What is expected here
Sub-files: `{buildingKey}.obj` / `{buildingKey}.glb` with matching .mtl for OBJ. Basenames must match building keys in `nation.json` and `BASE.md` (e.g. `castle`, `bakery`, `storage_yard`).

## How assets are consumed
Loaded by `src/rendering/BuildingMesh.ts` via `resolveBuildingModel(buildingKind, nationType)`.
