/**
 * S4WN Babylon.js/TypeScript - Terrain Renderer
 *
 * Creates a flat green ground plane for the game map.
 * Full splat-map terrain texturing is deferred until a proper
 * multi-texture shader replaces the atlas approach (which exceeded
 * WebGL MAX_TEXTURE_SIZE at 12,288×12,288px).
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

  /** Create a flat green ground plane (instant, never fails). */
  createGround(): void {
    const cx = this.width / 2;
    const cz = this.height / 2;
    this.terrainMesh = MeshBuilder.CreateGround('terrain', {
      width: this.width,
      height: this.height,
      subdivisions: 1,
      updatable: false,
    }, this.scene);
    this.terrainMesh.position = new Vector3(cx, 0, cz);

    const mat = new StandardMaterial('terrainMat', this.scene);
    mat.diffuseColor = new Color3(0.25, 0.70, 0.25);
    mat.emissiveColor = new Color3(0.05, 0.20, 0.05);
    mat.specularColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    this.terrainMesh.material = mat;
    this.terrainMesh.receiveShadows = true;

    console.log(`🌍 Terrain: green ground plane ${this.width}×${this.height} at (${cx}, 0, ${cz})`);
  }

  getMesh(): any | null {
    return this.terrainMesh;
  }
}
