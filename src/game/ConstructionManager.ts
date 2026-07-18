/**
 * S4WN Babylon.js/TypeScript - Construction Manager
 *
 * Manages the complete construction pipeline for buildings:
 *   Digging (terrain leveling) → Materials (carrier delivery) → Building (builder work) → Complete
 *
 * Each construction site goes through a phase state machine with dedicated
 * worker units (digger, carriers, builder) that pathfind to/from the site.
 */

import { BuildingType, ResourceType, CostItem, buildCost, buildTime } from '../economy/types';
import { Economy } from './Economy';
import { UnitManager } from './UnitManager';
import { UnitKind, UnitState } from './types';
import { Map as GameMap } from './Map';
import { Pathfinder } from './Pathfinder';

// ── Constants ────────────────────────────────────────────────────────

/** Ticks for a digger to level uneven terrain. */
const DIG_TIME = 60;

/** Speed multiplier for tutorial fast-forward. */
const DEFAULT_SPEED_MULTIPLIER = 1.0;

/** Elevation change threshold (in height units) to require digging. */
const ELEVATION_THRESHOLD = 0.3;

/** Distance threshold for "arrived at site" checks. */
const ARRIVAL_DIST = 1.5;

// ── Types ────────────────────────────────────────────────────────────

export type ConstructionPhase = 'digging' | 'materials' | 'building' | 'complete';

export interface ConstructionSite {
  /** Index into Economy.buildings[] */
  buildingIndex: number;
  kind: BuildingType;
  x: number;
  y: number;
  ownerId: number;

  // Material tracking
  requiredMaterials: CostItem[];
  /** deliveredMaterials[resourceDiscriminant] = count delivered so far */
  deliveredMaterials: number[];

  // Digger phase
  needsDigging: boolean;
  diggerAssigned: number | null;   // Unit ID
  diggingProgress: number;         // 0.0 → 1.0

  // Builder phase
  builderAssigned: number | null;  // Unit ID
  builderAdjacentTile: { x: number; y: number } | null;

  // Drop-off point for material carriers
  dropoffTile: { x: number; y: number } | null;

  // Overall phase
  phase: ConstructionPhase;
}

// ── ConstructionManager ──────────────────────────────────────────────

export class ConstructionManager {
  sites: Map<number, ConstructionSite> = new Map();
  private speedMultiplier: number = DEFAULT_SPEED_MULTIPLIER;

  // ── Public API ─────────────────────────────────────────────────────

  /**
   * Register a new construction site after a building is placed.
   * Checks terrain to determine if digging is needed.
   */
  registerSite(
    buildingIndex: number,
    kind: BuildingType,
    x: number,
    y: number,
    ownerId: number,
    map: GameMap
  ): ConstructionSite {
    const cost = buildCost(kind);
    const deliveredMaterials = new Array(29).fill(0);

    // Check if terrain is uneven within the building footprint
    const needsDigging = this.checkTerrainNeedsDigging(x, y, map);

    // Compute dropoff tile (nearest free adjacent tile)
    const dropoffTile = this.findDropoffTile(x, y, map);

    const site: ConstructionSite = {
      buildingIndex,
      kind,
      x,
      y,
      ownerId,
      requiredMaterials: cost,
      deliveredMaterials,
      needsDigging,
      diggerAssigned: null,
      diggingProgress: 0,
      builderAssigned: null,
      builderAdjacentTile: null,
      dropoffTile,
      phase: needsDigging ? 'digging' : 'materials',
    };

    this.sites.set(buildingIndex, site);
    return site;
  }

  /**
   * Remove a construction site (e.g., building destroyed during construction).
   */
  removeSite(buildingIndex: number): void {
    const site = this.sites.get(buildingIndex);
    if (!site) return;

    // Free any assigned digger/builder
    this.freeAssignedUnits(site);
    this.sites.delete(buildingIndex);
  }

  /**
   * Get construction progress for a building (0.0–1.0).
   * Falls back to Economy's constructionProgress if no site tracked.
   */
  getConstructionProgress(buildingIndex: number, economy: Economy): number {
    const building = economy.getBuilding(buildingIndex);
    if (!building) return 0;
    return building.constructionProgress;
  }

