/**
 * S4WN Babylon.js/TypeScript - Territory Manager
 * 
 * Handles the computation of nation territory based on influence sources.
 * Also manages border post placement by Pioneer settlers.
 */

import { Map as GameMap } from './Map';
import { UnitManager } from './UnitManager';
import { Economy } from './Economy';
import { UnitKind } from './types';
import { BuildingType } from '../economy/types';
import { BorderPostManager } from './BorderPost';

export interface InfluenceSource {
  x: number;
  y: number;
  radius: number;
  nationId: number;
}

export class TerritoryManager {
  private map: GameMap;
  private unitManager: UnitManager;
  private economy: Economy;
  public borderPosts: BorderPostManager;

  // Influence radii
  private static readonly PIONEER_RADIUS = 5;
  private static readonly TOWER_RADIUS = 10;
  private static readonly CASTLE_RADIUS = 15;

  constructor(map: GameMap, unitManager: UnitManager, economy: Economy) {
    this.map = map;
    this.unitManager = unitManager;
    this.economy = economy;
    this.borderPosts = new BorderPostManager();
  }

  /**
   * Update the map territory based on current influence sources.
   * Also places border posts at territorial boundaries from Pioneers.
   */
  updateTerritory(): void {
    const influencePoints: Array<{ x: number; y: number; radius: number }> = [];
    
    // In a real game, we'd have multiple nations. For now, we assume nationId = 1.
    const currentNationId = 1;

    // 1. Collect influence from Pioneers
    const pioneers = this.unitManager.getAliveUnits().filter(u => u.kind === UnitKind.Pioneer);
    for (const p of pioneers) {
      influencePoints.push({ x: p.x, y: p.y, radius: TerritoryManager.PIONEER_RADIUS });
    }

    // 2. Collect influence from Towers and Castles
    for (const b of this.economy.getCompleteBuildings()) {
      let radius = 0;
      if (b.kind === BuildingType.GuardTower) {
        radius = TerritoryManager.TOWER_RADIUS;
      } else if (b.kind === BuildingType.Castle) {
        radius = TerritoryManager.CASTLE_RADIUS;
      }

      if (radius > 0) {
        influencePoints.push({ x: b.x, y: b.y, radius: radius });
      }
    }

    // Update the map
    this.map.updateTerritory(currentNationId, influencePoints);

    // 3. Place border posts where Pioneers are expanding territory
    this.placeBorderPosts(currentNationId, pioneers);
  }

  /**
   * Place border posts at the periphery of Pioneer influence.
   * Only places posts on tiles that are claimed by the current nation
   * and are at the edge of the influence radius (near unclaimed tiles).
   */
  private placeBorderPosts(nationId: number, pioneers: Array<{ x: number; y: number }>): void {
    for (const p of pioneers) {
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      const radius = TerritoryManager.PIONEER_RADIUS;

      // Scan the perimeter of the pioneer's influence
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check tiles near the perimeter (last 2 rings)
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius - 1 || dist > radius) continue;

          const tx = px + dx;
          const ty = py + dy;

          // Check if this tile is claimed by our nation
          const tile = this.map.get(tx, ty);
          if (!tile || tile.territory !== nationId) continue;

          // Check if at least one neighbor is unclaimed — that makes it a border tile
          let isBorderTile = false;
          for (const [ndx, ndy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const neighbor = this.map.get(tx + ndx, ty + ndy);
            if (!neighbor || neighbor.territory !== nationId) {
              isBorderTile = true;
              break;
            }
          }

          if (isBorderTile) {
            // Place a border post (max one per pioneer per update cycle)
            this.borderPosts.placePost(tx, ty, nationId);
          }
        }
      }
    }
  }

  /** Clear all border posts for a specific nation */
  clearBorderPosts(nationId: number): void {
    this.borderPosts.clearNation(nationId);
  }
}
