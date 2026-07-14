# Implementation Plan

[Overview]
Implement an interactive tutorial system that guides first-time players through core gameplay mechanics like camera controls, economy, expansion, and combat.
This involves establishing UI control hooks to lock, unlock, and highlight specific menus, alongside a new state-driven `TutorialManager` engine. The tutorial will run a specific chronological sequence of events as defined in the scenario config, culminating in a combat victory condition and returning the player to the main menu.

[Types]  
Add interfaces for the tutorial step definitions.
```typescript
export interface TutorialStep {
  id: string;
  narrative: string;
  onStart: (app: GameApp, ui: UIManager) => void;
  isComplete: (app: GameApp) => boolean;
}
```

[Files]
Add new files and modify existing core components to support tutorial capabilities.

- New file `src/game/TutorialManager.ts` to manage the tutorial engine and define the 7-step sequence.
- New file `src/ui/TutorialDialog.ts` to display the narrative prompt overlay.
- Modify `src/ui/HUD.ts` to expose methods for locking menus and highlighting action buttons.
- Modify `src/ui/BuildingPlacement.ts` to accept restrictions on which building tabs and buttons are enabled.
- Modify `src/GameApp.ts` to instantiate and step the `TutorialManager` on each tick if the game is launched in `tutorial` mode.
- Modify `src/game/Map.ts` to ensure the tutorial map spawns the required enemy outpost and lone guard in the far upper corner.
- Modify `src/ui/UIManager.ts` to route completion of the tutorial back to the main menu and mark it as finished.

[Functions]
Add methods to interface with the tutorial logic.

- New functions in `HUD` and `BuildingPlacement`: `lockAllMenus()`, `unlockSpecificMenu(menuId)`, `highlightButton(buttonId)`
- New functions in `TutorialManager`: `start()`, `update()`, `nextStep()`, `complete()`
- Modified function in `GameApp`: `initLoop()` to call `tutorialManager.update()` each tick if present.
- Modified function in `Map`: `generateTutorial()` to ensure proper entity setup.

[Classes]
Implement the engine and its UI overlay.

- New class `TutorialManager` (in `src/game/TutorialManager.ts`): Holds the current active step index, executes the step's `onStart` hooks, and continually evaluates `isComplete()` during the game tick.
- New class `TutorialDialog` (in `src/ui/TutorialDialog.ts`): Provides a clean overlay dialog (`showTutorialDialog(text)`) for the narrative.

[Dependencies]
No new npm dependencies are required. The system will rely purely on existing DOM manipulation and Babylon.js.

[Implementation Order]
The development phases needed to fulfill the request.

1. Implement `TutorialDialog` and the UI restriction hooks in `HUD` and `BuildingPlacement`.
2. Build the `TutorialManager` state engine and wire it into the `GameLoop` tick execution inside `GameApp`.
3. Configure the 7 specific tutorial steps (Camera, Wood, Food, Expansion, Mining, Military, Combat) as defined in BASE.md.
4. Enhance `Map.ts` to spawn the required enemy castle and guard at the corner of the map.
5. Implement the victory flow and return routing to the main menu.
