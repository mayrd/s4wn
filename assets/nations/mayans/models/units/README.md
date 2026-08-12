# Unit Models — Mayans

## Purpose
3D meshes for **units** (workers, soldiers, archers, settlers, special units).

## What is expected here
Sub-files: `{unitKey}.glb` or `{unitKey}.obj`. GLB is preferred (carries textures / animations inline); OBJ is a fallback. Common keys: `worker`, `soldier`, `archer`, `settler`, `medic`.

## How assets are consumed
Loaded by the unit renderer from `nation.json -> units.{unit}.model`.
