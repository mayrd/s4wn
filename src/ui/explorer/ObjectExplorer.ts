/**
 * S4WN Babylon.js/TypeScript - Object Explorer
 * 
 * A side panel UI for inspecting game objects (units, buildings, etc.)
 */

import { UIManager } from '../UIManager';
import { GameLoop } from '../../game/GameLoop';

export interface ExplorerObject {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
}

export class ObjectExplorer {
  private container: HTMLElement;
  private listElement!: HTMLElement;
  private detailsElement!: HTMLElement;
  private isOpen: boolean = false;
  private gameLoop: GameLoop;
  private refreshInterval?: number;

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
            <div class="explorer-list-header">Objects</div>
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

    // Coordinate search: enter "x,y" to jump to a tile
    const searchInput = this.container.querySelector('#explorer-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.searchTile(searchInput.value.trim());
        }
      });
    }
    
    // Add to the main UI overlay
    const overlay = document.getElementById('ui-overlay');
    if (overlay) {
      overlay.appendChild(this.container);
    }
  }

  public show(): void {
    this.container.classList.remove('hidden');
    this.container.classList.add('active');
    this.isOpen = true;
    this.startRefreshLoop();
  }

  public hide(): void {
    this.container.classList.add('hidden');
    this.container.classList.remove('active');
    this.isOpen = false;
    this.stopRefreshLoop();
  }

  public toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  private startRefreshLoop(): void {
    this.stopRefreshLoop();
    this.refreshInterval = window.setInterval(() => {
      this.refresh();
    }, 1000);
  }

  private stopRefreshLoop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  private refresh(): void {
    const objects: ExplorerObject[] = [];

    // Add Buildings
    for (const building of this.gameLoop.economy.getCompleteBuildings()) {
      objects.push({
        id: building.index.toString(),
        type: 'building',
        name: building.kind.toString(),
        properties: {
          x: building.x,
          y: building.y,
          hp: `${building.hp}/${building.maxHp}`,
          active: building.isActive,
          progress: `${Math.floor(building.productionProgress * 100)}%`,
        }
      });
    }

    // Add Units
    for (const unit of this.gameLoop.unitManager.getAliveUnits()) {
      objects.push({
        id: unit.id.toString(),
        type: 'unit',
        name: unit.kind.toString(),
        properties: {
          x: unit.x,
          y: unit.y,
          hp: unit.hp,
          state: unit.state,
          rank: unit.rank,
        }
      });
    }

    // Add Terrain Tiles — grouped by terrain type
    const map = this.gameLoop.map;
    const terrainGroups = new Map<string, ExplorerObject[]>();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.get(x, y);
        if (!tile) continue;
        const terrainName = tile.terrain.toString();
        if (!terrainGroups.has(terrainName)) {
          terrainGroups.set(terrainName, []);
        }
        const coord = `${x},${y}`;
        const obj: ExplorerObject = {
          id: coord,
          type: 'terrain',
          name: coord,
          properties: {
            terrain: terrainName,
            elevation: tile.elevation.toFixed(2),
            resource: tile.resource?.toString() ?? 'none',
            visibility: tile.visibility,
            territory: tile.territory,
          }
        };
        terrainGroups.get(terrainName)!.push(obj);
      }
    }

    // Sort terrain groups by name, add as collapsible group entries
    const sortedGroups = [...terrainGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [terrainName, tiles] of sortedGroups) {
      // Group header — clicking expands to show tiles
      const groupId = `terrain-group-${terrainName}`;
      objects.push({
        id: groupId,
        type: `terrain-group`,
        name: `${terrainName} (${tiles.length} tiles)`,
        properties: { groupId, terrainName, tileCount: tiles.length, expanded: false }
      });
    }

    this.updateList(objects, terrainGroups);
  }

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
    const obj: ExplorerObject = {
      id: `${x},${y}`,
      type: 'terrain',
      name: `${x},${y}`,
      properties: {
        terrain: tile.terrain.toString(),
        elevation: tile.elevation.toFixed(2),
        resource: tile.resource?.toString() ?? 'none',
        visibility: tile.visibility,
        territory: tile.territory,
      }
    };
    this.showDetails(obj);
  }

  /**
   * Updates the list of objects in the explorer.
   */
  public updateList(objects: ExplorerObject[], terrainGroups?: Map<string, ExplorerObject[]>): void {
    this.listElement.innerHTML = '';
    
    objects.forEach(obj => {
      const item = document.createElement('div');
      if (obj.type === 'terrain-group') {
        // Expandable terrain group
        item.className = 'explorer-item explorer-item-group';
        item.innerHTML = `
          <span class="explorer-item-type">[terrain]</span>
          <span class="explorer-item-name">${obj.name}</span>
          <span class="explorer-expand-arrow" data-groupid="${obj.properties.groupId}">▶</span>
        `;
        item.addEventListener('click', () => {
          const expanded = obj.properties.expanded;
          obj.properties.expanded = !expanded;
          const arrow = item.querySelector('.explorer-expand-arrow') as HTMLElement;
          if (obj.properties.expanded) {
            arrow.textContent = '▼';
            this.insertTerrainTiles(obj.properties.terrainName, terrainGroups);
          } else {
            arrow.textContent = '▶';
            this.collapseTerrainTiles(obj.properties.terrainName);
          }
        });
      } else {
        item.className = 'explorer-item';
        item.innerHTML = `
          <span class="explorer-item-type">[${obj.type}]</span>
          <span class="explorer-item-name">${obj.name}</span>
        `;
        item.addEventListener('click', () => this.showDetails(obj));
      }
      this.listElement.appendChild(item);
    });
  }

  private insertTerrainTiles(terrainName: string, terrainGroups?: Map<string, ExplorerObject[]>): void {
    if (!terrainGroups) return;
    const tiles = terrainGroups.get(terrainName);
    if (!tiles) return;

    // Find the group header element and insert tiles after it
    const groupId = `terrain-group-${terrainName}`;
    for (let i = 0; i < this.listElement.children.length; i++) {
      const child = this.listElement.children[i];
      if (child.querySelector(`[data-groupid="${groupId}"]`)) {
        // Remove any existing tile children for this group
        let next = child.nextElementSibling;
        while (next && next.classList.contains('explorer-item-terrain')) {
          const toRemove = next;
          next = next.nextElementSibling;
          toRemove.remove();
        }

        // Insert tiles (paginated: first 50)
        const maxTiles = 50;
        for (let j = 0; j < Math.min(tiles.length, maxTiles); j++) {
          const tile = tiles[j];
          const tileItem = document.createElement('div');
          tileItem.className = 'explorer-item explorer-item-terrain';
          tileItem.innerHTML = `
            <span class="explorer-item-type">[tile]</span>
            <span class="explorer-item-name">${tile.name}</span>
          `;
          tileItem.addEventListener('click', () => this.showDetails(tile));
          this.listElement.insertBefore(tileItem, next);
        }

        if (tiles.length > maxTiles) {
          const moreItem = document.createElement('div');
          moreItem.className = 'explorer-item explorer-item-terrain explorer-item-more';
          moreItem.innerHTML = `<span class="explorer-item-name">… ${tiles.length - maxTiles} more tiles (use search for specific coords)</span>`;
          this.listElement.insertBefore(moreItem, next);
        }
        break;
      }
    }
  }

  private collapseTerrainTiles(terrainName: string): void {
    const groupId = `terrain-group-${terrainName}`;
    for (let i = 0; i < this.listElement.children.length; i++) {
      const child = this.listElement.children[i];
      if (child.querySelector(`[data-groupid="${groupId}"]`)) {
        let next = child.nextElementSibling;
        while (next && next.classList.contains('explorer-item-terrain')) {
          const toRemove = next;
          next = next.nextElementSibling;
          toRemove.remove();
        }
        break;
      }
    }
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