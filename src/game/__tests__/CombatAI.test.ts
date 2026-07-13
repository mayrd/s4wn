/**
 * TypeScript tests for CombatAI module
 */

import { CombatAI } from '../CombatAI';
import { UnitManager } from '../UnitManager';
import { UnitKind, UnitStance } from '../types';

describe('CombatAI', () => {
  test('ignores non-fighting units (e.g. Settlers)', () => {
    const um = new UnitManager();
    um.spawnUnit(UnitKind.Settler, 0, 0);
    const ai = new CombatAI(um);
    expect(() => ai.tick()).not.toThrow();
  });

  test('Aggressive stance engages a nearby enemy within search radius', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const b = um.spawnUnit(UnitKind.Swordsman, 3, 0); // within 8-tile radius
    a.stance = UnitStance.Aggressive;
    b.stance = UnitStance.Passive; // prevent b also acting as attacker for the assertion

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBe(b.id);
  });

  test('Aggressive stance does not engage enemies outside search radius', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    um.spawnUnit(UnitKind.Swordsman, 50, 50); // far outside radius=8
    a.stance = UnitStance.Aggressive;

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBeNull();
  });

  test('StandGround stance only attacks targets already in weapon range', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0); // attackRange = 1
    const near = um.spawnUnit(UnitKind.Swordsman, 1, 0); // in range
    a.stance = UnitStance.StandGround;
    near.stance = UnitStance.Passive;

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBe(near.id);
  });

  test('StandGround stance does not chase targets out of range', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    um.spawnUnit(UnitKind.Swordsman, 5, 0); // out of attackRange=1
    a.stance = UnitStance.StandGround;

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBeNull();
  });

  test('Passive stance never initiates an attack', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    um.spawnUnit(UnitKind.Swordsman, 1, 0); // in range, but a is passive
    a.stance = UnitStance.Passive;

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBeNull();
  });

  test('low health unit (<20% hp) retreats: clears target and goes Passive', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const target = um.spawnUnit(UnitKind.Swordsman, 1, 0);
    a.attackTargetId = target.id;
    a.hp = Math.floor(a.getMaxHp() * 0.1); // below 20% threshold

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBeNull();
    expect(a.stance).toBe(UnitStance.Passive);
  });

  test('does not consider dead units as targets', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const dead = um.spawnUnit(UnitKind.Swordsman, 1, 0);
    dead.takeDamage(dead.hp);
    a.stance = UnitStance.Aggressive;

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBeNull();
  });

  test('already-engaged unit is skipped (does not re-evaluate target)', () => {
    const um = new UnitManager();
    const a = um.spawnUnit(UnitKind.Swordsman, 0, 0);
    const t1 = um.spawnUnit(UnitKind.Swordsman, 1, 0);
    const t2 = um.spawnUnit(UnitKind.Swordsman, 2, 0);
    a.attackTargetId = t1.id;
    a.stance = UnitStance.Aggressive;
    t1.stance = UnitStance.Passive;
    t2.stance = UnitStance.Passive;

    const ai = new CombatAI(um);
    ai.tick();

    expect(a.attackTargetId).toBe(t1.id);
  });
});
