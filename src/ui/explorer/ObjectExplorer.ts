/**
 * S4WN Babylon.js/TypeScript - Object Explorer (P12 Grade A Debugging Tool)
 *
 * Asset catalog with runtime state inspection for every game asset.
 * Each asset: look (mesh+texture+animation) + logic (stats+economy+AI)
 * + runtime state (HP/position/progress) + GitHub issue deep-link.
 * Tabs: Terrain | Buildings | Units | Decorations | Misc
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

type CatalogTab = 'terrain' | 'buildings' | 'units' | 'decorations' | 'misc';

// ── Helpers ──────────────────────────────────────────────────────────

function fmtCost(items: Array<{ resource: any; amount: number }>): string {
  if (items.length === 0) return 'none';
  return items.map(i => `${resourceName(i.resource)}×${i.amount}`).join(', ');
}

const GITHUB_ISSUE_BASE = 'https://github.com/mayrd/s4wn/issues/new';

function gitHubIssueLink(assetType: string, assetName: string): string {
  const title = encodeURIComponent(`[${assetType}] ${assetName}`);
  const body = encodeURIComponent(
    `## Asset: ${assetName} (${assetType})\n\n` +
    `### What needs to change?\n\n\n` +
    `### Current behavior\n\n\n` +
    `### Expected behavior\n\n\n` +
    `_\nAutomated deep-link from Object Explorer._\n`
  );
  return `${GITHUB_ISSUE_BASE}?title=${title}&body=${body}&labels=asset,debug`;
}

function renderPropRow(key: string, val: any): string {
  const display = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  return `<div class="explorer-prop-row">
    <span class="prop-key">${key}:</span>
    <span class="prop-val">${display}</span>
  </div>`;
}

function renderSection(title: string, content: string): string {
  return `<div class="explorer-section">
    <div class="explorer-section-title">${title}</div>
    <div class="explorer-section-body">${content}</div>
  </div>`;
}

// ── Terrain catalog ──────────────────────────────────────────────────

interface TerrainDef {
  terrain: Terrain;
  splatRgb: string;
  buildable: boolean;
  movementCost: number;
  desc: string;
}
const TERRAIN_DEFS: TerrainDef[] = [
  { terrain: Terrain.Grass,     splatRgb: '50,200,50',   buildable: true,  movementCost: 1.0, desc: 'Fertile grassland, can build buildings' },
  { terrain: Terrain.Forest,    splatRgb: '20,100,20',   buildable: false, movementCost: 2.0, desc: 'Dense woodland, blocks construction' },
  { terrain: Terrain.Desert,    splatRgb: '200,200,100', buildable: true,  movementCost: 1.2, desc: 'Sandy plains, slower movement' },
  { terrain: Terrain.Mountain,  splatRgb: '100,100,100', buildable: false, movementCost: 3.0, desc: 'High peaks, very slow passage' },
  { terrain: Terrain.Snow,      splatRgb: '255,255,255', buildable: true,  movementCost: 1.5, desc: 'Snow-covered ground' },
  { terrain: Terrain.Water,     splatRgb: '0,0,255',     buildable: false, movementCost: 99,  desc: 'Shallow water, impassable' },
  { terrain: Terrain.DeepWater, splatRgb: '0,0,255',     buildable: false, movementCost: 99,  desc: 'Deep ocean, impassable' },
  { terrain: Terrain.Swamp,     splatRgb: '50,50,0',     buildable: false, movementCost: 2.5, desc: 'Murky marsh, slow passage' },
];

// ── ObjectExplorer ───────────────────────────────────────────────────

export class ObjectExplorer {
  private container: HTMLElement;
  private listElement!: HTMLElement;
  private detailsElement!: HTMLElement;
  private isOpen: boolean = false;
  private gameLoop: GameLoop;
  private activeCatalog: CatalogTab = 'terrain';

  constructor(_uiManager: UIManager, gameLoop: GameLoop) {
    this.gameLoop = gameLoop;
    this.container = document.createElement('div');
    this.container.className = 'ui-screen explorer-panel hidden';
    this.init();
  }

  private init(): void {
    const tabs: { label: string; id: CatalogTab }[] = [
      { label: 'Terrain',     id: 'terrain' },
      { label: 'Buildings',   id: 'buildings' },
      { label: 'Units',       id: 'units' },
      { label: 'Decorations', id: 'decorations' },
      { label: 'Misc',        id: 'misc' },
    ];

    this.container.innerHTML = `
      <div class="explorer-container">
        <div class="explorer-header">
          <span class="explorer-title">🐞 Object Explorer</span>
          <button class="explorer-close">&times;</button>
        </div>
        <div class="explorer-content">
          <div class="explorer-list-section">
            <div class="explorer-list-header" id="explorer-tabs">
              ${tabs.map(t => `<span class="explorer-tab" data-tab="${t.id}" style="margin-right:8px;cursor:pointer">${t.label}</span>`).join('')}
            </div>
            <div class="explorer-list" id="explorer-list"></div>
          </div>
          <div class="explorer-details-section">
            <div class="explorer-details-header">
              Details
              <a href="#" class="explorer-debug-link" id="explorer-debug-link" target="_blank" style="float:right;font-size:0.75rem;text-decoration:none" title="Open GitHub issue for this asset">🐛 Report Issue</a>
            </div>
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

    this.container.querySelectorAll('.explorer-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.setActiveTab((e.target as HTMLElement).dataset.tab as CatalogTab);
      });
    });
    this.setActiveTab('terrain');

    const overlay = document.getElementById('ui-overlay');
    if (overlay) overlay.appendChild(this.container);
  }

  private setActiveTab(category: CatalogTab): void {
    this.activeCatalog = category;
    this.container.querySelectorAll('.explorer-tab').forEach(t => {
      (t as HTMLElement).style.fontWeight = (t as HTMLElement).dataset.tab === category ? 'bold' : 'normal';
    });
    this.refresh();
  }

  public show(): void { this.container.classList.remove('hidden'); this.container.classList.add('active'); this.isOpen = true; this.refresh(); }
  public hide(): void { this.container.classList.add('hidden'); this.container.classList.remove('active'); this.isOpen = false; }
  public toggle(): void { this.isOpen ? this.hide() : this.show(); }

  private refresh(): void {
    switch (this.activeCatalog) {
      case 'terrain':     this.showTerrain();     break;
      case 'buildings':   this.showBuildings();   break;
      case 'units':       this.showUnits();       break;
      case 'decorations': this.showDecorations(); break;
      case 'misc':        this.showMisc();        break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TERRAIN
  // ═══════════════════════════════════════════════════════════════════

  private showTerrain(): void {
    this.updateList(TERRAIN_DEFS.map(t => ({
      id: `terrain-${t.terrain}`,
      type: 'terrain',
      name: t.terrain.toString(),
      properties: {
        description: t.desc,
        splatColor: `rgb(${t.splatRgb})`,
        buildable: t.buildable,
        movementCost: t.movementCost,
        mesh: 'Ground Plane — CreateGround, 100×100 units, 4 vertices (TerrainRenderer.ts)',
        texture: 'Splat-map — 256×256 procedural RGB per terrain type → PROMPTS.md §Terrain',
        animation: 'Water ripple — UV scroll loop on WaterPlane normal map (WaterPlane.ts)',
      }
    })));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BUILDINGS — per-instance runtime debug
  // ═══════════════════════════════════════════════════════════════════

  private showBuildings(): void {
    const buildings = this.gameLoop.economy.getCompleteBuildings();
    if (buildings.length === 0) {
      this.showBuildingCatalog();
      return;
    }

    // Show each placed building instance with runtime state
    const objects: ExplorerObject[] = buildings.map((b, idx) => {
      const name = buildingName(b.kind);
      const kind = b.kind as BuildingType;
      const interval = productionInterval(kind);
      return {
        id: `building-${name}-${idx}`,
        type: 'building',
        name: `${name} #${idx + 1}`,
        properties: {
          // ── Static (type-level) ──
          kind: name,
          buildCost: fmtCost(buildCost(kind)),
          buildTime: `${buildTime(kind)} ticks`,
          produces: interval > 0 ? `${fmtCost(buildingOutputs(kind))} / ${interval} ticks` : 'none',
          consumes: fmtCost(buildingInputs(kind)),
          tool: requiredTool(kind)?.toString() ?? 'none',
          needsSettler: requiresSettler(kind),
          mesh: `assets/models/${name.toLowerCase()}.obj — loaded via SceneLoader (BuildingMesh.ts)`,
          texture: 'MTL → map_Kd → PROMPTS.md §Building Textures (7 materials)',
          animation_construction: `Progress bar ${buildTime(kind)} ticks + particles on completion (ParticleSystem.ts)`,
          animation_production: interval > 0 ? `Cycle every ${interval} ticks: inputs → outputs → Economy.tick()` : 'none (military/support)',
          // ── Runtime state ──
          '🔴 HP': `${b.hp} / ${b.maxHp}`,
          '🔴 Active': b.isActive,
          '🔴 Position': `(${b.x}, ${b.y})`,
          '🔴 Workers': `${(b as any).workers?.length ?? '?'}`,
          '🔴 Progress': `${(b as any).progress ?? '?'}/${buildTime(kind)}`,
        }
      };
    });
    this.updateList(objects);
  }

  private showBuildingCatalog(): void {
    // Full catalog when no buildings placed
    const objects: ExplorerObject[] = [];
    for (let i = 0; i < BUILDING_NAMES.length; i++) {
      const name = BUILDING_NAMES[i];
      if (!name) continue;
      const kind = i as BuildingType;
      const interval = productionInterval(kind);
      objects.push({
        id: `building-${name}`,
        type: 'building',
        name,
        properties: {
          kind: name,
          buildCost: fmtCost(buildCost(kind)),
          buildTime: `${buildTime(kind)} ticks`,
          produces: interval > 0 ? `${fmtCost(buildingOutputs(kind))} / ${interval} ticks` : 'none',
          consumes: fmtCost(buildingInputs(kind)),
          tool: requiredTool(kind)?.toString() ?? 'none',
          needsSettler: requiresSettler(kind),
          mesh: `assets/models/${name.toLowerCase()}.obj (BuildingMesh.ts)`,
          texture: 'MTL → map_Kd → PROMPTS.md §Building Textures',
          animation_construction: `Progress bar ${buildTime(kind)} ticks + particles on completion`,
          animation_production: interval > 0 ? `Cycle every ${interval} ticks: inputs → outputs` : 'none',
          '🔴 Placed': 0,
        }
      });
    }
    objects.sort((a, b) => a.name.localeCompare(b.name));
    this.updateList(objects);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UNITS — per-instance runtime debug
  // ═══════════════════════════════════════════════════════════════════

  private showUnits(): void {
    const aliveUnits = this.gameLoop.unitManager.getAliveUnits();
    const unitDefs = [
      { name: 'Settler',   hp: 50,  atk: 1,  speed: 1.5, sight: 8,  desc: 'Civilian; builds and gathers resources',
        idle: 'Standing upright, slight idle sway (UnitState.Idle)',
        walking: 'Walk cycle at speed 1.5 — A* pathfinding interpolation',
        working: 'Hammer swing (building) + carry (hauling)' },
      { name: 'Swordsman', hp: 100, atk: 15, speed: 1.0, sight: 6,  desc: 'Melee infantry unit',
        idle: 'Standing at attention, shield forward',
        walking: 'March cycle at speed 1.0 — A* pathfinding',
        working: 'Slash/parry combat loop vs enemy (CombatAI.tick)' },
      { name: 'Bowman',    hp: 75,  atk: 12, speed: 1.2, sight: 10, desc: 'Ranged archer unit',
        idle: 'Bow lowered, scanning',
        walking: 'Jog cycle at speed 1.2 — A* pathfinding',
        working: 'Draw → aim → release at range (sight 10 aggro)' },
      { name: 'Worker',    hp: 40,  atk: 1,  speed: 1.0, sight: 5,  desc: 'Operates production buildings',
        idle: 'Standing at building entrance',
        walking: 'Walk cycle at speed 1.0 — to/from workplace',
        working: 'Tool animation per building type (WorkerAI.assignWorker)' },
      { name: 'Pioneer',   hp: 40,  atk: 1,  speed: 1.0, sight: 5,  desc: 'Border expander',
        idle: 'Standing with shovel',
        walking: 'Walk cycle at speed 1.0 — to border edge',
        working: 'Shovel strike loop, expands territory (UnitState.Working)' },
    ];

    const objects: ExplorerObject[] = unitDefs.map(u => {
      const instances = aliveUnits.filter(x => x.kind.toString() === u.name);
      const aliveCount = instances.length;
      return {
        id: `unit-${u.name}`,
        type: 'unit',
        name: `${u.name} (${aliveCount} alive)`,
        properties: {
          description: u.desc,
          '🔴 Alive count': aliveCount,
          '🔴 Instances': instances.length > 0
            ? instances.map((unit: any) =>
                `#${unit.id ?? '?'} @(${unit.x},${unit.y}) HP:${unit.hp}/${u.hp} State:${unit.state ?? '?'}`
              ).join('\n')
            : 'none placed',
          stats_hp: u.hp,
          stats_attack: u.atk,
          stats_speed: u.speed,
          stats_sight: u.sight,
          mesh: 'Humanoid OBJ — head+torso+arms+legs, UV-unwrapped (generate_building_objs.py)',
          texture: `assets/textures/unit_${u.name.toLowerCase()}.png — PROMPTS.md §Unit Textures`,
          animation_idle: u.idle,
          animation_walking: u.walking,
          animation_working: u.working,
        }
      };
    });

    this.updateList(objects);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DECORATIONS
  // ═══════════════════════════════════════════════════════════════════

  private showDecorations(): void {
    this.updateList([
      { id: 'deco-water',  type: 'decoration', name: 'Water Plane',
        p: { mesh: 'CreateGround — 100×100 flat plane, y=-0.5 (WaterPlane.ts)',
             texture: 'StandardMaterial + water normal map (assets/textures/water_normal.png)',
             animation: 'Normal map UV scroll — dt×0.01 loop',
             generation: 'Procedural (WaterPlane.ts)' }},
      { id: 'deco-debug',  type: 'decoration', name: 'Debug Marker',
        p: { mesh: 'CreateSphere — diameter 1, map center (TerrainRenderer.ts)',
             texture: 'StandardMaterial emissive red (1,0,0)',
             animation: 'none' }},
      ...['Smoke','Fire','Explosion','Spark','Dust','Rain','Snow',
          'Water Splash','Construction','Spawn','Death','Flash',
          'Impact','Fog','Magic'].map(name => ({
        id: `deco-${name.toLowerCase()}`,
        type: 'particle',
        name,
        p: { mesh: 'GPU particle — billboarded quad (ParticleSystem.ts)',
             texture: `assets/textures/particle_${name.toLowerCase().replace(' ','_')}.png`,
             animation: 'Size/alpha fade over lifetime, velocity spread',
             prompt: `PROMPTS.md §${name}` }
      })),
    ].map(d => ({ id: d.id, type: d.type, name: d.name, properties: d.p })));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MISC
  // ═══════════════════════════════════════════════════════════════════

  private showMisc(): void {
    this.updateList([
      { id: 'misc-splash',  type: 'ui',   name: 'Splash Screen',
        p: { file: 'assets/images/splash.png', format: '4K responsive (9:16 safe zone)', prompt: 'PROMPTS.md §Splash Screen' }},
      { id: 'misc-menu-bg', type: 'ui',   name: 'Menu Background',
        p: { file: 'assets/images/menu-bg.png', format: '4K responsive (center band)', prompt: 'PROMPTS.md §Menu Background' }},
      { id: 'misc-logo',    type: 'ui',   name: 'Game Logo',
        p: { file: 'assets/images/logo-1024.png', format: '1024×1024', prompt: 'PROMPTS.md §Logo' }},
      { id: 'misc-favicon', type: 'ui',   name: 'Favicon',
        p: { file: 'assets/images/favicon-256.png', format: '256×256', prompt: 'PROMPTS.md §Favicon' }},
      { id: 'misc-audio',   type: 'audio', name: 'Sound Effects',
        p: { source: 'Web Audio API oscillator tones (SoundManager.ts)',
             sounds: 'select, place, error, tick, win, lose — 6 procedural tones' }},
      { id: 'misc-anim-splash', type: 'animation', name: 'Splash → Menu Fade',
        p: { type: 'CSS Transition', duration: '3s', target: '.ui-screen', source: 'UIManager.ts' }},
      { id: 'misc-anim-hover', type: 'animation', name: 'Menu Button Hover',
        p: { type: 'CSS Transition', duration: '0.2s', target: '.menu-button' }},
      { id: 'misc-anim-toast', type: 'animation', name: 'Toast Notification',
        p: { type: 'CSS Animation', duration: '2.5s', target: '.toast (HUD.ts)' }},
      { id: 'misc-anim-camera', type: 'animation', name: 'Camera Orbit',
        p: { type: 'Babylon.js Input', target: 'ArcRotateCamera', source: 'TouchCameraController.ts' }},
    ].map(d => ({ id: d.id, type: d.type, name: d.name, properties: d.p })));
  }

  // ── List / Details rendering (with GitHub link) ───────────────────

  private updateList(objects: ExplorerObject[]): void {
    this.listElement.innerHTML = '';
    objects.forEach(obj => {
      const item = document.createElement('div');
      item.className = 'explorer-item';
      item.innerHTML = `<span class="explorer-item-type">[${obj.type}]</span> <span class="explorer-item-name">${obj.name}</span>`;
      item.addEventListener('click', () => this.showDetails(obj));
      this.listElement.appendChild(item);
    });
  }

  private showDetails(obj: ExplorerObject): void {
    const issueLink = gitHubIssueLink(obj.type, obj.name);

    // Separate static properties from runtime (🔴 prefixed)
    const staticProps: Record<string, any> = {};
    const runtimeProps: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj.properties)) {
      if (key.startsWith('🔴')) {
        runtimeProps[key.replace('🔴 ', '')] = val;
      } else {
        staticProps[key] = val;
      }
    }

    const staticRows = Object.entries(staticProps)
      .map(([k, v]) => renderPropRow(k, v)).join('');

    const runtimeRows = Object.entries(runtimeProps)
      .map(([k, v]) => renderPropRow(k, v)).join('');

    this.detailsElement.innerHTML = `
      <div class="explorer-detail-item"><strong>Name:</strong> ${obj.name}</div>
      <div class="explorer-detail-item"><strong>Type:</strong> ${obj.type}</div>
      <div class="explorer-detail-item"><strong>ID:</strong> ${obj.id}</div>

      <a href="${issueLink}" target="_blank" class="explorer-issue-btn">🐛 Report Issue on GitHub</a>

      ${runtimeRows ? renderSection('🔴 Runtime State', runtimeRows) : ''}
      ${staticRows ? renderSection('📋 Asset Info', staticRows) : ''}
    `;
  }
}
