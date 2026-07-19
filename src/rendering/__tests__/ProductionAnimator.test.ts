/**
 * S4WN Babylon.js/TypeScript - ProductionAnimator Tests
 * @jest-environment jsdom
 *
 * Tests for production animation system based on building_animation_system.md acceptance criteria:
 * - Production animation triggers only when building is active and processing
 * - Idle building animation plays continuously (looped)
 * - Produce animation plays during production cycle
 * - Animations are efficient (no unnecessary draw calls)
 * - ProductionAnimator integrates with GameLoop tick
 */

// Mock Babylon.js
jest.mock('@babylonjs/core', () => {
  const mockMesh = {
    name: '',
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    scaling: { setAll: jest.fn() },
    material: null,
    isVisible: false,
    isPickable: false,
    dispose: jest.fn(),
    clone: jest.fn(),
  };

  const mockTransformNode = {
    name: '',
    position: { x: 0, y: 0, z: 0, set: jest.fn() },
    rotation: { x: 0, y: 0, z: 0 },
    dispose: jest.fn(),
  };

  return {
    Scene: jest.fn(),
    Mesh: jest.fn(() => mockMesh),
    TransformNode: jest.fn(() => mockTransformNode),
    MeshBuilder: {
      CreateBox: jest.fn((name: string) => ({ ...mockMesh, name, isVisible: false })),
      CreateSphere: jest.fn((name: string) => ({ ...mockMesh, name, isVisible: false })),
    },
    StandardMaterial: jest.fn((name: string) => ({
      name,
      diffuseColor: { r: 1, g: 1, b: 1 },
      emissiveColor: { r: 0, g: 0, b: 0 },
      specularColor: { r: 0, g: 0, b: 0 },
      dispose: jest.fn(),
    })),
    Color3: Object.assign(
      function (r?: number, g?: number, b?: number) {
        return { r: r ?? 1, g: g ?? 1, b: b ?? 1 };
      },
      {
        Black: () => ({ r: 0, g: 0, b: 0 }),
      }
    ),
    Vector3: class {
      x: number; y: number; z: number;
      constructor(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
      }
    },
  };
});

import { ProductionAnimator } from '../ProductionAnimator';
import { BuildingData } from '../../game/Economy';
import { BuildingType, RESOURCE_COUNT, ResourceType } from '../../economy/types';

function makeBuilding(overrides: Partial<BuildingData> = {}): BuildingData {
  return {
    index: 1,
    kind: BuildingType.Farm,
    x: 50,
    y: 50,
    hp: 100,
    maxHp: 100,
    constructionProgress: 1.0, // Completed
    isActive: true,
    productionProgress: 0,
    productionCounter: 0,
    inputBuffer: new Array(RESOURCE_COUNT).fill(0),
    outputBuffer: new Array(RESOURCE_COUNT).fill(0),
    assignedSettlers: [],
    maxSettlers: 1,
    destructionTimer: null,
    destructionProgress: null,
    ownerId: 0,
    garrisonUnitIds: [],
    ...overrides,
  };
}

