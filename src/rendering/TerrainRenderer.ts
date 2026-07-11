/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Creates a textured ground plane. Uses a Canvas2D composite atlas
 * at safe resolution (16px/tile → 768×768px, well within WebGL limits).
 * Each map tile gets its terrain texture sampled into the atlas.
 * The atlas is applied as a single diffuse texture on the ground plane.
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

const TILE_PX = 16; // pixels per map tile — safe for any GPU

export class TerrainRenderer {
  private scene: Scene;
  private width: number;
  private height: number;
  private terrainMesh: any | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.width = map.width;
    this.height = map.height;
  }

  /** Create green ground plane instantly, then kick off async texture loading. */
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
    mat.diffuseColor = new Color3(0.25, 0.70, 0.25);
    mat.emissiveColor = new Color3(0.05, 0.15, 0.05);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    this.terrainMesh.material = mat;
    this.terrainMesh.receiveShadows = true;

    console.log(`🌍 Terrain: green ground plane ${this.width}×${this.height}`);
  }

  /** Async: load terrain textures, build small atlas, replace material. */
  async loadTerrainTextures(map: GameMap): Promise<void> {
    if (!this.terrainMesh) return;

    const atlasW = map.width * TILE_PX;
    const atlasH = map.height * TILE_PX;
    console.log(`🌍 Building terrain atlas: ${atlasW}×${atlasH}`);

    try {
      const filenames = [
        '/assets/textures/terrain_grass.png',
        '/assets/textures/terrain_forest.png',
        '/assets/textures/terrain_desert.png',
        '/assets/textures/terrain_mountain.png',
        '/assets/textures/terrain_snow.png',
        '/assets/textures/terrain_water.png',
        '/assets/textures/terrain_swamp.png',
      ];

      // Load images
      const images = await Promise.all(filenames.map(f => this.loadImage(f)));

      // Draw atlas on offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = atlasW;
      canvas.height = atlasH;
      const ctx = canvas.getContext('2d')!;

      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const terrain = map.tiles[ty][tx].terrain as string;
          const idx = this.terrainToIdx(terrain);
          // drawImage sourced from full 1024×1024 → tiny TILE_PX×TILE_PX
          ctx.drawImage(images[idx],
            0, 0, images[idx].width, images[idx].height,
            tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX);
        }
      }

      // Upload as DynamicTexture
      const dynTex = new DynamicTexture('terrainAtlas', canvas, this.scene, false);
      dynTex.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      dynTex.wrapU = Texture.CLAMP_ADDRESSMODE;
      dynTex.wrapV = Texture.CLAMP_ADDRESSMODE;

      // Replace material
      const mat = new StandardMaterial('terrainTexMat', this.scene);
      mat.diffuseTexture = dynTex;
      mat.emissiveColor = Color3.Black();
      mat.specularColor = new Color3(0, 0, 0);
      mat.backFaceCulling = false;
      this.terrainMesh.material = mat;
      this.terrainMesh.receiveShadows = true;

      console.log(`✅ Terrain atlas applied: ${atlasW}×${atlasH}`);
    } catch (err) {
      console.warn('⚠️ Terrain textures failed — keeping flat green:', err);
    }
  }

  private terrainToIdx(t: string): number {
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
