/**
 * TypeScript tests for Pathfinder module (A* algorithm)
 */

import { Map as GameMap } from '../Map';
import { Terrain } from '../types';
import { Pathfinder, Path } from '../Pathfinder';

/** Build a deterministic, fully-grass (passable) map of given size. */
function makeOpenMap(w: number, h: number): GameMap {
  const map = new GameMap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map.setTerrain(x, y, Terrain.Grass);
    }
  }
  return map;
}

describe('Path', () => {
  test('len/isEmpty/getTiles reflect tile list', () => {
    const path = Path.new([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(path.len()).toBe(2);
    expect(path.isEmpty()).toBe(false);
    expect(path.getTiles()).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
  });

  test('empty path reports isEmpty true and len 0', () => {
    const path = Path.new([]);
    expect(path.isEmpty()).toBe(true);
    expect(path.len()).toBe(0);
  });

  test('start/goal return first/last tile', () => {
    const path = Path.new([{ x: 0, y: 0 }, { x: 2, y: 3 }, { x: 5, y: 5 }]);
    expect(path.start()).toEqual({ x: 0, y: 0 });
    expect(path.goal()).toEqual({ x: 5, y: 5 });
  });

  test('start/goal on empty path are undefined', () => {
    const path = Path.new([]);
    expect(path.start()).toBeUndefined();
    expect(path.goal()).toBeUndefined();
  });

  test('getTiles returns a defensive copy', () => {
    const tiles = [{ x: 0, y: 0 }];
    const path = Path.new(tiles);
    const gotten = path.getTiles();
    gotten.push({ x: 9, y: 9 });
    expect(path.len()).toBe(1);
  });

  test('withCost ignores cost param and behaves like new', () => {
    const path = Path.withCost([{ x: 1, y: 1 }], 42);
    expect(path.len()).toBe(1);
    expect(path.start()).toEqual({ x: 1, y: 1 });
  });
});

describe('Pathfinder.findPath', () => {
  test('finds a path on a fully open map', () => {
    const map = makeOpenMap(10, 10);
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path).toBeDefined();
    expect(path!.start()).toEqual({ x: 0, y: 0 });
    expect(path!.goal()).toEqual({ x: 5, y: 5 });
    // Diagonal move is allowed (8-directional), so length should be close to
    // the Chebyshev distance + 1 (start included).
    expect(path!.len()).toBeLessThanOrEqual(6);
  });

  test('returns single-tile path when start === goal', () => {
    const map = makeOpenMap(5, 5);
    const path = Pathfinder.findPath(map, { x: 2, y: 2 }, { x: 2, y: 2 });
    expect(path).toBeDefined();
    expect(path!.len()).toBe(1);
    expect(path!.getTiles()).toEqual([{ x: 2, y: 2 }]);
  });

  test('returns undefined when start tile is impassable', () => {
    const map = makeOpenMap(5, 5);
    map.setTerrain(0, 0, Terrain.Mountain);
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(path).toBeUndefined();
  });

  test('returns undefined when goal tile is impassable', () => {
    const map = makeOpenMap(5, 5);
    map.setTerrain(4, 4, Terrain.Snow);
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(path).toBeUndefined();
  });

  test('routes around a wall of mountains', () => {
    const map = makeOpenMap(7, 7);
    // Build a vertical wall at x=3 from y=0..5, leaving a gap at y=6
    for (let y = 0; y <= 5; y++) {
      map.setTerrain(3, y, Terrain.Mountain);
    }
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 6, y: 0 });
    expect(path).toBeDefined();
    // Path must not pass through the wall tiles it can't cross
    for (const tile of path!.getTiles()) {
      if (tile.x === 3) {
        expect(tile.y).toBe(6);
      }
    }
    // Should end at the goal
    expect(path!.goal()).toEqual({ x: 6, y: 0 });
  });

  test('returns undefined when goal is completely unreachable', () => {
    const map = makeOpenMap(6, 6);
    // (5,5) is the bottom-right corner tile; its only in-bounds neighbors
    // are (4,4), (4,5) and (5,4). Blocking all three fully encloses it.
    map.setTerrain(4, 4, Terrain.Mountain);
    map.setTerrain(4, 5, Terrain.Mountain);
    map.setTerrain(5, 4, Terrain.Mountain);
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path).toBeUndefined();
  });
});
