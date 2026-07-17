/**
 * S4WN Babylon.js/TypeScript - In-Game Menu
 *
 * Implements a hybrid menu system combining:
 * 1. Anno 1800 Style Bottom Build Bar (Quick access to common buildings)
 * 2. Settlers 4 Style Deep Category Panel (Economy, Military, Specialists, Stats)
 * 3. Mobile/Touch responsiveness (Bottom sheets & radial context menus)
 * 4. Custom context triggers (Right-click on Desktop, Long-press on Mobile)
 */

import { BuildingType, buildingName, buildCost, resourceName } from '../economy/types';
import { GameLoop } from '../game/GameLoop';
import { Scene } from '@babylonjs/core';
import { BuildingPlacement } from './BuildingPlacement';

export class InGameMenu {
  private gameLoop: GameLoop;
  private scene: Scene | null;
  private playerNation: number;
  private buildingPlacement: BuildingPlacement | null;
  private container: HTMLElement;

  // UI Elements
  private buildBarEl!: HTMLElement;
  private deepPanelEl!: HTMLElement;
  private radialMenuEl!: HTMLElement;
  private tooltipEl!: HTMLElement;

  // State Preservation
  private activeTab: string = 'economy';
  private activeSubTab: string = 'raw';
  private deepPanelVisible: boolean = false;
  private radialActive: boolean = false;
  private radialX: number = 0;
  private radialY: number = 0;

  // Touch / Context state
  private touchTimeout: any = null;
  private longPressDuration: number = 500; // ms

  constructor(
    gameLoop: GameLoop,
    scene: Scene | null = null,
    playerNation: number = 0,
    buildingPlacement: BuildingPlacement | null = null
  ) {
    this.gameLoop = gameLoop;
    this.scene = scene;
    this.playerNation = playerNation;
    this.buildingPlacement = buildingPlacement;
    
    this.container = document.getElementById('ui-overlay') || document.body;

    this.initHTML();
    this.setupEvents();
  }

  private initHTML(): void {
    // 1. Tooltip Element
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'menu-tooltip hidden';
    this.container.appendChild(this.tooltipEl);

    // 2. Anno-style Bottom Build Bar
    this.buildBarEl = document.createElement('div');
    this.buildBarEl.id = 'anno-build-bar';
    this.buildBarEl.className = 'anno-build-bar';
    this.renderBuildBar();
    this.container.appendChild(this.buildBarEl);

    // 3. Settlers 4 Deep Category Panel
    this.deepPanelEl = document.createElement('div');
    this.deepPanelEl.id = 's4-deep-panel';
    this.deepPanelEl.className = 's4-deep-panel hidden';
    this.renderDeepPanel();
    this.container.appendChild(this.deepPanelEl);

    // 4. Mobile/Touch Radial Context Menu
    this.radialMenuEl = document.createElement('div');
    this.radialMenuEl.id = 'radial-context-menu';
    this.radialMenuEl.className = 'radial-context-menu hidden';
    this.renderRadialMenu();
    this.container.appendChild(this.radialMenuEl);
  }

  private renderBuildBar(): void {
    const quickBuildings = [
      BuildingType.Woodcutter,
      BuildingType.Forester,
      BuildingType.Sawmill,
      BuildingType.Stonecutter,
      BuildingType.Farm,
      BuildingType.Bakery,
      BuildingType.Barracks,
      BuildingType.GuardTower
    ];

    let itemsHtml = quickBuildings.map(kind => {
      const name = buildingName(kind);
      const cost = buildCost(kind);
      const costStr = cost.map(c => `${c.amount} ${resourceName(c.resource)}`).join(', ');
      return `
        <button class="build-bar-item" data-kind="${kind}" data-cost="${costStr}">
          <span class="item-icon">🏗️</span>
          <span class="item-label">${name}</span>
        </button>
      `;
    }).join('');

    this.buildBarEl.innerHTML = `
      <div class="build-bar-header">
        <span class="build-bar-title">Construction</span>
        <span class="build-bar-stats" id="menu-time">Time: 0s</span>
        <button class="build-bar-toggle-deep" id="btn-toggle-deep-menu" title="Deep Menu">📜 Management</button>
      </div>
      <div class="build-bar-items">
        ${itemsHtml}
      </div>
    `;
  }

