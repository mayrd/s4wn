/**
 * S4WN Babylon.js/TypeScript - Maritime Trade Route Manager
 *
 * Manages ship-based maritime trade routes between LandingDock buildings.
 * Landing Docks periodically dispatch cargo ships to other Landing Docks,
 * transferring larger quantities of resources and generating gold income.
 *
 * BASE.md § Logistics:
 *   LandingDock: Maritime trade routes (Carriers)
 *   Shipyard: Ferries or Warships (Shipwright worker)
 */

import { BuildingType, ResourceType } from '../economy/types';
import { BuildingData } from './Economy';

export interface MaritimeMission {
  /** Unique mission ID */
  id: number;
  /** Source LandingDock building index */
  sourceIndex: number;
  /** Destination LandingDock building index */
  destIndex: number;
  /** Source position (map coordinates) */
  srcX: number;
  srcY: number;
  /** Destination position */
  dstX: number;
  dstY: number;
  /** Progress from 0 (at source) to 1 (at destination) */
  progress: number;
  /** Resource being exported */
  exportResource: ResourceType;
  /** Amount being carried (ships carry 3x more than donkeys) */
  cargoAmount: number;
  /** Travel speed (progress per tick) */
  speed: number;
  /** Whether returning home (1 = returning, 0 = outbound) */
  returning: boolean;
}

export class MaritimeTradeManager {
  private missions: MaritimeMission[] = [];
  private nextMissionId: number = 1000; // Separate ID range from land trade
  /** Cooldown counters per LandingDock to prevent spam */
  private cooldowns: Map<number, number> = new Map();
  /** Minimum number of ticks between trade missions from the same dock */
  static readonly TRADE_COOLDOWN = 150; // Slower than land trade (100)
  /** Minimum distance between docks to be valid trade partners */
  static readonly MIN_TRADE_DISTANCE = 8;
  /** Base travel speed (fraction per tick) — ships are slower */
  static readonly TRAVEL_SPEED = 0.015;
  /** Gold generated per completed round-trip */
  static readonly GOLD_PER_TRIP = 8; // More valuable than land trade (3)
  /** How many tiles away from a water tile a dock can be for valid placement */
  static readonly MAX_DISTANCE_FROM_WATER = 2;

  /**
   * Find the nearest active LandingDock to the given source that is
   * at least MIN_TRADE_DISTANCE away.
   */
  findTradePartner(
    sourceBuilding: BuildingData,
    allBuildings: BuildingData[],
  ): BuildingData | undefined {
    let best: BuildingData | undefined;
    let bestDistSq = Infinity;

    for (const b of allBuildings) {
      if (b.index === sourceBuilding.index) continue;
      if (b.kind !== BuildingType.LandingDock) continue;
      if (b.constructionProgress < 1.0) continue;
      if (b.ownerId !== sourceBuilding.ownerId) continue;

      const dx = b.x - sourceBuilding.x;
      const dy = b.y - sourceBuilding.y;
      const distSq = dx * dx + dy * dy;
      const minDistSq = MaritimeTradeManager.MIN_TRADE_DISTANCE ** 2;

      if (distSq < minDistSq) continue;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = b;
      }
    }

