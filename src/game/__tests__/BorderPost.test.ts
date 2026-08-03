/**
 * S4WN - Border Post Tests
 * @jest-environment node
 */

import { BorderPost, BorderPostManager, borderPostModelName, borderPostModelPath, borderPostColor, borderPostNationName } from '../BorderPost';
import { NationType } from '../Nation';
import { NationRegistry } from '../NationRegistry';

describe('BorderPostManager', () => {
  let manager: BorderPostManager;

  beforeEach(() => {
    manager = new BorderPostManager();
  });

  test('placePost creates a border post at the given position', () => {
    const post = manager.placePost(10, 15, NationType.Romans, 42);
    expect(post).not.toBeNull();
    expect(post!.x).toBe(10);
    expect(post!.y).toBe(15);
    expect(post!.nationId).toBe(NationType.Romans);
    expect(post!.placedBy).toBe(42);
  });

  test('placePost does not create duplicate posts at same tile', () => {
    const p1 = manager.placePost(5, 5, NationType.Romans);
    const p2 = manager.placePost(5, 5, NationType.Vikings);
    expect(p1).not.toBeNull();
    expect(p2).toBeNull();
    expect(manager.posts.length).toBe(1);
  });

  test('placePost returns null for duplicate but allows different tile', () => {
    manager.placePost(3, 3, NationType.Romans);
    const p2 = manager.placePost(3, 4, NationType.Romans);
    expect(p2).not.toBeNull();
    expect(manager.posts.length).toBe(2);
    expect(p2!.x).toBe(3);
    expect(p2!.y).toBe(4);
  });

  test('getPosts returns all posts when no filter', () => {
    manager.placePost(1, 1, NationType.Romans);
    manager.placePost(2, 2, NationType.Vikings);
    manager.placePost(3, 3, NationType.Mayans);
    expect(manager.getPosts().length).toBe(3);
  });

  test('getPosts filters by nationId', () => {
    manager.placePost(1, 1, NationType.Romans);
    manager.placePost(2, 2, NationType.Romans);
    manager.placePost(3, 3, NationType.Vikings);
    expect(manager.getPosts(NationType.Romans).length).toBe(2);
    expect(manager.getPosts(NationType.Vikings).length).toBe(1);
    expect(manager.getPosts(NationType.Mayans).length).toBe(0);
  });

  test('clearNation removes only matching posts', () => {
    manager.placePost(1, 1, NationType.Romans);
    manager.placePost(2, 2, NationType.Romans);
    manager.placePost(3, 3, NationType.Vikings);
    manager.clearNation(NationType.Romans);
    expect(manager.getPosts().length).toBe(1);
    expect(manager.getPosts()[0].nationId).toBe(NationType.Vikings);
  });

  test('removePost removes by ID', () => {
    const p = manager.placePost(5, 5, NationType.Romans)!;
    manager.placePost(6, 6, NationType.Romans);
    expect(manager.removePost(p.id)).toBe(true);
    expect(manager.getPosts().length).toBe(1);
    expect(manager.removePost(999)).toBe(false);
  });

  test('getCountByNation returns correct counts', () => {
    manager.placePost(1, 1, NationType.Romans);
    manager.placePost(2, 2, NationType.Romans);
    manager.placePost(3, 3, NationType.Vikings);
    manager.placePost(4, 4, NationType.DarkTribe);
    const counts = manager.getCountByNation();
    expect(counts.get(NationType.Romans)).toBe(2);
    expect(counts.get(NationType.Vikings)).toBe(1);
    expect(counts.get(NationType.DarkTribe)).toBe(1);
    expect(counts.get(NationType.Mayans)).toBeUndefined();
  });

  test('empty manager returns empty posts array', () => {
    expect(manager.getPosts()).toEqual([]);
    expect(manager.getCountByNation().size).toBe(0);
  });
});

