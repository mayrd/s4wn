/**
 * S4WN Babylon.js/TypeScript - Economy Module
 *
 * Complete economy simulation: resources, buildings, production chains.
 * Fully migrated from engine/src/economy.rs
 */

import { BuildingType, ResourceType, RESOURCE_COUNT, buildCost, buildingInputs, buildingOutputs, productionInterval, requiresSettler, buildTime, maxHp, maxSettlers, CostItem } from '../economy/types';
import { Map as GameMap } from './Map';
import { LogisticsManager } from './Logistics';

export interface BuildingData {
  index: number;
  kind: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  constructionProgress: number;
  isActive: boolean;
  productionProgress: number;
  productionCounter: number;
  inputBuffer: number[];
  outputBuffer: number[];
  assignedSettlers: number[];
  maxSettlers: number;
  destructionTimer: number | null;
  destructionProgress: number | null;
  ownerId: number;
}

export class Economy {
  resources: number[] = new Array(RESOURCE_COUNT).fill(0);
  buildings: BuildingData[] = [];
  nextBuildingIndex: number = 1;
  storageCapacity: number = 100;
  constructionCompletions: number = 0;
  resourcePickups: number = 0;
  logistics: LogisticsManager;

  constructor(logistics?: LogisticsManager) {
    // Start with some initial resources
    this.resources[ResourceType.Wood] = 20;
    this.resources[ResourceType.Stone] = 10;
    this.logistics = logistics || new LogisticsManager();
  }

  // ── Resource Management ──────────────────────────────────────────

  getResource(r: ResourceType): number {
    return this.resources[r as number] || 0;
  }

  getResourceByDiscriminant(d: number): number {
    return this.resources[d] || 0;
  }

  getResourceCounts(): number[] {
    return [...this.resources];
  }

  addResource(r: ResourceType, amount: number): number {
    const disc = r as number;
    const current = this.resources[disc] || 0;
    const maxStorage = this.storageCapacity;
    const added = Math.min(amount, maxStorage - current);
    this.resources[disc] = current + added;
    if (added > 0) this.resourcePickups++;
    return added;
  }

  removeResource(r: ResourceType, amount: number): boolean {
    const disc = r as number;
    const current = this.resources[disc] || 0;
    if (current >= amount) {
      this.resources[disc] = current - amount;
      return true;
    }
    return false;
  }

  canAfford(cost: CostItem[]): boolean {
    return cost.every(c => this.getResource(c.resource) >= c.amount);
  }

  spendResources(cost: CostItem[]): boolean {
    if (!this.canAfford(cost)) return false;
    for (const c of cost) {
      this.removeResource(c.resource, c.amount);
    }
    return true;
  }

  // ── Building Management ──────────────────────────────────────────

  tryPlaceBuilding(kind: BuildingType, x: number, y: number, map: GameMap, ownerId: number): BuildingData | null {
    const cost = buildCost(kind);
    if (!this.canAfford(cost)) return null;

    // Check if tile is buildable
    if (!map.isBuildable(x, y)) return null;

    // Check territory ownership
    const tile = map.get(x, y);
    if (!tile || tile.territory !== ownerId) return null;

    // Check for collision with existing buildings
    for (const b of this.buildings) {
      if (b.x === x && b.y === y) return null;
    }

    this.spendResources(cost);

    const building: BuildingData = {
      index: this.nextBuildingIndex++,
      kind,
      x,
      y,
      hp: maxHp(kind),
      maxHp: maxHp(kind),
      constructionProgress: 0,
      isActive: false,
      productionProgress: 0,
      productionCounter: 0,
      inputBuffer: new Array(RESOURCE_COUNT).fill(0),
      outputBuffer: new Array(RESOURCE_COUNT).fill(0),
      assignedSettlers: [],
      maxSettlers: maxSettlers(kind),
      destructionTimer: null,
      destructionProgress: null,
      ownerId,
    };

    this.buildings.push(building);
    return building;
  }

  getBuilding(index: number): BuildingData | undefined {
    return this.buildings.find(b => b.index === index);
  }

  getBuildingAt(x: number, y: number): BuildingData | undefined {
    return this.buildings.find(b => b.x === x && b.y === y);
  }

  getBuildingsByKind(kind: BuildingType): BuildingData[] {
    return this.buildings.filter(b => b.kind === kind);
  }

  getCompleteBuildings(): BuildingData[] {
    return this.buildings.filter(b => b.constructionProgress >= 1.0);
  }

  getBuildingSummary(): Array<{ index: number; kind: number; x: number; y: number; complete: boolean; settlers: number; ownerId: number; garrison: number; maxGarrison: number }> {
    return this.buildings.map(b => ({
      index: b.index,
      kind: b.kind as number,
      x: b.x,
      y: b.y,
      complete: b.constructionProgress >= 1.0,
      settlers: b.assignedSettlers.length,
      ownerId: b.ownerId,
      garrison: b.assignedSettlers.length,
      maxGarrison: b.maxSettlers,
    }));
  }

  removeBuilding(index: number): boolean {
    const idx = this.buildings.findIndex(b => b.index === index);
    if (idx === -1) return false;
    this.buildings.splice(idx, 1);
    return true;
  }

  // ── Production Tick ──────────────────────────────────────────────

