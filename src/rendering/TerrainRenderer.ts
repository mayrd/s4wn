/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 * 
 * Creates terrain mesh with splat-mapping for heightmap, biomes, and water mask.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Scene,
  Vector3,
  Color3,
} from '@babylonjs/core';

export class TerrainRenderer {
  private scene: Scene;
  private width: number;
  private height: number;
  private mesh: any | null = null;
  
  constructor(scene: Scene, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
  }

  /**
   * Create terrain mesh with splat-mapping support.
   */
  createTerrain(): void {
    // Create the base terrain mesh as a ground plane using Babylon.js primitives
    const positions: Float32Array = new Float32Array(this.width * this.height * 3);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = (y * this.width + x) * 3;
        
        // Base terrain position at sea level (height=0)
        positions[index] = x;           // X coordinate
        positions[index + 1] = y;       // Y coordinate
        positions[index + 2] = 0.0;     // Z height (starts flat, will be modified)
      }
    }

    // Create a flat ground plane as placeholder - splat-mapping will add height later
    this.mesh = MeshBuilder.CreateGround('terrain', { width: this.width, depth: this.height }, this.scene);

    // Create default material for now - we'll use splat-mapping later
    const material = new StandardMaterial('terrainMat', this.scene);
    
    // Default terrain color - grassy green
    material.diffuseColor = new Color3(0.3, 0.7, 0.2);
    
    this.mesh.material = material;

    // Set position to origin for now (will be updated when splat-mapping is ready)
    this.mesh.position = new Vector3(this.width / 2 - 1, 0, this.height / 2 - 1);
    this.mesh.rotation.y = Math.PI / 2; // Rotate so X axis aligns with map coordinates
  }

  getMesh(): any | null {
    return this.mesh;
  }
}