/**
 * S4WN Babylon.js/TypeScript - Pathfinding Module
 *
 * Migrated from engine/src/pathfinding.rs
 * A* algorithm for unit movement with terrain traversal costs.
 */

import { Map as GameMap } from './Map';
import { UnitKind, Terrain } from './types';

export interface PathPoint {
  x: number;
  y: number;
}

export class Path {
  private tiles: PathPoint[];

  constructor(tiles: PathPoint[]) {
    this.tiles = tiles;
  }

  static new(tiles: PathPoint[]): Path {
    return new Path(tiles);
  }

  static withCost(tiles: PathPoint[], _cost: number): Path {
    return new Path(tiles);
  }

  getTiles(): PathPoint[] {
    return [...this.tiles];
  }

  isEmpty(): boolean {
    return this.tiles.length === 0;
  }

  len(): number {
    return this.tiles.length;
  }

  start(): PathPoint | undefined {
    return this.tiles[0];
  }

  goal(): PathPoint | undefined {
    return this.tiles[this.tiles.length - 1];
  }
}

type CameFromMap = Map<number, PathPoint>;

/**
 * Unit kinds that can traverse Mountain terrain (geologists, miners).
 * Other units treat mountains as impassable.
 */
const MOUNTAIN_TRAVERSABLE_UNITS = new Set<UnitKind>([
  UnitKind.Pioneer, // Pioneers can dig through terrain
]);

export class Pathfinder {
  /**
   * Find path using A* algorithm with terrain traversal costs.
   * Movement cost is derived from map.speedMultiplier() — difficult
   * terrain (swamp, desert, forest) costs more to traverse.
   */
  static findPath(map: GameMap, start: PathPoint, goal: PathPoint): Path | undefined {
    return Pathfinder.findPathForUnit(map, start, goal, null);
  }

  /**
   * Find path for a specific unit kind. Units that can traverse mountains
   * (geologists, miners) will path through mountain terrain.
   */
  static findPathForUnit(
    map: GameMap,
    start: PathPoint,
    goal: PathPoint,
    unitKind: UnitKind | null
  ): Path | undefined {
    // Check if start/goal are valid
    if (!Pathfinder.isPassableFor(map, start.x, start.y, unitKind) ||
        !Pathfinder.isPassableFor(map, goal.x, goal.y, unitKind)) {
      return undefined;
    }

    if (start.x === goal.x && start.y === goal.y) {
      return Path.new([start]);
    }

    const width = map.width;
    const height = map.height;
    const maxNodes = width * height;

    // A* data structures
    const openSet: number[] = [];
    const closedSet: boolean[] = new Array(maxNodes).fill(false);
    const cameFrom = new Map<number, PathPoint>() as CameFromMap;
    const gScore: number[] = new Array(maxNodes).fill(Infinity);
    const fScore: number[] = new Array(maxNodes).fill(Infinity);

    const startIdx = start.y * width + start.x;
    const goalIdx = goal.y * width + goal.x;

    gScore[startIdx] = 0;
    fScore[startIdx] = Pathfinder.heuristic(start, goal);

    openSet.push(startIdx);

    while (openSet.length > 0) {
      // Find node with lowest fScore in openSet
      let currentIdx = openSet[0];
      let lowestF = fScore[currentIdx];
      let lowestPos = 0;

      for (let i = 1; i < openSet.length; i++) {
        if (fScore[openSet[i]] < lowestF) {
          lowestF = fScore[openSet[i]];
          currentIdx = openSet[i];
          lowestPos = i;
        }
      }

      // Remove current from openSet
      openSet.splice(lowestPos, 1);

      if (currentIdx === goalIdx) {
        return Pathfinder.reconstructPath(cameFrom, width, {
          x: goal.x,
          y: goal.y,
        });
      }

      closedSet[currentIdx] = true;

      const currentY = Math.floor(currentIdx / width);
      const currentX = currentIdx % width;

      // Check neighbors (8-directional)
      for (const neighbor of Pathfinder.neighbors(currentX, currentY, width, height)) {
        const neighborIdx = neighbor.y * width + neighbor.x;

        if (closedSet[neighborIdx]) continue;
        if (!Pathfinder.isPassableFor(map, neighbor.x, neighbor.y, unitKind)) continue;

        // Terrain traversal cost: speedMultiplier gives 0.5-1.0 for difficult terrain.
        // Cost = 1 / speedMultiplier, so slower terrain costs more.
        const speedMult = map.speedMultiplier(neighbor.x, neighbor.y);
        const terrainCost = 1.0 / Math.max(speedMult, 0.1);

        // Diagonal moves cost slightly more (sqrt(2) factor)
        const dx = neighbor.x - currentX;
        const dy = neighbor.y - currentY;
        const moveCost = (dx !== 0 && dy !== 0) ? Math.SQRT2 : 1.0;

        const tentativeG = gScore[currentIdx] + terrainCost * moveCost;

        const inOpenSet = openSet.includes(neighborIdx);
        if (!inOpenSet || tentativeG < gScore[neighborIdx]) {
          cameFrom.set(neighborIdx, { x: currentX, y: currentY });
          gScore[neighborIdx] = tentativeG;
          fScore[neighborIdx] = gScore[neighborIdx] + Pathfinder.heuristic(neighbor, goal);

          if (!inOpenSet) {
            openSet.push(neighborIdx);
          }
        }
      }
    }

    return undefined; // No path found
  }

  /**
   * Check if a tile is passable for a given unit kind.
   * Geologists/miners can traverse mountains; other units cannot.
   */
  static isPassableFor(map: GameMap, x: number, y: number, unitKind: UnitKind | null): boolean {
    const tile = map.get(x, y);
    if (!tile) return false;

    // Mountains are impassable for most units, but traversable for specialists
    if (tile.terrain === Terrain.Mountain) {
      if (unitKind === null) return false;
      return MOUNTAIN_TRAVERSABLE_UNITS.has(unitKind);
    }

    // Snow is impassable for standard units
    if (tile.terrain === Terrain.Snow) {
      if (unitKind === null) return false;
      return MOUNTAIN_TRAVERSABLE_UNITS.has(unitKind);
    }

    // Water and DeepWater are impassable for ground units
    return tile.terrain !== Terrain.Water && tile.terrain !== Terrain.DeepWater;
  }

  /**
   * Check if a tile is passable for standard units (backward-compatible).
   */
  static isPassable(map: GameMap, x: number, y: number): boolean {
    return Pathfinder.isPassableFor(map, x, y, null);
  }

  private static heuristic(a: PathPoint, b: PathPoint): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private static neighbors(x: number, y: number, w: number, h: number): PathPoint[] {
    const result: PathPoint[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          result.push({ x: nx, y: ny });
        }
      }
    }
    return result;
  }

  private static reconstructPath(
    cameFrom: CameFromMap,
    width: number,
    current: PathPoint
  ): Path {
    const path: PathPoint[] = [current];
    let currentIdx = current.y * width + current.x;

    while (cameFrom.has(currentIdx)) {
      const prev = cameFrom.get(currentIdx)!;
      path.unshift(prev);
      currentIdx = prev.y * width + prev.x;
    }

    return Path.new(path);
  }
}