  /**
   * Get the current phase name for a building.
   */
  getConstructionPhase(buildingIndex: number): string {
    const site = this.sites.get(buildingIndex);
    if (!site) return 'complete';
    return site.phase;
  }

  /**
   * Set a speed multiplier (used by tutorial for fast-forward).
   */
  setSpeedMultiplier(mult: number): void {
    this.speedMultiplier = Math.max(0.1, mult);
  }

  /**
   * Get the speed multiplier.
   */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  /**
   * Get all active construction sites.
   */
  getActiveSites(): ConstructionSite[] {
    return Array.from(this.sites.values()).filter(s => s.phase !== 'complete');
  }

  // ── Main Tick ──────────────────────────────────────────────────────

  /**
   * Called each economy tick. Processes all active construction sites
   * through their phase state machine.
   */
  tick(unitManager: UnitManager, economy: Economy, map: GameMap): void {
    for (const [buildingIndex, site] of this.sites) {
      const building = economy.getBuilding(buildingIndex);
      if (!building) {
        // Building was removed — clean up site
        this.removeSite(buildingIndex);
        continue;
      }

      switch (site.phase) {
        case 'digging':
          this.processDiggingPhase(site, unitManager, map);
          break;
        case 'materials':
          this.processMaterialsPhase(site, economy, unitManager, map);
          break;
        case 'building':
          this.processBuildingPhase(site, economy, unitManager, map);
          break;
        case 'complete':
          // Already done — will be cleaned up on next tick
          break;
      }
    }
  }

  // ── Phase: Digging ─────────────────────────────────────────────────

  private processDiggingPhase(
    site: ConstructionSite,
    unitManager: UnitManager,
    map: GameMap
  ): void {
    // 1. Assign digger if not yet assigned
    if (site.diggerAssigned === null) {
      this.findAndAssignDigger(site, unitManager);
      return; // Wait for next tick to check arrival
    }

    // 2. Check if digger is still alive
    const digger = unitManager.getUnit(site.diggerAssigned);
    if (!digger || !digger.isAlive()) {
      // Digger died — reassign
      site.diggerAssigned = null;
      return;
    }

    // 3. Check if digger has arrived at site
    const dist = Math.sqrt(
      (digger.x - site.x) ** 2 + (digger.y - site.y) ** 2
    );

    if (dist > ARRIVAL_DIST) {
      // Still moving — ensure pathfinding
      if (!digger.path || digger.path.len() === 0 || digger.state !== UnitState.Moving) {
        const path = Pathfinder.findPath(
          map,
          { x: Math.floor(digger.x), y: Math.floor(digger.y) },
          { x: site.x, y: site.y }
        );
        if (path) {
          digger.moveAlong(path);
          digger.state = UnitState.Moving;
        }
      }
      return;
    }

    // 4. Digger arrived — start digging
    digger.state = UnitState.Working;
    digger.path = null;
    site.diggingProgress += (1.0 / DIG_TIME) * this.speedMultiplier;

    // 5. Digging complete
    if (site.diggingProgress >= 1.0) {
      site.diggingProgress = 1.0;
      site.needsDigging = false;

      // Flatten terrain at building footprint
      this.flattenTerrain(site.x, site.y, map);

      // Free digger
      digger.state = UnitState.Idle;
      digger.constructionRole = null;
      digger.constructionTargetSite = null;
      site.diggerAssigned = null;

      // Transition to materials phase
      site.phase = 'materials';
    }
  }

  // ── Phase: Materials ───────────────────────────────────────────────

  private processMaterialsPhase(
    site: ConstructionSite,
    economy: Economy,
    _unitManager: UnitManager,
    _map: GameMap
  ): void {
    const building = economy.getBuilding(site.buildingIndex);
    if (!building) return;

    // 1. Sync delivered materials from building's input buffer
    for (const cost of site.requiredMaterials) {
      const disc = cost.resource as number;
      const inBuffer = building.inputBuffer[disc] || 0;
      site.deliveredMaterials[disc] = inBuffer;
    }

    // 2. Check if all materials are delivered
    const allDelivered = site.requiredMaterials.every(cost => {
      const disc = cost.resource as number;
      return site.deliveredMaterials[disc] >= cost.amount;
    });

    if (allDelivered) {
      // Transition to building phase
      site.phase = 'building';
      return;
    }

    // 3. Request carrier deliveries for missing materials
    this.requestMaterialDelivery(site, economy);
  }

