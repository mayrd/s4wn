/**
 * TypeScript tests for UnitManager module
 */

import { UnitManager } from '../UnitManager';
import { Map as GameMap } from '../Map';
import { Terrain, UnitKind, UnitStance, UnitState } from '../types';

function makeOpenMap(w: number, h: number): GameMap {
  const map = new GameMap(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      map.setTerrain(x, y, Terrain.Grass);
    }
  }
  return map;
}

describe('UnitManager — spawning & lookup', () => {
  test('spawnUnit assigns incrementing ids', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Settler, 0, 0);
    const b = um.spawnUnit(UnitKind.Settler, 1, 1);
    expect(b.id).toBeGreaterThan(a.id);
  });

  test('getUnit finds unit by id, undefined for unknown', () => {
    const um = new UnitManager();
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    expect(um.getUnit(u.id)).toBe(u);
    expect(um.getUnit(9999)).toBeUndefined();
  });

  test('getAliveUnits filters out dead units', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Settler, 0, 0);
    const b = um.spawnUnit(UnitKind.Settler, 1, 1);
    a.takeDamage(a.hp); // kill a
    const alive = um.getAliveUnits();
    expect(alive).toContain(b);
    expect(alive).not.toContain(a);
  });

  test('getUnitsInRect returns only alive units within bounding box', () => {
    const um = new UnitManager();
    const inside = um.spawnUnit(UnitKind.Settler, 2, 2);
    const outside = um.spawnUnit(UnitKind.Settler, 10, 10);
    const result = um.getUnitsInRect(0, 0, 5, 5);
    expect(result).toContain(inside);
    expect(result).not.toContain(outside);
  });

  test('getUnitsInRect handles reversed coordinates', () => {
    const um = new UnitManager();
    const inside = um.spawnUnit(UnitKind.Settler, 2, 2);
    const result = um.getUnitsInRect(5, 5, 0, 0);
    expect(result).toContain(inside);
  });

  test('getUnitSummary only includes alive units with floored coords', () => {
    const um = new UnitManager();
    const u = um.spawnUnit(UnitKind.Settler, 2.7, 3.2);
    const dead = um.spawnUnit(UnitKind.Settler, 0, 0);
    dead.takeDamage(dead.hp);
    const summary = um.getUnitSummary();
    expect(summary.length).toBe(1);
    expect(summary[0].id).toBe(u.id);
    expect(summary[0].x).toBe(2);
    expect(summary[0].y).toBe(3);
  });

  test('getUnitDetail returns full detail record for known unit, undefined otherwise', () => {
    const um = new UnitManager();
    const u = um.spawnUnit(UnitKind.Swordsman, 1, 1);
    const detail = um.getUnitDetail(u.id);
    expect(detail).toBeDefined();
    expect(detail!.id).toBe(u.id);
    expect(detail!.hp).toBe(u.hp);
    expect(um.getUnitDetail(9999)).toBeUndefined();
  });

  test('getMorale scales with rank', () => {
    const um = new UnitManager();
    const u = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const morale0 = um.getMorale(u.id)!;
    expect(morale0.moraleBonus).toBe(0);
    expect(morale0.moralePercent).toBe(100);

    u.rank = 2;
    const morale2 = um.getMorale(u.id)!;
    expect(morale2.moraleBonus).toBe(20);
    expect(morale2.moralePercent).toBe(120);

    expect(um.getMorale(9999)).toBeUndefined();
  });
});

