/**
 * S4WN TypeScript - Game Types
 * 
 * Migrated from engine/src/map.rs terrain data.
 */

export enum Terrain {
  Grass = 'Grass',
  Forest,
  Desert,
  Mountain,
  Snow,
  Water,
  DeepWater,
  Swamp,
}

export enum ResourceType {
  None = 'None',
  Wood,
  Stone,
  Iron,
  Coal,
  Sulfur,
  Grain,
  Fish,
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