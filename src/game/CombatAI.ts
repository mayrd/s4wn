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
      // 1. Low Health Retreat: If HP < 20%, stop attacking and go passive
      if (unit.hp < unit.getMaxHp() * 0.2) {
        if (unit.attackTargetId !== null) {
          unit.attackTargetId = null;
          unit.stance = UnitStance.Passive;
        }
        continue;
      }

      if (unit.attackTargetId !== null) continue;

      switch (unit.stance) {
        case UnitStance.Aggressive:
          this.tryEngageNearby(unit);
          break;
        case UnitStance.StandGround:
          this.tryAttackInRange(unit);
          break;
        case UnitStance.Passive:
          // Passive units don't initiate, but could be expanded to defend
          break;
      }
    }
  }

  private tryEngageNearby(unit: import('./Unit').Unit): void {
    const searchRadius = 8;
    let bestTarget: import('./Unit').Unit | null = null;
    let bestScore = -1;

    for (const other of this.unitManager.getAliveUnits()) {
      if (other.id === unit.id) continue;
      if (!other.canFight()) continue;

      const dist = Math.sqrt(
        (unit.x - other.x) ** 2 + (unit.y - other.y) ** 2
      );

      if (dist <= searchRadius) {
        // Score based on distance and health (prioritize closer, weaker targets)
        const healthFactor = 1 - (other.hp / other.getMaxHp());
        const distFactor = 1 - (dist / searchRadius);
        const score = (healthFactor * 0.6) + (distFactor * 0.4);

        if (score > bestScore) {
          bestScore = score;
          bestTarget = other;
        }
      }
    }

    if (bestTarget) {
      this.unitManager.attackUnit(unit.id, bestTarget.id);
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