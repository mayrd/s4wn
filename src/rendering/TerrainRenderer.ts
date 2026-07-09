/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 * 
 * Creates terrain mesh — flat green ground plane with procedural heightmap.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';

export class TerrainRenderer {
  private scene: Scene;
  private width: number;
  private height: number;
  private mesh: any | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.width = map.width;
    this.height = map.height;
  }

  createTerrain(): void {
    // Use simple CreateGround — flat plane, no heightmap complexity
    this.mesh = MeshBuilder.CreateGround('terrain', {
      width: this.width,
      height: this.height,
      subdivisions: 1,  // Single quad — no need for vertex density
      updatable: false,
    }, this.scene);

    // Position: center of the map
    this.mesh.position = new Vector3(this.width / 2, 0, this.height / 2);

    // Bright material — emissive bypasses lighting entirely
    const material = new StandardMaterial('terrainMat', this.scene);
    material.diffuseColor = new Color3(0.25, 0.85, 0.25);   // Grass green
    material.emissiveColor = new Color3(0.1, 0.4, 0.1);      // Self-illuminating (no lights needed)
    material.specularColor = new Color3(0, 0, 0);
    material.backFaceCulling = false;  // Visible from below too
    this.mesh.material = material;

    console.log('Terrain created:', {
      width: this.width,
      height: this.height,
      position: this.mesh.position,
      vertices: this.mesh.getTotalVertices(),
    });

    // Debug marker: bright red sphere at map center
    const marker = MeshBuilder.CreateSphere('debug-marker', { diameter: 1 }, this.scene);
    marker.position = new Vector3(this.width / 2, 5, this.height / 2);
    const markerMat = new StandardMaterial('markerMat', this.scene);
    markerMat.emissiveColor = new Color3(1, 0, 0);
    marker.material = markerMat;
  }

  getMesh(): any | null {
    return this.mesh;
  }
}
