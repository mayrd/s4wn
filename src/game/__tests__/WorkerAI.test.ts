/**
 * TypeScript tests for WorkerAI module
 */

import { WorkerAI } from '../WorkerAI';
import { Economy } from '../Economy';
import { UnitManager } from '../UnitManager';
import { Map as GameMap } from '../Map';
import { UnitKind, UnitState, Terrain } from '../types';
import { BuildingType, ResourceType } from '../../economy/types';

function makeOpenMap(w: number, h: number, ownerId = 1): GameMap {
  const map = new GameMap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map.setTerrain(x, y, Terrain.Grass);
    }
  }
  map.updateTerritory(ownerId, [{ x: w / 2, y: h / 2, radius: w }]);
  return map;
}

describe('WorkerAI — idle settler assignment', () => {
  test('assigns an idle settler to a raw-producer building needing workers', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    const woodcutter = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1)!;
    economy.tick(1.0); // buildTime for Woodcutter is 20 — not complete yet; but assignment only requires "getCompleteBuildings"

    // Force-complete for the test (Woodcutter buildTime=20; tick many times)
    for (let i = 0; i < 25; i++) economy.tick(1.0);
    expect(woodcutter.constructionProgress).toBeCloseTo(1.0);

    const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(settler.assignedBuilding).toBe(woodcutter.index);
    expect(woodcutter.assignedSettlers).toContain(settler.id);
  });

  test('does not assign settlers to buildings that are still under construction', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1);
    // No ticks — still under construction

    const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(settler.assignedBuilding).toBeNull();
  });

  test('does not assign settlers to buildings already at maxSettlers', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    const woodcutter = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1)!;
    for (let i = 0; i < 20; i++) economy.tick(1.0);
    woodcutter.assignedSettlers.push(999); // fill maxSettlers(Woodcutter)=1

    const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(settler.assignedBuilding).toBeNull();
  });

  test('does not assign settler to an input-gated building lacking required inputs', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    const sawmill = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 1)!;
    for (let i = 0; i < 35; i++) economy.tick(1.0); // buildTime=30
    expect(sawmill.constructionProgress).toBeCloseTo(1.0);
    // Sawmill needs Wood input in global storage; Economy starts with Wood=20 by default,
    // so remove it to simulate the input-gated "not affordable" case.
    economy.removeResource(0 as any, economy.getResourceByDiscriminant(0));

    const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(settler.assignedBuilding).toBeNull();
  });

  test('non-settler units are never assigned to buildings', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    const woodcutter = economy.tryPlaceBuilding(BuildingType.Woodcutter, 5, 5, map, 1)!;
    for (let i = 0; i < 20; i++) economy.tick(1.0);

    const swordsman = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(swordsman.assignedBuilding).toBeNull();
    expect(woodcutter.assignedSettlers).not.toContain(swordsman.id);
  });
});

describe('WorkerAI — movement toward assigned building', () => {
  test('assigned settler is issued a path toward the building when far away', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    const woodcutter = economy.tryPlaceBuilding(BuildingType.Woodcutter, 10, 10, map, 1)!;
    for (let i = 0; i < 20; i++) economy.tick(1.0);

    const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
    settler.assignTo(woodcutter.index);
    woodcutter.assignedSettlers.push(settler.id);

    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(settler.state).toBe(UnitState.Moving);
    expect(settler.path).not.toBeNull();
  });

  test('unassigns settler if its assigned building no longer exists', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();
    const settler = um.spawnUnit(UnitKind.Settler, 0, 0);
    settler.assignTo(12345); // a nonexistent building index

    const ai = new WorkerAI(economy, um, map);
    ai.tick();

    expect(settler.assignedBuilding).toBeNull();
  });
});

describe('WorkerAI — Logistics Carrier AI', () => {
  test('assigns free carrier, picks up item, and delivers it to demanding building', () => {
    const map = makeOpenMap(20, 20);
    const economy = new Economy();
    const um = new UnitManager();

    // Spawn a free settler (carrier)
    const carrier = um.spawnUnit(UnitKind.Settler, 2, 2);

    // Place a building that has demands (e.g., Sawmill needs Wood)
    const sawmill = economy.tryPlaceBuilding(BuildingType.Sawmill, 10, 10, map, 1)!;
    // Force complete sawmill
    for (let i = 0; i < 35; i++) economy.tick(1.0);
    expect(sawmill.constructionProgress).toBeCloseTo(1.0);

    // Assign a settler to the sawmill so it performs production tick
    sawmill.assignedSettlers.push(999);
    sawmill.productionCounter = 1000; // Force production trigger on next tick

    // Clear resources to ensure demand is triggered
    economy.removeResource(0 as any, economy.getResourceByDiscriminant(0));

    // Clear outputs, trigger demand registration via economy tick
    economy.tick(1.0);
    expect(economy.logistics.getDemands()).toHaveLength(1);

    // Spawn a resource item in the world
    const item = economy.logistics.spawnItem(ResourceType.Wood, 5, 5);

    const ai = new WorkerAI(economy, um, map);

    // 1. First tick runs logisticsTick: matches demand and assigns carrier to walk to the item
    ai.logisticsTick();
    expect(item!.isReserved).toBe(true);
    expect(carrier.logisticsTargetItemId).toBe(item!.id);
    expect(carrier.logisticsTargetBuildingIndex).toBe(sawmill.index);
    expect(carrier.state).toBe(UnitState.Moving);

    // Teleport carrier close to the item to simulate arrival
    carrier.x = 5;
    carrier.y = 5;

    // 2. Second tick runs logisticsTick: carrier picks up the item
    ai.logisticsTick();
    expect(carrier.carrying).toEqual({ resource: ResourceType.Wood, amount: 1 });
    expect(carrier.logisticsTargetItemId).toBeNull();
    // Item is removed from the logistics registry
    expect(economy.logistics.getItems().find(i => i.id === item!.id)).toBeUndefined();

    // Teleport carrier close to the sawmill
    carrier.x = 10;
    carrier.y = 10;

    // 3. Third tick runs logisticsTick: carrier delivers the item to sawmill
    const initialInput = sawmill.inputBuffer[ResourceType.Wood as any] || 0;
    ai.logisticsTick();
    expect(sawmill.inputBuffer[ResourceType.Wood as any]).toBe(initialInput + 1);
    expect(carrier.carrying).toBeNull();
    expect(carrier.logisticsTargetBuildingIndex).toBeNull();
    expect(carrier.state).toBe(UnitState.Idle);
  });
});