describe('ProductionAnimator', () => {
  let animator: ProductionAnimator;
  let buildingMeshes: Map<number, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    animator = new ProductionAnimator({} as any);
    buildingMeshes = new Map();
  });

  afterEach(() => {
    animator.dispose();
  });

  describe('registration', () => {
    it('should register a building for animation', () => {
      const building = makeBuilding();
      const mockMeshNode = { position: { set: jest.fn() }, dispose: jest.fn() };

      animator.registerBuilding(building, mockMeshNode as any);

      expect(animator.isTracked(building.index)).toBe(true);
    });

    it('should not throw when updating without registration', () => {
      const building = makeBuilding({ index: 1 });
      expect(() => animator.update([building], buildingMeshes)).not.toThrow();
    });
  });

  describe('1. Production animation triggers only when building is active and processing', () => {
    it('should trigger produce animation when building is actively processing with settler assigned and inputs available', () => {
      const building = makeBuilding({
        index: 1,
        kind: BuildingType.Sawmill, // Requires Wood input AND settler
        constructionProgress: 1.0,
        isActive: true,
        assignedSettlers: [1], // Has assigned worker
        inputBuffer: new Array(RESOURCE_COUNT).fill(0),
      });
      // Sawmill consumes Wood - add input
      building.inputBuffer[ResourceType.Wood] = 2;

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(true);
      expect(entry?.produceEffect).not.toBeNull();
    });

    it('should trigger produce animation when consumer building has inputs and required settler', () => {
      const building = makeBuilding({
        index: 2,
        kind: BuildingType.Bakery, // Requires Grain input AND settler
        constructionProgress: 1.0,
        isActive: true,
        assignedSettlers: [1], // Has assigned worker
        inputBuffer: new Array(RESOURCE_COUNT).fill(0),
      });
      // Bakery consumes Grain - add input
      building.inputBuffer[7] = 2; // Grain resource

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(true);
    });

    it('should NOT trigger produce animation for under-construction buildings', () => {
      const building = makeBuilding({
        index: 3,
        constructionProgress: 0.5, // Still under construction
      });

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      // Should not be tracking since constructionProgress < 1.0
      expect(entry).toBeUndefined();
    });

    it('should NOT trigger produce animation when settler-required building has no workers', () => {
      const building = makeBuilding({
        index: 4,
        kind: BuildingType.Farm, // Requires settler
        assignedSettlers: [], // No workers assigned
      });

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(false);
    });

    it('should trigger produce animation when settler-required building has workers', () => {
      const building = makeBuilding({
        index: 5,
        kind: BuildingType.Farm,
        assignedSettlers: [1], // Has worker
      });

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(true);
    });
  });

  describe('2. Idle building animation plays continuously (looped)', () => {
    it('should play idle animation when building is not processing', () => {
      const building = makeBuilding({
        index: 6,
        kind: BuildingType.Bakery,
        inputBuffer: new Array(RESOURCE_COUNT).fill(0), // No inputs - idle
        assignedSettlers: [1], // Has worker but no inputs
      });

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(false);
      expect(entry?.idleEffect).not.toBeNull();
    });

    it('should create idle effect mesh with loop animation', () => {
      const building = makeBuilding({ index: 7 });
      const mockMeshNode = { position: { set: jest.fn() }, dispose: jest.fn() };

      animator.registerBuilding(building, mockMeshNode as any);
      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.idleEffect?.mesh).toBeDefined();
      expect(entry?.idleEffect?.rotationSpeed).toBeGreaterThan(0);
    });

    it('should continuously rotate idle effect mesh', () => {
      const building = makeBuilding({ index: 8 });
      const mockMeshNode = { position: { set: jest.fn() }, dispose: jest.fn() };
      animator.registerBuilding(building, mockMeshNode as any);

      // Multiple updates should continue the animation
      animator.update([building], buildingMeshes);
      const entry1 = animator.getEntries().get(building.index);
      const initialRotation = entry1?.idleEffect?.mesh?.rotation?.y || 0;

      animator.update([building], buildingMeshes);
      animator.update([building], buildingMeshes);
      animator.update([building], buildingMeshes);

      const entry2 = animator.getEntries().get(building.index);
      const finalRotation = entry2?.idleEffect?.mesh?.rotation?.y || 0;

      expect(finalRotation).toBeGreaterThan(initialRotation);
    });
  });

  describe('3. Produce animation plays during production cycle', () => {
    it('should create produce effect mesh when building is processing', () => {
      const building = makeBuilding({
        index: 9,
        kind: BuildingType.Sawmill,
        assignedSettlers: [1], // Has worker
        inputBuffer: new Array(RESOURCE_COUNT).fill(0),
      });
      // Sawmill needs Wood input
      building.inputBuffer[ResourceType.Wood] = 2;

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.produceEffect?.mesh).toBeDefined();
    });

    it('should show produce effect when processing and hide idle effect', () => {
      const building = makeBuilding({
        index: 10,
        kind: BuildingType.Sawmill,
        assignedSettlers: [1], // Has worker
        inputBuffer: new Array(RESOURCE_COUNT).fill(0),
      });
      // Sawmill needs Wood input
      building.inputBuffer[ResourceType.Wood] = 2;

      // First update to create both effects
      animator.update([building], buildingMeshes);
      animator.update([building], buildingMeshes); // Ensure effects exist

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(true);
      expect(entry?.produceEffect?.mesh?.isVisible).toBe(true);
      expect(entry?.idleEffect?.mesh?.isVisible).toBe(false);
    });

    it('should hide produce effect when switching to idle', () => {
      const building = makeBuilding({
        index: 11,
        kind: BuildingType.Bakery,
        inputBuffer: new Array(RESOURCE_COUNT).fill(0), // No inputs - idle
        assignedSettlers: [1], // Has worker but no inputs
      });

      animator.update([building], buildingMeshes);

      const entry = animator.getEntries().get(building.index);
      expect(entry?.isPlayingProduce).toBe(false);
      expect(entry?.produceEffect?.mesh?.isVisible).toBe(false);
    });
  });

  describe('4. Animations are efficient (no unnecessary draw calls)', () => {
    it('should not create duplicate meshes on repeated updates', () => {
      const building = makeBuilding({ index: 12 });

      animator.update([building], buildingMeshes);
      const createBoxMock = (jest.requireMock('@babylonjs/core') as any).MeshBuilder.CreateBox;
      const callsAfterFirst = createBoxMock.mock.calls.length;

      animator.update([building], buildingMeshes);
      animator.update([building], buildingMeshes);
      animator.update([building], buildingMeshes);

      const callsAfterRepeated = createBoxMock.mock.calls.length;
      expect(callsAfterRepeated).toBe(callsAfterFirst);
    });

    it('should skip buildings with no production interval', () => {
      const building = makeBuilding({
        index: 13,
        kind: BuildingType.Castle, // Has no production
      });

      animator.update([building], buildingMeshes);

      const { MeshBuilder } = require('@babylonjs/core');
      // Castle has productionInterval = 0, so should not create effect meshes
      expect(MeshBuilder.CreateBox).not.toHaveBeenCalled();
      expect(MeshBuilder.CreateSphere).not.toHaveBeenCalled();
    });

    it('should clean up effects for removed buildings', () => {
      const building = makeBuilding({ index: 14 });
      animator.registerBuilding(building, { dispose: jest.fn() } as any);
      animator.update([building], buildingMeshes);

      // Simulate building removal
      animator.removeTracking(building.index);

      expect(animator.isTracked(building.index)).toBe(false);
      expect(animator.getEntries().size).toBe(0);
    });

    it('should dispose all resources on dispose()', () => {
      const buildings = [
        makeBuilding({ index: 15 }),
        makeBuilding({ index: 16 }),
      ];

      buildings.forEach(b => animator.update([b], buildingMeshes));
      animator.dispose();

      expect(animator.getEntries().size).toBe(0);
    });
  });

  describe('5. ProductionAnimator integrates with GameLoop tick', () => {
    it('should be callable from render loop without errors', () => {
      const buildings = [
        makeBuilding({ index: 17 }),
        makeBuilding({ index: 18 }),
        makeBuilding({ index: 19, constructionProgress: 0.5 }), // Under construction
      ];
      buildingMeshes.set(17, { position: { set: jest.fn() } });
      buildingMeshes.set(18, { position: { set: jest.fn() } });

      // Should handle typical GameLoop tick update pattern
      expect(() => animator.update(buildings, buildingMeshes)).not.toThrow();
    });

    it('should handle empty building array gracefully', () => {
      expect(() => animator.update([], buildingMeshes)).not.toThrow();
      expect(animator.getEntries().size).toBe(0);
    });

    it('should handle buildings without registered meshes', () => {
      const building = makeBuilding({ index: 20 });

      // Should not throw when no mesh is registered
      expect(() => animator.update([building], buildingMeshes)).not.toThrow();
    });

    it('should respond to visibility changes from GameLoop', () => {
      const building = makeBuilding({ index: 21 });
      const mockMeshNode = { position: { set: jest.fn() }, dispose: jest.fn() };

      animator.registerBuilding(building, mockMeshNode as any);
      animator.update([building], buildingMeshes);

      // Test visibility toggle
      animator.visible = false;
      expect(animator.visible).toBe(false);

      animator.visible = true;
      expect(animator.visible).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple buildings with different states', () => {
      const farm = makeBuilding({ index: 22, kind: BuildingType.Farm, assignedSettlers: [1] });
      const bakery = makeBuilding({ index: 23, kind: BuildingType.Bakery, inputBuffer: Array(RESOURCE_COUNT).fill(0), assignedSettlers: [1] });
      const woodcutter = makeBuilding({ index: 24, kind: BuildingType.Woodcutter });

      const buildings = [farm, bakery, woodcutter];
      animator.update(buildings, buildingMeshes);

      // Farm: has worker, should produce
      const farmEntry = animator.getEntries().get(farm.index);
      expect(farmEntry?.isPlayingProduce).toBe(true);

      // Bakery: no inputs but has worker, should be idle
      const bakeryEntry = animator.getEntries().get(bakery.index);
      expect(bakeryEntry?.isPlayingProduce).toBe(false);

      // Woodcutter: has no settler, should be idle
      const woodcutterEntry = animator.getEntries().get(woodcutter.index);
      expect(woodcutterEntry?.isPlayingProduce).toBe(false);
    });

    it('should preserve entry when building becomes inactive temporarily', () => {
      const building = makeBuilding({ index: 25, kind: BuildingType.Farm });

      // First update: has worker
      building.assignedSettlers = [1];
      animator.update([building], buildingMeshes);

      // Second update: no worker (worker died/removed)
      building.assignedSettlers = [];
      animator.update([building], buildingMeshes);

      // Entry should still exist
      expect(animator.isTracked(building.index)).toBe(true);
    });
  });
});