describe('UnitManager — commands', () => {
  test('moveUnitTo assigns a path and sets state to Moving', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    const moved = um.moveUnitTo(u.id, 5, 5, map);
    expect(moved).toBe(true);
    expect(u.state).toBe(UnitState.Moving);
    expect(u.path).not.toBeNull();
    expect(u.targetX).toBe(5);
    expect(u.targetY).toBe(5);
  });

  test('moveUnitTo fails for dead or unknown unit', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const dead = um.spawnUnit(UnitKind.Settler, 0, 0);
    dead.takeDamage(dead.hp);
    expect(um.moveUnitTo(dead.id, 5, 5, map)).toBe(false);
    expect(um.moveUnitTo(9999, 5, 5, map)).toBe(false);
  });

  test('moveUnitTo fails when goal is impassable', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    map.setTerrain(5, 5, Terrain.Mountain);
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    expect(um.moveUnitTo(u.id, 5, 5, map)).toBe(false);
  });

  test('moveUnitsTo moves multiple units and returns count moved', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const a = um.spawnUnit(UnitKind.Settler, 0, 0);
    const b = um.spawnUnit(UnitKind.Settler, 1, 1);
    const moved = um.moveUnitsTo([a.id, b.id, 9999], 5, 5, map);
    expect(moved).toBe(2);
  });

  test('setUnitStance / setUnitsStance', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const b = um.spawnUnit(UnitKind.Swordsman, 1, 1);
    expect(um.setUnitStance(a.id, UnitStance.Passive)).toBe(true);
    expect(a.stance).toBe(UnitStance.Passive);
    expect(um.setUnitStance(9999, UnitStance.Passive)).toBe(false);

    const setCount = um.setUnitsStance([a.id, b.id], UnitStance.StandGround);
    expect(setCount).toBe(2);
    expect(a.stance).toBe(UnitStance.StandGround);
    expect(b.stance).toBe(UnitStance.StandGround);
  });

  test('attackUnit sets attackTargetId and Fighting state for valid attacker/target', () => {
    const um = new UnitManager();
    const attacker = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 1, 1);
    expect(um.attackUnit(attacker.id, target.id)).toBe(true);
    expect(attacker.attackTargetId).toBe(target.id);
    expect(attacker.state).toBe(UnitState.Fighting);
  });

  test('attackUnit fails when attacker cannot fight (e.g. Settler)', () => {
    const um = new UnitManager();
    const attacker = um.spawnUnit(UnitKind.Settler, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 1, 1);
    expect(um.attackUnit(attacker.id, target.id)).toBe(false);
  });

  test('attackUnit fails when target is dead', () => {
    const um = new UnitManager();
    const attacker = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 1, 1);
    target.takeDamage(target.hp);
    expect(um.attackUnit(attacker.id, target.id)).toBe(false);
  });
});

describe('UnitManager — tick simulation', () => {
  test('tick moves a unit step-by-step along its path toward the goal', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    um.moveUnitTo(u.id, 3, 0, map);

    // The path returned by the pathfinder includes the unit's current tile
    // as its first element, so the first tick "consumes" that (no-op) step;
    // real movement begins on the second tick.
    const startX = u.x;
    um.tick(map);
    um.tick(map);
    expect(u.x).toBeGreaterThan(startX);
  });

  test('unit reaches goal and clears path/state after enough ticks', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    um.moveUnitTo(u.id, 1, 0, map);

    // Settler speed 1.0 * 0.1 = 0.1 per tick; needs ~10 ticks to cross 1 tile
    // (plus one extra "consume start tile" tick, plus float-error margin).
    for (let i = 0; i < 25; i++) um.tick(map);

    expect(u.x).toBeCloseTo(1, 0);
    expect(u.path).toBeNull();
    expect(u.state).toBe(UnitState.Idle);
  });

  test('dying unit counts down and is reflected in getRecentDeathCount exactly once', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    u.takeDamage(u.hp); // starts dyingTimer = 1.0

    // dyingTimer decreases by 0.1 per tick; due to floating point accumulation
    // it may take 10 or 11 ticks to actually cross <= 0. Tick generously and
    // ensure the death is registered exactly once across the whole run.
    let totalDeaths = 0;
    for (let i = 0; i < 15; i++) {
      um.tick(map);
      totalDeaths += um.getRecentDeathCount();
    }
    expect(totalDeaths).toBe(1);
  });

  test('combat: attacker in range damages target on cooldown expiry', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const attacker = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 1, 0); // within attackRange=1
    um.attackUnit(attacker.id, target.id);

    const hpBefore = target.hp;
    um.tick(map);
    expect(target.hp).toBeLessThan(hpBefore);
    expect(um.getRecentCombatCount()).toBe(1);
  });

  test('combat: attacker moves toward out-of-range target instead of attacking', () => {
    const um = new UnitManager();
    const map = makeOpenMap(20, 20);
    const attacker = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 10, 10); // far away, out of range
    um.attackUnit(attacker.id, target.id);

    um.tick(map);
    expect(attacker.state).toBe(UnitState.Moving);
    expect(um.getRecentCombatCount()).toBe(0);
  });

  test('combat: attackTargetId cleared when target dies mid-fight', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const attacker = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 1, 0);
    um.attackUnit(attacker.id, target.id);
    target.takeDamage(target.hp); // kill target directly

    um.tick(map);
    expect(attacker.attackTargetId).toBeNull();
    expect(attacker.state).toBe(UnitState.Idle);
  });

  test('tickCulled skips units outside the view radius', () => {
    const um = new UnitManager();
    const map = makeOpenMap(10, 10);
    const u = um.spawnUnit(UnitKind.Settler, 0, 0);
    um.moveUnitTo(u.id, 5, 0, map);

    const culler = { isWithinView: () => false };
    const startX = u.x;
    um.tickCulled(map, culler);
    expect(u.x).toBe(startX); // did not move, culled
  });
});
