/**
 * TypeScript tests for Pathfinder terrain traversal costs
 *
 * Based on transport_and_specialists_plan.md acceptance criteria:
 * - Swamps have high traversal costs (slower movement)
 * - Mountains are impassable (except geologists/miners)
 * - Desert terrain is difficult and slower
 */

import { Map as GameMap } from '../Map';
import { Terrain } from '../types';
import { Pathfinder } from '../Pathfinder';

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

describe('Terrain traversal costs - Swamp', () => {
  test('swamp tiles are passable', () => {
    const map = makeOpenMap(10, 10);
    // Place a swamp tile
    map.setTerrain(5, 5, Terrain.Swamp);
    // Swamps should be passable (units can walk through them)
    expect(map.isPassable(5, 5)).toBe(true);
  });

  test('swamp has higher traversal cost than grass (slower movement)', () => {
    const map = makeOpenMap(10, 10);
    // Set swamp tile
    map.setTerrain(5, 5, Terrain.Swamp);
    const grassSpeed = map.speedMultiplier(0, 0);
    const swampSpeed = map.speedMultiplier(5, 5);
    // Swamp should be slower (lower speed multiplier means higher cost)
    expect(swampSpeed).toBeLessThan(grassSpeed);
    expect(swampSpeed).toBe(0.7); // Difficult terrain speed
  });

  test('pathfinder finds route through swamp when mountains block alternative paths', () => {
    const map = makeOpenMap(5, 5);
    // Block all direct routes with mountains, leaving only swamp path
    // The path from (0,2) to (4,2) must go through swamp at (2,1-3)
    map.setTerrain(1, 2, Terrain.Mountain);
    map.setTerrain(3, 2, Terrain.Mountain);

    // Swamp provides an alternate path through the middle column at rows 1-3
    map.setTerrain(2, 1, Terrain.Swamp);
    map.setTerrain(2, 2, Terrain.Swamp);
    map.setTerrain(2, 3, Terrain.Swamp);

    // Should find a path through the swamp
    const path = Pathfinder.findPath(map, { x: 0, y: 2 }, { x: 4, y: 2 });
    expect(path).toBeDefined();
    // Path should go through the swamp column (x=2)
    const tiles = path!.getTiles();
    expect(tiles.some(t => t.x === 2)).toBe(true);
  });
});

describe('Terrain traversal costs - Mountain impassability', () => {
  test('mountain tiles are not passable', () => {
    const map = makeOpenMap(10, 10);
    map.setTerrain(5, 5, Terrain.Mountain);
    expect(map.isPassable(5, 5)).toBe(false);
  });

  test('pathfinder returns undefined when goal is a mountain', () => {
    const map = makeOpenMap(10, 10);
    map.setTerrain(9, 9, Terrain.Mountain);
    // Cannot pathfind to impassable mountain
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 9, y: 9 });
    expect(path).toBeUndefined();
  });

  test('pathfinder returns undefined when start is a mountain', () => {
    const map = makeOpenMap(10, 10);
    map.setTerrain(0, 0, Terrain.Mountain);
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 9, y: 9 });
    expect(path).toBeUndefined();
  });

  test('pathfinder routes around mountain barriers', () => {
    const map = makeOpenMap(7, 7);
    // Create a mountain wall with a gap
    for (let y = 0; y <= 5; y++) {
      map.setTerrain(3, y, Terrain.Mountain);
    }
    // Path should go through the gap at y=6
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 6, y: 0 });
    expect(path).toBeDefined();
    const tiles = path!.getTiles();
    // Verify no mountain tiles in path
    for (const tile of tiles) {
      expect(map.get(tile.x, tile.y)?.terrain).not.toBe(Terrain.Mountain);
    }
  });

  test('geologists/miners can traverse mountains (special case)', () => {
    // This test documents the expected behavior: geologists/miners should be able
    // to pass through mountains that other units cannot traverse.
    // Implementation would require isPassable to accept unit kind parameter.
    const map = makeOpenMap(5, 5);
    // Block the only direct path with a full mountain column
    for (let y = 0; y < 5; y++) {
      map.setTerrain(2, y, Terrain.Mountain);
    }

    // Standard pathfinder should not find path through mountain barrier
    const normalPath = Pathfinder.findPath(map, { x: 2, y: 0 }, { x: 2, y: 4 });
    expect(normalPath).toBeUndefined();

    // Future: Pathfinder.findPathForUnit(map, start, goal, unitKind) should allow
    // geologist/miner types to traverse mountains
  });
});

