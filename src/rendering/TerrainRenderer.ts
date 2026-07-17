/**
 * S4WN Terrain Renderer — Creates terrain mesh with splatting support.
 *
 * Builds a ground mesh with one vertex per tile so that elevations can be
 * displaced into real 3D relief. The base texture uses a texture atlas where
 * each tile's terrain type is sampled. When splatting is enabled, smooth
 * transitions are applied at tile boundaries using edge blending.
 */

import {
  Mesh,
  VertexData,
  StandardMaterial,
  Texture,
  DynamicTexture,
  Color3,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { Map as GameMap } from '../game/Map';
// Terrain type is used in switch statements with string literals

// Maximum per-tile atlas cell size in pixels. Each tile's 1024² source texture
// is downscaled into a CELL×CELL region of the atlas. Larger cells retain more
// visible detail. The actual cell is clamped to the GPU's max texture size.
const MAX_CELL_PX = 64;
// World-units of vertical displacement per elevation point.
const ELEV_SCALE = 0.6;

export class TerrainRenderer {
  private scene: Scene;
  private map: GameMap;
  private terrainMesh: Mesh | null = null;
  private splattingEnabled: boolean = true;
  private _savedDiffuseColor: Color3 | null = null;

  constructor(scene: Scene, map: GameMap) {
    this.scene = scene;
    this.map = map;
  }

  createGround(w: number, h: number): void {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // One vertex per tile; vertex (x,y) sits at the centre of tile (x,y).
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = this.map?.get?.(x, y);
        const elev = (tile ? tile.elevation : 0) * ELEV_SCALE;
        positions.push(x + 0.5, elev, y + 0.5);
        // 1:1 UV — tile (x,y) maps to the [x/w, (x+1)/w] region of the atlas.
        uvs.push(x / w, y / h);
      }
    }

    for (let y = 0; y < h - 1; y++) {
      for (let x = 0; x < w - 1; x++) {
        const i0 = y * w + x;
        const i1 = i0 + 1;
        const i2 = i0 + w;
        const i3 = i2 + 1;
        // Two triangles per quad. Winding chosen so the computed face
        // normal points +Y (up) — with the opposite winding the cross
        // product yields a downward normal, which makes the HemisphericLight
        // fall back to its (default black) groundColor and renders the
        // terrain completely black even though the mesh geometry/elevation
        // is correct.
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
      }
    }

    const mesh = new Mesh('terrain', this.scene);
    const vd = new VertexData();
    vd.positions = positions;
    vd.uvs = uvs;
    vd.indices = indices;
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    vd.normals = normals;
    vd.applyToMesh(mesh);
    // Shift so tile (x,y) centres land at world coordinate (x, y).
    mesh.position = new Vector3(-0.5, 0, -0.5);
    mesh.material = this.createMaterial();
    this.terrainMesh = mesh;

    console.log(
      `🌍 TERRAIN: ${w}×${h} mesh built, verts=${mesh.getTotalVertices()}, tris=${indices.length / 3}`
    );
  }

  private createMaterial(): StandardMaterial {
    const mat = new StandardMaterial('terrainMat', this.scene);
    // Grass-green placeholder shown until the atlas finishes loading.
    mat.diffuseColor = new Color3(0.27, 0.55, 0.22);
    mat.specularColor = new Color3(0, 0, 0);
    mat.emissiveColor = new Color3(0, 0, 0);
    mat.backFaceCulling = false;
    // The atlas is fully opaque — must NOT read alpha from the diffuse texture.
    mat.useAlphaFromDiffuseTexture = false;
    return mat;
  }

  /** Progress callback for loading status */
  private progressCallback?: (msg: string, percent: number) => void;

  /**
   * Set a progress callback to receive loading updates.
   */
  setProgressCallback(cb: (msg: string, percent: number) => void): void {
    this.progressCallback = cb;
  }

  async loadTerrainTextures(map: GameMap): Promise<void> {
    if (!this.terrainMesh) return;
    // Pick a per-tile cell size that keeps the full atlas within the GPU's
    // maximum texture size, so detail is preserved without exceeding limits.
    const maxTex = (this.scene.getEngine().getCaps().maxTextureSize as number) || 4096;
    const cell = Math.max(8, Math.min(MAX_CELL_PX, Math.floor(maxTex / Math.max(map.width, map.height))));
    const atlasW = map.width * cell;
    const atlasH = map.height * cell;
    this.progressCallback?.('Loading terrain textures...', 10);
    try {
      console.log(`🗺️ Building terrain atlas (${atlasW}×${atlasH}, cell=${cell}px) from /textures/...`);
      const names = [
        'terrain_grass',
        'terrain_forest',
        'terrain_desert',
        'terrain_mountain',
        'terrain_snow',
        'terrain_water',
        'terrain_swamp',
      ];
      
      // Load textures sequentially with progress updates to avoid blocking the main thread
      const images: HTMLImageElement[] = [];
      const total = names.length;
      for (let i = 0; i < names.length; i++) {
        const n = names[i];
        try {
          const img = await this.loadImage(`/textures/${n}.png`);
          images.push(img);
        } catch {
          // Use a 1×1 placeholder canvas as fallback
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#55aa55';
          ctx.fillRect(0, 0, 1, 1);
          const img = new Image();
          img.src = canvas.toDataURL();
          images.push(img);
        }
        this.progressCallback?.(`Loading terrain texture ${i + 1}/${total}...`, 10 + (i / total) * 40);
      }
      const c = document.createElement('canvas');
      c.width = atlasW;
      c.height = atlasH;
      const ctx = c.getContext('2d')!;
      // Opaque base so uncovered edges never turn transparent.
      ctx.fillStyle = '#3c8c38';
      ctx.fillRect(0, 0, atlasW, atlasH);

      // First pass: draw all terrain textures
      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const idx = this.toIdx(String(map.tiles[ty][tx].terrain));
          ctx.drawImage(
            images[idx],
            0, 0, images[idx].width, images[idx].height,
            tx * cell, ty * cell, cell, cell
          );
        }
      }

      // Second pass: apply splat blending at edges
      if (this.splattingEnabled && cell >= 16) {
        this.applySplatBlending(ctx, map, images, cell);
      }

      const dt = new DynamicTexture('terrainAtlas', { width: atlasW, height: atlasH }, this.scene, false);
      const dtCtx = dt.getContext();
      dtCtx.drawImage(c, 0, 0);
      // CRITICAL: the DynamicTexture constructor only ALLOCATES the GPU
      // texture — the canvas pixels are uploaded ONLY when update() is
      // called. Without this the terrain samples an empty (black) texture.
      // invertY=false keeps canvas row 0 aligned with UV v=0 (tile row 0),
      // so the atlas orientation matches the mesh UV layout.
      dt.update(false);
      dt.updateSamplingMode(Texture.BILINEAR_SAMPLINGMODE);
      dt.wrapU = Texture.CLAMP_ADDRESSMODE;
      dt.wrapV = Texture.CLAMP_ADDRESSMODE;
      const mat = this.terrainMesh.material as StandardMaterial;
      mat.diffuseTexture = dt;
      // The atlas carries the full colour — stop tinting it with the
      // placeholder diffuse colour so terrain shows its real texture.
      mat.diffuseColor = new Color3(1, 1, 1);
      mat.useAlphaFromDiffuseTexture = false;
      console.log(`✅ Terrain atlas applied: ${atlasW}×${atlasH}`);
    } catch (e) {
      console.warn('⚠️ Atlas build failed, keeping flat color:', e);
    }
  }

  /** Apply smooth blending at tile boundaries to eliminate checkered look.
   *  Only blends different-terrain boundaries. Same-terrain neighbors tile perfectly,
   *  so skipping same-terrain blends preserves maximum texture detail and performance.
   *  Transitions are blended using the actual neighbor's high-quality texture (faded
   *  via transparency gradient) rather than flat solid colors, preventing a grid look. */
  private applySplatBlending(
    ctx: CanvasRenderingContext2D,
    map: GameMap,
    images: HTMLImageElement[],
    cell: number
  ): void {
    const BLEND_WIDTH = Math.max(3, Math.floor(cell * 0.20)); // 20% of cell for soft blending
    const CORNER_RADIUS = Math.max(3, Math.floor(cell * 0.15)); // 15% for corner blending

    // Reusable temporary canvas for drawing the neighbor's texture with transparency masks
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cell;
    tempCanvas.height = cell;
    const tempCtx = tempCanvas.getContext('2d')!;

    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const centerIdx = this.toIdx(String(map.tiles[ty][tx].terrain));
        const ox = tx * cell;
        const oy = ty * cell;

        // ── 4 EDGES ──
        const edges: Array<{ dx: number; dy: number; edge: 'left' | 'right' | 'top' | 'bottom' }> = [
          { dx: -1, dy:  0, edge: 'left'   },
          { dx:  1, dy:  0, edge: 'right'  },
          { dx:  0, dy: -1, edge: 'top'    },
          { dx:  0, dy:  1, edge: 'bottom' },
        ];
        for (const { dx, dy, edge } of edges) {
          const nx = tx + dx;
          const ny = ty + dy;
          const neighbor = map.get(nx, ny);
          if (!neighbor) continue;
          
          const neighborIdx = this.toIdx(String(neighbor.terrain));
          if (neighborIdx === centerIdx) continue; // Skip same-terrain to keep details crisp

          // Blend the neighbor's actual texture into the center tile
          this.blendEdgeTexture(ctx, tempCanvas, tempCtx, ox, oy, cell, images[neighborIdx], BLEND_WIDTH, edge);
        }

        // ── 4 CORNERS ──
        const corners: Array<{ dx: number; dy: number; position: 'tl' | 'tr' | 'bl' | 'br' }> = [
          { dx: -1, dy: -1, position: 'tl' }, // top-left
          { dx:  1, dy: -1, position: 'tr' }, // top-right
          { dx: -1, dy:  1, position: 'bl' }, // bottom-left
          { dx:  1, dy:  1, position: 'br' }, // bottom-right
        ];
        for (const { dx, dy, position } of corners) {
          const nx = tx + dx;
          const ny = ty + dy;
          const neighbor = map.get(nx, ny);
          if (!neighbor) continue;

          const neighborIdx = this.toIdx(String(neighbor.terrain));
          if (neighborIdx === centerIdx) continue; // Skip same-terrain to keep details crisp

          // Blend the neighbor's actual texture into the corner
          this.blendCornerTexture(ctx, tempCanvas, tempCtx, ox, oy, cell, images[neighborIdx], CORNER_RADIUS, position);
        }
      }
    }
  }

  /** Blends neighbor's texture into the tile edge using an opacity gradient mask */
  private blendEdgeTexture(
    ctx: CanvasRenderingContext2D,
    tempCanvas: HTMLCanvasElement,
    tempCtx: CanvasRenderingContext2D,
    ox: number, oy: number,
    cell: number,
    neighborImg: HTMLImageElement,
    blendWidth: number,
    edge: 'left' | 'right' | 'top' | 'bottom'
  ): void {
    // 1. Clear temp canvas
    tempCtx.clearRect(0, 0, cell, cell);

    // 2. Draw neighbor's full texture onto temp canvas
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.drawImage(neighborImg, 0, 0, neighborImg.width, neighborImg.height, 0, 0, cell, cell);

    // 3. Create linear transparency gradient (opaque at tile border -> fully transparent inward)
    let grad: CanvasGradient;
    if (edge === 'left') {
      grad = tempCtx.createLinearGradient(0, 0, blendWidth, 0);
    } else if (edge === 'right') {
      grad = tempCtx.createLinearGradient(cell, 0, cell - blendWidth, 0);
    } else if (edge === 'top') {
      grad = tempCtx.createLinearGradient(0, 0, 0, blendWidth);
    } else {
      grad = tempCtx.createLinearGradient(0, cell, 0, cell - blendWidth);
    }
    grad.addColorStop(0, 'rgba(0,0,0,1.0)'); // Opaque neighbor texture at boundary
    grad.addColorStop(1, 'rgba(0,0,0,0.0)'); // Fades out completely inward

    // 4. Crop temp canvas to only the blended edge with destination-in
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.fillStyle = grad;
    if (edge === 'left') {
      tempCtx.fillRect(0, 0, blendWidth, cell);
    } else if (edge === 'right') {
      tempCtx.fillRect(cell - blendWidth, 0, blendWidth, cell);
    } else if (edge === 'top') {
      tempCtx.fillRect(0, 0, cell, blendWidth);
    } else {
      tempCtx.fillRect(0, cell - blendWidth, cell, blendWidth);
    }

    // 5. Draw the faded edge onto the main atlas canvas
    ctx.drawImage(tempCanvas, ox, oy);
  }

  /** Blends neighbor's texture into the tile corner using a radial opacity gradient mask */
  private blendCornerTexture(
    ctx: CanvasRenderingContext2D,
    tempCanvas: HTMLCanvasElement,
    tempCtx: CanvasRenderingContext2D,
    ox: number, oy: number,
    cell: number,
    neighborImg: HTMLImageElement,
    radius: number,
    position: 'tl' | 'tr' | 'bl' | 'br'
  ): void {
    // 1. Clear temp canvas
    tempCtx.clearRect(0, 0, cell, cell);

    // 2. Draw neighbor's full texture onto temp canvas
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.drawImage(neighborImg, 0, 0, neighborImg.width, neighborImg.height, 0, 0, cell, cell);

    // 3. Create radial transparency gradient centered at outer corner tip
    const gx = position === 'tr' || position === 'br' ? cell : 0;
    const gy = position === 'bl' || position === 'br' ? cell : 0;
    const grad = tempCtx.createRadialGradient(gx, gy, 0, gx, gy, radius);
    grad.addColorStop(0, 'rgba(0,0,0,1.0)'); // Opaque neighbor texture at corner tip
    grad.addColorStop(1, 'rgba(0,0,0,0.0)'); // Fades out completely inward

    // 4. Crop temp canvas to the corner region with destination-in
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.fillStyle = grad;
    const rx = position === 'tr' || position === 'br' ? cell - radius : 0;
    const ry = position === 'bl' || position === 'br' ? cell - radius : 0;
    tempCtx.fillRect(rx, ry, radius, radius);

    // 5. Draw the faded corner onto the main atlas canvas
    ctx.drawImage(tempCanvas, ox, oy);
  }

  private toIdx(t: string): number {
    switch (t) {
      case 'Forest': return 1;
      case 'Desert': return 2;
      case 'Mountain': return 3;
      case 'Snow': return 4;
      case 'Water':
      case 'DeepWater': return 5;
      case 'Swamp': return 6;
      default: return 0;
    }
  }

  private loadImage(s: string): Promise<HTMLImageElement> {
    return new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => no(Error(`failed to load ${s}`));
      i.crossOrigin = 'anonymous';
      i.src = s;
    });
  }

  /** Toggle splatting on/off - when off, shows flat colored terrain */
  setSplattingEnabled(enabled: boolean): void {
    this.splattingEnabled = enabled;
    const mesh = this.terrainMesh;
    if (!mesh) return;

    const mat = mesh.material as StandardMaterial;

    if (enabled) {
      // Restore textures
      mat.diffuseColor = this._savedDiffuseColor ?? new Color3(1, 1, 1);
    } else {
      // Disable - show flat color for debugging checkered view
      this._savedDiffuseColor = mat.diffuseColor.clone();
      mat.diffuseTexture = null;
      mat.diffuseColor = new Color3(0.4, 0.7, 0.3); // Flat green
    }
  }

  /** Get current splatting state */
  isSplattingEnabled(): boolean {
    return this.splattingEnabled;
  }

  /** Refresh splat texture after map changes */
  async refreshSplatting(): Promise<void> {
    if (this.splattingEnabled) {
      // Reload the entire atlas with splatting applied
      await this.loadTerrainTextures(this.map);
    }
  }

  getMesh() {
    return this.terrainMesh;
  }
}