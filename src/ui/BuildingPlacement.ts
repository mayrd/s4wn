/**
 * S4WN Babylon.js/TypeScript - Building Placement UI
 *
 * In-game building palette panel: select a building type from categorized tabs,
 * then click on the terrain to place it (with resource and territory checks).
 *
 * Supports ghost preview — when a building is selected, `ghostX / ghostY`
 * track the tile under the cursor for an external 3D ghost mesh.
 */

import { BuildingType, buildingName, buildCost, resourceName, VALID_BUILDING_DISCRIMINANTS, nationForBuilding } from '../economy/types';
import { Map as GameMap } from '../game/Map';
import { Economy } from '../game/Economy';
import { Scene, MeshBuilder, StandardMaterial, Color3, Mesh } from '@babylonjs/core';

// ── Building Categorisation ──────────────────────────────────────

export interface BuildingCategory {
  id: string;
  label: string;
  buildings: BuildingType[];
}

export function getBuildingCategories(): BuildingCategory[] {
  return [
    {
      id: 'basic',
      label: 'Basic',
      buildings: [
        BuildingType.Woodcutter,
        BuildingType.Forester,
        BuildingType.Sawmill,
        BuildingType.Stonecutter,
      ],
    },
    {
      id: 'food',
      label: 'Food',
      buildings: [
        BuildingType.Farm,
        BuildingType.Mill,
        BuildingType.Bakery,
        BuildingType.Slaughterhouse,
        BuildingType.Fisherman,
        BuildingType.Waterworks,
      ],
    },
    {
      id: 'mining',
      label: 'Mining',
      buildings: [
        BuildingType.CoalMine,
        BuildingType.IronOreMine,
        BuildingType.GoldMine,
        BuildingType.SulfurMine,
        BuildingType.IronSmelter,
        BuildingType.GoldSmelter,
      ],
    },
    {
      id: 'military',
      label: 'Military',
      buildings: [
        BuildingType.Toolsmith,
        BuildingType.Weaponsmith,
        BuildingType.Barracks,
        BuildingType.GuardTower,
        BuildingType.Fortress,
        BuildingType.Healer,
      ],
    },
    {
      id: 'logistics',
      label: 'Logistics',
      buildings: [
        BuildingType.SmallResidence,
        BuildingType.MediumResidence,
        BuildingType.LargeResidence,
        BuildingType.StorageYard,
        BuildingType.Storehouse,
        BuildingType.Marketplace,
        BuildingType.Shipyard,
      ],
    },
  ];
}

// ── Building Placement UI ────────────────────────────────────────

export class BuildingPlacement {
  private economy: Economy;
  private map: GameMap;
  private ownerId: number;
  private canvas: HTMLCanvasElement;
  private playerNation: number;

  private panel: HTMLElement;
  private toggleBtn: HTMLElement;
  private visible: boolean = false;
  private selectedBuilding: BuildingType | null = null;
  private activeCategory: string = 'basic';

  /** Ghost preview position (tile coords the cursor is hovering over). */
  private _ghostX: number = -1;
  private _ghostY: number = -1;
  private ghostActive: boolean = false;

  /** Whether the tile under the ghost cursor is a valid placement site. */
  private _isValidGhostPlacement: boolean = false;

  /** Babylon.js scene for ray-casting pointer events and 3D ghost preview.
   *  Optional — when set, onPointerDown places buildings at the picked terrain
   *  location instead of the fallback (50, 50), and a semi-transparent ghost
   *  mesh previews the selected building at the cursor tile. */
  private scene: Scene | null = null;

  /** Ghost preview mesh (semi-transparent box at cursor tile). */
  private ghostMesh: Mesh | null = null;

  // Bound handlers for cleanup
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerDown: (e: PointerEvent) => void;

