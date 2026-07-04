/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Creates terrain mesh from Map data with height displacement.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Scene,
  VertexBuffer,
  Mesh,
} from '@babylonjs/core';
import { Map } from '../game/Map';

export class TerrainRenderer {
  private map: Map;
  private scene: Scene;
  private terrainMesh: Mesh | null = null;

  constructor(map: Map, scene: Scene) {
    this.map = map;
    this.scene = scene;
  }

  createTerrainMesh(): void {
    const width = this.map.width;
    const height = this.map.height;

    // Create ground mesh (isometric grid will be approximated with ground mesh)
    // Each tile is 1x1 unit in Babylon.js world
    const ground = MeshBuilder.CreateGround(
      'terrain',
      { width, height, subdivisions: Math.max(1, Math.min(width, height) - 1) },
      this.scene
    );

    // Apply height displacement based on elevation
    this.applyHeightDisplacement(ground);

    // Create material with terrain texture
    const material = new StandardMaterial('terrainMat', this.scene);
    material.diffuseTexture = new Texture(
      '/assets/textures/terrain_atlas.png',
      this.scene
    );
    ground.material = material;

    this.terrainMesh = ground;
  }

  private applyHeightDisplacement(mesh: Mesh): void {
    // Get vertices and modify Y based on elevation
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions) return;

    for (let i = 0; i < positions.length; i += 3) {
      // x, y, z positions
      const x = positions[i];
      const z = positions[i + 2];
      
      // Convert to tile coordinates
      const tileX = Math.floor(x + this.map.width / 2);
      const tileZ = Math.floor(z + this.map.height / 2);
      
      // Clamp to map bounds
      if (tileX >= 0 && tileX < this.map.width && tileZ >= 0 && tileZ < this.map.height) {
        const tile = this.map.get(tileX, tileZ);
        if (tile) {
          // Apply elevation (scale: 0.5 per Rust)
          positions[i + 1] = tile.elevation * 0.5;
        }
      }
    }

    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
  }

  getMesh(): Mesh | null {
    return this.terrainMesh;
  }
}