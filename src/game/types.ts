/**
 * S4WN TypeScript - Game Types
 * 
 * Migrated from engine/src/map.rs terrain data.
 */

export enum Terrain {
  Grass = 'Grass',
  Forest = 'Forest',
  Desert = 'Desert',
  Mountain = 'Mountain',
  Snow = 'Snow',
  Water = 'Water',
  DeepWater = 'DeepWater',
  Swamp = 'Swamp',
}

export enum ResourceType {
  None = 'None',
  Wood = 'Wood',
  Stone = 'Stone',
  Iron = 'Iron',
  Coal = 'Coal',
  Sulfur = 'Sulfur',
  Grain = 'Grain',
  Fish = 'Fish',
}

export interface TileData {
  terrain: Terrain;
  elevation: number;
  resource: ResourceType | null;
}

export interface Position {
  x: number;
  y: number;
}

export enum UnitKind {
  Settler,
  Swordsman,
  Bowman,
  Worker,
  Pioneer,
}

export enum UnitState {
  Idle,
  Moving,
  Working,
  Fighting,
  Dead,
}

export enum UnitStance {
  Aggressive,
  Defensive,
  StandGround,
  Passive,
}

// Forward declaration for Unit (referenced by AI types)
export type Unit = any; // Will be replaced with proper import from './Unit'

/**
 * WorkerAI needs to know when a worker is ready.
 */
export interface WorkOrder {
  /** Building kind being constructed */
  buildingKind: string;
  /** Resource name needed (e.g., 'wood', 'stone') */
  resourceNeeded: string;
}

// Forward declaration for Nation (referenced by AI types)
export type Nation = any; // Will be replaced with proper import from './Nation'