/**
 * @jest-environment jsdom
 */

import { TutorialManager } from '../TutorialManager';
import { GameApp } from '../../GameApp';
import { UIManager } from '../../ui/UIManager';
import { TutorialDialog } from '../../ui/TutorialDialog';
import { Map as GameMap } from '../Map';
import { GameLoop } from '../GameLoop';
import { Economy } from '../Economy';
import { UnitManager } from '../UnitManager';
import { BuildingType, RESOURCE_COUNT } from '../../economy/types';
import { Unit } from '../Unit';
import { UnitKind } from '../types';

describe('TutorialManager', () => {
  let app: any;
  let ui: any;
  let dialog: any;
  let manager: TutorialManager;

  beforeEach(() => {
    app = {};
    ui = {};
    dialog = {
      show: jest.fn(),
      hide: jest.fn(),
    };
    manager = new TutorialManager(app as GameApp, ui as UIManager, dialog as TutorialDialog);
  });

  test('starts tutorial and executes first step', () => {
    const onStart = jest.fn();
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart, isComplete: () => false },
    ]);
    manager.start();
    expect(dialog.show).toHaveBeenCalledWith('Step 1');
    expect(onStart).toHaveBeenCalledWith(app, ui);
  });

  test('update progresses to next step when complete', () => {
    const onStart1 = jest.fn();
    const onStart2 = jest.fn();
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart: onStart1, isComplete: () => true },
      { id: '2', narrative: 'Step 2', onStart: onStart2, isComplete: () => false },
    ]);
    manager.start();
    manager.update(); // Step 1 is complete, should move to 2
    expect(dialog.show).toHaveBeenCalledWith('Step 2');
    expect(onStart2).toHaveBeenCalledWith(app, ui);
  });

  test('completes tutorial', () => {
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart: jest.fn(), isComplete: () => true },
    ]);
    manager.start();
    manager.update(); // Step 1 is complete, end of list
    expect(dialog.hide).toHaveBeenCalled();
  });

  test('emits tutorial-complete event on completion', () => {
    const handler = jest.fn();
    window.addEventListener('tutorial-complete', handler);
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart: jest.fn(), isComplete: () => true },
    ]);
    manager.start();
    manager.update();
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('tutorial-complete', handler);
  });

  test('emits tutorial-progress event on start and step advance', () => {
    const handler = jest.fn();
    window.addEventListener('tutorial-progress', handler);
    manager.setSteps([
      { id: '1', narrative: 'Step 1', onStart: jest.fn(), isComplete: () => true },
      { id: '2', narrative: 'Step 2', onStart: jest.fn(), isComplete: () => false },
    ]);
    manager.start();
    expect(handler).toHaveBeenCalledTimes(1);
    manager.update(); // advance to step 2
    expect(handler).toHaveBeenCalledTimes(2);
    window.removeEventListener('tutorial-progress', handler);
  });

  test('active getter reflects running state', () => {
    expect(manager.active).toBe(false);
    manager.setSteps([{ id: '1', narrative: 's', onStart: jest.fn(), isComplete: () => false }]);
    manager.start();
    expect(manager.active).toBe(true);
  });

  test('currentStepId returns active step id', () => {
    manager.setSteps([
      { id: 'camera', narrative: 's', onStart: jest.fn(), isComplete: () => false },
    ]);
    manager.start();
    expect(manager.currentStepId).toBe('camera');
  });

  test('totalSteps and currentStepNumber report correctly', () => {
    manager.setSteps([
      { id: 'a', narrative: 's', onStart: jest.fn(), isComplete: () => true },
      { id: 'b', narrative: 's', onStart: jest.fn(), isComplete: () => false },
    ]);
    manager.start();
    expect(manager.totalSteps).toBe(2);
    expect(manager.currentStepNumber).toBe(1);
    manager.update();
    expect(manager.currentStepNumber).toBe(2);
  });

  test('reset() restarts from first step', () => {
    const onStart = jest.fn();
    manager.setSteps([
      { id: 'a', narrative: 's', onStart, isComplete: () => true },
      { id: 'b', narrative: 's', onStart: jest.fn(), isComplete: () => false },
    ]);
    manager.start();
    manager.update(); // move to step b
    expect(manager.currentStepId).toBe('b');
    manager.reset();
    expect(manager.currentStepId).toBe('a');
    expect(onStart).toHaveBeenCalledTimes(2); // once on start, once on reset
  });

  test('skip() completes the tutorial', () => {
    const handler = jest.fn();
    window.addEventListener('tutorial-complete', handler);
    manager.setSteps([
      { id: 'a', narrative: 's', onStart: jest.fn(), isComplete: () => false },
    ]);
    manager.start();
    manager.skip();
    expect(manager.active).toBe(false);
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('tutorial-complete', handler);
  });

  test('update() is a no-op when not active', () => {
    // Should not throw when no steps set / not started
    expect(() => manager.update()).not.toThrow();
  });
});