  // ── Phase: Building ────────────────────────────────────────────────

  private processBuildingPhase(
    site: ConstructionSite,
    economy: Economy,
    unitManager: UnitManager,
    map: GameMap
  ): void {
    const building = economy.getBuilding(site.buildingIndex);
    if (!building) return;

    // 1. Assign builder if not yet assigned
    if (site.builderAssigned === null) {
      this.findAndAssignBuilder(site, unitManager, map);
      return;
    }

    // 2. Check if builder is still alive
    const builder = unitManager.getUnit(site.builderAssigned);
    if (!builder || !builder.isAlive()) {
      site.builderAssigned = null;
      return;
    }

    // 3. Compute builder's target adjacent tile
    const targetTile = site.builderAdjacentTile;
    if (!targetTile) {
      // Recompute adjacent tile
      site.builderAdjacentTile = this.findAdjacentTile(site.x, site.y, map);
      return;
    }

    // 4. Check if builder has arrived at adjacent tile
    const dist = Math.sqrt(
      (builder.x - targetTile.x) ** 2 + (builder.y - targetTile.y) ** 2
    );

    if (dist > ARRIVAL_DIST) {
      // Still moving — ensure pathfinding
      if (!builder.path || builder.path.len() === 0 || builder.state !== UnitState.Moving) {
        const path = Pathfinder.findPath(
          map,
          { x: Math.floor(builder.x), y: Math.floor(builder.y) },
          { x: targetTile.x, y: targetTile.y }
        );
        if (path) {
          builder.moveAlong(path);
          builder.state = UnitState.Moving;
        }
      }
      return;
    }

    // 5. Builder arrived — start building
    builder.state = UnitState.Working;
    builder.path = null;

    // Advance construction progress
    const bt = buildTime(site.kind);
    if (bt > 0) {
      building.constructionProgress += (1.0 / bt) * this.speedMultiplier;
    } else {
      building.constructionProgress = 1.0;
    }

    // 6. Construction complete
    if (building.constructionProgress >= 1.0) {
      building.constructionProgress = 1.0;
      building.isActive = true;

      // Free builder
      builder.state = UnitState.Idle;
      builder.constructionRole = null;
      builder.constructionTargetSite = null;
      site.builderAssigned = null;

      // Mark site as complete
      site.phase = 'complete';
      this.sites.delete(site.buildingIndex);
    }
  }

  // ── Digger Assignment ──────────────────────────────────────────────

  private findAndAssignDigger(
    site: ConstructionSite,
    unitManager: UnitManager
  ): boolean {
    // Find an idle settler not assigned to a building
    const idleSettler = unitManager.getAliveUnits().find(
      u => u.kind === UnitKind.Settler &&
           u.isIdle() &&
           u.assignedBuilding === null &&
           u.constructionRole === null
    );

    if (!idleSettler) return false;

    // Tag settler as digger
    idleSettler.constructionRole = 'digger';
    idleSettler.constructionTargetSite = site.buildingIndex;
    site.diggerAssigned = idleSettler.id;

    // Pathfinding is handled by unitManager.tick() — the digger will be
    // assigned to the site, and processDiggingPhase will pathfind each tick
    // until the digger arrives. No immediate pathfinding needed here.

    return true;
  }

  // ── Builder Assignment ─────────────────────────────────────────────

  private findAndAssignBuilder(
    site: ConstructionSite,
    unitManager: UnitManager,
    map: GameMap
  ): boolean {
    // Find an idle settler not assigned to a building
    const idleSettler = unitManager.getAliveUnits().find(
      u => u.kind === UnitKind.Settler &&
           u.isIdle() &&
           u.assignedBuilding === null &&
           u.constructionRole === null
    );

    if (!idleSettler) return false;

    // Compute adjacent tile for builder to stand on
    const adjTile = this.findAdjacentTile(site.x, site.y, map);
    if (!adjTile) return false; // No free adjacent tile

    site.builderAdjacentTile = adjTile;

    // Tag settler as builder
    idleSettler.constructionRole = 'builder';
    idleSettler.constructionTargetSite = site.buildingIndex;
    site.builderAssigned = idleSettler.id;

    // Pathfind to adjacent tile
    const path = Pathfinder.findPath(
      map,
      { x: Math.floor(idleSettler.x), y: Math.floor(idleSettler.y) },
      { x: adjTile.x, y: adjTile.y }
    );

    if (path) {
      idleSettler.moveAlong(path);
      idleSettler.state = UnitState.Moving;
    }

    return true;
  }

