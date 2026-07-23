/**
 * ResourceItemRenderer unit tests.
 * @jest-environment jsdom
 */

jest.mock('@babylonjs/core', () => {
  const createMesh = (name: string): any => ({
    name,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scaling: { setAll: jest.fn() },
    material: null,
    isVisible: true,
    isPickable: true,
    dispose: jest.fn(),
    clone: jest.fn((newName: string) => ({
      ...createMesh('cloned_' + newName),
      isVisible: false,
      isPickable: false,
    })),
  });
  return {
    Mesh: jest.fn((name: string) => createMesh(name)),
    AbstractMesh: jest.fn(),
    MeshBuilder: {
      CreateLines: jest.fn((name: string, _opts: { points: any[] }) => ({
        ...createMesh(name),
        color: { r: 0, g: 0, b: 0 } as any,
      })),
      CreateBox: jest.fn((name: string, _opts: any) => createMesh(name)),
      CreateSphere: jest.fn((name: string, _opts: any) => createMesh(name)),
    },
    LinesMesh: jest.fn(),
    StandardMaterial: jest.fn((name: string) => ({
      name,
      diffuseColor: { r: 0, g: 0, b: 0 },
      specularColor: { r: 0, g: 0, b: 0 },
      emissiveColor: { r: 0, g: 0, b: 0 },
      dispose: jest.fn(),
    })),
    Color3: Object.assign(
      function (r?: number, g?: number, b?: number) {
        return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
      },
      {
        Black: () => ({ r: 0, g: 0, b: 0 }),
        White: () => ({ r: 1, g: 1, b: 1 }),
      }
    ),
    Vector3: Object.assign(
      function (x?: number, y?: number, z?: number): any {
        return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
      },
      { Zero: () => ({ x: 0, y: 0, z: 0 }) }
    ),
    Scene: jest.fn(),
  };
});

jest.mock('@babylonjs/loaders', () => ({}), { virtual: true });

import { ResourceItemRenderer } from '../ResourceItemRenderer';
import { LogisticsManager } from '../../game/Logistics';
import { ResourceType } from '../../economy/types';

