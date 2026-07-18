# Building Construction Pipeline Implementation Plan

## 1. Overview / Problem Statement

Currently, buildings are placed via `BuildingPlacement` UI → `Economy.tryPlaceBuilding()` instantly deducts plank/stone/gold cost → `Economy.tick()` advances `constructionProgress` linearly over time → `ConstructionAnimator.update()` shows scaffolding stages visually. **There is no physical resource delivery, no builder unit, no digger for terrain leveling, and no pathfinding-integrated construction workflow.**

This plan details the complete construction pipeline as it should work in S4WN, matching the *Settlers 4* mechanics described in BASE.md:

- **Digger** (idle settler + shovel): Levels uneven terrain before building placement
- **Carriers**: Transport planks and stone from Storage Yards/producers to the construction site
- **Builder** (idle settler + hammer): Assembles the building from delivered materials, advancing `constructionProgress` frame-by-frame while at the site
- **Pathfinding**: All agents (digger, carriers, builder) use A* to navigate to/from the construction site
- **UI**: Status indicators for construction (materials delivered / waiting / builder at work / digging phase)

## 2. Actors & Their Roles

### 2.1 Digger *(Planierer)*
| Property | Value |
|----------|-------|
| Spawned by | Idle Settler + Shovel |
| Purpose | Levels uneven terrain **before** construction |
| Behavior | Walks to building footprint, plays leveling animation for `DIG_TIME` ticks, then marks terrain as flat |
| Outcome | Building foundation is ready for material delivery |
| Pathfinding | A* to building tile, then stands on an adjacent tile while "digging" |

### 2.2 Carrier *(Träger)*
| Property | Value |
|----------|-------|
| Spawned by | Idle Settler (no tool required) |
| Purpose | Transports construction materials (Planks, Stone) from Storage Yard / producer to the scaffold |
| Behavior | Picks up 1 unit of material → walks to construction site → deposits at `inputNode` → repeats until all material delivered |
| Pathfinding | A* to supply → A* to construction site (dedicated `constructionDropoffX/Y` near the scaffold) |
| Priority | Construction deliveries get **higher priority** than normal production deliveries |

### 2.3 Builder *(Bauarbeiter)*
| Property | Value |
|----------|-------|
| Spawned by | Idle Settler + Hammer |
| Purpose | Physically builds the structure once all materials are delivered |
| Behavior | Walks to scaffold → plays hammering animation → advances `constructionProgress` by `BUILD_SPEED` per tick → when `progress >= 1.0`, scaffolding is replaced by final model |
| Pathfinding | A* to construction site, stands adjacent to scaffold tile while working |
| Signals | `builder-arrived`, `construction-completed` |

## 3. Data Structures

### 3.1 ConstructionSite
```typescript
interface ConstructionSite {
  buildingIndex: number;       // References Economy.buildings[index]
  kind: BuildingType;
  x: number;                   // Tile position
  y: number;
  ownerId: number;
  
  // Material tracking
  requiredMaterials: CostItem[];          // Planks + Stone cost (from buildCost())
  deliveredMaterials: number[];           // Count per resource type delivered
  
  // Digger phase
  needsDigging: boolean;                  // True if terrain is uneven (elevation change > threshold)
  diggerAssigned: number | null;          // Unit ID of assigned digger, or null
  diggingProgress: number;                // 0.0 → 1.0
  
  // Builder phase
  builderAssigned: number | null;         // Unit ID of assigned builder, or null
  builderAdjacentTile: { x: number; y: number }; // Where builder stands
  
  // Drop-off point (adjacent tile for material delivery)
  dropoffTile: { x: number; y: number }; // Where carriers deposit materials
  
  // Visual
  scaffoldNode: TransformNode | null;     // Reference to the ConstructionAnimator's scaffold
  
  // Overall phase
  phase: 'digging' | 'materials' | 'building' | 'complete';
}
```

