/**
 * S4WN Babylon.js/TypeScript - Map Editor
 * 
 * A side panel UI for modifying the game map (terrain type and elevation).
 */

import { UIManager } from '../UIManager';
import { GameLoop } from '../../game/GameLoop';
import { Terrain } from '../../game/types';
import { Scene } from '@babylonjs/core';
import { TerrainRenderer } from '../../rendering/TerrainRenderer';

export class MapEditor {
  private container: HTMLElement;
  private toolContainer!: HTMLElement;
  private paletteContainer!: HTMLElement;
  private _gameLoop: GameLoop;
  private _scene: Scene;
  private _terrainRenderer: TerrainRenderer;
  private isOpen: boolean = false;

  private currentTool: 'brush' | 'eraser' = 'brush';
  private currentTerrain: Terrain = Terrain.Grass;
  private currentElevation: number = 0;

  constructor(_uiManager: UIManager, gameLoop: GameLoop, scene: Scene, terrainRenderer: TerrainRenderer) {
    this._gameLoop = gameLoop;
    this._scene = scene;
    this._terrainRenderer = terrainRenderer;
    this.container = document.createElement('div');
    this.container.className = 'ui-screen editor-panel hidden';
    
    this.init();
  }

  private init(): void {
    this.container.innerHTML = `
      <div class="editor-container">
        <div class="editor-header">
          <span class="editor-title">Map Editor</span>
          <button class="editor-close">&times;</button>
        </div>
        <div class="editor-content">
          <div class="editor-section">
            <div class="editor-section-header">Tools</div>
            <div class="editor-tools">
              <button class="tool-btn active" id="tool-brush">Brush</button>
              <button class="tool-btn" id="tool-eraser">Eraser</button>
            </div>
          </div>
          
          <div class="editor-section">
            <div class="editor-section-header">Terrain Type</div>
            <div class="editor-palette" id="editor-palette"></div>
          </div>

          <div class="editor-section">
            <div class="editor-section-header">Elevation</div>
            <div class="editor-elevation">
              <input type="range" id="editor-elevation-slider" min="0" max="10" step="1" value="0">
              <span id="elevation-value">0</span>
            </div>
          </div>

          <div class="editor-section">
            <div class="editor-section-header">Actions</div>
            <div class="editor-actions">
              <button class="action-btn" id="btn-export-map">Export Map (JSON)</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.toolContainer = this.container.querySelector('.editor-tools') as HTMLElement;
    this.paletteContainer = this.container.querySelector('#editor-palette') as HTMLElement;

    this.setupEventListeners();
    this.createPalette();
    
    const overlay = document.getElementById('ui-overlay');
    if (overlay) {
      overlay.appendChild(this.container);
    }
  }

  private setupEventListeners(): void {
    this.container.querySelector('.editor-close')?.addEventListener('click', () => this.hide());
    
    this.container.querySelector('#tool-brush')?.addEventListener('click', () => this.setTool('brush'));
    this.container.querySelector('#tool-eraser')?.addEventListener('click', () => this.setTool('eraser'));
    
    const slider = this.container.querySelector('#editor-elevation-slider') as HTMLInputElement;
    const valDisplay = this.container.querySelector('#elevation-value') as HTMLElement;
    slider?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      this.currentElevation = parseInt(val);
      if (valDisplay) valDisplay.textContent = val;
    });

    this.container.querySelector('#btn-export-map')?.addEventListener('click', () => this.exportMap());
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.isOpen) return;
    this.applyModification(event);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isOpen || event.buttons !== 1) return;
    this.applyModification(event);
  };

  private applyModification(event: PointerEvent): void {
    const pickResult = this._scene.pick(event.clientX, event.clientY);
    if (!pickResult || !pickResult.pickedMesh || pickResult.pickedMesh !== this._terrainRenderer.getMesh()) return;

    const hitPoint = pickResult.pickedPoint;
    if (!hitPoint) return;

    const map = this._gameLoop.map;
    
    // Convert world coordinates to map coordinates
    // Terrain mesh is centered at 0,0,0 and spans -width/2 to width/2
    const mapX = Math.floor(hitPoint.x + map.width / 2);
    const mapY = Math.floor(hitPoint.z + map.height / 2);

    if (mapX < 0 || mapX >= map.width || mapY < 0 || mapY >= map.height) return;

    if (this.currentTool === 'brush') {
      map.setTerrain(mapX, mapY, this.currentTerrain);
      map.setElevation(mapX, mapY, this.currentElevation);
    } else {
      map.setTerrain(mapX, mapY, Terrain.Grass);
      map.setElevation(mapX, mapY, 0);
    }

    // Trigger visual update in renderer
    if ((this._terrainRenderer as any).updateTerrain) {
      (this._terrainRenderer as any).updateTerrain();
    }
  }

  private createPalette(): void {
    const terrains = Object.values(Terrain);
    // Filter out any non-terrain values if the enum has them
    const validTerrains = terrains.filter((t): t is Terrain => typeof t === 'string') as Terrain[];

    validTerrains.forEach(terrain => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.dataset.terrain = terrain;
      btn.textContent = terrain;
      
      if (terrain === Terrain.Grass) btn.classList.add('active');
      
      btn.addEventListener('click', () => {
        this.currentTerrain = terrain;
        this.paletteContainer.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      
      this.paletteContainer.appendChild(btn);
    });
  }

  private setTool(tool: 'brush' | 'eraser'): void {
    this.currentTool = tool;
    this.toolContainer.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.id === `tool-${tool}`);
    });
  }

  public show(): void {
    this.container.classList.remove('hidden');
    this.container.classList.add('active');
    this.isOpen = true;
    window.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.container.classList.remove('active');
    this.isOpen = false;
    window.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
  }

  public toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  private exportMap(): void {
    console.log('Exporting map...');
    const map = this._gameLoop.map;
    const mapData = {
      width: map.width,
      height: map.height,
      tiles: map.tiles.map(row => row.map(tile => ({
        terrain: tile.terrain,
        elevation: tile.elevation,
        resource: tile.resource,
        visibility: tile.visibility,
        territory: tile.territory
      })))
    };

    const blob = new Blob([JSON.stringify(mapData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Getters for the interaction logic
  public getCurrentTool() { return this.currentTool; }
  public getCurrentTerrain() { return this.currentTerrain; }
  public getCurrentElevation() { return this.currentElevation; }
}