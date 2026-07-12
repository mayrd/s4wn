/**
 * S4WN Babylon.js/TypeScript - Game Application
 * 
 * Encapsulates the initialization and lifecycle of the Babylon.js application.
 */

import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  Vector3, 
  Color4 
} from '@babylonjs/core';

import { Map as GameMap } from './game/Map';
import { GameLoop } from './game/GameLoop';
import { TerrainRenderer } from './rendering/TerrainRenderer';
import { BuildingMesh } from './rendering/BuildingMesh';
import { UIManager } from './ui/UIManager';
import { ShadowPipeline } from './rendering/pipelines/ShadowPipeline';
import { ParticleSystem } from './game/particles/ParticleSystem';
import { HUD } from './ui/HUD';
import { DebugPanel } from './ui/panels/DebugPanel';
import { soundManager } from './audio/SoundManager';
import { TouchCameraController } from './input/TouchCameraController';
import { BuildingType } from './economy/types';

export class GameApp {
  public engine!: Engine;
  public scene!: Scene;
  public map!: GameMap;
  public gameLoop!: GameLoop;
  public terrainRenderer!: TerrainRenderer;
  public waterRenderer: any;
  public buildingRenderer!: BuildingMesh;
  public shadowPipeline!: ShadowPipeline;
  public particleSystem!: ParticleSystem;
  public touchController!: TouchCameraController;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id ${canvasId} not found`);
    }

    this.initEngine(canvas);
    this.initSystems();
    this.initRendering();
    this.initCamera();
    this.initLoop();
  }

  private initEngine(canvas: HTMLCanvasElement): void {
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    // Sky blue background
    this.scene.clearColor = new Color4(0.5, 0.7, 0.9, 1.0);
  }

  private initSystems(): void {
    const MAP_WIDTH = 100;
    const MAP_HEIGHT = 100;
    this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
    this.gameLoop = new GameLoop(this.map);
    new UIManager(this.gameLoop);

    // Initialize sound system with default game sounds
    soundManager.generateDefaults();

    window.addEventListener('game-start', () => {
        this.gameLoop.state.isPaused = false;
        new HUD(this.gameLoop);
        new DebugPanel(document, this.engine, this.gameLoop);
    });
  }

  private initRendering(): void {
    // Create terrain first - it needs to exist before the render loop starts
    this.terrainRenderer = new TerrainRenderer(this.scene, this.map);
    this.terrainRenderer.createGround(this.map.width, this.map.height);
    this.terrainRenderer.loadTerrainTextures(this.map);

    this.map.setAllVisible();

    this.waterRenderer = { dispose: () => {}, getMesh: () => null } as any;

    this.shadowPipeline = new ShadowPipeline(this.scene);
    this.shadowPipeline.init();

    const terrainMesh = this.terrainRenderer.getMesh();
    if (terrainMesh) {
      this.shadowPipeline.addShadowCaster(terrainMesh);
    }

    this.buildingRenderer = new BuildingMesh(this.scene);
    const buildingData: Array<{ kind: string; x: number; y: number }> = [
        { kind: 'castle', x: 50, y: 50 },
    ];

    (async () => {
        for (const b of buildingData) {
            const kind: BuildingType = b.kind === 'castle' ? BuildingType.Castle : (BuildingType as any)[b.kind];
            const buildingMesh = await this.buildingRenderer.createBuilding(b.kind, b.x, b.y, 2, 2, 2);
            if (buildingMesh) {
                this.gameLoop.economy.tryPlaceBuilding(kind, b.x, b.y, this.map, 0);
                this.shadowPipeline.addShadowCaster(buildingMesh);
            }
        }
        console.log('🏰 Building loaded');
    })();

    this.particleSystem = new ParticleSystem(this.scene);
  }

  private initCamera(): void {
    // Isometric camera: alpha=45° azimuth, beta=30.264° elevation (classic Siedler 4 view)
    const camera = new ArcRotateCamera('camera', Math.PI / 4, 0.528, 70, Vector3.Zero(), this.scene);
    camera.setTarget(new Vector3(50, 0, 50));
    camera.lowerRadiusLimit = 10;
    camera.upperRadiusLimit = 200;
    this.scene.activeCamera = camera;

    // Initialize view culler to match camera target
    this.gameLoop.viewCuller.setCenter(50, 50);

    this.touchController = new TouchCameraController(camera, (x, y) => {
      this.gameLoop.viewCuller.setCenter(x, y);
    });
  }

  private initLoop(): void {
    this.engine.runRenderLoop(() => {
        const dt = this.engine.getDeltaTime() / 1000;
        this.gameLoop.update(dt);
        this.particleSystem.update(dt);
        this.scene.render();
    });
  }

  public dispose(): void {
    this.touchController.dispose();
    this.waterRenderer.dispose();
    this.shadowPipeline.dispose();
    this.particleSystem.dispose();
    this.engine.dispose();
    soundManager.dispose();
  }
}
