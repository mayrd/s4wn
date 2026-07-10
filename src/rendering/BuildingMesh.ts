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

/**
 * Convert a building kind string to the OBJ filename (snake_case).
 * e.g. "GuardTower" → "guard_tower", "TempleOfBacchus" → "temple_of_bacchus"
 */
function kindToObjName(kind: string): string {
  // Insert underscore before uppercase letters, then lowercase
  const snake = kind
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase();
  return snake;
}

export class BuildingMesh {
  private scene: Scene;
  
  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create a building model. Tries OBJ first, falls back to procedural primitive.
   */
  async createBuilding(
    kind: string,
    x: number,
    y: number,
    _width: number,
    _height: number,
    _depth: number,
    material: StandardMaterial | null = null
  ): Promise<any> {
    // Try loading OBJ model from assets/models/
    try {
      const objName = kindToObjName(kind);
      const result = await SceneLoader.ImportMeshAsync('', 'assets/models/', `${objName}.obj`, this.scene);
      const root = result.meshes[0];
      root.position.set(x, 0, y);
      if (material) {
        result.meshes.forEach((m: any) => (m.material = material));
      }
      return root;
    } catch (_error) {
      // OBJ not found — fall back to procedural primitive
      return this.createProceduralBuilding(kind, x, y, material);
    }
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
