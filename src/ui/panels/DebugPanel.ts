/**
 * S4WN Babylon.js/TypeScript - Debug Panel
 * 
 * Real-time game statistics and debug controls.
 */

import { Engine, Scene, Color3, ArcRotateCamera } from '@babylonjs/core';
import { GameLoop } from '../../game/GameLoop';
import { GridRenderer } from '../../rendering/GridRenderer';
import { BuildingType } from '../../economy/types';
import { UnitKind } from '../../game/types';

export class DebugPanel {
  private container: HTMLElement;
  private camera: ArcRotateCamera | null = null;
  private gameLoop: GameLoop;
  private scene: Scene;
  private gridRenderer: GridRenderer | null = null;
  private terrainRenderer: any; // TerrainRenderer reference for splatting toggle
  private territoryOverlay: any; // TerritoryOverlay reference for territory toggle
  /** Store original textures to restore when toggling back on */
  private originalTextures: WeakMap<any, any> = new WeakMap();
  private originalEmissive: WeakMap<any, any> = new WeakMap();

  constructor(document: Document, engine: Engine, gameLoop: GameLoop, scene: Scene) {
    this.gameLoop = gameLoop;
    this.scene = scene;
    this.container = document.createElement('div');
    this.container.className = 'debug-panel debug-collapsed';
    // Make the title bar the trigger for double-click expand/collapse
    this.container.addEventListener('dblclick', (e) => {
      // Only trigger from title bar area (not from child buttons/links)
      const target = e.target as HTMLElement;
      if (target.closest('.debug-title') || target === this.container) {
        this.container.classList.toggle('debug-collapsed');
      }
    });
    document.body.appendChild(this.container);

    this.createContent(gameLoop, engine);
  }

  private createContent(_gameLoop: GameLoop, engine: Engine): void {
    this.container.innerHTML = `
      <div class="debug-title">Debug Console</div>
      
      <div class="debug-stat-row"><span>FPS:</span> <span id="debug-fps" style="color:#8f8">0</span></div>
      <div class="debug-stat-row"><span>Game Time:</span> <span id="debug-time">0s</span></div>
      <div class="debug-stat-row"><span>Ticks:</span> <span id="debug-ticks">0</span></div>
      
      <hr class="debug-divider" />
      
      <div class="debug-title" style="font-size:0.85rem;margin-top:4px">Units</div>
      <div class="debug-stat-row"><span>Total:</span> <span id="debug-units-total">0</span></div>
      <div class="debug-stat-row"><span>Workers:</span> <span id="debug-units-workers">0</span></div>
      <div class="debug-stat-row"><span>Archers:</span> <span id="debug-units-archers">0</span></div>
      <div class="debug-stat-row"><span>Soldiers:</span> <span id="debug-units-soldiers">0</span></div>
      
      <hr class="debug-divider" />
      
      <div class="debug-title" style="font-size:0.85rem;margin-top:4px">Buildings</div>
      <div class="debug-stat-row"><span>Total:</span> <span id="debug-buildings-total">0</span></div>
      <div class="debug-stat-row"><span>Storage:</span> <span id="debug-buildings-storage">0</span></div>
      <div class="debug-stat-row"><span>Production:</span> <span id="debug-buildings-prod">0</span></div>
      
      <hr class="debug-divider" />
      
       <div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap">
         <button id="debug-btn-grid" class="debug-btn" style="flex:1;min-width:70px;padding:4px 8px;font-size:0.7rem;cursor:pointer">Grid: ON</button>
         <button id="debug-btn-textures" class="debug-btn" style="flex:1;min-width:70px;padding:4px 8px;font-size:0.7rem;cursor:pointer">Textures: ON</button>
         <button id="debug-btn-wireframe" class="debug-btn" style="flex:1;min-width:70px;padding:4px 8px;font-size:0.7rem;cursor:pointer">Wire: OFF</button>
       </div>
        <div style="display:flex;gap:4px;margin:4px 0;flex-wrap:wrap">
          <button id="debug-btn-splat" class="debug-btn" style="flex:1;min-width:70px;padding:4px 8px;font-size:0.7rem;cursor:pointer">Splat: ON</button>
          <button id="debug-btn-territory" class="debug-btn" style="flex:1;min-width:70px;padding:4px 8px;font-size:0.7rem;cursor:pointer">Territory: OFF</button>
          <button id="debug-btn-fog" class="debug-btn" style="flex:1;min-width:70px;padding:4px 8px;font-size:0.7rem;cursor:pointer">Fog: ON</button>
        </div>
      
      <hr class="debug-divider" />
      
      <div class="debug-title" style="font-size:0.85rem;margin-top:4px">Mouse Tile</div>
      <div class="debug-stat-row" style="font-size:0.75rem"><span>Coords:</span> <span id="debug-mouse-coords" style="color:#ff8">(-,-)</span></div>
      <div id="debug-tile-result" style="font-size:0.7rem;line-height:1.4;max-height:120px;overflow-y:auto;margin-top:4px"></div>
    `;

    this.setupToggles();
    this.setupMouseTracking(engine);
    this.startUpdateLoop(engine, _gameLoop);
  }

