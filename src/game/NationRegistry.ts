/**
 * S4WN — Nation Pack Registry
 *
 * Replaces the hardcoded `NationType` enum with a runtime registry.
 * Nations are discovered from `assets/nations/{id}/nation.json` at startup.
 *
 * Backward-compatible: the old numeric NationType values (0–4) remain as
 * aliases in `Nation.ts` which delegates to this registry.
 */

/** Static manifest — mirrors assets/nations/{id}/nation.json */
export interface NationManifest {
  version: number;
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  visuals: NationVisuals;
  economy: NationEconomy;
  units: NationUnits;
  buildings: NationBuildings;
  balancing: NationBalancing;
  specialResources: Record<string, NationSpecialResource>;
  techTree: NationTechTree;
  ai: NationAI;
}

export interface NationVisuals {
  color: string;
  secondary: string;
  emoji: string;
  flag?: string;
  emblem?: string;
  loadingBg?: string;
  uiTheme: string;
  particles: {
    dustColor: [number, number, number];
    magicColor: [number, number, number];
    constructionSpark: [number, number, number];
  };
  terrainModifiers: Record<string, number>;
}

export interface NationEconomy {
  livestock: {
    kind: string;
    building: string;
    product: string;
  };
  divine: {
    crop: string;
    rawResource: string;
    processedInto: string;
    building: string;
    processor: string;
  };
  munitions: {
    kind: string;
    building: string;
    inputs: Record<string, number>;
    outputs: Record<string, number>;
  } | null;
  startingResources: Record<string, number>;
  resourceBonuses: Record<string, number>;
}

export interface NationUnits {
  worker: UnitDef;
  soldier: UnitDef;
  archer: UnitDef;
  settler: UnitDef;
  special: SpecialUnitDef;
}

export interface UnitDef {
  model: string;
  texture: string;
  animations: string;
  icon: string;
  stats: Record<string, number>;
}

export interface SpecialUnitDef extends UnitDef {
  kind: string;
  displayName: Record<string, string>;
  description: Record<string, string>;
}

export interface NationBuildings {
  overrides: Record<string, BuildingOverride>;
}

export interface BuildingOverride {
  model?: string;
  texture?: string;
  icon?: string;
  animations?: string;
}

export interface NationBalancing {
  buildSpeedMultiplier: number;
  unitTrainSpeedMultiplier: number;
  resourceGatherMultiplier: number;
  combatDamageMultiplier: number;
  territoryExpansionRate: number;
  populationGrowthRate: number;
  startingUnits: Record<string, number>;
}

export interface NationSpecialResource {
  displayName: Record<string, string>;
  craftedAt: string;
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  icon: string;
}

export interface NationTechTree {
  nodes: TechNode[];
}

export interface TechNode {
  id: string;
  cost: Record<string, number>;
  unlocks: string[];
  prerequisites: string[];
}

export interface NationAI {
  aggression: number;
  expansionism: number;
  economyFocus: number;
  preferredUnits: string[];
}

/** Simplified nation info for UI and lightweight lookups. */
export interface NationInfo {
  id: string;
  name: string;          // English name
  color: string;
  secondary: string;
  emoji: string;
  displayName: Record<string, string>;
}

/** A registered nation pack with loaded manifest. */
export interface RegisteredNation {
  info: NationInfo;
  manifest: NationManifest;
  /** Asset base path relative to assets/nations/{id}/ */
  assetPath: string;
}

/**
 * Runtime registry for all discovered nation packs.
 * Populated by `NationLoader` during startup.
 * Singleton — use `NationRegistry.instance`.
 */
export class NationRegistry {
  static instance = new NationRegistry();

  private nations = new Map<string, RegisteredNation>();
  /** Legacy numeric IDs → string ID mapping for backward compatibility. */
  private idByNumber: RegisteredNation[] = [];

  /** Register a nation pack. */
  register(manifest: NationManifest, assetPath: string): RegisteredNation {
    const info: NationInfo = {
      id: manifest.id,
      name: manifest.name.en ?? Object.values(manifest.name)[0] ?? manifest.id,
      color: manifest.visuals.color,
      secondary: manifest.visuals.secondary,
      emoji: manifest.visuals.emoji,
      displayName: manifest.name,
    };

    const registered: RegisteredNation = { info, manifest, assetPath };
    this.nations.set(manifest.id, registered);
    this.idByNumber.push(registered);

    return registered;
  }

  /** Get a nation by string ID. */
  get(id: string): RegisteredNation | undefined {
    return this.nations.get(id);
  }

  /** Get a nation by legacy numeric ID (backward compat). */
  getByNumber(n: number): RegisteredNation | undefined {
    return this.idByNumber[n];
  }

  /** Get numeric index for a registered nation (backward compat). */
  getNumber(id: string): number {
    const idx = this.idByNumber.findIndex((n) => n.info.id === id);
    return idx >= 0 ? idx : 0;
  }

  /** All registered nations. */
  list(): RegisteredNation[] {
    return [...this.nations.values()];
  }

  /** Check if a nation is built-in (ships with S4WN). */
  isBuiltIn(id: string): boolean {
    return ['romans', 'vikings', 'mayans', 'trojans', 'dark'].includes(id);
  }

  /** Number of registered nations. */
  get count(): number {
    return this.nations.size;
  }

  /** Clear all registrations (for testing). */
  reset(): void {
    this.nations.clear();
    this.idByNumber = [];
  }
}
