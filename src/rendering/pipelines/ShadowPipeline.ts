/**
 * S4WN Babylon.js/TypeScript - Shadow Pipeline
 * 
 * Handles ground-plane shadows.
 */

import {
  Scene,
  DirectionalLight,
  ShadowGenerator,
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
    const light = new DirectionalLight('dirLight', { x: -1, y: -2, z: -1 }, this.scene);
    light.position = { x: 20, y: 40, z: 20 };
    light.intensity = 0.8;

    // Initialize ShadowGenerator
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