  private setupToggles(): void {
    // Grid toggle
    const gridBtn = this.container.querySelector('#debug-btn-grid') as HTMLButtonElement;
    let gridVisible = false;
    gridBtn.textContent = 'Grid: OFF';
    gridBtn.addEventListener('click', () => {
      gridVisible = !gridVisible;
      gridBtn.textContent = `Grid: ${gridVisible ? 'ON' : 'OFF'}`;
      this.setGridVisibility(gridVisible);
    });

    // Textures toggle
    const texBtn = this.container.querySelector('#debug-btn-textures') as HTMLButtonElement;
    let texturesEnabled = true;
    texBtn.addEventListener('click', () => {
      texturesEnabled = !texturesEnabled;
      texBtn.textContent = `Textures: ${texturesEnabled ? 'ON' : 'OFF'}`;
      this.setTextureMode(texturesEnabled);
    });

    // Wireframe toggle
    const wireBtn = this.container.querySelector('#debug-btn-wireframe') as HTMLButtonElement;
    let wireframeMode = false;
    wireBtn.addEventListener('click', () => {
      wireframeMode = !wireframeMode;
      wireBtn.textContent = `Wire: ${wireframeMode ? 'ON' : 'OFF'}`;
      this.setWireframe(wireframeMode);
    });

    // Territory toggle
    const terrBtn = this.container.querySelector('#debug-btn-territory') as HTMLButtonElement;
    let territoryVisible = false;
    terrBtn.addEventListener('click', () => {
      territoryVisible = !territoryVisible;
      terrBtn.textContent = `Territory: ${territoryVisible ? 'ON' : 'OFF'}`;
      this.setTerritoryVisibility(territoryVisible);
    });

    // Splat toggle
    const splatBtn = this.container.querySelector('#debug-btn-splat') as HTMLButtonElement;
    splatBtn.addEventListener('click', () => {
      const enabled = !this.terrainRenderer?.isSplattingEnabled();
      splatBtn.textContent = `Splat: ${enabled ? 'ON' : 'OFF'}`;
      this.terrainRenderer?.setSplattingEnabled(enabled);
    });

    // Fog toggle
    const fogBtn = this.container.querySelector('#debug-btn-fog') as HTMLButtonElement;
    let fogEnabled = true;
    fogBtn.addEventListener('click', () => {
      fogEnabled = !fogEnabled;
      fogBtn.textContent = `Fog: ${fogEnabled ? 'ON' : 'OFF'}`;
      this.setFogVisibility(fogEnabled);
    });

  }

  private setGridVisibility(visible: boolean): void {
    if (this.gridRenderer) {
      this.gridRenderer.setVisible(visible);
    } else {
      // Fallback: search scene meshes for grid (for backward compatibility)
      this.scene.meshes.forEach((mesh) => {
        if (mesh.name === 'grid') {
          mesh.isVisible = visible;
        }
      });
    }
  }

  /** Set the grid renderer reference (called after it's created) */
  public setGridRenderer(renderer: GridRenderer): void {
    this.gridRenderer = renderer;
  }

  /** Set the terrain renderer reference for splatting toggle */
  public setTerrainRenderer(renderer: any): void {
    this.terrainRenderer = renderer;
  }

