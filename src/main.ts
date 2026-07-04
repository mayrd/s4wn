/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 *
 * Complete game initialization with full game loop.
 * All Rust/WASM functionality replaced with TypeScript.
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
import { Map as GameMap } from './game/Map';
import { GameLoop } from './game/GameLoop';
import { TerrainRenderer } from './rendering/TerrainRenderer';
import { UnitKind } from './game/types';
import { BuildingType } from './economy/types';

class GameApp {
  engine!: Engine;
  scene!: Scene;
  canvas!: HTMLCanvasElement;
  map!: GameMap;
  gameLoop!: GameLoop;
  terrainRenderer!: TerrainRenderer;
  camera!: ArcRotateCamera;

  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  async initialize(): Promise<void> {
    // Create canvas
    this.canvas = document.createElement('canvas');
    const container = document.getElementById('game-container');
    if (!container) {
      console.error('game-container not found');
      return;
    }
    container.appendChild(this.canvas);

    // Create Babylon.js engine
    this.engine = new Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.4, 0.6, 0.8, 1); // Sky blue

    // Setup camera (orbital - matching Rust implementation)
    this.camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4, // alpha (azimuth) - 45 degrees
      Math.PI / 6, // beta (elevation) - 30.264 degrees
      20, // radius (distance)
      new Vector3(0, 0, 0), // target
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    this.camera.wheelPrecision = 20;
    this.camera.minZ = 0.1;

    // Add lights
    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 0.7;

    const dirLight = new DirectionalLight(
      'sun',
      new Vector3(-1, -1, -1),
      this.scene
    );
    dirLight.intensity = 0.5;

    // Initialize map and game loop
    this.map = new GameMap(64, 64);
    this.map.setAllVisible(); // Full map visible for now
    this.gameLoop = new GameLoop(this.map);

    // Create terrain
    this.terrainRenderer = new TerrainRenderer(this.map, this.scene);
    this.terrainRenderer.createTerrainMesh();

    // Place some demo buildings
    this.setupDemoBuildings();

    // Spawn some demo units
    this.setupDemoUnits();

    // Start render loop
    this.lastTime = performance.now();
    this.engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;

      // Track FPS
      this.frameCount++;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 1.0) {
        const fps = this.frameCount;
        this.frameCount = 0;
        this.fpsTimer -= 1.0;
        console.debug(`FPS: ${fps}`);
      }

      // Update game loop
      this.gameLoop.update(dt);

      // Render scene
      this.scene.render();
    });

    // Handle resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    console.log('S4WN Babylon.js initialized');
  }

  private setupDemoBuildings(): void {
    // Place a castle at center
    this.gameLoop.economy.tryPlaceBuilding(
      BuildingType.Castle,
      32, 32,
      this.map
    );

    // Place some production buildings nearby
    const demoBuildings: Array<{ kind: BuildingType; x: number; y: number }> = [
      { kind: BuildingType.Sawmill, x: 30, y: 30 },
      { kind: BuildingType.Farm, x: 34, y: 30 },
      { kind: BuildingType.Woodcutter, x: 30, y: 34 },
      { kind: BuildingType.Fisherman, x: 34, y: 34 },
    ];

    for (const b of demoBuildings) {
      this.gameLoop.economy.tryPlaceBuilding(b.kind, b.x, b.y, this.map);
    }
  }

  private setupDemoUnits(): void {
    // Spawn some settlers
    for (let i = 0; i < 5; i++) {
      this.gameLoop.unitManager.spawnUnit(
        UnitKind.Settler,
        30 + Math.random() * 4,
        30 + Math.random() * 4
      );
    }

    // Spawn some soldiers
    for (let i = 0; i < 3; i++) {
      this.gameLoop.unitManager.spawnUnit(
        UnitKind.Swordsman,
        28 + Math.random() * 2,
        28 + Math.random() * 2
      );
    }
  }
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.initialize();
});