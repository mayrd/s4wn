// Data Adapter for Dynamic Nation Loading
//
// All nation data is read from `nation.json` manifests registered in
// `NationRegistry` (populated by `NationLoader` at startup). There is no
// hardcoded built-in config — unknown nations simply produce no config.

import { NationRegistry } from '../../game/NationRegistry';

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
  public config: NationConfig | null = null;
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
    // All data comes from the nation.json manifest registered in NationRegistry.
    const registered = NationRegistry.instance.get(nation);
    if (!registered?.manifest) {
      this.config = null;
      return;
    }

    const manifest = registered.manifest;

    // Flatten building keys from `buildings.categories[].buildings`.
    const buildings: string[] = [];
    for (const cat of manifest.buildings?.categories ?? []) {
      for (const b of cat.buildings ?? []) {
        if (!buildings.includes(b)) buildings.push(b);
      }
    }

    // Unit keys: worker / soldier / archer / settler / special.
    const units: string[] = manifest.units ? Object.keys(manifest.units) : [];

    // Nation-specific resources: economy.startingResources keys.
    const resources: string[] = manifest.economy?.startingResources
      ? Object.keys(manifest.economy.startingResources)
      : [];

    this.config = {
      namespace: manifest.id,
      name: manifest.name?.en ?? manifest.id,
      category: 'civilization',
      buildings,
      units,
      resources,
    };
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