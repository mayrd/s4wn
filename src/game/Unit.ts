/**
 * S4WN Phaser/TypeScript - Unit Module
 *
 * Migrated from engine/src/units.rs
 * Unit kinds, states, stances, and stats.
 */

import { UnitKind, UnitState, UnitStance } from './types';
import { ResourceType as EconomyResourceType } from '../economy/types';
import { Path } from './Pathfinder';

export interface UnitStats {
  maxHp: number;
  speed: number;
  attackDamage: number;
  attackRange: number;
  attackInterval: number;
  canWork: boolean;
  canFight: boolean;
}

const UNIT_STATS: Record<UnitKind, UnitStats> = {
  [UnitKind.Settler]: {
    maxHp: 100,
    speed: 1.0,
    attackDamage: 0,
    attackRange: 0,
    attackInterval: 0,
    canWork: true,
    canFight: false,
  },
  [UnitKind.Swordsman]: {
    maxHp: 150,
    speed: 0.8,
    attackDamage: 25,
    attackRange: 1,
    attackInterval: 60,
    canWork: false,
    canFight: true,
  },
  [UnitKind.Bowman]: {
    maxHp: 100,
    speed: 0.9,
    attackDamage: 20,
    attackRange: 5,
    attackInterval: 45,
    canWork: false,
    canFight: true,
  },
  [UnitKind.Worker]: {
    maxHp: 80,
    speed: 1.1,
    attackDamage: 5,
    attackRange: 0.5,
    attackInterval: 0,
    canWork: true,
    canFight: false,
  },
  [UnitKind.Pioneer]: {
    maxHp: 100,
    speed: 1.2,
    attackDamage: 0,
    attackRange: 0,
    attackInterval: 0,
    canWork: true,
    canFight: false,
  },
};

export class Unit {
  id: number;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  state: UnitState;
  stance: UnitStance;
  path: Path | null = null;
  targetX: number | null = null;
  targetY: number | null = null;
  assignedBuilding: number | null = null;
  rank: number = 0;
  experience: number = 0;
  attackCooldown: number = 0;
  attackTargetId: number | null = null;
  dyingTimer: number | null = null;
  /** Current projectile/target tile for Bowman arrow arcs */
  projectileTargetX: number | null = null;
  projectileTargetY: number | null = null;
  /** If garrisoned, the building index this unit is defending */
  garrisonBuildingIndex: number | null = null;
  carrying: { resource: EconomyResourceType; amount: number } | null = null;
  logisticsTargetItemId: number | null = null;
  logisticsTargetBuildingIndex: number | null = null;

  /** Construction role if this unit is assigned to a construction site. */
  constructionRole: 'digger' | 'builder' | 'carrier' | null = null;
  /** Index of the ConstructionSite this unit is working on. */
  constructionTargetSite: number | null = null;

  constructor(id: number, kind: UnitKind, x: number, y: number) {
    this.id = id;
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.hp = this.getMaxHp();
    this.state = UnitState.Idle;
    this.stance = UnitStance.Aggressive;
    this.projectileTargetX = null;
    this.projectileTargetY = null;
    this.garrisonBuildingIndex = null;
  }

  getMaxHp(): number {
    return UNIT_STATS[this.kind].maxHp;
  }

  getSpeed(): number {
    return UNIT_STATS[this.kind].speed;
  }

  getAttackDamage(): number {
    const baseDamage = UNIT_STATS[this.kind].attackDamage;
    // Rank damage bonus
    return baseDamage + this.rank * 5;
  }

  getAttackRange(): number {
    return UNIT_STATS[this.kind].attackRange;
  }

  getAttackInterval(): number {
    return UNIT_STATS[this.kind].attackInterval;
  }

  canWork(): boolean {
    return UNIT_STATS[this.kind].canWork;
  }

  canFight(): boolean {
    return UNIT_STATS[this.kind].canFight;
  }

  isAlive(): boolean {
    return this.dyingTimer === null && this.hp > 0;
  }

  isIdle(): boolean {
    return this.path === null && this.state === UnitState.Idle;
  }

  assignTo(buildingIndex: number): void {
    this.assignedBuilding = buildingIndex;
    this.path = null;
  }

  /** Enter a building as a garrison defender */
  garrison(buildingIndex: number): void {
    this.garrisonBuildingIndex = buildingIndex;
    this.path = null;
    this.state = UnitState.Idle;
  }

  /** Leave garrison */
  ungarrison(): void {
    this.garrisonBuildingIndex = null;
  }

  /** Whether this unit is currently garrisoned inside a building */
  isGarrisoned(): boolean {
    return this.garrisonBuildingIndex !== null;
  }

  unassign(): void {
    this.assignedBuilding = null;
  }

  moveAlong(path: Path): void {
    this.path = path;
  }

  targetTile(): PathPoint | null {
    if (this.targetX === null || this.targetY === null) return null;
    return { x: this.targetX, y: this.targetY };
  }

  takeDamage(amount: number): boolean {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0 && this.dyingTimer === null) {
      this.dyingTimer = 1.0; // 1 second death animation
      return true; // Just died
    }
    return false;
  }

  addExperience(xp: number): boolean {
    if (this.kind === UnitKind.Settler) return false; // Settlers can't gain XP
    
    this.experience += xp;
    const xpForNextRank = [100, 300, 600]; // XP thresholds for ranks 1, 2, 3
    
    if (this.rank < 3 && this.experience >= xpForNextRank[this.rank]) {
      this.rank++;
      this.hp = this.getMaxHp(); // Heal on promotion
      return true; // Promoted
    }
    return false;
  }
}

interface PathPoint {
  x: number;
  y: number;
}