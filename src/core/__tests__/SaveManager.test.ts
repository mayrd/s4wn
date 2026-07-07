/**
 * Tests for Save/Load system — round-trip serialization.
 *
 * @jest-environment jsdom
 */

import { Map } from '../../game/Map';
import { Economy } from '../../game/Economy';
import { SaveManager } from '../SaveManager';
import { Terrain } from '../../game/types';
import { ResourceType as EconResource } from '../../economy/types';

describe('SaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Map serialization', () => {
    it('should round-trip map data', () => {
      const map = new Map(10, 10);
      map.setTerrain(3, 3, Terrain.Mountain);
      map.setElevation(5, 5, 5);
      const tile = map.get(0, 0)!;
      tile.resource = 'Stone' as any;
      tile.visibility = 0.5;
      tile.territory = 1;

      const json = map.toJSON();
      const restored = Map.fromJSON(json);

      expect(restored.width).toBe(10);
      expect(restored.height).toBe(10);
      expect(restored.get(3, 3)!.terrain).toBe(Terrain.Mountain);
      expect(restored.get(5, 5)!.elevation).toBe(5);
      expect(restored.get(0, 0)!.resource).toBe('Stone');
      expect(restored.get(0, 0)!.visibility).toBe(0.5);
      expect(restored.get(0, 0)!.territory).toBe(1);
    });
  });

  describe('Economy serialization', () => {
    it('should round-trip economy state', () => {
      const economy = new Economy();
      economy.addResource(EconResource.Wood, 50);
      economy.storageCapacity = 200;

      // Place a "building" via direct push (skip territory check)
      economy.buildings.push({
        index: 5,
        kind: 0 as any,
        x: 2,
        y: 3,
        hp: 100,
        maxHp: 100,
        constructionProgress: 1.0,
        isActive: true,
        productionProgress: 0,
        productionCounter: 0,
        inputBuffer: [0, 5, 0, 0, 0],
        outputBuffer: [0, 0, 0, 0, 0],
        assignedSettlers: [42],
        maxSettlers: 2,
        destructionTimer: null,
        destructionProgress: null,
        ownerId: 1,
      });

      const json = economy.toJSON();
      const restored = new Economy();
      restored.restoreFromJSON(json);

      expect(restored.getResource(EconResource.Wood)).toBe(70); // 20 initial + 50 added
      expect(restored.storageCapacity).toBe(200);
      expect(restored.buildings.length).toBe(1);
      expect(restored.buildings[0].index).toBe(5);
      expect(restored.buildings[0].assignedSettlers).toEqual([42]);
    });
  });

  describe('SaveManager', () => {
    it('should save and load game state', () => {
      const map = new Map(8, 8);
      const economy = new Economy();
      const gameState = { gameTime: 123, ticks: 456, isPaused: false, gameSpeed: 2, dayPhase: 0.5, showFullMap: true };
      const unitManager = { units: [], nextUnitId: 1 } as any;

      // Save
      const saved = SaveManager.save(gameState, map, economy, unitManager);
      expect(saved).toBe(true);

      // Load
      const data = SaveManager.load();
      expect(data).not.toBeNull();
      expect(data!.version).toBe(1);
      expect(data!.gameState.gameTime).toBe(123);
      expect(data!.gameState.isPaused).toBe(true); // always loads paused
    });

    it('should return null for missing save', () => {
      expect(SaveManager.load()).toBeNull();
      expect(SaveManager.hasSave()).toBe(false);
    });

    it('should delete save', () => {
      const map = new Map(4, 4);
      const economy = new Economy();
      SaveManager.save({ gameTime: 0, ticks: 0, isPaused: false, gameSpeed: 1, dayPhase: 0.25, showFullMap: false }, map, economy, { units: [], nextUnitId: 1 } as any);
      expect(SaveManager.hasSave()).toBe(true);
      SaveManager.deleteSave();
      expect(SaveManager.hasSave()).toBe(false);
    });
  });
});
