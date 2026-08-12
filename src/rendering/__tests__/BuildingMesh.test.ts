/**
 * S4WN Babylon.js/TypeScript - BuildingMesh Tests
 * @jest-environment jsdom
 *
 * Tests for building mesh creation and nation-specific flag placement.
 * Verifies that the decorative flag is positioned at LOCAL coordinates
 * relative to the building root, not world coordinates (which would
 * cause the flag to appear far from the building after parenting).
 */

// Mock SoundManager (imported by ConstructionAnimator)
jest.mock('../../audio/SoundManager', () => ({
  soundManager: {
    play: jest.fn(),
  },
}));

// Mock NationRegistry — no nations registered → BuildingMesh uses fallback colors
jest.mock('../../game/NationRegistry', () => ({
  NationRegistry: {
    instance: {
      getByNumber: jest.fn(() => undefined),
    },
  },
}));

// Mock Babylon.js
const mockScene = {} as any;

jest.mock('@babylonjs/core', () => {
  // Helper: create a mesh mock whose position.set actually updates x/y/z
  const createMeshMock = (name: string) => {
    const position: any = {
      x: 0, y: 0, z: 0,
      set: jest.fn((x: number, y: number, z: number) => {
        position.x = x;
        position.y = y;
        position.z = z;
      }),
    };
    return {
      name,
      position,
      material: null,
      parent: null,
      isVisible: true,
      dispose: jest.fn(),
      getChildMeshes: jest.fn(() => []),
    };
  };

  return {
    Scene: jest.fn(),
    MeshBuilder: {
      CreateCylinder: jest.fn((name: string) => createMeshMock(name)),
      CreatePlane: jest.fn((name: string) => createMeshMock(name)),
      CreateBox: jest.fn((name: string) => createMeshMock(name)),
    },
    StandardMaterial: jest.fn((name: string) => ({
      name,
      diffuseColor: null,
      emissiveColor: null,
      specularColor: null,
    })),
    Color3: jest.fn((r: number, g: number, b: number) => ({
      r, g, b,
      scale: jest.fn((n: number) => ({ r: r * n, g: g * n, b: b * n })),
    })),
    SceneLoader: {
      ImportMeshAsync: jest.fn(() => Promise.resolve({
        meshes: [createMeshMock('root')],
      })),
    },
    TransformNode: jest.fn((name: string) => ({
      name,
      position: { x: 0, y: 0, z: 0, set: jest.fn() },
      dispose: jest.fn(),
    })),
  };
});

jest.mock('@babylonjs/loaders', () => ({}), { virtual: true });

import { BuildingMesh, buildingModelSearchPaths } from '../BuildingMesh';
import { NationType } from '../../game/Nation';

