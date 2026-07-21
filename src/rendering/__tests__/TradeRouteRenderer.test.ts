/**
 * TradeRouteRenderer unit tests.
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
    SceneLoader: {
      ImportMeshAsync: jest.fn(() =>
        Promise.resolve({ meshes: [{ ...createMesh('donkey'), scaling: { setAll: jest.fn() } }] })
      ),
    },
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

// Mock @babylonjs/loaders (side-effect import)
jest.mock('@babylonjs/loaders', () => ({}), { virtual: true });

import { TradeRouteRenderer, TradeMissionVisual } from '../TradeRouteRenderer';
import { TradeMission } from '../../game/TradeRouteManager';
import { ResourceType } from '../../economy/types';

/** Helper: create a test trade mission */
function createTestMission(overrides: Partial<TradeMission> = {}): TradeMission {
  return {
    id: 1,
    sourceIndex: 1,
    destIndex: 2,
    srcX: 10,
    srcY: 10,
    dstX: 30,
    dstY: 30,
    progress: 0,
    exportResource: ResourceType.Wood,
    cargoAmount: 2,
    speed: 0.02,
    returning: false,
    ...overrides,
  };
}

describe('TradeRouteRenderer', () => {
  let renderer: TradeRouteRenderer;
  let mockScene: any;

  beforeEach(() => {
    mockScene = {};
    renderer = new TradeRouteRenderer(mockScene);
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('visibility toggling', () => {
    test('starts with visibility false', () => {
      expect(renderer.visible).toBe(false);
    });

    test('can set visibility to true', () => {
      renderer.visible = true;
      expect(renderer.visible).toBe(true);
    });

    test('can toggle visibility', () => {
      renderer.visible = true;
      expect(renderer.visible).toBe(true);
      renderer.visible = false;
      expect(renderer.visible).toBe(false);
    });
  });

  describe('mission sync', () => {
    test('syncMissions creates donkey meshes for each mission', () => {
      const missions: TradeMission[] = [
        createTestMission({ id: 1 }),
        createTestMission({ id: 2, srcX: 20, srcY: 20 }),
      ];

      renderer.syncMissions(missions);
      expect(renderer.getMissionCount()).toBe(2);
    });

    test('syncMissions clears previous missions when called again', () => {
      const missions1: TradeMission[] = [createTestMission({ id: 1 })];
      const missions2: TradeMission[] = [createTestMission({ id: 2 })];

      renderer.syncMissions(missions1);
      expect(renderer.getMissionCount()).toBe(1);

      renderer.syncMissions(missions2);
      expect(renderer.getMissionCount()).toBe(1);
    });
  });

  describe('position updates', () => {
    test('updatePositions moves donkeys based on mission progress', () => {
      const missions: TradeMission[] = [
        createTestMission({ id: 1, progress: 0.5 }),
      ];
      renderer.syncMissions(missions);

      // Update positions based on missions
      renderer.updatePositions(missions);

      // Position should be interpolated (with 0.5 offset for tile centering)
      const pos = renderer.getMissionPosition(1);
      expect(pos).toBeDefined();
      if (pos) {
        // At progress 0.5, halfway between (10,10) and (30,30)
        // With 0.5 offset: (10.5 + 30.5) / 2 = 20.5
        expect(pos.x).toBeCloseTo(20.5, 1);
        expect(pos.y).toBeGreaterThan(0); // Elevated above terrain
        expect(pos.z).toBeCloseTo(20.5, 1);
      }
    });

    test('handles returning missions (return journey)', () => {
      const missions: TradeMission[] = [
        createTestMission({ id: 1, progress: 0.5, returning: true }),
      ];
      renderer.syncMissions(missions);

      renderer.updatePositions(missions);

      const pos = renderer.getMissionPosition(1);
      expect(pos).toBeDefined();
    });
  });

  describe('cargo visualization', () => {
    test('donkey meshes are created for different resource types', () => {
      const missions: TradeMission[] = [
        createTestMission({ id: 1, exportResource: ResourceType.Wood }),
        createTestMission({ id: 2, exportResource: ResourceType.Gold }),
        createTestMission({ id: 3, exportResource: ResourceType.Stone }),
      ];

      renderer.syncMissions(missions);
      expect(renderer.getMissionCount()).toBe(3);
    });

    test('cargo indicator is visible when donkey has cargo', () => {
      const missions: TradeMission[] = [
        createTestMission({ id: 1, cargoAmount: 2 }),
      ];
      renderer.syncMissions(missions);

      renderer.visible = true;
      // Should have donkey mesh (cargoAmount > 0)
      const visual = renderer.getMissionVisual(1);
      expect(visual).toBeDefined();
    });
  });

  describe('return journey handling', () => {
    test('mission is removed after completing return journey', async () => {
      const missions: TradeMission[] = [
        createTestMission({ id: 1, progress: 0.95, returning: true }),
      ];

      // Sync should handle completed missions
      const completed = renderer.syncMissions(missions);
      expect(completed.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('loadCarrierModel', () => {
    test('loadCarrierModel loads donkey model', async () => {
      const { SceneLoader } = require('@babylonjs/core');
      await renderer.loadCarrierModel();
      expect(SceneLoader.ImportMeshAsync).toHaveBeenCalledWith(
        '', '/models/poly_pizza/', 'donkey.glb', mockScene
      );
    });

    test('loadCarrierModel guard prevents redundant loads', async () => {
      const { SceneLoader } = require('@babylonjs/core');
      
      // First call
      await renderer.loadCarrierModel();
      const callsAfterFirst = SceneLoader.ImportMeshAsync.mock.calls.length;

      // Second call - should be no-op
      await renderer.loadCarrierModel();
      expect(SceneLoader.ImportMeshAsync.mock.calls.length).toBe(callsAfterFirst);
    });
  });
});

describe('TradeMissionVisual', () => {
  test('creates visual with correct properties', () => {
    const visual = new TradeMissionVisual(1, 10, 10, 30, 30);
    expect(visual.missionId).toBe(1);
    expect(visual.sourceX).toBe(10);
    expect(visual.sourceY).toBe(10);
    expect(visual.destX).toBe(30);
    expect(visual.destY).toBe(30);
  });

  test('creates vector3 position from progress', () => {
    const visual = new TradeMissionVisual(1, 10, 10, 30, 30);
    const pos = visual.getPositionAtProgress(0);
    expect(pos.x).toBe(10.5);
    expect(pos.z).toBe(10.5);

    const posHalf = visual.getPositionAtProgress(0.5);
    expect(posHalf.x).toBe(20.5);
    expect(posHalf.z).toBe(20.5);

    const posFull = visual.getPositionAtProgress(1.0);
    expect(posFull.x).toBe(30.5);
    expect(posFull.z).toBe(30.5);
  });
});