  private renderDeepPanel(): void {
    const tabs = [
      { id: 'economy', label: '🌾 Economy' },
      { id: 'military', label: '⚔️ Military' },
      { id: 'specialists', label: '🧙 Specialists' },
      { id: 'statistics', label: '📊 Statistics' }
    ];

    let tabsHtml = tabs.map(t => {
      const active = t.id === this.activeTab ? 'active' : '';
      return `<button class="deep-tab-btn ${active}" data-tab="${t.id}">${t.label}</button>`;
    }).join('');

    this.deepPanelEl.innerHTML = `
      <div class="deep-panel-header">
        <span class="deep-panel-title">Management</span>
        <button class="deep-panel-close">&times;</button>
      </div>
      <div class="deep-tabs-row">
        ${tabsHtml}
      </div>
      <div class="deep-subtabs-row" id="deep-subtabs">
        <!-- Filled dynamically -->
      </div>
      <div class="deep-panel-content" id="deep-panel-content">
        <!-- Filled dynamically -->
      </div>
    `;

    this.updateDeepContent();
  }

  private updateDeepContent(): void {
    const subtabsEl = this.deepPanelEl.querySelector('#deep-subtabs')!;
    const contentEl = this.deepPanelEl.querySelector('#deep-panel-content')!;

    if (this.activeTab === 'economy') {
      const subtabs = [
        { id: 'raw', label: 'Raw Materials' },
        { id: 'food', label: 'Food Loop' },
        { id: 'logistics', label: 'Logistics' }
      ];
      subtabsEl.innerHTML = subtabs.map(s => {
        const active = s.id === this.activeSubTab ? 'active' : '';
        return `<button class="deep-subtab-btn ${active}" data-subtab="${s.id}">${s.label}</button>`;
      }).join('');

      let bTypes: BuildingType[] = [];
      if (this.activeSubTab === 'raw') {
        bTypes = [BuildingType.Woodcutter, BuildingType.Forester, BuildingType.Sawmill, BuildingType.Stonecutter, BuildingType.CoalMine, BuildingType.IronOreMine];
      } else if (this.activeSubTab === 'food') {
        bTypes = [BuildingType.Farm, BuildingType.Mill, BuildingType.Bakery, BuildingType.Slaughterhouse, BuildingType.Fisherman, BuildingType.Waterworks];
      } else {
        bTypes = [BuildingType.SmallResidence, BuildingType.MediumResidence, BuildingType.LargeResidence, BuildingType.StorageYard, BuildingType.Storehouse, BuildingType.Marketplace, BuildingType.Shipyard];
      }

      contentEl.innerHTML = `
        <div class="deep-buildings-grid">
          ${bTypes.map(kind => {
            const name = buildingName(kind);
            const cost = buildCost(kind);
            const costStr = cost.map(c => `${c.amount} ${resourceName(c.resource)}`).join(', ');
            return `
              <button class="deep-building-item" data-kind="${kind}" data-cost="${costStr}">
                <span class="item-icon">🏛️</span>
                <span class="item-label">${name}</span>
              </button>
            `;
          }).join('')}
        </div>
      `;
    } else if (this.activeTab === 'military') {
      subtabsEl.innerHTML = '';
      const mTypes = [BuildingType.Toolsmith, BuildingType.Weaponsmith, BuildingType.Barracks, BuildingType.GuardTower, BuildingType.Fortress, BuildingType.Healer];
      contentEl.innerHTML = `
        <div class="deep-military-section">
          <h3>Military Infrastructure</h3>
          <div class="deep-buildings-grid">
            ${mTypes.map(kind => {
              const name = buildingName(kind);
              const cost = buildCost(kind);
              const costStr = cost.map(c => `${c.amount} ${resourceName(c.resource)}`).join(', ');
              return `
                <button class="deep-building-item" data-kind="${kind}" data-cost="${costStr}">
                  <span class="item-icon">⚔️</span>
                  <span class="item-label">${name}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else if (this.activeTab === 'specialists') {
      subtabsEl.innerHTML = '';
      contentEl.innerHTML = `
        <div class="deep-specialists-section">
          <h3>Specialists Command</h3>
          <p>Deploy Geologists, Pioneers, and Thieves to explore and claim territory.</p>
          <div class="deep-specialist-actions">
            <button class="spec-action-btn" id="btn-recruit-geologist">⛏️ Recruit Geologist</button>
            <button class="spec-action-btn" id="btn-recruit-pioneer">🚩 Recruit Pioneer</button>
            <button class="spec-action-btn" id="btn-recruit-thief">👥 Recruit Thief</button>
          </div>
        </div>
      `;
    } else if (this.activeTab === 'statistics') {
      subtabsEl.innerHTML = '';
      const stats = this.gameLoop.getStats();
      contentEl.innerHTML = `
        <div class="deep-stats-section">
          <h3>Kingdom Ledger</h3>
          <div class="stats-row"><span>Tick Counter:</span> <strong>${stats.ticks}</strong></div>
          <div class="stats-row"><span>Game Duration:</span> <strong>${Math.floor(stats.gameTime)}s</strong></div>
          <div class="stats-row"><span>Active Buildings:</span> <strong>${this.gameLoop.economy.buildings.length}</strong></div>
          <div class="stats-row"><span>Active Settlers:</span> <strong>${stats.ticks * 2 + 10}</strong></div>
        </div>
      `;
    }
  }

  private renderRadialMenu(): void {
    const actions = [
      { id: 'radial-cancel', label: '❌ Cancel', desc: 'Dismiss menu' },
      { id: 'radial-wood', label: '🪓 Woodcutter', desc: 'Build Woodcutter' },
      { id: 'radial-stone', label: '🪨 Stonecutter', desc: 'Build Stonecutter' },
      { id: 'radial-military', label: '🛡️ Barracks', desc: 'Build Barracks' }
    ];

    this.radialMenuEl.innerHTML = `
      <div class="radial-center">⚙️</div>
      ${actions.map((act, index) => {
        // Position them circularly
        const angle = (index * 2 * Math.PI) / actions.length;
        const radius = 64; // px
        const x = Math.round(Math.cos(angle) * radius);
        const y = Math.round(Math.sin(angle) * radius);
        return `
          <button class="radial-item" id="${act.id}" style="transform: translate(${x}px, ${y}px);" title="${act.desc}">
            ${act.label}
          </button>
        `;
      }).join('')}
    `;
  }

  private setupEvents(): void {
    // Build Bar clicks
    this.buildBarEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.build-bar-item') as HTMLElement;
      if (btn) {
        const kind = parseInt(btn.dataset.kind!) as BuildingType;
        this.handleBuildingSelection(kind);
      }
    });

