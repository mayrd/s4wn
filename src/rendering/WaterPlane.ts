/**
 * S4WN Babylon.js/TypeScript - Water Plane Renderer
 * 
 * Simple water plane with basic wave simulation.
 */

import {
  MeshBuilder,
  StandardMaterial,
  Texture,
  Scene,
  MirrorTexture,
  Color3,
} from '@babylonjs/core';

export class WaterPlane {
  private scene: Scene;
  private width: number;
  private height: number;
  private mesh: any | null = null;
  private mirrorTexture: MirrorTexture | null = null;

  constructor(scene: Scene, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
  }

  /**
   * Create water plane with reflections.
   */
  createWaterPlane(): void {
    // Create a simple flat plane for water
    this.mesh = MeshBuilder.CreateGround('water', { 
      width: this.width, 
      height: this.height 
    }, this.scene);

    // Set water level slightly below terrain base
    this.mesh.position.y = -0.5; 

    // Create Mirror Texture for reflections
        this.mirrorTexture = new MirrorTexture('waterMirror', 512, this.scene);
        // Removed unsupported clipPlane property; MirrorTexture uses mirrorPlane for clipping if needed.

    const material = new StandardMaterial('waterMat', this.scene);
    
    // Base water color
    material.diffuseColor = new Color3(0.1, 0.3, 0.6);
    material.specularColor = new Color3(1, 1, 1);
    
    // Use mirror texture as the reflection map
    material.reflectionTexture = this.mirrorTexture;
    
    // Add normal map for water ripples
    // Vite publicDir: 'assets' serves textures at /textures/
    const bumpTexture = new Texture('/textures/water_normal.png', this.scene);
    bumpTexture.uScale = 10;
    bumpTexture.vScale = 10;
    material.bumpTexture = bumpTexture;

    material.alpha = 0.8;

    this.mesh.material = material;
  }

  /**
   * Update water animation (ripples)
   */
  update(dt: number): void {
    if (this.mesh && this.mesh.material) {
      const mat = this.mesh.material as StandardMaterial;
      if (mat.bumpTexture instanceof Texture) {
        // Slowly shift the normal map to simulate flowing water
        mat.bumpTexture.uOffset += dt * 0.01;
        mat.bumpTexture.vOffset += dt * 0.01;
      }
    }
  }

  getMesh(): any | null {
    return this.mesh;
  }

  dispose(): void {
    if (this.mesh) this.mesh.dispose();
    if (this.mirrorTexture) this.mirrorTexture.dispose();
  }
}
