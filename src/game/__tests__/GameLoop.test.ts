/**
 * S4WN Babylon.js/TypeScript - GameLoop Tick Subscriber Tests
 * @jest-environment jsdom
 *
 * Tests for the GameLoop tick-callback system that powers live-updating
 * UI panels like the ObjectExplorer.
 */

// Minimal mock chain for GameLoop dependencies
jest.mock('../../game/Economy', () => ({
  Economy: jest.fn(() => ({
    tick: jest.fn(),
    getCompleteBuildings: jest.fn(() => []),
    tryPlaceBuilding: jest.fn(() => true),
  })),
}));

jest.mock('../../game/UnitManager', () => ({
  UnitManager: jest.fn(() => ({
    tick: jest.fn(),
    tickCulled: jest.fn(),
    getAliveUnits: jest.fn(() => []),
  })),
}));

jest.mock('../../game/Nation', () => ({
  Nation: jest.fn(() => ({})),
}));

jest.mock('../../game/WorkerAI', () => ({
  WorkerAI: jest.fn(() => ({
    tick: jest.fn(),
  })),
}));

jest.mock('../../game/CombatAI', () => ({
  CombatAI: jest.fn(() => ({
    tick: jest.fn(),
  })),
}));

jest.mock('../../game/TerritoryManager', () => ({
  TerritoryManager: jest.fn(() => ({
    updateTerritory: jest.fn(),
  })),
}));

jest.mock('../../core/SaveManager', () => ({
  SaveManager: {
    hasSave: jest.fn(() => false),
    save: jest.fn(() => true),
    load: jest.fn(() => null),
  },
}));

jest.mock('../../core/ViewCuller', () => ({
  ViewCuller: jest.fn(() => ({
    setCenter: jest.fn(),
    isFullTick: jest.fn(() => true),
    isWithinView: jest.fn(() => true),
  })),
}));

import { GameLoop } from '../GameLoop';
import { Map as GameMap } from '../Map';

// Minimal Map mock
jest.mock('../../game/Map', () => ({
  Map: jest.fn(() => ({
    width: 100,
    height: 100,
    tiles: [],
    computeVisibility: jest.fn(),
    setAllVisible: jest.fn(),
  })),
}));

describe('GameLoop Tick Subscribers', () => {
  let gameLoop: GameLoop;

  beforeEach(() => {
    const map = new GameMap(100, 100);
    gameLoop = new GameLoop(map);
    // Start unpaused so tick() runs
    gameLoop.state.isPaused = false;
  });

  it('onTick registers a callback', () => {
    const fn = jest.fn();
    gameLoop.onTick(fn);
    // Force a direct tick call
    (gameLoop as any).tick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(gameLoop);
  });

  it('onTick supports multiple subscribers', () => {
    const fn1 = jest.fn();
    const fn2 = jest.fn();
    const fn3 = jest.fn();

    gameLoop.onTick(fn1);
    gameLoop.onTick(fn2);
    gameLoop.onTick(fn3);

    (gameLoop as any).tick();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn3).toHaveBeenCalledTimes(1);
  });

  it('tick callbacks fire every tick', () => {
    const fn = jest.fn();
    gameLoop.onTick(fn);

    (gameLoop as any).tick();
    (gameLoop as any).tick();
    (gameLoop as any).tick();

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('update() method pauses do not fire ticks', () => {
    const fn = jest.fn();
    gameLoop.onTick(fn);

    gameLoop.state.isPaused = true;
    gameLoop.update(0.2); // 200ms — should not accumulate enough for a tick
    expect(fn).toHaveBeenCalledTimes(0);
  });
});