  tick(speedMult: number): void {
    this.constructionCompletions = 0;
    this.resourcePickups = 0;

    // Clear and rebuild demand registry each tick
    this.logistics.clearDemands();

    for (const building of this.buildings) {
      // Construction progress
      if (building.constructionProgress < 1.0) {
        const bt = buildTime(building.kind);
        if (bt > 0) {
          building.constructionProgress += (1.0 / bt) * speedMult;
          if (building.constructionProgress >= 1.0) {
            building.constructionProgress = 1.0;
            building.isActive = true;
            this.constructionCompletions++;
          }
        } else {
          building.constructionProgress = 1.0;
          building.isActive = true;
        }
        continue; // Skip production while under construction
      }

      // Destruction progress
      if (building.destructionTimer !== null) {
        building.destructionTimer! -= 0.1 * speedMult;
        building.destructionProgress = 1 - (building.destructionTimer! / 5.0);
        if (building.destructionTimer! <= 0) {
          this.removeBuilding(building.index);
        }
        continue;
      }

      // Production
      const interval = productionInterval(building.kind);
      if (interval <= 0) continue;
      if (requiresSettler(building.kind) && building.assignedSettlers.length === 0) continue;

      building.productionCounter++;
      if (building.productionCounter >= interval) {
        building.productionCounter = 0;

        // Check inputs
        const inputs = buildingInputs(building.kind);
        const canProduce = inputs.every(inp => {
          const disc = inp.resource as number;
          return building.inputBuffer[disc] >= inp.amount;
        });

        // Register demands for missing inputs
        if (!canProduce) {
          for (const inp of inputs) {
            const disc = inp.resource as number;
            const needed = inp.amount - building.inputBuffer[disc];
            if (needed > 0) {
              this.logistics.registerDemand(
                building.index,
                disc as ResourceType,
                needed,
                building.x,
                building.y,
              );
            }
          }
        }

        if (canProduce) {
          // Consume inputs
          for (const inp of inputs) {
            const disc = inp.resource as number;
            building.inputBuffer[disc] -= inp.amount;
          }

          // Produce outputs
          const outputs = buildingOutputs(building.kind);
          for (const out of outputs) {
            const disc = out.resource as number;
            building.outputBuffer[disc] += out.amount;
          }

          // Transfer outputs to global storage AND spawn physical world items
          for (const out of outputs) {
            const disc = out.resource as number;
            while (building.outputBuffer[disc] > 0) {
              const transferred = this.addResource(disc as ResourceType, 1);
              if (transferred > 0) {
                building.outputBuffer[disc]--;
                // Spawn a physical item on the map for carriers to pick up
                this.logistics.spawnItem(disc as ResourceType, building.x, building.y);
              } else {
                break; // Storage full
              }
            }
          }
        }
      }
    }
  }

  // ── Building Damage / Destruction ────────────────────────────────

  damageBuilding(index: number, amount: number): boolean {
    const building = this.getBuilding(index);
    if (!building) return false;

    building.hp = Math.max(0, building.hp - amount);
    if (building.hp <= 0 && building.destructionTimer === null) {
      building.destructionTimer = 5.0;
      building.destructionProgress = 0;
      return true; // Just destroyed
    }
    return false;
  }

  getDestructionProgress(index: number): number | null {
    const building = this.getBuilding(index);
    return building?.destructionProgress ?? null;
  }

  getRecentConstructionCompletions(): number {
    return this.constructionCompletions;
  }

  getRecentResourcePickups(): number {
    return this.resourcePickups;
  }

  /* ── Save / Load ─────────────────────────────────────────── */

  toJSON(): object {
    return {
      resources: [...this.resources],
      buildings: this.buildings.map(b => ({
        index: b.index,
        kind: b.kind,
        x: b.x,
        y: b.y,
        hp: b.hp,
        maxHp: b.maxHp,
        constructionProgress: b.constructionProgress,
        isActive: b.isActive,
        productionProgress: b.productionProgress,
        productionCounter: b.productionCounter,
        inputBuffer: [...b.inputBuffer],
        outputBuffer: [...b.outputBuffer],
        assignedSettlers: [...b.assignedSettlers],
        maxSettlers: b.maxSettlers,
        destructionTimer: b.destructionTimer,
        destructionProgress: b.destructionProgress,
        ownerId: b.ownerId,
      })),
      nextBuildingIndex: this.nextBuildingIndex,
      storageCapacity: this.storageCapacity,
    };
  }

  restoreFromJSON(data: any): void {
    this.resources = [...data.resources];
    this.nextBuildingIndex = data.nextBuildingIndex;
    this.storageCapacity = data.storageCapacity;
    this.buildings = (data.buildings || []).map((b: any) => ({
      index: b.index,
      kind: b.kind,
      x: b.x,
      y: b.y,
      hp: b.hp,
      maxHp: b.maxHp,
      constructionProgress: b.constructionProgress,
      isActive: b.isActive,
      productionProgress: b.productionProgress,
      productionCounter: b.productionCounter,
      inputBuffer: [...b.inputBuffer],
      outputBuffer: [...b.outputBuffer],
      assignedSettlers: [...b.assignedSettlers],
      maxSettlers: b.maxSettlers,
      destructionTimer: b.destructionTimer,
      destructionProgress: b.destructionProgress,
      ownerId: b.ownerId,
    }));
  }
}