### 3.2 ConstructionManager (New Class)
```typescript
class ConstructionManager {
  sites: Map<number, ConstructionSite> = new Map();
  
  registerSite(buildingIndex: number, kind: BuildingType, x: number, y: number, ownerId: number): void;
  removeSite(buildingIndex: number): void;
  
  // Called each economy tick
  tick(unitManager: UnitManager, economy: Economy, map: Map): void;
  
  // Phase-specific logic
  private processDiggingPhase(site: ConstructionSite, unitManager: UnitManager): void;
  private processMaterialsPhase(site: ConstructionSite, economy: Economy, unitManager: UnitManager): void;
  private processBuildingPhase(site: ConstructionSite, economy: Economy, unitManager: UnitManager): void;
  
  // Assignment
  private findAndAssignDigger(site: ConstructionSite, unitManager: UnitManager): boolean;
  private findAndAssignBuilder(site: ConstructionSite, unitManager: UnitManager): boolean;
  private requestMaterialDelivery(site: ConstructionSite, economy: Economy): void;
  
  // Query
  getConstructionProgress(buildingIndex: number): number;
  getConstructionPhase(buildingIndex: number): string;
}
```

### 3.3 Extensions to Existing Types

#### Economy.BuildingData additions:
```typescript
// Add to BuildingData (or track externally in ConstructionSite):
constructionPhase: 'digging' | 'materials' | 'building' | 'complete';
deliveredPlanks: number;
deliveredStone: number;
diggerId: number | null;
builderId: number | null;
```

#### Unit additions (for carrier/builder/digger pathfinding state):
```typescript
// Unit already has:
- path: Path | null
- carrying: { resource, amount } | null
- logisticsTargetBuildingIndex: number | null
- assignedBuilding: number | null

// New fields for construction workers:
constructionTargetSite: number | null;  // ConstructionSite index
constructionRole: 'digger' | 'builder' | 'carrier' | null;
```

## 4. Phase State Machine

```
                    ┌──────────────────────┐
                    │   PLACE BUILDING      │
                    │  (UI → Economy)       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
           ┌───────│    PHASE: DIGGING     │───────┐
           │       │  (if terrain uneven)  │       │
           │       └──────────┬───────────┘       │
           │                  │ digging done       │ no dig needed
           │                  ▼                    │
           │       ┌──────────────────────┐        │
           └───────│   PHASE: MATERIALS   │◄───────┘
                   │  (deliver planks +   │
                   │   stone to site)     │
                   └──────────┬───────────┘
                              │ all materials delivered
                              ▼
                   ┌──────────────────────┐
                   │   PHASE: BUILDING    │
                   │  (builder works at   │
                   │   scaffold)          │
                   └──────────┬───────────┘
                              │ constructionProgress >= 1.0
                              ▼
                   ┌──────────────────────┐
                   │   PHASE: COMPLETE    │
                   │  (swap scaffold →    │
                   │   final model)       │
                   └──────────────────────┘
```

## 5. Logic Detail

### 5.1 Building Placement (Already partially implemented)

When a building is placed via `BuildingPlacement.onPointerDown()`:
1. `Economy.tryPlaceBuilding()` deducts cost, creates `BuildingData` with `constructionProgress = 0`, `isActive = false`
2. `window.dispatchEvent(new CustomEvent('building-placed', {...}))` fires
3. GameApp's handler calls `ConstructionAnimator.startConstruction()` → scaffolding mesh appears
4. **NEW:** GameApp also calls `ConstructionManager.registerSite()` with the building details
5. **NEW:** ConstructionManager checks the terrain at the building tile. If elevation changes > 0.3 units within the 2×2 footprint, `needsDigging = true`

### 5.2 Digging Phase (if needed)

Each tick in `ConstructionManager.processDiggingPhase()`:

1. **No digger assigned yet**: Scan idle settlers for any carrying a Shovel. Call `findAndAssignDigger()`:
   - Look for an idle Settler unit (not assigned to a building, not carrying anything)
   - Check if there's a Shovel in global storage (`Economy.resources[ToolKind.Shovel] >= 1`)
   - Deduct 1 shovel from storage, spawn a digger unit (or tag existing settler as digger)
   - Set `unit.constructionRole = 'digger'`, `unit.constructionTargetSite = site.index`
   - Pathfind to the building tile

2. **Digger moving to site**: Unit walks along A* path to `(site.x, site.y)`

3. **Digger arrived**: Once within 1.5 tiles of the building:
   - Set `unit.state = UnitState.Working`
   - Start `diggingProgress` counter incrementing
   - Play leveling animation (hammer/pick motion)
   - `diggingProgress += DIG_SPEED * dt` each tick