    return best;
  }

  /**
   * Try to start a maritime trade mission from a LandingDock.
   * Returns true if a mission was created.
   */
  tryStartMission(
    sourceBuilding: BuildingData,
    allBuildings: BuildingData[],
    availableResources: number[],
  ): boolean {
    // Check cooldown
    const cd = this.cooldowns.get(sourceBuilding.index) || 0;
    if (cd > 0) return false;

    // Find a trade partner
    const partner = this.findTradePartner(sourceBuilding, allBuildings);
    if (!partner) return false;

    // Pick a non-zero resource to export (with at least 3 units available)
    const exportOptions: ResourceType[] = [];
    for (let i = 0; i < availableResources.length; i++) {
      if (availableResources[i] >= 3) {
        exportOptions.push(i as ResourceType);
      }
    }
    if (exportOptions.length === 0) return false;

    const exportRes = exportOptions[Math.floor(Math.random() * exportOptions.length)];
    const cargoAmount = Math.min(5, availableResources[exportRes]);

    const mission: MaritimeMission = {
      id: this.nextMissionId++,
      sourceIndex: sourceBuilding.index,
      destIndex: partner.index,
      srcX: sourceBuilding.x,
      srcY: sourceBuilding.y,
      dstX: partner.x,
      dstY: partner.y,
      progress: 0,
      exportResource: exportRes,
      cargoAmount,
      speed: MaritimeTradeManager.TRAVEL_SPEED,
      returning: false,
    };

    this.missions.push(mission);
    this.cooldowns.set(sourceBuilding.index, MaritimeTradeManager.TRADE_COOLDOWN);
    return true;
  }

  /**
   * Tick all active maritime trade missions.
   */
  tick(speedMult: number): {
    resourcesToRemove: Array<{ type: ResourceType; amount: number }>;
    goldToAdd: number;
    completedMissions: MaritimeMission[];
  } {
    // Decrement cooldowns
    for (const [key, val] of this.cooldowns) {
      if (val > 0) {
        this.cooldowns.set(key, Math.max(0, val - speedMult));
      }
    }

    const resourcesToRemove: Array<{ type: ResourceType; amount: number }> = [];
    let goldToAdd = 0;
    const completedMissions: MaritimeMission[] = [];

    for (const mission of this.missions) {
      mission.progress += mission.speed * speedMult;

      if (mission.progress >= 1.0 && !mission.returning) {
        // Arrived at destination — deliver cargo, start return trip
        resourcesToRemove.push({
          type: mission.exportResource,
          amount: mission.cargoAmount,
        });

        goldToAdd += MaritimeTradeManager.GOLD_PER_TRIP;
        mission.progress = 0;
        mission.returning = true;
      }

      if (mission.progress >= 1.0 && mission.returning) {
        // Round-trip complete
        completedMissions.push(mission);
      }
    }

    // Remove completed missions
    if (completedMissions.length > 0) {
      const completedIds = new Set(completedMissions.map((m) => m.id));
      this.missions = this.missions.filter((m) => !completedIds.has(m.id));
    }

    return { resourcesToRemove, goldToAdd, completedMissions };
  }

  /**
   * Tick all LandingDock trade logic.
   */
  tickLandingDocks(
    buildings: BuildingData[],
    resources: number[],
    speedMult: number,
  ): { resourcesToRemove: Array<{ type: ResourceType; amount: number }>; goldToAdd: number } {
    // First, tick existing missions
    const tickResult = this.tick(speedMult);

    // Then try to start new missions from active LandingDocks
    for (const building of buildings) {
      if (building.kind !== BuildingType.LandingDock) continue;
      if (building.constructionProgress < 1.0) continue;
      if (!building.isActive) continue;

      this.tryStartMission(building, buildings, resources);
    }

    return { resourcesToRemove: tickResult.resourcesToRemove, goldToAdd: tickResult.goldToAdd };
  }

  getMissions(): MaritimeMission[] {
    return [...this.missions];
  }

  getMissionCount(): number {
    return this.missions.length;
  }

  getCooldown(buildingIndex: number): number {
    return this.cooldowns.get(buildingIndex) || 0;
  }

  toJSON(): object {
    return {
      missions: this.missions.map((m) => ({
        id: m.id,
        sourceIndex: m.sourceIndex,
        destIndex: m.destIndex,
        srcX: m.srcX,
        srcY: m.srcY,
        dstX: m.dstX,
        dstY: m.dstY,
        progress: m.progress,
        exportResource: m.exportResource,
        cargoAmount: m.cargoAmount,
        speed: m.speed,
        returning: m.returning,
      })),
      nextMissionId: this.nextMissionId,
      cooldowns: Object.fromEntries(this.cooldowns),
    };
  }

  restoreFromJSON(data: any): void {
    this.missions = (data.missions || []).map((m: any) => ({
      id: m.id,
      sourceIndex: m.sourceIndex,
      destIndex: m.destIndex,
      srcX: m.srcX,
      srcY: m.srcY,
      dstX: m.dstX,
      dstY: m.dstY,
      progress: m.progress,
      exportResource: m.exportResource,
      cargoAmount: m.cargoAmount,
      speed: m.speed,
      returning: m.returning,
    }));
    this.nextMissionId = data.nextMissionId || 1000;
    this.cooldowns = new Map(Object.entries(data.cooldowns || {}).map(
      ([k, v]) => [parseInt(k), v as number],
    ));
  }
}