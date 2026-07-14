/**
 * S4WN Babylon.js/TypeScript - Object Explorer (P13 Enhanced Debugging Tool)
 *
 * Features:
 * - Search/filter with real-time highlighting
 * - Type-first catalog → click to drill into runtime instances
 * - Visual asset chain: mesh → texture → animation flow
 * - Generation prompt excerpts inlined from PROMPTS.md
 * - Collapsible sections in detail panel
 * - GitHub issue deep-link on every asset
 */

import { GameLoop } from '../../game/GameLoop';
import { Terrain } from '../../game/types';
import {
  BuildingType, BUILDING_NAMES, buildCost, buildTime, productionInterval,
  buildingInputs, buildingOutputs, requiredTool, requiresSettler,
  resourceName, buildingName, ResourceType, RESOURCE_COUNT,
} from '../../economy/types';
import { borderPostModelName, borderPostColor, borderPostNationName } from '../../game/BorderPost';

export interface ExplorerObject {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
}

type CatalogTab = 'terrain' | 'buildings' | 'units' | 'resources' | 'decorations' | 'misc';

// ── Helpers ──────────────────────────────────────────────────────────

function fmtCost(items: Array<{ resource: any; amount: number }>): string {
  if (items.length === 0) return 'none';
  return items.map(i => `${resourceName(i.resource)}\u00d7${i.amount}`).join(', ');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function propRow(key: string, val: any): string {
  const d = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  return `<div class="explorer-prop-row"><span class="prop-key">${key}:</span><span class="prop-val">${esc(d)}</span></div>`;
}

// ── Generation Prompt Excerpts (inlined from PROMPTS.md) ────────────

const PROMPT_EXCERPTS: Record<string, string> = {
  building_stone: 'Seamless medieval stone masonry. 512\u00d7512 tileable. Weathered grey stone blocks with mortar lines, subtle moss. Flat diffuse, no shadows. PROMPTS.md \u00a7Stone Masonry.',
  building_timber: 'Seamless timber planks. 512\u00d7512 tileable. Rough-sawn wood with rich brown grain, saw marks. Flat diffuse. PROMPTS.md \u00a7Timber Planks.',
  building_thatch: 'Seamless thatched roof. 512\u00d7512 tileable. Dense golden-brown straw weave. Flat diffuse. PROMPTS.md \u00a7Thatch/Straw.',
  building_marble: 'Seamless white marble. 512\u00d7512 tileable. Polished smooth with faint grey veining. Flat diffuse. PROMPTS.md \u00a7White Marble.',
  building_metal: 'Seamless wrought iron. 512\u00d7512 tileable. Dark grey-black riveted plates, slight rust patina. Flat diffuse. PROMPTS.md \u00a7Wrought Iron.',
  building_adobe: 'Seamless mud-brick. 512\u00d7512 tileable. Sandy brown bricks with rough mortar, sun-baked look. Flat diffuse. PROMPTS.md \u00a7Mud-Brick/Adobe.',
  building_darkstone: 'Seamless dark stone. 512\u00d7512 tileable. Obsidian-black blocks, purple-grey mortar. Flat diffuse. PROMPTS.md \u00a7Dark Stone.',
  unit_settler: 'Character UV sheet 256\u00d7256. Head: fair face, brown eyes, short hair. Torso: cream linen tunic, brown belt. Arms: cream sleeves. Legs: brown trousers, black boots. PROMPTS.md \u00a7Settler.',
  unit_soldier: 'Character UV sheet 256\u00d7256. Head: stern face, grey helmet. Torso: chainmail, red tabard. Arms: mail sleeves. Legs: grey plate greaves. PROMPTS.md \u00a7Soldier.',
  unit_archer: 'Character UV sheet 256\u00d7256. Head: green hood framing face. Torso: green tunic, brown cross-strap. Arms: rolled sleeves. Legs: leather trousers. PROMPTS.md \u00a7Archer.',
  unit_worker: 'Character UV sheet 256\u00d7256. Head: friendly face. Torso: brown tunic, grey apron. Arms: rolled sleeves. Legs: grey-brown trousers. PROMPTS.md \u00a7Worker.',
  unit_pioneer: 'Character UV sheet 256\u00d7256. Head: rugged face, wide-brim hat. Torso: leather jerkin. Arms: leather sleeves. Legs: tall boots. PROMPTS.md \u00a7Pioneer.',
  splash: '4K splash screen. Painterly medieval village in valley at golden hour. Castle, village square, timber-frame houses. Title "S4WN" in medieval typography. Center-safe for 9:16. PROMPTS.md \u00a7Splash.',
  logo: 'Game logo. Rustic medieval typography "S4WN", wood/stone texture, bronze-gold trim. Circular seal, dark green background. 1024\u00d71024. PROMPTS.md \u00a7Logo.',
  terrain_grass: 'Seamless grass 1024\u00d71024. Lush green with wildflowers, must tile at all four edges. Top-down orthographic, flat diffuse. PROMPTS.md \u00a7Terrain Grass.',
  terrain_forest: 'Seamless forest floor 1024\u00d71024. Dark woodland with fallen leaves, moss, ferns. Must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Forest.',
  terrain_desert: 'Seamless desert sand 1024\u00d71024. Golden sand with wind ripples, pebbles, dry grass tufts. Must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Desert.',
  terrain_mountain: 'Seamless rocky mountain 1024\u00d71024. Jagged grey rock, cracks, alpine grass patches. Must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Mountain.',
  terrain_snow: 'Seamless snow terrain 1024\u00d71024. White snow with crystalline sparkle, blue-grey shadows. Must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Snow.',
  terrain_water: 'Seamless shallow water 1024\u00d71024. Teal-blue ripples with caustic patterns, must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Water.',
  terrain_deepwater: 'Seamless deep water 1024\u00d71024. Dark navy ocean surface with slow wave patterns, opaque. Must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Deep Water.',
  terrain_swamp: 'Seamless swamp 1024\u00d71024. Murky green-brown water with algae, lily pads, reeds. Must tile at all four edges. Top-down, flat diffuse. PROMPTS.md \u00a7Terrain Swamp.',
};

function promptExcerpt(key: string): string {
  if (PROMPT_EXCERPTS[key]) return PROMPT_EXCERPTS[key];
  for (const [k, v] of Object.entries(PROMPT_EXCERPTS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return '';
}

/** Resolve a texture string to an actual image URL that Vite serves. Tries multiple path patterns. */
function resolveTextureUrl(texture: string): string | null {
  if (!texture) return null;
  // Extract the filename from the chain texture string
  const fnameM = texture.match(/([a-zA-Z0-9_-]+\\.(png|jpg|webp|gif))/i);
  if (!fnameM) return null;
  const fname = fnameM[1];
  // Try common asset directories (Vite publicDir: 'assets' serves these at root)
  const candidates = [
    `/textures/${fname}`,
    `/images/${fname}`,
    `/models/${fname}`,
  ];
  // Return the first candidate — the browser will 404 if it's wrong,
  // and the onerror handler hides broken images
  return candidates[0]; // textures/ is most common
}

// ── Terrain catalog ──────────────────────────────────────────────────

interface TerrainDef { terrain: Terrain; splatRgb: string; buildable: boolean; movementCost: number; desc: string; }
const TERRAIN_DEFS: TerrainDef[] = [
  { terrain: Terrain.Grass,     splatRgb: '50,200,50',   buildable: true,  movementCost: 1.0, desc: 'Fertile grassland' },
  { terrain: Terrain.Forest,    splatRgb: '20,100,20',   buildable: false, movementCost: 2.0, desc: 'Dense woodland' },
  { terrain: Terrain.Desert,    splatRgb: '200,200,100', buildable: true,  movementCost: 1.2, desc: 'Sandy plains' },
  { terrain: Terrain.Mountain,  splatRgb: '100,100,100', buildable: false, movementCost: 3.0, desc: 'Rocky peaks' },
  { terrain: Terrain.Snow,      splatRgb: '255,255,255', buildable: true,  movementCost: 1.5, desc: 'Snow-covered' },
  { terrain: Terrain.Water,     splatRgb: '0,0,255',     buildable: false, movementCost: 99,  desc: 'Shallow water' },
  { terrain: Terrain.DeepWater, splatRgb: '0,0,255',     buildable: false, movementCost: 99,  desc: 'Deep ocean' },
  { terrain: Terrain.Swamp,     splatRgb: '50,50,0',     buildable: false, movementCost: 2.5, desc: 'Murky marsh' },
];

// ── Building → texture key mapping ──────────────────────────────────

function cardToTexKey(name: string): string {
  const l = name.toLowerCase();
  if (/castle|barracks|guard.?tower|fortress|siege/.test(l)) return 'building_stone';
  if (/dark.*temple|dark.*garden|dark.*fortress|demon.*gate|sanctuary.*(morbus|pestilence)/.test(l)) return 'building_darkstone';
  if (/temple|sanctuary|colosseum|oracle|observatory|amphitheater/.test(l)) return 'building_marble';
  if (/(gold|iron|weapon|tool|powder).*(smith|foundry|smelter)|slaughterhouse/.test(l)) return 'building_metal';
  if (/sawmill|woodcutter|forester|storehouse|storage|shipyard|road|residence|landing/.test(l)) return 'building_timber';
  if (/mine|marketplace|agave|distillery|oil.?press|mushroom/.test(l)) return 'building_adobe';
  return 'building_thatch';
}

// ── ObjectExplorer ───────────────────────────────────────────────────

export class ObjectExplorer {
  private container: HTMLElement;
  private listEl!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private detailsEl!: HTMLElement;
  private isOpen = false;
  private gameLoop: GameLoop | null = null;
  private activeTab: CatalogTab = 'terrain';
  private objects: ExplorerObject[] = [];
  private isMobile = false;
  /** Track the currently selected object ID so we can refresh its details live. */
  private selectedObjectId: string | null = null;
  /** Auto-refresh toggle — when enabled, update() re-renders the currently open detail every tick. */
  private autoRefresh = true;
  private autoRefreshCallback: (() => void) | null = null;

  constructor() {
    this.gameLoop = null;
    this.isMobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches === true;
    this.container = document.createElement('div');
    this.container.className = 'ui-screen explorer-panel hidden';
    this.build();
  }

  /**
   * Connect to a live GameLoop to enable runtime data display.
   * This enables the "Live" toggle and per-tick updates.
   */
  public connectGame(gl: GameLoop): void {
    this.gameLoop = gl;
    
    const header = this.container.querySelector('.explorer-header');
    if (header && !this.container.querySelector('.explorer-autorefresh-toggle')) {
      const liveToggleHtml = '<label class="explorer-autorefresh-toggle" title="Auto-refresh live data every tick"><input type="checkbox" id="explorer-autorefresh" checked /> Live</label>';
      const closeBtn = header.querySelector('.explorer-close');
      if (closeBtn) {
        closeBtn.insertAdjacentHTML('beforebegin', liveToggleHtml);
      }
      const autoRefreshEl = this.container.querySelector('#explorer-autorefresh') as HTMLInputElement | null;
      if (autoRefreshEl) {
        autoRefreshEl.checked = this.autoRefresh;
        autoRefreshEl.addEventListener('change', () => { this.autoRefresh = autoRefreshEl.checked; });
      }
    }
    
    this.setupLiveRefresh();
  }

  private setupLiveRefresh(): void {
    // Subscribe to game ticks for auto-refresh
    this.autoRefreshCallback = () => this.update();
    this.gameLoop?.onTick(this.autoRefreshCallback);
  }

  // ── Build DOM ────────────────────────────────────────────────────

  private build(): void {
    const tabs: CatalogTab[] = ['terrain','buildings','units','resources','decorations','misc'];
    // "Live" toggle only shown when connected to a GameLoop
    const liveToggle = this.gameLoop ? '<label class="explorer-autorefresh-toggle" title="Auto-refresh live data every tick"><input type="checkbox" id="explorer-autorefresh" checked /> Live</label>' : '';
     this.container.innerHTML = `<div class="explorer-container">
       <div class="explorer-header"><span class="explorer-title">Object Explorer</span>
         ${liveToggle}
         <button class="explorer-close">&times;</button></div>
       <div class="explorer-mobile-back" id="explorer-mobile-back">&larr; Back</div>
      <div class="explorer-content">
        <div class="explorer-list-section">
          <div class="explorer-list-header" id="explorer-tabs">${tabs.map(t => `<span class="explorer-tab" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</span>`).join('')}</div>
          <div class="explorer-search-box"><input type="text" id="explorer-search" placeholder="🔍 Filter..." autocomplete="off" /></div>
          <div class="explorer-list" id="explorer-list"></div>
        </div>
       <div class="explorer-details-section">
          <div class="explorer-details-header">Details</div>
          <div class="explorer-details" id="explorer-details"><div class="explorer-empty-msg">Select an object to inspect</div></div>
        </div>
       </div></div>`;
    this.listEl = this.container.querySelector('#explorer-list')!;
    this.detailsEl = this.container.querySelector('#explorer-details')!;
    this.searchInput = this.container.querySelector('#explorer-search')!;
    this.searchInput.addEventListener('input', () => this.filter());
    this.container.querySelector('.explorer-close')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#explorer-mobile-back')?.addEventListener('click', () => this.showListView());
    const autoRefreshEl = this.container.querySelector('#explorer-autorefresh') as HTMLInputElement | null;
    if (autoRefreshEl) {
      autoRefreshEl.checked = this.autoRefresh;
      autoRefreshEl.addEventListener('change', () => { this.autoRefresh = autoRefreshEl.checked; });
    }
    this.container.querySelectorAll('.explorer-tab').forEach(tab =>
      tab.addEventListener('click', e => this.switchTab((e.target as HTMLElement).dataset.tab as CatalogTab)));
    this.switchTab('terrain');
    document.getElementById('ui-overlay')?.appendChild(this.container);
  }

  // ── Tab control ──────────────────────────────────────────────────

  private switchTab(t: CatalogTab): void {
    this.activeTab = t; this.searchInput.value = ''; this.selectedObjectId = null; this.showListView();
    this.container.querySelectorAll('.explorer-tab').forEach(el =>
      (el as HTMLElement).style.fontWeight = (el as HTMLElement).dataset.tab === t ? 'bold' : 'normal');
    this.loadCatalog(); this.filter();
  }
  public show(): void { this.container.classList.remove('hidden'); this.container.classList.add('active'); this.isOpen = true; this.loadCatalog(); this.filter(); this.showListView(); }
  public hide(): void { this.container.classList.add('hidden'); this.container.classList.remove('active'); this.isOpen = false; this.selectedObjectId = null; }
  public toggle(): void { this.isOpen ? this.hide() : this.show(); }

  /**
   * Called from the game loop tick. Refreshes the catalog data and the
   * currently open detail view so HP, position, AI state, and economy
   * progress stay live while the panel is visible.
   */
  public update(): void {
    if (!this.isOpen || !this.autoRefresh) return;
    this.loadCatalog();
    this.filter();

    // Refresh the detail view if one is selected
    if (this.selectedObjectId && this.objects.length > 0) {
      const obj = this.objects.find(o => o.id === this.selectedObjectId);
      if (obj) {
        this.showDetails(obj);
      } else {
        this.selectedObjectId = null;
      }
    }
  }

  private showListView(): void {
    this.container.classList.remove('explorer-mobile-details');
    this.container.classList.add('explorer-mobile-list');
  }

  private showDetailView(): void {
    this.container.classList.remove('explorer-mobile-list');
    this.container.classList.add('explorer-mobile-details');
  }
  private loadCatalog(): void {
    switch (this.activeTab) {
      case 'terrain': this.loadTerrain(); break; case 'buildings': this.loadBuildings(); break;
      case 'units': this.loadUnits(); break; case 'resources': this.loadResources(); break;
      case 'decorations': this.loadDecorations(); break;
      case 'misc': this.loadMisc(); break;
    }
  }

  // ── Catalog loaders ──────────────────────────────────────────────

  private loadTerrain(): void {
    const texMap: Record<string, string> = {
      'Grass': 'terrain_grass.png', 'Forest': 'terrain_forest.png',
      'Desert': 'terrain_desert.png', 'Mountain': 'terrain_mountain.png',
      'Snow': 'terrain_snow.png', 'Water': 'terrain_water.png',
      'DeepWater': 'terrain_water.png', 'Swamp': 'terrain_swamp.png',
    };
    this.objects = TERRAIN_DEFS.map(t => ({
      id: `terrain-${t.terrain}`, type: 'terrain', name: t.terrain.toString(),
      _promptKey: `terrain_${t.terrain.toString().toLowerCase()}`,
      _chain: {
        mesh: 'Ground Plane — CreateGround 100×100, 4 verts (TerrainRenderer.ts)',
        texture: `assets/textures/${texMap[t.terrain.toString()] ?? 'terrain_grass.png'}`,
        animation: `Water UV scroll loop (WaterPlane.ts) — ${t.terrain === Terrain.Water || t.terrain === Terrain.DeepWater ? 'enabled' : 'N/A'}`,
      },
      properties: { description:t.desc, buildable:t.buildable, movementCost:t.movementCost, splatColor:`rgb(${t.splatRgb})` }
    }));
  }

  private loadBuildings(): void {
    const placed = this.gameLoop?.economy.getCompleteBuildings() ?? [];
    if (placed.length > 0) {
      const counts = new Map<string, { count: number; instances: any[] }>();
      for (const b of placed) {
        const nm = buildingName(b.kind);
        const e = counts.get(nm) || { count: 0, instances: [] };
        e.count++; e.instances.push(b); counts.set(nm, e);
      }
      this.objects = [...counts.entries()].map(([nm, d]) => {
        const idx = BUILDING_NAMES.indexOf(nm);
        const kind = (idx >= 0 ? idx : 0) as BuildingType;
        const interval = productionInterval(kind);
        const tex = cardToTexKey(nm);
        return {
          id: `building-${nm}`, type: 'building', name: `${nm} (${d.count})`,
          _kind: kind, _instances: d.instances, _texKey: tex, _promptKey: tex,
          _chain: { mesh:`assets/models/${nm.toLowerCase()}.obj`, texture:`MTL→map_Kd→${tex}.png`, animation:`${buildTime(kind)}t constr + ${interval > 0 ? interval+'t prod' : 'none'}` },
          properties: { kind:nm, cost:fmtCost(buildCost(kind)), buildTime:`${buildTime(kind)}t`,
            produces: interval > 0 ? `${fmtCost(buildingOutputs(kind))}/${interval}t` : 'none',
            consumes: fmtCost(buildingInputs(kind)), tool:requiredTool(kind)?.toString()??'none',
            needsSettler: requiresSettler(kind), placed: d.count }
        };
      });
    } else {
      this.objects = BUILDING_NAMES.filter(Boolean).map(nm => {
        const idx = BUILDING_NAMES.indexOf(nm); const kind = (idx>=0?idx:0) as BuildingType;
        const interval = productionInterval(kind); const tex = cardToTexKey(nm);
        return {
          id: `building-${nm}`, type: 'building', name: nm,
          _kind: kind, _instances: [], _texKey: tex, _promptKey: tex,
          _chain: { mesh:`assets/models/${nm.toLowerCase()}.obj`, texture:`MTL→map_Kd→${tex}.png`, animation:`${buildTime(kind)}t constr + ${interval>0?interval+'t prod':'none'}` },
          properties: { kind:nm, cost:fmtCost(buildCost(kind)), buildTime:`${buildTime(kind)}t`,
            produces:interval>0?`${fmtCost(buildingOutputs(kind))}/${interval}t`:'none',
            consumes:fmtCost(buildingInputs(kind)), tool:requiredTool(kind)?.toString()??'none',
            needsSettler:requiresSettler(kind), placed:0 }
        };
      }).sort((a,b)=>a.name.localeCompare(b.name));
    }
  }

  private loadUnits(): void {
    const alive = this.gameLoop?.unitManager.getAliveUnits() ?? [];
    const defs = [
      { n:'Settler', hp:50,a:1,sp:1.5,si:8, idle:'Standing, slight sway', walk:'Walk 1.5 — A*', work:'Hammer (build) + carry (haul)' },
      { n:'Swordsman', hp:100,a:15,sp:1.0,si:6, idle:'At attention, shield fwd', walk:'March 1.0 — A*', work:'Slash/parry combat (CombatAI)' },
      { n:'Bowman', hp:75,a:12,sp:1.2,si:10, idle:'Bow lowered, scanning', walk:'Jog 1.2 — A*', work:'Draw→aim→release at range' },
      { n:'Worker', hp:40,a:1,sp:1.0,si:5, idle:'At building entrance', walk:'Walk 1.0 — to workplace', work:'Tool anim per bldg type' },
      { n:'Pioneer', hp:40,a:1,sp:1.0,si:5, idle:'Standing w/shovel', walk:'Walk 1.0 — to border', work:'Digging loop, expand territory' },
    ];
    this.objects = defs.map(u => {
      const inst = alive.filter((x:any) => x.kind?.toString() === u.n);
      const k = `unit_${u.n.toLowerCase()}`;
      return {
        id: `unit-${u.n}`, type: 'unit', name: `${u.n} (${inst.length})`,
        _instances: inst, _texKey: k, _promptKey: k,
        _chain: { mesh:'Humanoid OBJ — head/torso/arms/legs, UV-unwrapped', texture:`${k}.png → PROMPTS.md §Unit ${u.n}`, animation:`${u.idle} | ${u.walk} | ${u.work}` },
        properties: { hp:u.hp, atk:u.a, speed:u.sp, sight:u.si, alive: inst.length }
      };
    });
  }

  /**
   * Glyph + color badge per resource. The actual icon assets live as
   * OBJ models (`assets/models/icon_*.obj`) which can't be rendered inline
   * in a DOM list, so we surface a distinct glyph/color here and reference
   * the OBJ model in the detail asset-chain.
   */
  private resourceIcon(disc: number): { glyph: string; color: string } {
    const ICONS: Record<number, { glyph: string; color: string }> = {
      0:  { glyph: '🪵', color: '#9b6a3c' }, // Wood
      1:  { glyph: '⛰️', color: '#8a8f98' }, // Iron Ore
      2:  { glyph: '⚫', color: '#2b2b2b' }, // Coal
      3:  { glyph: '🪙', color: '#d4af37' }, // Gold
      4:  { glyph: '🪨', color: '#9a9a9a' }, // Stone
      5:  { glyph: '🟡', color: '#e3c93a' }, // Sulfur
      6:  { glyph: '🐟', color: '#4aa3c7' }, // Fish
      7:  { glyph: '🌾', color: '#d9b94a' }, // Grain
      8:  { glyph: '🥩', color: '#b5524a' }, // Meat
      9:  { glyph: '💧', color: '#3b8fd1' }, // Water
      10: { glyph: '🍯', color: '#e0a83a' }, // Honey
      11: { glyph: '🟫', color: '#b07a3f' }, // Planks
      12: { glyph: '🔧', color: '#7f8c8d' }, // Tools
      13: { glyph: '⚔️', color: '#b0b6bd' }, // Weapons
      14: { glyph: '🍞', color: '#d9a441' }, // Bread
      15: { glyph: '🌫️', color: '#cdbf9a' }, // Flour
      16: { glyph: '🔩', color: '#9aa0a6' }, // Iron Ingots
      17: { glyph: '🍺', color: '#caa23a' }, // Mead
      18: { glyph: '🍷', color: '#7a2230' }, // Wine
    };
    return ICONS[disc] ?? { glyph: '❔', color: '#888' };
  }

  /** Maps a resource discriminant to its icon asset key (icon_*.obj filename stem). */
  private resourceIconKey(disc: number): string {
    const KEYS: Record<number, string> = {
      0: 'wood', 1: 'iron', 2: 'coal', 3: 'gold', 4: 'stone',
      5: 'sulfur', 6: 'fish', 7: 'grain', 8: 'meat', 9: 'water',
      10: 'honey', 11: 'planks', 12: 'tools', 13: 'weapons',
      14: 'bread', 15: 'flour', 16: 'iron', 17: 'mead', 18: 'wine',
    };
    return KEYS[disc] ?? 'wood';
  }

  /** Low-storage threshold: warn when a store is >= 90% full. */
  private static readonly LOW_STORAGE_PCT = 90;

  private loadResources(): void {
    const counts: Record<number, number> = this.gameLoop?.economy.getResourceCounts() ?? {};
    const storageCapacity = (this.gameLoop?.economy as any)?.storageCapacity ?? 100;
    const results: ExplorerObject[] = [];
    // Only the 19 real ResourceType enum members are valid — the discriminants
    // 19-28 are gaps and resourceName() falls back to "Resource#N" for those,
    // which we skip here.
    for (let disc = 0; disc < RESOURCE_COUNT; disc++) {
      const name = resourceName(disc as ResourceType);
      if (/^Resource#/.test(name)) continue;
      const amount = counts[disc] ?? 0;
      const pct = storageCapacity > 0 ? Math.round((amount / storageCapacity) * 100) : 0;
      const lowStorage = pct >= ObjectExplorer.LOW_STORAGE_PCT;
      const icon = this.resourceIcon(disc);
      const iconKey = this.resourceIconKey(disc);
      results.push({
        id: `resource-${disc}`, type: 'resource', name: `${name} (${amount})`,
        _icon: icon, _warn: lowStorage, _promptKey: `icon_${iconKey}`,
        _chain: { mesh:`assets/models/icon_${iconKey}.obj`, texture:`MTL→map_Kd→icon_${iconKey}.png`, animation:'static billboard badge' },
        properties: { amount, storageCapacity, percentFull: `${pct}%`, discriminant: disc, _lowStorage: lowStorage },
      } as ExplorerObject);
    }
    this.objects = results;
  }


  private loadDecorations(): void {
    // Border posts placed by Pioneers
    const borderPostEntries: ExplorerObject[] = [];
    const territory = this.gameLoop?.territoryManager || { borderPosts: { getCountByNation: () => null } as any };
    const bpCounts = territory.borderPosts?.getCountByNation();
    if (bpCounts && bpCounts.size > 0) {
      for (const [nationId, count] of bpCounts.entries()) {
        const name = borderPostNationName(nationId);
        const color = borderPostColor(nationId);
        const model = borderPostModelName(nationId);
        borderPostEntries.push({
          id: `deco-borderpost-${nationId}`,
          type: 'borderpost',
          name: `${name} Border Post (${count})`,
          _promptKey: `borderpost_${model.replace('borderpost_', '')}`,
          _chain: {
            mesh: `assets/models/${model}.obj`,
            texture: `MTL→Kd→${color}`,
            animation: 'static pennant'
          },
          properties: {
            nation: name,
            color: color,
            model: `${model}.obj`,
            placed: count,
          }
        } as ExplorerObject);
      }
    } else {
      // Show all 5 nation variants as catalog entries even when none placed yet
      for (let nId = 0; nId < 5; nId++) {
        const name = borderPostNationName(nId);
        const color = borderPostColor(nId);
        const model = borderPostModelName(nId);
        borderPostEntries.push({
          id: `deco-borderpost-${nId}`,
          type: 'borderpost',
          name: `${name} Border Post`,
          _promptKey: `borderpost_${model.replace('borderpost_', '')}`,
          _chain: {
            mesh: `assets/models/${model}.obj`,
            texture: `MTL→Kd→${color}`,
            animation: 'static pennant'
          },
          properties: {
            nation: name,
            color: color,
            model: `${model}.obj`,
            placed: 0,
          }
        } as ExplorerObject);
      }
    }

    this.objects = [
      { id:'d-water', type:'deco', name:'Water Plane', _promptKey:'', _chain:{ mesh:'CreateGround 100×100', texture:'Water normal + reflect 512px', animation:'UV scroll dt×0.01' }, properties:{} },
      { id:'d-debug', type:'deco', name:'Debug Marker', _promptKey:'', _chain:{ mesh:'CreateSphere d=1', texture:'Emissive red', animation:'none' }, properties:{} },
      ...borderPostEntries,
      ...['Smoke','Fire','Explosion','Spark','Dust','Rain','Snow','Water Splash','Construction','Spawn','Death','Flash','Impact','Fog','Magic']
        .map(n => ({ id:`d-${n.toLowerCase().replace(' ','')}`, type:'particle', name:n,
          _promptKey:`particle_${n.toLowerCase().replace(' ','_')}`,
          _chain:{ mesh:'GPU billboard quad', texture:`assets/textures/particle_${n.toLowerCase().replace(' ','_')}.png`, animation:'Size/alpha fade, velocity spread' },
          properties:{} }))
    ].map(d => ({ ...d, _instances:[] }));
  }

  private loadMisc(): void {
    this.objects = [
      { id:'m-splash',type:'ui',name:'Splash',_promptKey:'splash',_instances:[],_chain:{mesh:'CSS bg-image',texture:'/images/splash.png',animation:'Fade 0.3s'},properties:{file:'splash.png',format:'4K responsive center-safe'}},
      { id:'m-favicon',type:'ui',name:'Favicon',_promptKey:'',_instances:[],_chain:{mesh:'<link rel=icon>',texture:'/images/favicon-256.png',animation:'none'},properties:{file:'favicon-256.png',format:'256×256'}},
      { id:'m-audio',type:'audio',name:'Sound FX',_promptKey:'',_instances:[],_chain:{mesh:'Web Audio API',texture:'Oscillator+Gain nodes',animation:'Envelope attack/sustain/release'},properties:{source:'SoundManager.ts',sounds:'select,place,error,tick,win,lose (6 tones)'}},
      { id:'m-anim1',type:'anim',name:'Splash→Menu',_promptKey:'',_instances:[],_chain:{mesh:'.ui-screen div',texture:'CSS opacity',animation:'3s fade-out (UIManager.ts)'},properties:{type:'CSS Transition',duration:'3s'}},
      { id:'m-anim2',type:'anim',name:'Btn Hover',_promptKey:'',_instances:[],_chain:{mesh:'.menu-button',texture:'CSS transform+color',animation:'0.2s scale+color shift'},properties:{type:'CSS Transition',duration:'0.2s'}},
      { id:'m-anim3',type:'anim',name:'Toast',_promptKey:'',_instances:[],_chain:{mesh:'.toast div (HUD.ts)',texture:'CSS keyframes',animation:'2.5s slide-in→hold→fade'},properties:{type:'CSS Animation',duration:'2.5s'}},
    ].map(d => ({ ...d, type:d.type, name:d.name, _instances:(d as any)._instances||[], _chain:(d as any)._chain, _promptKey:(d as any)._promptKey||'', properties:d.properties }));
  }

  // ── Filter ───────────────────────────────────────────────────────

  private filter(): void {
    const q = this.searchInput.value.toLowerCase();
    this.listEl.innerHTML = '';
    this.objects.filter(o => !q || o.name.toLowerCase().includes(q) || o.type.includes(q))
      .forEach(o => {
        const div = document.createElement('div'); div.className = 'explorer-item';
        const x = o as any;
        let prefix = `<span class="explorer-item-type">[${o.type}]</span> `;
        // Resource rows get a colored glyph badge + low-storage warning indicator
        if (o.type === 'resource' && x._icon) {
          const warn = x._warn
            ? `<span class="explorer-res-warn" title="Storage >= 90% full — build/expand warehouse!">⚠</span>`
            : '';
          prefix += `<span class="explorer-res-icon" style="background:${x._icon.color}">${x._icon.glyph}</span>${warn} `;
        }
        div.innerHTML = `${prefix}<span class="explorer-item-name">${o.name}</span>`;
        div.addEventListener('click', () => this.showDetails(o));
        this.listEl.appendChild(div);
      });
  }

  // ── Detail view ──────────────────────────────────────────────────

   private showDetails(obj: ExplorerObject): void {
     this.selectedObjectId = obj.id;
     const x = obj as any;
     const promptTxt = x._promptKey ? promptExcerpt(x._promptKey) : '';
     const chain = x._chain;
     const instances: any[] = x._instances ?? [];
     const kind = x._kind as BuildingType | undefined;

     // Statics
     const statics = Object.entries(obj.properties as Record<string,any>)
       .filter(([k]) => !k.startsWith('🔴'))
       .map(([k,v]) => propRow(k,v)).join('');

     // Runtime cards
     let runtimeHtml = '';
     if (instances.length > 0) {
       if (obj.type === 'building') {
         const bt = buildTime(kind ?? BuildingType.Castle);
         runtimeHtml = instances.map((b: any, i: number) => {
           const progress = b.constructionProgress ?? b.progress ?? 0;
           const workerCount = (b.assignedSettlers ?? b.workers ?? []).length;
           return `<div class="explorer-instance-card">
             <div class="explorer-instance-header">🏠 #${i + 1} @(${b.x},${b.y})</div>
             <div>HP ${b.hp}/${b.maxHp} ${b.isActive ? '✅' : '⏸️'} | Prg ${progress}/${bt} | Workers ${workerCount}</div>
           </div>`;
         }).join('');
       } else if (obj.type === 'unit') {
         runtimeHtml = instances.map((u: any, i: number) => {
           const stateStr = u.state ?? '?';
           const stanceStr = u.stance ?? '?';
           const pathLen = typeof u.path?.len === 'function' ? u.path.len() : 0;
           const goal = typeof u.path?.goal === 'function' ? u.path.goal() : undefined;
           const goalStr = goal ? ` → (${goal.x},${goal.y})` : '';
           const targetStr = (u.targetX != null && u.targetY != null) ? ` | Target:(${u.targetX},${u.targetY})` : '';
           return `<div class="explorer-instance-card">
             <div class="explorer-instance-header">👤 #${u.id ?? i + 1} @(${u.x},${u.y})</div>
             <div>HP ${u.hp} | State:${stateStr} | Stance:${stanceStr} | Path:${pathLen} steps${goalStr}${targetStr}</div>
           </div>`;
         }).join('');
       }

     }

     const parts: string[] = [];

     if (chain) {
       // ── Texture preview — show raw image for ANY asset type ──
       const imgUrl = resolveTextureUrl(chain.texture);
       if (imgUrl) {
         parts.push(`<div class="explorer-section explorer-section-preview">
           <div class="explorer-section-title">🖼️ Texture Preview</div>
           <div class="explorer-section-body" style="text-align:center">
             <img src="${imgUrl}" class="explorer-tex-preview-full" onerror="this.style.display='none'" loading="lazy" />
           </div>
         </div>`);
       }

       // Build asset chain with inline thumbnails
       let texHtml = esc(chain.texture);
       const texMatch = resolveTextureUrl(chain.texture);
       if (texMatch) {
         texHtml = `<img src="${texMatch}" class="explorer-tex-preview" onerror="this.style.display='none'" /> ${esc(chain.texture)}`;
       }
       parts.push(`<div class="explorer-section">
       <div class="explorer-section-title">🔗 Asset Chain</div>
       <div class="explorer-section-body"><div class="explorer-chain">
         <div class="explorer-chain-node"><span>Mesh</span>${esc(chain.mesh)}</div>
         <div class="explorer-chain-arrow">↓</div>
         <div class="explorer-chain-node"><span>Texture</span>${texHtml}</div>
         <div class="explorer-chain-arrow">↓</div>
         <div class="explorer-chain-node"><span>Animation</span>${esc(chain.animation)}</div>
       </div></div></div>`);
     }

     if (promptTxt) parts.push(`<div class="explorer-section explorer-section-prompt">
       <div class="explorer-section-title" onclick="this.parentElement.classList.toggle('explorer-collapsed')">📝 Generation Prompt ▾</div>
       <div class="explorer-section-body"><code class="explorer-prompt-text">${esc(promptTxt)}</code></div></div>`);

     if (runtimeHtml) parts.push(`<div class="explorer-section">
       <div class="explorer-section-title" onclick="this.parentElement.classList.toggle('explorer-collapsed')">🔴 Runtime (${instances.length}) ▾</div>
       <div class="explorer-section-body">${runtimeHtml}</div></div>`);

     if (statics) parts.push(`<div class="explorer-section">
       <div class="explorer-section-title" onclick="this.parentElement.classList.toggle('explorer-collapsed')">📋 Asset Info ▾</div>
       <div class="explorer-section-body">${statics}</div></div>`);

     this.detailsEl.innerHTML = `<div class="explorer-detail-item"><strong>${obj.name}</strong></div>
       <div class="explorer-detail-item" style="opacity:0.6">${obj.type} · ${obj.id}</div>
       ${parts.join('\n')}`;

     // On mobile, switch from list to detail view
     if (this.isMobile) this.showDetailView();
   }
}