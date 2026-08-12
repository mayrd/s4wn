# Unit Animations — Dark Tribe

## Purpose
Animation clip definitions (JSON) for **unit** movement and combat.

## What is expected here
Sub-files: `{unitKey}.json` (e.g. `worker.json`, `soldier.json`). Each defines `idle`, `walk`, `work`/`attack`, and `carry` clips plus inter-clip transitions. See parent `animations/README.md` for format.

## How assets are consumed
Loaded from `nation.json -> units.{unit}.animations`.