describe('ResourceItemRenderer', () => {
  let renderer: ResourceItemRenderer;
  let logistics: LogisticsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    logistics = new LogisticsManager();
    renderer = new ResourceItemRenderer({} as any, logistics);
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('initial state', () => {
    test('starts with zero items', () => {
      expect(renderer.itemCount).toBe(0);
    });

    test('default visible is true', () => {
      expect(renderer.visible).toBe(true);
    });
  });

  describe('sync', () => {
    test('creates meshes when items are spawned', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      logistics.spawnItem(ResourceType.Stone, 12, 7);

      renderer.sync();

      expect(renderer.itemCount).toBe(2);
      const { MeshBuilder } = require('@babylonjs/core');
      expect(MeshBuilder.CreateBox).toHaveBeenCalledTimes(2);
    });

    test('does not create duplicate meshes on re-sync', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      renderer.sync();

      const { MeshBuilder } = require('@babylonjs/core');
      const callsAfter1 = MeshBuilder.CreateBox.mock.calls.length;

      // Re-sync with same items — no new meshes
      renderer.sync();
      expect(MeshBuilder.CreateBox.mock.calls.length).toBe(callsAfter1);
      expect(renderer.itemCount).toBe(1);
    });

    test('creates new mesh when new item appears', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      renderer.sync();
      expect(renderer.itemCount).toBe(1);

      // Spawn a second item
      logistics.spawnItem(ResourceType.Stone, 12, 7);
      renderer.sync();
      expect(renderer.itemCount).toBe(2);
    });

    test('disposes mesh when item is removed', () => {
      const item = logistics.spawnItem(ResourceType.Wood, 10, 5)!;
      renderer.sync();
      expect(renderer.itemCount).toBe(1);

      logistics.removeItem(item.id);
      renderer.sync();
      expect(renderer.itemCount).toBe(0);
    });

    test('handles mixed add and remove in same sync', () => {
      const item1 = logistics.spawnItem(ResourceType.Wood, 10, 5)!;
      renderer.sync();
      expect(renderer.itemCount).toBe(1);

      // Remove old, add new in same sync
      logistics.removeItem(item1.id);
      logistics.spawnItem(ResourceType.Stone, 15, 8);
      renderer.sync();
      expect(renderer.itemCount).toBe(1);
    });

    test('updates item positions on sync', () => {
      const item = logistics.spawnItem(ResourceType.Wood, 10, 5)!;
      renderer.sync();

      // Position is set in createItemMesh
      const mesh = (renderer as any).itemMeshes.get(item.id);
      expect(mesh).toBeDefined();
      // Box center should be at tile center + 0.5
      expect(mesh.position.x).toBeCloseTo(10.5, 1);
      expect(mesh.position.z).toBeCloseTo(5.5, 1);
    });

    test('handles empty logistics gracefully', () => {
      expect(() => renderer.sync()).not.toThrow();
      expect(renderer.itemCount).toBe(0);
    });

    test('creates meshes for items with different resource types', () => {
      logistics.spawnItem(ResourceType.Wood, 1, 1);
      logistics.spawnItem(ResourceType.Stone, 2, 2);
      logistics.spawnItem(ResourceType.Grain, 3, 3);
      logistics.spawnItem(ResourceType.Water, 4, 4);
      logistics.spawnItem(ResourceType.Meat, 5, 5);

      renderer.sync();
      expect(renderer.itemCount).toBe(5);

      const { StandardMaterial } = require('@babylonjs/core');
      // Each item should have a different material (colors differ per resource type)
      expect(StandardMaterial).toHaveBeenCalledTimes(5);
    });

    test('sync is idempotent across multiple calls', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      logistics.spawnItem(ResourceType.Stone, 12, 7);

      for (let i = 0; i < 5; i++) {
        renderer.sync();
        expect(renderer.itemCount).toBe(2);
      }
    });
  });

  describe('visibility', () => {
    test('toggle visibility propagates to meshes', () => {
      const item = logistics.spawnItem(ResourceType.Wood, 10, 5)!;
      renderer.sync();

      renderer.visible = false;
      const mesh = (renderer as any).itemMeshes.get(item.id);
      expect(mesh.isVisible).toBe(false);

      renderer.visible = true;
      expect(mesh.isVisible).toBe(true);
    });

    test('new meshes respect current visibility', () => {
      renderer.visible = false;
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      renderer.sync();

      const { MeshBuilder } = require('@babylonjs/core');
      const results = MeshBuilder.CreateBox.mock.results;
      const newMesh = results[results.length - 1].value;
      expect(newMesh.isVisible).toBe(false);
    });
  });

  describe('dispose', () => {
    test('clears all meshes', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      logistics.spawnItem(ResourceType.Stone, 12, 7);
      renderer.sync();
      expect(renderer.itemCount).toBe(2);

      renderer.dispose();
      expect(renderer.itemCount).toBe(0);
    });

    test('dispose is safe to call multiple times', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      renderer.sync();

      renderer.dispose();
      expect(() => renderer.dispose()).not.toThrow();
      expect(renderer.itemCount).toBe(0);
    });

    test('dispose disposes mesh materials', () => {
      logistics.spawnItem(ResourceType.Wood, 10, 5);
      renderer.sync();

      const { StandardMaterial } = require('@babylonjs/core');
      const materialCalls = StandardMaterial.mock.results;
      const mat = materialCalls[materialCalls.length - 1].value;

      renderer.dispose();
      expect(mat.dispose).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('handles many items (100+)', () => {
      for (let i = 0; i < 120; i++) {
        logistics.spawnItem(ResourceType.Wood, i % 100, Math.floor(i / 100) % 100);
      }
      renderer.sync();
      expect(renderer.itemCount).toBe(120);

      // Remove half
      const items = logistics.getItems();
      for (let i = 0; i < 60; i++) {
        logistics.removeItem(items[i].id);
      }
      renderer.sync();
      expect(renderer.itemCount).toBe(60);
    });

    test('handles unknown resource type gracefully', () => {
      // Use a high value that won't be in RESOURCE_COLORS
      logistics.spawnItem(999 as ResourceType, 5, 5);
      // This should not throw — falls back to gray color
      expect(() => renderer.sync()).not.toThrow();
      expect(renderer.itemCount).toBe(1);
    });
  });
});