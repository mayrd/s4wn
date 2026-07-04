/**
 * S4WN Babylon.js/TypeScript - Building Mesh Renderer
 * 
 * Creates building models from OBJ files using Babylon.js.
 */

import {
  Scene,
  StandardMaterial,
  SceneLoader,
} from '@babylonjs/core';
import '@babylonjs/loaders';

export class BuildingMesh {
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create a building model by loading an OBJ file.
   */
  async createBuilding(
    kind: string,
    x: number,
    y: number,
    _width: number,
    _height: number,
    _depth: number,
    material: StandardMaterial | null = null
  ): Promise<any> {
    try {
      // Load the OBJ file from assets/models/
      const result = await SceneLoader.ImportMeshAsync('', 'assets/models/', `${kind}.obj`, this.scene);
      
      const root = result.meshes[0];
      root.position.set(x, 0, y); // Assuming Y is up in Babylon, but map uses Y as depth? 
      // Wait, in main.ts: map.createBuilding(b.kind, b.x, b.y)
      // In TerrainRenderer: positions[index] = x; positions[index+1] = y; positions[index+2] = 0.0;
      // This means X is width, Y is depth, Z is height.
      // So for building: x is X, y is Z.
      root.position.set(x, 0, y);

       if (material) {
         result.meshes.forEach((m) => (m.material = material));
       }

      return root;
    } catch (error) {
      console.error(`Failed to load building model for kind: ${kind}`, error);
      return null;
    }
  }
}
