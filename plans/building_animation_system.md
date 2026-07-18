# Implementation Plan: Building Construction & Production Animation System
## Overview
Implement the full S4-style animation lifecycle for buildings: Construction (scaffolding phases) and Production (looping work animations).

## 1. Construction Animation (Scaffolding)
- `ConstructionAnimator.ts`:
  - Scaffolding stages: 0% (foundation), 30% (framework), 70% (roof/walls), 100% (finished).
  - Logic: Dynamically swaps building mesh opacity/materials or adds scaffold models based on `constructionProgress`.

## 2. Production Animation
- `ProductionAnimator.ts`:
  - `idle`: Constant building base animation (e.g., small puffs of smoke, flags waving).
  - `produce`: Loop triggered by production cycle (e.g., sawmill blade spinning, forge fire brightening).
  - Logic: Uses building-specific animation descriptors in `assets/nations/[id]/animations/`.

## 3. Implementation Steps
1. **Construction**: Extend `ConstructionAnimator` to use the scaffolding meshes.
2. **Animation Descriptors**: Create JSON manifest for each building kind in `assets/nations/romans/animations/`.
3. **Engine Update**: Hook into `GameLoop` for construction progress updates and production cycle callbacks.

## 4. Acceptance Criteria
- [ ] Scaffolding displays correctly based on construction percentage (phases triggered).
- [ ] Buildings transition seamlessly from scaffold to finished mesh.
- [ ] Production animation triggers only when the building is active and processing.
- [ ] Animations are efficient (no unnecessary draw calls).
- [ ] `npm test` passes.
