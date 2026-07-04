/**
 * S4WN Babylon.js/TypeScript - Building Mesh Renderer
 * 
 * Creates building models from OBJ files using Babylon.js.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Scene,
} from '@babylonjs/core';

export class BuildingMesh {
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create a simple building model using Babylon.js primitives.
   * This replaces the OBJ file loading with procedural generation.
   */
  createBuilding(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number,
    material: StandardMaterial | null = null
  ): any {
    // Create a box for the building base
    const mesh = MeshBuilder.CreateBox(
      name,
      { 
        width: width, 
        height: height, 
        depth: depth,
        subdivisions: 0
      },
      this.scene
    );

    if (!material) {
      // Default building material - gray/brown color
      const mat = new StandardMaterial('buildingMat', this.scene);
      
      // Use different colors based on building type (name hash)
      const hash = Math.abs(name.charCodeAt(0)) % 3;
      switch(hash) {
        case 0:
          mat.diffuseColor.set(0.8, 0.7, 0.5); // Brown - residential
          break;
        case 1:
          mat.diffuseColor.set(0.6, 0.4, 0.2); // Dark brown - commercial
          break;
        case 2:
          mat.diffuseColor.set(0.9, 0.85, 0.7); // Light tan - office
          break;
      }
      
      mesh.material = mat;
    }

    return mesh;
  }
}