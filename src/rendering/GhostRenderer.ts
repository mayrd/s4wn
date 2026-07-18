/**
 * S4WN - GhostRenderer
 * Renders a semi-transparent ghost building following the cursor.
 */
import { Scene, Mesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { BuildingMesh } from './BuildingMesh';

export class GhostRenderer {
  private scene: Scene;
  private buildingMeshRenderer: BuildingMesh;
  private ghost: Mesh | null = null;
  private material: StandardMaterial;

  constructor(scene: Scene, buildingMeshRenderer: BuildingMesh) {
    this.scene = scene;
    this.buildingMeshRenderer = buildingMeshRenderer;
    this.material = new StandardMaterial('ghostMat', this.scene);
    this.material.alpha = 0.5;
    this.material.diffuseColor = new Color3(0.5, 0.5, 1.0);
    this.material.backFaceCulling = false;
  }

  async show(kind: string, x: number, y: number, nation: number): Promise<void> {
    this.hide();
    this.ghost = await this.buildingMeshRenderer.createBuilding(kind, x, y, 2, 2, 2, this.material, nation);
  }

  update(x: number, y: number): void {
    if (this.ghost) {
      this.ghost.position.set(x, 0, y);
    }
  }

  hide(): void {
    if (this.ghost) {
      this.ghost.dispose();
      this.ghost = null;
    }
  }
}
