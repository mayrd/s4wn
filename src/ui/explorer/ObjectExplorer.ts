/**
 * S4WN Babylon.js/TypeScript - Object Explorer
 * 
 * A side panel catalog showing one representative per game asset TYPE:
 * terrain types, building kinds, unit kinds — each with full static metadata
 * (costs, production, generation, rendering info). 
 * Includes coordinate search for on-demand individual tile inspection.
 */

import { UIManager } from '../UIManager';
import { GameLoop } from '../../game/GameLoop';
import { Terrain } from '../../game/types';
import { 
  BuildingType, BUILDING_NAMES, buildCost, buildTime, productionInterval,
  buildingInputs, buildingOutputs, requiredTool, requiresSettler,
  resourceName, buildingName,
} from '../../economy/types';

export interface ExplorerObject {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
}

// ── Terrain type catalog ────────────────────────────────────────────

interface TerrainEntry {
  terrain: Terrain;
  splatRgb: string;
  buildable: boolean;
  movementCost: number;
  generation: string;
}

const TERRAIN_CATALOG: TerrainEntry[] = [
  { terrain: Terrain.Grass,   splatRgb: '50,200,50',    buildable: true,  movementCost: 1.0, generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.Forest,  splatRgb: '20,100,20',    buildable: false, movementCost: 2.0, generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.Desert,  splatRgb: '200,200,100',  buildable: true,  movementCost: 1.2, generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.Mountain,splatRgb: '100,100,100',  buildable: false, movementCost: 3.0, generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.Snow,    splatRgb: '255,255,255',  buildable: true,  movementCost: 1.5, generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.Water,   splatRgb: '0,0,255',      buildable: false, movementCost: 99.0,generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.DeepWater,splatRgb:'0,0,255',      buildable: false, movementCost: 99.0,generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
  { terrain: Terrain.Swamp,   splatRgb: '50,50,0',      buildable: false, movementCost: 2.5, generation: 'Procedural splat-map shader (TerrainRenderer.ts)' },
];

// ── Helper to format cost items ─────────────────────────────────────

function fmtCost(items: Array<{resource: any; amount: number}>): string {
  if (items.length === 0) return 'none';
  return items.map(i => `${resourceName(i.resource)}×${i.amount}`).join(', ');
}

export class ObjectExplorer {
  private container: HTMLElement;
  private listElement!: HTMLElement;
  private detailsElement!: HTMLElement;
  private isOpen: boolean = false;
  private gameLoop: GameLoop;
  private activeCatalog: 'terrain' | 'buildings' | 'units' = 'terrain';

  constructor(_uiManager: UIManager, gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
    this.container = document.createElement('div');
    this.container.className = 'ui-screen explorer-panel hidden';
    this.init();
  }

  private init(): void {
    this.container.innerHTML = `
      <div class="explorer-container">
        <div class="explorer-header">
          <span class="explorer-title">Object Explorer</span>
          <button class="explorer-close">&times;</button>
        </div>
        <div class="explorer-content">
          <div class="explorer-list-section">
            <div class="explorer-list-header">
              <span class="explorer-tab" data-tab="terrain" style="font-weight:bold;margin-right:12px;cursor:pointer">Terrain</span>
              <span class="explorer-tab" data-tab="buildings" style="margin-right:12px;cursor:pointer">Buildings</span>
              <span class="explorer-tab" data-tab="units" style="cursor:pointer">Units</span>
            </div>
            <div class="explorer-search">
              <input type="text" id="explorer-search" placeholder="Search tile: x,y (e.g. 5,10)" />
            </div>
            <div class="explorer-list" id="explorer-list"></div>
          </div>
          <div class="explorer-details-section">
            <div class="explorer-details-header">Details</div>
            <div class="explorer-details" id="explorer-details">
              <div class="explorer-empty-msg">Select an object to inspect</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.listElement = this.container.querySelector('#explorer-list') as HTMLElement;
    this.detailsElement = this.container.querySelector('#explorer-details') as HTMLElement;

    this.container.querySelector('.explorer-close')?.addEventListener('click', () => this.hide());

    // Tab switching
    this.container.querySelectorAll('.explorer-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = (e.target as HTMLElement).dataset.tab as 'terrain' | 'buildings' | 'units';
        this.activeCatalog = category;
        this.container.querySelectorAll('.explorer-tab').forEach(t => (t as HTMLElement).style.fontWeight = 'normal');
        (e.target as HTMLElement).style.fontWeight = 'bold';
        this.refresh();
      });
    });

    // Coordinate search
    const searchInput = this.container.querySelector('#explorer-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.searchTile(searchInput.value.trim());
      });
    }

    const overlay = document.getElementById('ui-overlay');
    if (overlay) overlay.appendChild(this.container);
  }

  public show(): void {
    this.container.classList.remove('hidden');
    this.container.classList.add('active');
    this.isOpen = true;
    this.refresh();
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.container.classList.remove('active');
    this.isOpen = false;
  }

  public toggle(): void {
    this.isOpen ? this.hide() : this.show();
  }

  // ── Refresh: build catalog list based on active tab ─────────────────

  private refresh(): void {
    switch (this.activeCatalog) {
      case 'terrain': this.showTerrainCatalog(); break;
      case 'buildings': this.showBuildingCatalog(); break;
      case 'units': this.showUnitCatalog(); break;
    }
  }

  private showTerrainCatalog(): void {
    const objects: ExplorerObject[] = TERRAIN_CATALOG.map(t => ({
      id: `terrain-${t.terrain}`,
      type: 'terrain-type',
      name: t.terrain.toString(),
      properties: {
        terrain: t.terrain.toString(),
        splatColor: `rgb(${t.splatRgb})`,
        buildable: t.buildable,
        movementCost: t.movementCost,
        generation: t.generation,
        description: t.movementCost >= 99 ? 'Impassable water body' : t.movementCost >= 3 ? 'High terrain, slow movement' : t.buildable ? 'Fertile land, can build' : 'Wooded area, blocks building',
      }
    }));
    this.updateList(objects);
  }

  private showBuildingCatalog(): void {
    const seen = new Set<string>();
    const objects: ExplorerObject[] = [];

    // Show in-game buildings with runtime state
    for (const b of this.gameLoop.economy.getCompleteBuildings()) {
      const name = buildingName(b.kind);
      if (seen.has(name)) continue;
      seen.add(name);

      const kind = b.kind as BuildingType;
      const costs = buildCost(kind);
      const inputs = buildingInputs(kind);
      const outputs = buildingOutputs(kind);
      const interval = productionInterval(kind);
      const time = buildTime(kind);
      const tool = requiredTool(kind);

      objects.push({
        id: `building-${name}`,
        type: 'building',
        name,
        properties: {
          buildCost: fmtCost(costs),
          buildTime: `${time} ticks`,
          productionInputs: fmtCost(inputs),
          productionOutputs: fmtCost(outputs),
          productionInterval: interval > 0 ? `${interval} ticks (${(interval/10).toFixed(1)}s)` : 'no production',
          requiredTool: tool !== null ? tool.toString() : 'none',
          requiresSettler: requiresSettler(kind),
          generation: 'Procedural Babylon.js mesh (BuildingMesh.ts)',
          // Runtime state from placed instances
          count: this.gameLoop.economy.getCompleteBuildings().filter(x => buildingName(x.kind) === name).length,
          runtime_x: b.x,
          runtime_y: b.y,
          runtime_hp: `${b.hp}/${b.maxHp}`,
          runtime_active: b.isActive,
        }
      });
    }

    // If no buildings placed yet, show catalog of all building types
    if (objects.length === 0) {
      for (let i = 0; i < BUILDING_NAMES.length; i++) {
        const name = BUILDING_NAMES[i];
        if (!name) continue;
        if (name === 'Castle') continue; // Castle is placed at game start

        const kind = i as BuildingType;
        const costs = buildCost(kind);
        const inputs = buildingInputs(kind);
        const outputs = buildingOutputs(kind);
        const interval = productionInterval(kind);
        const time = buildTime(kind);

        objects.push({
          id: `building-${name}`,
          type: 'building',
          name,
          properties: {
            buildCost: fmtCost(costs),
            buildTime: `${time} ticks`,
            productionInputs: fmtCost(inputs),
            productionOutputs: fmtCost(outputs),
            productionInterval: interval > 0 ? `${interval} ticks (${(interval/10).toFixed(1)}s)` : 'no production',
            requiredTool: requiredTool(kind)?.toString() ?? 'none',
            requiresSettler: requiresSettler(kind),
            generation: 'Procedural Babylon.js mesh (BuildingMesh.ts)',
            count: 0,
          }
        });
      }
    }

    objects.sort((a, b) => a.name.localeCompare(b.name));
    this.updateList(objects);
  }

  private showUnitCatalog(): void {
    // Unit catalog from UnitKind enum (types.ts)
    const unitKinds = [
      { name: 'Settler', hp: 50, atk: 1, speed: 1.5, sight: 8,  desc: 'Civilian unit; can build and gather' },
      { name: 'Swordsman', hp: 100, atk: 15, speed: 1.0, sight: 6, desc: 'Melee infantry; standard soldier' },
      { name: 'Bowman', hp: 75, atk: 12, speed: 1.2, sight: 10, desc: 'Ranged unit; attacks from distance' },
      { name: 'Worker', hp: 40, atk: 1, speed: 1.0, sight: 5, desc: 'Economic unit; operates buildings' },
      { name: 'Pioneer', hp: 40, atk: 1, speed: 1.0, sight: 5, desc: 'Border expander; digs territory stakes' },
    ];

    const objects: ExplorerObject[] = unitKinds.map(u => ({
      id: `unit-${u.name}`,
      type: 'unit',
      name: u.name,
      properties: {
        hp: u.hp,
        attack: u.atk,
        speed: u.speed,
        sightRange: u.sight,
        description: u.desc,
        generation: 'Game-logic entity; mesh from glTF (BuildingMesh.ts)',
        // Count alive units of this kind in the game
        count: this.gameLoop.unitManager.getAliveUnits().filter(
          x => x.kind.toString() === u.name
        ).length,
      }
    }));

    this.updateList(objects);
  }

  // ── Coordinate search (on-demand tile inspection) ──────────────────

  private searchTile(input: string): void {
    const parts = input.split(',').map(s => s.trim());
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    if (isNaN(x) || isNaN(y)) {
      this.detailsElement.innerHTML = '<div class="explorer-empty-msg">Invalid format. Use: x,y (e.g. 5,10)</div>';
      return;
    }
    const tile = this.gameLoop.map.get(x, y);
    if (!tile) {
      this.detailsElement.innerHTML = `<div class="explorer-empty-msg">Tile (${x},${y}) not found on map</div>`;
      return;
    }
    // Look up terrain catalog for extra metadata
    const catEntry = TERRAIN_CATALOG.find(t => t.terrain === tile.terrain);
    const obj: ExplorerObject = {
      id: `${x},${y}`,
      type: 'terrain-tile',
      name: `Tile (${x},${y})`,
      properties: {
        terrain: tile.terrain.toString(),
        elevation: tile.elevation.toFixed(2),
        resource: tile.resource?.toString() ?? 'none',
        visibility: tile.visibility.toFixed(2),
        territory: tile.territory,
        buildable: catEntry?.buildable ?? '?',
        movementCost: catEntry?.movementCost ?? '?',
        splatColor: catEntry ? `rgb(${catEntry.splatRgb})` : '?',
        generation: catEntry?.generation ?? 'Procedural splat-map shader',
      }
    };
    this.showDetails(obj);
  }

  // ── List rendering ─────────────────────────────────────────────────

  private updateList(objects: ExplorerObject[]): void {
    this.listElement.innerHTML = '';
    objects.forEach(obj => {
      const item = document.createElement('div');
      item.className = 'explorer-item';
      item.innerHTML = `
        <span class="explorer-item-type">[${obj.type}]</span>
        <span class="explorer-item-name">${obj.name}</span>
      `;
      item.addEventListener('click', () => this.showDetails(obj));
      this.listElement.appendChild(item);
    });
  }

  private showDetails(obj: ExplorerObject): void {
    this.detailsElement.innerHTML = `
      <div class="explorer-detail-item"><strong>ID:</strong> ${obj.id}</div>
      <div class="explorer-detail-item"><strong>Type:</strong> ${obj.type}</div>
      <div class="explorer-detail-item"><strong>Name:</strong> ${obj.name}</div>
      <hr class="explorer-divider" />
      <div class="explorer-properties">
        ${Object.entries(obj.properties).map(([key, val]) => `
          <div class="explorer-prop-row">
            <span class="prop-key">${key}:</span>
            <span class="prop-val">${JSON.stringify(val)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
}
