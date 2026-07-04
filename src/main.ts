/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 *
 * Migrated from Rust WASM engine.
 */

import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color4,
} from '@babylonjs/core';
import { Map } from './game/Map';
import { TerrainRenderer } from './rendering/TerrainRenderer';

class GameApp {
  engine!: Engine;
  scene!: Scene;
  canvas!: HTMLCanvasElement;
  map!: Map;
  terrainRenderer!: TerrainRenderer;

  async initialize(): Promise<void> {
    // Create canvas
    this.canvas = document.createElement('canvas');
    document.getElementById('game-container')?.appendChild(this.canvas);

    // Create Babylon.js engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0, 0, 0, 1);

    // Setup camera (orbital - matching Rust implementation)
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4, // alpha (azimuth) - 45 degrees
      Math.PI / 6, // beta (elevation) - 30.264 degrees
      20, // radius (distance)
      new Vector3(0, 0, 0), // target
      this.scene
    );
    camera.attachControl(this.canvas, true);
    camera.wheelPrecision = 20;
    camera.minZ = 0.1;

    // Add lights
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.7;

    const dirLight = new DirectionalLight(
      'sun',
      new Vector3(-1, -1, -1),
      this.scene
    );
    dirLight.intensity = 0.5;

    // Initialize map and terrain
    this.map = new Map(64, 64);
    this.terrainRenderer = new TerrainRenderer(this.map, this.scene);
    this.terrainRenderer.createTerrainMesh();

    // Start render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    console.log('S4WN Babylon.js initialized');
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.initialize();
});