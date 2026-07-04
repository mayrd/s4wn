/**
 * S4WN Babylon.js/TypeScript - Unit Manager
 *
 * Manages all units: spawning, movement, state updates, death.
 * Fully migrated from engine/src/units.rs
 */

import { Unit } from './Unit';
import { UnitKind, UnitState, UnitStance } from './types';
import { Map as GameMap } from './Map';
import { Pathfinder, Path } from './Pathfinder';

export class UnitManager {
  units: Unit[] = [];
  nextUnitId: number = 1;
  private deathCount: number = 0;
  private combatCount: number = 0;

  spawnUnit(kind: UnitKind, x: number, y: number): Unit {
    const unit = new Unit(this.nextUnitId++, kind, x, y);
    this.units.push(unit);
    return unit;
  }

  getUnit(id: number): Unit | undefined {
    return this.units.find(u => u.id === id);
  }

  getAliveUnits(): Unit[] {
    return this.units.filter(u => u.isAlive());
  }

  getUnitsInRect(x1: number, y1: number, x2: number, y2: number): Unit[] {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return this.units.filter(u =>
      u.isAlive() &&
      u.x >= minX && u.x <= maxX &&
      u.y >= minY && u.y <= maxY
    );
  }

  getUnitSummary(): Array<{ id: number; kind: number; x: number; y: number; hp: number; maxHp: number; state: number; stance: number; carriedTool: number }> {
    return this.units.filter(u => u.isAlive()).map(u => ({
      id: u.id,
      kind: u.kind as number,
      x: Math.floor(u.x),
      y: Math.floor(u.y),
      hp: u.hp,
      maxHp: u.getMaxHp(),
      state: u.state as number,
      stance: u.stance as number,
      carriedTool: 0,
    }));
  }

  getUnitDetail(id: number): {
    id: number; kind: number; x: number; y: number;
    hp: number; maxHp: number; state: number; stance: number;
    dyingProgress: number | null; assignedBuilding: number | null;
    target: number | null; carriedTool: number;
  } | undefined {
    const unit = this.getUnit(id);
    if (!unit) return undefined;
    return {
      id: unit.id,
      kind: unit.kind as number,
      x: Math.floor(unit.x),
      y: Math.floor(unit.y),
      hp: unit.hp,
      maxHp: unit.getMaxHp(),
      state: unit.state as number,
      stance: unit.stance as number,
      dyingProgress: unit.dyingTimer !== null ? 1 - unit.dyingTimer : null,
      assignedBuilding: unit.assignedBuilding,
      target: unit.attackTargetId,
      carriedTool: 0,
    };
  }

  getMorale(id: number): { moraleBonus: number; moralePercent: number } | undefined {
    const unit = this.getUnit(id);
    if (!unit) return undefined;
    // Simplified morale: based on rank
    const moraleBonus = unit.rank * 10;
    const moralePercent = 100 + moraleBonus;
    return { moraleBonus, moralePercent };
  }

  // ── Commands ─────────────────────────────────────────────────────

  moveUnitTo(unitId: number, x: number, y: number, map: GameMap): boolean {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.isAlive()) return false;

    const path = Pathfinder.findPath(map, { x: Math.floor(unit.x), y: Math.floor(unit.y) }, { x, y });
    if (!path) return false;

    unit.moveAlong(path);
    unit.state = UnitState.Moving;
    unit.targetX = x;
    unit.targetY = y;
    return true;
  }

  moveUnitsTo(unitIds: number[], x: number, y: number, map: GameMap): number {
    let moved = 0;
    for (const id of unitIds) {
      if (this.moveUnitTo(id, x, y, map)) moved++;
    }
    return moved;
  }

  setUnitStance(unitId: number, stance: UnitStance): boolean {
    const unit = this.getUnit(unitId);
    if (!unit) return false;
    unit.stance = stance;
    return true;
  }

  setUnitsStance(unitIds: number[], stance: UnitStance): number {
    let set = 0;
    for (const id of unitIds) {
      if (this.setUnitStance(id, stance)) set++;
    }
    return set;
  }

  attackUnit(attackerId: number, targetId: number): boolean {
    const attacker = this.getUnit(attackerId);
    const target = this.getUnit(targetId);
    if (!attacker || !target || !attacker.canFight() || !target.isAlive()) return false;

    attacker.attackTargetId = targetId;
    attacker.state = UnitState.Fighting;
    return true;
  }

  // ── Tick ─────────────────────────────────────────────────────────

  tick(map: GameMap): void {
    this.deathCount = 0;
    this.combatCount = 0;

    for (const unit of this.units) {
      if (!unit.isAlive()) continue;

      // Handle dying animation
      if (unit.dyingTimer !== null) {
        unit.dyingTimer -= 0.1;
        if (unit.dyingTimer <= 0) {
          this.deathCount++;
        }
        continue;
      }

      // Handle movement
      if (unit.path && !unit.path.isEmpty()) {
        const nextTile = unit.path.getTiles()[0];
        if (nextTile) {
          const speed = unit.getSpeed() * 0.1;
          const dx = nextTile.x - unit.x;
          const dy = nextTile.y - unit.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < speed) {
            unit.x = nextTile.x;
            unit.y = nextTile.y;
            unit.path = new Path(unit.path.getTiles().slice(1));
            if (unit.path.isEmpty()) {
              unit.path = null;
              unit.state = UnitState.Idle;
            }
          } else {
            unit.x += (dx / dist) * speed;
            unit.y += (dy / dist) * speed;
          }
        }
      }

      // Handle attack cooldown
      if (unit.attackCooldown > 0) {
        unit.attackCooldown--;
      }

      // Handle combat
      if (unit.attackTargetId !== null) {
        const target = this.getUnit(unit.attackTargetId);
        if (!target || !target.isAlive()) {
          unit.attackTargetId = null;
          unit.state = UnitState.Idle;
          continue;
        }

        const dist = Math.sqrt(
          (unit.x - target.x) ** 2 + (unit.y - target.y) ** 2
        );

        if (dist <= unit.getAttackRange()) {
          if (unit.attackCooldown <= 0) {
            const died = target.takeDamage(unit.getAttackDamage());
            unit.attackCooldown = unit.getAttackInterval();
            this.combatCount++;
            if (died) {
              unit.addExperience(25);
            }
          }
        } else {
          // Move towards target
          const path = Pathfinder.findPath(
            map,
            { x: Math.floor(unit.x), y: Math.floor(unit.y) },
            { x: Math.floor(target.x), y: Math.floor(target.y) }
          );
          if (path) {
            unit.moveAlong(path);
            unit.state = UnitState.Moving;
          }
        }
      }
    }
  }

  getRecentDeathCount(): number {
    return this.deathCount;
  }

  getRecentCombatCount(): number {
    return this.combatCount;
  }
}