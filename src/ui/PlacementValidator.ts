/**
 * S4WN - PlacementValidator
 * Engine for determining building placement validity:
 * 1. Territory ownership (must be owned by player)
 * 2. Terrain slope (must be flat)
 * 3. Obstacle collision (no buildings/trees/resources)
 */
import { Map as GameMap } from '../game/Map';
import { Economy } from '../game/Economy';

export class PlacementValidator {
  private map: GameMap;
  private economy: Economy;

  constructor(map: GameMap, economy: Economy) {
    this.map = map;
    this.economy = economy;
  }

  isValid(x: number, y: number, ownerId: number): boolean {
    const tile = this.map.get(x, y);
    
    // 1. Territory Check (Must be owned by player)
    if (!tile || tile.territory !== ownerId) return false;
    
    // 2. Terrain Check (Must be flat, elevation 0)
    if (tile.elevation > 0) return false;

    // 3. Collision Check (Buildings)
    if (this.economy.buildings.some((b: any) => b.x === x && b.y === y)) return false;

    // 4. Resource Check (Cannot place on top of fixed resources)
    if (tile.resource && tile.resource !== 'None') return false;

    return true;
  }
}
