# Decoration Animations

## Purpose
Reserved for **decoration animation clip definitions** — JSON files
describing animations for environment props (e.g. swaying trees, flowing water,
flag waving). Currently this folder is empty as no decoration models have
unique animation clips.

## File format
JSON conforming to the same animation schema used by nation pack animations
(see `assets/nations/{nation}/animations/README.md`). Each file defines
named clips with keyframe frames, durations, and optional particle effects.

## What is expected here
Future animation files would be named after the decoration they animate
(e.g. `trees.json`, `water.json`, `flag.json`).

## How assets are consumed
Animation files would be loaded by `src/rendering/` modules when placing
decorations on the map.

## Asset Policy
No original Siedler 4 assets.
