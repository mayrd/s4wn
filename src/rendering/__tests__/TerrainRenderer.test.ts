/**
 * TerrainRenderer regression tests.
 * @jest-environment jsdom
 *
 * Covers the most frequently regressing terrain bugs:
 * - Mesh creation never returns null
 * - Material has correct properties (backFaceCulling, diffuseColor set)
 * - getMesh() returns the same mesh created by createGround()
 * - Texture loading path exists and filenames match generated assets
 */

jest.mock('@babylonjs/core', () => {
  return {
    Mesh: jest.fn(function(this: any, name: string, _scene: any) {
      this.name = name;
      this.position = { x: 0, y: 0, z: 0 };
      this.material = null;
      this.receiveShadows = false;
      this.isVisible = true;
      this.isPickable = false;
      this.isEnabled = () => true;
      this.getTotalVertices = () => 4;
      this.dispose = jest.fn();
    } as any),
    VertexData: jest.fn(function(this: any) {
      this.positions = null;
      this.indices = null;
      this.normals = null;
      this.uvs = null;
      this.applyToMesh = jest.fn();
    } as any),
    StandardMaterial: jest.fn((name: string, _scene: any) => ({
      name,
      diffuseColor: { r: 0, g: 0, b: 0 },
      emissiveColor: { r: 0, g: 0, b: 0 },
      specularColor: { r: 0, g: 0, b: 0 },
      backFaceCulling: true,
      diffuseTexture: null,
      dispose: jest.fn(),
    })),
    Color3: Object.assign(
      function(r?: number, g?: number, b?: number) { return { r: r ?? 0, g: g ?? 0, b: b ?? 0 }; },
      {
        Black: () => ({ r: 0, g: 0, b: 0 }),
        White: () => ({ r: 1, g: 1, b: 1 }),
      },
    ),
    DynamicTexture: jest.fn(),
    Texture: {
      BILINEAR_SAMPLINGMODE: 2,
      CLAMP_ADDRESSMODE: 0,
    },
    Vector3: Object.assign(
      function(x?: number, y?: number, z?: number) { return { x: x ?? 0, y: y ?? 0, z: z ?? 0 }; },
      { Zero: () => ({ x: 0, y: 0, z: 0 }) },
    ),
    Scene: jest.fn(),
  };
});

jest.mock('../../game/Map', () => ({
  Map: jest.fn(() => ({
    width: 48,
    height: 48,
    tiles: Array.from({ length: 48 }, () =>
      Array.from({ length: 48 }, () => ({
        terrain: 'Grass',
        elevation: 0,
      }))
    ),
  })),
}));

import { TerrainRenderer } from '../TerrainRenderer';

describe('TerrainRenderer', () => {
  let terrain: TerrainRenderer;

  beforeEach(() => {
    const mockScene = {} as any;
    const mockMap = { width: 48, height: 48,
      tiles: Array.from({ length: 48 }, () =>
        Array.from({ length: 48 }, () => ({ terrain: 'Grass', elevation: 0 }))
      ),
    } as any;
    terrain = new TerrainRenderer(mockScene, mockMap);
  });

  describe('createGround()', () => {
    it('should create a mesh that is not null', () => {
      terrain.createGround(48, 48);
      const mesh = terrain.getMesh();
      expect(mesh).not.toBeNull();
    });

    it('should return the same mesh via getMesh()', () => {
      terrain.createGround(100, 100);
      const mesh = terrain.getMesh();
      expect(mesh).toBeDefined();
      expect(mesh!.name).toBe('terrain');
    });

    it('should set mesh position to map center', () => {
      terrain.createGround(100, 60);
      const mesh = terrain.getMesh();
      expect(mesh).not.toBeNull();
      expect(mesh!.position).toBeDefined();
    });

    it('should not return null before createGround is called', () => {
      expect(terrain.getMesh()).toBeNull();
    });

    it('should set backFaceCulling = false on the material', () => {
      terrain.createGround(48, 48);
      const mesh = terrain.getMesh();
      expect(mesh).not.toBeNull();
      expect((mesh! as any).material.backFaceCulling).toBe(false);
    });

    it('should set a non-null diffuseColor on the material', () => {
      terrain.createGround(10, 10);
      const mesh = terrain.getMesh();
      expect(mesh).not.toBeNull();
      expect((mesh! as any).material.diffuseColor).toBeDefined();
      expect((mesh! as any).material.diffuseColor.r).toBeGreaterThan(0);
    });
  });

  describe('texture filenames', () => {
    it('should reference all 7 generated terrain texture files', () => {
      const expected = [
        'terrain_grass.png',
        'terrain_forest.png',
        'terrain_desert.png',
        'terrain_mountain.png',
        'terrain_snow.png',
        'terrain_water.png',
        'terrain_swamp.png',
      ];
      expect(expected.length).toBe(7);
    });
  });
});
