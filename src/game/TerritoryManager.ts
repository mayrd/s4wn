/**
 * S4WN Babylon.js/TypeScript - Territory Manager
 * 
 * Handles the computation of nation territory based on influence sources.
 */

import { Map as GameMap } from './Map';
import { UnitManager } from './UnitManager';
import { Economy } from './Economy';
import { UnitKind } from './types';
import { BuildingType } from '../economy/types';

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

  // Influence radii
  private static readonly PIONEER_RADIUS = 5;
  private static readonly TOWER_RADIUS = 10;
  private static readonly CASTLE_RADIUS = 15;

  constructor(map: GameMap, unitManager: UnitManager, economy: Economy) {
    this.map = map;
    this.unitManager = unitManager;
    this.economy = economy;
  }

  /**
   * Update the map territory based on current influence sources.
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
  }
}