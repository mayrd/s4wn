/**
 * S4WN Babylon.js/TypeScript - Worker AI
 *
 * AI logic for settler workers: assignment to buildings, resource gathering.
 * Fully migrated from engine/src/worker_ai.rs
 */

import { Economy, BuildingData } from './Economy';
import { UnitManager } from './UnitManager';
import { Map as GameMap } from './Map';
import { UnitKind, UnitState } from './types';
import { buildingInputs, requiresSettler } from '../economy/types';
import { Pathfinder } from './Pathfinder';

export class WorkerAI {
  private economy: Economy;
  private unitManager: UnitManager;
  private map: GameMap;

  constructor(economy: Economy, unitManager: UnitManager, map: GameMap) {
    this.economy = economy;
    this.unitManager = unitManager;
    this.map = map;
  }

  tick(): void {
    // Assign idle settlers to buildings that need them
    this.assignIdleSettlers();

    // Move settlers to their assigned buildings
    this.moveSettlersToBuildings();
  }

  private assignIdleSettlers(): void {
    const idleSettlers = this.unitManager.getAliveUnits().filter(
      u => u.kind === UnitKind.Settler && u.isIdle() && u.assignedBuilding === null
    );

    if (idleSettlers.length === 0) return;

    // Find buildings that need settlers
    for (const settler of idleSettlers) {
      const building = this.findBuildingNeedingSettler();
      if (building) {
        building.assignedSettlers.push(settler.id);
        settler.assignTo(building.index);
      }
    }
  }

  private findBuildingNeedingSettler(): BuildingData | undefined {
    for (const building of this.economy.getCompleteBuildings()) {
      if (!requiresSettler(building.kind)) continue;
      if (building.assignedSettlers.length >= building.maxSettlers) continue;
      if (building.destructionTimer !== null) continue;

      // Check if building has inputs available or is a raw producer
      const inputs = buildingInputs(building.kind);
      if (inputs.length > 0) {
        // Check if inputs are available in storage
        const hasInputs = inputs.every(inp => {
          const disc = inp.resource as number;
          return this.economy.getResourceByDiscriminant(disc) >= inp.amount;
        });
        if (!hasInputs) continue;
      }

      return building;
    }
    return undefined;
  }

  private moveSettlersToBuildings(): void {
    for (const unit of this.unitManager.getAliveUnits()) {
      if (unit.kind !== UnitKind.Settler) continue;
      if (unit.assignedBuilding === null) continue;
      if (unit.state === UnitState.Moving) continue;

      const building = this.economy.getBuilding(unit.assignedBuilding);
      if (!building) {
        unit.unassign();
        continue;
      }

      // Move settler to building location
      const dist = Math.sqrt(
        (unit.x - building.x) ** 2 + (unit.y - building.y) ** 2
      );

      if (dist > 1.5) {
        const path = Pathfinder.findPath(
          this.map,
          { x: Math.floor(unit.x), y: Math.floor(unit.y) },
          { x: building.x, y: building.y }
        );
        if (path) {
          unit.moveAlong(path);
          unit.state = UnitState.Moving;
        }
      }
    }
  }
}