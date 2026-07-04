/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 * 
 * Creates terrain mesh with splat-mapping for heightmap, biomes, and water mask.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Scene,
  Vector3,
  DynamicTexture,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';
import { Terrain } from '../game/types';

export class TerrainRenderer {
  private scene: Scene;
  private map: GameMap;
  private width: number;
  private height: number;
  private mesh: any | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.map = map;
    this.width = map.width;
    this.height = map.height;
  }

  /**
   * Create terrain mesh with splat-mapping support.
   */
  createTerrain(): void {
    // 1. Generate Heightmap
    const heightMap = this.generateHeightMap();
    
    // 2. Create Terrain Mesh from Heightmap
    // We use CreateGroundFromHeightMap for easier height integration
    this.mesh = MeshBuilder.CreateGroundFromHeightMap(
      'terrain',
      heightMap as any,
      {
        width: this.width,
        height: this.height,
        subdivisions: this.width - 1,
        minHeight: 0,
        maxHeight: 10, // Adjust based on expected elevation
      },
      this.scene
    );

    // 3. Generate Splatmap
    const splatMap = this.generateSplatMap();

    // 4. Create Material with Splat-mapping and Fog of War
    const material = new StandardMaterial('terrainMat', this.scene);
    material.diffuseTexture = splatMap;
    
    // Implement basic Fog of War using a visibility texture
    const visibilityMap = this.generateVisibilityMap();
    material.diffuseTexture = visibilityMap; // For now, we use it as the main texture to show FoW
    // In a real implementation, we would blend splatMap and visibilityMap in a shader
    
    this.mesh.material = material;

    // Set position to origin
    this.mesh.position = new Vector3(0, 0, 0);
  }

  private generateHeightMap(): DynamicTexture {
    const size = 256; // Resolution of the heightmap texture
    const heightMap = new DynamicTexture('heightMap', { width: size, height: size }, this.scene);
    const data = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Map texture coordinates to map coordinates
        const mapX = Math.floor((x / size) * this.width);
        const mapY = Math.floor((y / size) * this.height);
        
        const tile = this.map.get(mapX, mapY);
        const elevation = tile ? tile.elevation : 0;
        
        // Scale elevation to 0-255
        data[y * size + x] = Math.min(255, Math.max(0, elevation * 25.5));
      }
    }

    (heightMap as any).setPixels(data);
    return heightMap;
  }

  private generateVisibilityMap(): DynamicTexture {
    const size = 256;
    const visMap = new DynamicTexture('visMap', { width: size, height: size }, this.scene);
    const data = new Uint8ClampedArray(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const mapX = Math.floor((x / size) * this.width);
        const mapY = Math.floor((y / size) * this.height);
        
        const vis = this.map.getVisibility(mapX, mapY);
        const index = (y * size + x) * 4;
        
        const val = Math.floor(vis * 255);
        data[index] = val;
        data[index + 1] = val;
        data[index + 2] = val;
        data[index + 3] = 255;
      }
    }

    (visMap as any).setPixels(data);
    return visMap;
  }

  private generateSplatMap(): DynamicTexture {
    const size = 256;
    const splatMap = new DynamicTexture('splatMap', { width: size, height: size }, this.scene);
    const data = new Uint8ClampedArray(size * size * 4);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const mapX = Math.floor((x / size) * this.width);
        const mapY = Math.floor((y / size) * this.height);
        
        const tile = this.map.get(mapX, mapY);
        const terrain = tile ? tile.terrain : Terrain.Grass;

        const index = (y * size + x) * 4;
        
        // Assign colors based on terrain type for the splatmap
        // In a real implementation, these would be weights in RGBA channels
        switch (terrain) {
          case Terrain.Grass:
            data[index] = 50;     // R
            data[index + 1] = 200; // G
            data[index + 2] = 50;  // B
            break;
          case Terrain.Forest:
            data[index] = 20;
            data[index + 1] = 100;
            data[index + 2] = 20;
            break;
          case Terrain.Desert:
            data[index] = 200;
            data[index + 1] = 200;
            data[index + 2] = 100;
            break;
          case Terrain.Mountain:
            data[index] = 100;
            data[index + 1] = 100;
            data[index + 2] = 100;
            break;
          case Terrain.Snow:
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;
            break;
          case Terrain.Water:
          case Terrain.DeepWater:
            data[index] = 0;
            data[index + 1] = 0;
            data[index + 2] = 255;
            break;
          case Terrain.Swamp:
            data[index] = 50;
            data[index + 1] = 50;
            data[index + 2] = 0;
            break;
          default:
            data[index] = 128;
            data[index + 1] = 128;
            data[index + 2] = 128;
        }
        data[index + 3] = 255; // Alpha
      }
    }

    (splatMap as any).setPixels(data);
    return splatMap;
  }

  getMesh(): any | null {
    return this.mesh;
  }
}
