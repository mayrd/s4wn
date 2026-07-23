/**
 * S4WN Babylon.js/TypeScript - Economy Module
 *
 * Complete economy simulation: resources, buildings, production chains.
 * Fully migrated from engine/src/economy.rs
 */

import { BuildingType, ResourceType, RESOURCE_COUNT, buildCost, buildingInputs, buildingOutputs, productionInterval, requiresSettler, buildTime, maxHp, maxSettlers, CostItem, garrisonCapacity, buildingCategory, BuildingCategory } from '../economy/types';
import { Map as GameMap } from './Map';
import { LogisticsManager } from './Logistics';
import { TradeRouteManager } from './TradeRouteManager';
import { MaritimeTradeManager } from './MaritimeTradeManager';

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
  /** Garrisoned military unit IDs (optional for mock objects) */
  garrisonUnitIds?: number[];
}

export class Economy {
  resources: number[] = new Array(RESOURCE_COUNT).fill(0);
  buildings: BuildingData[] = [];
  nextBuildingIndex: number = 1;
  storageCapacity: number = 50;
  constructionCompletions: number = 0;
  resourcePickups: number = 0;
  logistics: LogisticsManager;
  tradeRoutes: TradeRouteManager;
  maritimeTrade: MaritimeTradeManager;

  /** Global Combat Strength (Kampfkraft) modifier derived from gold bars + monuments */
  combatStrength: number = 0;

  /** Base storage capacity without any StorageYard buildings. */
  static readonly BASE_STORAGE = 50;
  /** Additional storage capacity per completed StorageYard building. */
  static readonly STORAGE_PER_YARD = 50;

  constructor(logistics?: LogisticsManager) {
    // Start with some initial resources
    this.resources[ResourceType.Wood] = 20;
    this.resources[ResourceType.Stone] = 10;
    this.logistics = logistics || new LogisticsManager();
    this.tradeRoutes = new TradeRouteManager();
    this.maritimeTrade = new MaritimeTradeManager();
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
      garrisonUnitIds: [],
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
    // Unregister StorageYard if one was removed
    const building = this.buildings[idx];
    if (building.kind === BuildingType.StorageYard) {
      this.logistics.unregisterStorageYard(building.x, building.y);
    }
    this.buildings.splice(idx, 1);
    return true;
  }

  /** Register StorageYard positions for priority routing when built completes */
  registerStorageYards(): void {
    for (const building of this.buildings) {
      if (building.kind === BuildingType.StorageYard && building.constructionProgress >= 1.0) {
        this.logistics.registerStorageYard(building.x, building.y);
      }
    }
  }

  /** Register demand for all resource types at StorageYards (accept items) */
  registerStorageYardDemands(): void {
    for (const building of this.buildings) {
      if (building.kind === BuildingType.StorageYard && building.constructionProgress >= 1.0) {
        // StorageYards accept any resource type (for centralized storage)
        // We register a demand for each resource type with amount 1 to signal "accept items"
        for (let r = 0; r < RESOURCE_COUNT; r++) {
          this.logistics.registerDemand(
            building.index,
            r as ResourceType,
            1,
            building.x,
            building.y,
            true // isStorageYard = true (priority)
          );
        }
      }
    }
  }

  // ── Garrison / Defender Logic ────────────────────────────────────

  getGarrisonCapacity(kind: BuildingType): number {
    return garrisonCapacity(kind);
  }

  getGarrisonCount(buildingIndex: number): number {
    const building = this.getBuilding(buildingIndex);
    return building?.garrisonUnitIds?.length ?? 0;
  }

  garrisonUnit(buildingIndex: number, unitId: number): boolean {
    const building = this.getBuilding(buildingIndex);
    if (!building) return false;
    if (!building.garrisonUnitIds) building.garrisonUnitIds = [];
    if (building.garrisonUnitIds.length >= garrisonCapacity(building.kind)) return false;
    if (building.garrisonUnitIds.includes(unitId)) return false;
    building.garrisonUnitIds.push(unitId);
    return true;
  }