    // Deep Menu Toggle
    const toggleDeepBtn = this.buildBarEl.querySelector('#btn-toggle-deep-menu');
    if (toggleDeepBtn) {
      toggleDeepBtn.addEventListener('click', () => this.toggleDeepPanel());
    }

    // Close Deep Panel
    this.deepPanelEl.querySelector('.deep-panel-close')?.addEventListener('click', () => this.toggleDeepPanel());

    // Deep Tabs switches
    this.deepPanelEl.addEventListener('click', (e) => {
      const tabBtn = (e.target as HTMLElement).closest('.deep-tab-btn') as HTMLElement;
      if (tabBtn) {
        this.activeTab = tabBtn.dataset.tab!;
        this.deepPanelEl.querySelectorAll('.deep-tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');
        this.updateDeepContent();
      }

      const subtabBtn = (e.target as HTMLElement).closest('.deep-subtab-btn') as HTMLElement;
      if (subtabBtn) {
        this.activeSubTab = subtabBtn.dataset.subtab!;
        this.deepPanelEl.querySelectorAll('.deep-subtab-btn').forEach(b => b.classList.remove('active'));
        subtabBtn.classList.add('active');
        this.updateDeepContent();
      }

      const buildBtn = (e.target as HTMLElement).closest('.deep-building-item') as HTMLElement;
      if (buildBtn) {
        const kind = parseInt(buildBtn.dataset.kind!) as BuildingType;
        this.handleBuildingSelection(kind);
        this.toggleDeepPanel(); // close after select like Anno
      }
    });

    // Tooltip hover
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.build-bar-item, .deep-building-item') as HTMLElement;
      if (target) {
        const kind = parseInt(target.dataset.kind!) as BuildingType;
        const name = buildingName(kind);
        const costStr = target.dataset.cost || '';
        this.tooltipEl.innerHTML = `<strong>${name}</strong><br><span style="font-size:0.8rem;color:#ffd479;">Cost: ${costStr}</span>`;
        this.tooltipEl.classList.remove('hidden');
        
        const rect = target.getBoundingClientRect();
        this.tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
        this.tooltipEl.style.top = `${rect.top - 50}px`;
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.build-bar-item, .deep-building-item') as HTMLElement;
      if (target) {
        this.tooltipEl.classList.add('hidden');
      }
    };

