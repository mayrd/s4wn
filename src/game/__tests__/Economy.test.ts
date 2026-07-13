/**
 * TypeScript tests for Economy module
 *
 * Covers resource management, building placement, production tick,
 * damage/destruction, and save/load round-trip.
 */

import { Economy } from '../Economy';
import { Map as GameMap } from '../Map';
import { Terrain } from '../types';
import { BuildingType, ResourceType } from '../../economy/types';

/** Build a deterministic, fully-grass (buildable) map owned by player 1. */
function makeBuildableMap(w: number, h: number, ownerId: number = 1): GameMap {
  const map = new GameMap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map.setTerrain(x, y, Terrain.Grass);
    }
  }
  map.updateTerritory(ownerId, [{ x: Math.floor(w / 2), y: Math.floor(h / 2), radius: w }]);
  return map;
}

describe('Economy — resource management', () => {
  test('starts with initial Wood=20, Stone=10', () => {
    const economy = new Economy();
    expect(economy.getResource(ResourceType.Wood)).toBe(20);
    expect(economy.getResource(ResourceType.Stone)).toBe(10);
    expect(economy.getResource(ResourceType.Gold)).toBe(0);
  });

  test('addResource increases resource up to storage capacity', () => {
    const economy = new Economy();
    const added = economy.addResource(ResourceType.Gold, 50);
    expect(added).toBe(50);
    expect(economy.getResource(ResourceType.Gold)).toBe(50);
  });

  test('addResource clamps at storageCapacity', () => {
    const economy = new Economy();
    economy.storageCapacity = 100;
    economy.addResource(ResourceType.Gold, 90);
    const added = economy.addResource(ResourceType.Gold, 50);
    expect(added).toBe(10); // only 10 more room
    expect(economy.getResource(ResourceType.Gold)).toBe(100);
  });

  test('removeResource succeeds when sufficient and fails when not', () => {
    const economy = new Economy();
    expect(economy.removeResource(ResourceType.Wood, 5)).toBe(true);
    expect(economy.getResource(ResourceType.Wood)).toBe(15);
    expect(economy.removeResource(ResourceType.Wood, 1000)).toBe(false);
    expect(economy.getResource(ResourceType.Wood)).toBe(15); // unchanged
  });

  test('canAfford / spendResources', () => {
    const economy = new Economy();
    const cost = [{ resource: ResourceType.Wood, amount: 10 }, { resource: ResourceType.Stone, amount: 5 }];
    expect(economy.canAfford(cost)).toBe(true);
    expect(economy.spendResources(cost)).toBe(true);
    expect(economy.getResource(ResourceType.Wood)).toBe(10);
    expect(economy.getResource(ResourceType.Stone)).toBe(5);
  });

  test('spendResources fails and does not partially deduct if unaffordable', () => {
    const economy = new Economy();
    const cost = [{ resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Gold, amount: 100 }];
    expect(economy.spendResources(cost)).toBe(false);
    // Wood should remain untouched since canAfford check happens first
    expect(economy.getResource(ResourceType.Wood)).toBe(20);
  });

  test('getResourceCounts returns a defensive copy', () => {
    const economy = new Economy();
    const counts = economy.getResourceCounts();
    counts[ResourceType.Wood] = 999;
    expect(economy.getResource(ResourceType.Wood)).toBe(20);
  });
});