  // ── Material Delivery ──────────────────────────────────────────────

  private requestMaterialDelivery(
    site: ConstructionSite,
    economy: Economy
  ): void {
    for (const cost of site.requiredMaterials) {
      const disc = cost.resource as number;
      const delivered = site.deliveredMaterials[disc] || 0;
      const needed = cost.amount - delivered;

      if (needed > 0) {
        // Register a construction demand via LogisticsManager
        const dropX = site.dropoffTile ? site.dropoffTile.x : site.x;
        const dropY = site.dropoffTile ? site.dropoffTile.y : site.y;

        economy.logistics.registerDemand(
          site.buildingIndex,
          disc as ResourceType,
          needed,
          dropX,
          dropY,
        );
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Check if terrain at the building footprint needs leveling.
   * Returns true if elevation changes exceed the threshold.
   */
  private checkTerrainNeedsDigging(x: number, y: number, map: GameMap): boolean {
    // Check a 2x2 footprint for elevation variation
    const elevations: number[] = [];
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const tile = map.get(x + dx, y + dy);
        if (tile) {
          elevations.push(tile.elevation || 0);
        }
      }
    }

    if (elevations.length === 0) return false;

    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    return (max - min) > ELEVATION_THRESHOLD;
  }

  /**
   * Flatten terrain at the building footprint after digging.
   */
  private flattenTerrain(x: number, y: number, map: GameMap): void {
    // Average elevation across the footprint
    let sum = 0;
    let count = 0;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const tile = map.get(x + dx, y + dy);
        if (tile) {
          sum += tile.elevation || 0;
          count++;
        }
      }
    }

    const avgElevation = count > 0 ? sum / count : 0;

    // Set all tiles in footprint to average elevation
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const tile = map.get(x + dx, y + dy);
        if (tile) {
          tile.elevation = avgElevation;
        }
      }
    }
  }

  /**
   * Find the nearest free tile adjacent to the building for material drop-off.
   */
  private findDropoffTile(x: number, y: number, map: GameMap): { x: number; y: number } | null {
    const candidates = [
      { x: x - 1, y },
      { x: x + 2, y },
      { x, y: y - 1 },
      { x, y: y + 2 },
      { x: x - 1, y: y - 1 },
      { x: x + 2, y: y + 2 },
    ];

    for (const c of candidates) {
      if (c.x >= 0 && c.x < map.width && c.y >= 0 && c.y < map.height) {
        if (map.isPassable(c.x, c.y)) {
          return c;
        }
      }
    }

    // Fallback: return the building tile itself
    return { x, y };
  }

  /**
   * Find a free adjacent tile for the builder to stand on.
   */
  private findAdjacentTile(x: number, y: number, map: GameMap): { x: number; y: number } | null {
    const candidates = [
      { x: x - 1, y },
      { x: x + 2, y },
      { x, y: y - 1 },
      { x, y: y + 2 },
      { x: x - 1, y: y - 1 },
      { x: x + 2, y: y + 2 },
      { x: x - 1, y: y + 1 },
      { x: x + 2, y: y - 1 },
    ];

    for (const c of candidates) {
      if (c.x >= 0 && c.x < map.width && c.y >= 0 && c.y < map.height) {
        if (map.isPassable(c.x, c.y)) {
          return c;
        }
      }
    }

    return null;
  }

  /**
   * Free any units assigned to a construction site (digger/builder).
   */
  private freeAssignedUnits(site: ConstructionSite): void {
    // Note: unitManager access would need to be passed in, but for cleanup
    // we just null out the references. The units will be freed naturally
    // when they next check their constructionTargetSite.
    site.diggerAssigned = null;
    site.builderAssigned = null;
  }
}