4. **Digging complete** (`diggingProgress >= 1.0`):
   - Mark terrain as flat (update map elevation)
   - Set `site.needsDigging = false`
   - Transition to `materials` phase
   - Digger becomes idle again (unassign)

**Digging time**: `DIG_TIME = 60` ticks (~2 seconds at 30fps). Possible to have multiple diggers for large buildings.

### 5.3 Materials Phase

Each tick in `ConstructionManager.processMaterialsPhase()`:

1. **Check delivered vs required**: Compare `site.deliveredMaterials[resource]` against `buildCost(kind)`
   - Example: Sawmill costs 4 Planks + 2 Stone
   - Need `deliveredPlanks >= 4` and `deliveredStone >= 2`
   - If both satisfied, transition to `building` phase

2. **Request carrier delivery**: Call `requestMaterialDelivery()`:
   - For each resource type where `delivered < required`:
     - Register a **construction demand** via `Economy.logistics.registerDemand()`:
       - `buildingIndex` = the construction site's building (not a production building)
       - `type` = resource type (e.g., Wood plank, Stone)
       - `amount` = `required - delivered`
       - `x, y` = `site.dropoffTile` (an adjacent free tile, not the building tile itself)
     - Mark this demand with a special flag `isConstructionDemand = true`
   
3. **Carrier picks up & delivers**: The existing `WorkerAI.logisticsTick()` already handles:
   - Carrier finds unreserved item matching demand
   - Reserves it, pathfinds to item, picks it up
   - Pathfinds to demand location (the drop-off tile)
   - Drops resource → `building.inputBuffer[resource] += amount`
   
4. **Track deliveries**: Each tick, check `building.inputBuffer` for Plank/Stone:
   ```typescript
   // In processMaterialsPhase each tick:
   const planksInBuffer = building.inputBuffer[ResourceType.Planks];
   const stoneInBuffer = building.inputBuffer[ResourceType.Stone];
   site.deliveredMaterials[ResourceType.Planks] = planksInBuffer;
   site.deliveredMaterials[ResourceType.Stone] = stoneInBuffer;
   ```

5. **Special: Fast-forward for tutorial**: Step 2 mentions "Apply a temporary 10x construction and transport speed multiplier." We can multiply the delivery scan frequency and de-dup demands in tutorial mode.

**Visual feedback during materials phase**:
- Scaffolding shows partial construction (already handled by `ConstructionAnimator`)
- Small resource stack meshes appear near the drop-off tile (we can reuse `ResourceItemRenderer`)
- A small progress bar or tooltip shows "Materials: 2/4 Planks, 1/2 Stone"

### 5.4 Building Phase

Each tick in `ConstructionManager.processBuildingPhase()`:

1. **No builder assigned yet**: Call `findAndAssignBuilder()`:
   - Scan for idle Settler not assigned to a building
   - Check if `Economy.resources[ToolKind.Hammer] >= 1`
   - Deduct 1 hammer from storage, tag settler as builder
   - Set `unit.constructionRole = 'builder'`, `unit.constructionTargetSite = site.index`
   - Pathfind to `site.builderAdjacentTile` (an adjacent tile next to the building)

2. **Builder moving**: Walk along A* path to the adjacent tile.

3. **Builder arrived**: 
   - Set `unit.state = UnitState.Working`
   - Play hammering animation (could use the existing `worker_work` animation)
   - Each tick: `building.constructionProgress += BUILD_SPEED * dt`
   - Builder stays at the adjacent tile

4. **Builder finishes**: When `building.constructionProgress >= 1.0`:
   - Economy already sets `isActive = true` (in `Economy.tick()`)
   - Construction shows final stage → `ConstructionAnimator.swapToFinalModel()` handles scaffold→model swap
   - Builder becomes idle, returns to pool

**Building speed**: `BUILD_SPEED = 1.0 / constructTime(kind)`, where `constructTime` is the existing `buildTime()` from `economy/types.ts`. So a building with `buildTime = 30` takes 30 ticks of builder work.

**Builder UI**: The builder unit should be visually distinct (carries a hammer, maybe has a yellow hardhat). Could use a scaled settler mesh with a tool attachment.

### 5.5 No Digger Needed (Flat Terrain)

If the terrain is already flat (no elevation change > 0.3 within the footprint), skip the digging phase entirely and go straight to the materials phase.

### 5.6 Construction Completion

