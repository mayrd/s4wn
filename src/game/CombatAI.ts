/**
 * S4WN Babylon.js/TypeScript - Combat AI
 *
 * AI logic for military units: engage enemies, patrol, defend.
 * Fully migrated from engine/src/combat.rs
 */

import { UnitManager } from './UnitManager';
import { UnitStance } from './types';

export class CombatAI {
  constructor(
    private unitManager: UnitManager,
  ) {}

  tick(): void {
    const military = this.unitManager.getAliveUnits().filter(u => u.canFight());

    for (const unit of military) {
      if (unit.attackTargetId !== null) continue;

      switch (unit.stance) {
        case UnitStance.Aggressive:
          this.tryEngageNearby(unit);
          break;
        case UnitStance.StandGround:
          this.tryAttackInRange(unit);
          break;
        case UnitStance.Passive:
          break;
      }
    }
  }

  private tryEngageNearby(unit: import('./Unit').Unit): void {
    const searchRadius = 8;
    let closestEnemy: import('./Unit').Unit | null = null;
    let closestDist = searchRadius + 1;

    for (const other of this.unitManager.getAliveUnits()) {
      if (other.id === unit.id) continue;
      if (!other.canFight()) continue;

      const dist = Math.sqrt(
        (unit.x - other.x) ** 2 + (unit.y - other.y) ** 2
      );

      if (dist < closestDist) {
        closestDist = dist;
        closestEnemy = other;
      }
    }

    if (closestEnemy) {
      this.unitManager.attackUnit(unit.id, closestEnemy.id);
    }
  }

  private tryAttackInRange(unit: import('./Unit').Unit): void {
    for (const other of this.unitManager.getAliveUnits()) {
      if (other.id === unit.id) continue;
      if (!other.canFight()) continue;

      const dist = Math.sqrt(
        (unit.x - other.x) ** 2 + (unit.y - other.y) ** 2
      );

      if (dist <= unit.getAttackRange()) {
        this.unitManager.attackUnit(unit.id, other.id);
        return;
      }
    }
  }
}