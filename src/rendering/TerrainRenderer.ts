/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Minimal terrain — single flat ground plane with bright magenta color.
 * Impossible to miss. Texture loading layered on top when ready.
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
    mat.diffuseColor = new Color3(1, 0, 1);   // BRIGHT MAGENTA
    mat.emissiveColor = new Color3(0.5, 0, 0.5);
    mat.backFaceCulling = false;
    this.terrainMesh.material = mat;

    console.log(`🌍 TERRAIN CREATED: ${w}×${h} magenta plane at y=0, mesh=${!!this.terrainMesh}, verts=${this.terrainMesh?.getTotalVertices?.() ?? '?'}`);
  }

  async loadTerrainTextures(map: GameMap): Promise<void> {
    if (!this.terrainMesh) return;
    const atlasW = map.width * TILE_PX;
    const atlasH = map.height * TILE_PX;

    try {
      const names = ['terrain_grass','terrain_forest','terrain_desert','terrain_mountain','terrain_snow','terrain_water','terrain_swamp'];
      const images = await Promise.all(names.map(n => this.loadImage(`/assets/textures/${n}.png`)));

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
      mat.diffuseColor = Color3.White();
      mat.emissiveColor = Color3.Black();
      console.log(`✅ Terrain atlas: ${atlasW}×${atlasH}`);
    } catch (e) { console.warn('⚠️ Atlas failed:', e); }
  }

  private toIdx(t: string): number {
    switch (t) { case 'Forest':return 1; case 'Desert':return 2; case 'Mountain':return 3; case 'Snow':return 4; case 'Water':case 'DeepWater':return 5; case 'Swamp':return 6; default:return 0; }
  }

  private loadImage(s: string): Promise<HTMLImageElement> {
    return new Promise((ok,no)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>no(Error(s));i.src=s;});
  }

  getMesh() { return this.terrainMesh; }
}
