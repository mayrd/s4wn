/**
 * S4WN Babylon.js/TypeScript - Building Module
 *
 * Migrated from engine/src/economy.rs
 * Building types, placement, production.
 */

import { BuildingType } from '../economy/types';
import { ResourceType, RESOURCE_COUNT } from './types';

export interface BuildingCost {
  resource: ResourceType;
  amount: number;
}

export interface BuildingInputs {
  resource: ResourceType;
  amount: number;
}

export interface BuildingOutputs {
  resource: ResourceType;
  amount: number;
}

export class Building {
  kind: BuildingType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  constructionProgress: number; // 0.0 to 1.0
  isActive: boolean;
  productionProgress: number;
  inputBuffer: number[]; // Indexed by ResourceType
  outputBuffer: number[]; // Indexed by ResourceType
  assignedSettlers: number[]; // Unit IDs
  maxSettlers: number;
  destructionTimer: number | null = null;
  destructionProgress: number | null = null;

  constructor(kind: BuildingType, x: number, y: number) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.hp = this.calcMaxHp();
    this.maxHp = this.hp;
    this.constructionProgress = 0;
    this.isActive = false;
    this.productionProgress = 0;
    this.inputBuffer = new Array(RESOURCE_COUNT).fill(0);
    this.outputBuffer = new Array(RESOURCE_COUNT).fill(0);
    this.assignedSettlers = [];
    this.maxSettlers = this.calcMaxSettlers();
  }

  calcMaxHp(): number {
    // Building HP based on type (matching Rust implementation)
    const hpMap: Record<string, number> = {
      // Economic buildings
      headquarters: 1000,
      farm: 300,
      lumberjack: 200,
      // ... more to be added
    };
    return hpMap[this.kind.toString()] || 500;
  }

  calcMaxSettlers(): number {
    // Max workers based on building type
    const settlerMap: Record<string, number> = {
      farm: 2,
      lumberjack: 1,
      headquarters: 3,
      // ... more to be added
    };
    return settlerMap[this.kind.toString()] || 1;
  }

  isComplete(): boolean {
    return this.constructionProgress >= 1.0;
  }

  tickConstruction(speedMult: number): boolean {
    if (this.isComplete()) return false;
    
    this.constructionProgress += 0.01 * speedMult; // Simplified - should use build_ticks
    if (this.constructionProgress >= 1.0) {
      this.isActive = true;
      return true; // Just completed
    }
    return false;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp === 0) {
      this.startDestruction(5.0); // 5 seconds destruction
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