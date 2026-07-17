/** @jest-environment jsdom */
import { LogisticsManager } from '../Logistics';
import { ResourceType } from '../../economy/types';

describe('LogisticsManager', () => {
  let log: LogisticsManager;

  beforeEach(() => {
    log = new LogisticsManager();
  });

  describe('spawnItem', () => {
    test('creates a resource item with assigned id, type, and position', () => {
      const item = log.spawnItem(ResourceType.Wood, 10, 5);
      expect(item.id).toBe(1);
      expect(item.type).toBe(ResourceType.Wood);
      expect(item.x).toBe(10);
      expect(item.y).toBe(5);
      expect(item.isReserved).toBe(false);
    });

    test('increments id for each new item', () => {
      const a = log.spawnItem(ResourceType.Wood, 0, 0);
      const b = log.spawnItem(ResourceType.Stone, 1, 1);
      expect(a.id).toBe(1);
      expect(b.id).toBe(2);
    });

    test('adds item to getItems list', () => {
      log.spawnItem(ResourceType.Wood, 0, 0);
      expect(log.getItems()).toHaveLength(1);
    });
  });

  describe('removeItem', () => {
    test('removes an existing item and returns true', () => {
      const item = log.spawnItem(ResourceType.Wood, 0, 0);
      expect(log.removeItem(item.id)).toBe(true);
      expect(log.getItems()).toHaveLength(0);
    });

    test('returns false for non-existent id', () => {
      expect(log.removeItem(999)).toBe(false);
    });

    test('only removes the targeted item', () => {
      const a = log.spawnItem(ResourceType.Wood, 0, 0);
      const b = log.spawnItem(ResourceType.Stone, 1, 1);
      log.removeItem(a.id);
      expect(log.getItems()).toHaveLength(1);
      expect(log.getItems()[0].id).toBe(b.id);
    });
  });

  describe('getUnreservedItem', () => {
    test('finds closest matching unreserved item', () => {
      log.spawnItem(ResourceType.Wood, 0, 0);   // dist^2 = 0+0
      log.spawnItem(ResourceType.Wood, 10, 0);  // dist^2 = 100
      log.spawnItem(ResourceType.Wood, 3, 4);   // dist^2 = 25

      const found = log.getUnreservedItem(ResourceType.Wood, 0, 0);
      expect(found).not.toBeNull();
      expect(found!.x).toBe(0);
      expect(found!.y).toBe(0);
    });

    test('returns null when no items of that type exist', () => {
      log.spawnItem(ResourceType.Wood, 0, 0);
      expect(log.getUnreservedItem(ResourceType.Stone, 0, 0)).toBeNull();
    });

    test('returns null when all items of type are reserved', () => {
      const item = log.spawnItem(ResourceType.Wood, 0, 0);
      item.isReserved = true;
      expect(log.getUnreservedItem(ResourceType.Wood, 0, 0)).toBeNull();
    });

    test('returns closest by euclidean distance', () => {
      log.spawnItem(ResourceType.Wood, 100, 100); // far
      log.spawnItem(ResourceType.Wood, 5, 5);     // close
      log.spawnItem(ResourceType.Wood, 50, 50);   // mid

      const found = log.getUnreservedItem(ResourceType.Wood, 0, 0);
      expect(found).not.toBeNull();
      expect(found!.x).toBe(5);
      expect(found!.y).toBe(5);
    });

    test('skips reserved items and picks next closest', () => {
      log.spawnItem(ResourceType.Wood, 0, 0);    // close but reserve it
      log.spawnItem(ResourceType.Wood, 8, 6);    // next closest after reservation
      log.spawnItem(ResourceType.Wood, 100, 100);

      // Reserve the closest
      const items = log.getItems();
      items[0].isReserved = true;

      const found = log.getUnreservedItem(ResourceType.Wood, 0, 0);
      expect(found).not.toBeNull();
      expect(found!.x).toBe(8);
      expect(found!.y).toBe(6);
    });
  });

  describe('getItems', () => {
    test('returns empty array initially', () => {
      expect(log.getItems()).toEqual([]);
    });

    test('returns all items in insertion order', () => {
      log.spawnItem(ResourceType.Wood, 0, 0);
      log.spawnItem(ResourceType.Stone, 1, 1);
      log.spawnItem(ResourceType.Gold, 2, 2);
      expect(log.getItems()).toHaveLength(3);
    });
  });

  describe('reservation flow (integration)', () => {
    test('find-reserve-remove cycle simulates carrier pickup', () => {
      const item = log.spawnItem(ResourceType.Planks, 5, 5);

      // Carrier finds and reserves
      const found = log.getUnreservedItem(ResourceType.Planks, 0, 0);
      expect(found).not.toBeNull();
      found!.isReserved = true;

      // Another carrier can't get it now
      expect(log.getUnreservedItem(ResourceType.Planks, 100, 100)).toBeNull();

      // Carrier delivers it, remove from world
      expect(log.removeItem(item.id)).toBe(true);
      expect(log.getItems()).toHaveLength(0);
    });
  });

  describe('demand tracking', () => {
    test('registerDemand adds a demand', () => {
      log.registerDemand(5, ResourceType.Wood, 3, 10, 20);
      expect(log.getDemands()).toHaveLength(1);
      expect(log.getDemands()[0].buildingIndex).toBe(5);
      expect(log.getDemands()[0].type).toBe(ResourceType.Wood);
      expect(log.getDemands()[0].amount).toBe(3);
    });

    test('clearDemands removes all demands', () => {
      log.registerDemand(1, ResourceType.Wood, 1, 0, 0);
      log.registerDemand(2, ResourceType.Stone, 2, 0, 0);
      log.clearDemands();
      expect(log.getDemands()).toHaveLength(0);
    });

    test('matchDemand finds item matching first demand', () => {
      log.spawnItem(ResourceType.Wood, 5, 5);
      log.registerDemand(99, ResourceType.Wood, 1, 6, 6);

      const match = log.matchDemand();
      expect(match).not.toBeNull();
      expect(match!.demand.buildingIndex).toBe(99);
      expect(match!.item.type).toBe(ResourceType.Wood);
    });

    test('matchDemand returns null when no matching item', () => {
      log.registerDemand(1, ResourceType.Gold, 1, 0, 0);
      log.spawnItem(ResourceType.Wood, 0, 0);
      expect(log.matchDemand()).toBeNull();
    });

    test('matchDemand returns null when item is reserved', () => {
      const item = log.spawnItem(ResourceType.Wood, 0, 0);
      item.isReserved = true;
      log.registerDemand(1, ResourceType.Wood, 1, 0, 0);
      expect(log.matchDemand()).toBeNull();
    });
  });
});
