/**
 * TypeScript tests for Nation module
 */

import { Nation, NationType, getNATION_COUNT, NATION_NAMES, NATION_INFO, getNationName } from '../Nation';
import { NationLoader } from '../NationLoader';
import { rebuildLegacyConstants } from '../Nation';

// Bootstrap the registry before any tests run
beforeAll(async () => {
  await NationLoader.discover();
  rebuildLegacyConstants();
});

describe('getNationName', () => {
  test('returns correct name for valid discriminants', () => {
    expect(getNationName(NationType.Romans)).toBe('Romans');
    expect(getNationName(NationType.Vikings)).toBe('Vikings');
    expect(getNationName(NationType.Mayans)).toBe('Mayans');
    expect(getNationName(NationType.Trojans)).toBe('Trojans');
    expect(getNationName(NationType.DarkTribe)).toBe('Dark Tribe');
  });

  test('returns "Unknown" for invalid discriminant', () => {
    expect(getNationName(99)).toBe('Unknown');
  });
});

describe('NATION_INFO', () => {
  test('has an entry for every nation', () => {
    const count = getNATION_COUNT();
    for (let i = 0; i < count; i++) {
      expect(NATION_INFO[i]).toBeDefined();
      expect(NATION_INFO[i].id).toBeDefined();
    }
  });

  test('NATION_NAMES length matches NATION_COUNT', () => {
    expect(NATION_NAMES.length).toBe(getNATION_COUNT());
  });
});

describe('Nation class', () => {
  test('defaults to Romans (0)', () => {
    const nation = new Nation();
    expect(nation.selectedNation).toBe(NationType.Romans);
  });

  test('setNation succeeds for valid discriminant and updates selectedNation', () => {
    const nation = new Nation();
    expect(nation.setNation(NationType.Vikings)).toBe(true);
    expect(nation.selectedNation).toBe(NationType.Vikings);
  });

  test('setNation fails for out-of-range discriminant, leaves selectedNation unchanged', () => {
    const nation = new Nation();
    expect(nation.setNation(-1)).toBe(false);
    expect(nation.setNation(getNATION_COUNT())).toBe(false);
    expect(nation.selectedNation).toBe(NationType.Romans);
  });

  test('getInfo returns info matching the selected nation', () => {
    const nation = new Nation();
    nation.setNation(NationType.Mayans);
    const info = nation.getInfo();
    expect(info.id).toBe('mayans');
  });

  test('getInfo falls back to Roman info if selectedNation somehow invalid', () => {
    const nation = new Nation();
    (nation as any).selectedNation = 999;
    expect(nation.getInfo()).toEqual(NATION_INFO[0]);
  });

  test('getBuildings includes common buildings for every nation', () => {
    const nation = new Nation();
    const commonBuildings = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 27, 28];
    const buildings = nation.getBuildings();
    for (const b of commonBuildings) {
      expect(buildings).toContain(b);
    }
  });

  test('getBuildings includes Roman-specific unique buildings for Romans', () => {
    const nation = new Nation();
    nation.setNation(NationType.Romans);
    const buildings = nation.getBuildings();
    expect(buildings).toEqual(expect.arrayContaining([31, 32, 33, 34]));
    // Should not include Viking-specific buildings
    expect(buildings).not.toContain(35);
  });

  test('getBuildings includes Viking-specific unique buildings for Vikings', () => {
    const nation = new Nation();
    nation.setNation(NationType.Vikings);
    const buildings = nation.getBuildings();
    expect(buildings).toEqual(expect.arrayContaining([35, 36, 37, 38, 39]));
    expect(buildings).not.toContain(31);
  });

  test('getBuildings result is sorted ascending', () => {
    const nation = new Nation();
    const buildings = nation.getBuildings();
    const sorted = [...buildings].sort((a, b) => a - b);
    expect(buildings).toEqual(sorted);
  });

  test('getBuildings includes generic extra buildings (61-86) for all nations', () => {
    const nation = new Nation();
    nation.setNation(NationType.DarkTribe);
    const buildings = nation.getBuildings();
    expect(buildings).toContain(61);
    expect(buildings).toContain(86);
  });
});