  constructor(
    economy: Economy,
    map: GameMap,
    ownerId: number,
    canvas: HTMLCanvasElement,
    scene?: Scene,
    playerNation: number = 0
  ) {
    this.economy = economy;
    this.map = map;
    this.ownerId = ownerId;
    this.canvas = canvas;
    this.scene = scene ?? null;
    this.playerNation = playerNation;

    this.panel = this.createPanel();
    this.toggleBtn = this.createToggleButton();

    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerDown = this.onPointerDown.bind(this);
  }

  /** Returns the current ghost preview tile X, or -1 if not hovering. */
  get ghostX(): number { return this._ghostX; }
  /** Returns the current ghost preview tile Y, or -1 if not hovering. */
  get ghostY(): number { return this._ghostY; }

  /** Whether ghost preview is currently active (building selected + hovering). */
  get isGhostActive(): boolean { return this.ghostActive && this.selectedBuilding !== null && this._ghostX >= 0; }

  /** Whether the current ghost preview tile is a valid placement site. */
  get isValidGhostPlacement(): boolean { return this._isValidGhostPlacement; }

  /**
   * Check all placement constraints for a tile:
   * - Tile in bounds
   * - Terrain is buildable (not water/swamp)
   * - Owned by player's territory
   * - No building already at that tile
   * - Player can afford the building
   */
  isValidPlacement(kind: BuildingType, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return false;
    if (!this.map.isBuildable(x, y)) return false;
    const tile = this.map.get(x, y);
    if (!tile || tile.territory !== this.ownerId) return false;
    if (!this.canAffordBuilding(kind)) return false;
    // Check for collision with existing buildings
    for (const b of this.economy.buildings) {
      if (b.x === x && b.y === y) return false;
    }
    return true;
  }

  // ── Tutorial Hooks ─────────────────────────────────────────────

  lockAllTabs(): void {
    const tabs = this.panel.querySelectorAll('.bp-category-tab');
    tabs.forEach(tab => {
      (tab as HTMLButtonElement).disabled = true;
      (tab as HTMLElement).style.opacity = '0.5';
      (tab as HTMLElement).style.pointerEvents = 'none';
    });
  }

  unlockSpecificTab(categoryId: string): void {
    const tab = this.panel.querySelector(`.bp-category-tab[data-category="${categoryId}"]`) as HTMLButtonElement;
    if (tab) {
      tab.disabled = false;
      tab.style.opacity = '1';
      tab.style.pointerEvents = 'auto';
    }
  }

