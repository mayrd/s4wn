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
import { TerritoryOverlay } from './rendering/TerritoryOverlay';
import { BuildingMesh } from './rendering/BuildingMesh';
import { UIManager, StartMode } from './ui/UIManager';
import { ShadowPipeline } from './rendering/pipelines/ShadowPipeline';
import { ParticleSystem } from './game/particles/ParticleSystem';
import { GridRenderer } from './rendering/GridRenderer';
import { HUD } from './ui/HUD';
import { DebugPanel } from './ui/panels/DebugPanel';
import { MapEditor } from './ui/editor/MapEditor';
import { soundManager } from './audio/SoundManager';
import { TouchCameraController } from './input/TouchCameraController';
import { BuildingType } from './economy/types';
import { buildingName } from './economy/types';
import { NationType } from './game/Nation';
import { BuildingPlacement } from './ui/BuildingPlacement';
import { SupplyChainRenderer } from './rendering/SupplyChainRenderer';

export class GameApp {
  public engine!: Engine;
  public scene!: Scene;
  public map!: GameMap;
  public gameLoop!: GameLoop;
  public terrainRenderer!: TerrainRenderer;
  public territoryOverlay!: TerritoryOverlay;
  public waterRenderer: any;
  public buildingRenderer!: BuildingMesh;
  public shadowPipeline!: ShadowPipeline;
  public particleSystem!: ParticleSystem;
  public touchController!: TouchCameraController;
  public gridRenderer!: GridRenderer;
  public supplyChainRenderer!: SupplyChainRenderer;
  public ui!: UIManager;
  public mapEditor!: MapEditor;
  public buildingPlacement!: BuildingPlacement;

  private mode: StartMode;
  private onExplorerToggle!: () => void;
  private onEditorToggle!: () => void;
  private boundBuildingPlaced!: (e: Event) => void;

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

    // UI manager (no engine dependency) used for save handling + splash screen.
    // ObjectExplorer is already created by UIManager in standalone mode.
    this.ui = new UIManager(this.gameLoop);

    // Building placement UI — palette panel + "building-placed" event dispatch.
    // The HUD (including .hud-actions bar) is not yet in the DOM, so the toggle
    // button will attach to #ui-overlay as a fallback, but the event system and
    // scene picking/placement integration work immediately.
    this.buildingPlacement = new BuildingPlacement(
      this.gameLoop.economy,
      this.map,
      0, // ownerId = player 0
      this.engine.getRenderingCanvas() as HTMLCanvasElement,
    );
    this.boundBuildingPlaced = this.onBuildingPlaced.bind(this);
    window.addEventListener('building-placed', this.boundBuildingPlaced);

    // Subscribe territory overlay to game ticks so territory changes are reflected
    this.gameLoop.onTick(() => {
      if (this.territoryOverlay) {
        this.territoryOverlay.refresh();
      }
    });

    // Initialize sound system on first user gesture (required by browser policies)
    const initAudioOnGesture = () => {
      soundManager.generateDefaults();
      document.removeEventListener('click', initAudioOnGesture);
      document.removeEventListener('keydown', initAudioOnGesture);
    };
    document.addEventListener('click', initAudioOnGesture);
    document.removeEventListener('keydown', initAudioOnGesture);

    // Forward menu-driven toggles to the in-game tools.
    this.onExplorerToggle = () => this.ui.objectExplorer.toggle();
    this.onEditorToggle = () => this.mapEditor?.toggle();
    window.addEventListener('ui-explorer-toggle', this.onExplorerToggle);
    window.addEventListener('ui-editor-toggle', this.onEditorToggle);