  /** Set the territory overlay reference for territory toggle */
  public setTerritoryOverlay(overlay: any): void {
    this.territoryOverlay = overlay;
  }

  /** Set the supply chain renderer reference (kept for API compatibility). */
  public setSupplyChainRenderer(_renderer: any): void {
    // Supply chain toggling was migrated to the in-game menu; no-op here.
  }

  /** Set up mouse tracking for tile inspection */
  private setupMouseTracking(engine: Engine): void {
    // Find the camera
    const cam = this.scene.activeCamera as ArcRotateCamera | null;
    if (!cam) return;
    this.camera = cam;

    // Canvas element for pointer events
    const canvas = engine.getRenderingCanvas();
    if (!canvas) return;

    // Pointer move handler
    canvas.addEventListener('pointermove', (evt) => {
      this.updateMouseCoords(evt);
    });

    // Use pointerenter/pointerleave for clean state
    canvas.addEventListener('pointerleave', () => {
      const coordsEl = document.getElementById('debug-mouse-coords');
      if (coordsEl) coordsEl.textContent = '(-,-)';
    });
  }

  private updateMouseCoords(evt: PointerEvent): void {
    if (!this.camera) return;

    const coordsEl = document.getElementById('debug-mouse-coords');
    if (!coordsEl) return;

    // Get pick info from the scene
    const pick = this.scene.pick(evt.clientX, evt.clientY);
    if (!pick || !pick.pickedPoint) {
      coordsEl.textContent = '(-,-)';
      return;
    }

    // Convert world position to map tile coordinates
    const x = Math.floor(pick.pickedPoint.x);
    const y = Math.floor(pick.pickedPoint.z); // z in Babylon = y in map

    // Check bounds
    if (x < 0 || x >= this.gameLoop.map.width || y < 0 || y >= this.gameLoop.map.height) {
      coordsEl.textContent = '(-,-)';
      return;
    }

    coordsEl.textContent = `(${x},${y})`;
    
    // Auto-inspect the tile under cursor + any objects on it
    const tile = this.gameLoop.map.get(x, y);
    let html = '';
    if (tile) {
      html += `<div><b>${tile.terrain}</b> (${x},${y})</div>
        <div>Elevation: ${tile.elevation.toFixed(2)}</div>
        <div>Resource: ${tile.resource?.toString() ?? 'none'}</div>
        <div style="font-size:0.6rem;opacity:0.6">Visibility: ${tile.visibility.toFixed(2)} · Territory: ${tile.territory}</div>`;
    }

    // Check for buildings at this tile
    const building = this.gameLoop.economy.getBuildingAt(x, y);
    if (building) {
      html += `<hr class="debug-divider" style="margin:3px 0" />
        <div style="color:#8f8">🏰 <b>Building</b></div>
        <div>Kind: ${BuildingType[building.kind] ?? building.kind}</div>`;
    }

    // Check for units at this tile
    const unitsHere = this.gameLoop.unitManager.getAliveUnits()
      .filter(u => Math.floor(u.x) === x && Math.floor(u.y) === y);
    if (unitsHere.length > 0) {
      html += `<hr class="debug-divider" style="margin:3px 0" />`;
      for (const u of unitsHere) {
        html += `<div style="color:#ff8">👤 <b>${UnitKind[u.kind] ?? 'Unit'} #${u.id}</b></div>
          <div>HP: ${u.hp.toFixed(0)} · State: ${u.state}</div>`;
      }
    }

    document.getElementById('debug-tile-result')!.innerHTML = html || '—';
  }

  private setTextureMode(enabled: boolean): void {
    this.scene.meshes.forEach((mesh) => {
      if (mesh.material) {
        const mat = mesh.material as any;
        if (enabled) {
          // Restore original texture if we saved one
          const saved = this.originalTextures.get(mat);
          if (saved !== undefined) {
            mat.diffuseTexture = saved;
          }
          const savedEmissive = this.originalEmissive.get(mat);
          if (savedEmissive !== undefined) {
            mat.emissiveColor = savedEmissive;
            this.originalEmissive.delete(mat);
          }
          this.originalTextures.delete(mat);
        } else {
          // Save original texture and emissive color before disabling
          this.originalTextures.set(mat, mat.diffuseTexture);
          if (mat.emissiveColor) {
            this.originalEmissive.set(mat, mat.emissiveColor.clone());
          }
          mat.diffuseTexture = null;
          mat.emissiveColor = new Color3(1, 0, 1); // Magenta for debugging
        }
      }
    });
  }

