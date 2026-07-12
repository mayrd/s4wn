/**
 * S4WN Grid Renderer — Creates a tile grid overlay for the terrain.
 *
 * Renders grid lines on top of the terrain to help visualize tile boundaries.
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  LinesMesh,
} from '@babylonjs/core';

export class GridRenderer {
  private scene: Scene;
  private gridMesh: LinesMesh | null = null;
  private mapWidth: number;
  private mapHeight: number;

  constructor(scene: Scene, width: number, height: number) {
    this.scene = scene;
    this.mapWidth = width;
    this.mapHeight = height;
  }

  /** Create the grid lines mesh */
  createGrid(): void {
    const positions: Vector3[] = [];

    // Create vertical lines (x constant, z varies)
    for (let x = 0; x <= this.mapWidth; x++) {
      positions.push(new Vector3(x, 0.01, 0));
      positions.push(new Vector3(x, 0.01, this.mapHeight));
    }

    // Create horizontal lines (z constant, x varies)
    for (let z = 0; z <= this.mapHeight; z++) {
      positions.push(new Vector3(0, 0.01, z));
      positions.push(new Vector3(this.mapWidth, 0.01, z));
    }

    this.gridMesh = MeshBuilder.CreateLines('grid', {
      points: positions,
      instance: null,
      updatable: false,
    }, this.scene);

    const mat = new StandardMaterial('gridMat', this.scene);
    mat.emissiveColor = new Color3(0, 1, 0);
    this.gridMesh.material = mat;
    this.gridMesh.isVisible = true;

    console.log(`📐 Grid created: ${this.mapWidth}×${this.mapHeight}, ${positions.length / 2} lines`);
  }

  /** Toggle grid visibility */
  setVisible(visible: boolean): void {
    if (this.gridMesh) {
      this.gridMesh.isVisible = visible;
    }
  }

  /** Get the grid mesh for external control */
  getMesh(): LinesMesh | null {
    return this.gridMesh;
  }

  /** Dispose the grid */
  dispose(): void {
    if (this.gridMesh) {
      this.gridMesh.dispose();
      this.gridMesh = null;
    }
  }
}