describe('Economy — building placement', () => {
  test('tryPlaceBuilding succeeds on buildable, owned, empty tile with sufficient resources', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const building = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1);
    expect(building).not.toBeNull();
    expect(building!.kind).toBe(BuildingType.Woodcutter);
    expect(building!.x).toBe(5);
    expect(building!.y).toBe(5);
    expect(building!.constructionProgress).toBe(0);
    expect(economy.buildings.length).toBe(1);
  });

  test('tryPlaceBuilding deducts cost from resources', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    // Woodcutter costs 2 wood
    economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1);
    expect(economy.getResource(ResourceType.Wood)).toBe(18);
  });

  test('tryPlaceBuilding fails when resources insufficient', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    // Fortress costs 20 stone + 12 planks + 8 iron ore -- way more than starting resources
    const building = economy.tryPlaceBuilding(BuildingType.Fortress, 5, 5, map, 1);
    expect(building).toBeNull();
    expect(economy.buildings.length).toBe(0);
  });

  test('tryPlaceBuilding fails on unbuildable (water) tile', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    map.setTerrain(5, 5, Terrain.Water);
    const building = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1);
    expect(building).toBeNull();
  });

  test('tryPlaceBuilding fails when tile is not owned by ownerId', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 2); // owned by player 2
    const building = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1);
    expect(building).toBeNull();
  });

  test('tryPlaceBuilding fails on collision with existing building', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1);
    const second = economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1);
    expect(second).toBeNull();
    expect(economy.buildings.length).toBe(1);
  });

  test('building index increments for successive buildings', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const b1 = economy.tryPlaceBuilding(BuildingType.Woodcutter, 1, 1, map, 1);
    const b2 = economy.tryPlaceBuilding(BuildingType.Woodcutter, 2, 2, map, 1);
    expect(b2!.index).toBeGreaterThan(b1!.index);
  });

  test('getBuilding / getBuildingAt / getBuildingsByKind', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const b = economy.tryPlaceBuilding(BuildingType.Farm, 3, 3, map, 1)!;
    expect(economy.getBuilding(b.index)).toBe(b);
    expect(economy.getBuildingAt(3, 3)).toBe(b);
    expect(economy.getBuildingAt(0, 0)).toBeUndefined();
    expect(economy.getBuildingsByKind(BuildingType.Farm)).toEqual([b]);
  });

  test('removeBuilding removes it from the list', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const b = economy.tryPlaceBuilding(BuildingType.Farm, 3, 3, map, 1)!;
    expect(economy.removeBuilding(b.index)).toBe(true);
    expect(economy.buildings.length).toBe(0);
    expect(economy.removeBuilding(9999)).toBe(false);
  });
});

describe('Economy — production tick', () => {
  test('construction progresses toward completion and marks isActive', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    // Farm buildTime = 20 ticks
    const building = economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1)!;
    expect(building.constructionProgress).toBe(0);

    for (let i = 0; i < 20; i++) {
      economy.tick(1.0);
    }

    expect(building.constructionProgress).toBe(1.0);
    expect(building.isActive).toBe(true);
  });

  test('getCompleteBuildings only returns fully constructed buildings', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1);
    expect(economy.getCompleteBuildings().length).toBe(0);
    for (let i = 0; i < 20; i++) economy.tick(1.0);
    expect(economy.getCompleteBuildings().length).toBe(1);
  });

  test('getRecentConstructionCompletions reports completions for that tick only', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1);
    for (let i = 0; i < 19; i++) economy.tick(1.0);
    expect(economy.getRecentConstructionCompletions()).toBe(0);
    economy.tick(1.0); // completes on this tick
    expect(economy.getRecentConstructionCompletions()).toBe(1);
    economy.tick(1.0); // no longer completing
    expect(economy.getRecentConstructionCompletions()).toBe(0);
  });

  test('Castle has 0 buildTime and is immediately active', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    // Castle costs 10 wood + 5 stone, within starting resources
    const castle = economy.tryPlaceBuilding(BuildingType.Castle, 5, 5, map, 1)!;
    economy.tick(1.0);
    expect(castle.constructionProgress).toBe(1.0);
    expect(castle.isActive).toBe(true);
  });

  test('production requires assigned settler for settler-requiring buildings', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const woodcutter = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1)!;
    // Complete construction (buildTime not defined for Woodcutter => defaults 0 via buildTime())
    // Woodcutter buildTime returns 20 per src/economy/types.ts default within Farm/Fisherman/Woodcutter list
    for (let i = 0; i < 20; i++) economy.tick(1.0);
    expect(woodcutter.constructionProgress).toBe(1.0);

    const woodBefore = economy.getResource(ResourceType.Wood);
    // Woodcutter production interval = 15 ticks, requires settler; without settler, no production
    for (let i = 0; i < 20; i++) economy.tick(1.0);
    expect(economy.getResource(ResourceType.Wood)).toBe(woodBefore);
  });

  test('production with assigned settler produces resources with no inputs (raw producer)', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const woodcutter = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1)!;
    for (let i = 0; i < 20; i++) economy.tick(1.0); // finish construction
    woodcutter.assignedSettlers.push(1); // fake settler assignment

    const woodBefore = economy.getResource(ResourceType.Wood);
    // Woodcutter interval is 15 ticks, output 2 wood, no inputs required
    for (let i = 0; i < 15; i++) economy.tick(1.0);
    expect(economy.getResource(ResourceType.Wood)).toBeGreaterThan(woodBefore);
  });

  test('production with inputs is gated on available inputBuffer', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    // Sawmill requires 2 Wood input -> produces 1 Planks; needs settler
    const sawmill = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 1)!;
    for (let i = 0; i < 32; i++) economy.tick(1.0); // buildTime for Sawmill = 30
    expect(sawmill.constructionProgress).toBeCloseTo(1.0);
    sawmill.assignedSettlers.push(1);

    // No inputBuffer stocked -> no planks produced even after interval elapses
    for (let i = 0; i < 20; i++) economy.tick(1.0);
    expect(economy.getResource(ResourceType.Planks)).toBe(0);

    // Stock the input buffer directly (simulating delivered wood) and tick again
    sawmill.inputBuffer[ResourceType.Wood] = 10;
    for (let i = 0; i < 20; i++) economy.tick(1.0);
    expect(economy.getResource(ResourceType.Planks)).toBeGreaterThan(0);
  });
});

