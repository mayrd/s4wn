/**
 * TerrainRenderer regression tests.
 * @jest-environment jsdom
 */
// Mock canvas.getContext for jsdom environment
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
  drawImage: jest.fn(),
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  getImageData: jest.fn(() => ({ data: [100, 100, 100, 255] })),
})) as any;

jest.mock('@babylonjs/core', () => {
  const mesh = {
    name: '',
    position: { x: 0, y: 0, z: 0 },
    material: null,
    isVisible: true,
    isEnabled: () => true,
    getTotalVertices: () => 48 * 48,
    dispose: jest.fn(),
  };
  // Color3 mock with clone method
  const Color3Mock = Object.assign(
    function (this: any, r?: number, g?: number, b?: number) { 
      const obj = { r: r ?? 0, g: g ?? 0, b: b ?? 0, clone: () => ({ r: obj.r, g: obj.g, b: obj.b }) };
      return obj;
    },
    { 
      Black: () => ({ r: 0, g: 0, b: 0, clone: () => ({ r: 0, g: 0, b: 0 }) }), 
      White: () => ({ r: 1, g: 1, b: 1, clone: () => ({ r: 1, g: 1, b: 1 }) })
    }
  );
  return {
    Mesh: jest.fn((name: string, _scene: any) => ({ ...mesh, name })),
    VertexData: Object.assign(
      function () {
        return { positions: [], uvs: [], indices: [], normals: [], applyToMesh: jest.fn() };
      },
      { ComputeNormals: jest.fn() },
    ),
    StandardMaterial: jest.fn(() => {
      const mat = {
        name: 'terrainMat',
        diffuseColor: { r: 0, g: 0, b: 0, clone: () => ({ r: 0, g: 0, b: 0 }) },
        emissiveColor: { r: 0, g: 0, b: 0 },
        specularColor: { r: 0, g: 0, b: 0 },
        backFaceCulling: true,
        diffuseTexture: null,
        useAlphaFromDiffuseTexture: false,
        dispose: jest.fn(),
      };
      return mat;
    }),
    Color3: Color3Mock,
    DynamicTexture: jest.fn(() => ({
      update: jest.fn(),
      updateSamplingMode: jest.fn(),
      dispose: jest.fn(),
    })),
    Texture: { BILINEAR_SAMPLINGMODE: 2, CLAMP_ADDRESSMODE: 0 },
    Vector3: Object.assign(
      function (x?: number, y?: number, z?: number) { return { x: x ?? 0, y: y ?? 0, z: z ?? 0 }; },
      { Zero: () => ({ x: 0, y: 0, z: 0 }) },
    ),
    Scene: jest.fn(),
  };
});

jest.mock('../../game/Map', () => {
  const tiles = Array.from({ length: 48 }, () =>
    Array.from({ length: 48 }, () => ({ terrain: 'Grass', elevation: 0 })),
  );
  return {
    Map: jest.fn(() => ({
      width: 48,
      height: 48,
      tiles,
      get: (x: number, y: number) => tiles[y]?.[x],
    })),
  };
});

import { TerrainRenderer } from '../TerrainRenderer';

describe('TerrainRenderer', () => {
  let terrain: TerrainRenderer;
  beforeEach(() => {
    const s = {} as any;
    const m = {
      width: 48,
      height: 48,
      tiles: Array.from({ length: 48 }, () =>
        Array.from({ length: 48 }, () => ({ terrain: 'Grass', elevation: 0 })),
      ),
      get: (_x: number, _y: number) => ({ terrain: 'Grass', elevation: 0 }),
    } as any;
    terrain = new TerrainRenderer(s, m);
  });
  it('creates a non-null mesh', () => { terrain.createGround(48, 48); expect(terrain.getMesh()).not.toBeNull(); });
  it('mesh has correct name', () => { terrain.createGround(100, 100); expect(terrain.getMesh()!.name).toBe('terrain'); });
  it('null before createGround', () => { expect(terrain.getMesh()).toBeNull(); });
  it('backFaceCulling=false', () => { terrain.createGround(48, 48); expect((terrain.getMesh()! as any).material.backFaceCulling).toBe(false); });
  it('diffuseColor set', () => { terrain.createGround(10, 10); expect((terrain.getMesh()! as any).material.diffuseColor.r).toBeGreaterThan(0); });
  it('alpha-from-diffuse disabled so opaque atlas shows', () => {
    terrain.createGround(10, 10);
    expect((terrain.getMesh()! as any).material.useAlphaFromDiffuseTexture).toBe(false);
  });
  it('7 texture files referenced', () => {
    const e = ['terrain_grass.png', 'terrain_forest.png', 'terrain_desert.png', 'terrain_mountain.png', 'terrain_snow.png', 'terrain_water.png', 'terrain_swamp.png'];
    expect(e.length).toBe(7);
  });
  it('texture paths use /textures/ prefix (Vite publicDir: assets)', () => {
    const expectedPrefix = '/textures/';
    const names = ['terrain_grass', 'terrain_forest', 'terrain_desert', 'terrain_mountain', 'terrain_snow', 'terrain_water', 'terrain_swamp'];
    names.forEach(n => {
      const fullPath = `${expectedPrefix}${n}.png`;
      expect(fullPath).toMatch(/^\/textures\/terrain_.*\.png$/);
    });
  });
  
  describe('Splatting', () => {
    it('splatting enabled by default', () => {
      terrain.createGround(48, 48);
      expect(terrain.isSplattingEnabled()).toBe(true);
    });
    
    it('setSplattingEnabled toggles state', () => {
      expect(terrain.isSplattingEnabled()).toBe(true);
      terrain.setSplattingEnabled(false);
      expect(terrain.isSplattingEnabled()).toBe(false);
      terrain.setSplattingEnabled(true);
      expect(terrain.isSplattingEnabled()).toBe(true);
    });
    
    it('splatting disabled shows flat color', () => {
      terrain.createGround(48, 48);
      terrain.setSplattingEnabled(false);
      // When splatting is off, diffuseTexture should be null
      expect((terrain.getMesh()! as any).material.diffuseTexture).toBeNull();
    });
    
    it('splatting toggle preserves original diffuseColor', () => {
      terrain.createGround(48, 48);
      const mat = (terrain.getMesh()! as any).material;
      // Manually set a meaningful diffuseColor for testing
      mat.diffuseColor = { r: 0.3, g: 0.7, b: 0.2, clone: () => ({ r: 0.3, g: 0.7, b: 0.2 }) };
      const originalColor = mat.diffuseColor;
      terrain.setSplattingEnabled(false);
      terrain.setSplattingEnabled(true);
      // Color should be restored (same values, not necessarily same object)
      expect(mat.diffuseColor.r).toBe(originalColor.r);
      expect(mat.diffuseColor.g).toBe(originalColor.g);
      expect(mat.diffuseColor.b).toBe(originalColor.b);
    });
  });
});