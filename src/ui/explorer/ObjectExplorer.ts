/**
 * S4WN Babylon.js/TypeScript - Object Explorer
 * 
 * Asset catalog organized by logical game categories.
 * Each entry shows its full asset chain: type info + mesh + texture + animation.
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

function fmtCost(items: Array<{resource: any; amount: number}>): string {
  if (items.length === 0) return 'none';
  return items.map(i => `${resourceName(i.resource)}×${i.amount}`).join(', ');
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
          <span class="explorer-title">Object Explorer</span>
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
  //  TERRAIN — terrain types + ground mesh + splat texture + water ripple
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
        texture: `Splat-map — 256×256, procedural (RGB per terrain type) → see PROMPTS.md §Terrain`,
        animation: 'Water ripple — UV scroll loop on WaterPlane normal map (dt × 0.01), WaterPlane.ts',
      }
    })));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BUILDINGS — building types + OBJ mesh + production animation
  // ═══════════════════════════════════════════════════════════════════

  private showBuildings(): void {
    const seen = new Set<string>();
    const objects: ExplorerObject[] = [];

    for (const b of this.gameLoop.economy.getCompleteBuildings()) {
      const name = buildingName(b.kind);
      if (seen.has(name)) continue;
      seen.add(name);
      const kind = b.kind as BuildingType;
      const interval = productionInterval(kind);
      objects.push({
        id: `building-${name}`,
        type: 'building',
        name,
        properties: {
          buildCost: fmtCost(buildCost(kind)),
          buildTime: `${buildTime(kind)} ticks`,
          productionInputs: fmtCost(buildingInputs(kind)),
          productionOutputs: fmtCost(buildingOutputs(kind)),
          productionInterval: interval > 0 ? `${interval} ticks (${(interval/10).toFixed(1)}s)` : 'none',
          requiredTool: requiredTool(kind)?.toString() ?? 'none',
          requiresSettler: requiresSettler(kind),
          runtime_hp: `${b.hp}/${b.maxHp}`,
          runtime_active: b.isActive,
          mesh: `OBJ model — loaded from assets/models/${name.toLowerCase()}.obj via SceneLoader (BuildingMesh.ts)`,
          texture: 'StandardMaterial — diffuse + specular; PBR planned for later',
          animations: {
            construction: `Progress bar ${buildTime(kind)} ticks → Economy.tick() + construction/spawn particles on completion (ParticleSystem.ts)`,
            production: interval > 0 ? `Cycle every ${interval} ticks: consume inputs → produce outputs → Economy.tick(1.0)` : 'none (military/support building)',
          },
          count: this.gameLoop.economy.getCompleteBuildings().filter(x => buildingName(x.kind) === name).length,
        }
      });
    }

    if (objects.length === 0) {
      for (let i = 0; i < BUILDING_NAMES.length; i++) {
        const name = BUILDING_NAMES[i];
        if (!name || name === 'Castle') continue;
        const kind = i as BuildingType;
        const interval = productionInterval(kind);
        objects.push({
          id: `building-${name}`,
          type: 'building',
          name,
          properties: {
            buildCost: fmtCost(buildCost(kind)),
            buildTime: `${buildTime(kind)} ticks`,
            productionInputs: fmtCost(buildingInputs(kind)),
            productionOutputs: fmtCost(buildingOutputs(kind)),
            productionInterval: interval > 0 ? `${interval} ticks (${(interval/10).toFixed(1)}s)` : 'none',
            requiredTool: requiredTool(kind)?.toString() ?? 'none',
            requiresSettler: requiresSettler(kind),
            mesh: `OBJ model — assets/models/${name.toLowerCase()}.obj (BuildingMesh.ts)`,
            texture: 'StandardMaterial — diffuse + specular',
            animations: {
              construction: `Progress bar ${buildTime(kind)} ticks → Economy.tick() + particles on completion`,
              production: interval > 0 ? `Cycle every ${interval} ticks: consume inputs → produce outputs → Economy.tick(1.0)` : 'none (military/support)',
            },
            count: 0,
          }
        });
      }
    }
    objects.sort((a, b) => a.name.localeCompare(b.name));
    this.updateList(objects);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UNITS — unit types + mesh + movement animation
  // ═══════════════════════════════════════════════════════════════════

  private showUnits(): void {
    const unitDefs = [
      { name: 'Settler',   hp: 50,  atk: 1,  speed: 1.5, sight: 8,  desc: 'Civilian; builds and gathers resources',
        idle: 'Standing upright, slight idle sway (UnitState.Idle)', walking: 'Walk cycle at speed 1.5 — pathfinding A* interpolation (GameLoop.tick → UnitManager.tick)', working: 'Hammer swing loop when constructing buildings; carry animation when hauling resources' },
      { name: 'Swordsman', hp: 100, atk: 15, speed: 1.0, sight: 6,  desc: 'Melee infantry unit',
        idle: 'Standing at attention, shield forward (UnitState.Idle)', walking: 'March cycle at speed 1.0 — A* pathfinding', working: 'Combat: sword slash/parry loop vs enemy units (UnitState.Fighting → CombatAI.tick)' },
      { name: 'Bowman',    hp: 75,  atk: 12, speed: 1.2, sight: 10, desc: 'Ranged archer unit',
        idle: 'Bow lowered, scanning (UnitState.Idle)', walking: 'Jog cycle at speed 1.2 — A* pathfinding', working: 'Combat: draw → aim → release loop at range (UnitState.Fighting, sight 10 for aggro)' },
      { name: 'Worker',    hp: 40,  atk: 1,  speed: 1.0, sight: 5,  desc: 'Operates production buildings',
        idle: 'Standing at building entrance (UnitState.Idle)', walking: 'Walk cycle at speed 1.0 — to/from workplace', working: 'Tool animation (hammer/saw/pickaxe) per building type — operates assigned building (WorkerAI.assignWorker)' },
      { name: 'Pioneer',   hp: 40,  atk: 1,  speed: 1.0, sight: 5,  desc: 'Border expander; digs territory stakes',
        idle: 'Standing with shovel (UnitState.Idle)', walking: 'Walk cycle at speed 1.0 — to border edge', working: 'Digging animation — shovel strike loop, expands territory radius (UnitState.Working)' },
    ];
    this.updateList(unitDefs.map(u => ({
      id: `unit-${u.name}`,
      type: 'unit',
      name: u.name,
      properties: {
        description: u.desc,
        stats: { hp: u.hp, attack: u.atk, speed: u.speed, sightRange: u.sight },
        mesh: 'glTF/OBJ — loaded via BuildingMesh.ts (reuses building loader pattern)',
        texture: 'StandardMaterial — diffuse color per unit type',
        animations: {
          idle: u.idle,
          walking: u.walking,
          working: u.working,
        },
        count: this.gameLoop.unitManager.getAliveUnits().filter(x => x.kind.toString() === u.name).length,
      }
    })));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DECORATIONS — particles, water, effects
  // ═══════════════════════════════════════════════════════════════════

  private showDecorations(): void {
    this.updateList([
      { id: 'deco-water',  type: 'decoration', name: 'Water Plane',
        p: { mesh: 'CreateGround — 100×100 flat plane, 4 vertices, y=-0.5 (WaterPlane.ts)',
             texture: 'StandardMaterial — diffuse (0.1,0.3,0.6), mirror reflection texture 512px, water normal map (assets/textures/water_normal.png)',
             animation: 'Normal map UV scroll — uOffset/vOffset += dt × 0.01, loop (WaterPlane.update)',
             generation: 'Procedural (WaterPlane.ts), normal map from PROMPTS.md if generated' }},
      { id: 'deco-debug',  type: 'decoration', name: 'Debug Marker',
        p: { mesh: 'CreateSphere — diameter 1, positioned at map center (TerrainRenderer.ts)',
             texture: 'StandardMaterial — emissive red (1,0,0)',
             animation: 'none' }},
      { id: 'deco-smoke',  type: 'particle',   name: 'Smoke',
        p: { mesh: 'GPU particle — billboarded quad (ParticleSystem.ts)',
             texture: 'assets/textures/particle_smoke.png',
             animation: 'Size/alpha fade over lifetime 0.3–2s, velocity spread' }},
      { id: 'deco-fire',   type: 'particle',   name: 'Fire',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_fire.png',
             animation: 'Orange flicker, size/alpha fade' }},
      { id: 'deco-explosion',type: 'particle', name: 'Explosion',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_explosion.png',
             animation: 'Rapid burst, expanding radius' }},
      { id: 'deco-spark',  type: 'particle',   name: 'Spark',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_spark.png',
             animation: 'Fast streak, short lifetime' }},
      { id: 'deco-dust',   type: 'particle',   name: 'Dust',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_dust.png',
             animation: 'Slow drift, brown tint' }},
      { id: 'deco-rain',   type: 'particle',   name: 'Rain',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_rain.png',
             animation: 'Vertical drop, thin streak' }},
      { id: 'deco-snow',   type: 'particle',   name: 'Snow',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_snow.png',
             animation: 'Slow fall, drift' }},
      { id: 'deco-waterfx',type: 'particle',   name: 'Water Splash',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_water.png',
             animation: 'Blue droplets, arc trajectory' }},
      { id: 'deco-construct',type: 'particle', name: 'Construction',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_construction.png',
             animation: 'Wood chips, dust burst' }},
      { id: 'deco-spawn',  type: 'particle',   name: 'Spawn',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_spawn.png',
             animation: 'White glow flash' }},
      { id: 'deco-death',  type: 'particle',   name: 'Death',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_death.png',
             animation: 'Red burst, expanding ring' }},
      { id: 'deco-flash',  type: 'particle',   name: 'Flash',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_flash.png',
             animation: 'Single-burst lens flare' }},
      { id: 'deco-impact', type: 'particle',   name: 'Impact',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_impact.png',
             animation: 'Sparks on collision point' }},
      { id: 'deco-fog',    type: 'particle',   name: 'Fog',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_fog.png',
             animation: 'Grey mist, slow drift' }},
      { id: 'deco-magic',  type: 'particle',   name: 'Magic',
        p: { mesh: 'GPU particle — billboarded quad',
             texture: 'assets/textures/particle_magic.png',
             animation: 'Purple sparkle, rotating' }},
    ].map(d => ({ id: d.id, type: d.type, name: d.name, properties: d.p })));
  }

  // ═══════════════════════════════════════════════════════════════════
  //  MISC — UI assets, CSS animations, audio
  // ═══════════════════════════════════════════════════════════════════

  private showMisc(): void {
    this.updateList([
      { id: 'misc-splash',  type: 'ui-asset',   name: 'Splash Screen',
        p: { file: 'assets/images/splash.png', dimensions: '4K (responsive, 9:16 safe zone)',
             prompt: 'PROMPTS.md §Splash Screen',
             desc: 'Game splash screen — painterly medieval village at golden hour, center-safe for portrait cropping' }},
      { id: 'misc-menu-bg', type: 'ui-asset',   name: 'Menu Background',
        p: { file: 'assets/images/menu-bg.png', dimensions: '4K (responsive, center dark band)',
             prompt: 'PROMPTS.md §Main Menu Background',
             desc: 'Twilight village silhouette, centered dark area for menu text overlay' }},
      { id: 'misc-logo',    type: 'ui-asset',   name: 'Game Logo',
        p: { file: 'assets/images/logo-1024.png', dimensions: '1024×1024',
             prompt: 'PROMPTS.md §Logo',
             desc: 'S4WN logo — rustic medieval typography, wood/stone texture, bronze/gold trim' }},
      { id: 'misc-favicon', type: 'ui-asset',   name: 'Favicon',
        p: { file: 'assets/images/favicon-256.png', dimensions: '256×256',
             prompt: 'PROMPTS.md §Favicon',
             desc: 'Castle tower silhouette in gold on dark green circle' }},
      { id: 'misc-audio',   type: 'audio',      name: 'Sound Effects',
        p: { source: 'SoundManager.ts — Web Audio API oscillator tones',
             sounds: 'select, place, error, tick, win, lose — 6 procedural tones with gain envelopes',
             desc: 'No asset files; generated at runtime via createOscillator + createGain' }},
      { id: 'misc-splash-anim',type: 'animation',name: 'Splash → Menu Fade',
        p: { type: 'CSS Transition', duration: '3s', target: '.ui-screen',
             desc: 'Splash screen fades out after 3s, main menu fades in (UIManager.ts, setTimeout)' }},
      { id: 'misc-menu-hover',type: 'animation',name: 'Menu Button Hover',
        p: { type: 'CSS Transition', duration: '0.2s', target: '.menu-button',
             desc: 'Scale + color shift on hover — background: #f4e4bc, border: #5d4037 (index.html styles)' }},
      { id: 'misc-toast',   type: 'animation',  name: 'Toast Notification',
        p: { type: 'CSS Animation', duration: '2.5s', target: '.toast (HUD.ts)',
             desc: 'Slide-in from top, hold, fade-out — used for save-game confirmation' }},
      { id: 'misc-camera',  type: 'animation',  name: 'Camera Orbit (Touch)',
        p: { type: 'Babylon.js Input', duration: 'realtime', target: 'ArcRotateCamera',
             desc: 'Pinch-to-zoom + two-finger pan via TouchCameraController.ts' }},
    ].map(d => ({ id: d.id, type: d.type, name: d.name, properties: d.p })));
  }

  // ── List / Details rendering ───────────────────────────────────────

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
