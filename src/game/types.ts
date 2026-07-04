/**
 * S4WN Babylon.js/TypeScript - Game Types
 *
 * Core enums and types migrated from Rust backend.
 */

// Terrain types (8 variants matching Rust map.rs)
export enum Terrain {
  Grass = 0,
  Water = 1,
  DeepWater = 2,
  Forest = 3,
  Desert = 4,
  Mountain = 5,
  Snow = 6,
  Swamp = 7,
}

// Resource types (matching Rust ResourceType enum)
export enum ResourceType {
  Wood = 0,
  Iron = 1,
  Coal = 2,
  Gold = 3,
  Stone = 4,
  Sulfur = 5,
  Fish = 6,
  Grain = 7,
}
export const RESOURCE_COUNT = 8;

// Unit kinds (matching Rust UnitKind enum)
export enum UnitKind {
  Settler = 0,
  Swordsman = 1,
  Bowman = 2,
}

// Unit states
export enum UnitState {
  Idle = 0,
  Moving = 1,
  Working = 2,
  Fighting = 3,
  Carrying = 4,
  Dying = 5,
}

// Unit stances
export enum UnitStance {
  Aggressive = 0,
  Passive = 1,
  StandGround = 2,
}

// Nations
export enum NationType {
  Romans = 0,
  Vikings = 1,
  Mayans = 2,
  Trojans = 3,
  DarkTribe = 4,
}

// Building categories
export enum BuildingCategory {
  Civil = 0,
  Military = 1,
  Production = 2,
}

// Tool types
export enum ToolType {
  Hammer = 0,
  Saw = 1,
  Pickaxe = 2,
  Ax = 3,
  Shovel = 4,
  Sword = 5,
  Bow = 6,
}

// Resource categories
export enum ResourceCategory {
  Raw = 0,
  Processed = 1,
}