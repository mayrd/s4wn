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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function propRow(key: string, val: any): string {
  const d = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
  return `<div class="explorer-prop-row"><span class="prop-key">${key}:</span><span class="prop-val">${esc(d)}</span></div>`;
}

// ── Generation Prompt Excerpts (inlined from PROMPTS.md) ────────────

const PROMPT_EXCERPTS: Record<string, string> = {
  building_stone: 'Seamless medieval stone masonry. 512×512 tileable. Weathered grey stone blocks with mortar lines, subtle moss. Flat diffuse, no shadows. PROMPTS.md §Stone Masonry.',
  building_timber: 'Seamless timber planks. 512×512 tileable. Rough-sawn wood with rich brown grain, saw marks. Flat diffuse. PROMPTS.md §Timber Planks.',
  building_thatch: 'Seamless thatched roof. 512×512 tileable. Dense golden-brown straw weave. Flat diffuse. PROMPTS.md §Thatch/Straw.',
  building_marble: 'Seamless white marble. 512×512 tileable. Polished smooth with faint grey veining. Flat diffuse. PROMPTS.md §White Marble.',
  building_metal: 'Seamless wrought iron. 512×512 tileable. Dark grey-black riveted plates, slight rust patina. Flat diffuse. PROMPTS.md §Wrought Iron.',
  building_adobe: 'Seamless mud-brick. 512×512 tileable. Sandy brown bricks with rough mortar, sun-baked look. Flat diffuse. PROMPTS.md §Mud-Brick/Adobe.',
  building_darkstone: 'Seamless dark stone. 512×512 tileable. Obsidian-black blocks, purple-grey mortar. Flat diffuse. PROMPTS.md §Dark Stone.',
  unit_settler: 'Character UV sheet 256×256. Head: fair face, brown eyes, short hair. Torso: cream linen tunic, brown belt. Arms: cream sleeves. Legs: brown trousers, black boots. PROMPTS.md §Settler.',
  unit_soldier: 'Character UV sheet 256×256. Head: stern face, grey helmet. Torso: chainmail, red tabard. Arms: mail sleeves. Legs: grey plate greaves. PROMPTS.md §Soldier.',
  unit_archer: 'Character UV sheet 256×256. Head: green hood framing face. Torso: green tunic, brown cross-strap. Arms: rolled sleeves. Legs: leather trousers. PROMPTS.md §Archer.',
  unit_worker: 'Character UV sheet 256×256. Head: friendly face. Torso: brown tunic, grey apron. Arms: rolled sleeves. Legs: grey-brown trousers. PROMPTS.md §Worker.',
  unit_pioneer: 'Character UV sheet 256×256. Head: rugged face, wide-brim hat. Torso: leather jerkin. Arms: leather sleeves. Legs: tall boots. PROMPTS.md §Pioneer.',
  splash: '4K splash screen. Painterly medieval village in valley at golden hour. Castle, village square, timber-frame houses. Title "S4WN" in medieval typography. Center-safe for 9:16. PROMPTS.md §Splash.',
  menu_bg: '4K menu background. Twilight village silhouette, dark centered band for white text overlay. Atmospheric mist, warm window lights. Center-safe for 9:16. PROMPTS.md §Menu Background.',
  logo: 'Game logo. Rustic medieval typography "S4WN", wood/stone texture, bronze-gold trim. Circular seal, dark green background. 1024×1024. PROMPTS.md §Logo.',
  terrain_grass: 'Seamless grass 1024×1024. Lush green with wildflowers, must tile at all four edges. Top-down orthographic, flat diffuse. PROMPTS.md §Terrain Grass.',
  terrain_water: 'Seamless shallow water 1024×1024. Teal-blue ripples with caustic patterns, must tile at all four edges. Top-down, flat diffuse. PROMPTS.md §Terrain Water.',
};

