/**
 * S4WN Babylon.js/TypeScript - Game Setup Module
 *
 * Encapsulates player configuration and multi-player map initialization.
 * Provides player slots with nation, starting area, and territory assignments.
 */

import { NationType, getNationName, NATION_INFO } from './Nation';
import { Map as GameMap } from './Map';
import { Terrain } from './types';

/** A single player slot — nation, home base position, and metadata. */
export interface PlayerSlot {
  playerId: number;
  nationType: NationType;
  startX: number;
  startY: number;
  color: string;
}

/** Full game setup: map kind plus 1–4 player slots. */
export interface GameConfig {
  mapWidth: number;
  mapHeight: number;
  mapKind: 'demo' | 'tutorial';
  players: PlayerSlot[];
}

/**
 * Generates player configurations and initializes starting areas on the map.
 * Builds on BASE.md data for nation-specific buildings, resources, and settlers.
 */
export class GameSetup {
  /** Default single-player setup: Romans at map centre. */
  static createSinglePlayer(mapWidth: number, mapHeight: number): GameConfig {
    return {
      mapWidth,
      mapHeight,
      mapKind: 'demo',
      players: [
        {
          playerId: 0,
          nationType: NationType.Romans,
          startX: Math.floor(mapWidth / 2),
          startY: Math.floor(mapHeight / 2),
          color: NATION_INFO[NationType.Romans].color,
        },
      ],
    };
  }

  /** Two-player setup: Romans (south-west) vs Vikings (north-east). */
  static createTwoPlayer(mapWidth: number, mapHeight: number): GameConfig {
    return {
      mapWidth,
      mapHeight,
      mapKind: 'demo',
      players: [
        {
          playerId: 0,
          nationType: NationType.Romans,
          startX: Math.floor(mapWidth * 0.25),
          startY: Math.floor(mapHeight * 0.75),
          color: NATION_INFO[NationType.Romans].color,
        },
        {
          playerId: 1,
          nationType: NationType.Vikings,
          startX: Math.floor(mapWidth * 0.75),
          startY: Math.floor(mapHeight * 0.25),
          color: NATION_INFO[NationType.Vikings].color,
        },
      ],
    };
  }

  /** Three-player setup: 3 nations in triangle formation. */
  static createThreePlayer(mapWidth: number, mapHeight: number): GameConfig {
    const cx = mapWidth / 2;
    const cy = mapHeight / 2;
    const r = Math.min(mapWidth, mapHeight) * 0.35;
    return {
      mapWidth,
      mapHeight,
      mapKind: 'demo',
      players: [
        {
          playerId: 0,
          nationType: NationType.Romans,
          startX: Math.floor(cx + r * Math.cos(Math.PI * 0.5)),
          startY: Math.floor(cy + r * Math.sin(Math.PI * 0.5)),
          color: NATION_INFO[NationType.Romans].color,
        },
        {
          playerId: 1,
          nationType: NationType.Vikings,
          startX: Math.floor(cx + r * Math.cos(Math.PI * 0.5 + (2 * Math.PI) / 3)),
          startY: Math.floor(cy + r * Math.sin(Math.PI * 0.5 + (2 * Math.PI) / 3)),
          color: NATION_INFO[NationType.Vikings].color,
        },
        {
          playerId: 2,
          nationType: NationType.Mayans,
          startX: Math.floor(cx + r * Math.cos(Math.PI * 0.5 + (4 * Math.PI) / 3)),
          startY: Math.floor(cy + r * Math.sin(Math.PI * 0.5 + (4 * Math.PI) / 3)),
          color: NATION_INFO[NationType.Mayans].color,
        },
      ],
    };
  }

  /**
   * Carve a buildable starting area on the map for one player.
   * Converts a circular region around (cx, cy) to Grass (terrain), claims
   * all tiles in that radius for the player's territory, and flattens
   * elevation to 0 so buildings can be placed immediately.
   *
   * Returns the number of tiles modified.
   */
  static createStartingArea(map: GameMap, cx: number, cy: number, radius: number, playerId: number): number {
    let count = 0;
    const startX = Math.max(0, Math.floor(cx - radius));
    const endX = Math.min(map.width - 1, Math.ceil(cx + radius));
    const startY = Math.max(0, Math.floor(cy - radius));
    const endY = Math.min(map.height - 1, Math.ceil(cy + radius));

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= radius) {
          const tile = map.get(x, y);
          if (tile) {
            tile.terrain = Terrain.Grass;
            tile.elevation = 0;
            tile.territory = playerId + 1; // territory 1-based (0 = neutral)
            count++;
          }
        }
      }
    }
    return count;
  }

  /**
   * Apply all player starting areas to the map.
   * Must be called AFTER map generation (which sets terrain types).
   */
  static applyToMap(map: GameMap, config: GameConfig): void {
    const STARTING_RADIUS = 6; // tiles around each player's home base
    for (const player of config.players) {
      GameSetup.createStartingArea(map, player.startX, player.startY, STARTING_RADIUS, player.playerId);
    }
  }

  /** Human-readable summary of the game config. */
  static describe(config: GameConfig): string {
    const parts = config.players.map(
      (p) => `Player ${p.playerId}: ${getNationName(p.nationType)} at (${p.startX}, ${p.startY})`
    );
    return `[${config.mapWidth}×${config.mapHeight} ${config.mapKind}] ${parts.join(' | ')}`;
  }
}
