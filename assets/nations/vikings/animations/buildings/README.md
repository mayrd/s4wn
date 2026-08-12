# Building Animations — Vikings

## Purpose
Animation clip definitions (JSON) for **building** construction, production, and demolition states.

## What is expected here
Sub-files: `{buildingKey}.json` — one per building with unique animations. `generic.json` is inherited by all buildings that lack their own file. Each defines clips (construction, production, demolition) and optional particle effects.

## How assets are consumed
Loaded from `nation.json -> buildings[].animations`.