    // Listen for building-placed events from BuildingPlacement UI
    window.addEventListener('building-placed', ((e: CustomEvent) => {
      const { kind, x, y } = e.detail;
      if (this.buildingRenderer) {
        const kindName = BuildingType[kind] || 'castle';
        this.buildingRenderer.createBuilding(kindName, x, y, 2, 2, 2).then(mesh => {
          if (mesh && this.shadowPipeline) {
            this.shadowPipeline.addShadowCaster(mesh);
          }
        });
      }
    }) as EventListener);
  }

  private async initRendering(): Promise<void> {
    // Step 1: Create terrain mesh
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

    // Step 2: Load terrain textures (async with progress)
    try {
      await this.terrainRenderer.loadTerrainTextures(this.map);
      console.log('✅ Terrain textures loaded successfully');
    } catch (e) {
      console.error('❌ Terrain texture loading failed:', e);
    }
    this.ui.updateProgress('Initializing systems...', 55);

    // Yield to UI thread before continuing with non-critical initialization
    await new Promise(resolve => setTimeout(resolve, 0));

    // Step 3: Create grid overlay
    this.gridRenderer = new GridRenderer(this.scene, this.map.width, this.map.height);
    this.gridRenderer.createGrid();
    this.ui.updateProgress('Setting up lights...', 60);

    // Step 4: Set visibility + shadows
    this.map.setAllVisible();

    this.shadowPipeline = new ShadowPipeline(this.scene);
    this.shadowPipeline.init();

    const terrainMesh = this.terrainRenderer.getMesh();
    if (terrainMesh) {
      this.shadowPipeline.addShadowCaster(terrainMesh);
    }

    // Create territory overlay (vertex-colored mesh above terrain)
    this.territoryOverlay = new TerritoryOverlay(this.scene, this.map);
    this.territoryOverlay.createOverlay(this.map.width, this.map.height);

    // Create supply chain renderer (producer → consumer lines with carrier dots)
    this.supplyChainRenderer = new SupplyChainRenderer(this.scene);
    const initialLinks = this.supplyChainRenderer.computeLinks(this.gameLoop.economy);
    this.supplyChainRenderer.refresh(initialLinks);

    this.ui.updateProgress('Loading buildings...', 65);

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));

    // Step 5: Buildings (async)
    this.buildingRenderer = new BuildingMesh(this.scene);
    const buildingData: Array<{ kind: string; x: number; y: number }> = [
      { kind: 'castle', x: 50, y: 50 },
    ];

    // Building loading happens in background - non-critical for initial render
    this.loadBuildings(buildingData);

    // Step 6: Map editor
    this.ui.updateProgress('Finalizing...', 85);
    this.mapEditor = new MapEditor(this.ui, this.gameLoop, this.scene, this.terrainRenderer);

    // Notify UI manager that game is ready so ObjectExplorer can connect
    // (if it hasn't already) and any pending panels can be opened.
    this.ui.onGameReady();

    this.ui.updateProgress('Ready!', 100);
  }

  private async loadBuildings(buildingData: Array<{ kind: string; x: number; y: number }>): Promise<void> {
    // Default nation for initial buildings: Romans (player nation)
    const playerNation = NationType.Romans;
    for (const b of buildingData) {
      const kind: BuildingType =
        b.kind === 'castle' ? BuildingType.Castle : (BuildingType as any)[b.kind];
      const buildingMesh = await this.buildingRenderer.createBuilding(b.kind, b.x, b.y, 2, 2, 2, null, playerNation);
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
    debugPanel.setTerritoryOverlay(this.territoryOverlay);
    debugPanel.setSupplyChainRenderer(this.supplyChainRenderer);
    // Expose debug panel for console access
    (window as any).debugPanel = debugPanel;
  }

  /**
   * Handle the 'building-placed' event from BuildingPlacement UI.
   * Creates a 3D mesh for the placed building and adds it to the shadow pipeline.
   */
  private onBuildingPlaced(e: Event): void {
    const detail = (e as CustomEvent).detail as {
      kind: BuildingType;
      x: number;
      y: number;
      building: any;
    };
    if (!detail || detail.kind === undefined) return;

    const kindName = buildingName(detail.kind);
    this.buildingRenderer.createBuilding(kindName, detail.x, detail.y, 2, 2, 2)
      .then((mesh: any) => {
        if (mesh) {
          this.shadowPipeline.addShadowCaster(mesh);
        }
      })
      .catch((err: any) => {
        console.warn(`Failed to create 3D mesh for building ${kindName}:`, err);
      });
  }

  private initLoop(): void {
    // Initialize these early to avoid race condition with async initRendering
    this.particleSystem = new ParticleSystem(this.scene);
    this.waterRenderer = { dispose: () => {}, getMesh: () => null } as any;
    
    let supplyChainRefreshTimer = 0;
    const SUPPLY_CHAIN_REFRESH_INTERVAL = 5; // seconds

    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      this.gameLoop.update(dt);
      if (this.particleSystem) {
        this.particleSystem.update(dt);
      }
      // Animate supply chain carrier dots
      if (this.supplyChainRenderer) {
        this.supplyChainRenderer.update(dt);
        // Periodically recompute supply links (buildings may be added/removed)
        supplyChainRefreshTimer += dt;
        if (supplyChainRefreshTimer >= SUPPLY_CHAIN_REFRESH_INTERVAL) {
          supplyChainRefreshTimer = 0;
          const links = this.supplyChainRenderer.computeLinks(this.gameLoop.economy);
          this.supplyChainRenderer.refresh(links);
        }
      }
      this.scene.render();
    });
  }

  public dispose(): void {
    window.removeEventListener('ui-explorer-toggle', this.onExplorerToggle);
    window.removeEventListener('ui-editor-toggle', this.onEditorToggle);
    window.removeEventListener('building-placed', this.boundBuildingPlaced);
    this.buildingPlacement?.dispose();
    this.mapEditor?.hide();
    this.touchController.dispose?.();
    this.waterRenderer?.dispose?.();
    this.shadowPipeline.dispose?.();
    this.particleSystem.dispose?.();
    if (this.gridRenderer) {
      this.gridRenderer.dispose();
    }
    this.supplyChainRenderer?.dispose();
    this.engine.dispose();
    soundManager.dispose();
  }
}