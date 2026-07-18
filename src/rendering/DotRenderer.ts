/**
 * S4WN - DotRenderer
 * Renders Green/Red feasibility indicators.
 */
import { Scene, Mesh, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

export class DotRenderer {
  private scene: Scene;
  private dot: Mesh;
  private greenMat: StandardMaterial;
  private redMat: StandardMaterial;

  constructor(scene: Scene) {
    this.scene = scene;
    this.dot = MeshBuilder.CreateDisc('placementDot', { radius: 0.3 }, this.scene);
    this.dot.rotation.x = Math.PI / 2;
    this.dot.isVisible = false;

    this.greenMat = new StandardMaterial('greenDot', this.scene);
    this.greenMat.diffuseColor = Color3.Green();
    this.redMat = new StandardMaterial('redDot', this.scene);
    this.redMat.diffuseColor = Color3.Red();
  }

  show(x: number, y: number, valid: boolean): void {
    this.dot.position.set(x + 0.5, 0.05, y + 0.5);
    this.dot.material = valid ? this.greenMat : this.redMat;
    this.dot.isVisible = true;
  }

  hide(): void {
    this.dot.isVisible = false;
  }
}
