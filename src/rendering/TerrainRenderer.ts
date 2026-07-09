/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 * 
 * Creates terrain mesh with splat-mapping for heightmap, biomes, and water mask.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scene,
  Vector3,
  RawTexture,
  Constants,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';

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

    // 3. Simple material — use StandardMaterial for reliable cross-platform rendering
    const material = new StandardMaterial('terrainMat', this.scene);
    material.diffuseColor = new Color3(0.3, 0.9, 0.3);  // Bright grass green
    material.specularColor = new Color3(0, 0, 0);        // No shininess
    
    this.mesh.material = material;

    // Set position to origin
    this.mesh.position = new Vector3(0, 0, 0);
  }

  private generateHeightMap(): RawTexture {
    const size = 256; // Resolution of the heightmap texture
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

    return new RawTexture(data, size, size, Constants.TEXTUREFORMAT_LUMINANCE, this.scene, false);
  }

  getMesh(): any | null {
    return this.mesh;
  }
}
