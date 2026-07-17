/**
 * Tests for GameSetup — player configuration and multi-nation map initialization.
 */
import { GameSetup, GameConfig } from '../game/GameSetup';
import { Map as GameMap } from '../game/Map';
import { NationType } from '../game/Nation';
import { Terrain } from '../game/types';
import { NationLoader } from '../game/NationLoader';
import { rebuildLegacyConstants } from '../game/Nation';

// Bootstrap the registry before any tests run
beforeAll(async () => {
  await NationLoader.discover();
  rebuildLegacyConstants();
});

describe('GameSetup', () => {
  describe('createSinglePlayer', () => {
    it('creates config with one Roman player at center', () => {
      const config = GameSetup.createSinglePlayer(100, 100);
      expect(config.players).toHaveLength(1);
      expect(config.players[0].nationType).toBe(NationType.Romans);
      expect(config.players[0].playerId).toBe(0);
      expect(config.players[0].startX).toBe(50);
      expect(config.players[0].startY).toBe(50);
      expect(config.players[0].color).toBe('#cc3333');
    });
  });

  describe('createTwoPlayer', () => {
    it('creates config with Romans + Vikings in opposite corners', () => {
      const config = GameSetup.createTwoPlayer(100, 100);
      expect(config.players).toHaveLength(2);
      expect(config.players[0].nationType).toBe(NationType.Romans);
      expect(config.players[0].playerId).toBe(0);
      expect(config.players[0].startX).toBe(25);
      expect(config.players[0].startY).toBe(75);
      expect(config.players[1].nationType).toBe(NationType.Vikings);
      expect(config.players[1].playerId).toBe(1);
      expect(config.players[1].startX).toBe(75);
      expect(config.players[1].startY).toBe(25);
    });
  });

  describe('createThreePlayer', () => {
    it('creates config with Romans + Vikings + Mayans in triangle', () => {
      const config = GameSetup.createThreePlayer(100, 100);
      expect(config.players).toHaveLength(3);
      expect(config.players[0].nationType).toBe(NationType.Romans);
      expect(config.players[1].nationType).toBe(NationType.Vikings);
      expect(config.players[2].nationType).toBe(NationType.Mayans);
      // Each player has a unique playerId
      const ids = config.players.map((p) => p.playerId);
      expect(new Set(ids).size).toBe(3);
    });
    it('places players at distinct positions', () => {
      const config = GameSetup.createThreePlayer(100, 100);
      const positions = config.players.map((p) => `${p.startX},${p.startY}`);
      expect(new Set(positions).size).toBe(3); // all unique
    });
  });

  describe('createStartingArea', () => {
    let map: GameMap;

    beforeEach(() => {
      map = new GameMap(40, 40, 'demo');
    });

    it('carves a circular grass area with territory', () => {
      const count = GameSetup.createStartingArea(map, 20, 20, 5, 0);
      expect(count).toBeGreaterThan(0);

      // Center tile should be grass with territory 1
      const center = map.get(20, 20)!;
      expect(center.terrain).toBe(Terrain.Grass);
      expect(center.elevation).toBe(0);
      expect(center.territory).toBe(1);
    });

    it('sets player territory correctly (playerId→territory offset)', () => {
      GameSetup.createStartingArea(map, 20, 20, 5, 2);
      const center = map.get(20, 20)!;
      expect(center.territory).toBe(3); // playerId 2 → territory 3
    });

    it('only affects tiles within radius', () => {
      GameSetup.createStartingArea(map, 20, 20, 3, 0);
      // Far corner should remain untouched
      const far = map.get(0, 0)!;
      expect(far.territory).toBe(0);
    });

    it('returns 0 for out-of-bounds center', () => {
      const count = GameSetup.createStartingArea(map, -5, -5, 3, 0);
      expect(count).toBe(0);
    });

    it('clamps to map boundaries', () => {
      // Starting area at corner (0,0) should only affect tiles within map bounds
      const count = GameSetup.createStartingArea(map, 0, 0, 5, 0);
      // Quarter circle with radius 5: π*r²/4 ≈ 19 tiles (clamped to actual grid)
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(30);
    });
  });

  describe('applyToMap', () => {
    it('creates starting areas for all players', () => {
      const map = new GameMap(60, 60, 'demo');
      const config: GameConfig = {
        mapWidth: 60,
        mapHeight: 60,
        mapKind: 'demo',
        players: [
          { playerId: 0, nationType: NationType.Romans, startX: 15, startY: 15, color: '#cc3333' },
          { playerId: 1, nationType: NationType.Vikings, startX: 45, startY: 45, color: '#3366cc' },
        ],
      };

      GameSetup.applyToMap(map, config);

      // Player 0 territory
      const p0 = map.get(15, 15)!;
      expect(p0.territory).toBe(1);
      expect(p0.terrain).toBe(Terrain.Grass);

      // Player 1 territory
      const p1 = map.get(45, 45)!;
      expect(p1.territory).toBe(2);
      expect(p1.terrain).toBe(Terrain.Grass);

      // Gap between them should still be unclaimed
      const gap = map.get(30, 30)!;
      expect(gap.territory).toBe(0);
    });
  });

  describe('describe', () => {
    it('returns human-readable config string', () => {
      const config = GameSetup.createSinglePlayer(80, 80);
      const desc = GameSetup.describe(config);
      expect(desc).toContain('80×80');
      expect(desc).toContain('Romans');
      expect(desc).toContain('40, 40');
    });

    it('lists all players in multiplayer config', () => {
      const config = GameSetup.createTwoPlayer(80, 80);
      const desc = GameSetup.describe(config);
      expect(desc).toContain('Romans');
      expect(desc).toContain('Vikings');
      expect(desc).toContain('Player 0');
      expect(desc).toContain('Player 1');
    });
  });
});
