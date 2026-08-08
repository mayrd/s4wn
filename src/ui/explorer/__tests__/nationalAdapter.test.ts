/**
 * S4WN - NationAdapter Tests
 * @jest-environment node
 *
 * NationAdapter must read all nation data from `nation.json` files (via
 * `NationRegistry`), not from any hardcoded built-in config.
 */

import { NationAdapter } from '../nationalAdapter';
import { NationRegistry } from '../../../game/NationRegistry';

/** Minimal valid NationManifest helper for registration. */
function makeManifest(overrides: Record<string, any> = {}): any {
  return {
    version: 1,
    id: 'romans',
    name: { en: 'Romans', de: 'Römer' },
    description: { en: 'Test nation' },
    visuals: {
      color: '#cc3333', secondary: '#ff6644', emoji: '🏛️', uiTheme: 'stone',
      particles: { dustColor: [0.6, 0.5, 0.4], magicColor: [0.8, 0.2, 0.2], constructionSpark: [1, 0.8, 0.2] },
      terrainModifiers: {},
    },
    economy: {
      livestock: { kind: 'sheep', building: 'sheep_ranch', product: 'meat' },
      divine: { crop: 'grapes', rawResource: 'grapes', processedInto: 'wine', building: 'vineyard', processor: 'wine_press' },
      munitions: null,
      startingResources: { wood: 40, stone: 30, food: 20, gold: 0, iron: 0, coal: 0, sulfur: 0 },
      resourceBonuses: { wood: 1, stone: 1, food: 1, gold: 1, iron: 1 },
    },
    units: {
      worker: { model: 'models/units/worker.glb', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
      soldier: { model: 'models/units/soldier.glb', texture: '', animations: '', icon: '', stats: { hp: 80, speed: 3, attack: 12, defence: 8, range: 1 } },
      archer: { model: 'models/units/archer.glb', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
      settler: { model: 'models/units/settler.glb', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
      special: { kind: 'medic', displayName: { en: 'Medic' }, description: { en: 'Heals.' }, model: '', texture: '', animations: '', icon: '', stats: { hp: 45, speed: 2.5, healRate: 3, healRange: 3 } },
    },
    buildings: {
      categories: [
        { id: 'basic', label: 'Basic', buildings: ['woodcutter', 'forester'] },
        { id: 'food', label: 'Food', buildings: ['farm', 'bakery'] },
      ],
      overrides: {},
    },
    balancing: {
      buildSpeedMultiplier: 1, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1,
      combatDamageMultiplier: 1, territoryExpansionRate: 1, populationGrowthRate: 1,
      startingUnits: { worker: 6, soldier: 4, settler: 2 },
    },
    specialResources: {},
    techTree: { nodes: [] },
    ai: { aggression: 0.5, expansionism: 0.7, economyFocus: 0.6, preferredUnits: ['soldier'] },
    ...overrides,
  };
}

describe('NationAdapter', () => {
  beforeEach(() => {
    NationRegistry.instance.reset();
  });

  afterEach(() => {
    NationRegistry.instance.reset();
  });

  test('reads buildings from the registered nation.json manifest', () => {
    NationRegistry.instance.register(makeManifest(), 'nations/romans/');
    const adapter = NationAdapter.getInstance('romans');
    expect(adapter.getEntityList('buildings')).toEqual(['woodcutter', 'forester', 'farm', 'bakery']);
  });

  test('reads units from the registered nation.json manifest', () => {
    NationRegistry.instance.register(makeManifest(), 'nations/romans/');
    const adapter = NationAdapter.getInstance('romans');
    expect(adapter.getEntityList('units')).toEqual(['worker', 'soldier', 'archer', 'settler', 'special']);
  });

  test('reads name from the registered nation.json manifest', () => {
    NationRegistry.instance.register(makeManifest(), 'nations/romans/');
    const adapter = NationAdapter.getInstance('romans');
    expect(adapter.config?.name).toBe('Romans');
    expect(adapter.config?.namespace).toBe('romans');
  });

  test('returns empty list when the nation is not registered (no builtin fallback)', () => {
    const adapter = NationAdapter.getInstance('nonexistent');
    expect(adapter.getEntityList('buildings')).toEqual([]);
    expect(adapter.getEntityList('units')).toEqual([]);
    expect(adapter.config).toBeNull();
  });

  test('returns empty list for unknown category', () => {
    NationRegistry.instance.register(makeManifest(), 'nations/romans/');
    const adapter = NationAdapter.getInstance('romans');
    expect(adapter.getEntityList('unknown_category')).toEqual([]);
  });

  test('reads resources from the registered nation.json manifest', () => {
    NationRegistry.instance.register(makeManifest(), 'nations/romans/');
    const adapter = NationAdapter.getInstance('romans');
    expect(adapter.getEntityList('resources')).toEqual(['wood', 'stone', 'food', 'gold', 'iron', 'coal', 'sulfur']);
  });
});