describe('Economy — damage & destruction', () => {
  test('damageBuilding reduces hp and triggers destruction at 0 hp', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const building = economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1)!;
    const initialHp = building.hp;
    const justDestroyed = economy.damageBuilding(building.index, 10);
    expect(justDestroyed).toBe(false);
    expect(building.hp).toBe(initialHp - 10);

    const destroyed = economy.damageBuilding(building.index, initialHp);
    expect(destroyed).toBe(true);
    expect(building.hp).toBe(0);
    expect(building.destructionTimer).toBe(5.0);
  });

  test('damageBuilding on unknown index returns false', () => {
    const economy = new Economy();
    expect(economy.damageBuilding(9999, 10)).toBe(false);
  });

  test('destruction sequence removes the building after timer elapses', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const building = economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1)!;
    economy.damageBuilding(building.index, building.hp); // destroy -> timer 5.0

    // tick reduces destructionTimer by 0.1 * speedMult per tick; 5.0 / 0.1 = 50 ticks
    for (let i = 0; i < 75; i++) {
      economy.tick(1.0);
    }
    expect(economy.getBuilding(building.index)).toBeUndefined();
  });

  test('getDestructionProgress returns null before destruction and a number during', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const building = economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1)!;
    expect(economy.getDestructionProgress(building.index)).toBeNull();
    economy.damageBuilding(building.index, building.hp);
    expect(economy.getDestructionProgress(building.index)).toBe(0);
  });
});

describe('Economy — building summary', () => {
  test('getBuildingSummary reflects building state', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    const building = economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1)!;
    const summary = economy.getBuildingSummary();
    expect(summary.length).toBe(1);
    expect(summary[0].index).toBe(building.index);
    expect(summary[0].complete).toBe(false);
    expect(summary[0].ownerId).toBe(1);
  });
});

describe('Economy — save/load round-trip', () => {
  test('toJSON/restoreFromJSON preserves resources and buildings', () => {
    const economy = new Economy();
    const map = makeBuildableMap(10, 10, 1);
    economy.tryPlaceBuilding(BuildingType.Farm, 5, 5, map, 1);
    economy.addResource(ResourceType.Gold, 42);

    const json = economy.toJSON();

    const restored = new Economy();
    restored.restoreFromJSON(json);

    expect(restored.getResource(ResourceType.Gold)).toBe(42);
    expect(restored.buildings.length).toBe(1);
    expect(restored.buildings[0].kind).toBe(BuildingType.Farm);
    expect(restored.buildings[0].x).toBe(5);
    expect(restored.buildings[0].y).toBe(5);
  });
});
