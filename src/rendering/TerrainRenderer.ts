/**
 * S4WN Terrain Renderer — Creates terrain mesh with splat-mapped textures.
 *
 * Generates terrain texture atlas from individual terrain type images.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  DynamicTexture,
  Color3,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';

const TILE_PX = 16;

export class TerrainRenderer {
  private scene: Scene;
  private terrainMesh: any | null = null;

  constructor(scene: Scene, _map: GameMap) {
    this.scene = scene;
  }

  createGround(w: number, h: number): void {
    const cx = w / 2;
    const cz = h / 2;

    this.terrainMesh = MeshBuilder.CreateGround('terrain', {
      width: w, height: h, subdivisions: 1, updatable: false,
    }, this.scene);
    this.terrainMesh.position = new Vector3(cx, 0, cz);

    const mat = new StandardMaterial('terrainMat', this.scene);
    mat.diffuseColor = new Color3(1, 0, 1);

    // Bind a 1×1 magenta pixel texture to ensure the mesh is visible
    // (some GPUs require a texture sampler bound even for simple shaders)
    const pixel = document.createElement('canvas');
    pixel.width = 1; pixel.height = 1;
    const pctx = pixel.getContext('2d')!;
    pctx.fillStyle = '#FF00FF';
    pctx.fillRect(0, 0, 1, 1);
    const tex = new DynamicTexture('tex1px', pixel, this.scene, false);
    mat.diffuseTexture = tex;
    mat.useAlphaFromDiffuseTexture = true;

    mat.emissiveColor = new Color3(0.3, 0, 0.3);
    mat.backFaceCulling = false;
    this.terrainMesh.material = mat;

    console.log(`🌍 TERRAIN: ${w}×${h} with 1×1 tex, mesh=true, verts=${this.terrainMesh?.getTotalVertices?.() ?? '?'}`);
  }

  async loadTerrainTextures(map: GameMap): Promise<void> {
    if (!this.terrainMesh) return;
    const atlasW = map.width * TILE_PX;
    const atlasH = map.height * TILE_PX;
    try {
      // Assets are served at root (Vite publicDir: assets)
      console.log(`🗺️ Loading terrain textures from /textures/... for ${map.width}x${map.height} map`);
      const names = ['terrain_grass','terrain_forest','terrain_desert','terrain_mountain','terrain_snow','terrain_water','terrain_swamp'];
      console.log(`📋 Texture paths: ${names.map(n => `/textures/${n}.png`).join(', ')}`);
      const images = await Promise.all(names.map(n => this.loadImage(`/textures/${n}.png`)));
      console.log(`✅ Loaded ${images.length} terrain images`);
      const c = document.createElement('canvas');
      c.width = atlasW; c.height = atlasH;
      const ctx = c.getContext('2d')!;
      for (let ty=0; ty<map.height; ty++) for (let tx=0; tx<map.width; tx++) {
        let idx = this.toIdx(map.tiles[ty][tx].terrain as string);
        ctx.drawImage(images[idx], 0,0, images[idx].width,images[idx].height, tx*TILE_PX,ty*TILE_PX,TILE_PX,TILE_PX);
      }
      const dt = new DynamicTexture('terrainAtlas', c, this.scene, false);
      dt.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      const mat = this.terrainMesh.material as StandardMaterial;
      mat.diffuseTexture = dt;
      mat.emissiveColor = Color3.Black();
      console.log(`✅ Terrain atlas: ${atlasW}×${atlasH}`);
    } catch (e) { console.warn('⚠️ Atlas failed:', e); }
  }

  private toIdx(t: string): number {
    switch (t) {
      case 'Forest': return 1;
      case 'Desert': return 2;
      case 'Mountain': return 3;
      case 'Snow': return 4;
      case 'Water': case 'DeepWater': return 5;
      case 'Swamp': return 6;
      default: return 0;
    }
  }

  private loadImage(s: string): Promise<HTMLImageElement> {
    return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(Error(s));i.src=s;});
  }

  getMesh() { return this.terrainMesh; }
}