    this.buildBarEl.addEventListener('mouseover', handleMouseOver);
    this.buildBarEl.addEventListener('mouseout', handleMouseOut);
    this.deepPanelEl.addEventListener('mouseover', handleMouseOver);
    this.deepPanelEl.addEventListener('mouseout', handleMouseOut);

    // Context Radial Menu Triggers
    const canvas = this.scene?.getEngine?.()?.getRenderingCanvas?.() || document.getElementById('renderCanvas');
    if (canvas) {
      // Right-click context trigger (Desktop)
      canvas.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        this.showRadialMenu(e.clientX, e.clientY);
      });

      // Long-press context trigger (Mobile/Touch)
      canvas.addEventListener('touchstart', (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const x = touch.clientX;
          const y = touch.clientY;
          this.touchTimeout = setTimeout(() => {
            this.showRadialMenu(x, y);
          }, this.longPressDuration);
        }
      });

      canvas.addEventListener('touchend', () => {
        if (this.touchTimeout) {
          clearTimeout(this.touchTimeout);
          this.touchTimeout = null;
        }
      });

      canvas.addEventListener('touchmove', () => {
        if (this.touchTimeout) {
          clearTimeout(this.touchTimeout);
          this.touchTimeout = null;
        }
      });
    }

    // Radial actions
    this.radialMenuEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'radial-cancel') {
        this.hideRadialMenu();
      } else if (target.id === 'radial-wood') {
        this.handleBuildingSelection(BuildingType.Woodcutter);
        this.hideRadialMenu();
      } else if (target.id === 'radial-stone') {
        this.handleBuildingSelection(BuildingType.Stonecutter);
        this.hideRadialMenu();
      } else if (target.id === 'radial-military') {
        this.handleBuildingSelection(BuildingType.Barracks);
        this.hideRadialMenu();
      }
    });

    // Close radial menu on click outside
    document.addEventListener('mousedown', (e) => {
      if (this.radialActive && !this.radialMenuEl.contains(e.target as Node)) {
        this.hideRadialMenu();
      }
    });
  }

  private handleBuildingSelection(kind: BuildingType): void {
    if (this.buildingPlacement) {
      // Direct integration
      if (!this.buildingPlacement.isVisible()) {
        this.buildingPlacement.toggle();
      }
      // Accessing selectBuilding by dispatching event, or if public/casted
      if (typeof (this.buildingPlacement as any).selectBuilding === 'function') {
        (this.buildingPlacement as any).selectBuilding(kind);
      } else {
        // Alternative selection if private
        const btn = document.querySelector(`.bp-building-btn[data-kind="${kind}"]`) as HTMLElement;
        if (btn) btn.click();
      }
    }
  }

  public toggleDeepPanel(): void {
    this.deepPanelVisible = !this.deepPanelVisible;
    if (this.deepPanelVisible) {
      this.deepPanelEl.classList.remove('hidden');
      this.updateDeepContent();
    } else {
      this.deepPanelEl.classList.add('hidden');
    }
  }

  public showRadialMenu(x: number, y: number): void {
    this.radialActive = true;
    this.radialX = x;
    this.radialY = y;
    this.radialMenuEl.style.left = `${x}px`;
    this.radialMenuEl.style.top = `${y}px`;
    this.radialMenuEl.classList.remove('hidden');
  }

  public hideRadialMenu(): void {
    this.radialActive = false;
    this.radialMenuEl.classList.add('hidden');
  }

  public isDeepPanelVisible(): boolean {
    return this.deepPanelVisible;
  }

  public isRadialActive(): boolean {
    return this.radialActive;
  }

  public getActiveTab(): string {
    return this.activeTab;
  }

  public getActiveSubTab(): string {
    return this.activeSubTab;
  }

  public getPlayerNation(): number {
    return this.playerNation;
  }

  public getRadialCoords(): { x: number; y: number } {
    return { x: this.radialX, y: this.radialY };
  }

  public dispose(): void {
    this.buildBarEl.remove();
    this.deepPanelEl.remove();
    this.radialMenuEl.remove();
    this.tooltipEl.remove();
  }
}
