// Data Adapter for Dynamic Nation Loading

interface NationSpec {
  name: string;
  region: string;
  category: string;
  buildings: string[];
  units: string[];
  resources: string[];
}

interface NationConfig {
  namespace: string;
  name: string;
  category: string;
  buildings: string[];
  units: string[];
  resources: string[];
  versions?: {
    default: string;
  };
  assets?: {
    textures: string[];
    animations: string[];
    models: string[];
  };
  [key: string]: any;
}

class NationAdapter {
  private static instances: Map<string, NationAdapter> = new Map();
  private config: NationConfig | null = null;
  private data: any = {};

  public static getInstance(nation: string): NationAdapter {
    if (!NationAdapter.instances.has(nation)) {
      NationAdapter.instances.set(nation, new NationAdapter(nation));
    }
    return NationAdapter.instances.get(nation)!;
  }

  private constructor(nation: string) {
    this.loadConfig(nation);
  }

  private loadConfig(nation: string): void {
    // Load from dynamic JSON configs, e.g., `assets/nations/romans.json`
    const configPath = `/assets/nations/${nation}.json`;
    // Fallback to built-in manifests
    const builtinConfig = this.getBuiltinConfig(nation);
    this.config = builtinConfig;
  }

  private getBuiltinConfig(nation: string): NationConfig {
    // Built-in fallback for known nations
    const configs: Record<string, NationConfig> = {
      romans: {
        name: "Romans",
        namespace: "roman",
        category: "civilization",
        buildings: ["barracks", "fortress", "temple"],
        units: ["legionary", "cavalry", "infantry"],
        resources: ["gold", "stone", "iron"],
        assets: { textures: [], animations: [], models: [] }
      },
      mayans: {
        name: "Mayans",
        namespace: "mayan",
        category: "civilization",
        buildings: ["pyramid", "observatory"],
        units: ["jaguar_warrior", "priest"],
        resources: ["cacao", "jade", "obsidian"],
        assets: { textures: [], animations: [], models: [] }
      },
      vikings: {
        name: "Vikings",
        namespace: "viking",
        category: "civilization",
        buildings: ["longhouse", "shipyard"],
        units: ["berserker", "shieldman"],
        resources: ["wool", "iron", "flint"],
        assets: { textures: [], animations: [], models: [] }
      },
      trojans: {
        name: "Trojans",
        namespace: "trojan",
        category: "civilization",
        buildings: ["acropolis", "theater"],
        units: ["hoplite", "scout"],
        resources: ["gold", "pottery", "wheat"],
        assets: { textures: [], animations: [], models: [] }
      },
      dark: {
        name: "Dark Tribe",
        namespace: "dark",
        category: "civilization",
        buildings: ["cave_lair", "shrine"],
        units: ["shadow_walker", "dark_witch"],
        resources: ["shadow", "crystals", "blood"],
        assets: { textures: [], animations: [], models: [] }
      }
    };
    return configs[nation] || configs.romans;
  }

  public getData(): any {
    return this.data;
  }

  public getEntityList(category: string): string[] {
    return this.config ? this.config[category] || [] : [];
  }
}

export { NationAdapter };
export type { NationSpec, NationConfig };