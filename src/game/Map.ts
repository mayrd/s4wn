/**
 * S4WN TypeScript - Game Map Module
 *
 * Migrated from engine/src/map.rs terrain data.
 */

import { Terrain, ResourceType } from './types';

export type MapKind = 'demo' | 'tutorial';

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
  kind: MapKind;

  constructor(width: number, height: number, kind: MapKind = 'demo') {
    this.width = width;
    this.height = height;
    this.kind = kind;
    this.tiles = [];
    if (kind === 'tutorial') {
      this.generateTutorial();
    } else {
      this.generateDemo();
    }
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

  /* ── Map Generators ──────────────────────────────────────────── */

  private makeTile(terrain: Terrain, elevation: number): Tile {
    return { terrain, elevation, resource: null, visibility: 0, territory: 0 };
  }

  /**
   * Default map: a continent surrounded by an ocean border, with a small
   * central lake, mountains, forests and a few hills for relief.
   */
  private generateDemo(): void {
    const seed = 42; // Deterministic
    const W = this.width;
    const H = this.height;

    for (let y = 0; y < H; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < W; x++) {
        const cx = W / 2;
        const cy = H / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const edgeDist = Math.min(x, y, W - 1 - x, H - 1 - y);

        const noise1 = Math.sin(x * 0.3 + seed) * Math.cos(y * 0.3 + seed + 1);
        const noise2 = Math.sin(x * 0.15 - y * 0.15) * Math.cos(x * 0.1 + y * 0.2);
        const noiseVal = (noise1 + noise2) * 0.5; // ~[-1, 1]

        let terrain: Terrain;
        let elevation = 0;

        // Ocean border (island feeling): deep water at the very edge, then
        // shallower water just inside it. Only applied to maps large enough
        // to leave a buildable interior (keeps small test maps fully land).
        const hasOcean = W >= 16 && H >= 16;
        if (hasOcean && edgeDist < 2) {
          terrain = Terrain.DeepWater;
          elevation = -2;
        } else if (hasOcean && edgeDist < 4) {
          terrain = Terrain.Water;
          elevation = -1;
        }
        // Central lake
        else if (dist < 3) {
          terrain = Terrain.Water;
          elevation = -1;
        }
        // Rings radiating from the centre
        else if (dist < 8) {
          terrain = noiseVal > 0.3 ? Terrain.Forest : Terrain.Grass;
        } else if (dist < 14) {
          if (noiseVal > 0.5) terrain = Terrain.Desert;
          else if (noiseVal < -0.5) {
            terrain = Terrain.Forest;
            elevation = 1;
          } else terrain = Terrain.Grass;
        } else if (dist < 20) {
          if (noiseVal > 0.6) {
            terrain = Terrain.Mountain;
            elevation = 3;
          } else if (noiseVal > 0.2) {
            terrain = Terrain.Grass;
            if (noiseVal > 0.4) elevation = 1;
          } else {
            terrain = Terrain.Forest;
          }
        } else if (dist < 24) {
          if (noiseVal > 0.7) {
            terrain = Terrain.Snow;
            elevation = 4;
          } else if (noiseVal > 0.3) {
            terrain = Terrain.Mountain;
            elevation = 3;
          } else {
            terrain = Terrain.Forest;
          }
        } else {
          terrain = noiseVal > 0.1 ? Terrain.Snow : Terrain.Mountain;
          elevation = terrain === Terrain.Snow ? 4 : 3;
        }

        this.tiles[y][x] = this.makeTile(terrain, elevation);
      }
    }
  }

  /**
   * Tutorial map: a friendly single island surrounded by ocean, with gentle
   * rolling hills, a couple of forests, a small lake and a clear buildable
   * plateau in the centre. Designed to teach the basics, not to be hostile.
   */
  private generateTutorial(): void {
    const seed = 7; // Deterministic, different layout from demo
    const W = this.width;
    const H = this.height;
    const cx = W / 2;
    const cy = H / 2;

    for (let y = 0; y < H; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < W; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const edgeDist = Math.min(x, y, W - 1 - x, H - 1 - y);

        const noise1 = Math.sin(x * 0.27 + seed) * Math.cos(y * 0.27 + seed + 1);
        const noise2 = Math.sin(x * 0.13 - y * 0.11) * Math.cos(x * 0.09 + y * 0.17);
        const noiseVal = (noise1 + noise2) * 0.5; // ~[-1, 1]

        let terrain: Terrain;
        let elevation = 0;

        // Ocean border all around — the island sits in open sea.
        // Only on maps large enough to keep a buildable interior.
        const hasOcean = W >= 16 && H >= 16;
        if (hasOcean && edgeDist < 2) {
          terrain = Terrain.DeepWater;
          elevation = -2;
        } else if (hasOcean && edgeDist < 4) {
          terrain = Terrain.Water;
          elevation = -1;
        }
        // Small central lake (avoids the very centre so HQ has room)
        else if ((dx * dx) / 100 + (dy * dy) / 60 > 1 && dist < 10 && noiseVal > 0.2) {
          terrain = Terrain.Water;
          elevation = -1;
        }
        // Buildable heartland with gentle hills
        else if (dist < 18) {
          if (noiseVal > 0.45) {
            terrain = Terrain.Forest;
          } else if (noiseVal < -0.45) {
            // Rolling hill
            terrain = Terrain.Grass;
            elevation = 1 + Math.floor((Math.abs(noiseVal) - 0.45) * 6); // 1..3
          } else {
            terrain = Terrain.Grass;
          }
        }
        // Outer island rim: a few hills + forest, still land
        else if (dist < 30) {
          if (noiseVal > 0.55) {
            terrain = Terrain.Forest;
            elevation = 1;
          } else if (noiseVal < -0.5) {
            terrain = Terrain.Grass;
            elevation = 2;
          } else {
            terrain = Terrain.Grass;
          }
        }
        // Everything that somehow remains becomes shoreline grass
        else {
          terrain = Terrain.Grass;
        }

        this.tiles[y][x] = this.makeTile(terrain, elevation);
      }
    }
  }

  /* ── Save / Load ─────────────────────────────────────────── */

  toJSON(): object {
    return {
      width: this.width,
      height: this.height,
      kind: this.kind,
      tiles: this.tiles.map(row => row.map(t => ({
        terrain: t.terrain,
        elevation: t.elevation,
        resource: t.resource,
        visibility: t.visibility,
        territory: t.territory,
      }))),
    };
  }

  static fromJSON(data: any): Map {
    const kind: MapKind = data.kind === 'tutorial' ? 'tutorial' : 'demo';
    const m = new Map(data.width, data.height, kind);
    // Overwrite generated tiles with saved data
    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        if (data.tiles[y]?.[x]) {
          const t = data.tiles[y][x];
          m.tiles[y][x] = {
            terrain: t.terrain,
            elevation: t.elevation,
            resource: t.resource ?? null,
            visibility: t.visibility ?? 0,
            territory: t.territory ?? 0,
          };
        }
      }
    }
    return m;
  }
}

// Export Terrain for backward compatibility
export { Terrain };