function promptExcerpt(key: string): string {
  if (PROMPT_EXCERPTS[key]) return PROMPT_EXCERPTS[key];
  for (const [k, v] of Object.entries(PROMPT_EXCERPTS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return '';
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
  private gameLoop: GameLoop;
  private activeTab: CatalogTab = 'terrain';
  private objects: ExplorerObject[] = [];
  private isMobile = false;

  constructor(_ui: UIManager, gl: GameLoop) {
    this.gameLoop = gl;
    this.isMobile = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches === true;
    this.container = document.createElement('div');
    this.container.className = 'ui-screen explorer-panel hidden';
    this.build();
  }

  // ── Build DOM ────────────────────────────────────────────────────

  private build(): void {
    const tabs: CatalogTab[] = ['terrain','buildings','units','decorations','misc'];
    this.container.innerHTML = `<div class="explorer-container">
      <div class="explorer-header"><span class="explorer-title">🐞 Object Explorer</span><button class="explorer-close">&times;</button></div>
      <div class="explorer-mobile-back" id="explorer-mobile-back">&larr; Back</div>
      <div class="explorer-content">
        <div class="explorer-list-section">
          <div class="explorer-list-header" id="explorer-tabs">${tabs.map(t => `<span class="explorer-tab" data-tab="${t}">${t[0].toUpperCase()+t.slice(1)}</span>`).join('')}</div>
          <div class="explorer-search-box"><input type="text" id="explorer-search" placeholder="🔍 Filter..." autocomplete="off" /></div>
          <div class="explorer-list" id="explorer-list"></div>
        </div>
        <div class="explorer-details-section">
          <div class="explorer-details-header">Details<a href="#" class="explorer-debug-link" id="explorer-debug-link" target="_blank" title="Open GitHub issue">🐛 Report Issue</a></div>
          <div class="explorer-details" id="explorer-details"><div class="explorer-empty-msg">Select an object to inspect</div></div>
        </div>
      </div></div>`;
    this.listEl = this.container.querySelector('#explorer-list')!;
    this.detailsEl = this.container.querySelector('#explorer-details')!;
    this.searchInput = this.container.querySelector('#explorer-search')!;
    this.searchInput.addEventListener('input', () => this.filter());
    this.container.querySelector('.explorer-close')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#explorer-mobile-back')?.addEventListener('click', () => this.showListView());
    this.container.querySelectorAll('.explorer-tab').forEach(tab =>
      tab.addEventListener('click', e => this.switchTab((e.target as HTMLElement).dataset.tab as CatalogTab)));
    this.switchTab('terrain');
    document.getElementById('ui-overlay')?.appendChild(this.container);
  }

  // ── Tab control ──────────────────────────────────────────────────

  private switchTab(t: CatalogTab): void {
    this.activeTab = t; this.searchInput.value = ''; this.showListView();
    this.container.querySelectorAll('.explorer-tab').forEach(el =>
      (el as HTMLElement).style.fontWeight = (el as HTMLElement).dataset.tab === t ? 'bold' : 'normal');
    this.loadCatalog(); this.filter();
  }
  public show(): void { this.container.classList.remove('hidden'); this.container.classList.add('active'); this.isOpen = true; this.loadCatalog(); this.filter(); this.showListView(); }
  public hide(): void { this.container.classList.add('hidden'); this.container.classList.remove('active'); this.isOpen = false; }
  public toggle(): void { this.isOpen ? this.hide() : this.show(); }

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
      case 'units': this.loadUnits(); break; case 'decorations': this.loadDecorations(); break;
      case 'misc': this.loadMisc(); break;
    }
  }

  // ── Catalog loaders ──────────────────────────────────────────────

  private loadTerrain(): void {
    this.objects = TERRAIN_DEFS.map(t => ({
      id: `terrain-${t.terrain}`, type: 'terrain', name: t.terrain.toString(),
      _promptKey: (t.terrain === Terrain.Water || t.terrain === Terrain.DeepWater) ? 'terrain_water' : 'terrain_grass',
      _chain: { mesh:'Ground Plane — CreateGround 100×100, 4 verts (TerrainRenderer.ts)', texture:'Splat-map RGB procedural 256×256 per type', animation:'Water UV scroll loop (WaterPlane.ts)' },
      properties: { description:t.desc, buildable:t.buildable, movementCost:t.movementCost, splatColor:`rgb(${t.splatRgb})` }
    }));
  }

  private loadBuildings(): void {
    const placed = this.gameLoop.economy.getCompleteBuildings();
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
    const alive = this.gameLoop.unitManager.getAliveUnits();
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

  private loadDecorations(): void {
    this.objects = [
      { id:'d-water', type:'deco', name:'Water Plane', _promptKey:'', _chain:{ mesh:'CreateGround 100×100', texture:'Water normal + reflect 512px', animation:'UV scroll dt×0.01' }, properties:{} },
      { id:'d-debug', type:'deco', name:'Debug Marker', _promptKey:'', _chain:{ mesh:'CreateSphere d=1', texture:'Emissive red', animation:'none' }, properties:{} },
      ...['Smoke','Fire','Explosion','Spark','Dust','Rain','Snow','Water Splash','Construction','Spawn','Death','Flash','Impact','Fog','Magic']
        .map(n => ({ id:`d-${n.toLowerCase().replace(' ','')}`, type:'particle', name:n,
          _promptKey:`particle_${n.toLowerCase().replace(' ','_')}`,
          _chain:{ mesh:'GPU billboard quad', texture:`assets/textures/particle_${n.toLowerCase().replace(' ','_')}.png`, animation:'Size/alpha fade, velocity spread' },
          properties:{} }))
    ].map(d => ({ ...d, _instances:[] }));
  }

  private loadMisc(): void {
    this.objects = [
      { id:'m-splash',type:'ui',name:'Splash Screen',_promptKey:'splash',_instances:[],_chain:{mesh:'CSS bg-image',texture:'assets/images/splash.png',animation:'Fade 3s→menu'},properties:{file:'splash.png',format:'4K responsive 9:16-safe'}},
      { id:'m-menu-bg',type:'ui',name:'Menu BG',_promptKey:'menu_bg',_instances:[],_chain:{mesh:'CSS bg-image',texture:'assets/images/menu-bg.png',animation:'Fade 0.3s'},properties:{file:'menu-bg.png',format:'4K responsive center band'}},
      { id:'m-logo',type:'ui',name:'Game Logo',_promptKey:'logo',_instances:[],_chain:{mesh:'CSS img',texture:'assets/images/logo-1024.png',animation:'none'},properties:{file:'logo-1024.png',format:'1024×1024'}},
      { id:'m-favicon',type:'ui',name:'Favicon',_promptKey:'',_instances:[],_chain:{mesh:'<link rel=icon>',texture:'assets/images/favicon-256.png',animation:'none'},properties:{file:'favicon-256.png',format:'256×256'}},
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
        div.innerHTML = `<span class="explorer-item-type">[${o.type}]</span> <span class="explorer-item-name">${o.name}</span>`;
        div.addEventListener('click', () => this.showDetails(o));
        this.listEl.appendChild(div);
      });
  }

  // ── Detail view ──────────────────────────────────────────────────

  private showDetails(obj: ExplorerObject): void {
    const x = obj as any;
    const link = gitHubIssueLink(obj.type, obj.name);
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
        runtimeHtml = instances.map((b:any,i:number) =>
          `<div class="explorer-instance-card">
            <div class="explorer-instance-header">🏠 #${i+1} @(${b.x},${b.y})</div>
            <div>HP ${b.hp}/${b.maxHp} ${b.isActive?'✅':'⏸️'} | Prg ${(b as any).progress??'?'}/${bt} | Workers ${(b as any).workers?.length??0}</div>
          </div>`).join('');
      } else if (obj.type === 'unit') {
        runtimeHtml = instances.map((u:any,i:number) =>
          `<div class="explorer-instance-card">
            <div class="explorer-instance-header">👤 #${u.id??i+1} @(${u.x},${u.y})</div>
            <div>HP ${u.hp} | State:${u.state??'?'} | Stance:${u.stance??'?'} | Path:${u.path?.length??0} steps</div>
          </div>`).join('');
      }
    }

    const parts: string[] = [];
    parts.push(`<a href="${link}" target="_blank" class="explorer-issue-btn">🐛 Report Issue on GitHub</a>`);

    if (chain) {
      // Build texture preview — extract PNG path from chain.texture
      let texHtml = esc(chain.texture);
      const texMatch = (chain.texture as string).match(/[a-zA-Z0-9_/-]+\.png/i);
      if (texMatch) {
        const texPath = texMatch[0];
        texHtml = `<img src="/assets/textures/${texPath.split('/').pop()}" class="explorer-tex-preview" onerror="this.style.display='none'" /> ${esc(chain.texture)}`;
      }
      // Also try ../textures/ prefix
      if (!texMatch) {
        const altMatch = (chain.texture as string).match(/(?:textures\/)?([a-zA-Z0-9_-]+\.png)/i);
        if (altMatch) {
          texHtml = `<img src="/assets/textures/${altMatch[1]}" class="explorer-tex-preview" onerror="this.style.display='none'" /> ${esc(chain.texture)}`;
        }
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
