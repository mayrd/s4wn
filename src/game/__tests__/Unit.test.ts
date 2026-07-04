/**
 * TypeScript tests for Unit module
 *
 * Migrated from Rust tests in engine/src/units.rs
 */

import { Unit } from '../Unit';
import { UnitKind, UnitStance } from '../types';

describe('Unit', () => {
  test('unit new has correct defaults', () => {
    const unit = new Unit(1, UnitKind.Settler, 5, 5);
    expect(unit.id).toBe(1);
    expect(unit.kind).toBe(UnitKind.Settler);
    expect(unit.x).toBe(5);
    expect(unit.y).toBe(5);
    expect(unit.hp).toBeGreaterThan(0);
    expect(unit.stance).toBe(UnitStance.Aggressive);
  });

  test('settler has correct stats', () => {
    const unit = new Unit(1, UnitKind.Settler, 0, 0);
    expect(unit.canWork()).toBe(true);
    expect(unit.canFight()).toBe(false);
  });

  test('swordsman has correct stats', () => {
    const unit = new Unit(1, UnitKind.Swordsman, 0, 0);
    expect(unit.canWork()).toBe(false);
    expect(unit.canFight()).toBe(true);
    expect(unit.getAttackRange()).toBe(1);
  });

  test('bowman has ranged attack', () => {
    const unit = new Unit(1, UnitKind.Bowman, 0, 0);
    expect(unit.canWork()).toBe(false);
    expect(unit.canFight()).toBe(true);
    expect(unit.getAttackRange()).toBe(5);
  });

  test('take damage reduces hp', () => {
    const unit = new Unit(1, UnitKind.Settler, 0, 0);
    const initialHp = unit.hp;
    unit.takeDamage(30);
    expect(unit.hp).toBe(initialHp - 30);
  });

  test('take damage to zero triggers death animation', () => {
    const unit = new Unit(1, UnitKind.Settler, 0, 0);
    const died = unit.takeDamage(unit.hp);
    expect(died).toBe(true);
    expect(unit.dyingTimer).toBe(1.0); // 1 second death animation
  });

  test('add experience promotes soldier', () => {
    const unit = new Unit(1, UnitKind.Swordsman, 0, 0);
    unit.experience = 100; // Already enough for rank 1
    const promoted = unit.addExperience(10);
    expect(promoted).toBe(true);
    expect(unit.rank).toBe(1);
  });

  test('settlers cannot gain experience', () => {
    const unit = new Unit(1, UnitKind.Settler, 0, 0);
    const promoted = unit.addExperience(100);
    expect(promoted).toBe(false);
    expect(unit.rank).toBe(0);
  });

  test('assign to building clears path', () => {
    const unit = new Unit(1, UnitKind.Settler, 0, 0);
    // Add a path to the unit first
    unit.path = { getTiles: () => [], isEmpty: () => false, len: () => 0 } as any;
    unit.assignTo(5);
    expect(unit.assignedBuilding).toBe(5);
    expect(unit.path).toBeNull();
  });
});