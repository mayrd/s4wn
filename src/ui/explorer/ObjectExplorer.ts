/**
 * S4WN Babylon.js/TypeScript - Object Explorer
 * 
 * Asset catalog showing one representative per game asset TYPE:
 * Terrain | Buildings | Units | Meshes | Textures | Animations
 * Each entry provides full static metadata (costs, generation, file paths).
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

type CatalogTab = 'terrain' | 'buildings' | 'units' | 'meshes' | 'textures' | 'animations';

// ── Terrain type catalog ────────────────────────────────────────────

const TERRAIN_CATALOG = [
  { terrain: Terrain.Grass,   splatRgb: '50,200,50',    buildable: true,  movementCost: 1.0 },
  { terrain: Terrain.Forest,  splatRgb: '20,100,20',    buildable: false, movementCost: 2.0 },
  { terrain: Terrain.Desert,  splatRgb: '200,200,100',  buildable: true,  movementCost: 1.2 },
  { terrain: Terrain.Mountain,splatRgb: '100,100,100',  buildable: false, movementCost: 3.0 },
  { terrain: Terrain.Snow,    splatRgb: '255,255,255',  buildable: true,  movementCost: 1.5 },
  { terrain: Terrain.Water,   splatRgb: '0,0,255',      buildable: false, movementCost: 99.0 },
  { terrain: Terrain.DeepWater,splatRgb:'0,0,255',      buildable: false, movementCost: 99.0 },
  { terrain: Terrain.Swamp,   splatRgb: '50,50,0',      buildable: false, movementCost: 2.5 },
];

function descTerrain(t: typeof TERRAIN_CATALOG[0]): string {
  if (t.movementCost >= 99) return 'Impassable water body';
  if (t.movementCost >= 3) return 'High terrain, slow movement';
  return t.buildable ? 'Fertile land, can build' : 'Wooded area, blocks building';
}

// ── Mesh catalog (3D models created with Babylon.js) ─────────────────

const MESH_CATALOG = [
  { name: 'Ground Plane',      builder: 'CreateGround',         source: 'TerrainRenderer.ts',   vertices: 4,    desc: 'Flat terrain quad, 100×100 units, emissive grass green' },
  { name: 'Debug Marker',      builder: 'CreateSphere',         source: 'TerrainRenderer.ts',   vertices: '~200', desc: 'Red sphere at map center, diameter 1' },
  { name: 'Castle Mesh',       builder: 'SceneLoader (OBJ)',    source: 'BuildingMesh.ts',      vertices: '?',   desc: 'Loaded from assets/models/castle.obj' },
  { name: 'Water Plane',       builder: 'CreateGround',         source: 'WaterPlane.ts',        vertices: 4,    desc: 'Flat water surface, 100×100, alpha 0.8, mirror texture' },
  { name: 'Building (generic)',builder: 'SceneLoader (OBJ)',    source: 'BuildingMesh.ts',      vertices: '?',   desc: 'Per-building-type OBJ from assets/models/' },
];

// ── Texture catalog (image files referenced by the project) ─────────

const TEXTURE_CATALOG = [
  // UI / Brand
  { name: 'Splash Screen',         path: 'assets/images/splash.png',      dims: '4K (responsive)', source: 'PROMPTS.md §Splash',     desc: 'Game splash screen, center 9:16 safe zone' },
  { name: 'Menu Background',       path: 'assets/images/menu-bg.png',     dims: '4K (responsive)', source: 'PROMPTS.md §Menu BG',    desc: 'Twilight village, center dark band for text' },
  { name: 'Logo',                  path: 'assets/images/logo-1024.png',  dims: '1024×1024',       source: 'PROMPTS.md §Logo',       desc: 'S4WN game logo, medieval wood/stone style' },
  { name: 'Favicon',               path: 'assets/images/favicon-256.png',dims: '256×256',         source: 'PROMPTS.md §Favicon',    desc: 'Castle tower on green circle' },
  // Particles
  { name: 'Particle — Smoke',      path: 'assets/textures/particle_smoke.png',        dims: '—', source: 'ParticleSystem.ts', desc: 'Semi-transparent smoke puff' },
  { name: 'Particle — Fire',       path: 'assets/textures/particle_fire.png',         dims: '—', source: 'ParticleSystem.ts', desc: 'Orange flame sprite' },
  { name: 'Particle — Explosion',  path: 'assets/textures/particle_explosion.png',    dims: '—', source: 'ParticleSystem.ts', desc: 'Fireball burst' },
  { name: 'Particle — Spark',      path: 'assets/textures/particle_spark.png',        dims: '—', source: 'ParticleSystem.ts', desc: 'Small bright spark' },
  { name: 'Particle — Dust',       path: 'assets/textures/particle_dust.png',         dims: '—', source: 'ParticleSystem.ts', desc: 'Brown dust cloud' },
  { name: 'Particle — Rain',       path: 'assets/textures/particle_rain.png',         dims: '—', source: 'ParticleSystem.ts', desc: 'Raindrop streak' },
  { name: 'Particle — Snow',       path: 'assets/textures/particle_snow.png',         dims: '—', source: 'ParticleSystem.ts', desc: 'White snowflake' },
  { name: 'Particle — Water Splash', path: 'assets/textures/particle_water.png',      dims: '—', source: 'ParticleSystem.ts', desc: 'Blue splash droplets' },
  { name: 'Particle — Construction', path: 'assets/textures/particle_construction.png',dims: '—',source: 'ParticleSystem.ts', desc: 'Wood chips / dust' },
  { name: 'Particle — Spawn',      path: 'assets/textures/particle_spawn.png',        dims: '—', source: 'ParticleSystem.ts', desc: 'White glow flash' },
  { name: 'Particle — Death',      path: 'assets/textures/particle_death.png',        dims: '—', source: 'ParticleSystem.ts', desc: 'Red burst' },
  { name: 'Particle — Flash',      path: 'assets/textures/particle_flash.png',        dims: '—', source: 'ParticleSystem.ts', desc: 'Bright lens flare' },
  { name: 'Particle — Impact',     path: 'assets/textures/particle_impact.png',       dims: '—', source: 'ParticleSystem.ts', desc: 'Sparks on hit' },
  { name: 'Particle — Fog',        path: 'assets/textures/particle_fog.png',          dims: '—', source: 'ParticleSystem.ts', desc: 'Grey mist' },
  { name: 'Particle — Magic',      path: 'assets/textures/particle_magic.png',        dims: '—', source: 'ParticleSystem.ts', desc: 'Purple sparkle' },
  // Terrain (procedural)
  { name: 'Terrain Splat',         path: '(procedural)',          dims: '256×256',        source: 'TerrainRenderer.ts',      desc: 'Runtime-generated splat-map texture' },
];

// ── Animation catalog ────────────────────────────────────────────────

const ANIMATION_CATALOG = [
  { name: 'Splash → Menu fade',     type: 'CSS Transition',  duration: '3s',    target: 'UI overlay',         desc: 'Fade-out splash, fade-in main menu after 3s load' },
  { name: 'Menu button hover',      type: 'CSS Transition',  duration: '0.2s',  target: '.menu-button',        desc: 'Scale + color shift on hover' },
  { name: 'Water ripple',           type: 'UV Scroll',       duration: 'loop',  target: 'WaterPlane material',  desc: 'Normal map UV offset scroll (dt × 0.01)' },
  { name: 'Particle lifetime',      type: 'Babylon.js GPU',  duration: '0.3–2s',target: 'All particle effects', desc: 'Size/alpha/color fade over lifetime' },
  { name: 'Camera orbit (touch)',   type: 'Babylon.js Input',duration: 'realtime',target: 'ArcRotateCamera',       desc: 'Pinch-zoom + two-finger pan via TouchCameraController' },
  { name: 'Toast notification',     type: 'CSS Animation',   duration: '2.5s',  target: 'HUD toast',            desc: 'Slide-in, hold, fade-out (from HUD.ts)' },
];

// ── Helpers ──────────────────────────────────────────────────────────

function fmtCost(items: Array<{resource: any; amount: number}>): string {
  if (items.length === 0) return 'none';
  return items.map(i => `${resourceName(i.resource)}×${i.amount}`).join(', ');
}

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
      { label: 'Terrain',   id: 'terrain' },
      { label: 'Buildings', id: 'buildings' },
      { label: 'Units',     id: 'units' },
      { label: 'Meshes',    id: 'meshes' },
      { label: 'Textures',  id: 'textures' },
      { label: 'Animations',id: 'animations' },
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

    // Tab switching
    this.container.querySelectorAll('.explorer-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const cat = (e.target as HTMLElement).dataset.tab as CatalogTab;
        this.setActiveTab(cat);
      });
    });

    // Bold the default tab
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

  public toggle(): void { this.isOpen ? this.hide() : this.show(); }

  // ── Tab handlers ───────────────────────────────────────────────────

  private refresh(): void {
    switch (this.activeCatalog) {
      case 'terrain':    this.showTerrain();    break;
      case 'buildings':  this.showBuildings();  break;
      case 'units':      this.showUnits();      break;
      case 'meshes':     this.showMeshes();     break;
      case 'textures':   this.showTextures();   break;
      case 'animations': this.showAnimations(); break;
    }
  }

  private showTerrain(): void {
    this.updateList(TERRAIN_CATALOG.map(t => ({
      id: `terrain-${t.terrain}`,
      type: 'terrain-type',
      name: t.terrain.toString(),
      properties: {
        splatColor: `rgb(${t.splatRgb})`,
        buildable: t.buildable,
        movementCost: t.movementCost,
        description: descTerrain(t),
        generation: 'Procedural splat-map shader (TerrainRenderer.ts)',
      }
    })));
  }

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
          productionInterval: interval > 0 ? `${interval} ticks (${(interval/10).toFixed(1)}s)` : 'no production',
          requiredTool: requiredTool(kind)?.toString() ?? 'none',
          requiresSettler: requiresSettler(kind),
          generation: 'Procedural mesh (BuildingMesh.ts) — OBJ from assets/models/',
          count: this.gameLoop.economy.getCompleteBuildings().filter(x => buildingName(x.kind) === name).length,
          runtime_hp: `${b.hp}/${b.maxHp}`,
          runtime_active: b.isActive,
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
            productionInterval: interval > 0 ? `${interval} ticks (${(interval/10).toFixed(1)}s)` : 'no production',
            requiredTool: requiredTool(kind)?.toString() ?? 'none',
            requiresSettler: requiresSettler(kind),
            generation: 'Procedural mesh (BuildingMesh.ts) — OBJ from assets/models/',
            count: 0,
          }
        });
      }
    }
    objects.sort((a, b) => a.name.localeCompare(b.name));
    this.updateList(objects);
  }

  private showUnits(): void {
    const unitKinds = [
      { name: 'Settler',   hp: 50,  atk: 1,  speed: 1.5, sight: 8,  desc: 'Civilian; builds and gathers' },
      { name: 'Swordsman', hp: 100, atk: 15, speed: 1.0, sight: 6,  desc: 'Melee infantry' },
      { name: 'Bowman',    hp: 75,  atk: 12, speed: 1.2, sight: 10, desc: 'Ranged unit' },
      { name: 'Worker',    hp: 40,  atk: 1,  speed: 1.0, sight: 5,  desc: 'Operates buildings' },
      { name: 'Pioneer',   hp: 40,  atk: 1,  speed: 1.0, sight: 5,  desc: 'Border expander' },
    ];
    this.updateList(unitKinds.map(u => ({
      id: `unit-${u.name}`,
      type: 'unit',
      name: u.name,
      properties: {
        hp: u.hp, attack: u.atk, speed: u.speed, sightRange: u.sight,
        description: u.desc,
        generation: 'Game-logic entity; mesh from glTF/OBJ (BuildingMesh.ts)',
        count: this.gameLoop.unitManager.getAliveUnits().filter(x => x.kind.toString() === u.name).length,
      }
    })));
  }

  private showMeshes(): void {
    this.updateList(MESH_CATALOG.map(m => ({
      id: `mesh-${m.name}`,
      type: '3d-mesh',
      name: m.name,
      properties: {
        builder: m.builder,
        source: m.source,
        vertices: m.vertices,
        description: m.desc,
      }
    })));
  }

  private showTextures(): void {
    this.updateList(TEXTURE_CATALOG.map(t => ({
      id: `tex-${t.name}`,
      type: 'texture',
      name: t.name,
      properties: {
        filePath: t.path,
        dimensions: t.dims,
        prompt: t.source,
        description: t.desc,
      }
    })));
  }

  private showAnimations(): void {
    this.updateList(ANIMATION_CATALOG.map(a => ({
      id: `anim-${a.name}`,
      type: 'animation',
      name: a.name,
      properties: {
        type: a.type,
        duration: a.duration,
        target: a.target,
        description: a.desc,
      }
    })));
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