describe('BuildingMesh', () => {
  let buildingMesh: BuildingMesh;

  beforeEach(() => {
    jest.clearAllMocks();
    buildingMesh = new BuildingMesh(mockScene);
  });

  describe('flag placement (nation variant)', () => {
    /**
     * BUG: The flag pole and cloth were positioned using WORLD coordinates
     * (root.position.x, root.position.y + 2.5, root.position.z) BEFORE being
     * parented to root. In Babylon.js, when you parent a mesh, its position
     * becomes RELATIVE to the parent. So the flag ended up at double the
     * offset — e.g., if root is at (50, 0, 50), the flag's world position
     * became (100, 2.5, 100) instead of (50, 2.5, 50).
     *
     * FIX: Parent first, then set position to LOCAL coordinates (0, 2.5, 0).
     */

    it('should position flag pole at LOCAL coordinates relative to root', async () => {
      const { MeshBuilder } = require('@babylonjs/core');

      const root = await buildingMesh.createBuilding(
        'castle', 50, 50, 2, 2, 2, null, NationType.Romans
      );

      expect(root).toBeDefined();

      // Find the flag pole mesh (CreateCylinder with name containing 'flag-pole')
      const cylinderCalls = MeshBuilder.CreateCylinder.mock.calls;
      const flagPoleCallIndex = cylinderCalls.findIndex(
        (c: any[]) => c[0]?.includes('flag-pole')
      );
      expect(flagPoleCallIndex).toBeGreaterThanOrEqual(0);
      const flagPole = MeshBuilder.CreateCylinder.mock.results[flagPoleCallIndex].value;

      // Flag pole should be parented to root
      expect(flagPole.parent).toBe(root);

      // Flag pole position should be LOCAL (0, 2.5, 0), not world (50, 2.5, 50)
      expect(flagPole.position.set).toHaveBeenCalledWith(0, 2.5, 0);
    });

    it('should position flag cloth at LOCAL coordinates relative to root', async () => {
      const { MeshBuilder } = require('@babylonjs/core');

      const root = await buildingMesh.createBuilding(
        'castle', 50, 50, 2, 2, 2, null, NationType.Romans
      );

      // Find the flag cloth mesh (CreatePlane with name containing 'flag-cloth')
      const planeCalls = MeshBuilder.CreatePlane.mock.calls;
      const flagClothCallIndex = planeCalls.findIndex(
        (c: any[]) => c[0]?.includes('flag-cloth')
      );
      expect(flagClothCallIndex).toBeGreaterThanOrEqual(0);
      const flagCloth = MeshBuilder.CreatePlane.mock.results[flagClothCallIndex].value;

      // Flag cloth should be parented to root
      expect(flagCloth.parent).toBe(root);

      // Flag cloth position should be LOCAL (0.22, 2.8, 0), not world (50.22, 2.8, 50)
      expect(flagCloth.position.set).toHaveBeenCalledWith(0.22, 2.8, 0);
    });

    it('should NOT position flag pole at world coordinates (regression test)', async () => {
      const { MeshBuilder } = require('@babylonjs/core');

      await buildingMesh.createBuilding(
        'castle', 50, 50, 2, 2, 2, null, NationType.Romans
      );

      // Find the flag pole mesh
      const cylinderCalls = MeshBuilder.CreateCylinder.mock.calls;
      const flagPoleCallIndex = cylinderCalls.findIndex(
        (c: any[]) => c[0]?.includes('flag-pole')
      );
      const flagPole = MeshBuilder.CreateCylinder.mock.results[flagPoleCallIndex].value;

      // Flag pole should NOT be at world coordinates (50, 2.5, 50)
      // This is the bug: setting world coords before parenting doubles the offset
      expect(flagPole.position.set).not.toHaveBeenCalledWith(50, 2.5, 50);
    });

    it('should NOT position flag cloth at world coordinates (regression test)', async () => {
      const { MeshBuilder } = require('@babylonjs/core');

      await buildingMesh.createBuilding(
        'castle', 50, 50, 2, 2, 2, null, NationType.Romans
      );

      // Find the flag cloth mesh
      const planeCalls = MeshBuilder.CreatePlane.mock.calls;
      const flagClothCallIndex = planeCalls.findIndex(
        (c: any[]) => c[0]?.includes('flag-cloth')
      );
      const flagCloth = MeshBuilder.CreatePlane.mock.results[flagClothCallIndex].value;

      // Flag cloth should NOT be at world coordinates (50.22, 2.8, 50)
      expect(flagCloth.position.set).not.toHaveBeenCalledWith(50.22, 2.8, 50);
    });

    it('should parent flag pole and cloth to root before setting position', async () => {
      const { MeshBuilder } = require('@babylonjs/core');

      const root = await buildingMesh.createBuilding(
        'castle', 50, 50, 2, 2, 2, null, NationType.Romans
      );

      // Find the flag pole mesh
      const cylinderCalls = MeshBuilder.CreateCylinder.mock.calls;
      const flagPoleCallIndex = cylinderCalls.findIndex(
        (c: any[]) => c[0]?.includes('flag-pole')
      );
      const flagPole = MeshBuilder.CreateCylinder.mock.results[flagPoleCallIndex].value;

      // Find the flag cloth mesh
      const planeCalls = MeshBuilder.CreatePlane.mock.calls;
      const flagClothCallIndex = planeCalls.findIndex(
        (c: any[]) => c[0]?.includes('flag-cloth')
      );
      const flagCloth = MeshBuilder.CreatePlane.mock.results[flagClothCallIndex].value;

      // Both should be parented to root
      expect(flagPole.parent).toBe(root);
      expect(flagCloth.parent).toBe(root);
    });
  });

describe('buildingModelSearchPaths (nation-specific models first)', () => {
  it('puts the nation GLB, then nation OBJ, before shared fallbacks', () => {
    const paths = buildingModelSearchPaths('Bakery', 'romans');
    expect(paths[0]).toEqual({ dir: '/nations/romans/models/buildings/', name: 'bakery.glb' });
    expect(paths[1]).toEqual({ dir: '/nations/romans/models/buildings/', name: 'bakery.obj' });
    expect(paths[2]).toEqual({ dir: '/models/poly_pizza/', name: 'bakery.glb' });
    expect(paths[3]).toEqual({ dir: '/models/', name: 'bakery.obj' });
  });

  it('skips nation paths when no nationId is given (no nation registered)', () => {
    const paths = buildingModelSearchPaths('castle');
    expect(paths).toEqual([
      { dir: '/models/poly_pizza/', name: 'castle.glb' },
      { dir: '/models/', name: 'castle.obj' },
    ]);
  });

  it('snake_cases CamelCase and display-name building kinds for the file stem', () => {
    const re = buildingModelSearchPaths('GuardTower', 'vikings').map((p) => p.name);
    expect(re).toEqual(['guard_tower.glb', 'guard_tower.obj', 'guard_tower.glb', 'guard_tower.obj']);
  });
});

});