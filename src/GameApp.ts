/**
 * S4WN Babylon.js/TypeScript - Game Application
 *
 * Encapsulates the initialization and lifecycle of the Babylon.js application.
 *
 * IMPORTANT: This is the "heavy" loader. It is only instantiated once the user
 * actually starts or loads a game (i.e. when the canvas/engine is needed).
 * The splash screen + main menu are handled by the lightweight UIManager so
 * that the initial page load does not pull in the engine, map, textures, etc.
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
import { UIManager, StartMode } from './ui/UIManager';
import { ShadowPipeline } from './rendering/pipelines/ShadowPipeline';
import { ParticleSystem } from './game/particles/ParticleSystem';
import { GridRenderer } from './rendering/GridRenderer';
import { HUD } from './ui/HUD';
import { DebugPanel } from './ui/panels/DebugPanel';
import { ObjectExplorer } from './ui/explorer/ObjectExplorer';
import { MapEditor } from './ui/editor/MapEditor';
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
  public gridRenderer!: GridRenderer;
  public ui!: UIManager;
  public objectExplorer!: ObjectExplorer;
  public mapEditor!: MapEditor;

  private mode: StartMode;
  private onExplorerToggle!: () => void;
  private onEditorToggle!: () => void;

  /** Promise that resolves when critical assets (terrain textures) are loaded. */
  public readyPromise: Promise<void>;

  constructor(canvasId: string, mode: StartMode = 'new') {
    this.mode = mode;

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id ${canvasId} not found`);
    }

    this.initEngine(canvas);
    this.initSystems();
    // Start async initialization - render loop starts immediately but loading screen
    // stays visible until readyPromise resolves (terrain textures loaded)
    this.readyPromise = this.initRenderingAsync().catch((err) => {
      console.error('GameApp initialization failed:', err);
    });
    this.initCamera();
    this.initUI();
    this.initLoop();
  }

  private async initRenderingAsync(): Promise<void> {
    await this.initRendering();
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
    // Tutorial mode uses a dedicated, gentler island map.
    const mapKind = this.mode === 'tutorial' ? 'tutorial' : 'demo';
    this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT, mapKind);
    this.gameLoop = new GameLoop(this.map);

    // If a saved game was requested, restore it BEFORE building the renderer
    // (the terrain mesh is generated from the restored map).
    if (this.mode === 'load') {
      if (!this.gameLoop.load()) {
        console.warn('No save found for load mode — starting a new game instead.');
        this.mode = 'new';
      }
    }

    // Lightweight UI manager (no engine dependency) used for save handling.
    this.ui = new UIManager(this.gameLoop);

    // Object explorer tool — created now that a GameLoop exists.
    this.objectExplorer = new ObjectExplorer(this.gameLoop);
    this.ui.setObjectExplorer(this.objectExplorer);

    // Subscribe ObjectExplorer to game ticks so runtime state stays live
    this.gameLoop.onTick(() => this.objectExplorer.update());

    // Initialize sound system on first user gesture (required by browser policies)
    const initAudioOnGesture = () => {
      soundManager.generateDefaults();
      document.removeEventListener('click', initAudioOnGesture);
      document.removeEventListener('keydown', initAudioOnGesture);
    };
    document.addEventListener('click', initAudioOnGesture);
    document.addEventListener('keydown', initAudioOnGesture);

    // Forward menu-driven toggles to the in-game tools.
    this.onExplorerToggle = () => this.objectExplorer.toggle();
    this.onEditorToggle = () => this.mapEditor?.toggle();
    window.addEventListener('ui-explorer-toggle', this.onExplorerToggle);
    window.addEventListener('ui-editor-toggle', this.onEditorToggle);
  }

  private async initRendering(): Promise<void> {
    // Create terrain first - it needs to exist before the render loop starts
    this.terrainRenderer = new TerrainRenderer(this.scene, this.map);
    this.terrainRenderer.setProgressCallback((msg, pct) => {
      this.ui.updateProgress(msg, pct);
    });
    this.terrainRenderer.createGround(this.map.width, this.map.height);
    const tm = this.terrainRenderer.getMesh();
    console.log(
      `🎨 Terrain mesh created: exists=${!!tm}, position=(${tm?.position?.x ?? 0}, ${tm?.position?.y ?? 0}, ${tm?.position?.z ?? 0})`
    );
    this.ui.updateProgress('Loading terrain textures...', 15);
    // Wait for textures to load before proceeding - this prevents the canvas
    // from being unresponsive after showing the loading screen
    try {
      await this.terrainRenderer.loadTerrainTextures(this.map);
      console.log('✅ Terrain textures loaded successfully');
    } catch (e) {
      console.error('❌ Terrain texture loading failed:', e);
    }

    // Create grid overlay
    this.gridRenderer = new GridRenderer(this.scene, this.map.width, this.map.height);
    this.gridRenderer.createGrid();

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

    // Building loading happens in background - non-critical for initial render
    this.loadBuildings(buildingData);

    // Map editor needs the scene + terrain renderer.
    // Note: particleSystem already created in initLoop() for immediate render availability
    this.mapEditor = new MapEditor(this.ui, this.gameLoop, this.scene, this.terrainRenderer);
  }

  private async loadBuildings(buildingData: Array<{ kind: string; x: number; y: number }>): Promise<void> {
    for (const b of buildingData) {
      const kind: BuildingType =
        b.kind === 'castle' ? BuildingType.Castle : (BuildingType as any)[b.kind];
      const buildingMesh = await this.buildingRenderer.createBuilding(b.kind, b.x, b.y, 2, 2, 2);
      if (buildingMesh) {
        this.gameLoop.economy.tryPlaceBuilding(kind, b.x, b.y, this.map, 0);
        this.shadowPipeline.addShadowCaster(buildingMesh);
      }
    }
    console.log('🏰 Building loaded');
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

  /** Wire HUD + debug panel now that the game (and canvas) exist. */
  private initUI(): void {
    this.gameLoop.state.isPaused = false;
    new HUD(this.gameLoop);
    const debugPanel = new DebugPanel(document, this.engine, this.gameLoop, this.scene);
    // Wire renderers to debug panel for toggling
    debugPanel.setGridRenderer(this.gridRenderer);
    debugPanel.setTerrainRenderer(this.terrainRenderer);
    // Expose debug panel for console access
    (window as any).debugPanel = debugPanel;
  }

  private initLoop(): void {
    // Initialize these early to avoid race condition with async initRendering
    this.particleSystem = new ParticleSystem(this.scene);
    this.waterRenderer = { dispose: () => {}, getMesh: () => null } as any;
    
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      this.gameLoop.update(dt);
      if (this.particleSystem) {
        this.particleSystem.update(dt);
      }
      this.scene.render();
    });
  }

  public dispose(): void {
    window.removeEventListener('ui-explorer-toggle', this.onExplorerToggle);
    window.removeEventListener('ui-editor-toggle', this.onEditorToggle);
    this.mapEditor?.hide();
    this.touchController.dispose?.();
    this.waterRenderer?.dispose?.();
    this.shadowPipeline.dispose?.();
    this.particleSystem.dispose?.();
    if (this.gridRenderer) {
      this.gridRenderer.dispose();
    }
    this.engine.dispose();
    soundManager.dispose();
  }
}