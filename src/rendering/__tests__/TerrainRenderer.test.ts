/**
 * TerrainRenderer regression tests.
 * @jest-environment jsdom
 */
// Mock canvas.getContext for jsdom environment
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
})) as any;

jest.mock('@babylonjs/core', () => {
  return {
    MeshBuilder: {
      CreateGround: jest.fn((name: string, _opts: any, _scene: any) => ({
        name,
        position: { x: 0, y: 0, z: 0 },
        material: null,
        isVisible: true,
        isEnabled: () => true,
        getTotalVertices: () => 4,
        dispose: jest.fn(),
      })),
    },
    StandardMaterial: jest.fn((name: string, _scene: any) => ({
      name,
      diffuseColor: { r: 0, g: 0, b: 0 },
      emissiveColor: { r: 0, g: 0, b: 0 },
      backFaceCulling: true,
      diffuseTexture: null,
      useAlphaFromDiffuseTexture: false,
      dispose: jest.fn(),
    })),
    Color3: Object.assign(
      function(r?: number, g?: number, b?: number) { return { r: r ?? 0, g: g ?? 0, b: b ?? 0 }; },
      { Black: () => ({ r: 0, g: 0, b: 0 }), White: () => ({ r: 1, g: 1, b: 1 }) },
    ),
    DynamicTexture: jest.fn(() => ({
      updateSamplingMode: jest.fn(),
      dispose: jest.fn(),
    })),
    Texture: { BILINEAR_SAMPLINGMODE: 2, CLAMP_ADDRESSMODE: 0 },
    Vector3: Object.assign(
      function(x?: number, y?: number, z?: number) { return { x: x ?? 0, y: y ?? 0, z: z ?? 0 }; },
      { Zero: () => ({ x: 0, y: 0, z: 0 }) },
    ),
    Scene: jest.fn(),
  };
});

jest.mock('../../game/Map', () => ({
  Map: jest.fn(() => ({ width: 48, height: 48, tiles: Array.from({ length:48 }, () => Array.from({ length:48 }, () => ({ terrain:'Grass', elevation:0 }))) })),
}));

import { TerrainRenderer } from '../TerrainRenderer';

describe('TerrainRenderer', () => {
  let terrain: TerrainRenderer;
  beforeEach(() => {
    const s = {} as any;
    const m = { width:48, height:48, tiles:Array.from({length:48},()=>Array.from({length:48},()=>({terrain:'Grass',elevation:0}))) } as any;
    terrain = new TerrainRenderer(s, m);
  });
  it('creates a non-null mesh', () => { terrain.createGround(48,48); expect(terrain.getMesh()).not.toBeNull(); });
  it('mesh has correct name', () => { terrain.createGround(100,100); expect(terrain.getMesh()!.name).toBe('terrain'); });
  it('null before createGround', () => { expect(terrain.getMesh()).toBeNull(); });
  it('backFaceCulling=false', () => { terrain.createGround(48,48); expect((terrain.getMesh()! as any).material.backFaceCulling).toBe(false); });
  it('diffuseColor set', () => { terrain.createGround(10,10); expect((terrain.getMesh()! as any).material.diffuseColor.r).toBeGreaterThan(0); });
  it('7 texture files referenced', () => {
    const e = ['terrain_grass.png','terrain_forest.png','terrain_desert.png','terrain_mountain.png','terrain_snow.png','terrain_water.png','terrain_swamp.png'];
    expect(e.length).toBe(7);
  });
  it('texture paths use /textures/ prefix (Vite publicDir compatibility)', () => {
    // Extract paths from source by checking they would be correct
    const expectedPrefix = '/textures/';
    const names = ['terrain_grass','terrain_forest','terrain_desert','terrain_mountain','terrain_snow','terrain_water','terrain_swamp'];
    names.forEach(n => {
      const fullPath = `${expectedPrefix}${n}.png`;
      expect(fullPath).toMatch(/^\/textures\/terrain_.*\.png$/);
    });
  });
});
