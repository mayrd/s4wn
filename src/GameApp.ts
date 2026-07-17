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
 // DebugPanel removed - debug functionality now integrated into InGameMenu
import { MapEditor } from './ui/editor/MapEditor';
import { soundManager } from './audio/SoundManager';
import { TouchCameraController } from './input/TouchCameraController';
import { BuildingType } from './economy/types';
import { BuildingData } from './game/Economy';
import { NationType } from './game/Nation';
import { BuildingPlacement } from './ui/BuildingPlacement';
import { SupplyChainRenderer } from './rendering/SupplyChainRenderer';
import { ResourceItemRenderer } from './rendering/ResourceItemRenderer';
import { ConstructionAnimator } from './rendering/ConstructionAnimator';
import { DestructionAnimator } from './rendering/DestructionAnimator';
import { UnitRenderer } from './rendering/UnitRenderer';
import { TutorialManager } from './game/TutorialManager';
import { TutorialDialog } from './ui/TutorialDialog';
import { Unit } from './game/Unit';
import { UnitKind } from './game/types';
import { InGameMenu } from './ui/InGameMenu';

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
  public unitRenderer!: UnitRenderer;
  public touchController!: TouchCameraController;
  public gridRenderer!: GridRenderer;
  public supplyChainRenderer!: SupplyChainRenderer;
  public resourceItemRenderer!: ResourceItemRenderer;
  public constructionAnimator!: ConstructionAnimator;
  public destructionAnimator!: DestructionAnimator;
  public buildingMeshes: Map<number, any> = new Map();
  public ui!: UIManager;
  public mapEditor!: MapEditor;
  public buildingPlacement!: BuildingPlacement;
  public inGameMenu!: InGameMenu;
  public tutorialManager?: TutorialManager;

  private mode: StartMode;
  private playerNation: NationType = NationType.Romans;
  private onExplorerToggle!: () => void;
  private onEditorToggle!: () => void;
  private boundBuildingPlaced!: (e: Event) => void;

  /** Promise that resolves when critical assets (terrain textures) are loaded. */
  public readyPromise: Promise<void>;

  constructor(canvasId: string, mode: StartMode = 'new', playerNation: NationType = NationType.Romans) {
    this.mode = mode;
    this.playerNation = playerNation;

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
      undefined,
      this.playerNation
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

    // Create resource item renderer (physical items on ground from LogisticsManager)
    this.resourceItemRenderer = new ResourceItemRenderer(this.scene, this.gameLoop.economy.logistics);

    this.ui.updateProgress('Loading buildings...', 65);

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));

    // Step 5: Buildings (async)
    this.buildingRenderer = new BuildingMesh(this.scene);

    // Construction animator — manages scaffolding for buildings under construction
    this.constructionAnimator = new ConstructionAnimator(this.scene);
    this.constructionAnimator.setShadowPipeline(this.shadowPipeline);
    this.constructionAnimator.onConstructionComplete = (mesh, building) => {
      if (mesh && this.shadowPipeline) {
        this.shadowPipeline.addShadowCaster(mesh);
      }
      if (mesh && building) {
        this.buildingMeshes.set(building.index, mesh);
      }
    };

    // Destruction animator
    this.destructionAnimator = new DestructionAnimator(this.scene, this.particleSystem);

    // Unit Renderer
    this.unitRenderer = new UnitRenderer(this.scene);
    this.unitRenderer.onMeshCreated = (mesh) => {
      if (this.shadowPipeline) {
        this.shadowPipeline.addShadowCaster(mesh);
      }
    };
    await this.unitRenderer.init();

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
    // Default nation for initial buildings: the player's chosen nation
    const playerNation = this.playerNation;
    for (const b of buildingData) {
      const kind: BuildingType =
        b.kind === 'castle' ? BuildingType.Castle : (BuildingType as any)[b.kind];
      const buildingMesh = await this.buildingRenderer.createBuilding(b.kind, b.x, b.y, 2, 2, 2, null, playerNation);
      if (buildingMesh) {
        const buildingObj = this.gameLoop.economy.tryPlaceBuilding(kind, b.x, b.y, this.map, 0);
        this.shadowPipeline.addShadowCaster(buildingMesh);
        if (buildingObj) {
          this.buildingMeshes.set(buildingObj.index, buildingMesh);
        }
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

  /** Wire HUD + in-game menu now that the game (and canvas) exist. */
  private initUI(): void {
    this.gameLoop.state.isPaused = false;
    new HUD(this.gameLoop);
    this.inGameMenu = new InGameMenu(this.gameLoop, this.scene, this.playerNation, this.buildingPlacement);

    if (this.mode === 'tutorial') {
      const dialog = new TutorialDialog();
      this.tutorialManager = new TutorialManager(this, this.ui, dialog);
      
      let guardId: number | null = null;

      this.tutorialManager.setSteps([
        {
          id: 'camera',
          narrative: 'Welcome, Leader! Before we can build an empire, we must learn to survey our lands. Move the camera using your arrow keys or by dragging your mouse to the edges of the screen.',
          onStart: (app, _ui) => {
            app.gameLoop?.state && (app.gameLoop.state.isPaused = false);
            const hud = document.getElementById('hud-container');
            if (hud) {
              hud.querySelectorAll('.hud-btn').forEach(btn => {
                (btn as HTMLButtonElement).disabled = true;
                (btn as HTMLElement).style.opacity = '0.5';
                (btn as HTMLElement).style.pointerEvents = 'none';
              });
            }
            const buildBtn = document.getElementById('btn-building-palette');
            if (buildBtn) {
              (buildBtn as HTMLButtonElement).disabled = true;
              buildBtn.style.opacity = '0.5';
              buildBtn.style.pointerEvents = 'none';
            }
          },
          isComplete: (app) => {
            const camera = app.scene?.activeCamera as any;
            if (camera && camera.target) {
              return Math.abs(camera.target.x - 50) > 2 || Math.abs(camera.target.z - 50) > 2;
            }
            return false;
          }
        },
        {
          id: 'wood',
          narrative: "Wood is the foundation of all construction. Open the Construction Menu and place a Woodcutter's Hut near the forest, a Forest Ranger's Hut to replant trees, and a Sawmill to refine logs into planks.",
          onStart: (app, _ui) => {
            const buildBtn = document.getElementById('btn-building-palette');
            if (buildBtn) {
              (buildBtn as HTMLButtonElement).disabled = false;
              buildBtn.style.opacity = '1';
              buildBtn.style.pointerEvents = 'auto';
              buildBtn.style.boxShadow = '0 0 10px 2px #fff';
            }
            app.buildingPlacement?.lockAllTabs();
            app.buildingPlacement?.unlockSpecificTab('basic');
            app.buildingPlacement?.lockAllBuildings();
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Woodcutter);
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Forester);
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Sawmill);
          },
          isComplete: (app) => {
            const econ = app.gameLoop.economy;
            const hasWoodcutter = econ.buildings.some(b => b.kind === BuildingType.Woodcutter);
            const hasRanger = econ.buildings.some(b => b.kind === BuildingType.Forester);
            const hasSawmill = econ.buildings.some(b => b.kind === BuildingType.Sawmill);
            return hasWoodcutter && hasRanger && hasSawmill;
          }
        },
        {
          id: 'food',
          narrative: "Our future miners will require food to work. Let's build a basic food loop: a Grain Farm to grow wheat and a Bakery to bake bread.",
          onStart: (app, _ui) => {
            const buildBtn = document.getElementById('btn-building-palette');
            if (buildBtn) {
              buildBtn.style.boxShadow = '';
            }
            app.buildingPlacement?.lockAllTabs();
            app.buildingPlacement?.unlockSpecificTab('food');
            app.buildingPlacement?.lockAllBuildings();
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Farm);
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Bakery);
          },
          isComplete: (app) => {
            const econ = app.gameLoop.economy;
            const farm = econ.buildings.find(b => b.kind === BuildingType.Farm);
            if (farm && farm.constructionProgress < 1.0) {
              farm.constructionProgress = 1.0;
              farm.isActive = true;
            }
            const bakery = econ.buildings.find(b => b.kind === BuildingType.Bakery);
            if (bakery && bakery.constructionProgress < 1.0) {
              bakery.constructionProgress = 1.0;
              bakery.isActive = true;
            }
            return !!bakery && bakery.constructionProgress >= 1.0;
          }
        },
        {
          id: 'expansion',
          narrative: 'See those red border stones? They limit our land. Build a Small Tower near the eastern border to push our frontier outward toward the mountains.',
          onStart: (app, _ui) => {
            app.buildingPlacement?.lockAllTabs();
            app.buildingPlacement?.unlockSpecificTab('military');
            app.buildingPlacement?.lockAllBuildings();
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.GuardTower);
          },
          isComplete: (app) => {
            const econ = app.gameLoop.economy;
            const tower = econ.buildings.find(b => b.kind === BuildingType.GuardTower);
            if (tower) {
              if (tower.constructionProgress < 1.0) {
                tower.constructionProgress = 1.0;
                tower.isActive = true;
                app.gameLoop.map.updateTerritory(1, [{ x: tower.x, y: tower.y, radius: 25 }]);
                app.territoryOverlay?.refresh();
              }
              return true;
            }
            return false;
          }
        },
        {
          id: 'mining',
          narrative: 'Now that the mountain is ours, we can extract resources. Build a Coal or Iron Ore Mine on the mountain, and a Smelting Works nearby to process the ore.',
          onStart: (app, _ui) => {
            app.buildingPlacement?.lockAllTabs();
            app.buildingPlacement?.unlockSpecificTab('mining');
            app.buildingPlacement?.lockAllBuildings();
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.CoalMine);
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.IronOreMine);
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Smelter);
          },
          isComplete: (app) => {
            const econ = app.gameLoop.economy;
            const hasMine = econ.buildings.some(b => b.kind === BuildingType.CoalMine || b.kind === BuildingType.IronOreMine);
            const smelter = econ.buildings.find(b => b.kind === BuildingType.Smelter);
            if (hasMine && smelter) {
              if (smelter.constructionProgress < 1.0) {
                smelter.constructionProgress = 1.0;
                smelter.isActive = true;
              }
              return true;
            }
            return false;
          }
        },
        {
          id: 'military',
          narrative: 'Our scouts have located an enemy outpost in the far upper corner of the map. Build a Weaponsmith to forge swords, and a Barracks to train your first soldier.',
          onStart: (app, _ui) => {
            app.buildingPlacement?.lockAllTabs();
            app.buildingPlacement?.unlockSpecificTab('military');
            app.buildingPlacement?.lockAllBuildings();
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Weaponsmith);
            app.buildingPlacement?.unlockSpecificBuilding(BuildingType.Barracks);
          },
          isComplete: (app) => {
            const econ = app.gameLoop.economy;
            const barracks = econ.buildings.find(b => b.kind === BuildingType.Barracks);
            if (barracks) {
              if (barracks.constructionProgress < 1.0) {
                barracks.constructionProgress = 1.0;
                barracks.isActive = true;
                const soldier = new Unit(app.gameLoop.unitManager.nextUnitId++, UnitKind.Swordsman, 50, 50);
                app.gameLoop.unitManager.units.push(soldier);
              }
              return true;
            }
            return false;
          }
        },
        {
          id: 'combat',
          narrative: 'Our military is ready. Select your soldier, right-click the enemy castle in the upper corner of the map, and defeat their lone guard to claim the territory!',
          onStart: (app, _ui) => {
            app.buildingPlacement?.lockAllTabs();
            app.buildingPlacement?.lockAllBuildings();
            
            // Set up enemy castle and enemy guard at upper-right corner
            const mapWidth = app.gameLoop.map.width;
            const mapHeight = app.gameLoop.map.height;
            const enemyCastleX = mapWidth - 5;
            const enemyCastleY = mapHeight - 5;
            
            const enemyCastle = app.gameLoop.economy.tryPlaceBuilding(BuildingType.Castle, enemyCastleX, enemyCastleY, app.gameLoop.map, 2);
            if (enemyCastle) {
              enemyCastle.constructionProgress = 1.0;
              enemyCastle.isActive = true;
            }
            
            const enemyGuard = new Unit(app.gameLoop.unitManager.nextUnitId++, UnitKind.Swordsman, enemyCastleX - 1, enemyCastleY - 1);
            app.gameLoop.unitManager.units.push(enemyGuard);
            guardId = enemyGuard.id;
          },
          isComplete: (app) => {
            if (guardId === null) return false;
            const guard = app.gameLoop.unitManager.units.find(u => u.id === guardId);
            return !guard || guard.hp <= 0;
          }
        }
      ]);
      this.tutorialManager.start();
    }
    // Wire renderers to in-game menu for debug toggling
    this.inGameMenu.setGridRenderer(this.gridRenderer);
    this.inGameMenu.setTerrainRenderer(this.terrainRenderer);
    this.inGameMenu.setTerritoryOverlay(this.territoryOverlay);
    this.inGameMenu.setSupplyChainRenderer(this.supplyChainRenderer);
    // Expose in-game menu for console access (debug tab)
    (window as any).debugPanel = this.inGameMenu;
  }

  /**
   * Handle the 'building-placed' event from BuildingPlacement UI.
   * Creates scaffolding mesh via ConstructionAnimator — the final
   * building model will appear once constructionProgress reaches 1.0.
   */
  private onBuildingPlaced(e: Event): void {
    const detail = (e as CustomEvent).detail as {
      kind: BuildingType;
      x: number;
      y: number;
      building: BuildingData;
    };
    if (!detail || detail.kind === undefined || !detail.building) return;

    // Start construction animation (scaffolding) — final model loads on completion
    if (this.constructionAnimator) {
      this.constructionAnimator.startConstruction(
        detail.building,
        this.playerNation,
      );
    }
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
      // Animate construction scaffolding — checks economy building progress
      if (this.constructionAnimator) {
        this.constructionAnimator.update(this.gameLoop.economy.buildings);
      }
      // Animate building destruction
      if (this.destructionAnimator) {
        this.destructionAnimator.update(this.gameLoop.economy.buildings, this.buildingMeshes);
      }
      // Render and animate units
      if (this.unitRenderer) {
        this.unitRenderer.update(this.gameLoop.unitManager.units, dt);
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
      // Sync resource item 3D meshes with LogisticsManager (items spawned/removed)
      if (this.resourceItemRenderer) {
        this.resourceItemRenderer.sync();
      }
      if (this.tutorialManager) {
        this.tutorialManager.update();
      }
      this.scene.render();
    });
  }

  public dispose(): void {
    window.removeEventListener('ui-explorer-toggle', this.onExplorerToggle);
    window.removeEventListener('ui-editor-toggle', this.onEditorToggle);
    window.removeEventListener('building-placed', this.boundBuildingPlaced);
    this.inGameMenu?.dispose();
    this.buildingPlacement?.dispose();
    this.mapEditor?.hide();
    this.touchController.dispose?.();
    this.waterRenderer?.dispose?.();
    this.shadowPipeline.dispose?.();
    this.particleSystem.dispose?.();
    this.constructionAnimator?.dispose();
    this.destructionAnimator?.dispose();
    this.unitRenderer?.dispose();
    
    // Dispose all building meshes
    for (const [, mesh] of this.buildingMeshes) {
      if (mesh && mesh.dispose) {
        mesh.dispose();
      }
    }
    this.buildingMeshes.clear();

    if (this.gridRenderer) {
      this.gridRenderer.dispose();
    }
    this.supplyChainRenderer?.dispose();
    this.resourceItemRenderer?.dispose();
    this.engine.dispose();
    soundManager.dispose();
  }
}