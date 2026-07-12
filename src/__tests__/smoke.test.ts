/**
 * Full-system smoke tests.
 * @jest-environment jsdom
 *
 * Verifies all major subsystems can be constructed without crashing.
 * Catches import regressions, TypeScript compilation errors, and
 * missing module exports before they hit CI.
 */

import { Map } from '../game/Map';
import { GameLoop } from '../game/GameLoop';
import { Terrain } from '../game/types';

describe('System smoke tests', () => {
  let gameMap: Map;
  let gameLoop: GameLoop;

  beforeEach(() => {
    gameMap = new Map(48, 48);
    gameLoop = new GameLoop(gameMap);
  });

  // ── Map ─────────────────────────────────────────────────────────

  it('Map: creates with correct dimensions', () => {
    expect(gameMap.width).toBe(48);
    expect(gameMap.height).toBe(48);
    expect(gameMap.tiles.length).toBe(48);
  });

  it('Map: all tiles initialized', () => {
    let nullCount = 0;
    for (let y = 0; y < gameMap.height; y++) {
      for (let x = 0; x < gameMap.width; x++) {
        const tile = gameMap.get(x, y);
        if (!tile) nullCount++;
      }
    }
    expect(nullCount).toBe(0);
  });

  it('Map: terrain types are valid strings', () => {
    const valid = ['Grass', 'Forest', 'Desert', 'Mountain', 'Snow', 'Water', 'DeepWater', 'Swamp'];
    for (let y = 0; y < gameMap.height; y++) {
      for (let x = 0; x < gameMap.width; x++) {
        const tile = gameMap.get(x, y)!;
        expect(valid).toContain(tile.terrain);
      }
    }
  });

  // ── GameLoop ─────────────────────────────────────────────────────

  it('GameLoop: initializes with unpaused state', () => {
    expect(gameLoop.state.isPaused).toBe(false);
  });

  it('GameLoop: update does not throw', () => {
    expect(() => gameLoop.update(1 / 60)).not.toThrow();
  });

  it('GameLoop: economy is accessible', () => {
    expect(gameLoop.economy).toBeDefined();
  });

  // ── Types ────────────────────────────────────────────────────────

  it('Types: Terrain enum has all 8 values', () => {
    const names = Object.values(Terrain).filter(v => typeof v === 'string');
    expect(names.length).toBe(8);
  });

  // ── ViewCuller ───────────────────────────────────────────────────

  it('ViewCuller: setCenter does not throw', () => {
    expect(() => gameLoop.viewCuller.setCenter(24, 24)).not.toThrow();
  });

  // ── Docs ─────────────────────────────────────────────────────────

  it('Documentation: Terrain enum is importable', () => {
    expect(typeof Terrain).toBe('object');
  });
});
