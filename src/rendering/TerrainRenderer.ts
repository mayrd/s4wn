/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Creates a visible ground plane for the game map.
 * Uses a guaranteed-visible bright green Box instead of a flat plane
 * to eliminate any possibility of invisible geometry (zero-thickness
 * planes can disappear at certain camera angles).
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
  private width: number;
  private height: number;
  private terrainMesh: any | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.width = map.width;
    this.height = map.height;
  }

  /** Create a guaranteed-visible thick green ground box. */
  createGround(): void {
    const cx = this.width / 2;
    const cz = this.height / 2;

    // Use a very thin Box so it's 3D and visible from any angle
    this.terrainMesh = MeshBuilder.CreateBox('terrainBox', {
      width: this.width,
      height: 1,
      depth: this.height,
    }, this.scene);
    this.terrainMesh.position = new Vector3(cx, -0.5, cz);

    const mat = new StandardMaterial('terrainMat', this.scene);
    mat.diffuseColor = new Color3(0.20, 0.80, 0.20);  // bright green
    mat.emissiveColor = new Color3(0.10, 0.35, 0.10);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    this.terrainMesh.material = mat;
    this.terrainMesh.isVisible = true;

    console.log(`🌍 Terrain: green box ${this.width}×1×${this.height} at y=-0.5`);
  }

  /** Async: build terrain texture atlas, replace material. */
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

      const images = await Promise.all(filenames.map(f => this.loadImage(f)));

      const canvas = document.createElement('canvas');
      canvas.width = atlasW;
      canvas.height = atlasH;
      const ctx = canvas.getContext('2d')!;

      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const terrain = map.tiles[ty][tx].terrain as string;
          const idx = this.terrainToIdx(terrain);
          ctx.drawImage(images[idx],
            0, 0, images[idx].width, images[idx].height,
            tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX);
        }
      }

      const dynTex = new DynamicTexture('terrainAtlas', canvas, this.scene, false);
      dynTex.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      dynTex.wrapU = Texture.CLAMP_ADDRESSMODE;
      dynTex.wrapV = Texture.CLAMP_ADDRESSMODE;

      const mat = this.terrainMesh.material as StandardMaterial;
      mat.diffuseTexture = dynTex;
      mat.diffuseColor = Color3.White();
      mat.emissiveColor = Color3.Black();

      console.log(`✅ Terrain atlas applied: ${atlasW}×${atlasH}`);
    } catch (err) {
      console.warn('⚠️ Terrain textures failed — keeping bright green:', err);
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
