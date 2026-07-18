# Implementation Plan: Settler & Unit Behavior System (Classic S4-Style)
## Overview
Replicate Siedler 4-style unit movement, collision handling, and behavior logic for all unit types (Settlers, Workers, Military, Specialists).

## 1. Core Behavior Logic
- **Pathfinding (A* / Flow Fields)**: 
  - Units calculate paths using a grid-based A* modified to account for elevation and terrain costs.
  - Periodic path re-calculation (not per-frame) to minimize CPU load.
- **Movement & Determinism**:
  - Units follow a velocity-based movement vector.
  - **Group Movement (Soldiers)**: Military units form "platoons". They calculate target coordinates based on a formation offset from a "Platoon Leader" target point, ensuring they don't walk on top of each other.
- **Collision & Avoidance**:
  - **Unit-to-Unit**: Units use a simple radius-based avoidance force. If a collision is detected, the unit applies a steering force to steer around rather than stopping.
  - **Object Collision**: Collision handled by the map's `collisionMask` (Buildings, Resources, Trees).

## 2. Unit-Specific Logic
- **Settlers/Workers**: Carry resources from Producer → Consumer buildings. Logic follows: `Fetch Assignment` -> `Go to Source` -> `Pick up` -> `Path to Dest` -> `Drop off`.
- **Soldiers**: Form up at a group target point. Once they arrive, they "gather" by executing a local steering check to find an unoccupied spot around the final (X,Y) point.
- **Specialists (Pioneers/Geologists/Thieves)**: 
  - **Pioneer**: Target border stones, path to location, trigger expansion logic.
  - **Geologist**: Scan mountain terrain within territory, animate "drill" on target.
  - **Thief**: Stealth movement state (reduced collision radius), target enemy building.

## 3. Implementation Steps
1. **UnitController**: Refactor `Unit.ts` states (`IDLE`, `MOVING`, `WORKING`, `COMBAT`).
2. **Steering System**: Integrate steering behaviors for group movement and "clustering" at target destination.
3. **Task Queue**: Each settler/unit gets a `TaskStack` to manage multi-step interactions.

## 4. Acceptance Criteria
- [ ] **Deterministic Movement**: Military groups arrive at a target coordinate with defined formation spacing.
- [ ] **No Overlap**: Units steer around each other; no clipping when stationary.
- [ ] **Clustering**: Soldiers gather around the destination point in a semi-circle or square formation.
- [ ] **Specialist Logic**: Pioneers successfully expand territory, Geologists detect mines, Thieves can reach buildings.
- [ ] **Performance**: Support 200+ active units at 60 FPS without pathfinding jitters.
- [ ] **Tests**: 
    - `UnitCollision.test.ts`: Test unit-to-unit steering repulsion.
    - `PlatoonMovement.test.ts`: Verify group gathering behavior at target (X,Y).
