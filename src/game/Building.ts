/**
 * S4WN Babylon.js/TypeScript - Building Module
 *
 * Building class for game state management.
 * Uses economy types from ../economy/types for all building data.
 */

import { BuildingType, ResourceType, RESOURCE_COUNT, maxHp, maxSettlers, buildTime } from '../economy/types';

export interface BuildingCost {
  resource: ResourceType;
  amount: number;
}

export class Building {
  kind: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  constructionProgress: number;
  isActive: boolean;
  productionProgress: number;
  inputBuffer: number[];
  outputBuffer: number[];
  assignedSettlers: number[];
  maxSettlers: number;
  destructionTimer: number | null = null;
  destructionProgress: number | null = null;

  constructor(kind: BuildingType, x: number, y: number) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.maxHp = maxHp(kind);
    this.hp = this.maxHp;
    this.constructionProgress = 0;
    this.isActive = false;
    this.productionProgress = 0;
    this.inputBuffer = new Array(RESOURCE_COUNT).fill(0);
    this.outputBuffer = new Array(RESOURCE_COUNT).fill(0);
    this.assignedSettlers = [];
    this.maxSettlers = maxSettlers(kind);
  }

  isComplete(): boolean {
    return this.constructionProgress >= 1.0;
  }

  tickConstruction(speedMult: number): boolean {
    if (this.isComplete()) return false;
    const bt = buildTime(this.kind);
    if (bt > 0) {
      this.constructionProgress += (1.0 / bt) * speedMult;
    } else {
      this.constructionProgress = 1.0;
    }
    if (this.constructionProgress >= 1.0) {
      this.constructionProgress = 1.0;
      this.isActive = true;
      return true;
    }
    return false;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.startDestruction(5.0);
    }
  }

  startDestruction(duration: number): void {
    this.destructionTimer = duration;
    this.destructionProgress = 0;
  }

  tickDestruction(dt: number): boolean {
    if (this.destructionTimer === null) return false;
    this.destructionTimer -= dt;
    this.destructionProgress = 1 - (this.destructionTimer / 5.0);
    return this.destructionTimer <= 0;
  }

  assignSettler(settlerId: number): boolean {
    if (this.assignedSettlers.length >= this.maxSettlers) return false;
    this.assignedSettlers.push(settlerId);
    return true;
  }

  removeSettler(settlerId: number): void {
    const idx = this.assignedSettlers.indexOf(settlerId);
    if (idx !== -1) {
      this.assignedSettlers.splice(idx, 1);
    }
  }

  hasSettler(settlerId: number): boolean {
    return this.assignedSettlers.includes(settlerId);
  }

  getDestructionProgress(): number | null {
    return this.destructionProgress;
  }

  isGarrisoned(): boolean {
    return this.assignedSettlers.length > 0;
  }

  canGarrison(): boolean {
    return this.maxSettlers > 0;
  }

  garrisonCount(): number {
    return this.assignedSettlers.length;
  }
}