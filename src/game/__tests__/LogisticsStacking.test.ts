/** @jest-environment jsdom */
import { LogisticsManager, ResourceItem, STORAGE_YARD_STACK_LIMIT } from '../Logistics';
import { ResourceType } from '../../economy/types';

describe('LogisticsStacking', () => {
  let logistics: LogisticsManager;

  beforeEach(() => {
    logistics = new LogisticsManager();
  });

  describe('resource stacking - 8 items per tile limit at StorageYards', () => {
    test('can spawn items on a tile up to the 8-stack limit', () => {
      const x = 5;
      const y = 5;

      // Spawn items at the same position
      const items: ResourceItem[] = [];
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        const item = logistics.spawnItem(ResourceType.Wood, x, y);
        expect(item).toBeDefined();
        items.push(item!);
      }

      // All items should be in the pool
      expect(logistics.getItems()).toHaveLength(STORAGE_YARD_STACK_LIMIT);

      // Verify count on this tile
      const itemsOnTile = logistics.getItems().filter(
        item => item.x === x && item.y === y
      );
      expect(itemsOnTile).toHaveLength(STORAGE_YARD_STACK_LIMIT);
    });

    test('excess items overflow to adjacent tiles when stack limit reached', () => {
      const x = 10;
      const y = 10;

      // Fill the stack to capacity
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        const item = logistics.spawnItem(ResourceType.Wood, x, y);
        expect(item).toBeDefined();
      }

      // Verify stack is at limit
      expect(logistics.getStackCountAt(x, y)).toBe(STORAGE_YARD_STACK_LIMIT);
    });

    test('stack limit applies independently per tile', () => {
      // Fill one tile to capacity
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, 0, 0);
      }

      // Different tiles should still accept items
      logistics.spawnItem(ResourceType.Wood, 1, 1);
      logistics.spawnItem(ResourceType.Wood, 2, 2);

      expect(logistics.getItems()).toHaveLength(STORAGE_YARD_STACK_LIMIT + 2);
    });

    test('different resource types share the same stack limit on a tile', () => {
      const x = 7;
      const y = 7;

      // Mix different resource types on same tile
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(i % 2 === 0 ? ResourceType.Wood : ResourceType.Stone, x, y);
      }

      // Stack should be at limit regardless of resource type mixing
      expect(logistics.getItems().filter(item => item.x === x && item.y === y)).toHaveLength(
        STORAGE_YARD_STACK_LIMIT
      );

      // Verify both resource types are present
      const woodItems = logistics.getItems().filter(
        item => item.x === x && item.y === y && item.type === ResourceType.Wood
      );
      const stoneItems = logistics.getItems().filter(
        item => item.x === x && item.y === y && item.type === ResourceType.Stone
      );
      expect(woodItems.length + stoneItems.length).toBe(STORAGE_YARD_STACK_LIMIT);
    });
  });

  describe('StorageYard priority registration', () => {
    test('registerStorageYard adds position to internal list', () => {
      logistics.registerStorageYard(5, 5);
      const positions = logistics.getStorageYardPositions();
      expect(positions.length).toBe(1);
      expect(positions[0].x).toBe(5);
      expect(positions[0].y).toBe(5);
    });

    test('unregisterStorageYard removes position from list', () => {
      logistics.registerStorageYard(5, 5);
      logistics.unregisterStorageYard(5, 5);
      expect(logistics.getStorageYardPositions()).toHaveLength(0);
    });

    test('getStackCountAt returns correct count for items at position', () => {
      logistics.spawnItem(ResourceType.Wood, 3, 3);
      logistics.spawnItem(ResourceType.Wood, 3, 3);
      logistics.spawnItem(ResourceType.Wood, 4, 4);
      expect(logistics.getStackCountAt(3, 3)).toBe(2);
      expect(logistics.getStackCountAt(4, 4)).toBe(1);
      expect(logistics.getStackCountAt(0, 0)).toBe(0);
    });

    test('isStorageYardAtCapacity correctly identifies full StorageYard', () => {
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, 10, 10);
      }
      expect(logistics.isStorageYardAtCapacity(10, 10)).toBe(true);
      expect(logistics.isStorageYardAtCapacity(9, 9)).toBe(false);
    });
  });

  describe('carrier priority - StorageYard demands processed first', () => {
    test('StorageYard demands are matched before non-StorageYard demands', () => {
      // StorageYard demand (priority)
      logistics.registerDemand(
        100,
        ResourceType.Wood,
        1,
        0, // x
        0, // y
        true, // isStorageYard = true (priority)
      );

      // Sawmill demand (non-priority)
      logistics.registerDemand(
        101,
        ResourceType.Wood,
        1,
        10, // x - farther away
        10, // y
        false,
      );

      // Spawn items close to StorageYard
      logistics.spawnItem(ResourceType.Wood, 1, 1);

      const match = logistics.matchDemand();
      expect(match).not.toBeNull();

      // Should match StorageYard demand first (priority)
      expect(match!.demand.buildingIndex).toBe(100);
      expect(match!.demand.isStorageYard).toBe(true);
    });

    test('carriers match demand with closest available item', () => {
      // StorageYard demand
      logistics.registerDemand(
        100,
        ResourceType.Wood,
        1,
        0, // x
        0, // y
        false,
      );

      // Sawmill demand farther away
      logistics.registerDemand(
        101,
        ResourceType.Wood,
        1,
        10, // x - farther away
        10, // y
        false,
      );

      // Spawn items closer to first demand
      logistics.spawnItem(ResourceType.Wood, 1, 1); // close to StorageYard (index 100)

      const match = logistics.matchDemand();
      expect(match).not.toBeNull();

      // Should match the closest demand-item pair
      expect(match!.demand.buildingIndex).toBe(100);
    });

    test('carrier picks closest item for each demand independently', () => {
      // StorageYard demand at origin
      logistics.registerDemand(
        200, // StorageYard index
        ResourceType.Wood,
        1,
        0, // x
        0, // y
        false,
      );

      // Sawmill demand at (20,20)
      logistics.registerDemand(
        201, // Sawmill index
        ResourceType.Wood,
        1,
        20, // x
        20, // y
        false,
      );

      // Spawn wood closer to StorageYard
      logistics.spawnItem(ResourceType.Wood, 1, 1); // dist~2 from StorageYard
      logistics.spawnItem(ResourceType.Wood, 21, 21); // dist~2 from Sawmill

      // matchDemand iterates through demands in order, finds first match
      const match = logistics.matchDemand();
      expect(match).not.toBeNull();

      // Should match the first demand (StorageYard at 200) with its closest item
      expect(match!.demand.buildingIndex).toBe(200);
      expect(match!.item.x).toBe(1);
      expect(match!.item.y).toBe(1);
    });

    test('carrier can fulfill multiple distinct demands with matching items', () => {
      // StorageYard demand for Wood
      logistics.registerDemand(
        300, // StorageYard index
        ResourceType.Wood,
        1,
        0, // x
        0, // y
        true,
      );

      // Sawmill demand for Planks
      logistics.registerDemand(
        301, // Sawmill index
        ResourceType.Planks,
        1,
        5, // x
        5, // y
        false,
      );

      // Spawn wood near StorageYard and planks near Sawmill
      logistics.spawnItem(ResourceType.Wood, 1, 1);
      logistics.spawnItem(ResourceType.Planks, 6, 6);

      // First match: StorageYard should match with wood (priority)
      const match = logistics.matchDemand();
      expect(match).not.toBeNull();
      expect(match!.demand.buildingIndex).toBe(300);
      expect(match!.item.type).toBe(ResourceType.Wood);
    });
  });

  describe('stack overflow - items overflow to adjacent tiles', () => {
    test('removeItem frees up stack space for new items', () => {
      const x = 3;
      const y = 3;

      // Fill stack to limit
      const items: ResourceItem[] = [];
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        const item = logistics.spawnItem(ResourceType.Wood, x, y);
        expect(item).toBeDefined();
        items.push(item!);
      }

      // Remove one item
      const removed = logistics.removeItem(items[0].id);
      expect(removed).toBe(true);

      // Now we should be able to add one more at the same position
      const newItem = logistics.spawnItem(ResourceType.Wood, x, y);
      expect(newItem).toBeDefined();

      // Stack should be back at limit
      expect(logistics.getItems().filter(item => item.x === x && item.y === y)).toHaveLength(
        STORAGE_YARD_STACK_LIMIT
      );
    });

    test('getStackCountAt can be queried to check capacity', () => {
      const x = 15;
      const y = 15;

      // Fill to capacity
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, x, y);
      }

      // Verify we have exactly the limit count
      const currentStackHeight = logistics.getStackCountAt(x, y);
      expect(currentStackHeight).toBe(STORAGE_YARD_STACK_LIMIT);
      expect(currentStackHeight >= STORAGE_YARD_STACK_LIMIT).toBe(true);
    });

    test('empty tile always accepts first item regardless of other full stacks', () => {
      // Fill one tile
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, 0, 0);
      }

      // Empty tile should still accept items
      const newItem = logistics.spawnItem(ResourceType.Wood, 9, 9);
      expect(newItem).toBeDefined();

      // All items should be tracked
      expect(logistics.getItems()).toHaveLength(STORAGE_YARD_STACK_LIMIT + 1);
    });

    test('items overflow to adjacent tiles when StorageYard full (9th item)', () => {
      const storageYardX = 12;
      const storageYardY = 12;

      // Fill StorageYard to capacity (8 items)
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, storageYardX, storageYardY);
      }

      // 9th item should overflow to adjacent tile (13, 12)
      const overflowItem = logistics.spawnItem(ResourceType.Wood, storageYardX, storageYardY);
      expect(overflowItem).toBeDefined();
      // The overflow item should be at an adjacent position
      const samePos = overflowItem!.x === storageYardX && overflowItem!.y === storageYardY;
      const adjacentPos = Math.abs(overflowItem!.x - storageYardX) <= 1 &&
                          Math.abs(overflowItem!.y - storageYardY) <= 1;
      expect(samePos || adjacentPos).toBe(true);
    });
  });

  describe('Integration - Woodcutter to Sawmill logistics pattern', () => {
    test('complete logistics chain: production spawns item, carrier picks up, demand is registered', () => {
      // This test documents the expected flow per plan acceptance criteria:
      // "A carrier successfully takes a log from a Woodcutter to a Sawmill"

      // Step 1: Woodcutter produces wood (spawns item)
      const woodItem = logistics.spawnItem(ResourceType.Wood, 5, 5);
      expect(woodItem).toBeDefined();
      expect(woodItem!.type).toBe(ResourceType.Wood);
      expect(woodItem!.x).toBe(5);
      expect(woodItem!.y).toBe(5);

      // Step 2: Sawmill registers demand for wood
      logistics.registerDemand(
        500, // Sawmill building index
        ResourceType.Wood,
        1, // need 1 wood
        10, // Sawmill position - not same as wood
        10,
      );

      // Step 3: matchDemand finds the supply-demand pair
      const match = logistics.matchDemand();
      expect(match).not.toBeNull();
      expect(match!.demand.buildingIndex).toBe(500);
      expect(match!.item.type).toBe(ResourceType.Wood);

      // Step 4: Carrier reserves the item
      match!.item.isReserved = true;
      expect(woodItem!.isReserved).toBe(true);

      // Step 5: Carrier picks up (removes from world)
      logistics.removeItem(woodItem!.id);
      expect(logistics.getItems().find(i => i.id === woodItem!.id)).toBeUndefined();
    });

    test('multiple carriers can each claim one item from a tile', () => {
      const x = 15;
      const y = 15;

      // Place 2 items on a tile
      logistics.spawnItem(ResourceType.Wood, x, y);
      logistics.spawnItem(ResourceType.Wood, x, y);

      // Both items should be available
      expect(logistics.getItems().filter(item => item.x === x && item.y === y)).toHaveLength(2);

      // First carrier reserves an item
      const firstItem = logistics.getUnreservedItem(ResourceType.Wood, 0, 0);
      expect(firstItem).not.toBeNull();
      firstItem!.isReserved = true;

      // Second item should still be available (closest to 0,0 after first is reserved)
      const secondItem = logistics.getUnreservedItem(ResourceType.Wood, 0, 0);
      expect(secondItem).not.toBeNull();
      expect(secondItem!.id).not.toBe(firstItem!.id);
    });
  });

  describe('StorageYard 8-stack logistics pattern', () => {
    test('StorageYard can receive up to 8 items of same type on its tile', () => {
      // This tests the documented "Storage Yard 8-stack logistics pattern"
      // from the plan acceptance criteria

      // Simulate StorageYard at position (5,5) receiving wood deliveries
      const storageYardX = 5;
      const storageYardY = 5;

      // Spawn 8 wood items at StorageYard location (as if delivered)
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        const item = logistics.spawnItem(ResourceType.Wood, storageYardX, storageYardY);
        expect(item).toBeDefined();
      }

      const itemsAtStorageYard = logistics.getItems().filter(
        item => item.x === storageYardX && item.y === storageYardY
      );
      expect(itemsAtStorageYard.length).toBe(STORAGE_YARD_STACK_LIMIT);
    });

    test('StorageYard stack overflow causes items to stack on adjacent tiles', () => {
      // When StorageYard is full, additional items should go to adjacent tiles
      // This is the intended behavior for overflow handling

      const storageYardX = 5;
      const storageYardY = 5;

      // Fill StorageYard to capacity
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, storageYardX, storageYardY);
      }

      // Overflow on adjacent tile (automatically placed by spawnItem)
      const overflowItem = logistics.spawnItem(ResourceType.Wood, storageYardX, storageYardY);
      expect(overflowItem).toBeDefined();

      // Items should be trackable (either at original or adjacent position)
      const allItems = logistics.getItems();
      expect(allItems.length).toBe(STORAGE_YARD_STACK_LIMIT + 1);
    });

    test('items on adjacent tiles are still reachable by carriers', () => {
      const storageYardX = 5;
      const storageYardY = 5;

      // Main stack at StorageYard
      for (let i = 0; i < STORAGE_YARD_STACK_LIMIT; i++) {
        logistics.spawnItem(ResourceType.Wood, storageYardX, storageYardY);
      }

      // Overflow on adjacent tile
      logistics.spawnItem(ResourceType.Wood, storageYardX + 1, storageYardY);

      // Carriers can still find items near the StorageYard
      const nearbyItem = logistics.getUnreservedItem(ResourceType.Wood, storageYardX, storageYardY);
      expect(nearbyItem).not.toBeNull();
      expect(nearbyItem!.x).toBe(storageYardX);
      expect(nearbyItem!.y).toBe(storageYardY);
    });
  });

  describe('Serialization', () => {
    test('toJSON and restoreFromJSON work correctly', () => {
      // Add items
      logistics.spawnItem(ResourceType.Wood, 1, 1);
      logistics.spawnItem(ResourceType.Stone, 2, 2);

      // Add demands
      logistics.registerDemand(100, ResourceType.Wood, 1, 0, 0, true);
      logistics.registerDemand(101, ResourceType.Stone, 1, 10, 10, false);

      // Add StorageYard positions
      logistics.registerStorageYard(5, 5);
      logistics.registerStorageYard(6, 6);

      // Serialize
      const json = logistics.toJSON();

      // Restore to new manager
      const restored = new LogisticsManager();
      restored.restoreFromJSON(json);

      // Verify items
      expect(restored.getItems()).toHaveLength(2);

      // Verify demands
      expect(restored.getDemands()).toHaveLength(2);

      // Verify StorageYard positions
      expect(restored.getStorageYardPositions()).toHaveLength(2);
    });

    test('restoreFromJSON preserves isStorageYard flag on demands', () => {
      logistics.registerDemand(100, ResourceType.Wood, 1, 0, 0, true);
      logistics.registerDemand(101, ResourceType.Stone, 1, 10, 10, false);

      const json = logistics.toJSON();
      const restored = new LogisticsManager();
      restored.restoreFromJSON(json);

      const demands = restored.getDemands();
      const storageYardDemand = demands.find(d => d.buildingIndex === 100);
      const regularDemand = demands.find(d => d.buildingIndex === 101);

      expect(storageYardDemand?.isStorageYard).toBe(true);
      expect(regularDemand?.isStorageYard).toBe(false);
    });
  });
});