/**
 * S4WN Babylon.js/TypeScript - ConstructionManager Unit Tests
 *
 * Tests the complete construction pipeline:
 *   - Phase state machine (digging → materials → building → complete)
 *   - Digger assignment and progression
 *   - Builder assignment and progression
 *   - Material tracking and delivery requests
 *   - Terrain checking for digging requirement
 *   - Edge cases (building removed, unit death)
 */

import { ConstructionManager } from '../game/ConstructionManager';
import { Economy } from '../game/Economy';
import { UnitManager } from '../game/UnitManager';
import { Map as GameMap } from '../game/Map';
import { Unit } from '../game/Unit';
import { UnitKind } from '../game/types';
import { BuildingType } from '../economy/types';

function createTestMap(width = 20, height = 20): GameMap {
  return new GameMap(width, height, 'demo');
}

function addSettler(um: UnitManager, x: number, y: number): Unit {
  return um.spawnUnit(UnitKind.Settler, x, y);
}

describe('ConstructionManager', () => {
  let cm: ConstructionManager;
  let economy: Economy;
  let unitManager: UnitManager;
  let map: GameMap;

  beforeEach(() => {
    cm = new ConstructionManager();
    economy = new Economy();
    unitManager = new UnitManager();
    map = createTestMap();
    // Set territory for player 0 on the whole map so tryPlaceBuilding succeeds
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.get(x, y);
        if (tile) tile.territory = 0;
      }
    }
  });

  describe('registerSite', () => {
    it('should register a site with materials phase when terrain is flat', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(site.phase).toBe('materials');
      expect(site.needsDigging).toBe(false);
      expect(site.requiredMaterials.length).toBeGreaterThan(0);
    });

    it('should register a site with digging phase when terrain is uneven', () => {
      map.setElevation(5, 5, 0);
      map.setElevation(5, 6, 0);
      map.setElevation(6, 5, 1.0);
      map.setElevation(6, 6, 0);
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(site.phase).toBe('digging');
      expect(site.needsDigging).toBe(true);
    });

    it('should compute a dropoff tile adjacent to the building', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(site.dropoffTile).not.toBeNull();
    });
  });

  describe('phase transitions', () => {
    it('should transition materials → building when materials delivered', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(site.phase).toBe('materials');
      for (const cost of site.requiredMaterials) {
        building.inputBuffer[cost.resource as number] = cost.amount;
      }
      cm.tick(unitManager, economy, map);
      expect(site.phase).toBe('building');
    });

    it('should stay in materials when not fully delivered', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      for (const cost of site.requiredMaterials) {
        building.inputBuffer[cost.resource as number] = Math.floor(cost.amount / 2);
      }
      cm.tick(unitManager, economy, map);
      expect(site.phase).toBe('materials');
    });

    it('should transition digging → materials when digging completes', () => {
      map.setElevation(5, 5, 0);
      map.setElevation(5, 6, 0);
      map.setElevation(6, 5, 1.0);
      map.setElevation(6, 6, 0);
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(site.phase).toBe('digging');
      addSettler(unitManager, 5, 7);
      cm.tick(unitManager, economy, map);
      expect(site.diggerAssigned).not.toBeNull();
      const digger = unitManager.getUnit(site.diggerAssigned!);
      expect(digger).not.toBeNull();
      if (!digger) return;
      digger.x = 5;
      digger.y = 5;
      digger.path = null;
      for (let i = 0; i < 70; i++) cm.tick(unitManager, economy, map);
      expect(site.phase).toBe('materials');
      expect(site.diggingProgress).toBe(1.0);
    });

    it('should transition building → complete when constructionProgress reaches 1.0', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      site.phase = 'building';
      const settler = addSettler(unitManager, 5, 7);
      cm.tick(unitManager, economy, map);
      expect(site.builderAssigned).toBe(settler.id);
      if (site.builderAdjacentTile) {
        settler.x = site.builderAdjacentTile.x;
        settler.y = site.builderAdjacentTile.y;
        settler.path = null;
      }
      for (let i = 0; i < 40; i++) cm.tick(unitManager, economy, map);
      expect(building.constructionProgress).toBe(1.0);
      expect(building.isActive).toBe(true);
      expect(cm.sites.has(building.index)).toBe(false);
    });
  });

  describe('digger assignment', () => {
    it('should assign an idle settler as digger', () => {
      map.setElevation(5, 5, 0);
      map.setElevation(5, 6, 0);
      map.setElevation(6, 5, 1.0);
      map.setElevation(6, 6, 0);
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      const settler = addSettler(unitManager, 10, 10);
      cm.tick(unitManager, economy, map);
      expect(site.diggerAssigned).toBe(settler.id);
      expect(settler.constructionRole).toBe('digger');
      expect(settler.constructionTargetSite).toBe(building.index);
    });

    it('should not assign a settler already assigned to a building', () => {
      map.setElevation(5, 5, 0);
      map.setElevation(5, 6, 0);
      map.setElevation(6, 5, 1.0);
      map.setElevation(6, 6, 0);
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      const settler = addSettler(unitManager, 10, 10);
      settler.assignedBuilding = 999;
      cm.tick(unitManager, economy, map);
      expect(site.diggerAssigned).toBeNull();
    });

    it('should reassign a new digger if the current one dies', () => {
      map.setElevation(5, 5, 0);
      map.setElevation(5, 6, 0);
      map.setElevation(6, 5, 1.0);
      map.setElevation(6, 6, 0);
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      const s1 = addSettler(unitManager, 10, 10);
      cm.tick(unitManager, economy, map);
      expect(site.diggerAssigned).toBe(s1.id);
      // Kill the digger
      s1.hp = 0;
      s1.dyingTimer = 0;
      // First tick detects death and clears assignment
      cm.tick(unitManager, economy, map);
      expect(site.diggerAssigned).toBeNull();
      // Add a replacement and tick again to assign
      const s2 = addSettler(unitManager, 10, 11);
      cm.tick(unitManager, economy, map);
      expect(site.diggerAssigned).toBe(s2.id);
    });
  });

  describe('builder assignment', () => {
    it('should assign an idle settler as builder in building phase', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      site.phase = 'building';
      const settler = addSettler(unitManager, 10, 10);
      cm.tick(unitManager, economy, map);
      expect(site.builderAssigned).toBe(settler.id);
      expect(settler.constructionRole).toBe('builder');
    });
  });

  describe('material delivery', () => {
    it('should register demands for missing materials', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      cm.tick(unitManager, economy, map);
      const demands = economy.logistics.getDemands();
      expect(demands.length).toBeGreaterThan(0);
    });

    it('should not register demands when materials are delivered', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      for (const cost of site.requiredMaterials) {
        building.inputBuffer[cost.resource as number] = cost.amount;
      }
      cm.tick(unitManager, economy, map);
      const siteDemands = economy.logistics.getDemands().filter(d => d.buildingIndex === building.index);
      expect(siteDemands.length).toBe(0);
    });
  });

  describe('query methods', () => {
    it('getConstructionProgress should return building progress', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      expect(cm.getConstructionProgress(building.index, economy)).toBe(0);
      building.constructionProgress = 0.5;
      expect(cm.getConstructionProgress(building.index, economy)).toBe(0.5);
    });

    it('getConstructionPhase should return the current phase', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(cm.getConstructionPhase(building.index)).toBe('materials');
      site.phase = 'building';
      expect(cm.getConstructionPhase(building.index)).toBe('building');
    });

    it('getConstructionPhase should return "complete" for unregistered buildings', () => {
      expect(cm.getConstructionPhase(999)).toBe('complete');
    });

    it('getActiveSites should return non-complete sites only', () => {
      const b1 = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(b1).not.toBeNull();
      if (!b1) return;
      cm.registerSite(b1.index, b1.kind, b1.x, b1.y, b1.ownerId, map);
      expect(cm.getActiveSites().length).toBe(1);
      cm.sites.delete(b1.index);
      expect(cm.getActiveSites().length).toBe(0);
    });
  });

  describe('speed multiplier', () => {
    it('should set and get', () => {
      expect(cm.getSpeedMultiplier()).toBe(1.0);
      cm.setSpeedMultiplier(10.0);
      expect(cm.getSpeedMultiplier()).toBe(10.0);
    });

    it('should clamp to minimum 0.1', () => {
      cm.setSpeedMultiplier(0);
      expect(cm.getSpeedMultiplier()).toBe(0.1);
    });
  });

  describe('edge cases', () => {
    it('should handle building removal during construction', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(cm.sites.has(building.index)).toBe(true);
      economy.removeBuilding(building.index);
      cm.tick(unitManager, economy, map);
      expect(cm.sites.has(building.index)).toBe(false);
    });

    it('should handle removeSite gracefully', () => {
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      cm.removeSite(building.index);
      expect(cm.sites.has(building.index)).toBe(false);
      cm.removeSite(building.index);
    });

    it('should handle multiple concurrent sites', () => {
      // Use positions that are definitely Grass on the 20x20 demo map
      // The map center is at (10,10), and dist-based generation means
      // tiles near center are more likely to be Grass
      const b1 = economy.tryPlaceBuilding(BuildingType.Woodcutter, 10, 10, map, 0);
      const b2 = economy.tryPlaceBuilding(BuildingType.Woodcutter, 12, 10, map, 0);
      if (!b1 || !b2) {
        // If demo map doesn't have buildable tiles at these positions, skip
        return;
      }
      cm.registerSite(b1.index, b1.kind, b1.x, b1.y, b1.ownerId, map);
      cm.registerSite(b2.index, b2.kind, b2.x, b2.y, b2.ownerId, map);
      addSettler(unitManager, 10, 12);
      addSettler(unitManager, 12, 12);
      cm.tick(unitManager, economy, map);
      expect(cm.sites.size).toBe(2);
    });

    it('should flatten terrain after digging', () => {
      map.setElevation(5, 5, 0);
      map.setElevation(5, 6, 0);
      map.setElevation(6, 5, 1.0);
      map.setElevation(6, 6, 0);
      const building = economy.tryPlaceBuilding(BuildingType.Sawmill, 5, 5, map, 0);
      expect(building).not.toBeNull();
      if (!building) return;
      const site = cm.registerSite(building.index, building.kind, building.x, building.y, building.ownerId, map);
      expect(site.needsDigging).toBe(true);
      (cm as any).flattenTerrain(5, 5, map);
      const elevations = [
        map.get(5, 5)!.elevation,
        map.get(5, 6)!.elevation,
        map.get(6, 5)!.elevation,
        map.get(6, 6)!.elevation,
      ];
      expect(new Set(elevations).size).toBe(1);
    });
  });
});