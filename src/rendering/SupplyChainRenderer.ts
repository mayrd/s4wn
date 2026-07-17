/**
 * S4WN SupplyChainRenderer — Visualizes resource transport between buildings.
 *
 * Renders colored lines connecting supply-chain pairs (producer → consumer)
 * with animated carrier dots that travel along each path. The renderer analyzes
 * the Economy's building list to discover active production chains and draws
 * visual connections on the terrain.
 *
 * Supply chain colors indicate the transported resource:
 *   Brown → Wood      Blue  → Water     Yellow → Grain    Red → Meat
 *   Gray  → Stone     Cyan  → Iron/Coal Purple → Gold     Orange → Tools
 */

import {
  Mesh,
  MeshBuilder,
  LinesMesh,
  StandardMaterial,
  Color3,
  Vector3,
  Scene,
  SceneLoader,
  AbstractMesh,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { buildingInputs, buildingOutputs, resourceName } from '../economy/types';
import { Economy } from '../game/Economy';

/** Visual height offset above terrain for supply lines. */
const LINE_Y_OFFSET = 0.25;
/** Animation speed for carrier dots (tiles per second). */
const CARRIER_SPEED = 0.8;
/** Size of carrier sphere dots. */
const CARRIER_RADIUS = 0.08;

/** Supply chain pair: from producer to consumer. */
export interface SupplyLink {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  consumerKind: number;
  resourceName: string;
  /** Color for the line (RGB 0–1). */
  color: [number, number, number];
}

/** Map resource types to line colors. */
export const RESOURCE_COLORS: Record<number, [number, number, number]> = {
  0:  [0.55, 0.27, 0.07],  // Wood → brown
  1:  [0.4,  0.5,  0.5],   // Iron Ore → steel blue
  2:  [0.2,  0.2,  0.2],   // Coal → dark gray
  3:  [0.8,  0.7,  0.0],   // Gold → yellow
  4:  [0.5,  0.5,  0.5],   // Stone → gray
  5:  [0.9,  0.9,  0.0],   // Sulfur → bright yellow
  6:  [0.0,  0.4,  0.6],   // Fish → blue-green
  7:  [0.8,  0.75, 0.2],   // Grain → golden
  8:  [0.7,  0.1,  0.1],   // Meat → red
  9:  [0.2,  0.4,  0.9],   // Water → blue
  10: [0.9,  0.6,  0.1],   // Honey → amber
  11: [0.6,  0.35, 0.14],  // Planks → darker brown
  12: [0.8,  0.5,  0.0],   // Tools → orange
  13: [0.6,  0.6,  0.6],   // Weapons → silver
  14: [0.85, 0.75, 0.5],   // Bread → tan
  15: [0.9,  0.85, 0.8],   // Flour → off-white
  16: [0.55, 0.55, 0.6],   // Iron Ingots → silver-gray
  17: [0.7,  0.6,  0.2],   // Mead → honey gold
  18: [0.5,  0.0,  0.5],   // Wine → purple
};

export class SupplyChainRenderer {
  private scene: Scene;
  private lineMeshes: LinesMesh[] = [];
  private carrierMeshes: Mesh[] = [];
  /** Per-carrier: [startX, startY, endX, endY] in world coords. */
  private carrierPaths: Array<[number, number, number, number]> = [];
  /** Per-carrier: progress [0, 1] along its path. */
  private carrierProgress: number[] = [];
  private _visible: boolean = false;
  private disabledResources: Set<number> = new Set();
  /** Template mesh cloned for each carrier. Loaded from donkey.glb; null if not loaded. */
  private carrierTemplate: AbstractMesh | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    // Kick off async model load — non-blocking
    this.loadCarrierModel();
  }

  /** Asynchronously load the donkey carrier model. Safe to call multiple times. */
  async loadCarrierModel(): Promise<void> {
    if (this.carrierTemplate) return; // Already loaded
    try {
      const result = await SceneLoader.ImportMeshAsync(
        '', '/models/poly_pizza/', 'donkey.glb', this.scene
      );
      if (result.meshes.length > 0) {
        this.carrierTemplate = result.meshes[0];
        this.carrierTemplate.isVisible = false; // Hide template; clones are visible
        this.carrierTemplate.isPickable = false;
        // Scale model down to carrier size (~0.15 tile width)
        this.carrierTemplate.scaling.setAll(0.15);
      }
    } catch {
      // GLB load failed — carrierTemplate stays null; fall back to procedural box
    }
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(v: boolean) {
    this._visible = v;
    for (const m of this.lineMeshes) m.isVisible = v;
    for (const m of this.carrierMeshes) m.isVisible = v;
  }

  /** Set visibility for a specific resource type. */
  setResourceVisible(resource: number, visible: boolean): void {
    if (visible) {
      this.disabledResources.delete(resource);
    } else {
      this.disabledResources.add(resource);
    }
  }

  /** Check if a specific resource type is visible. */
  isResourceVisible(resource: number): boolean {
    return !this.disabledResources.has(resource);
  }

  /** Compute supply links from the economy's building graph. */
  computeLinks(economy: Economy): SupplyLink[] {
    const links: SupplyLink[] = [];
    const buildings = economy.buildings.filter(b => b.isActive);

    // Build a producer map: resource → list of [x, y]
    const producers = new Map<number, Array<[number, number]>>();
    for (const b of buildings) {
      const outputs = buildingOutputs(b.kind);
      for (const out of outputs) {
        const list = producers.get(out.resource as number) || [];
        list.push([b.x, b.y]);
        producers.set(out.resource as number, list);
      }
    }

    // For each consumer building, link to nearest producer of each input
    for (const b of buildings) {
      const inputs = buildingInputs(b.kind);
      for (const inp of inputs) {
        if (!this.isResourceVisible(inp.resource as number)) continue;
        const prodList = producers.get(inp.resource as number);
        if (!prodList || prodList.length === 0) continue;

        // Find nearest producer
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < prodList.length; i++) {
          const d = Math.hypot(prodList[i][0] - b.x, prodList[i][1] - b.y);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }

        const [px, py] = prodList[bestIdx];
        const color = RESOURCE_COLORS[inp.resource as number] || [0.5, 0.5, 0.5];

        links.push({
          fromX: px,
          fromY: py,
          toX: b.x,
          toY: b.y,
          consumerKind: b.kind,
          resourceName: resourceName(inp.resource),
          color,
        });
      }
    }

    return links;
  }

  /** Build line meshes and carrier models for the given supply links. */
  refresh(links: SupplyLink[]): void {
    this.dispose();

    for (const link of links) {
      // Line from producer to consumer
      const points = [
        new Vector3(link.fromX + 0.5, LINE_Y_OFFSET, link.fromY + 0.5),
        new Vector3(link.toX + 0.5, LINE_Y_OFFSET, link.toY + 0.5),
      ];
      const line = MeshBuilder.CreateLines(link.resourceName + '_line', { points }, this.scene);
      line.color = new Color3(link.color[0], link.color[1], link.color[2]);
      line.isVisible = this._visible;
      this.lineMeshes.push(line);

      // Carrier model — prefer donkey GLB clone, fall back to procedural box
      let carrier: Mesh;
      if (this.carrierTemplate) {
        carrier = this.carrierTemplate.clone(
          link.resourceName + '_carrier', null
        ) as Mesh;
      } else {
        // Procedural fallback: small box with resource color
        carrier = MeshBuilder.CreateBox(
          link.resourceName + '_carrier',
          { size: CARRIER_RADIUS * 3 },
          this.scene,
        );
        const mat = new StandardMaterial(link.resourceName + '_mat', this.scene);
        mat.diffuseColor = new Color3(link.color[0], link.color[1], link.color[2]);
        mat.emissiveColor = new Color3(link.color[0] * 0.4, link.color[1] * 0.4, link.color[2] * 0.4);
        mat.specularColor = Color3.Black();
        carrier.material = mat;
      }
      carrier.isVisible = this._visible;
      carrier.isPickable = false;

      this.carrierMeshes.push(carrier);
      this.carrierPaths.push([link.fromX + 0.5, link.fromY + 0.5, link.toX + 0.5, link.toY + 0.5]);
      this.carrierProgress.push(0);
    }
  }

  /** Animate carrier models along their paths. Call each frame with dt in seconds. */
  update(dt: number): void {
    if (!this._visible) return;

    for (let i = 0; i < this.carrierMeshes.length; i++) {
      // Advance progress
      this.carrierProgress[i] += CARRIER_SPEED * dt;
      if (this.carrierProgress[i] > 1.0) this.carrierProgress[i] = 0;

      const t = this.carrierProgress[i];
      const [sx, sy, ex, ey] = this.carrierPaths[i];
      const x = sx + (ex - sx) * t;
      const z = sy + (ey - sy) * t;
      this.carrierMeshes[i].position = new Vector3(x, LINE_Y_OFFSET + 0.1, z);

      // Rotate carrier to face travel direction (only for donkey model clones)
      if (this.carrierTemplate) {
        const dx = ex - sx;
        const dz = ey - sy;
        const angle = Math.atan2(dx, dz); // facing in XZ plane
        this.carrierMeshes[i].rotation.y = angle;
      }
    }
  }

  /** Remove all meshes and release GPU resources. */
  dispose(): void {
    for (const m of this.lineMeshes) m.dispose();
    for (const m of this.carrierMeshes) {
      // Only dispose materials we created (procedural fallback); cloned meshes reuse template materials
      if (m.material && !this.carrierTemplate) {
        (m.material as StandardMaterial).dispose();
      }
      m.dispose();
    }
    if (this.carrierTemplate) {
      this.carrierTemplate.dispose();
    }
    this.lineMeshes = [];
    this.carrierMeshes = [];
    this.carrierPaths = [];
    this.carrierProgress = [];
    this.carrierTemplate = null;
  }
}