When `constructionProgress >= 1.0`:
1. `ConstructionAnimator` (existing) already handles scaffold → final model swap
2. `Economy.tick()` (existing) already sets `isActive = true`
3. `ConstructionManager` cleans up: `removeSite(buildingIndex)`
4. Builder returns to idle pool
5. Any remaining material demands are unregistered
6. Building starts normal production (if it has inputs/outputs)

## 6. Pathfinding Integration

### 6.1 Digger Pathfinding
- Source: Idle digger position → Destination: Building tile
- Use existing `Pathfinder.findPath()`
- Once at tile, stop and play animation (no further path updates)

### 6.2 Carrier Pathfinding
- Already handled by `WorkerAI.logisticsTick()` for normal production deliveries
- For construction, carriers target `site.dropoffTile` instead of the building's own tile
- Ensure dropoff tile is passable (not occupied by another building or obstacle)

### 6.3 Builder Pathfinding
- Source: Idle builder position → Destination: `site.builderAdjacentTile`
- Adjacent tile is computed as the nearest free tile to the building (prefer the front/door side)
- If the tile becomes occupied, re-path to the next-closest free tile

### 6.4 Tile Reservation
- When a digger/builder is assigned to a site, reserve the adjacent tile so no other unit paths through it
- Use existing pathfinding passability checks: mark the tile as temporarily blocked during active construction
- When construction completes, unblock the tile

## 7. UI / Feedback

### 7.1 HUD Status Indicators
- When a building is under construction, show a small progress bar above the scaffold mesh (2D billboard or HTML overlay)
- Display current phase icon: 🚧 Digging / 📦 Materials (2/4) / 🔨 Building (67%) / ✅ Complete
- Use the existing InGameMenu's building list to show construction status per-building

### 7.2 Construction Tooltip
- In the building palette, when hovering over a building type, show the required materials in the cost breakdown (already done via `buildCost()`)
- During construction, clicking on the scaffolding shows a tooltip with:
  - Phase name
  - Material delivery progress (Planks: 3/4, Stone: 1/2)
  - Builder assigned status (Yes/No)
  - Estimated remaining time

### 7.3 InGameMenu Integration
- The "Statistics" tab's building list should show construction phase and progress
- A new "Construction Sites" sub-panel under the building tab shows all active sites with their phase and material status

### 7.4 Tutorial Hooks
- Tutorial step 2 requires: "Apply a temporary 10x construction and transport speed multiplier"
  - Implement a `TutorialSpeedMultiplier` that multiplies `BUILD_SPEED` and carrier movement speed
  - Expose via `ConstructionManager.setSpeedMultiplier(multiplier: number)`

## 8. Implementation Phases

### Phase A: ConstructionManager Core (Week 1)
- [ ] Create `ConstructionManager` class with `registerSite()`, `removeSite()`, `tick()`
- [ ] Define `ConstructionSite` interface
- [ ] Implement phase state machine (`digging` → `materials` → `building` → `complete`)
- [ ] Integrate into `GameLoop.tick()`: call `constructionManager.tick()` each frame
- [ ] Write unit tests for phase transitions

### Phase B: Digger AI (Week 1-2)
- [ ] Implement `findAndAssignDigger()` logic (find idle settler + shovel in storage)
- [ ] Implement `processDiggingPhase()` with pathfinding to site + work animation
- [ ] Add `constructionRole` and `constructionTargetSite` fields to `Unit`
- [ ] Create digger animation (temporary: use hoeking/leveling pose)
- [ ] Wire `onDiggingComplete` callback to terrain flattening
- [ ] Write unit tests for digger assignment and phase progression

### Phase C: Material Delivery to Construction Sites (Week 2)
- [ ] Implement `requestMaterialDelivery()` using `LogisticsManager.registerDemand()` with construction flag
- [ ] Compute `dropoffTile` as nearest free tile adjacent to building
- [ ] Track delivered materials in `ConstructionSite.deliveredMaterials`
- [ ] Modify `WorkerAI.logisticsTick()` to recognize construction demands (higher priority)
- [ ] Transition from `materials` to `building` phase when all materials delivered
- [ ] Write unit tests for material tracking and phase transition

