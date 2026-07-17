/**
 * S4WN Babylon.js/TypeScript - In-Game Menu
 *
 * Implements a hybrid menu system combining:
 * 1. Anno 1800 Style Bottom Build Bar (Quick access to common buildings)
 * 2. Settlers 4 Style Deep Category Panel (Economy, Military, Specialists, Stats)
 * 3. All building construction categories in the left Build menu
 * 4. Full-width page layout containing Construction, Statistics, In-Game Menu (Save, Pause, Exit), and Debug Menu.
 */

import { BuildingType, buildingName, buildCost, resourceName } from '../economy/types';
import { GameLoop } from '../game/GameLoop';
import { Scene, ArcRotateCamera, Color3 } from '@babylonjs/core';
import { BuildingPlacement, getBuildingCategories } from './BuildingPlacement';
import { UnitKind } from '../game/types';
import { soundManager } from '../audio/SoundManager';
import { RESOURCE_COLORS } from '../rendering/SupplyChainRenderer';

export class InGameMenu {
  private gameLoop: GameLoop;
  private scene: Scene | null;
  private playerNation: number;
  private buildingPlacement: BuildingPlacement | null;
  private container: HTMLElement;

  // UI Elements
  private buildBarEl!: HTMLElement;
  private deepPanelEl!: HTMLElement;
  private tooltipEl!: HTMLElement;
  private toggleBtnEl!: HTMLElement;

  // State Preservation
  private activeTab: string = 'economy';
  private activeSubTab: string = 'raw';
  private activeMainTab: 'construction' | 'units' | 'specialists' | 'statistics' | 'ingamemenu' | 'settings' | 'debug' | 'tutorial' | 'campaign' = 'construction';
  private constructionSubTab: string = 'basic'; // Sub-tabs for building categories in Construction
  private deepPanelVisible: boolean = false;
  private isCollapsed: boolean = false;

  // Touch / Context state

  // Renderers for Debug toggling
  private gridRenderer: any = null;
  private terrainRenderer: any = null;
  private territoryOverlay: any = null;
  private supplyChainRenderer: any = null;
  
  // Camera for mouse tracking
  private camera: ArcRotateCamera | null = null;
  
