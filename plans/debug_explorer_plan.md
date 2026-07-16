# Implementation Plan: Error Handling, Debugging, and Object Explorer

## 1. Error Handling Architecture

### Overview
Robust error handling is critical for ensuring the game doesn't fail silently and provides actionable feedback to both the user and developers.

### Implementation Steps
1. **Global Error Boundary**: Implement a global error handler for uncaught exceptions and unhandled promise rejections (already partially in `src/core/ErrorHandler.ts`).
2. **Contextual Logging**: Enhance `src/core/Logger.ts` to include contextual data (subsystem, timestamp, stack trace).
3. **UI Error Overlay**: Create a non-intrusive in-game error overlay that presents critical errors to the user gracefully, offering a "Reload" or "Return to Menu" option.
4. **Assert Module**: Create an assertion module for logic validation in debug builds to fail fast on invalid state.
5. **Analytics/Telemetry stub**: Optional stub for sending crash reports to a server in the future.

---

## 2. Debugging Options (UI and Logic)

### Overview
Developers need powerful tools to introspect game state, performance, and logic in real-time.

### Implementation Steps
1. **Console Debug API**: Expose a global `window.S4` object containing references to the active `GameApp`, `GameLoop`, `UIManager`, and `Map`.
2. **Enhanced Debug Panel (`src/ui/DebugPanel.ts`)**:
   - Add real-time tracking of memory usage and object counts.
   - Add toggles for visual debugging (bounding boxes, raycast visualization).
   - Add time controls (pause, step frame, set game speed 0.1x to 10x).
3. **Babylon.js Inspector Integration**: Ensure the Inspector can be toggled on/off seamlessly via the UI and syncs with the current scene.
4. **Logic Introspection**: Create a state dump mechanism that outputs the current serialized game state to the console or a file for analysis.

---

## 3. Grade A Object Explorer: Acceptance Criteria

### Overview
The Object Explorer is the definitive tool for viewing, debugging, generating, and structuring all gaming assets (terrain, buildings, units, resources, etc.).

### Acceptance Criteria

**1. Viewing & Inspection**
- [ ] Users can browse all in-game assets categorized by type (Terrain, Buildings, Units, Resources, Decorations).
- [ ] Selecting an asset displays its 3D model in an interactive viewport (rotate, zoom, pan).
- [ ] The inspector displays all metadata associated with the asset (cost, stats, dependencies, description) fetching directly from `BASE.md` structures.

**2. Live Debugging**
- [ ] When connected to a live game, the explorer can query and list all spawned instances of a specific asset type.
- [ ] Selecting a live instance highlights it in the main game view and tracks its current state (HP, current action, inventory, pathfinding goal).

**3. Generation & Recreation**
- [ ] The explorer provides a UI to hot-reload asset definitions and textures from disk without restarting the game.
- [ ] Includes controls to manually spawn an entity at a specific tile coordinate or cursor location for testing.
- [ ] Includes "Recreate" functionality that destroys and respawns a selected entity while preserving its logical state.

**4. Asset Structuring**
- [ ] Displays the asset hierarchy and dependency graph (e.g., "Sword requires Iron and Coal, produced by Weaponsmith").
- [ ] Validates assets on load, flagging missing textures, models, or invalid configurations with clear visual warnings.
- [ ] Exports current asset lists and modified configurations to JSON.
