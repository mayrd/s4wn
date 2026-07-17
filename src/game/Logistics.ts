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
}

export class LogisticsManager {
  private items: ResourceItem[] = [];
  private nextItemId: number = 1; // Changed from nextItemId
  private demands: ResourceDemand[] = [];

  spawnItem(type: ResourceType, x: number, y: number): ResourceItem {
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
    return this.items;
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

  // ── Demand Tracking ──────────────────────────────────

  registerDemand(buildingIndex: number, type: ResourceType, amount: number, x: number, y: number): void {
    this.demands.push({ buildingIndex, type, amount, x, y });
  }

  clearDemands(): void {
    this.demands = [];
  }

  getDemands(): ResourceDemand[] {
    return this.demands;
  }

  /** Find an unreserved item that matches any demand and return both */
  matchDemand(): { demand: ResourceDemand; item: ResourceItem } | null {
    for (const demand of this.demands) {
      const item = this.getUnreservedItem(demand.type, demand.x, demand.y);
      if (item) {
        return { demand, item };
      }
    }
    return null;
  }
}