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
    // Create a hemispheric light for basic ambient lighting to avoid UBO issues
    // that often occur with DirectionalLight in certain environments
    const ambientLight = new (require('@babylonjs/core').HemisphericLight)('ambientLight', new Vector3(0, 1, 0), this.scene);
    ambientLight.intensity = 0.7;

    // We'll try a very simple DirectionalLight without a ShadowGenerator first
    // to see if the 'trackUbosInFrame' error is caused by the light itself or the generator.
    const light = new DirectionalLight('dirLight', new Vector3(-1, -2, -1), this.scene);
    light.position = new Vector3(20, 40, 20);
    light.intensity = 0.5;

    // ShadowGenerator is disabled temporarily to resolve 'trackUbosInFrame' runtime error
    // this.shadowGenerator = new ShadowGenerator(1024, light, this.scene);
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