  ungarrisonUnit(buildingIndex: number, unitId: number): boolean {
    const building = this.getBuilding(buildingIndex);
    if (!building) return false;
    if (!building.garrisonUnitIds) building.garrisonUnitIds = [];
    const idx = building.garrisonUnitIds.indexOf(unitId);
    if (idx === -1) return false;
    building.garrisonUnitIds.splice(idx, 1);
    return true;
  }

  getGarrisonUnits(buildingIndex: number): number[] {
    const building = this.getBuilding(buildingIndex);
    return building ? [...(building.garrisonUnitIds ?? [])] : [];
  }

  // ── Production Tick ──────────────────────────────────────────────

  tick(speedMult: number, skipConstructionIndices?: Set<number>): void {
    this.constructionCompletions = 0;
    this.resourcePickups = 0;

    // Clear and rebuild demand registry each tick
    this.logistics.clearDemands();

    for (const building of this.buildings) {
      // Construction progress — skip buildings managed by ConstructionManager
      if (building.constructionProgress < 1.0) {
        if (skipConstructionIndices && skipConstructionIndices.has(building.index)) {
          // ConstructionManager handles this building's progress via digger/materials/builder phases
          continue;
        }
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

    // Recalculate storage capacity based on completed StorageYard buildings
    this.storageCapacity = Economy.BASE_STORAGE +
      this.buildings
        .filter(b => b.kind === BuildingType.StorageYard && b.constructionProgress >= 1.0)
        .length * Economy.STORAGE_PER_YARD;

    // Register StorageYard positions and demands for priority routing
    this.registerStorageYards();
    this.registerStorageYardDemands();

    // Process land trade routes for Marketplace buildings
    const tradeResult = this.tradeRoutes.tickMarketplaces(
      this.buildings, this.resources, speedMult
    );

    // Apply resource removals from land trade exports
    for (const r of tradeResult.resourcesToRemove) {
      this.removeResource(r.type, r.amount);
    }

    // Add gold from completed land trade missions
    if (tradeResult.goldToAdd > 0) {
      this.addResource(ResourceType.Gold, tradeResult.goldToAdd);
    }

    // Process maritime trade routes for LandingDock buildings
    const maritimeResult = this.maritimeTrade.tickLandingDocks(
      this.buildings, this.resources, speedMult
    );

    // Apply resource removals from maritime trade exports
    for (const r of maritimeResult.resourcesToRemove) {
      this.removeResource(r.type, r.amount);
    }

    // Add gold from completed maritime trade missions
    if (maritimeResult.goldToAdd > 0) {
      this.addResource(ResourceType.Gold, maritimeResult.goldToAdd);
    }

    // Recalculate combat strength each tick
    this.recalculateCombatStrength();
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

  /** Recalculate global Combat Strength from gold bars and monuments */
  private recalculateCombatStrength(): void {
    const goldBars = this.getResource(ResourceType.Gold);
    const monumentCount = this.buildings.filter(b => buildingCategory(b.kind) === BuildingCategory.Unique).length;

    this.combatStrength = Math.floor(goldBars / 10) + monumentCount * 2;
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
        garrisonUnitIds: [...(b.garrisonUnitIds ?? [])],
      })),
      nextBuildingIndex: this.nextBuildingIndex,
      storageCapacity: this.storageCapacity,
      combatStrength: this.combatStrength,
      tradeRoutes: this.tradeRoutes.toJSON(),
      maritimeTrade: this.maritimeTrade.toJSON(),
    };
  }

  restoreFromJSON(data: any): void {
    this.resources = [...data.resources];
    this.nextBuildingIndex = data.nextBuildingIndex;
    this.storageCapacity = data.storageCapacity;
    this.combatStrength = data.combatStrength ?? 0;
    if (data.tradeRoutes) {
      this.tradeRoutes.restoreFromJSON(data.tradeRoutes);
    }
    if (data.maritimeTrade) {
      this.maritimeTrade.restoreFromJSON(data.maritimeTrade);
    }
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
      garrisonUnitIds: [...(b.garrisonUnitIds || [])],
    }));
  }
}