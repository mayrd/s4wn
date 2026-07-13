/**
 * TypeScript tests for WorkerAI module
 */

import { WorkerAI } from '../WorkerAI';
import { Economy } from '../Economy';
import { UnitManager } from '../UnitManager';
import { Map as GameMap } from '../Map';
import { UnitKind, UnitState, Terrain } from '../types';
import { BuildingType } from '../../economy/types';

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
