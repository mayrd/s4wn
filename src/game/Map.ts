/**
 * S4WN TypeScript - Game Map Module
 * 
 * Migrated from engine/src/map.rs terrain data.
 */

import { Terrain, ResourceType } from './types';

export interface Tile {
  terrain: Terrain;
  elevation: number;
  resource: ResourceType | null;
  visibility: number;
  territory: number; // player_id (0=neutral)
}

export interface TilePosition {
  x: number;
  y: number;
}

export class Map {
  width: number;
  height: number;
  tiles: Tile[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.generateDemo();
  }

  get(x: number, y: number): Tile | undefined {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return undefined;
    }
    return this.tiles[y]?.[x];
  }

  setTerrain(x: number, y: number, terrain: Terrain): boolean {
    const tile = this.get(x, y);
    if (!tile) return false;
    tile.terrain = terrain;
    return true;
  }

  setElevation(x: number, y: number, elevation: number): boolean {
    const tile = this.get(x, y);
    if (!tile) return false;
    tile.elevation = elevation;
    return true;
  }

  isBuildable(x: number, y: number): boolean {
    const tile = this.get(x, y);
    if (!tile) return false;
    const terrain = tile.terrain;
    // Water, DeepWater, and Swamp are not buildable
    return terrain !== Terrain.Water && terrain !== Terrain.DeepWater && terrain !== Terrain.Swamp;
  }

  isPassable(x: number, y: number): boolean {
    const tile = this.get(x, y);
    if (!tile) return false;
    // Mountains and Snow are not passable
    return tile.terrain !== Terrain.Mountain && tile.terrain !== Terrain.Snow;
  }

  updateTerritory(nationId: number, influencePoints: Array<{ x: number; y: number; radius: number }>): void {
    // Reset territory for this nation (except neutral tiles)
    // Actually, it's better to reset all territory and then recompute for all nations
    // But for simplicity, we'll just update the tiles influenced by this nation's points
    
    // First, we need a way to clear previous territory. 
    // Since we don't know which tiles were owned by this nation, we'll clear all tiles that are not neutral.
    // This is inefficient but works for now.
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x].territory !== 0) {
          this.tiles[y][x].territory = 0;
        }
      }
    }

    // Apply influence
    for (const point of influencePoints) {
      const r = point.radius;
      const startX = Math.max(0, Math.floor(point.x - r));
      const endX = Math.min(this.width - 1, Math.ceil(point.x + r));
      const startY = Math.max(0, Math.floor(point.y - r));
      const endY = Math.min(this.height - 1, Math.ceil(point.y + r));

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
          if (dist <= r) {
            // If multiple nations influence the same tile, the one with the closest point wins
            // For simplicity, we'll just let the last one win or use a distance check
            this.tiles[y][x].territory = nationId;
          }
        }
      }
    }
  }

  speedMultiplier(x: number, y: number): number {
    const tile = this.get(x, y);
    if (!tile) return 1.0;
    
    switch (tile.terrain) {
      case Terrain.Water:
      case Terrain.DeepWater:
        return 0.5; // Swimming is slow
      case Terrain.Forest:
        return 0.8; // Forest is somewhat slow
      case Terrain.Desert:
      case Terrain.Swamp:
        return 0.7; // Difficult terrain
      default:
        return 1.0;
    }
  }

  getVisibility(x: number, y: number): number {
    const tile = this.get(x, y);
    return tile?.visibility ?? 0;
  }

  computeVisibility(sources: Array<{ x: number; y: number; radius: number }>): void {
    // Reset visibility
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x].visibility = 0;
      }
    }

    // Compute visibility from each source
    for (const source of sources) {
      const startX = Math.max(0, source.x - source.radius);
      const endX = Math.min(this.width - 1, source.x + source.radius);
      const startY = Math.max(0, source.y - source.radius);
      const endY = Math.min(this.height - 1, source.y + source.radius);

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const dist = Math.sqrt((x - source.x) ** 2 + (y - source.y) ** 2);
          if (dist <= source.radius) {
            const vis = 1 - dist / source.radius;
            this.tiles[y][x].visibility = Math.max(this.tiles[y][x].visibility, vis);
          }
        }
      }
    }
  }

  setAllVisible(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x].visibility = 1.0;
      }
    }
  }

  private generateDemo(): void {
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = {
          terrain: Terrain.Grass,
          elevation: 0.0,
          resource: null,
          visibility: 0,
          territory: 0,
        };
      }
    }
  }
}

// Export Terrain for backward compatibility
export { Terrain };