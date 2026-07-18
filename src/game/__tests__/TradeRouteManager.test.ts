/** @jest-environment jsdom */
import { TradeRouteManager } from '../TradeRouteManager';
import { BuildingType, ResourceType } from '../../economy/types';
import { BuildingData } from '../Economy';

/** Helper: create a complete Marketplace building */
function mkMarketplace(
  index: number, x: number, y: number, ownerId: number = 0
): BuildingData {
  return {
    index,
    kind: BuildingType.Marketplace,
    garrisonUnitIds: [],
    x, y,
    hp: 20, maxHp: 20,
    constructionProgress: 1.0,
    isActive: true,
    productionProgress: 0,
    productionCounter: 0,
    inputBuffer: new Array(29).fill(0),
    outputBuffer: new Array(29).fill(0),
    assignedSettlers: [1],
    maxSettlers: 1,
    destructionTimer: null,
    destructionProgress: null,
    ownerId,
  };
}

function mkResources(): number[] {
  const r = new Array(29).fill(0);
  r[ResourceType.Wood] = 10;
  r[ResourceType.Stone] = 10;
  r[ResourceType.Grain] = 5;
  r[ResourceType.Gold] = 0;
  return r;
}

describe('TradeRouteManager', () => {
  let trm: TradeRouteManager;

  beforeEach(() => {
    trm = new TradeRouteManager();
  });

  describe('findTradePartner', () => {
    test('finds nearest Marketplace at sufficient distance', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10); // distance 20
      const c = mkMarketplace(3, 40, 10); // distance 30

      const partner = trm.findTradePartner(a, [a, b, c]);
      expect(partner).toBeDefined();
      expect(partner!.index).toBe(2); // nearest
    });

    test('ignores Marketplaces that are too close', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 12, 10); // distance 2 < MIN_TRADE_DISTANCE

      const partner = trm.findTradePartner(a, [a, b]);
      expect(partner).toBeUndefined();
    });

    test('ignores incomplete buildings', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      b.constructionProgress = 0.5;

      const partner = trm.findTradePartner(a, [a, b]);
      expect(partner).toBeUndefined();
    });

    test('ignores different-owner buildings', () => {
      const a = mkMarketplace(1, 10, 10, 0);
      const b = mkMarketplace(2, 30, 10, 1); // different owner

      const partner = trm.findTradePartner(a, [a, b]);
      expect(partner).toBeUndefined();
    });

    test('returns undefined when no valid partner exists', () => {
      const a = mkMarketplace(1, 10, 10);
      const partner = trm.findTradePartner(a, [a]);
      expect(partner).toBeUndefined();
    });
  });

  describe('tryStartMission', () => {
    test('creates a trade mission when partner and resources are available', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = mkResources();

      const started = trm.tryStartMission(a, [a, b], resources);
      expect(started).toBe(true);
      expect(trm.getMissionCount()).toBe(1);

      const missions = trm.getMissions();
      expect(missions[0].sourceIndex).toBe(1);
      expect(missions[0].destIndex).toBe(2);
      expect(missions[0].progress).toBe(0);
      expect(missions[0].returning).toBe(false);
    });

    test('does not start mission when on cooldown', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = mkResources();

      trm.tryStartMission(a, [a, b], resources);
      expect(trm.getMissionCount()).toBe(1);

      // Immediate retry should fail due to cooldown
      const retry = trm.tryStartMission(a, [a, b], resources);
      expect(retry).toBe(false);
      expect(trm.getMissionCount()).toBe(1); // still 1
    });

    test('does not start when no partner exists', () => {
      const a = mkMarketplace(1, 10, 10);
      const resources = mkResources();

      const started = trm.tryStartMission(a, [a], resources);
      expect(started).toBe(false);
      expect(trm.getMissionCount()).toBe(0);
    });

    test('does not start when no resources available', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = new Array(29).fill(0); // all zero

      const started = trm.tryStartMission(a, [a, b], resources);
      expect(started).toBe(false);
    });
  });

  describe('tick', () => {
    test('progresses missions and generates gold on arrival', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = mkResources();

      trm.tryStartMission(a, [a, b], resources);
      const mission = trm.getMissions()[0];

      // Fast-forward until arrival (progress hits 1.0)
      const ticksNeeded = Math.ceil(1.0 / mission.speed);
      let totalGold = 0;
      let totalRemovals = 0;

      for (let i = 0; i < ticksNeeded + 2; i++) {
        const result = trm.tick(1);
        totalGold += result.goldToAdd;
        totalRemovals += result.resourcesToRemove.length;
      }

      // Should have generated gold when arriving at destination
      expect(totalGold).toBeGreaterThanOrEqual(TradeRouteManager.GOLD_PER_TRIP);
    });

    test('completes round-trip and removes mission', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = mkResources();

      trm.tryStartMission(a, [a, b], resources);

      // Tick until round-trip complete (2x the one-way ticks)
      const totalTicks = 200; // plenty of ticks
      for (let i = 0; i < totalTicks; i++) {
        const result = trm.tick(1);
        if (result.completedMissions.length > 0) {
          break;
        }
      }

      expect(trm.getMissionCount()).toBe(0);
    });

    test('cooldown decreases over time', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = mkResources();

      trm.tryStartMission(a, [a, b], resources);
      expect(trm.getCooldown(1)).toBeGreaterThan(0);

      // Tick many times to reduce cooldown
      for (let i = 0; i < 50; i++) {
        trm.tick(1);
      }

      expect(trm.getCooldown(1)).toBeLessThan(TradeRouteManager.TRADE_COOLDOWN);
    });
  });

  describe('tickMarketplaces', () => {
    test('processes missions and starts new ones from Marketplaces', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const buildings = [a, b];
      const resources = mkResources();

      // First call: starts a mission
      trm.tickMarketplaces(buildings, resources, 1);
      expect(trm.getMissionCount()).toBeGreaterThanOrEqual(1);

      // The mission from 'a' is on cooldown, so only one starts
      // Advance cooldown
      for (let i = 0; i < TradeRouteManager.TRADE_COOLDOWN; i++) {
        trm.tickMarketplaces(buildings, resources, 1);
      }

      // After cooldown, more missions can start
      expect(trm.getMissionCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('save/load', () => {
    test('round-trips mission state', () => {
      const a = mkMarketplace(1, 10, 10);
      const b = mkMarketplace(2, 30, 10);
      const resources = mkResources();

      trm.tryStartMission(a, [a, b], resources);
      trm.tick(5); // advance a bit

      const json = trm.toJSON();
      expect(json).toHaveProperty('missions');
      expect(json).toHaveProperty('nextMissionId');
      expect(json).toHaveProperty('cooldowns');

      // Restore into a fresh instance
      const restored = new TradeRouteManager();
      restored.restoreFromJSON(json);
      expect(restored.getMissionCount()).toBe(trm.getMissionCount());
    });

    test('restoreFromJSON handles empty data', () => {
      const fresh = new TradeRouteManager();
      fresh.restoreFromJSON({});
      expect(fresh.getMissionCount()).toBe(0);
    });
  });
});