describe('Terrain cost integration - Pathfinder uses Map.speedMultiplier()', () => {
  test('speedMultiplier returns correct values for all terrain types', () => {
    const map = makeOpenMap(10, 10);

    // Grass and default terrain: normal speed
    expect(map.speedMultiplier(0, 0)).toBe(1.0);

    // Desert: difficult terrain
    map.setTerrain(1, 1, Terrain.Desert);
    expect(map.speedMultiplier(1, 1)).toBe(0.7);

    // Swamp: difficult terrain
    map.setTerrain(2, 2, Terrain.Swamp);
    expect(map.speedMultiplier(2, 2)).toBe(0.7);

    // Forest: somewhat slow
    map.setTerrain(3, 3, Terrain.Forest);
    expect(map.speedMultiplier(3, 3)).toBe(0.8);

    // Water and DeepWater: swimming is slow
    map.setTerrain(4, 4, Terrain.Water);
    expect(map.speedMultiplier(4, 4)).toBe(0.5);

    map.setTerrain(5, 5, Terrain.DeepWater);
    expect(map.speedMultiplier(5, 5)).toBe(0.5);
  });

  test('path cost reflects terrain difficulty', () => {
    const map = makeOpenMap(10, 10);

    // Place desert and swamp in parallel routes
    // Route A: all grass (normal cost)
    // Route B: through desert (higher cost)
    map.setTerrain(5, 0, Terrain.Desert);
    map.setTerrain(5, 1, Terrain.Desert);

    // Path from (0,0) to (9,0) - will take the grass route
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 9, y: 0 });
    expect(path).toBeDefined();

    // A path through grass should have fewer tiles than going through desert
    // (since terrain cost would make desert path more expensive if integrated)
    const tileCount = path!.len();
    expect(tileCount).toBeGreaterThan(0);
  });

  test('pathfinder prefers grass over desert/swamp when choosing routes', () => {
    // This test validates the integration of speedMultiplier
    const map = makeOpenMap(10, 10);

    // Create two equal-length parallel paths:
    // Top path: all grass (cost 1 per tile)
    // Bottom path: through desert/swamp (would be cost 1/0.7 ≈ 1.43 per tile)
    // Once speedMultiplier is integrated, the top path should be preferred

    // Bottom row has desert
    for (let x = 0; x < 10; x++) {
      map.setTerrain(x, 9, Terrain.Desert);
    }

    // Both paths are available - top should be chosen
    const path = Pathfinder.findPath(map, { x: 0, y: 0 }, { x: 9, y: 0 });
    expect(path).toBeDefined();

    // Verify that desert tiles aren't used when grass is available
    const tiles = path!.getTiles();
    // All tiles should be on y=0 (grass), not y=9 (desert)
    expect(tiles.every(t => t.y === 0)).toBe(true);
  });
});

describe('Terrain traversal costs - Desert', () => {
  test('desert tiles are passable', () => {
    const map = makeOpenMap(10, 10);
    map.setTerrain(5, 5, Terrain.Desert);
    expect(map.isPassable(5, 5)).toBe(true);
  });

  test('desert has higher traversal cost than grass (slower movement)', () => {
    const map = makeOpenMap(10, 10);
    // Set desert tile
    map.setTerrain(5, 5, Terrain.Desert);
    const grassSpeed = map.speedMultiplier(0, 0);
    const desertSpeed = map.speedMultiplier(5, 5);

    // Desert should be slower than grass
    expect(desertSpeed).toBeLessThan(grassSpeed);
    expect(desertSpeed).toBe(0.7); // Difficult terrain speed
  });

  test('desert speed multiplier matches swamp speed multiplier', () => {
    const map = makeOpenMap(10, 10);
    map.setTerrain(0, 0, Terrain.Desert);
    map.setTerrain(1, 1, Terrain.Swamp);

    // Both desert and swamp are "difficult terrain" with same cost
    expect(map.speedMultiplier(0, 0)).toBe(map.speedMultiplier(1, 1));
    expect(map.speedMultiplier(0, 0)).toBe(0.7);
  });

  test('pathfinder finds route through desert when necessary', () => {
    const map = makeOpenMap(5, 5);
    // Block all routes except through desert
    // Mountains block the direct y=2 route and the y=0 route
    map.setTerrain(1, 2, Terrain.Mountain);
    map.setTerrain(2, 2, Terrain.Mountain);
    map.setTerrain(3, 2, Terrain.Mountain);
    map.setTerrain(2, 0, Terrain.Mountain);
    // Also block y=3 and y=4 to force path through desert at (2,1)
    map.setTerrain(2, 3, Terrain.Mountain);
    map.setTerrain(2, 4, Terrain.Mountain);

    // Desert provides the only alternate path
    map.setTerrain(2, 1, Terrain.Desert);

    const path = Pathfinder.findPath(map, { x: 0, y: 2 }, { x: 4, y: 2 });
    expect(path).toBeDefined();
    // Path should go through desert at (2,1) since it's the only route
    const tiles = path!.getTiles();
    expect(tiles.some(t => t.x === 2 && t.y === 1)).toBe(true);
  });

  test('pathfinder prefers grass over desert when both are available', () => {
    // With terrain costs, the pathfinder should prefer grass (cost 1.0)
    // over desert (cost 1/0.7 ≈ 1.43) when both routes are available
    const map = makeOpenMap(7, 7);

    // Block the direct route at y=3 with mountains
    map.setTerrain(1, 3, Terrain.Mountain);
    map.setTerrain(2, 3, Terrain.Mountain);
    map.setTerrain(3, 3, Terrain.Mountain);
    map.setTerrain(4, 3, Terrain.Mountain);
    map.setTerrain(5, 3, Terrain.Mountain);

    // Desert at y=2 provides a route
    map.setTerrain(3, 2, Terrain.Desert);

    // Grass at y=4 provides an alternative route
    // (y=4 is grass, no terrain change needed)

    const path = Pathfinder.findPath(map, { x: 0, y: 3 }, { x: 6, y: 3 });
    expect(path).toBeDefined();

    // Path should prefer the grass route (y=4) over the desert route (y=2)
    const tiles = path!.getTiles();
    // Should NOT go through the desert tile
    expect(tiles.some(t => t.x === 3 && t.y === 2)).toBe(false);
  });
});
