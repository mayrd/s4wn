/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Creates the terrain mesh for the game map.
 * Uses a flat ground plane with bright green material.
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
  private terrainMesh: any | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.width = map.width;
    this.height = map.height;
  }

  createTerrain(): void {
    // Simple flat ground plane — positioned at map center, y=0
    this.terrainMesh = MeshBuilder.CreateGround('terrain', {
      width: this.width,
      height: this.height,
      subdivisions: 1,
      updatable: false,
    }, this.scene);

    const cx = this.width / 2;
    const cz = this.height / 2;
    this.terrainMesh.position = new Vector3(cx, 0, cz);

    // Material — bright green, self-illuminating so lights aren't needed
    const mat = new StandardMaterial('terrainMat', this.scene);
    mat.diffuseColor = new Color3(0.25, 0.85, 0.25);
    mat.emissiveColor = new Color3(0.1, 0.4, 0.1);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    mat.wireframe = false;
    this.terrainMesh.material = mat;
    this.terrainMesh.isVisible = true;
    this.terrainMesh.receiveShadows = true;

    console.log('🌍 Terrain: ground plane', this.width, '×', this.height,
      'at', cx, 0, cz,
      'vertices:', this.terrainMesh.getTotalVertices?.() ?? '?');

    // Debug marker — bright red sphere hanging above center
    const marker = MeshBuilder.CreateSphere('debug-marker', { diameter: 1.5 }, this.scene);
    marker.position = new Vector3(cx, 5, cz);
    const markerMat = new StandardMaterial('markerMat', this.scene);
    markerMat.emissiveColor = new Color3(1, 0, 0);
    marker.material = markerMat;
    marker.isVisible = true;

    // Edge markers at each corner to confirm scale
    const corners = [
      [0, 0.5, 0], [this.width, 0.5, 0],
      [0, 0.5, this.height], [this.width, 0.5, this.height],
    ];
    corners.forEach(([x, y, z], i) => {
      const c = MeshBuilder.CreateSphere(`corner-${i}`, { diameter: 0.8 }, this.scene);
      c.position = new Vector3(x as number, y, z as number);
      const cm = new StandardMaterial(`cornerMat-${i}`, this.scene);
      cm.emissiveColor = new Color3(1, 1, 0); // Yellow
      c.material = cm;
    });
  }

  getMesh(): any | null {
    return this.terrainMesh;
  }
}