describe('TutorialManager — 7-step game integration', () => {
  let map: GameMap;
  let gameLoop: GameLoop;
  let economy: Economy;
  let unitManager: UnitManager;
  let app: any;
  let ui: any;
  let dialog: any;
  let manager: TutorialManager;

  beforeEach(() => {
    map = new GameMap(100, 100, 'tutorial');
    gameLoop = new GameLoop(map);
    economy = gameLoop.economy;
    unitManager = gameLoop.unitManager;
    // Grant ample resources so all tutorial buildings can be placed.
    economy.resources = new Array(RESOURCE_COUNT).fill(1000);
    app = { gameLoop, scene: { activeCamera: { target: { x: 50, z: 50 } } } };
    ui = {};
    dialog = { show: jest.fn(), hide: jest.fn() };
    manager = new TutorialManager(app as GameApp, ui as UIManager, dialog as TutorialDialog);
  });

  function buildSteps() {
    return [
      {
        id: 'camera',
        narrative: 'camera',
        onStart: jest.fn(),
        isComplete: (a: any) => {
          const c = a.scene.activeCamera;
          return Math.abs(c.target.x - 50) > 2 || Math.abs(c.target.z - 50) > 2;
        },
      },
      {
        id: 'wood',
        narrative: 'wood',
        onStart: jest.fn(),
        isComplete: () =>
          economy.buildings.some(b => b.kind === BuildingType.Woodcutter) &&
          economy.buildings.some(b => b.kind === BuildingType.Forester) &&
          economy.buildings.some(b => b.kind === BuildingType.Sawmill),
      },
      {
        id: 'food',
        narrative: 'food',
        onStart: jest.fn(),
        isComplete: () => {
          const bakery = economy.buildings.find(b => b.kind === BuildingType.Bakery);
          return !!bakery && bakery.constructionProgress >= 1.0;
        },
      },
      {
        id: 'expansion',
        narrative: 'expansion',
        onStart: jest.fn(),
        isComplete: () => economy.buildings.some(b => b.kind === BuildingType.GuardTower),
      },
      {
        id: 'mining',
        narrative: 'mining',
        onStart: jest.fn(),
        isComplete: () =>
          (economy.buildings.some(b => b.kind === BuildingType.CoalMine) ||
            economy.buildings.some(b => b.kind === BuildingType.IronOreMine)) &&
          economy.buildings.some(b => b.kind === BuildingType.Smelter),
      },
      {
        id: 'military',
        narrative: 'military',
        onStart: jest.fn(),
        isComplete: () => economy.buildings.some(b => b.kind === BuildingType.Barracks),
      },
      {
        id: 'combat',
        narrative: 'combat',
        onStart: jest.fn(),
        isComplete: () => {
          // Mirror the real tutorial: the lone enemy guard must be defeated.
          const guard = unitManager.units.find(u => u.kind === UnitKind.Swordsman && u.ownerId === 2);
          return !guard || guard.hp <= 0;
        },
      },
    ];
  }

  test('full 7-step sequence can be driven to completion', () => {
    const steps = buildSteps();
    manager.setSteps(steps);
    manager.start();
    expect(manager.currentStepId).toBe('camera');

    // Step 1: camera — move camera
    app.scene.activeCamera.target = { x: 70, z: 70 };
    manager.update();
    expect(manager.currentStepId).toBe('wood');

    // Step 2: wood
    economy.tryPlaceBuilding(BuildingType.Woodcutter, 10, 10, map, 0);
    economy.tryPlaceBuilding(BuildingType.Forester, 12, 10, map, 0);
    economy.tryPlaceBuilding(BuildingType.Sawmill, 14, 10, map, 0);
    manager.update();
    expect(manager.currentStepId).toBe('food');

    // Step 3: food
    const bakery = economy.tryPlaceBuilding(BuildingType.Bakery, 16, 10, map, 0);
    if (bakery) bakery.constructionProgress = 1.0;
    manager.update();
    expect(manager.currentStepId).toBe('expansion');

    // Step 4: expansion
    economy.tryPlaceBuilding(BuildingType.GuardTower, 18, 10, map, 0);
    manager.update();
    expect(manager.currentStepId).toBe('mining');

    // Step 5: mining
    economy.tryPlaceBuilding(BuildingType.CoalMine, 20, 10, map, 0);
    economy.tryPlaceBuilding(BuildingType.Smelter, 22, 10, map, 0);
    manager.update();
    expect(manager.currentStepId).toBe('military');

    // Step 6: military
    economy.tryPlaceBuilding(BuildingType.Barracks, 24, 10, map, 0);
    manager.update();
    expect(manager.currentStepId).toBe('combat');

    // Step 7: combat — remove all units
    unitManager.units = [];
    manager.update();
    expect(manager.active).toBe(false);
  });

  test('combat step detects defeated guard', () => {
    const steps = buildSteps();
    manager.setSteps(steps);
    manager.start();

    // Drive through steps 1-6 by satisfying each completion condition.
    app.scene.activeCamera.target = { x: 70, z: 70 };
    manager.update(); // camera -> wood
    economy.tryPlaceBuilding(BuildingType.Woodcutter, 10, 10, map, 0);
    economy.tryPlaceBuilding(BuildingType.Forester, 12, 10, map, 0);
    economy.tryPlaceBuilding(BuildingType.Sawmill, 14, 10, map, 0);
    manager.update(); // wood -> food
    const bakery = economy.tryPlaceBuilding(BuildingType.Bakery, 16, 10, map, 0);
    if (bakery) bakery.constructionProgress = 1.0;
    manager.update(); // food -> expansion
    economy.tryPlaceBuilding(BuildingType.GuardTower, 18, 10, map, 0);
    manager.update(); // expansion -> mining
    economy.tryPlaceBuilding(BuildingType.CoalMine, 20, 10, map, 0);
    economy.tryPlaceBuilding(BuildingType.Smelter, 22, 10, map, 0);
    manager.update(); // mining -> military
    economy.tryPlaceBuilding(BuildingType.Barracks, 24, 10, map, 0);
    manager.update(); // military -> combat

    expect(manager.currentStepId).toBe('combat');

    // spawn an enemy guard (ownerId 2), then defeat it
    const guard = new Unit(unitManager.nextUnitId++, UnitKind.Swordsman, 95, 95);
    (guard as any).ownerId = 2;
    unitManager.units.push(guard);
    manager.update();
    expect(manager.currentStepId).toBe('combat'); // not yet defeated
    guard.hp = 0;
    manager.update();
    expect(manager.active).toBe(false);
  });
});

