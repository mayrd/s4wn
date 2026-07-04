/**
 * TypeScript tests for Map module
 *
 * Migrated from Rust tests in engine/src/map.rs
 */

import { Map } from '../Map';
import { Terrain } from '../types';

describe('Map', () => {
  test('map creation has correct dimensions', () => {
    const map = new Map(10, 20);
    expect(map.width).toBe(10);
    expect(map.height).toBe(20);
    expect(map.tiles.length).toBe(20);
    expect(map.tiles[0].length).toBe(10);
  });

  test('get returns undefined for out of bounds', () => {
    const map = new Map(10, 10);
    expect(map.get(-1, 0)).toBeUndefined();
    expect(map.get(10, 10)).toBeUndefined();
  });

  test('grass tile is buildable', () => {
    const map = new Map(10, 10);
    expect(map.isBuildable(0, 0)).toBe(true);
  });

  test('water tile is not buildable', () => {
    const map = new Map(10, 10);
    map.setTerrain(0, 0, Terrain.Water);
    expect(map.isBuildable(0, 0)).toBe(false);
  });

  test('grass tile is passable', () => {
    const map = new Map(10, 10);
    expect(map.isPassable(0, 0)).toBe(true);
  });

  test('mountain tile is not passable', () => {
    const map = new Map(10, 10);
    map.setTerrain(0, 0, Terrain.Mountain);
    expect(map.isPassable(0, 0)).toBe(false);
  });

  test('visibility initialized to zero', () => {
    const map = new Map(10, 10);
    expect(map.getVisibility(5, 5)).toBe(0);
  });

  test('setAllVisible sets all tiles to 1.0', () => {
    const map = new Map(5, 5);
    map.setAllVisible();
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        expect(map.getVisibility(x, y)).toBe(1.0);
      }
    }
  });
});