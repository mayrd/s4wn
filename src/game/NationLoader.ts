/**
 * S4WN — Nation Loader
 *
 * Discovers nation packs under assets/nations/ at startup and registers them
 * with `NationRegistry`. Built-in fallback nations are registered from
 * hardcoded defaults if no JSON files are found (e.g., in dev without assets).
 *
 * Loading path: `/nations/{id}/nation.json` (served by Vite/Caddy).
 */

import { NationRegistry, NationManifest } from './NationRegistry';
import { NationValidator } from './NationValidator';

/** Built-in fallback manifests used when nation.json can't be loaded. */
const BUILT_IN_MANIFESTS: NationManifest[] = [
  {
    version: 1, id: 'romans',
    name: { en: 'Romans', de: 'Römer' },
    description: { en: 'Roman Empire — masters of engineering and military discipline.' },
    visuals: { color: '#cc3333', secondary: '#ff6644', emoji: '🏛️', uiTheme: 'stone',
      particles: { dustColor: [0.6, 0.5, 0.4], magicColor: [0.8, 0.2, 0.2], constructionSpark: [1, 0.8, 0.2] },
      terrainModifiers: {} },
    economy: { livestock: { kind: 'sheep', building: 'sheep_ranch', product: 'meat' },
      divine: { crop: 'grapes', rawResource: 'grapes', processedInto: 'wine', building: 'vineyard', processor: 'wine_press' },
      munitions: null, startingResources: { wood: 40, stone: 30, food: 20, gold: 0, iron: 0, coal: 0, sulfur: 0 },
      resourceBonuses: { wood: 1, stone: 1.1, food: 1, gold: 1, iron: 1 } },
    units: { worker: { model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
      soldier: { model: '', texture: '', animations: '', icon: '', stats: { hp: 80, speed: 3, attack: 12, defence: 8, range: 1 } },
      archer: { model: '', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
      settler: { model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
      special: { kind: 'medic', displayName: { en: 'Medic' }, description: { en: 'Heals nearby infantry.' },
        model: '', texture: '', animations: '', icon: '', stats: { hp: 45, speed: 2.5, healRate: 3, healRange: 3 } } },
    buildings: { overrides: {} },  balancing: { buildSpeedMultiplier: 1, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1,
      combatDamageMultiplier: 1, territoryExpansionRate: 1, populationGrowthRate: 1,
      startingUnits: { worker: 6, soldier: 4, settler: 2 } },
    specialResources: {}, techTree: { nodes: [] },
    ai: { aggression: 0.5, expansionism: 0.7, economyFocus: 0.6, preferredUnits: ['soldier', 'archer'] },
  },
  {
    version: 1, id: 'vikings',
    name: { en: 'Vikings', de: 'Wikinger' },
    description: { en: 'Viking Raiders — masters of the sea and mead.' },
    visuals: { color: '#3366cc', secondary: '#6699ff', emoji: '⚔️', uiTheme: 'wood',
      particles: { dustColor: [0.5, 0.5, 0.55], magicColor: [0.3, 0.3, 0.9], constructionSpark: [0.6, 0.7, 1] },
      terrainModifiers: {} },
    economy: { livestock: { kind: 'pig', building: 'pig_ranch', product: 'meat' },
      divine: { crop: 'honey', rawResource: 'honey', processedInto: 'mead', building: 'apiary', processor: 'mead_maker' },
      munitions: null, startingResources: { wood: 40, stone: 30, food: 25, gold: 0, iron: 5, coal: 0, sulfur: 0 },
      resourceBonuses: { wood: 1.1, stone: 1, food: 1, gold: 1, iron: 1.1 } },
    units: { worker: { model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
      soldier: { model: '', texture: '', animations: '', icon: '', stats: { hp: 80, speed: 3, attack: 12, defence: 8, range: 1 } },
      archer: { model: '', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
      settler: { model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
      special: { kind: 'axe_warrior', displayName: { en: 'Axe Warrior' }, description: { en: 'High-damage shock troop.' },
        model: '', texture: '', animations: '', icon: '', stats: { hp: 100, speed: 2.8, attack: 20, defence: 10, range: 1 } } },
    buildings: { overrides: {} }, balancing: { buildSpeedMultiplier: 1, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1,
      combatDamageMultiplier: 1.05, territoryExpansionRate: 1, populationGrowthRate: 1,
      startingUnits: { worker: 6, soldier: 5, settler: 2 } },
    specialResources: {}, techTree: { nodes: [] },
    ai: { aggression: 0.8, expansionism: 0.6, economyFocus: 0.4, preferredUnits: ['axe_warrior', 'soldier'] },
  },
  {
    version: 1, id: 'mayans',
    name: { en: 'Mayans', de: 'Maya' },
    description: { en: 'Maya Civilization — masters of agriculture and gunpowder.' },
    visuals: { color: '#33cc33', secondary: '#66ff66', emoji: '🌿', uiTheme: 'gold',
      particles: { dustColor: [0.55, 0.6, 0.4], magicColor: [0.2, 0.8, 0.2], constructionSpark: [0.3, 1, 0.3] },
      terrainModifiers: {} },
    economy: { livestock: { kind: 'goat', building: 'goat_ranch', product: 'meat' },
      divine: { crop: 'agave', rawResource: 'agave', processedInto: 'tequila', building: 'agave_farm', processor: 'tequila_distillery' },
      munitions: { kind: 'gunpowder', building: 'powder_mill', inputs: { sulfur: 2, coal: 1 }, outputs: { gunpowder: 1 } },
      startingResources: { wood: 40, stone: 25, food: 25, gold: 0, iron: 0, coal: 10, sulfur: 5 },
      resourceBonuses: { wood: 1, stone: 1, food: 1.15, gold: 1, iron: 0.9, coal: 1.2, sulfur: 1.2 } },
    units: { worker: { model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
      soldier: { model: '', texture: '', animations: '', icon: '', stats: { hp: 75, speed: 3.2, attack: 10, defence: 7, range: 1 } },
      archer: { model: '', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
      settler: { model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
      special: { kind: 'blowgunner', displayName: { en: 'Blowgunner' }, description: { en: 'Fires paralytic darts.' },
        model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 3, attack: 6, defence: 3, range: 5, paralyzeDuration: 3 } } },
    buildings: { overrides: {} }, balancing: { buildSpeedMultiplier: 1, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1.05,
      combatDamageMultiplier: 0.9, territoryExpansionRate: 1.1, populationGrowthRate: 1,
      startingUnits: { worker: 7, soldier: 3, settler: 3 } },
    specialResources: { gunpowder: { displayName: { en: 'Gunpowder' }, craftedAt: 'powder_mill', inputs: { sulfur: 2, coal: 1 }, outputs: { gunpowder: 1 }, icon: '' } },
    techTree: { nodes: [] },
    ai: { aggression: 0.3, expansionism: 0.8, economyFocus: 0.8, preferredUnits: ['blowgunner', 'archer'] },
  },
  {
    version: 1, id: 'trojans',
    name: { en: 'Trojans', de: 'Trojaner' },
    description: { en: 'Trojan Warriors — masters of defense and siege warfare.' },
    visuals: { color: '#cc9933', secondary: '#ffcc66', emoji: '🐴', uiTheme: 'gold',
      particles: { dustColor: [0.7, 0.6, 0.4], magicColor: [1, 0.9, 0.3], constructionSpark: [1, 0.9, 0.4] },
      terrainModifiers: {} },
    economy: { livestock: { kind: 'geese', building: 'goose_ranch', product: 'meat' },
      divine: { crop: 'sunflowers', rawResource: 'sunflowers', processedInto: 'sunflower_oil', building: 'sunflower_field', processor: 'oil_press' },
      munitions: { kind: 'explosive_arrows', building: 'weapon_foundry', inputs: { sulfur: 1, iron: 2, wood: 1 }, outputs: { explosive_arrows: 5 } },
      startingResources: { wood: 35, stone: 35, food: 20, gold: 5, iron: 5, coal: 0, sulfur: 0 },
      resourceBonuses: { wood: 1, stone: 1.1, food: 1, gold: 1.1, iron: 1.1, sulfur: 1 } },
    units: { worker: { model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
      soldier: { model: '', texture: '', animations: '', icon: '', stats: { hp: 85, speed: 2.8, attack: 11, defence: 10, range: 1 } },
      archer: { model: '', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
      settler: { model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
      special: { kind: 'backpack_catapult', displayName: { en: 'Backpack Catapult' }, description: { en: 'Long-range light artillery.' },
        model: '', texture: '', animations: '', icon: '', stats: { hp: 35, speed: 1.5, attack: 30, defence: 2, range: 8, splashRadius: 1 } } },
    buildings: { overrides: {} }, balancing: { buildSpeedMultiplier: 1.05, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1,
      combatDamageMultiplier: 1, territoryExpansionRate: 0.9, populationGrowthRate: 1,
      startingUnits: { worker: 6, soldier: 4, settler: 2 } },
    specialResources: { explosive_arrows: { displayName: { en: 'Explosive Arrows' }, craftedAt: 'weapon_foundry', inputs: { sulfur: 1, iron: 2, wood: 1 }, outputs: { explosive_arrows: 5 }, icon: '' } },
    techTree: { nodes: [] },
    ai: { aggression: 0.4, expansionism: 0.5, economyFocus: 0.6, preferredUnits: ['backpack_catapult', 'soldier'] },
  },
];

/**
 * Discover and register nations from asset packs and built-in fallbacks.
 */
export class NationLoader {
  private static loaded = false;

  /**
   * Bootstrap the registry: load built-in nations, then try to fetch
   * JSON packs from the web server. Call once during startup.
   */
  static async discover(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;

    const registry = NationRegistry.instance;
    registry.reset();

    // 1. Register built-in fallbacks — always available (validated inline).
    for (const m of BUILT_IN_MANIFESTS) {
      const report = NationValidator.validateManifest(m);
      if (report.valid) {
        registry.register(m, `nations/${m.id}/`);
      } else {
        console.warn(`[NationLoader] Built-in "${m.id}" failed validation:`, report.errors);
      }
    }

    // 2. Try to load external nation packs from /nations/ directory.
    //    In production, these are static files served by Caddy/Vite.
    //    We attempt to fetch a manifest listing or probe known IDs.
    await this.discoverExternal(registry);
  }

  /** Scan for external nation packs. */
  private static async discoverExternal(registry: NationRegistry): Promise<void> {
    const knownIds = ['dark']; // Additional built-in not in base 4
    for (const id of knownIds) {
      try {
        const resp = await fetch(`/nations/${id}/nation.json`);
        if (!resp.ok) continue;
        const json: unknown = await resp.json();
        if (this.validateManifest(json)) {
          const manifest = json as NationManifest;
          if (!registry.get(manifest.id)) {
            registry.register(manifest, `nations/${manifest.id}/`);
          }
        }
      } catch {
        // File not found or parse error — skip silently.
      }
    }

    // If Dark Tribe wasn't loaded from JSON, register a fallback.
    if (!registry.get('dark')) {
      const darkManifest: NationManifest = {
        version: 1, id: 'dark',
        name: { en: 'Dark Tribe', de: 'Dunkler Stamm' },
        description: { en: 'The Dark Tribe — NPC antagonist faction.' },
        visuals: { color: '#9933cc', secondary: '#cc66ff', emoji: '🌑', uiTheme: 'dark',
          particles: { dustColor: [0.3, 0.2, 0.3], magicColor: [0.6, 0.2, 0.8], constructionSpark: [0.5, 0.1, 0.5] },
          terrainModifiers: {} },
        economy: { livestock: { kind: 'dark_beast', building: 'dark_beast_pen', product: 'dark_meat' },
          divine: { crop: 'dark_herbs', rawResource: 'dark_herbs', processedInto: 'dark_elixir', building: 'dark_garden', processor: 'dark_cauldron' },
          munitions: null, startingResources: { wood: 50, stone: 50, food: 15, gold: 10, iron: 10, coal: 5, sulfur: 5 },
          resourceBonuses: { wood: 1.2, stone: 1.2, food: 1, gold: 1, iron: 1 } },
        units: { worker: { model: '', texture: '', animations: '', icon: '', stats: { hp: 55, speed: 2.3, carryCapacity: 12 } },
          soldier: { model: '', texture: '', animations: '', icon: '', stats: { hp: 90, speed: 3, attack: 14, defence: 6, range: 1 } },
          archer: { model: '', texture: '', animations: '', icon: '', stats: { hp: 65, speed: 2.8, attack: 12, defence: 3, range: 6 } },
          settler: { model: '', texture: '', animations: '', icon: '', stats: { hp: 45, speed: 2, carryCapacity: 15 } },
          special: { kind: 'dark_mage', displayName: { en: 'Dark Mage' }, description: { en: 'Ranged spellcaster with lifesteal.' },
            model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2.2, attack: 18, defence: 3, range: 5, lifesteal: 0.3 } } },
        buildings: { overrides: {} }, balancing: { buildSpeedMultiplier: 1.2, unitTrainSpeedMultiplier: 1.1, resourceGatherMultiplier: 1.1,
          combatDamageMultiplier: 1.1, territoryExpansionRate: 0.8, populationGrowthRate: 0.9,
          startingUnits: { worker: 8, soldier: 6, settler: 1 } },
        specialResources: {}, techTree: { nodes: [] },
        ai: { aggression: 0.9, expansionism: 0.3, economyFocus: 0.3, preferredUnits: ['dark_mage', 'soldier'] },
      };
      const darkReport = NationValidator.validateManifest(darkManifest);
      if (darkReport.valid) {
        registry.register(darkManifest, 'nations/dark/');
      } else {
        console.warn('[NationLoader] Dark Tribe fallback failed validation:', darkReport.errors);
      }
    }
  }

  /** Lightweight validation of a loaded manifest. */
  static validateManifest(json: unknown): json is NationManifest {
    if (!json || typeof json !== 'object') return false;
    const m = json as Record<string, unknown>;
    return (
      typeof m.id === 'string' &&
      m.id.length > 0 &&
      typeof m.name === 'object' &&
      m.name !== null &&
      typeof m.visuals === 'object' &&
      m.visuals !== null &&
      typeof (m.visuals as Record<string, unknown>).color === 'string'
    );
  }
}
