/**
 * S4WN Babylon.js/TypeScript - Shadow Pipeline
 * 
 * Handles ground-plane shadows.
 */

import {
  Scene,
  DirectionalLight,
  ShadowGenerator,
  Vector3,
} from '@babylonjs/core';

export class ShadowPipeline {
  private scene: Scene;
  private shadowGenerator: ShadowGenerator | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialize shadows in the scene.
   */
  init(): void {
    // Create a directional light for shadows
    const light = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this.scene);
    light.position = new Vector3(20, 40, 20);
    light.intensity = 0.8;

    // Initialize ShadowGenerator
    // @ts-ignore
    this.shadowGenerator = new ShadowGenerator(1024, light, this.scene);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurScale = 2;
  }

  /**
   * Add a mesh to the shadow generator.
   */
  addShadowCaster(mesh: any): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.addShadowCaster(mesh);
    }
  }

  dispose(): void {
    if (this.shadowGenerator) {
      this.shadowGenerator.dispose();
    }
  }
}
