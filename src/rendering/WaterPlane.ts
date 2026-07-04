/**
 * S4WN Babylon.js/TypeScript - Water Plane Renderer
 * 
 * Simple water plane with basic wave simulation.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Scene,
  Vector3,
} from '@babylonjs/core';

export class WaterPlane {
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
   * Create water plane.
   */
  createWaterPlane(): void {
    // Create a simple flat water surface for now (wave animation will be added later)
    const positions: Float32Array = new Float32Array(this.width * this.height * 3);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = (y * this.width + x) * 3;
        
        // Water surface at height -1.5 (slightly below terrain base)
        positions[index]     = x;           // X coordinate
        positions[index + 1] = y;           // Y coordinate
        positions[index + 2] = -1.5;       // Z height (water level)
      }
    }

    this.mesh = MeshBuilder.CreateFromMesh(
      'water',
      new Texture('waterTexture', null),
      { vertices: positions },
      this.scene
    );

    const material = new StandardMaterial('waterMat', this.scene);
    
    // Blue water color with some transparency for reflection effect
    material.diffuseColor.set(0.2, 0.4, 0.8, 0.7);
    material.alpha = 0.6;
    
    this.mesh.material = material;

    // Set position to origin (will be updated when splat-mapping is ready)
    this.mesh.position = new Vector3(this.width / 2 - 1, 0, this.height / 2 - 1);
    this.mesh.rotation.y = Math.PI / 2;
  }

  getMesh(): any | null {
    return this.mesh;
  }
}