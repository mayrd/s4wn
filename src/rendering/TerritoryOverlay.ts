/**
 * S4WN Territory Overlay — Renders nation-colored territory on the terrain.
 *
 * Creates a semi-transparent overlay mesh positioned just above the terrain.
 * Each tile vertex is colored based on its `territory` owner ID using the
 * nation palette from Nation.ts. Neutral tiles (territory=0) are fully
 * transparent while owned tiles show a tinted overlay with ~30% opacity.
 *
 * The overlay uses vertex colors with alpha blending, so it can be
 * toggled on/off independently of the terrain mesh.
 */

import {
  Mesh,
  VertexData,
  VertexBuffer,
  StandardMaterial,
  Scene,
  Vector3,
  Color3,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';
import { NATION_INFO } from '../game/Nation';

/** Alpha value (0-1) for territory overlay on owned tiles. */
const TERRITORY_ALPHA = 0.30;
/** Y-offset to prevent z-fighting with the terrain mesh. */
const OVERLAY_Y_OFFSET = 0.05;

/** Parse a nation color string (#rrggbb) into RGB components (0-1). */
function parseNationColor(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

export class TerritoryOverlay {
  private scene: Scene;
  private map: GameMap;
  private overlayMesh: Mesh | null = null;
  private _visible: boolean = true;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.map = map;
  }

  /** Build the territory overlay mesh. Call after terrain mesh exists. */
  createOverlay(w: number, h: number): void {
    if (this.overlayMesh) {
      this.overlayMesh.dispose();
    }

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // One vertex per tile. The RGBA color encodes territory ownership.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = this.map.get(x, y);
        const yPos = (tile ? tile.elevation : 0) * 0.6 + OVERLAY_Y_OFFSET;
        positions.push(x + 0.5, yPos, y + 0.5);
        uvs.push(x / w, y / h);

        const territoryId = tile ? tile.territory : 0;
        let r = 0, g = 0, b = 0, a = 0;

        if (territoryId > 0) {
          const info = NATION_INFO[territoryId - 1]; // territory 1 = Romans (index 0)
          if (info) {
            const c = parseNationColor(info.color);
            r = c.r; g = c.g; b = c.b; a = TERRITORY_ALPHA;
          }
        }
        colors.push(r, g, b, a);
      }
    }

    // Same quad winding as TerrainRenderer.createGround()
    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i0 = y * w + x;
        const i1 = i0 + 1;
        const i2 = i0 + w;
        const i3 = i2 + 1;
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      }
    }

    const mesh = new Mesh('territoryOverlay', this.scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.uvs = uvs;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    vd.normals = normals;
    vd.applyToMesh(mesh);

    // Set vertex colors via the mesh (VertexData.colors is not well-typed in all Babylon.js versions)
    mesh.setVerticesData(VertexBuffer.ColorKind, colors, false, 4);

    // Shift to match terrain positioning
    mesh.position = new Vector3(-0.5, 0, -0.5);

    const mat = new StandardMaterial('territoryOverlayMat', this.scene);
    (mat as any).hasVertexColor = true;
    (mat as any).hasVertexAlpha = true;
    mat.backFaceCulling = false;
    mat.useAlphaFromDiffuseTexture = false;
    mat.diffuseColor = new Color3(1, 1, 1);
    mat.specularColor = new Color3(0, 0, 0);
    mat.emissiveColor = new Color3(0, 0, 0);
    mat.alpha = 1.0;
    mesh.material = mat;
    mesh.isVisible = this._visible;

    this.overlayMesh = mesh;

    console.log(
      `🏳️ TerritoryOverlay: ${w}×${h} mesh built, verts=${mesh.getTotalVertices()}, tris=${indices.length / 3}`
    );
  }

  /**
   * Refresh the overlay vertex colors from the current map territory state.
   * Called after territory updates (e.g. from TerritoryManager.updateTerritory()).
   */
  refresh(): void {
    if (!this.overlayMesh) return;

    const w = this.map.width;
    const h = this.map.height;
    const newColors: number[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = this.map.get(x, y);
        const territoryId = tile ? tile.territory : 0;
        let r = 0, g = 0, b = 0, a = 0;

        if (territoryId > 0) {
          const info = NATION_INFO[territoryId - 1];
          if (info) {
            const c = parseNationColor(info.color);
            r = c.r; g = c.g; b = c.b; a = TERRITORY_ALPHA;
          }
        }
        newColors.push(r, g, b, a);
      }
    }

    this.overlayMesh.setVerticesData(VertexBuffer.ColorKind, newColors, false, 4);
  }

  /** Toggle visibility of the territory overlay. */
  setVisible(visible: boolean): void {
    this._visible = visible;
    if (this.overlayMesh) {
      this.overlayMesh.isVisible = visible;
    }
  }

  get isVisible(): boolean {
    return this._visible;
  }

  getMesh(): Mesh | null {
    return this.overlayMesh;
  }

  dispose(): void {
    if (this.overlayMesh) {
      this.overlayMesh.dispose();
      this.overlayMesh = null;
    }
  }
}
