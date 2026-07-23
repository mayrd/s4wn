/**
 * @jest-environment jsdom
 */

import { MaritimeTradeManager } from '../MaritimeTradeManager';
import { BuildingType, ResourceType } from '../../economy/types';
import { BuildingData } from '../Economy';

function makeDock(index: number, x: number, y: number, ownerId = 0, completed = true): BuildingData {
  return {
    index,
    kind: BuildingType.LandingDock,
    x, y,
    hp: 100,
    maxHp: 100,
    constructionProgress: completed ? 1.0 : 0.5,
    isActive: completed,
    productionProgress: 0,
    productionCounter: 0,
    inputBuffer: [],
    outputBuffer: [],
    assignedSettlers: [],
    maxSettlers: 1,
    destructionTimer: null,
    destructionProgress: null,
    ownerId,
  };
}

describe('MaritimeTradeManager', () => {
  let manager: MaritimeTradeManager;

  beforeEach(() => {
    manager = new MaritimeTradeManager();
  });

  describe('findTradePartner', () => {
    test('finds nearest valid LandingDock', () => {
      const source = makeDock(1, 10, 10);
      const dockA = makeDock(2, 2, 2);  // distance sqrt(128) ≈ 11.3 (> MIN_TRADE_DISTANCE)
      const dockB = makeDock(3, 25, 25); // distance sqrt(450) ≈ 21.21
      const dockC = makeDock(4, 40, 40); // further

      const partner = manager.findTradePartner(source, [source, dockA, dockB, dockC]);
      expect(partner).toBe(dockA);
      expect(partner!.x).toBe(2);
      expect(partner!.y).toBe(2);
    });

    test('skips incomplete docks', () => {
      const source = makeDock(1, 10, 10);
      const incomplete = makeDock(2, 5, 5, 0, false);
      const valid = makeDock(3, 25, 25);

      const partner = manager.findTradePartner(source, [source, incomplete, valid]);
      expect(partner).toBe(valid);
    });

    test('skips docks too close (under MIN_TRADE_DISTANCE)', () => {
      const source = makeDock(1, 10, 10);
      const tooClose = makeDock(2, 11, 11); // distance sqrt(2) ≈ 1.4
      const farEnough = makeDock(3, 25, 25);

      const partner = manager.findTradePartner(source, [source, tooClose, farEnough]);
      expect(partner).toBe(farEnough);
    });

    test('skips docks owned by other players', () => {
      const source = makeDock(1, 10, 10);
      const enemyDock = makeDock(2, 25, 25, 1);

      const partner = manager.findTradePartner(source, [source, enemyDock]);
      expect(partner).toBeUndefined();
    });

    test('returns undefined when no partners exist', () => {
      const source = makeDock(1, 10, 10);
      const partner = manager.findTradePartner(source, [source]);
      expect(partner).toBeUndefined();
    });
  });

  describe('tryStartMission', () => {
    test('creates a mission when valid partner and resources exist', () => {
      const source = makeDock(1, 10, 10);
      const partner = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(0);
      resources[ResourceType.Wood] = 10;

      const result = manager.tryStartMission(source, [source, partner], resources);
      expect(result).toBe(true);
      expect(manager.getMissionCount()).toBe(1);

      const mission = manager.getMissions()[0];
      expect(mission.srcX).toBe(10);
      expect(mission.srcY).toBe(10);
      expect(mission.dstX).toBe(25);
      expect(mission.dstY).toBe(25);
      expect(mission.cargoAmount).toBe(5); // min(5, 10)
      expect(mission.exportResource).toBe(ResourceType.Wood);
      expect(mission.speed).toBe(MaritimeTradeManager.TRAVEL_SPEED);
    });

    test('respects cooldown', () => {
      const source = makeDock(1, 10, 10);
      const partner = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(5);

      // First mission succeeds
      expect(manager.tryStartMission(source, [source, partner], resources)).toBe(true);
      // Second attempt while on cooldown
      expect(manager.tryStartMission(source, [source, partner], resources)).toBe(false);
    });

    test('fails with insufficient resources', () => {
      const source = makeDock(1, 10, 10);
      const partner = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(0);
      resources[ResourceType.Wood] = 1; // less than 3

      const result = manager.tryStartMission(source, [source, partner], resources);
      expect(result).toBe(false);
      expect(manager.getMissionCount()).toBe(0);
    });
  });

  describe('tick', () => {
    test('advances mission progress', () => {
      const source = makeDock(1, 10, 10);
      const partner = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(10);

      manager.tryStartMission(source, [source, partner], resources);
      const mission = manager.getMissions()[0];
      const progressBefore = mission.progress;

      manager.tick(1);
      expect(mission.progress).toBeGreaterThan(progressBefore);
    });

    test('completes outbound journey and starts return', () => {
      const source = makeDock(1, 10, 10);
      const partner = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(10);

      manager.tryStartMission(source, [source, partner], resources);
      const mission = manager.getMissions()[0];
      mission.progress = 0.99; // nearly there

      const result = manager.tick(10); // big speedMult to push past 1.0
      expect(mission.returning).toBe(true);
      expect(mission.progress).toBeLessThan(1.0); // reset for return
      expect(result.goldToAdd).toBe(MaritimeTradeManager.GOLD_PER_TRIP);
      expect(result.resourcesToRemove.length).toBe(1);
      expect(result.resourcesToRemove[0].type).toBe(mission.exportResource);
      expect(result.resourcesToRemove[0].amount).toBe(mission.cargoAmount);
    });

    test('completes round-trip and removes mission', () => {
      const source = makeDock(1, 10, 10);
      const partner = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(10);

      manager.tryStartMission(source, [source, partner], resources);
      const mission = manager.getMissions()[0];
      mission.progress = 0.99;
      mission.returning = true;

      expect(manager.getMissionCount()).toBe(1);
      const result = manager.tick(10);
      expect(result.completedMissions.length).toBe(1);
      expect(manager.getMissionCount()).toBe(0);
    });
  });

  describe('tickLandingDocks', () => {
    test('auto-starts missions from active docks', () => {
      const dock1 = makeDock(1, 10, 10);
      const dock2 = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(10);

      manager.tickLandingDocks([dock1, dock2], resources, 1);
      expect(manager.getMissionCount()).toBeGreaterThanOrEqual(1);
    });

    test('does not start missions from inactive docks', () => {
      const dock1 = makeDock(1, 10, 10, 0, true);
      dock1.isActive = false;
      const dock2 = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(10);

      manager.tickLandingDocks([dock1, dock2], resources, 1);
      // Only dock2 can start missions, but needs a partner
      // dock1 is inactive so only 0 or 1 missions
      const count = manager.getMissionCount();
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  describe('serialization', () => {
    test('toJSON / restoreFromJSON round-trip', () => {
      const dock1 = makeDock(1, 10, 10);
      const dock2 = makeDock(2, 25, 25);
      const resources: number[] = new Array(30).fill(10);

      manager.tryStartMission(dock1, [dock1, dock2], resources);
      const originalMission = manager.getMissions()[0];

      const json = manager.toJSON();
      const restored = new MaritimeTradeManager();
      restored.restoreFromJSON(json);

      expect(restored.getMissionCount()).toBe(1);
      const restoredMission = restored.getMissions()[0];
      expect(restoredMission.id).toBe(originalMission.id);
      expect(restoredMission.srcX).toBe(originalMission.srcX);
      expect(restoredMission.dstX).toBe(originalMission.dstX);
      expect(restoredMission.exportResource).toBe(originalMission.exportResource);
      expect(restoredMission.cargoAmount).toBe(originalMission.cargoAmount);
    });
  });
});