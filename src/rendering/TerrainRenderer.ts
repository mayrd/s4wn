/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Creates a textured ground plane. The createGround() method sets up a
 * flat green plane synchronously. loadTerrainTextures() then composites
 * the 8 AI-generated terrain textures into an atlas from the map data
 * and applies it as the ground plane's diffuse texture.
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

const TEX_SIZE = 1024; // each terrain tile is 1024×1024 px

/** Convert terrain enum string → texture array index (0-6). */
function terrainToIdx(t: string): number {
  switch (t) {
    case 'Grass': return 0;
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

export class TerrainRenderer {
  private scene: Scene;
  private map: GameMap;
  private width: number;
  private height: number;
  private terrainMesh: any | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.map = map;
    this.width = map.width;
    this.height = map.height;
  }

  /** Create ground plane with a placeholder green material (instant). */
  createGround(): void {
    const cx = this.width / 2;
    const cz = this.height / 2;
    this.terrainMesh = MeshBuilder.CreateGround('terrain', {
      width: this.width,
      height: this.height,
      subdivisions: 1,
      updatable: false,
    }, this.scene);
    this.terrainMesh.position = new Vector3(cx, 0, cz);

    const mat = new StandardMaterial('terrainMat', this.scene);
    mat.diffuseColor = new Color3(0.25, 0.85, 0.25);
    mat.emissiveColor = new Color3(0.1, 0.4, 0.1);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    this.terrainMesh.material = mat;
    this.terrainMesh.receiveShadows = true;

    console.log(`🌍 Terrain: ground plane ${this.width}×${this.height} at (${cx}, 0, ${cz})`);
  }

  /** Load all 8 terrain textures, build atlas from map data, apply to ground. */
  async loadTerrainTextures(): Promise<void> {
    if (!this.terrainMesh) return;

    const atlasW = this.width * TEX_SIZE;
    const atlasH = this.height * TEX_SIZE;
    console.log(`🌍 Loading terrain textures → ${TEX_SIZE}/${TEX_SIZE}p atlas...`);

    try {
      const filenames = [
        '/assets/textures/terrain_grass.png',      // 0
        '/assets/textures/terrain_forest.png',     // 1
        '/assets/textures/terrain_desert.png',     // 2
        '/assets/textures/terrain_mountain.png',   // 3
        '/assets/textures/terrain_snow.png',       // 4
        '/assets/textures/terrain_water.png',      // 5, also 6=DeepWater
        '/assets/textures/terrain_swamp.png',      // 7
      ];

      // Load all 7 unique texture images
      const images = await Promise.all(filenames.map(f => this.loadImage(f)));

      // Draw atlas onto offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = atlasW;
      canvas.height = atlasH;
      const ctx = canvas.getContext('2d')!;

      for (let ty = 0; ty < this.height; ty++) {
        for (let tx = 0; tx < this.width; tx++) {
          const terrain = this.map.tiles[ty][tx].terrain as string;
          const idx = terrainToIdx(terrain);
          ctx.drawImage(images[idx], 0, 0, images[idx].width, images[idx].height,
            tx * TEX_SIZE, ty * TEX_SIZE, TEX_SIZE, TEX_SIZE);
        }
      }

      // Upload as DynamicTexture
      const dynTex = new DynamicTexture('terrainAtlas', canvas, this.scene, false);
      dynTex.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      dynTex.wrapU = Texture.CLAMP_ADDRESSMODE;
      dynTex.wrapV = Texture.CLAMP_ADDRESSMODE;

      // Replace the ground material with the textured one
      const mat = new StandardMaterial('terrainTexMat', this.scene);
      mat.diffuseTexture = dynTex;
      mat.specularColor = new Color3(0, 0, 0);
      mat.backFaceCulling = false;
      this.terrainMesh.material = mat;
      this.terrainMesh.receiveShadows = true;

      console.log(`✅ Terrain atlas applied: ${atlasW}×${atlasH}`);
    } catch (err) {
      console.warn('⚠️ Terrain textures failed to load — using flat green:', err);
    }
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  getMesh(): any | null {
    return this.terrainMesh;
  }
}