describe('Map.spawnTutorialEnemies', () => {
  test('spawns enemy castle, guard, and claims territory', () => {
    const map = new GameMap(100, 100, 'tutorial');
    const gameLoop = new GameLoop(map);
    const guardId = map.spawnTutorialEnemies(gameLoop.economy, gameLoop.unitManager);

    // Enemy castle placed at (95, 95)
    const castle = gameLoop.economy.buildings.find(b => b.kind === BuildingType.Castle && b.ownerId === 2);
    expect(castle).toBeDefined();
    expect(castle!.x).toBe(95);
    expect(castle!.y).toBe(95);
    expect(castle!.constructionProgress).toBe(1.0);
    expect(castle!.isActive).toBe(true);

    // Guard unit spawned
    expect(guardId).toBeGreaterThanOrEqual(0);
    const guard = gameLoop.unitManager.units.find(u => u.id === guardId);
    expect(guard).toBeDefined();
    expect(guard!.x).toBe(94);
    expect(guard!.y).toBe(94);

    // Territory claimed for nation 2 near the outpost
    expect(map.get(95, 95)!.territory).toBe(2);
  });

  test('does not throw on small maps', () => {
    const map = new GameMap(20, 20, 'tutorial');
    const gameLoop = new GameLoop(map);
    expect(() => map.spawnTutorialEnemies(gameLoop.economy, gameLoop.unitManager)).not.toThrow();
  });
});