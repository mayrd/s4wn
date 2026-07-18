import { ConstructionAnimator } from "./ConstructionAnimator";
/**
 * S4WN Babylon.js/TypeScript - Building Mesh Renderer
 * 
 * Creates building 3D models. Tries OBJ from assets/models/ first;
 * falls back to procedural Babylon.js primitives when OBJ files don't exist.
 */

import {
  Scene,
  StandardMaterial,
  SceneLoader,
  MeshBuilder,
  Color3,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { NationType } from '../game/Nation';
import { NationRegistry } from '../game/NationRegistry';

/**
 * Nation accent colors for material tinting and flag meshes.
 * Resolved from NationRegistry — falls back to defaults.
 */
function getNationColor(nationType: NationType): Color3 {
  const rn = NationRegistry.instance.getByNumber(nationType);
  if (rn) {
    const hex = rn.info.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    return new Color3(r, g, b);
  }
  // Fallback colors
  const fallbacks: Record<number, Color3> = {
    [NationType.Romans]:    new Color3(0.80, 0.20, 0.20),
    [NationType.Vikings]:   new Color3(0.20, 0.40, 0.80),
    [NationType.Mayans]:    new Color3(0.20, 0.80, 0.20),
    [NationType.Trojans]:   new Color3(0.80, 0.60, 0.20),
    [NationType.DarkTribe]: new Color3(0.60, 0.20, 0.80),
  };
  return fallbacks[nationType] ?? new Color3(0.50, 0.50, 0.50);
}

/**
 * Resolve the model path for a building, checking nation-specific paths first.
 * Fallback chain: nation/models/ → assets/models/ → procedural mesh
 */
export function resolveBuildingModel(buildingKind: string, nationType: NationType): string {
  const rn = NationRegistry.instance.getByNumber(nationType);
  if (rn) {
    const nationPath = `/nations/${rn.info.id}/models/buildings/${buildingKind}.glb`;
    return nationPath; // Fallback handled at load time by OBJ loader
  }
  return `/models/${buildingKind}.obj`;
}

/**
 * Resolve texture path with nation fallback chain.
 */
export function resolveBuildingTexture(textureName: string, nationType: NationType): string {
  const rn = NationRegistry.instance.getByNumber(nationType);
  if (rn) {
    return `/nations/${rn.info.id}/textures/buildings/${textureName}`;
  }
  return `/textures/${textureName}`;
}


/**
 * Get the nation-specific texture suffix for unit textures.
 * e.g. NationType.Romans → "roman", NationType.Vikings → "viking"
 */
export function nationTextureSuffix(nation: NationType): string {
  const map: Record<number, string> = {
    [NationType.Romans]: 'roman',
    [NationType.Vikings]: 'viking',
    [NationType.Mayans]: 'mayan',
    [NationType.Trojans]: 'trojan',
    [NationType.DarkTribe]: 'dark',
  };
  return map[nation] || 'roman';
}

/**
 * Convert a building kind/name to the OBJ filename (snake_case).
 * Handles both CamelCase ("GuardTower") and display names ("Guard Tower").
 * e.g. "Guard Tower" → "guard_tower", "TempleOfBacchus" → "temple_of_bacchus"
 */
function kindToObjName(kind: string): string {
  // If name has spaces ("Guard Tower"), replace with underscores
  // Otherwise insert underscore before uppercase letters
  const snake = kind.includes(' ')
    ? kind.toLowerCase().replace(/\s+/g, '_')
    : kind.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
  
  // Known aliases: buildingName() returns display names that differ from enum names
  const aliases: Record<string, string> = {
    'fishery': 'fisherman',    // economy enum says "Fisherman" which maps to "fisherman"
  };
  return aliases[snake] ?? snake;
}

export class BuildingMesh {
  private scene: Scene;
  
  public constructionAnimator: ConstructionAnimator;

  constructor(scene: Scene) {
    this.scene = scene;
    this.constructionAnimator = new ConstructionAnimator(this.scene);
  }

/**
  * Create a building model. Tries GLB first (from poly_pizza), then OBJ, 
  * falls back to procedural primitive.
  * Optionally applies nation-specific tint and decorative flag.
  */
  async createBuilding(
    kind: string,
    x: number,
    y: number,
    _width: number = 2,
    _height: number = 2,
    _depth: number = 2,
    material: StandardMaterial | null = null,
    nation?: NationType
  ): Promise<any> {
    let root: any = null;

    // Try loading GLB model from /models/poly_pizza/ first (higher quality CC0 models)
    try {
      const objName = kindToObjName(kind);
      const result = await SceneLoader.ImportMeshAsync('', '/models/poly_pizza/', `${objName}.glb`, this.scene);
      root = result.meshes[0];
      root.position.set(x, 0, y);
      if (material) {
        result.meshes.forEach((m: any) => (m.material = material));
      }
    } catch (_glbError) {
      // Try loading OBJ model from /models/ (Vite publicDir: assets serves at root)
      try {
        const objName = kindToObjName(kind);
        const result = await SceneLoader.ImportMeshAsync('', '/models/', `${objName}.obj`, this.scene);
        root = result.meshes[0];
        root.position.set(x, 0, y);
        if (material) {
          result.meshes.forEach((m: any) => (m.material = material));
        }
      } catch (_error) {
        // OBJ not found — fall back to procedural primitive
        root = this.createProceduralBuilding(kind, x, y, material);
      }
    }

    // Apply nation-specific tint and decorative flag
    if (root && nation !== undefined) {
      this.applyNationVariant(root, nation, kind);
    }

    return root;
  }

  /**
   * Apply nation-specific visual variant: tint material and add a small flag mesh.
   */
  private applyNationVariant(root: any, nation: NationType, _kind: string): void {
    const nationColor = getNationColor(nation);
    if (!nationColor) return;

    // Tint all child meshes with the nation color
    const childMeshes = root.getChildMeshes ? root.getChildMeshes() : [root];
    for (const mesh of childMeshes) {
      if (mesh.material && mesh.material.diffuseColor) {
        // Blend: 70% original + 30% nation tint
        const orig = mesh.material.diffuseColor;
        if (orig.r > 0 || orig.g > 0 || orig.b > 0) {
          mesh.material.diffuseColor = new Color3(
            orig.r * 0.7 + nationColor.r * 0.3,
            orig.g * 0.7 + nationColor.g * 0.3,
            orig.b * 0.7 + nationColor.b * 0.3
          );
        } else {
          mesh.material.diffuseColor = nationColor;
        }
      }
    }

    // Add a small flag/pennant mesh on top of the building
    const flag = MeshBuilder.CreateCylinder(
      `flag-pole-${nation}`,
      { height: 0.8, diameter: 0.06 },
      this.scene
    );
    flag.position.set(root.position.x, root.position.y + 2.5, root.position.z);

    const flagCloth = MeshBuilder.CreatePlane(
      `flag-cloth-${nation}`,
      { width: 0.4, height: 0.25 },
      this.scene
    );
    flagCloth.position.set(root.position.x + 0.22, root.position.y + 2.8, root.position.z);

    const flagMat = new StandardMaterial(`flagMat-${nation}`, this.scene);
    flagMat.diffuseColor = nationColor;
    flagMat.emissiveColor = nationColor.scale(0.3);
    flagMat.specularColor = new Color3(0, 0, 0);
    flagCloth.material = flagMat;

    // Parent flag to root so it moves with the building
    flag.parent = root;
    flagCloth.parent = root;
  }

  /**
   * Create a procedural building mesh when OBJ file is not available.
   * Shape and color vary by building kind.
   */
  private createProceduralBuilding(
    kind: string,
    x: number,
    y: number,
    material: StandardMaterial | null = null
  ): any {
    let mesh: any;

    switch (kind) {
      case 'castle':
        // Main keep — wider box + taller tower
        mesh = MeshBuilder.CreateBox('castle-base', { width: 3, height: 4, depth: 3 }, this.scene);
        mesh.position.set(x, 2, y);  // Half height offset

        // Add towers at corners
        for (const [cx, cz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) {
          const tower = MeshBuilder.CreateCylinder('castle-tower', { height: 5, diameter: 0.8 }, this.scene);
          tower.position.set(x + cx, 2.5, y + cz);
          if (material) tower.material = material;
        }

        // Create material if not provided
        if (!material) {
          const mat = new StandardMaterial('castleMat', this.scene);
          mat.diffuseColor = new Color3(0.55, 0.45, 0.35);  // Stone brown
          mat.specularColor = new Color3(0, 0, 0);
          mesh.material = mat;
        } else {
          mesh.material = material;
        }
        break;

      case 'barracks':
        mesh = MeshBuilder.CreateBox('barracks', { width: 3, height: 2.5, depth: 2 }, this.scene);
        mesh.position.set(x, 1.25, y);
        if (!material) {
          const mat = new StandardMaterial('barracksMat', this.scene);
          mat.diffuseColor = new Color3(0.6, 0.2, 0.2);  // Red-brown
          mat.specularColor = new Color3(0, 0, 0);
          mesh.material = mat;
        } else {
          mesh.material = material;
        }
        break;

      case 'farm':
        mesh = MeshBuilder.CreateBox('farm', { width: 2, height: 1.5, depth: 2 }, this.scene);
        mesh.position.set(x, 0.75, y);
        if (!material) {
          const mat = new StandardMaterial('farmMat', this.scene);
          mat.diffuseColor = new Color3(0.5, 0.4, 0.2);  // Wood brown
          mat.specularColor = new Color3(0, 0, 0);
          mesh.material = mat;
        } else {
          mesh.material = material;
        }
        break;

      case 'storehouse':
        mesh = MeshBuilder.CreateBox('storehouse', { width: 2.5, height: 2, depth: 2.5 }, this.scene);
        mesh.position.set(x, 1, y);
        if (!material) {
          const mat = new StandardMaterial('storehouseMat', this.scene);
          mat.diffuseColor = new Color3(0.45, 0.35, 0.25);  // Dark wood
          mat.specularColor = new Color3(0, 0, 0);
          mesh.material = mat;
        } else {
          mesh.material = material;
        }
        break;

      default:
        // Generic building — box with default stone color
        mesh = MeshBuilder.CreateBox(`building-${kind}`, { width: 2, height: 2, depth: 2 }, this.scene);
        mesh.position.set(x, 1, y);
        if (!material) {
          const mat = new StandardMaterial('genericMat', this.scene);
          mat.diffuseColor = new Color3(0.5, 0.45, 0.4);  // Neutral stone
          mat.specularColor = new Color3(0, 0, 0);
          mesh.material = mat;
        } else {
          mesh.material = material;
        }
    }

    return mesh;
  }
}