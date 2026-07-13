/**
 * TypeScript tests for TerritoryManager module
 */

import { TerritoryManager } from '../TerritoryManager';
import { Map as GameMap } from '../Map';
import { Economy } from '../Economy';
import { UnitManager } from '../UnitManager';
import { UnitKind, Terrain } from '../types';
import { BuildingType } from '../../economy/types';

function makeOpenMap(w: number, h: number): GameMap {
  const map = new GameMap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map.setTerrain(x, y, Terrain.Grass);
    }
  }
  return map;
}

describe('TerritoryManager', () => {
  test('updateTerritory grants territory around a Pioneer unit', () => {
    const map = makeOpenMap(40, 40);
    const um = new UnitManager();
    const economy = new Economy();
    um.spawnUnit(UnitKind.Pioneer, 20, 20);

    const tm = new TerritoryManager(map, um, economy);
    tm.updateTerritory();

    // Pioneer radius = 5, so tile directly adjacent should be claimed (nationId=1)
    expect(map.get(20, 20)!.territory).toBe(1);
    expect(map.get(22, 20)!.territory).toBe(1);
    // Tile far away should remain neutral
    expect(map.get(0, 0)!.territory).toBe(0);
  });

  test('updateTerritory grants larger territory around a completed Castle', () => {
    const map = makeOpenMap(60, 60);
    const um = new UnitManager();
    const economy = new Economy();
    // Manually place a "complete" Castle building (constructionProgress >= 1.0)
    map.updateTerritory(1, [{ x: 30, y: 30, radius: 60 }]); // pre-own territory for placement
    const building = economy.tryPlaceBuilding(BuildingType.Castle, 30, 30, map, 1)!;
    expect(building).toBeDefined();
    economy.tick(1.0); // Castle has buildTime 0, completes instantly

    const tm = new TerritoryManager(map, um, economy);
    tm.updateTerritory();

    // Castle radius = 15
    expect(map.get(30, 30)!.territory).toBe(1);
    expect(map.get(44, 30)!.territory).toBe(1); // within radius 15
    expect(map.get(0, 0)!.territory).toBe(0); // out of range
  });

  test('incomplete buildings do not grant territory', () => {
    const map = makeOpenMap(60, 60);
    const um = new UnitManager();
    const economy = new Economy();
    map.updateTerritory(1, [{ x: 30, y: 30, radius: 60 }]);
    economy.tryPlaceBuilding(BuildingType.GuardTower, 30, 30, map, 1);
    // Don't tick — GuardTower has non-zero buildTime and remains incomplete

    const tm = new TerritoryManager(map, um, economy);
    tm.updateTerritory();

    // No completed influence sources → territory reset to neutral everywhere
    expect(map.get(30, 30)!.territory).toBe(0);
  });

  test('non-influence buildings (e.g. Farm) do not grant territory', () => {
    const map = makeOpenMap(40, 40);
    const um = new UnitManager();
    const economy = new Economy();
    map.updateTerritory(1, [{ x: 20, y: 20, radius: 40 }]);
    const farm = economy.tryPlaceBuilding(BuildingType.Farm, 20, 20, map, 1)!;
    for (let i = 0; i < 25; i++) economy.tick(1.0); // Farm buildTime=20, complete after ~20 ticks
    expect(farm.constructionProgress).toBeCloseTo(1.0);

    const tm = new TerritoryManager(map, um, economy);
    tm.updateTerritory();

    expect(map.get(20, 20)!.territory).toBe(0);
  });
});