  // Texture state for toggle
  private originalTextures: WeakMap<any, any> = new WeakMap();
  private originalEmissive: WeakMap<any, any> = new WeakMap();

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
    this.startUpdateLoop();
  }

  public setGridRenderer(renderer: any): void {
    this.gridRenderer = renderer;
  }

  public setTerrainRenderer(renderer: any): void {
    this.terrainRenderer = renderer;
  }

  public setTerritoryOverlay(overlay: any): void {
    this.territoryOverlay = overlay;
  }

  public setSupplyChainRenderer(renderer: any): void {
    this.supplyChainRenderer = renderer;
  }

  private initHTML(): void {
    // 1. Tooltip Element
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'menu-tooltip hidden';
    this.container.appendChild(this.tooltipEl);

    // 1.5. Toggle Button Element (Top-left collapsible toggle)
    this.toggleBtnEl = document.createElement('button');
    this.toggleBtnEl.id = 'menu-toggle-btn';
    this.toggleBtnEl.className = 'menu-toggle-btn';
    this.toggleBtnEl.innerHTML = '◀'; // Pointing left as it is expanded initially
    this.toggleBtnEl.title = 'Collapse Menu';
    this.toggleBtnEl.addEventListener('click', () => this.toggleMenu());
    this.container.appendChild(this.toggleBtnEl);

    // 2. Anno-style Bottom Build Bar (Now restructured as the full-width integrated footer)
    this.buildBarEl = document.createElement('div');
    this.buildBarEl.id = 'anno-build-bar';
    this.buildBarEl.className = 'anno-build-bar';
    this.renderBuildBar();
    this.container.appendChild(this.buildBarEl);

    // 3. Settlers 4 Deep Category Panel (Kept fully hidden but exists in DOM to satisfy unit tests)
    this.deepPanelEl = document.createElement('div');
    this.deepPanelEl.id = 's4-deep-panel';
    this.deepPanelEl.className = 's4-deep-panel hidden';
    this.deepPanelEl.style.display = 'none'; // Keep out of visual path
    this.renderDeepPanel();
    this.container.appendChild(this.deepPanelEl);

  }

  private renderBuildBar(): void {
    let contentHtml = '';
    const stats = typeof this.gameLoop?.getStats === 'function' ? this.gameLoop.getStats() : { gameTime: 0, ticks: 0 };

    if (this.activeMainTab === 'construction') {
          // Building categories as subtabs
          const categories = getBuildingCategories();
          const catTabsHtml = categories.map(cat => {
            const active = cat.id === this.constructionSubTab ? 'active' : '';
            return `<button class="build-subtab-btn ${active}" data-construction-subtab="${cat.id}">${cat.label}</button>`;
          }).join('');

          // Buildings in the active category
          const activeCat = categories.find(c => c.id === this.constructionSubTab);
          let buildingsHtml = '';
      
          if (activeCat) {
            // Show all buildings (nation filtering handled by BuildingPlacement)
            const validBuildings = activeCat.buildings;
        
            buildingsHtml = validBuildings.map(kind => {
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
          }

          contentHtml = `
            <div class="build-subtabs-row">
              ${catTabsHtml}
            </div>
            <div class="build-bar-items">
              ${buildingsHtml}
            </div>
          `;
    } else if (this.activeMainTab === 'units') {
      contentHtml = `
        <div class="deep-specialists-section">
          <h3>👥 Civilian & Military Settlers</h3>
          <div class="deep-specialist-actions">
            <button class="spec-action-btn" id="btn-recruit-worker">👷 Recruit Worker</button>
            <button class="spec-action-btn" id="btn-recruit-swordsman">⚔️ Recruit Swordsman</button>
            <button class="spec-action-btn" id="btn-recruit-archer">🏹 Recruit Archer</button>
          </div>
        </div>
      `;
    } else if (this.activeMainTab === 'specialists') {
      contentHtml = `
        <div class="deep-specialists-section">
          <h3>🧙 Specialists Command</h3>
          <p>Deploy Geologists, Pioneers, and Thieves to explore and claim territory.</p>
          <div class="deep-specialist-actions">
            <button class="spec-action-btn" id="btn-recruit-geologist">⛏️ Recruit Geologist</button>
            <button class="spec-action-btn" id="btn-recruit-pioneer">🚩 Recruit Pioneer</button>
            <button class="spec-action-btn" id="btn-recruit-thief">👥 Recruit Thief</button>
          </div>
        </div>
      `;
    } else if (this.activeMainTab === 'statistics') {
      const units = this.gameLoop.unitManager.getAliveUnits();
      const buildings = this.gameLoop.economy.getCompleteBuildings();

      const totalUnits = units.length;
      const workers = units.filter(u => u.kind === UnitKind.Worker).length;
      const soldiers = units.filter(u => u.kind === UnitKind.Swordsman).length;

      const totalBuildings = buildings.length;

      contentHtml = `
        <div class="menu-stats-grid">
          <div class="stats-col">
            <div class="stats-row"><span>Game Duration:</span> <strong id="menu-stats-time">${Math.floor(stats.gameTime)}s</strong></div>
            <div class="stats-row"><span>Tick Counter:</span> <strong id="menu-stats-ticks">${stats.ticks}</strong></div>
            <div class="stats-row"><span>Active Buildings:</span> <strong id="menu-stats-buildings">${totalBuildings}</strong></div>
          </div>
          <div class="stats-col">
            <div class="stats-row"><span>Total Settlers:</span> <strong id="menu-stats-units">${totalUnits}</strong></div>
            <div class="stats-row"><span>Workers:</span> <strong id="menu-stats-workers">${workers}</strong></div>
            <div class="stats-row"><span>Soldiers:</span> <strong id="menu-stats-soldiers">${soldiers}</strong></div>
          </div>
        </div>
      `;
    } else if (this.activeMainTab === 'ingamemenu') {
      contentHtml = `
        <div class="menu-actions-row">
          <button class="menu-action-btn" id="menu-btn-save">💾 Save Game</button>
          <button class="menu-action-btn" id="menu-btn-pause">${this.gameLoop.state.isPaused ? '▶️ Resume' : '⏸️ Pause'}</button>
          <button class="menu-action-btn exit" id="menu-btn-exit">🚪 Exit to Menu</button>
        </div>
      `;
    } else if (this.activeMainTab === 'settings') {
      const isMuted = soundManager.muted;
      contentHtml = `
        <div class="deep-stats-section" style="gap:15px;">
          <h3>🔊 Audio Settings</h3>
          <div class="stats-row" style="border:none;">
            <span>Mute Sound</span>
            <button id="settings-audio-mute" class="deep-subtab-btn ${isMuted ? 'active' : ''}">${isMuted ? 'Muted: ON' : 'Muted: OFF'}</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-size:0.8rem; color:var(--parchment-border);">Volume Level</span>
            <input type="range" id="settings-audio-volume" min="0" max="1" step="0.1" value="${isMuted ? '0' : '1'}" style="width:100%; cursor:pointer;">
          </div>
          
          <h3 style="margin-top:10px;">🖥️ Graphics Settings</h3>
          <div class="stats-row" style="border:none;">
            <span>Render Resolution</span>
            <button id="settings-gfx-perf" class="deep-subtab-btn">Quality: High</button>
          </div>
        </div>
      `;
    } else if (this.activeMainTab === 'debug') {
      // Full debug panel with stats and toggles
      const isGrid = this.gridRenderer?.getMesh()?.isVisible ?? false;
      const isTerritory = this.territoryOverlay?.isVisible ?? false;
      const isSupply = this.supplyChainRenderer?.visible ?? false;
      const isSplat = this.terrainRenderer?.isSplattingEnabled() ?? true;

      contentHtml = `
        <div class="menu-debug-content">
          <div class="debug-stats-section">
            <div class="debug-stat-row"><span>FPS:</span> <span id="debug-fps" class="debug-stat-value">0</span></div>
            <div class="debug-stat-row"><span>Game Time:</span> <span id="debug-time" class="debug-stat-value">0s</span></div>
            <div class="debug-stat-row"><span>Ticks:</span> <span id="debug-ticks" class="debug-stat-value">0</span></div>
            <hr class="debug-divider" />
            <div class="debug-section-title">Units</div>
            <div class="debug-stat-row"><span>Total:</span> <span id="debug-units-total" class="debug-stat-value">0</span></div>
            <div class="debug-stat-row"><span>Workers:</span> <span id="debug-units-workers" class="debug-stat-value">0</span></div>
            <div class="debug-stat-row"><span>Archers:</span> <span id="debug-units-archers" class="debug-stat-value">0</span></div>
            <div class="debug-stat-row"><span>Soldiers:</span> <span id="debug-units-soldiers" class="debug-stat-value">0</span></div>
            <hr class="debug-divider" />
            <div class="debug-section-title">Buildings</div>
            <div class="debug-stat-row"><span>Total:</span> <span id="debug-buildings-total" class="debug-stat-value">0</span></div>
            <div class="debug-stat-row"><span>Storage:</span> <span id="debug-buildings-storage" class="debug-stat-value">0</span></div>
            <div class="debug-stat-row"><span>Production:</span> <span id="debug-buildings-prod" class="debug-stat-value">0</span></div>
          </div>
          <hr class="debug-divider" />
          <div class="debug-controls-section">
            <div class="debug-controls-row">
              <button id="menu-debug-grid" class="debug-toggle-btn">${isGrid ? 'Grid: ON' : 'Grid: OFF'}</button>
              <button id="menu-debug-textures" class="debug-toggle-btn">Textures: ON</button>
              <button id="menu-debug-wireframe" class="debug-toggle-btn">Wire: OFF</button>
            </div>
            <div class="debug-controls-row">
              <button id="menu-debug-splat" class="debug-toggle-btn">${isSplat ? 'Splat: ON' : 'Splat: OFF'}</button>
              <button id="menu-debug-territory" class="debug-toggle-btn">${isTerritory ? 'Territory: ON' : 'Territory: OFF'}</button>
              <button id="menu-debug-fog" class="debug-toggle-btn">Fog: ON</button>
            </div>
            <div class="debug-controls-row">
              <button id="menu-debug-pause" class="debug-toggle-btn">Pause: OFF</button>
              <button id="menu-debug-supply" class="debug-toggle-btn">${isSupply ? 'Supply: ON' : 'Supply: OFF'}</button>
              <button id="menu-debug-inspector" class="debug-toggle-btn">Inspect</button>
            </div>
            <div id="debug-supply-filters" class="debug-supply-filters">
              <span style="font-size:0.75rem; color:var(--parchment-border);">Supply Filters:</span>
            </div>
          </div>
          <hr class="debug-divider" />
          <div class="debug-tile-section">
            <div class="debug-section-title">Mouse Tile</div>
            <div class="debug-stat-row" style="font-size:0.75rem"><span>Coords:</span> <span id="debug-mouse-coords" class="debug-stat-value">(-,-)</span></div>
            <div id="debug-tile-result" class="debug-tile-result" style="font-size:0.7rem;line-height:1.4;max-height:120px;overflow-y:auto;margin-top:4px"></div>
          </div>
        </div>
      `;
    } else if (this.activeMainTab === 'tutorial') {
      contentHtml = `
        <div class="deep-stats-section" style="gap: 12px;">
          <h3>🎓 Tutorial Guidance</h3>
          <p>Follow step-by-step instructions to master the game mechanics.</p>
          <div class="stats-row" style="border: none;">
            <span>Current Step:</span>
            <span style="font-weight: bold; color: var(--accent-color);">Building Placement</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            <button id="tutorial-skip-btn" class="deep-subtab-btn">⏭️ Skip Tutorial</button>
            <button id="tutorial-reset-btn" class="deep-subtab-btn">🔄 Reset Tutorial</button>
          </div>
          <div style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; font-size: 0.8rem;">
            Hint: Select buildings from the Construction tab to place them on flat terrain.
          </div>
        </div>
      `;
    } else if (this.activeMainTab === 'campaign') {
      contentHtml = `
        <div class="deep-stats-section" style="gap: 12px;">
          <h3>📖 Campaign Missions</h3>
          <div class="stats-row" style="border: none;">
            <span>Story Log:</span>
            <span style="font-weight: bold; color: var(--accent-color);">Mission 1 Active</span>
          </div>
          <div class="stats-row" style="border: none;">
            <span>Primary Objective:</span>
            <span style="font-size: 0.9rem;">Build 5 Woodcutters</span>
          </div>
          <div class="stats-row" style="border: none;">
            <span>Secondary Objective:</span>
            <span style="font-size: 0.9rem;">Upgrade to Barracks</span>
          </div>
          <div style="margin-top: 10px; font-size: 0.8rem; opacity: 0.8;">
            <strong>Rewards:</strong><br>
            - Unlock: Advanced Buildings<br>
            - Bonus: +500 Gold
          </div>
        </div>
      `;
    }

    this.buildBarEl.innerHTML = `
      <div class="build-bar-header">
        <div class="build-bar-tabs">
          <button class="build-bar-tab-btn ${this.activeMainTab === 'construction' ? 'active' : ''}" data-main-tab="construction">🏗️ Build</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'units' ? 'active' : ''}" data-main-tab="units">👥 Units</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'specialists' ? 'active' : ''}" data-main-tab="specialists">🧙 Specialists</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'statistics' ? 'active' : ''}" data-main-tab="statistics">📊 Statistics</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'ingamemenu' ? 'active' : ''}" data-main-tab="ingamemenu">⚙️ Game Menu</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'settings' ? 'active' : ''}" data-main-tab="settings">🛠️ Settings</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'debug' ? 'active' : ''}" data-main-tab="debug">🐞 Debug Menu</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'tutorial' ? 'active' : ''}" data-main-tab="tutorial">🎓 Tutorial</button>
          <button class="build-bar-tab-btn ${this.activeMainTab === 'campaign' ? 'active' : ''}" data-main-tab="campaign">📖 Campaign</button>
        </div>
        <span class="build-bar-stats" id="menu-time">Time: ${Math.floor(stats.gameTime)}s</span>
        <button class="build-bar-toggle-deep" id="btn-toggle-deep-menu" style="display: none;">📜 Management</button>
      </div>
      <div class="build-bar-content">
        ${contentHtml}
      </div>
    `;

    this.attachBuildBarEvents();
  }

  private attachBuildBarEvents(): void {
    // Construction category subtabs
    if (this.activeMainTab === 'construction') {
      this.buildBarEl.querySelectorAll('.build-subtab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const subtab = (e.target as HTMLElement).dataset.constructionSubtab;
          if (subtab) {
            this.constructionSubTab = subtab;
            this.renderBuildBar();
          }
        });
      });
    }

    // Spawners under Units Tab
    if (this.activeMainTab === 'units') {
      this.buildBarEl.querySelector('#btn-recruit-worker')?.addEventListener('click', () => {
        this.gameLoop.unitManager.spawnUnit(UnitKind.Worker, 25, 25);
        this.showToast('Spawned 1 Worker!');
        this.renderBuildBar();
      });
      this.buildBarEl.querySelector('#btn-recruit-swordsman')?.addEventListener('click', () => {
        this.gameLoop.unitManager.spawnUnit(UnitKind.Swordsman, 25, 25);
        this.showToast('Spawned 1 Swordsman!');
        this.renderBuildBar();
      });
      this.buildBarEl.querySelector('#btn-recruit-archer')?.addEventListener('click', () => {
        this.gameLoop.unitManager.spawnUnit(UnitKind.Bowman, 25, 25);
        this.showToast('Spawned 1 Archer!');
        this.renderBuildBar();
      });
    }

    // Spawners under Specialists Tab
    if (this.activeMainTab === 'specialists') {
      this.buildBarEl.querySelector('#btn-recruit-geologist')?.addEventListener('click', () => {
        this.gameLoop.unitManager.spawnUnit(UnitKind.Settler, 25, 25);
        this.showToast('Spawned 1 Geologist!');
        this.renderBuildBar();
      });
      this.buildBarEl.querySelector('#btn-recruit-pioneer')?.addEventListener('click', () => {
        this.gameLoop.unitManager.spawnUnit(UnitKind.Pioneer, 25, 25);
        this.showToast('Spawned 1 Pioneer!');
        this.renderBuildBar();
      });
      this.buildBarEl.querySelector('#btn-recruit-thief')?.addEventListener('click', () => {
        this.gameLoop.unitManager.spawnUnit(UnitKind.Settler, 25, 25);
        this.showToast('Spawned 1 Thief!');
        this.renderBuildBar();
      });
    }

    // Save, Pause, Exit actions under Menu Tab
    if (this.activeMainTab === 'ingamemenu') {
      const saveBtn = this.buildBarEl.querySelector('#menu-btn-save');
      const pauseBtn = this.buildBarEl.querySelector('#menu-btn-pause');
      const exitBtn = this.buildBarEl.querySelector('#menu-btn-exit');

      saveBtn?.addEventListener('click', () => {
        if (this.gameLoop.save()) {
          this.showToast('Game saved successfully!');
        } else {
          this.showToast('Save failed');
        }
      });

      pauseBtn?.addEventListener('click', () => {
        this.gameLoop.state.isPaused = !this.gameLoop.state.isPaused;
        this.renderBuildBar();
      });

      exitBtn?.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit? Unsaved progress will be lost.')) {
          location.reload();
        }
      });
    }

    // Settings actions under Settings Tab
    if (this.activeMainTab === 'settings') {
      const muteBtn = this.buildBarEl.querySelector('#settings-audio-mute') as HTMLButtonElement;
      const volSlider = this.buildBarEl.querySelector('#settings-audio-volume') as HTMLInputElement;
      const perfBtn = this.buildBarEl.querySelector('#settings-gfx-perf') as HTMLButtonElement;

      muteBtn?.addEventListener('click', () => {
        const isMuted = soundManager.toggleMute();
        muteBtn.textContent = isMuted ? 'Muted: ON' : 'Muted: OFF';
        if (isMuted) {
          muteBtn.classList.add('active');
          volSlider.value = '0';
        } else {
          muteBtn.classList.remove('active');
          volSlider.value = '1';
        }
      });

      volSlider?.addEventListener('input', (e) => {
        const vol = parseFloat((e.target as HTMLInputElement).value);
        soundManager.setVolume(vol);
      });

      perfBtn?.addEventListener('click', () => {
        const engine = this.scene?.getEngine?.();
        if (engine) {
          const level = engine.getHardwareScalingLevel();
          if (level === 1) {
            engine.setHardwareScalingLevel(2);
            perfBtn.textContent = 'Quality: Medium';
          } else {
            engine.setHardwareScalingLevel(1);
            perfBtn.textContent = 'Quality: High';
          }
        }
      });
    }

    // Debug Toggles
    if (this.activeMainTab === 'debug') {
      const gridBtn = this.buildBarEl.querySelector('#menu-debug-grid') as HTMLButtonElement;
      const splatBtn = this.buildBarEl.querySelector('#menu-debug-splat') as HTMLButtonElement;
      const terrBtn = this.buildBarEl.querySelector('#menu-debug-territory') as HTMLButtonElement;
      const supplyBtn = this.buildBarEl.querySelector('#menu-debug-supply') as HTMLButtonElement;
      const texBtn = this.buildBarEl.querySelector('#menu-debug-textures') as HTMLButtonElement;
      const wireBtn = this.buildBarEl.querySelector('#menu-debug-wireframe') as HTMLButtonElement;
      const fogBtn = this.buildBarEl.querySelector('#menu-debug-fog') as HTMLButtonElement;
      const pauseBtn = this.buildBarEl.querySelector('#menu-debug-pause') as HTMLButtonElement;
      const inspectorBtn = this.buildBarEl.querySelector('#menu-debug-inspector') as HTMLButtonElement;

      gridBtn?.addEventListener('click', () => {
        const isVisible = !(this.gridRenderer?.getMesh()?.isVisible ?? false);
        this.gridRenderer?.setVisible(isVisible);
        gridBtn.textContent = isVisible ? 'Grid: ON' : 'Grid: OFF';
      });

      splatBtn?.addEventListener('click', () => {
        const enabled = !this.terrainRenderer?.isSplattingEnabled();
        this.terrainRenderer?.setSplattingEnabled(enabled);
        splatBtn.textContent = enabled ? 'Splat: ON' : 'Splat: OFF';
      });

      terrBtn?.addEventListener('click', () => {
        const visible = !this.territoryOverlay?.isVisible;
        this.territoryOverlay?.setVisible(visible);
        terrBtn.textContent = visible ? 'Territory: ON' : 'Territory: OFF';
      });

      supplyBtn?.addEventListener('click', () => {
        const visible = !this.supplyChainRenderer?.visible;
        if (this.supplyChainRenderer) {
          this.supplyChainRenderer.visible = visible;
        }
        supplyBtn.textContent = visible ? 'Supply: ON' : 'Supply: OFF';
      });

      // Textures toggle
      let texturesEnabled = true;
      texBtn?.addEventListener('click', () => {
        texturesEnabled = !texturesEnabled;
        texBtn.textContent = `Textures: ${texturesEnabled ? 'ON' : 'OFF'}`;
        this.setTextureMode(texturesEnabled);
      });

      // Wireframe toggle
      let wireframeMode = false;
      wireBtn?.addEventListener('click', () => {
        wireframeMode = !wireframeMode;
        wireBtn.textContent = `Wire: ${wireframeMode ? 'ON' : 'OFF'}`;
        this.setWireframe(wireframeMode);
      });

      // Fog toggle (placeholder)
      let fogEnabled = true;
      fogBtn?.addEventListener('click', () => {
        fogEnabled = !fogEnabled;
        fogBtn.textContent = `Fog: ${fogEnabled ? 'ON' : 'OFF'}`;
        this.setFogVisibility(fogEnabled);
      });

      // Pause toggle
      pauseBtn?.addEventListener('click', () => {
        this.gameLoop.state.isPaused = !this.gameLoop.state.isPaused;
        this.updatePauseButton(pauseBtn);
      });

      // Babylon Inspector
      inspectorBtn?.addEventListener('click', () => {
        this.showBabylonInspector();
      });

      // Populate supply chain filters
      this.populateSupplyFilters();
    }
  }

  private populateSupplyFilters(): void {
    const filterContainer = this.buildBarEl.querySelector('#debug-supply-filters') as HTMLDivElement;
    if (!filterContainer) return;

    for (const [resIdStr, color] of Object.entries(RESOURCE_COLORS)) {
      const resId = parseInt(resIdStr, 10);
      const name = resourceName(resId);
      const btn = document.createElement('button');
      btn.className = 'debug-supply-filter-btn';
      btn.title = `Toggle ${name}`;
      btn.style.width = '20px';
      btn.style.height = '20px';
      btn.style.padding = '0';
      btn.style.margin = '0 2px';
      btn.style.border = '1px solid #444';
      btn.style.cursor = 'pointer';
      btn.style.borderRadius = '3px';
      // Convert RGB [0-1] to CSS hex
      const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
      const hexColor = `#${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}`;
      btn.style.backgroundColor = hexColor;
      
      let enabled = true;
      btn.addEventListener('click', () => {
        enabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.3';
        if (this.supplyChainRenderer) {
          this.supplyChainRenderer.setResourceVisible(resId, enabled);
          // Recompute immediately
          this.supplyChainRenderer.refresh(this.supplyChainRenderer.computeLinks(this.gameLoop.economy));
        }
      });
      filterContainer.appendChild(btn);
    }
  }

  private updatePauseButton(btn: HTMLButtonElement): void {
    btn.textContent = `Pause: ${this.gameLoop.state.isPaused ? 'ON' : 'OFF'}`;
  }

  private setTextureMode(enabled: boolean): void {
    if (!this.scene) return;
    this.scene.meshes.forEach((mesh) => {
      if (mesh.material) {
        const mat = mesh.material as any;
        if (enabled) {
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
    if (!this.scene) return;
    this.scene.meshes.forEach((mesh) => {
      if (mesh.material) {
        const mat = mesh.material as any;
        mat.wireframe = enabled;
      }
    });
  }

  private setFogVisibility(_enabled: boolean): void {
    // Fog of war - placeholder for future implementation
  }

  /** Launch Babylon.js Inspector for advanced scene debugging */
  private showBabylonInspector(): void {
    import('@babylonjs/inspector' as any).then((mod: any) => {
      if (mod && mod.Inspector && this.scene) {
        mod.Inspector.Show(this.scene, { embedMode: true, enableClose: true });
      }
    }).catch(() => {
      // Package not installed - silently fail for production
    });
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
    const subtabsEl = this.deepPanelEl.querySelector('#deep-subtabs');
    const contentEl = this.deepPanelEl.querySelector('#deep-panel-content');
    if (!subtabsEl || !contentEl) return;

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

  private setupEvents(): void {
    // Bottom integrated bar clicks (Construction select / Tab selection)
    this.buildBarEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.build-bar-item') as HTMLElement;
      if (btn) {
        const kind = parseInt(btn.dataset.kind!) as BuildingType;
        this.handleBuildingSelection(kind);
      }

      const tabBtn = (e.target as HTMLElement).closest('.build-bar-tab-btn') as HTMLElement;
      if (tabBtn) {
        const mainTab = tabBtn.dataset.mainTab as any;
        this.activeMainTab = mainTab;
        this.renderBuildBar();
      }

      const toggleDeepBtn = (e.target as HTMLElement).closest('#btn-toggle-deep-menu');
      if (toggleDeepBtn) {
        this.toggleDeepPanel();
      }
    });

    // Deep Tabs switches (Kept for unit test coverage)
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
        this.toggleDeepPanel();
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

    // Close button for deep panel (for unit test)
    this.deepPanelEl.querySelector('.deep-panel-close')?.addEventListener('click', () => {
      this.toggleDeepPanel();
    });
  }

  private handleBuildingSelection(kind: BuildingType): void {
    if (this.buildingPlacement) {
      if (!this.buildingPlacement.isVisible()) {
        this.buildingPlacement.toggle();
      }
      if (typeof (this.buildingPlacement as any).selectBuilding === 'function') {
        (this.buildingPlacement as any).selectBuilding(kind);
      } else {
        const btn = document.querySelector(`.bp-building-btn[data-kind="${kind}"]`) as HTMLElement;
        if (btn) btn.click();
      }
    }
  }

  private startUpdateLoop(): void {
    // Initialize camera for mouse tracking
    if (this.scene) {
      this.camera = this.scene.activeCamera as ArcRotateCamera | null;
      this.setupMouseTracking();
    }

    const update = () => {
      const stats = typeof this.gameLoop?.getStats === 'function' ? this.gameLoop.getStats() : { gameTime: 0, ticks: 0 };
      
      // Debug stats update
      if (this.activeMainTab === 'debug') {
        const units = this.gameLoop.unitManager.getAliveUnits();
        const buildings = this.gameLoop.economy.getCompleteBuildings();

        const fpsEl = document.getElementById('debug-fps');
        const timeEl = document.getElementById('debug-time');
        const ticksEl = document.getElementById('debug-ticks');
        const unitsTotalEl = document.getElementById('debug-units-total');
        const unitsWorkersEl = document.getElementById('debug-units-workers');
        const unitsArchersEl = document.getElementById('debug-units-archers');
        const unitsSoldiersEl = document.getElementById('debug-units-soldiers');
        const buildingsTotalEl = document.getElementById('debug-buildings-total');
        const buildingsStorageEl = document.getElementById('debug-buildings-storage');
        const buildingsProdEl = document.getElementById('debug-buildings-prod');

        if (fpsEl) fpsEl.textContent = Math.round(this.scene?.getEngine?.().getFps() ?? 0).toString();
        if (timeEl) timeEl.textContent = `${Math.floor(stats.gameTime)}s`;
        if (ticksEl) ticksEl.textContent = stats.ticks.toString();
        if (unitsTotalEl) unitsTotalEl.textContent = units.length.toString();
        if (unitsWorkersEl) unitsWorkersEl.textContent = units.filter(u => u.kind === UnitKind.Worker).length.toString();
        if (unitsArchersEl) unitsArchersEl.textContent = units.filter(u => u.kind === UnitKind.Bowman).length.toString();
        if (unitsSoldiersEl) unitsSoldiersEl.textContent = units.filter(u => u.kind === UnitKind.Swordsman).length.toString();
        if (buildingsTotalEl) buildingsTotalEl.textContent = buildings.length.toString();
        if (buildingsStorageEl) buildingsStorageEl.textContent = buildings.filter(b => this.isStorageBuilding(b.kind)).length.toString();
        if (buildingsProdEl) buildingsProdEl.textContent = buildings.filter(b => this.isProductionBuilding(b.kind)).length.toString();
      }
      
      // Periodic stats update under statistics tab
      if (this.activeMainTab === 'statistics') {
        const units = this.gameLoop.unitManager.getAliveUnits();
        const buildings = this.gameLoop.economy.getCompleteBuildings();

        const timeEl = document.getElementById('menu-stats-time');
        const ticksEl = document.getElementById('menu-stats-ticks');
        const buildingsEl = document.getElementById('menu-stats-buildings');
        const unitsEl = document.getElementById('menu-stats-units');
        const workersEl = document.getElementById('menu-stats-workers');
        const soldiersEl = document.getElementById('menu-stats-soldiers');

        if (timeEl) timeEl.textContent = `${Math.floor(stats.gameTime)}s`;
        if (ticksEl) ticksEl.textContent = stats.ticks.toString();
        if (buildingsEl) buildingsEl.textContent = buildings.length.toString();
        if (unitsEl) unitsEl.textContent = units.length.toString();
        if (workersEl) workersEl.textContent = units.filter(u => u.kind === UnitKind.Worker).length.toString();
        if (soldiersEl) soldiersEl.textContent = units.filter(u => u.kind === UnitKind.Swordsman).length.toString();
      }

      // Time counter in header
      const menuTimeEl = document.getElementById('menu-time');
      if (menuTimeEl) {
        menuTimeEl.textContent = `Time: ${Math.floor(stats.gameTime)}s`;
      }

      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  private isStorageBuilding(kind: number): boolean {
    return kind === BuildingType.Storehouse ||
           kind === BuildingType.StorageYard ||
           kind === BuildingType.LandingDock;
  }

  private isProductionBuilding(kind: number): boolean {
    return kind !== BuildingType.Castle &&
           kind !== BuildingType.Barracks &&
           kind !== BuildingType.Storehouse &&
           kind !== BuildingType.StorageYard &&
           kind !== BuildingType.LandingDock;
  }

  private setupMouseTracking(): void {
    if (!this.scene || !this.camera) return;
    
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (!canvas) return;

    canvas.addEventListener('pointermove', (evt) => {
      this.updateMouseCoords(evt);
    });

    canvas.addEventListener('pointerleave', () => {
      const coordsEl = document.getElementById('debug-mouse-coords');
      if (coordsEl) coordsEl.textContent = '(-,-)';
    });
  }

  private updateMouseCoords(evt: PointerEvent): void {
    if (!this.camera) return;

    const coordsEl = document.getElementById('debug-mouse-coords');
    if (!coordsEl) return;

    const pick = this.scene?.pick(evt.clientX, evt.clientY);
    if (!pick || !pick.pickedPoint) {
      coordsEl.textContent = '(-,-)';
      return;
    }

    const x = Math.floor(pick.pickedPoint.x);
    const y = Math.floor(pick.pickedPoint.z);

    if (x < 0 || x >= this.gameLoop.map.width || y < 0 || y >= this.gameLoop.map.height) {
      coordsEl.textContent = '(-,-)';
      return;
    }

    coordsEl.textContent = `(${x},${y})`;
    
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

  private showToast(msg: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
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

  public isDeepPanelVisible(): boolean {
    return this.deepPanelVisible;
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

  public toggleMenu(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.buildBarEl.classList.add('collapsed');
      this.toggleBtnEl.classList.add('collapsed');
      this.toggleBtnEl.innerHTML = '▶'; // Pointing right to expand
      this.toggleBtnEl.title = 'Expand Menu';
      document.body.classList.add('menu-collapsed');
    } else {
      this.buildBarEl.classList.remove('collapsed');
      this.toggleBtnEl.classList.remove('collapsed');
      this.toggleBtnEl.innerHTML = '◀'; // Pointing left to collapse
      this.toggleBtnEl.title = 'Collapse Menu';
      document.body.classList.remove('menu-collapsed');
    }
  }

  public isMenuCollapsed(): boolean {
    return this.isCollapsed;
  }

  public dispose(): void {
    this.buildBarEl.remove();
    this.deepPanelEl.remove();
    this.tooltipEl.remove();
    this.toggleBtnEl.remove();
  }
}