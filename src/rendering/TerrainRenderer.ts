/**
 * S4WN Terrain Renderer — Creates terrain mesh with per-tile splat textures.
 *
 * Builds a ground mesh with one vertex per tile so that elevations can be
 * displaced into real 3D relief. A texture atlas is assembled from the
 * individual terrain type PNGs (one 16×16 cell per tile) and mapped onto the
 * mesh with 1:1 UVs so each tile samples its own atlas cell.
 */

import {
  Mesh,
  VertexData,
  StandardMaterial,
  Texture,
  DynamicTexture,
  Color3,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';

const TILE_PX = 16;
// World-units of vertical displacement per elevation point.
const ELEV_SCALE = 0.6;

export class TerrainRenderer {
  private scene: Scene;
  private map: GameMap;
  private terrainMesh: Mesh | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.map = map;
  }

  createGround(w: number, h: number): void {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // One vertex per tile; vertex (x,y) sits at the centre of tile (x,y).
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = this.map?.get?.(x, y);
        const elev = (tile ? tile.elevation : 0) * ELEV_SCALE;
        positions.push(x + 0.5, elev, y + 0.5);
        // 1:1 UV — tile (x,y) maps to the [x/w, (x+1)/w] region of the atlas.
        uvs.push(x / w, y / h);
      }
    }

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i0 = y * w + x;
        const i1 = i0 + 1;
        const i2 = i0 + w;
        const i3 = i2 + 1;
        // Two triangles per quad (counter-clockwise winding).
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    const mesh = new Mesh('terrain', this.scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.uvs = uvs;
    vd.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    vd.normals = normals;
    vd.applyToMesh(mesh);
    // Shift so tile (x,y) centres land at world coordinate (x, y).
    mesh.position = new Vector3(-0.5, 0, -0.5);
    mesh.material = this.createMaterial();
    this.terrainMesh = mesh;

    console.log(
      `🌍 TERRAIN: ${w}×${h} mesh built, verts=${mesh.getTotalVertices()}, tris=${indices.length / 3}`
    );
  }

  private createMaterial(): StandardMaterial {
    const mat = new StandardMaterial('terrainMat', this.scene);
    // Grass-green placeholder shown until the atlas finishes loading.
    mat.diffuseColor = new Color3(0.27, 0.55, 0.22);
    mat.specularColor = new Color3(0, 0, 0);
    mat.emissiveColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    // The atlas is fully opaque — must NOT read alpha from the diffuse texture.
    mat.useAlphaFromDiffuseTexture = false;
    return mat;
  }

  async loadTerrainTextures(map: GameMap): Promise<void> {
    if (!this.terrainMesh) return;
    const atlasW = map.width * TILE_PX;
    const atlasH = map.height * TILE_PX;
    try {
      console.log(`🗺️ Building terrain atlas (${atlasW}×${atlasH}) from /textures/...`);
      const names = [
        'terrain_grass',
        'terrain_forest',
        'terrain_desert',
        'terrain_mountain',
        'terrain_snow',
        'terrain_water',
        'terrain_swamp',
      ];
      const images = await Promise.all(
        names.map((n) => this.loadImage(`/textures/${n}.png`))
      );
      const c = document.createElement('canvas');
      c.width = atlasW;
      c.height = atlasH;
      const ctx = c.getContext('2d')!;
      // Opaque base so uncovered edges never turn transparent.
      ctx.fillStyle = '#3c8c38';
      ctx.fillRect(0, 0, atlasW, atlasH);
      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const idx = this.toIdx(String(map.tiles[ty][tx].terrain));
          ctx.drawImage(
            images[idx],
            0, 0, images[idx].width, images[idx].height,
            tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX
          );
        }
      }
      const dt = new DynamicTexture('terrainAtlas', c, this.scene, false);
      dt.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      dt.wrapU = Texture.CLAMP_ADDRESSMODE;
      dt.wrapV = Texture.CLAMP_ADDRESSMODE;
      const mat = this.terrainMesh.material as StandardMaterial;
      mat.diffuseTexture = dt;
      mat.useAlphaFromDiffuseTexture = false;
      console.log(`✅ Terrain atlas applied: ${atlasW}×${atlasH}`);
    } catch (e) {
      console.warn('⚠️ Atlas build failed, keeping flat color:', e);
    }
  }

  private toIdx(t: string): number {
    switch (t) {
      case 'Forest': return 1;
      case 'Desert': return 2;
      case 'Mountain': return 3;
      case 'Snow': return 4;
      case 'Water':
      case 'DeepWater': return 5;
      case 'Swamp': return 6;
      default: return 0;
    }
  }

  private loadImage(s: string): Promise<HTMLImageElement> {
    return new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(Error(`failed to load ${s}`));
      i.src = s;
    });
  }

  getMesh() {
    return this.terrainMesh;
  }
}