### Phase D: Builder AI (Week 2)
- [ ] Implement `findAndAssignBuilder()` logic (idle settler + hammer)
- [ ] Implement `processBuildingPhase()` with pathfinding to adjacent tile
- [ ] Builder walks to building every tick (handled by Unit movement system)
- [ ] When adjacent: set state to Working, advance `constructionProgress`
- [ ] Hook into `ConstructionAnimator.update()` → already reads `constructionProgress` from Economy
- [ ] Write unit tests for builder assignment and construction progress

### Phase E: UI Feedback (Week 3)
- [ ] Add construction progress bar above scaffolding (HTML overlay or billboard)
- [ ] Add phase icon to ObjectExplorer building details
- [ ] Add "Construction Sites" sub-tab to InGameMenu building panel
- [ ] Add tooltip on click for scaffolding showing material/phase info
- [ ] Wire tutorial speed multiplier

### Phase F: Polish & Edge Cases (Week 3)
- [ ] Handle building destruction during construction (cancel deliveries, free builder/digger)
- [ ] Handle builder/digger death mid-task (reassign new one)
- [ ] Handle storage shortage: show "Waiting for: 2 Planks" as idle indicator
- [ ] Multi-building: ensure multiple concurrent construction sites work
- [ ] Performance: limit construction site processing when many sites are active
- [ ] Save/Load: serialize ConstructionSites via Economy's toJSON/restoreFromJSON

## 9. File Manifest

### New Files
| File | Purpose |
|------|---------|
| `src/game/ConstructionManager.ts` | Core construction site state machine and phase logic |
| `src/__tests__/ConstructionManager.test.ts` | Unit tests for phase transitions, assignment, material tracking |

### Modified Files
| File | Changes |
|------|---------|
| `src/game/Economy.ts` | Call `ConstructionManager.tick()` in `tick()`; add `constructionManager` property; expose `buildings` for iteration |
| `src/game/Unit.ts` | Add `constructionRole: 'digger' \| 'builder' \| 'carrier' \| null`, `constructionTargetSite: number \| null` |
| `src/game/WorkerAI.ts` | Prioritize construction demands in `logisticsTick()`; handle new `constructionRole` carriers |
| `src/game/Logistics.ts` | Add `isConstructionDemand: boolean` to `ResourceDemand` interface; add `getConstructionDemands()` |
| `src/GameApp.ts` | Wire ConstructionManager into `initSystems()` and `dispose()`; pass to GameLoop |
| `src/game/GameLoop.ts` | Add `constructionManager` property; call `tick()` each frame |
| `src/rendering/ConstructionAnimator.ts` | Read phase from ConstructionManager for more granular visuals (e.g., partial material piles) |
| `src/ui/BuildingPlacement.ts` | After placing, terrain-check for digger requirement |
| `src/ui/InGameMenu.ts` | Add construction site status panel |
| `src/ui/HUD.ts` | Add per-building progress indicators |
| `src/ui/ObjectExplorer.ts` | Show construction phase + material status in building detail |

## 10. Success Criteria

- A newly placed building on uneven terrain first gets a digger, who paths to the tile and levels it
- Carriers autonomously deliver the correct number of planks and stone to the construction dropoff tile
- A builder (idle settler + hammer) paths to an adjacent tile and advances constructionProgress each tick
- The scaffolding mesh progresses through stages (poles → beams → walls → final model) as materials arrive and builder works
- Multiple concurrent construction sites work without interference
- Construction pauses gracefully when resources are unavailable and resumes when replenished
- ObjectExplorer and HUD show real-time construction phase and material status
- All existing 574+ unit tests remain green
- New unit tests cover: phase transitions, digger assignment, material tracking, builder assignment, edge cases

## 11. References

- **BASE.md**: Building costs (Planks + Stone per building); Settler → Builder requires Hammer, Settler → Digger requires Shovel
- **Economy.ts**: `buildCost()`, `buildTime()`, `tryPlaceBuilding()`, `tick()` — existing construction progress advancement
- **WorkerAI.ts**: `logisticsTick()` — carrier demand matching system to reuse for construction deliveries
- **Logistics.ts**: `ResourceDemand` interface, `registerDemand()`, `matchDemand()` — extend for construction-specific demands
- **ConstructionAnimator.ts**: 3-stage scaffolding visual system (poles → beams → walls → model swap)
- **InGameMenu.ts**: Building listing, statistics panel for extending with construction site info
- **TutorialManager.ts**: Step 2 requires construction speed multiplier hook