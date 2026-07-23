/**
 * S4WN MaritimeTradeRenderer — Visualizes ship trade routes between LandingDocks.
 *
 * Renders 3D ship models traveling between LandingDock buildings, carrying
 * resources across water routes. Uses the boat.obj model or falls back to
 * a procedural box if the model fails to load.
 *
 * Features:
 * - Ship models face travel direction with rotation
 * - Ships rendered at water level (slightly above terrain)
 * - Smooth interpolation along path
 * - Larger than donkey models (ships carry more cargo)
 */

import {
  Mesh,
  AbstractMesh,
  Scene,
  SceneLoader,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import { MaritimeMission } from '../game/MaritimeTradeManager';

/** Visual height offset above terrain for trade route ships. */
const SHIP_Y_OFFSET = 0.8;
/** Ship model scale factor */
const SHIP_SCALE = 0.5;

/**
 * Visual data for a single maritime trade mission.
 */
export class MaritimeMissionVisual {
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
    return new Vector3(x, SHIP_Y_OFFSET, z);
  }
}

/**
 * Renderer for maritime trade route ship missions.
 * Visualizes ship movements between LandingDocks on the map.
 */
export class MaritimeTradeRenderer {
  private scene: Scene;
  private _visible: boolean = false;
  private shipMeshes: Map<number, AbstractMesh> = new Map();
  private missionVisuals: Map<number, MaritimeMissionVisual> = new Map();
  private shipTemplate: AbstractMesh | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.loadShipModel();
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(v: boolean) {
    this._visible = v;
    for (const [, mesh] of this.shipMeshes) {
      mesh.isVisible = v;
    }
  }

  /** Asynchronously load the ship model (boat.obj). */
  async loadShipModel(): Promise<void> {
    if (this.shipTemplate) return;
    try {
      const result = await SceneLoader.ImportMeshAsync(
        '', '/models/', 'boat.obj', this.scene
      );
      if (result.meshes.length > 0) {
        this.shipTemplate = result.meshes[0];
        this.shipTemplate.isVisible = false;
        this.shipTemplate.isPickable = false;
        this.shipTemplate.scaling.setAll(SHIP_SCALE);
      }
    } catch {
      // Template stays null; will use procedural fallback
    }
  }

  /**
   * Synchronize visual ships with current maritime trade missions.
   */
  syncMissions(missions: MaritimeMission[]): void {
    // Track which missions we've seen
    const seenIds = new Set(missions.map(m => m.id));

    // Remove visuals for missions no longer present
    for (const [id, mesh] of this.shipMeshes) {
      if (!seenIds.has(id)) {
        mesh.dispose();
        this.shipMeshes.delete(id);
        this.missionVisuals.delete(id);
      }
    }

    // Create/update visuals for current missions
    for (const mission of missions) {
      if (!this.shipMeshes.has(mission.id)) {
        let shipMesh: AbstractMesh;
        if (this.shipTemplate) {
          shipMesh = this.shipTemplate.clone(`ship_trade_${mission.id}`, null) as AbstractMesh;
        } else {
          // Procedural fallback: a larger box for ships
          const fallbackName = `ship_trade_fallback_${mission.id}`;
          shipMesh = new Mesh(fallbackName);
        }
        shipMesh.isVisible = this._visible;
        shipMesh.isPickable = false;
        this.shipMeshes.set(mission.id, shipMesh);

        // Create visual data
        const visual = new MaritimeMissionVisual(
          mission.id,
          mission.srcX,
          mission.srcY,
          mission.dstX,
          mission.dstY
        );
        this.missionVisuals.set(mission.id, visual);
      }
    }
  }

  /** Get the number of active ship meshes. */
  getMissionCount(): number {
    return this.shipMeshes.size;
  }

  /** Get position of a specific mission's ship. */
  getMissionPosition(missionId: number): Vector3 | undefined {
    const mesh = this.shipMeshes.get(missionId);
    if (mesh && mesh.position) {
      return mesh.position;
    }
    return undefined;
  }

  /**
   * Update positions based on mission progress values.
   */
  updatePositions(missions: MaritimeMission[]): void {
    for (const mission of missions) {
      const mesh = this.shipMeshes.get(mission.id);
      const visual = this.missionVisuals.get(mission.id);
      if (!mesh || !visual) continue;

      const pos = this.getPositionForMission(mission, visual);
      mesh.position = pos;

      // Rotate to face travel direction
      if (mesh.rotation) {
        const dx = visual.destX - visual.sourceX;
        const dz = visual.destY - visual.sourceY;
        const angle = Math.atan2(dx, dz);
        mesh.rotation.y = mission.returning ? angle + Math.PI : angle;
      }
    }
  }

  /** Get position for a mission, handling return journey. */
  private getPositionForMission(mission: MaritimeMission, visual: MaritimeMissionVisual): Vector3 {
    if (!mission.returning) {
      return visual.getPositionAtProgress(mission.progress);
    } else {
      const x = visual.destX + 0.5 + (visual.sourceX - visual.destX) * mission.progress;
      const z = visual.destY + 0.5 + (visual.sourceY - visual.destY) * mission.progress;
      return new Vector3(x, SHIP_Y_OFFSET, z);
    }
  }

  /** Remove all meshes and release GPU resources. */
  dispose(): void {
    for (const [, mesh] of this.shipMeshes) {
      mesh.dispose();
    }
    this.shipMeshes.clear();
    this.missionVisuals.clear();
    if (this.shipTemplate) {
      this.shipTemplate.dispose();
      this.shipTemplate = null;
    }
  }
}