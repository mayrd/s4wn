/**
 * TypeScript tests for Military & Combat milestone.
 *
 * Covers:
 * - Unit combat stats, rank bonuses, XP promotion
 * - Bowman projectile target tracking
 * - Economy combat strength calculation
 * - Garrison/defender logic
 */

import { Map as GameMap } from '../Map';
import { Terrain } from '../types';
import { Economy } from '../Economy';
import { UnitManager } from '../UnitManager';
import { CombatAI } from '../CombatAI';
import { UnitKind, UnitStance } from '../types';
import { BuildingType, ResourceType } from '../../economy/types';

/** Build a deterministic, fully-grass (buildable) map owned by player 1. */
function makeBuildableMap(w: number, h: number, ownerId = 1): GameMap {
  const map = new GameMap(w, h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      map.setTerrain(x, y, Terrain.Grass);
    }
  }
  map.updateTerritory(ownerId, [{ x: 0, y: 0, radius: Math.max(w, h) }]);
  return map;
}

describe('Military & Combat System', () => {
  describe('Unit combat stats and rank', () => {
    test('Swordsman has correct base stats', () => {
      const um = new UnitManager();
      const s = um.spawnUnit(UnitKind.Swordsman, 0, 0);
      expect(s.getMaxHp()).toBe(150);
      expect(s.getAttackDamage()).toBe(25);
      expect(s.getAttackRange()).toBe(1);
      expect(s.getAttackInterval()).toBe(60);
    });

    test('Bowman has ranged attack', () => {
      const um = new UnitManager();
      const b = um.spawnUnit(UnitKind.Bowman, 0, 0);
      expect(b.getAttackRange()).toBe(5);
      expect(b.getAttackInterval()).toBe(45);
    });

    test('rank increases attack damage by 5 per rank', () => {
      const um = new UnitManager();
      const s = um.spawnUnit(UnitKind.Swordsman, 0, 0);
      expect(s.getAttackDamage()).toBe(25);
      s.rank = 1;
      expect(s.getAttackDamage()).toBe(30);
      s.rank = 2;
      expect(s.getAttackDamage()).toBe(35);
      s.rank = 3;
      expect(s.getAttackDamage()).toBe(40);
    });

    test('addExperience promotes unit when threshold reached', () => {
      const um = new UnitManager();
      const s = um.spawnUnit(UnitKind.Swordsman, 0, 0);
      expect(s.rank).toBe(0);
      const promoted = s.addExperience(100);
      expect(promoted).toBe(true);
      expect(s.rank).toBe(1);
      expect(s.hp).toBe(s.getMaxHp()); // heal on promotion
    });

    test('Settlers cannot gain experience', () => {
      const um = new UnitManager();
      const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
      const promoted = settler.addExperience(999);
      expect(promoted).toBe(false);
      expect(settler.rank).toBe(0);
    });
  });

  describe('Bowman projectile target tracking', () => {
    test('projectile target is set when engaging enemy', () => {
      const um = new UnitManager();
      const bowman = um.spawnUnit(UnitKind.Bowman, 0, 0);
      const enemy = um.spawnUnit(UnitKind.Swordsman, 4, 0); // in range
      bowman.stance = UnitStance.Aggressive;

      const ai = new CombatAI(um);
      ai.tick();

      expect(bowman.projectileTargetX).toBeCloseTo(4);
      expect(bowman.projectileTargetY).toBeCloseTo(0);
    });

    test('projectile target is cleared when no target', () => {
      const um = new UnitManager();
      const bowman = um.spawnUnit(UnitKind.Bowman, 0, 0);
      bowman.projectileTargetX = 5;
      bowman.projectileTargetY = 5;

      const ai = new CombatAI(um);
      ai.tick(); // No enemies nearby

      expect(bowman.projectileTargetX).toBeNull();
      expect(bowman.projectileTargetY).toBeNull();
    });

    test('Swordsman does not track projectile targets', () => {
      const um = new UnitManager();
      const sword = um.spawnUnit(UnitKind.Swordsman, 0, 0);
      const enemy = um.spawnUnit(UnitKind.Swordsman, 1, 0);
      sword.stance = UnitStance.Aggressive;

      const ai = new CombatAI(um);
      ai.tick();

      expect(sword.projectileTargetX).toBeNull();
      expect(sword.projectileTargetY).toBeNull();
    });
  });

  describe('Combat Strength (Kampfkraft)', () => {
    test('combatStrength starts at 0', () => {
      const economy = new Economy();
      expect(economy.combatStrength).toBe(0);
    });

    test('combatStrength increases with gold bars (floor(gold/10))', () => {
      const economy = new Economy();
      economy.resources[ResourceType.Gold] = 100; // bypass capacity
      economy.tick(1.0);
      expect(economy.combatStrength).toBe(10);
    });

    test('monuments add +2 combat strength each', () => {
      const economy = new Economy();
      economy.resources[ResourceType.Gold] = 50; // bypass capacity
      // Place two monuments via direct push
      economy.buildings.push({
        index: 1, kind: BuildingType.Bust as any, x: 0, y: 0,
        hp: 100, maxHp: 100, constructionProgress: 1.0, isActive: true,
        productionProgress: 0, productionCounter: 0,
        inputBuffer: new Array(20).fill(0), outputBuffer: new Array(20).fill(0),
        assignedSettlers: [], maxSettlers: 1,
        destructionTimer: null, destructionProgress: null, ownerId: 1,
        garrisonUnitIds: [],
      });
      economy.buildings.push({
        index: 2, kind: BuildingType.Monument as any, x: 1, y: 0,
        hp: 100, maxHp: 100, constructionProgress: 1.0, isActive: true,
        productionProgress: 0, productionCounter: 0,
        inputBuffer: new Array(20).fill(0), outputBuffer: new Array(20).fill(0),
        assignedSettlers: [], maxSettlers: 1,
        destructionTimer: null, destructionProgress: null, ownerId: 1,
        garrisonUnitIds: [],
      });
      economy.tick(1.0);
      expect(economy.combatStrength).toBe(5 + 4); // 5 from gold, 4 from monuments
    });
  });

  describe('Garrison / defender logic', () => {
    test('Economy.garrisonUnit adds unit to building garrison', () => {
      const economy = new Economy();
      economy.resources[ResourceType.Planks] = 50;
      economy.resources[ResourceType.Stone] = 50;
      const building = economy.tryPlaceBuilding(BuildingType.GuardTower, 5, 5, makeBuildableMap(10, 10, 1), 1)!;
      expect(building).not.toBeNull();
      const ok = economy.garrisonUnit(building.index, 42);
      expect(ok).toBe(true);
      expect(economy.getGarrisonCount(building.index)).toBe(1);
      expect(economy.getGarrisonUnits(building.index)).toEqual([42]);
    });

    test('garrison fails when capacity reached', () => {
      const economy = new Economy();
      economy.resources[ResourceType.Planks] = 50;
      economy.resources[ResourceType.Stone] = 50;
      const building = economy.tryPlaceBuilding(BuildingType.GuardTower, 5, 5, makeBuildableMap(10, 10, 1), 1)!;
      expect(economy.garrisonUnit(building.index, 1)).toBe(true);
      expect(economy.garrisonUnit(building.index, 2)).toBe(false); // capacity=1
    });

    test('Economy.ungarrisonUnit removes unit from garrison', () => {
      const economy = new Economy();
      economy.resources[ResourceType.Planks] = 100;
      economy.resources[ResourceType.Stone] = 100;
      const building = economy.tryPlaceBuilding(BuildingType.Castle, 5, 5, makeBuildableMap(10, 10, 1), 1)!;
      economy.garrisonUnit(building.index, 10);
      expect(economy.getGarrisonCount(building.index)).toBe(1);
      expect(economy.ungarrisonUnit(building.index, 10)).toBe(true);
      expect(economy.getGarrisonCount(building.index)).toBe(0);
    });

    test('UnitManager.garrisonUnit marks unit as garrisoned', () => {
      const um = new UnitManager();
      const soldier = um.spawnUnit(UnitKind.Swordsman, 0, 0);
      expect(um.garrisonUnit(soldier.id, 5)).toBe(true);
      expect(soldier.isGarrisoned()).toBe(true);
      expect(soldier.garrisonBuildingIndex).toBe(5);
    });

    test('non-military units cannot garrison', () => {
      const um = new UnitManager();
      const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
      expect(um.garrisonUnit(settler.id, 5)).toBe(false);
      expect(settler.isGarrisoned()).toBe(false);
    });

    test('UnitManager.tickGarrisons makes units attack nearby enemies', () => {
      const um = new UnitManager();
      const economy = new Economy();
      economy.resources[ResourceType.Planks] = 50;
      economy.resources[ResourceType.Stone] = 50;
      const tower = economy.tryPlaceBuilding(BuildingType.GuardTower, 5, 5, makeBuildableMap(10, 10, 1), 1)!;
      const garrisoned = um.spawnUnit(UnitKind.Swordsman, 5, 5);
      um.garrisonUnit(garrisoned.id, tower.index);
      const enemy = um.spawnUnit(UnitKind.Swordsman, 8, 5); // within range

      um.tickGarrisons(economy, makeBuildableMap(10, 10, 1));

      expect(garrisoned.attackTargetId).toBe(enemy.id);
    });

    test('garrisoned units are forced out if building is destroyed', () => {
      const um = new UnitManager();
      const economy = new Economy();
      economy.resources[ResourceType.Planks] = 50;
      economy.resources[ResourceType.Stone] = 50;
      const tower = economy.tryPlaceBuilding(BuildingType.GuardTower, 5, 5, makeBuildableMap(10, 10, 1), 1)!;
      const garrisoned = um.spawnUnit(UnitKind.Swordsman, 5, 5);
      um.garrisonUnit(garrisoned.id, tower.index);
      economy.damageBuilding(tower.index, 9999); // destroy

      um.tickGarrisons(economy, makeBuildableMap(10, 10, 1));

      expect(garrisoned.isGarrisoned()).toBe(false);
    });
  });
});