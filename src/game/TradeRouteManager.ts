/**
 * S4WN Babylon.js/TypeScript - Trade Route Manager
 *
 * Manages donkey-based land trade routes between Marketplace buildings.
 * Active Marketplaces periodically dispatch trade missions to other
 * Marketplaces, transferring resources and generating gold income.
 *
 * BASE.md § Logistics:
 *   Marketplace: Creates Donkeys / Land trade (Trader worker)
 */

import { BuildingType, ResourceType } from '../economy/types';
import { BuildingData } from './Economy';

export interface TradeMission {
  /** Unique mission ID */
  id: number;
  /** Source marketplace building index */
  sourceIndex: number;
  /** Destination marketplace building index */
  destIndex: number;
  /** Source position */
  srcX: number;
  srcY: number;
  /** Destination position */
  dstX: number;
  dstY: number;
  /** Progress from 0 (at source) to 1 (at destination) */
  progress: number;
  /** Resource being exported */
  exportResource: ResourceType;
  /** Amount being carried */
  cargoAmount: number;
  /** Travel speed (progress per tick) */
  speed: number;
  /** Whether returning home (1 = returning, 0 = outbound) */
  returning: boolean;
}

export class TradeRouteManager {
  private missions: TradeMission[] = [];
  private nextMissionId: number = 1;
  /** Cooldown counters per marketplace to prevent spam */
  private cooldowns: Map<number, number> = new Map();
  /** Minimum number of ticks between trade missions from the same marketplace */
  static readonly TRADE_COOLDOWN = 100;
  /** Minimum distance between marketplaces to be valid trade partners */
  static readonly MIN_TRADE_DISTANCE = 5;
  /** Base travel speed (fraction per tick) */
  static readonly TRAVEL_SPEED = 0.02;
  /** Gold generated per completed round-trip */
  static readonly GOLD_PER_TRIP = 3;

  /**
   * Find the nearest active Marketplace to the given source that is
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
      if (b.kind !== BuildingType.Marketplace) continue;
      if (b.constructionProgress < 1.0) continue; // not completed
      if (b.ownerId !== sourceBuilding.ownerId) continue; // same player only (for now)

      const dx = b.x - sourceBuilding.x;
      const dy = b.y - sourceBuilding.y;
      const distSq = dx * dx + dy * dy;
      const minDistSq = TradeRouteManager.MIN_TRADE_DISTANCE ** 2;

      if (distSq < minDistSq) continue; // too close
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = b;
      }
    }

    return best;
  }

  /**
   * Try to start a trade mission from a marketplace.
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

    // Pick a non-zero resource to export
    const exportOptions: ResourceType[] = [];
    for (let i = 0; i < availableResources.length; i++) {
      if (availableResources[i] > 1) {
        exportOptions.push(i as ResourceType);
      }
    }
    if (exportOptions.length === 0) return false;

    const exportRes = exportOptions[Math.floor(Math.random() * exportOptions.length)];
    const cargoAmount = Math.min(2, availableResources[exportRes]);

    const mission: TradeMission = {
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
      speed: TradeRouteManager.TRAVEL_SPEED,
      returning: false,
    };

    this.missions.push(mission);
    this.cooldowns.set(sourceBuilding.index, TradeRouteManager.TRADE_COOLDOWN);
    return true;
  }

  /**
   * Tick all active trade missions. Returns an object with resource deltas
   * to apply to the economy (resource removals and gold additions).
   */
  tick(speedMult: number): {
    resourcesToRemove: Array<{ type: ResourceType; amount: number }>;
    goldToAdd: number;
    completedMissions: TradeMission[];
  } {
    // Decrement cooldowns
    for (const [key, val] of this.cooldowns) {
      if (val > 0) {
        this.cooldowns.set(key, Math.max(0, val - speedMult));
      }
    }

    const resourcesToRemove: Array<{ type: ResourceType; amount: number }> = [];
    let goldToAdd = 0;
    const completedMissions: TradeMission[] = [];

    for (const mission of this.missions) {
      mission.progress += mission.speed * speedMult;

      if (mission.progress >= 1.0 && !mission.returning) {
        // Arrived at destination — drop cargo, start return trip
        resourcesToRemove.push({
          type: mission.exportResource,
          amount: mission.cargoAmount,
        });

        // Generate gold at destination
        goldToAdd += TradeRouteManager.GOLD_PER_TRIP;

        // Start return journey
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
   * Tick Marketplace trade logic integrated into the economy tick.
   * Checks all completed Marketplaces and starts missions if possible.
   */
  tickMarketplaces(
    buildings: BuildingData[],
    resources: number[],
    speedMult: number,
  ): { resourcesToRemove: Array<{ type: ResourceType; amount: number }>; goldToAdd: number } {
    // First, tick existing missions
    const tickResult = this.tick(speedMult);

    // Then try to start new missions from active Marketplaces
    for (const building of buildings) {
      if (building.kind !== BuildingType.Marketplace) continue;
      if (building.constructionProgress < 1.0) continue;
      if (!building.isActive) continue;
      if (building.assignedSettlers.length === 0) continue;

      this.tryStartMission(building, buildings, resources);
    }

    return { resourcesToRemove: tickResult.resourcesToRemove, goldToAdd: tickResult.goldToAdd };
  }

  // ── Query / inspection ───────────────────────────────────────────

  getMissions(): TradeMission[] {
    return [...this.missions];
  }

  getMissionCount(): number {
    return this.missions.length;
  }

  getCooldown(buildingIndex: number): number {
    return this.cooldowns.get(buildingIndex) || 0;
  }

  // ── Save / Load ──────────────────────────────────────────────────

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
    this.nextMissionId = data.nextMissionId || 1;
    this.cooldowns = new Map(Object.entries(data.cooldowns || {}).map(
      ([k, v]) => [parseInt(k), v as number],
    ));
  }
}