describe('BorderPost utility functions', () => {
  test('borderPostModelName returns correct model names', () => {
    expect(borderPostModelName(NationType.Romans)).toBe('borderpost_roman');
    expect(borderPostModelName(NationType.Vikings)).toBe('borderpost_viking');
    expect(borderPostModelName(NationType.Mayans)).toBe('borderpost_mayan');
    expect(borderPostModelName(NationType.Trojans)).toBe('borderpost_trojan');
    expect(borderPostModelName(NationType.DarkTribe)).toBe('borderpost_dark');
  });

  test('borderPostModelName defaults for unknown IDs', () => {
    expect(borderPostModelName(999)).toBe('borderpost_roman');
  });

  test('borderPostColor returns correct colors', () => {
    expect(borderPostColor(NationType.Romans)).toBe('#CC3333');
    expect(borderPostColor(NationType.Vikings)).toBe('#3366CC');
    expect(borderPostColor(NationType.Mayans)).toBe('#33CC33');
    expect(borderPostColor(NationType.Trojans)).toBe('#CC9933');
    expect(borderPostColor(NationType.DarkTribe)).toBe('#9933CC');
  });

  test('borderPostNationName returns correct names', () => {
    expect(borderPostNationName(NationType.Romans)).toBe('Romans');
    expect(borderPostNationName(NationType.Vikings)).toBe('Vikings');
    expect(borderPostNationName(NationType.Mayans)).toBe('Mayans');
    expect(borderPostNationName(NationType.Trojans)).toBe('Trojans');
    expect(borderPostNationName(NationType.DarkTribe)).toBe('Dark Tribe');
  });

  test('borderPostModelPath falls back to legacy path when nation not registered', () => {
    NationRegistry.instance.reset();
    expect(borderPostModelPath(NationType.Romans)).toBe('/models/borderpost_roman.obj');
    expect(borderPostModelPath(NationType.Vikings)).toBe('/models/borderpost_viking.obj');
    expect(borderPostModelPath(NationType.Mayans)).toBe('/models/borderpost_mayan.obj');
    expect(borderPostModelPath(NationType.Trojans)).toBe('/models/borderpost_trojan.obj');
    expect(borderPostModelPath(NationType.DarkTribe)).toBe('/models/borderpost_dark.obj');
  });

  test('borderPostModelPath resolves from nation.json decorations when registered', () => {
    NationRegistry.instance.reset();
    NationRegistry.instance.register({
      version: 1,
      id: 'romans',
      name: { en: 'Romans' },
      description: { en: 'Test' },
      visuals: {
        color: '#cc3333', secondary: '#ff6644', emoji: '🏛️', uiTheme: 'stone',
        particles: { dustColor: [0.6, 0.5, 0.4], magicColor: [0.8, 0.2, 0.2], constructionSpark: [1, 0.8, 0.2] },
        terrainModifiers: {},
        decorations: { borderPost: { model: 'models/decorations/borderpost.obj', material: 'models/decorations/borderpost.mtl' } },
      },
      economy: {
        livestock: { kind: 'sheep', building: 'sheep_ranch', product: 'meat' },
        divine: { crop: 'grapes', rawResource: 'grapes', processedInto: 'wine', building: 'vineyard', processor: 'wine_press' },
        munitions: null,
        startingResources: { wood: 40, stone: 30, food: 20, gold: 0, iron: 0, coal: 0, sulfur: 0 },
        resourceBonuses: { wood: 1, stone: 1, food: 1, gold: 1, iron: 1 },
      },
      units: {
        worker: { model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
        soldier: { model: '', texture: '', animations: '', icon: '', stats: { hp: 80, speed: 3, attack: 12, defence: 8, range: 1 } },
        archer: { model: '', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
        settler: { model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
        special: { kind: 'medic', displayName: { en: 'Medic' }, description: { en: 'Heals.' }, model: '', texture: '', animations: '', icon: '', stats: { hp: 45, speed: 2.5, healRate: 3, healRange: 3 } },
      },
      buildings: { categories: [], overrides: {} },
      balancing: {
        buildSpeedMultiplier: 1, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1,
        combatDamageMultiplier: 1, territoryExpansionRate: 1, populationGrowthRate: 1,
        startingUnits: { worker: 6, soldier: 4, settler: 2 },
      },
      specialResources: {},
      techTree: { nodes: [] },
      ai: { aggression: 0.5, expansionism: 0.7, economyFocus: 0.6, preferredUnits: ['soldier'] },
    }, 'assets/nations/romans');
    expect(borderPostModelPath(NationType.Romans)).toBe('/nations/romans/models/decorations/borderpost.obj');
    NationRegistry.instance.reset();
  });
});

describe('BorderPost class', () => {
  test('constructor sets all fields', () => {
    const post = new BorderPost({ id: 1, x: 10, y: 20, nationId: NationType.Vikings, placedBy: 42 });
    expect(post.id).toBe(1);
    expect(post.x).toBe(10);
    expect(post.y).toBe(20);
    expect(post.nationId).toBe(NationType.Vikings);
    expect(post.placedBy).toBe(42);
  });

  test('getModelName delegates to utility', () => {
    const post = new BorderPost({ id: 1, x: 0, y: 0, nationId: NationType.Vikings });
    expect(post.getModelName()).toBe('borderpost_viking');
  });

  test('getColor delegates to utility', () => {
    const post = new BorderPost({ id: 1, x: 0, y: 0, nationId: NationType.Mayans });
    expect(post.getColor()).toBe('#33CC33');
  });

  test('getNationName delegates to utility', () => {
    const post = new BorderPost({ id: 1, x: 0, y: 0, nationId: NationType.Trojans });
    expect(post.getNationName()).toBe('Trojans');
  });

  test('placedBy defaults to null', () => {
    const post = new BorderPost({ id: 1, x: 0, y: 0, nationId: NationType.Romans });
    expect(post.placedBy).toBeNull();
  });
});
