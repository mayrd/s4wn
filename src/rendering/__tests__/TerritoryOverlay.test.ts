/**
 * TerritoryOverlay unit tests.
 * @jest-environment jsdom
 */

jest.mock('@babylonjs/core', () => {
  const createMesh = (name: string) => ({
    name,
    position: { x: 0, y: 0, z: 0 },
    material: null,
    isVisible: true,
    getTotalVertices: () => 100,
    getVerticesData: jest.fn(() => new Float32Array(100 * 3)),
    setVerticesData: jest.fn(),
    dispose: jest.fn(),
  });
  return {
    Mesh: jest.fn((name: string) => createMesh(name)),
    VertexData: Object.assign(
      function () {
        return {
          positions: [] as number[],
          uvs: [] as number[],
          indices: [] as number[],
          normals: [] as number[],
          applyToMesh: jest.fn(),
        };
      },
      {
        ComputeNormals: jest.fn(),
      }
    ),
    VertexBuffer: {
      PositionKind: 'position',
      ColorKind: 'color',
    },
    StandardMaterial: jest.fn(() => ({
      name: 'territoryOverlayMat',
      diffuseColor: { r: 0, g: 0, b: 0 },
      specularColor: { r: 0, g: 0, b: 0 },
      emissiveColor: { r: 0, g: 0, b: 0 },
      backFaceCulling: true,
      alpha: 1,
      useAlphaFromDiffuseTexture: false,
      dispose: jest.fn(),
    })),
    Scene: jest.fn(),
    Vector3: Object.assign(
      function (x?: number, y?: number, z?: number) {
        return { x: x ?? 0, y: y ?? 0, z: z ?? 0 };
      },
      { Zero: () => ({ x: 0, y: 0, z: 0 }) }
    ),
  };
});

// Mock nation info for deterministic colors
jest.mock('../../game/Nation', () => ({
  NATION_INFO: {
    0: { nameId: 0, color: '#cc3333', emoji: '🏛️', description: 'Romans' },
    1: { nameId: 1, color: '#3366cc', emoji: '⚔️', description: 'Vikings' },
    2: { nameId: 2, color: '#33cc33', emoji: '🌿', description: 'Mayans' },
    3: { nameId: 3, color: '#cc9933', emoji: '🐴', description: 'Trojans' },
    4: { nameId: 4, color: '#9933cc', emoji: '🌑', description: 'Dark Tribe' },
  },
  NATION_NAMES: ['Romans', 'Vikings', 'Mayans', 'Trojans', 'Dark Tribe'],
  NationType: { Romans: 0, Vikings: 1, Mayans: 2, Trojans: 3, DarkTribe: 4 },
  NATION_COUNT: 5,
}));

import { TerritoryOverlay } from '../TerritoryOverlay';

function makeMap(territoryValues: number[][]) {
  const h = territoryValues.length;
  const w = territoryValues[0].length;
  return {
    width: w,
    height: h,
    tiles: territoryValues.map((row, _y) =>
      row.map((t, _x) => ({ terrain: 'Grass', elevation: 0, territory: t, resource: null, visibility: 0 }))
    ),
    get: (x: number, y: number) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return undefined;
      return { terrain: 'Grass', elevation: 0, territory: territoryValues[y]?.[x] ?? 0, resource: null, visibility: 0 };
    },
  } as any;
}

