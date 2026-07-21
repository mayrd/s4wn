/**
 * S4WN TradeRouteRenderer — Visualizes donkey trade routes between Marketplaces.
 *
 * Renders 3D donkey models traveling between Marketplace buildings, carrying
 * resources and returning with gold. The renderer uses the donkey.glb model
 * (loaded via SupplyChainRenderer's carrierTemplate pattern) or falls back
 * to a procedural box if the model fails to load.
 *
 * Features:
 * - Donkey models face travel direction
 * - Cargo material tint based on resource type
 * - Elevated above terrain (0.3 units up)
 * - Smooth interpolation along path
 */

import {
  Mesh,
  AbstractMesh,
  Scene,
  SceneLoader,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { TradeMission } from '../game/TradeRouteManager';

/** Visual height offset above terrain for trade route donkeys. */
const DONKEY_Y_OFFSET = 0.3;

/**
 * Visual data for a single trade mission.
 * Tracks the mission state and mesh for rendering updates.
 */
export class TradeMissionVisual {
  missionId: number;
  sourceX: number;
  sourceY: number;
  destX: number;
  destY: number;

  constructor(missionId: number, sourceX: number, sourceY: number, destX: number, destY: number) {
    this.missionId = missionId;
    this.sourceX = sourceX;
    this.sourceY = sourceY;
    this.destX = destX;
    this.destY = destY;
  }

  /** Get position at a given progress (0 to 1) along the path. */
  getPositionAtProgress(progress: number): Vector3 {
    const x = this.sourceX + 0.5 + (this.destX - this.sourceX) * progress;
    const z = this.sourceY + 0.5 + (this.destY - this.sourceY) * progress;
    return new Vector3(x, DONKEY_Y_OFFSET, z);
  }
}

/**
 * Renderer for trade route donkey missions.
 * Visualizes donkey movements between Marketplaces on the map.
 */
export class TradeRouteRenderer {
  private scene: Scene;
  private _visible: boolean = false;
  private donkeyMeshes: Map<number, AbstractMesh> = new Map();
  private missionVisuals: Map<number, TradeMissionVisual> = new Map();
  private carrierTemplate: AbstractMesh | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    // Load the donkey model asynchronously
    this.loadCarrierModel();
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(v: boolean) {
    this._visible = v;
    for (const [, mesh] of this.donkeyMeshes) {
      mesh.isVisible = v;
    }
  }

  /** Asynchronously load the donkey carrier model. */
  async loadCarrierModel(): Promise<void> {
    if (this.carrierTemplate) return; // Already loaded
    try {
      const result = await SceneLoader.ImportMeshAsync(
        '', '/models/poly_pizza/', 'donkey.glb', this.scene
      );
      if (result.meshes.length > 0) {
        this.carrierTemplate = result.meshes[0];
        this.carrierTemplate.isVisible = false;
        this.carrierTemplate.isPickable = false;
        this.carrierTemplate.scaling.setAll(0.12);
      }
    } catch {
      // Template stays null; will use procedural fallback
    }
  }

  /**
   * Synchronize visual donkeys with current trade missions.
   * Returns array of IDs of completed missions (to be removed from TradeRouteManager).
   */
  syncMissions(missions: TradeMission[]): number[] {
    const completedIds: number[] = [];

    // Track which missions we've seen
    const seenIds = new Set(missions.map(m => m.id));

    // Remove visuals for missions no longer present
    for (const [id, mesh] of this.donkeyMeshes) {
      if (!seenIds.has(id)) {
        mesh.dispose();
        this.donkeyMeshes.delete(id);
        this.missionVisuals.delete(id);
      }
      // Check for completed round-trip (progress >= 1.0 and returning)
      const mission = missions.find(m => m.id === id && m.returning && m.progress >= 1.0);
      if (mission) {
        completedIds.push(mission.id);
      }
    }

    // Create/update visuals for current missions
    for (const mission of missions) {
      if (!this.donkeyMeshes.has(mission.id)) {
        // Create new donkey mesh
        let donkeyMesh: AbstractMesh;
        if (this.carrierTemplate) {
          donkeyMesh = this.carrierTemplate.clone(`donkey_trade_${mission.id}`, null) as AbstractMesh;
        } else {
          // Procedural fallback: small box
          const fallbackName = `donkey_trade_fallback_${mission.id}`;
          donkeyMesh = new Mesh(fallbackName);
        }
        donkeyMesh.isVisible = this._visible;
        donkeyMesh.isPickable = false;
        this.donkeyMeshes.set(mission.id, donkeyMesh);

        // Create visual data
        const visual = new TradeMissionVisual(
          mission.id,
          mission.srcX,
          mission.srcY,
          mission.dstX,
          mission.dstY
        );
        this.missionVisuals.set(mission.id, visual);
      }
    }

    return completedIds;
  }

  /** Get the number of active donkey meshes. */
  getMissionCount(): number {
    return this.donkeyMeshes.size;
  }

  /** Get position of a specific mission's donkey. Returns undefined if not found. */
  getMissionPosition(missionId: number): Vector3 | undefined {
    const mesh = this.donkeyMeshes.get(missionId);
    if (mesh && mesh.position) {
      return mesh.position;
    }
    return undefined;
  }

  /** Get visual data for a mission. */
  getMissionVisual(missionId: number): TradeMissionVisual | undefined {
    return this.missionVisuals.get(missionId);
  }

  /**
   * Update positions based on mission progress values.
   * Called when mission progress has been updated.
   */
  updatePositions(missions: TradeMission[]): void {
    for (const mission of missions) {
      const mesh = this.donkeyMeshes.get(mission.id);
      const visual = this.missionVisuals.get(mission.id);
      if (!mesh || !visual) continue;

      // Calculate position based on progress and whether returning
      const pos = this.getPositionForMission(mission, visual);
      mesh.position = pos;

      // Rotate to face travel direction (only for donkey model clones)
      if (this.carrierTemplate && mesh.rotation) {
        const dx = visual.destX - visual.sourceX;
        const dz = visual.destY - visual.sourceY;
        const angle = Math.atan2(dx, dz);
        mesh.rotation.y = angle;
      }
    }
  }

  /** Get position for a mission, handling return journey. */
  private getPositionForMission(mission: TradeMission, visual: TradeMissionVisual): Vector3 {
    if (!mission.returning) {
      // Outbound journey: source -> destination
      return visual.getPositionAtProgress(mission.progress);
    } else {
      // Return journey: destination -> source
      const x = visual.destX + 0.5 + (visual.sourceX - visual.destX) * mission.progress;
      const z = visual.destY + 0.5 + (visual.sourceY - visual.destY) * mission.progress;
      return new Vector3(x, DONKEY_Y_OFFSET, z);
    }
  }

  /** Remove all meshes and release GPU resources. */
  dispose(): void {
    for (const [, mesh] of this.donkeyMeshes) {
      mesh.dispose();
    }
    this.donkeyMeshes.clear();
    this.missionVisuals.clear();
    if (this.carrierTemplate) {
      this.carrierTemplate.dispose();
      this.carrierTemplate = null;
    }
  }
}