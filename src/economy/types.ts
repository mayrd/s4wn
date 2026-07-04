/**
 * S4WN Phaser/TypeScript - Economy Types
 *
 * Building types matching Rust economy.rs
 */

export enum BuildingType {
  // Economic buildings (1-20)
  Headquarters = 0,
  Farm = 1,
  Lumberjack = 2,
  Sawmill = 3,
  Fishery = 4,
  Quarry = 5,
  MineIron = 6,
  MineCoal = 7,
  MineGold = 8,
  MineSulfur = 9,
  Stonecutter = 10,
  Waterworks = 11,
  Barracks = 12,
  Archery = 13,
  // ... 77 total building types
}

// Resource type enum for array indexing
export const RESOURCE_COUNT = 8;
export const TOOL_COUNT = 11;

// Tool types
export enum ToolKind {
  Hammer = 0,
  Saw = 1,
  Pickaxe = 2,
  Ax = 3,
  Shovel = 4,
  Sword = 5,
  Bow = 6,
}

// Production chain categories
export enum ProductionCategory {
  Raw = 0,
  Processed = 1,
}