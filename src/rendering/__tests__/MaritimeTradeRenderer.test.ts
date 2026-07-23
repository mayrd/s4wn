/**
 * MaritimeTradeRenderer unit tests.
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
    LinesMesh: jest.fn(),
    SceneLoader: {
      ImportMeshAsync: jest.fn(() =>
        Promise.resolve({ meshes: [{ ...createMesh('boat'), scaling: { setAll: jest.fn() } }] })
      ),
    },
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

import { MaritimeTradeRenderer } from '../MaritimeTradeRenderer';

describe('MaritimeTradeRenderer', () => {
  let renderer: MaritimeTradeRenderer;

  beforeEach(() => {
    renderer = new MaritimeTradeRenderer({} as any);
  });

  afterEach(() => {
    renderer.dispose();
  });

  test('constructor initializes without throwing', () => {
    expect(renderer).toBeDefined();
    expect(renderer.visible).toBe(false);
    expect(renderer.getMissionCount()).toBe(0);
  });

  test('set visible shows/hides all ship meshes', () => {
    expect(renderer.visible).toBe(false);
    renderer.visible = true;
    expect(renderer.visible).toBe(true);
    renderer.visible = false;
    expect(renderer.visible).toBe(false);
  });

  test('syncMissions creates meshes for each mission', () => {
    const missions = [
      { id: 1001, srcX: 10, srcY: 10, dstX: 25, dstY: 25, progress: 0.5, returning: false, exportResource: 0, cargoAmount: 5, speed: 0.015, sourceIndex: 1, destIndex: 2 },
      { id: 1002, srcX: 30, srcY: 30, dstX: 45, dstY: 45, progress: 0.3, returning: false, exportResource: 0, cargoAmount: 3, speed: 0.015, sourceIndex: 3, destIndex: 4 },
    ];
    renderer.syncMissions(missions as any);
    expect(renderer.getMissionCount()).toBe(2);
  });

  test('syncMissions removes meshes for completed missions', () => {
    const missions = [
      { id: 1001, srcX: 10, srcY: 10, dstX: 25, dstY: 25, progress: 0.5, returning: false, exportResource: 0, cargoAmount: 5, speed: 0.015, sourceIndex: 1, destIndex: 2 },
      { id: 1002, srcX: 30, srcY: 30, dstX: 45, dstY: 45, progress: 0.3, returning: false, exportResource: 0, cargoAmount: 3, speed: 0.015, sourceIndex: 3, destIndex: 4 },
    ];
    renderer.syncMissions(missions as any);
    expect(renderer.getMissionCount()).toBe(2);

    // Remove one mission
    renderer.syncMissions([missions[0]] as any);
    expect(renderer.getMissionCount()).toBe(1);
  });

    test('updatePositions updates ship rotations for travel direction', () => {
      const missions = [
        { id: 1001, srcX: 10, srcY: 10, dstX: 25, dstY: 25, progress: 0.5, returning: false, exportResource: 0, cargoAmount: 5, speed: 0.015, sourceIndex: 1, destIndex: 2 },
      ];
      renderer.syncMissions(missions as any);
      renderer.updatePositions(missions as any);

      const visual = (renderer as any).missionVisuals.get(1001);
      expect(visual).toBeDefined();
      // Visual positions are computed from progress even without a real mesh
      const pos = visual!.getPositionAtProgress(0.5);
      expect(pos.x).toBeCloseTo(18, 1);
      expect(pos.z).toBeCloseTo(18, 1);
    });

  test('dispose clears all meshes', () => {
    const missions = [
      { id: 1001, srcX: 10, srcY: 10, dstX: 25, dstY: 25, progress: 0.5, returning: false, exportResource: 0, cargoAmount: 5, speed: 0.015, sourceIndex: 1, destIndex: 2 },
    ];
    renderer.syncMissions(missions as any);
    expect(renderer.getMissionCount()).toBe(1);

    renderer.dispose();
    expect(renderer.getMissionCount()).toBe(0);
  });

    test('getMissionVisual returns visual data for a mission', () => {
    const missions = [
      { id: 1001, srcX: 10, srcY: 10, dstX: 25, dstY: 25, progress: 0.5, returning: false, exportResource: 0, cargoAmount: 5, speed: 0.015, sourceIndex: 1, destIndex: 2 },
    ];
    renderer.syncMissions(missions as any);

    const visual = (renderer as any).missionVisuals.get(1001);
    expect(visual).toBeDefined();
    expect(visual!.sourceX).toBe(10);
    expect(visual!.destX).toBe(25);
  });

  test('handles empty missions gracefully', () => {
    expect(() => renderer.syncMissions([])).not.toThrow();
    expect(renderer.getMissionCount()).toBe(0);
  });
});
