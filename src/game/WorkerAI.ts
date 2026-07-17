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

    // Handle gathering and delivery
    this.processWorkerTasks();

    // Move settlers to their assigned buildings (initial assignment)
    this.moveSettlersToBuildings();
  }

  logisticsTick(): void {
    // 1. Process active carriers (either moving to pick up an item or moving to deliver it)
    for (const unit of this.unitManager.getAliveUnits()) {
      if (unit.kind !== UnitKind.Settler) continue;
      // If they are assigned to a building, they are handled by processWorkerTasks, not global logistics
      if (unit.assignedBuilding !== null) continue;

      // Case A: Moving to pick up an item
      if (unit.logisticsTargetItemId !== null) {
        const items = this.economy.logistics.getItems();
        const item = items.find(i => i.id === unit.logisticsTargetItemId);
        if (!item) {
          // Item got lost/removed, reset state
          unit.logisticsTargetItemId = null;
          unit.logisticsTargetBuildingIndex = null;
          unit.state = UnitState.Idle;
          unit.path = null;
          continue;
        }

        const dist = Math.sqrt((unit.x - item.x) ** 2 + (unit.y - item.y) ** 2);
        if (dist < 1.5) {
          // Pick up item
          this.economy.logistics.removeItem(item.id);
          unit.carrying = { resource: item.type, amount: 1 };
          unit.logisticsTargetItemId = null;
          unit.state = UnitState.Idle; // Let next tick start the journey or handle below
          unit.path = null;
        } else {
          // Continue moving/pathfinding to item
          if (!unit.path || unit.path.len() === 0 || unit.state !== UnitState.Moving) {
            const path = Pathfinder.findPath(
              this.map,
              { x: Math.floor(unit.x), y: Math.floor(unit.y) },
              { x: item.x, y: item.y }
            );
            if (path) {
              unit.moveAlong(path);
              unit.state = UnitState.Moving;
            }
          }
        }
      }

      // Case B: Carrying item to a building
      if (unit.carrying && unit.logisticsTargetBuildingIndex !== null) {
        const building = this.economy.getBuilding(unit.logisticsTargetBuildingIndex);
        if (!building) {
          // Building was destroyed, drop/discard the item
          unit.carrying = null;
          unit.logisticsTargetBuildingIndex = null;
          unit.state = UnitState.Idle;
          unit.path = null;
          continue;
        }

        const dist = Math.sqrt((unit.x - building.x) ** 2 + (unit.y - building.y) ** 2);
        if (dist < 1.5) {
          // Deliver resource
          const res = unit.carrying.resource;
          building.inputBuffer[res as number] += unit.carrying.amount;
          unit.carrying = null;
          unit.logisticsTargetBuildingIndex = null;
          unit.state = UnitState.Idle;
          unit.path = null;
        } else {
          // Continue moving/pathfinding to building
          if (!unit.path || unit.path.len() === 0 || unit.state !== UnitState.Moving) {
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

    // 2. Assign idle carriers to unmatched demands
    const idleCarriers = this.unitManager.getAliveUnits().filter(
      u => u.kind === UnitKind.Settler &&
           u.assignedBuilding === null &&
           u.logisticsTargetItemId === null &&
           u.carrying === null &&
           u.isIdle()
    );

    if (idleCarriers.length === 0) return;

    for (const carrier of idleCarriers) {
      const match = this.economy.logistics.matchDemand();
      if (!match) break; // No more matched demands

      const { demand, item } = match;
      // Reserve item so another carrier doesn't target it
      item.isReserved = true;

      carrier.logisticsTargetItemId = item.id;
      carrier.logisticsTargetBuildingIndex = demand.buildingIndex;
      carrier.state = UnitState.Moving;

      const path = Pathfinder.findPath(
        this.map,
        { x: Math.floor(carrier.x), y: Math.floor(carrier.y) },
        { x: item.x, y: item.y }
      );
      if (path) {
        carrier.moveAlong(path);
      }
    }
  }

  private processWorkerTasks(): void {
    for (const unit of this.unitManager.getAliveUnits()) {
      if (unit.kind !== UnitKind.Settler) continue;
      if (unit.assignedBuilding === null) continue;

      const building = this.economy.getBuilding(unit.assignedBuilding);
      if (!building) {
        unit.unassign();
        continue;
      }

      if (unit.carrying) {
        // Deliver to building
        this.handleDelivery(unit, building);
      } else {
        // Gather for building
        this.handleGathering(unit, building);
      }
    }
  }

  private handleDelivery(unit: any, building: BuildingData): void {
    const dist = Math.sqrt((unit.x - building.x) ** 2 + (unit.y - building.y) ** 2);
    if (dist < 1.5) {
      // Deliver resource
      const res = unit.carrying.resource;
      const amount = unit.carrying.amount;
      building.inputBuffer[res as number] += amount;
      unit.carrying = null;
      unit.state = UnitState.Idle;
    } else {
      // Move to building
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

  private handleGathering(unit: any, building: BuildingData): void {
    const inputs = buildingInputs(building.kind);
    if (inputs.length === 0) return;

    // Find first needed input that isn't full in buffer
    const needed = inputs.find(inp => building.inputBuffer[inp.resource as number] < 10);
    if (!needed) return;

    const resourcePos = this.findNearestResource(needed.resource, unit.x, unit.y);
    if (!resourcePos) return;

    const dist = Math.sqrt((unit.x - resourcePos.x) ** 2 + (unit.y - resourcePos.y) ** 2);
    if (dist < 1.5) {
      // Gather resource
      unit.carrying = { resource: needed.resource, amount: 1 };
      unit.state = UnitState.Idle;
    } else {
      // Move to resource
      const path = Pathfinder.findPath(
        this.map,
        { x: Math.floor(unit.x), y: Math.floor(unit.y) },
        resourcePos
      );
      if (path) {
        unit.moveAlong(path);
        unit.state = UnitState.Moving;
      }
    }
  }

  private findNearestResource(resource: any, startX: number, startY: number): { x: number, y: number } | null {
    let nearest: { x: number, y: number } | null = null;
    let minDist = Infinity;

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.get(x, y);
        if (tile && tile.resource === resource) {
          const d = Math.sqrt((x - startX) ** 2 + (y - startY) ** 2);
          if (d < minDist) {
            minDist = d;
            nearest = { x, y };
          }
        }
      }
    }
    return nearest;
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