  private setWireframe(enabled: boolean): void {
    this.scene.meshes.forEach((mesh) => {
      if (mesh.material) {
        const mat = mesh.material as any;
        mat.wireframe = enabled;
      }
    });
  }

  private setTerritoryVisibility(visible: boolean): void {
    if (this.territoryOverlay) {
      this.territoryOverlay.setVisible(visible);
    }
  }

  private setFogVisibility(_enabled: boolean): void {
    // Fog of war would be controlled here
    // This is a placeholder for future fog rendering
  }

  private isStorageBuilding(kind: number): boolean {
    // Storehouse and similar buildings provide storage
    return kind === BuildingType.Storehouse || 
           kind === BuildingType.StorageYard ||
           kind === BuildingType.LandingDock;
  }

  private isProductionBuilding(kind: number): boolean {
    // Buildings that produce resources
    return kind !== BuildingType.Castle && 
           kind !== BuildingType.Barracks &&
           kind !== BuildingType.Storehouse &&
           kind !== BuildingType.StorageYard &&
           kind !== BuildingType.LandingDock;
  }

  private startUpdateLoop(engine: Engine, gameLoop: GameLoop): void {
    const update = () => {
      const stats = gameLoop.getStats();
      const fpsElement = document.getElementById('debug-fps');
      const timeElement = document.getElementById('debug-time');
      const ticksElement = document.getElementById('debug-ticks');
      const unitsTotal = document.getElementById('debug-units-total');
      const unitsWorkers = document.getElementById('debug-units-workers');
      const unitsArchers = document.getElementById('debug-units-archers');
      const unitsSoldiers = document.getElementById('debug-units-soldiers');
      const buildingsTotal = document.getElementById('debug-buildings-total');
      const buildingsStorage = document.getElementById('debug-buildings-storage');
      const buildingsProd = document.getElementById('debug-buildings-prod');

      if (fpsElement) fpsElement.textContent = Math.round(engine.getFps()).toString();
      if (timeElement) timeElement.textContent = Math.floor(stats.gameTime).toString() + 's';
      if (ticksElement) ticksElement.textContent = stats.ticks.toString();

      const units = gameLoop.unitManager.getAliveUnits();
      const buildings = gameLoop.economy.getCompleteBuildings();

      if (unitsTotal) unitsTotal.textContent = units.length.toString();
      if (unitsWorkers) unitsWorkers.textContent = units.filter(u => u.kind === UnitKind.Worker).length.toString();
      if (unitsArchers) unitsArchers.textContent = units.filter(u => u.kind === UnitKind.Bowman).length.toString();
      if (unitsSoldiers) unitsSoldiers.textContent = units.filter(u => u.kind === UnitKind.Swordsman).length.toString();

      if (buildingsTotal) buildingsTotal.textContent = buildings.length.toString();
      if (buildingsStorage) buildingsStorage.textContent = buildings.filter(b => this.isStorageBuilding(b.kind)).length.toString();
      if (buildingsProd) buildingsProd.textContent = buildings.filter(b => this.isProductionBuilding(b.kind)).length.toString();

      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  public toggle(): void {
    this.container.classList.toggle('hidden');
  }

  /** Launch Babylon.js Inspector for advanced scene debugging */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public showBabylonInspector(): any {
    // Lazy-load the inspector (optional dev dependency) to avoid bundling in production
    // The inspector package may not be installed in all environments
    // @ts-ignore - optional package, error handled at runtime
    import('@babylonjs/inspector' as any).then((mod: any) => {
      if (mod && mod.Inspector) {
        mod.Inspector.Show(this.scene, { embedMode: true, enableClose: true });
      }
    }).catch(() => {
      // Package not installed - silently fail for production
    });
  }

  public dispose(): void {
    this.container.remove();
  }
}
