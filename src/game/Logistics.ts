import { ResourceType } from '../economy/types';

export interface ResourceItem {
  id: number;
  type: ResourceType;
  x: number;
  y: number;
  isReserved: boolean; // True if a carrier is on the way to pick this up
}

export interface ResourceDemand {
  buildingIndex: number;
  type: ResourceType;
  amount: number;
  x: number;
  y: number;
  /** Whether this is a StorageYard (central storage) demand */
  isStorageYard?: boolean;
}

/** Maximum items per tile at StorageYards (8-stack logistics pattern) */
export const STORAGE_YARD_STACK_LIMIT = 8;

export class LogisticsManager {
  private items: ResourceItem[] = [];
  private nextItemId: number = 1;
  private demands: ResourceDemand[] = [];
  /** StorageYard positions for priority routing */
  private storageYardPositions: Array<{ x: number; y: number }> = [];

  spawnItem(type: ResourceType, x: number, y: number, force = false): ResourceItem | null {
    // Check stack limit - if at or above limit, find adjacent tile for overflow
    if (!force) {
      const stackCount = this.getStackCountAt(x, y);
      if (stackCount >= STORAGE_YARD_STACK_LIMIT) {
        // Find adjacent tile for overflow
        const adjacentPos = this.findAdjacentEmptyTile(x, y);
        if (adjacentPos) {
          return this.spawnItem(type, adjacentPos.x, adjacentPos.y, true);
        }
        // No space available, return null (item discarded)
        return null;
      }
    }

    const item = {
      id: this.nextItemId++,
      type,
      x,
      y,
      isReserved: false,
    };
    this.items.push(item);
    return item;
  }

  removeItem(id: number): boolean {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      return true;
    }
    return false;
  }

  getItems(): ResourceItem[] {
    return [...this.items];
  }

  /** Get number of items at a specific tile position */
  getStackCountAt(x: number, y: number): number {
    return this.items.filter(item => item.x === x && item.y === y).length;
  }

  /** Find adjacent tile with room for more items */
  private findAdjacentEmptyTile(centerX: number, centerY: number): { x: number; y: number } | null {
    const offsets = [
      [0, 1], [1, 0], [0, -1], [-1, 0], // Cardinal
      [1, 1], [-1, 1], [1, -1], [-1, -1], // Diagonal
    ];
    for (const [dx, dy] of offsets) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (this.getStackCountAt(x, y) < STORAGE_YARD_STACK_LIMIT) {
        return { x, y };
      }
    }
    return null;
  }

  getUnreservedItem(type: ResourceType, nearX: number, nearY: number): ResourceItem | null {
    let bestItem: ResourceItem | null = null;
    let bestDistSq = Infinity;

    for (const item of this.items) {
      if (item.type === type && !item.isReserved) {
        const dx = item.x - nearX;
        const dy = item.y - nearY;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestItem = item;
        }
      }
    }
    return bestItem;
  }

  // ── StorageYard Registration ──────────────────────────────────

  /** Register a StorageYard position for priority routing */
  registerStorageYard(x: number, y: number): void {
    this.storageYardPositions.push({ x, y });
  }

  /** Unregister a StorageYard position */
  unregisterStorageYard(x: number, y: number): void {
    const idx = this.storageYardPositions.findIndex(p => p.x === x && p.y === y);
    if (idx !== -1) {
      this.storageYardPositions.splice(idx, 1);
    }
  }

  /** Get all registered StorageYard positions */
  getStorageYardPositions(): Array<{ x: number; y: number }> {
    return [...this.storageYardPositions];
  }

  // ── Demand Tracking ──────────────────────────────────

  registerDemand(buildingIndex: number, type: ResourceType, amount: number, x: number, y: number, isStorageYard = false): void {
    this.demands.push({ buildingIndex, type, amount, x, y, isStorageYard });
  }

  clearDemands(): void {
    this.demands = [];
  }

  getDemands(): ResourceDemand[] {
    return [...this.demands];
  }

  /**
   * Find an unreserved item that matches any demand and return both.
   * StorageYard demands are prioritized (processed first) to enable
   * the 8-stack logistics pattern where carriers deliver to central storage.
   */
  matchDemand(): { demand: ResourceDemand; item: ResourceItem } | null {
    // Priority 1: StorageYard demands (sort by distance to nearest available item)
    const storageYardDemands = this.demands.filter(d => d.isStorageYard);
    for (const demand of storageYardDemands) {
      const item = this.getUnreservedItem(demand.type, demand.x, demand.y);
      if (item) {
        return { demand, item };
      }
    }

    // Priority 2: Non-StorageYard demands
    for (const demand of this.demands) {
      if (demand.isStorageYard) continue;
      const item = this.getUnreservedItem(demand.type, demand.x, demand.y);
      if (item) {
        return { demand, item };
      }
    }

    return null;
  }

  /**
   * Find demand for a specific StorageYard position.
   * Used when carriers want to deliver to specific StorageYard.
   */
  findDemandForStorageYard(x: number, y: number, resourceType: ResourceType): ResourceDemand | undefined {
    return this.demands.find(d =>
      d.isStorageYard &&
      d.x === x && d.y === y &&
      d.type === resourceType &&
      !this.isStorageYardAtCapacity(d.x, d.y)
    );
  }

  /** Check if a StorageYard tile is at capacity */
  isStorageYardAtCapacity(x: number, y: number): boolean {
    return this.getStackCountAt(x, y) >= STORAGE_YARD_STACK_LIMIT;
  }

  // ── Serialization ───────────────────────────────────────────────

  toJSON(): object {
    return {
      items: [...this.items],
      demands: [...this.demands],
      storageYardPositions: [...this.storageYardPositions],
      nextItemId: this.nextItemId,
    };
  }

  restoreFromJSON(data: any): void {
    this.items = (data.items || []).map((i: any) => ({
      id: i.id,
      type: i.type,
      x: i.x,
      y: i.y,
      isReserved: i.isReserved ?? false,
    }));
    this.demands = (data.demands || []).map((d: any) => ({
      buildingIndex: d.buildingIndex,
      type: d.type,
      amount: d.amount,
      x: d.x,
      y: d.y,
      isStorageYard: d.isStorageYard ?? false,
    }));
    this.storageYardPositions = [...(data.storageYardPositions || [])];
    this.nextItemId = data.nextItemId || 1;
  }
}