describe('TerritoryOverlay', () => {
  let overlay: TerritoryOverlay;
  let map: any;

  beforeEach(() => {
    // 10x10 map, all neutral (territory=0)
    map = makeMap(Array.from({ length: 10 }, () => new Array(10).fill(0)));
    overlay = new TerritoryOverlay({} as any, map);
  });

  it('creates overlay mesh with correct name', () => {
    overlay.createOverlay(10, 10);
    const mesh = overlay.getMesh();
    expect(mesh).not.toBeNull();
    expect(mesh!.name).toBe('territoryOverlay');
  });

  it('null before createOverlay', () => {
    expect(overlay.getMesh()).toBeNull();
  });

  it('mesh is visible by default after creation', () => {
    overlay.createOverlay(10, 10);
    expect(overlay.isVisible).toBe(true);
    expect(overlay.getMesh()!.isVisible).toBe(true);
  });

  it('setVisible toggles mesh visibility', () => {
    overlay.createOverlay(10, 10);
    overlay.setVisible(false);
    expect(overlay.isVisible).toBe(false);
    expect(overlay.getMesh()!.isVisible).toBe(false);

    overlay.setVisible(true);
    expect(overlay.isVisible).toBe(true);
    expect(overlay.getMesh()!.isVisible).toBe(true);
  });

  it('refresh updates vertex colors without error', () => {
    overlay.createOverlay(10, 10);
    // Should not throw
    expect(() => overlay.refresh()).not.toThrow();
  });

  it('refresh is no-op when no mesh exists', () => {
    expect(() => overlay.refresh()).not.toThrow();
  });

  it('dispose cleans up mesh', () => {
    overlay.createOverlay(10, 10);
    expect(overlay.getMesh()).not.toBeNull();
    overlay.dispose();
    expect(overlay.getMesh()).toBeNull();
  });

  it('vertex colors set on mesh with 4 components (RGBA)', () => {
    overlay.createOverlay(10, 10);
    const mesh = overlay.getMesh()!;
    expect(mesh.setVerticesData).toHaveBeenCalledWith(
      'color',
      expect.any(Array),
      false,
      4
    );
  });

  it('all-neutral map produces all-zero (transparent) vertex colors', () => {
    overlay.createOverlay(10, 10);
    const mesh = overlay.getMesh()!;
    const colorCall = (mesh.setVerticesData as jest.Mock).mock.calls[0];
    const colors = colorCall[1] as number[];
    // 10x10 = 100 vertices, 4 components each = 400 values
    expect(colors.length).toBe(400);
    expect(colors.every((c: number) => c === 0)).toBe(true);
  });

  it('territory-owned tiles get non-zero vertex colors', () => {
    // Romans own tile (2,2)
    map = makeMap(withTerritory(10, 10, { 2: { 2: 1 } }));
    overlay = new TerritoryOverlay({} as any, map);
    overlay.createOverlay(10, 10);
    const mesh = overlay.getMesh()!;
    const colorCall = (mesh.setVerticesData as jest.Mock).mock.calls[0];
    const colors = colorCall[1] as number[];

    // Tile (2, 2) is vertex index 2*10 + 2 = 22
    const idx = (2 * 10 + 2) * 4;
    const r = colors[idx], g = colors[idx + 1], b = colors[idx + 2], a = colors[idx + 3];
    // Roman color = #cc3333 -> r=0.8, g=0.2, b=0.2, alpha=0.30
    expect(r).toBeCloseTo(0.8, 1);
    expect(g).toBeCloseTo(0.2, 1);
    expect(b).toBeCloseTo(0.2, 1);
    expect(a).toBeCloseTo(0.30, 2);
  });

  it('multiple nations get correct per-tile colors', () => {
    // Romans at (0,0), Vikings at (3,3)
    map = makeMap(withTerritory(10, 10, { 0: { 0: 1 }, 3: { 3: 2 } }));
    overlay = new TerritoryOverlay({} as any, map);
    overlay.createOverlay(10, 10);
    const mesh = overlay.getMesh()!;
    const colorCall = (mesh.setVerticesData as jest.Mock).mock.calls[0];
    const colors = colorCall[1] as number[];

    // Roman tile: vertex 0
    expect(colors[0]).toBeCloseTo(0.8, 1);  // R
    expect(colors[1]).toBeCloseTo(0.2, 1);  // G
    expect(colors[2]).toBeCloseTo(0.2, 1);  // B
    expect(colors[3]).toBeCloseTo(0.30, 2); // A

    // Viking tile: vertex 3*10+3 = 33
    const vIdx = (3 * 10 + 3) * 4;
    // Viking color = #3366cc -> r=0.2, g=0.4, b=0.8
    expect(colors[vIdx]).toBeCloseTo(0.2, 1);
    expect(colors[vIdx + 1]).toBeCloseTo(0.4, 1);
    expect(colors[vIdx + 2]).toBeCloseTo(0.8, 1);
    expect(colors[vIdx + 3]).toBeCloseTo(0.30, 2);
  });

  it('re-creating overlay disposes old mesh', () => {
    overlay.createOverlay(10, 10);
    const oldMesh = overlay.getMesh()!;
    overlay.createOverlay(10, 10);
    expect(oldMesh.dispose).toHaveBeenCalled();
  });
});

/** Helper to build territory matrix with specific tiles owned. */
function withTerritory(
  w: number,
  h: number,
  owners: Record<number, Record<number, number>>
): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    grid[y] = [];
    for (let x = 0; x < w; x++) {
      grid[y][x] = owners[y]?.[x] ?? 0;
    }
  }
  return grid;
}