  lockAllBuildings(): void {
    const btns = this.panel.querySelectorAll('.bp-building-btn');
    btns.forEach(btn => {
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLElement).style.opacity = '0.5';
      (btn as HTMLElement).style.pointerEvents = 'none';
    });
  }

  unlockSpecificBuilding(kind: BuildingType): void {
    const btn = this.panel.querySelector(`.bp-building-btn[data-kind="${kind}"]`) as HTMLButtonElement;
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }

  // ── Toggle ─────────────────────────────────────────────────────

  toggle(): void {
    this.visible = !this.visible;
    if (this.visible) {
      this.panel.classList.remove('hidden');
      this.renderCategory(this.activeCategory);
      this.attachPointerListeners();
    } else {
      this.panel.classList.add('hidden');
      this.selectedBuilding = null;
      this.ghostActive = false;
      this._ghostX = -1;
      this._ghostY = -1;
      this._isValidGhostPlacement = false;
      this.destroyGhostMesh();
      this.detachPointerListeners();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  getSelectedBuilding(): BuildingType | null {
    return this.selectedBuilding;
  }

  // ── Affordability ──────────────────────────────────────────────

  canAffordBuilding(kind: BuildingType): boolean {
    return this.economy.canAfford(buildCost(kind));
  }

  getAllPlaceableBuildings(): BuildingType[] {
    return VALID_BUILDING_DISCRIMINANTS.filter(d => {
      const cost = buildCost(d as BuildingType);
      return cost.length > 0;
    });
  }

  // ── Panel Creation ─────────────────────────────────────────────

  private createToggleButton(): HTMLElement {
    const btn = document.createElement('button');
    btn.id = 'btn-building-palette';
    btn.className = 'hud-btn';
    btn.title = 'Building Palette';
    btn.textContent = '🏗️';
    btn.style.display = 'none'; // Hidden from top-left, integrated into bottom menu
    btn.addEventListener('click', () => this.toggle());

    const actions = document.querySelector('.hud-actions');
    if (actions) {
      actions.appendChild(btn);
    } else {
      const overlay = document.getElementById('ui-overlay');
      if (overlay) overlay.appendChild(btn);
    }

    const style = document.createElement('style');
    style.id = 'building-palette-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);

    return btn;
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'building-palette';
    panel.className = 'building-palette-panel hidden';
    panel.innerHTML = `
      <div class="bp-header">
        <span class="bp-title">Buildings</span>
        <button class="bp-close">&times;</button>
      </div>
      <div class="bp-tabs" id="bp-tabs"></div>
      <div class="bp-content" id="bp-content"></div>
    `;

    panel.querySelector('.bp-close')?.addEventListener('click', () => this.toggle());

    const overlay = document.getElementById('ui-overlay');
    if (overlay) {
      overlay.appendChild(panel);
    }

    return panel;
  }

  private renderCategory(categoryId: string): void {
    this.activeCategory = categoryId;

    const tabsEl = this.panel.querySelector('#bp-tabs')!;
    const categories = getBuildingCategories();
    // Include medal icon span for each category tab
    tabsEl.innerHTML = categories.map(cat => {
      const active = cat.id === categoryId ? ' active' : '';
      return `<button class="bp-category-tab${active}" data-category="${cat.id}"><span class="bp-medal-icon"></span><span class="bp-category-label">${cat.label}</span></button>`;
    }).join('');

    tabsEl.querySelectorAll('.bp-category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const catId = (e.target as HTMLElement).dataset.category!;
        this.renderCategory(catId);
      });
    });

    const contentEl = this.panel.querySelector('#bp-content')!;
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const validBuildings = cat.buildings.filter(kind => {
      const n = nationForBuilding(kind);
      return n === null || n === this.playerNation;
    });

    contentEl.innerHTML = validBuildings.map(kind => {
      const cost = buildCost(kind);
      const name = buildingName(kind);
      const affordable = this.canAffordBuilding(kind);
      const costStr = cost.map(c =>
        `${c.amount} ${resourceName(c.resource)}`
      ).join(', ');
      const selected = kind === this.selectedBuilding ? ' selected' : '';
      const disabledClass = !affordable ? ' unaffordable' : '';

      return `<button class="bp-building-btn${selected}${disabledClass}" data-kind="${kind}" title="${name}: ${costStr}">
        <span class="bp-building-name">${name}</span>
        <span class="bp-cost">${costStr}</span>
      </button>`;
    }).join('');

    contentEl.querySelectorAll('.bp-building-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kind = parseInt((e.currentTarget as HTMLElement).dataset.kind!) as BuildingType;
        this.selectBuilding(kind);
      });
    });
  }

  public selectBuilding(kind: BuildingType): void {
    if (this.selectedBuilding === kind) {
      this.selectedBuilding = null;
      this.ghostActive = false;
      this._ghostX = -1;
      this._ghostY = -1;
      this._isValidGhostPlacement = false;
      this.destroyGhostMesh();
    } else {
      this.selectedBuilding = kind;
      this.ghostActive = true;
      this._isValidGhostPlacement = false;
      this.destroyGhostMesh(); // clear any previous ghost
    }
    this.renderCategory(this.activeCategory);
  }

  // ── Pointer Interaction (Scene Picking) ─────────────────────────

  private attachPointerListeners(): void {
    this.canvas.addEventListener('pointermove', this.boundPointerMove);
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
  }

  private detachPointerListeners(): void {
    this.canvas.removeEventListener('pointermove', this.boundPointerMove);
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
  }

  /** Pick the terrain tile under the pointer. Returns {x,y} tile coords
   *  or null if no terrain was hit. */
  private pickTile(e: PointerEvent): { x: number; y: number } | null {
    if (!this.scene) return null;

    const pointerInfo = this.scene.pick(e.offsetX, e.offsetY);
    if (!pointerInfo?.hit || !pointerInfo.pickedPoint) return null;

    // Snap the world-space hit point to the nearest tile centre
    const worldX = pointerInfo.pickedPoint.x;
    const worldZ = pointerInfo.pickedPoint.z;
    const tileX = Math.round(worldX);
    const tileY = Math.round(worldZ);

    // Bounds check
    if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
      return null;
    }

    return { x: tileX, y: tileY };
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.visible || !this.ghostActive || !this.selectedBuilding) {
      return;
    }

    const tile = this.pickTile(e);
    if (tile) {
      this._ghostX = tile.x;
      this._ghostY = tile.y;
      // Evaluate placement validity for the current tile
      this._isValidGhostPlacement = this.isValidPlacement(this.selectedBuilding, tile.x, tile.y);
      this.createOrUpdateGhost();
    } else {
      this._ghostX = -1;
      this._ghostY = -1;
      this._isValidGhostPlacement = false;
      this.destroyGhostMesh();
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.visible || !this.selectedBuilding) return;

    const kind = this.selectedBuilding;
    const cost = buildCost(kind);

    if (!this.economy.canAfford(cost)) return;

    // Determine placement position via scene picking, fallback to (50, 50)
    let placeX = 50;
    let placeY = 50;

    const tile = this.pickTile(e);
    if (tile) {
      placeX = tile.x;
      placeY = tile.y;
    }

    // Pre-validate placement (duplicated in tryPlaceBuilding for defense in depth)
    if (!this.isValidPlacement(kind, placeX, placeY)) return;

    const placed = this.economy.tryPlaceBuilding(kind, placeX, placeY, this.map, this.ownerId);
    if (!placed) return;

    // Dispatch event so GameApp/GameLoop can create the 3D mesh
    window.dispatchEvent(new CustomEvent('building-placed', {
      detail: { kind, x: placed.x, y: placed.y, building: placed }
    }));

    // Stay in placement mode for quick multi-placement
    this.renderCategory(this.activeCategory);
  }

  // ── Ghost Preview Mesh ─────────────────────────────────────────

  /**
   * Create or reposition the semi-transparent ghost mesh at the current
   * ghost tile.  Called on pointer-move while a building is selected.
   */
  private createOrUpdateGhost(): void {
    if (!this.scene || !this.ghostActive || this._ghostX < 0) {
      return;
    }

    if (!this.ghostMesh) {
      // Create a semi-transparent box that previews the building footprint
      const kindName = this.selectedBuilding !== null
        ? buildingName(this.selectedBuilding)
        : 'building';

      this.ghostMesh = MeshBuilder.CreateBox(
        `ghost-${kindName}`,
        { width: 2, height: 2, depth: 2 },
        this.scene
      );

      const mat = new StandardMaterial('ghostMat', this.scene);
      mat.wireframe = false;
      this.ghostMesh.material = mat;
      this.ghostMesh.isPickable = false;                 // Don't intercept picks
    }

    // Update tint: green for valid placement, red for invalid
    const mat = this.ghostMesh.material as StandardMaterial;
    if (this._isValidGhostPlacement) {
      mat.diffuseColor = new Color3(0.3, 0.8, 0.3);     // Green tint
      mat.alpha = 0.35;
    } else {
      mat.diffuseColor = new Color3(0.9, 0.2, 0.2);     // Red tint
      mat.alpha = 0.45;                                   // Slightly more opaque for visibility
    }

    // Snap to tile centre at ground level (y=1 for half-box height).
    this.ghostMesh.position.set(this._ghostX, 1, this._ghostY);
  }

  /** Dispose the ghost preview mesh and reset state. */
  private destroyGhostMesh(): void {
    if (this.ghostMesh) {
      this.ghostMesh.material?.dispose();
      this.ghostMesh.dispose();
      this.ghostMesh = null;
    }
  }

  dispose(): void {
    this.detachPointerListeners();
    this.destroyGhostMesh();
    this.panel.remove();
    this.toggleBtn.remove();
    const style = document.getElementById('building-palette-styles');
    if (style) style.remove();
  }

  // ── Styles ─────────────────────────────────────────────────────

  private getStyles(): string {
    return `
      .building-palette-panel {
        position: absolute;
        right: 10px;
        top: 10px;
        width: 260px;
        max-height: 80vh;
        background: rgba(93, 64, 55, 0.92);
        border: 2px solid #d2b48c;
        border-radius: 8px;
        color: #f4e4bc;
        font-family: 'Georgia', serif;
        z-index: 25;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        pointer-events: auto;
      }
      .building-palette-panel.hidden { display: none; }

      .bp-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px;
        background: rgba(139, 90, 43, 0.6);
        border-bottom: 1px solid #d2b48c;
      }
      .bp-title {
        font-weight: bold;
        font-size: 1.05rem;
      }
      .bp-close {
        background: none;
        border: none;
        color: #f4e4bc;
        font-size: 1.3rem;
        cursor: pointer;
        padding: 0 4px;
      }
      .bp-close:hover { color: #ff6b6b; }

      .bp-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        padding: 4px;
        background: rgba(0,0,0,0.2);
      }
      .bp-category-tab {
        flex: 1;
        min-width: 40px;
        background: rgba(139, 90, 43, 0.4);
        border: 1px solid #8b5a2b;
        border-radius: 3px;
        color: #d2b48c;
        padding: 4px 6px;
        font-size: 0.75rem;
        cursor: pointer;
        font-family: 'Georgia', serif;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .bp-category-tab.active {
        background: rgba(210, 180, 140, 0.3);
        border-color: #d2b48c;
        color: #fff;
      }
      .bp-category-tab:hover { background: rgba(210, 180, 140, 0.2); }

      .bp-medal-icon {
        width: 16px;
        height: 16px;
        background: url('/textures/ui_medals.png') 0 0 / 192px 32px;
        flex: 0 0 auto;
        opacity: 0.9;
      }
      .bp-category-tab[data-category="basic"] .bp-medal-icon { background-position: 0 0; }
      .bp-category-tab[data-category="food"] .bp-medal-icon { background-position: -32px 0; }
      .bp-category-tab[data-category="mining"] .bp-medal-icon { background-position: -64px 0; }
      .bp-category-tab[data-category="military"] .bp-medal-icon { background-position: -96px 0; }
      .bp-category-tab[data-category="logistics"] .bp-medal-icon { background-position: -128px 0; }

      .bp-content {
        flex: 1;
        overflow-y: auto;
        padding: 6px;
      }
      .bp-building-btn {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        background: rgba(139, 90, 43, 0.25);
        border: 1px solid #8b5a2b;
        border-radius: 4px;
        color: #f4e4bc;
        padding: 6px 8px;
        margin-bottom: 3px;
        cursor: pointer;
        font-family: 'Georgia', serif;
        font-size: 0.82rem;
        text-align: left;
      }
      .bp-building-btn:hover { background: rgba(210, 180, 140, 0.2); }
      .bp-building-btn.selected {
        background: rgba(210, 180, 140, 0.35);
        border-color: #d2b48c;
        box-shadow: 0 0 4px rgba(210, 180, 140, 0.5);
      }
      .bp-building-btn.unaffordable {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .bp-building-name {
        font-weight: bold;
      }
      .bp-cost {
        font-size: 0.7rem;
        color: #c4a86c;
        margin-left: 8px;
        text-align: right;
      }
    `;
  }
}
