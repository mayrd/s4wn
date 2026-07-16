/**
 * S4WN Babylon.js/TypeScript - Construction Animator
 *
 * Manages progressive scaffolding meshes for buildings under construction.
 * Stages:
 *   0-33%  → Corner poles only
 *   33-66% → Corner poles + horizontal beams (frame)
 *   66-99% → Frame + partial wall planks
 *   100%   → Swap scaffolding for final building model
 */

import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  TransformNode,
} from '@babylonjs/core';
import { BuildingData } from '../game/Economy';
import { buildingName } from '../economy/types';
import { BuildingMesh } from './BuildingMesh';
import { NationType } from '../game/Nation';
import { ShadowPipeline } from './pipelines/ShadowPipeline';

interface ConstructionEntry {
  building: BuildingData;
  scaffold: TransformNode;
  cornerPoles: Mesh[];
  horizontalBeams: Mesh[];
  wallPlanks: Mesh[];
  completed: boolean;
  loadingFinal: boolean;
}

/** Progress thresholds for visual stages. */
const STAGE_BEAMS = 0.33;
const STAGE_WALLS = 0.66;

export class ConstructionAnimator {
  private scene: Scene;
  private buildingRenderer: BuildingMesh;
  private shadowPipeline: ShadowPipeline | null = null;
  private entries: Map<number, ConstructionEntry> = new Map();

  /** Callback when construction finishes and final mesh is placed. */
  public onConstructionComplete:
    | ((mesh: any, building: BuildingData) => void)
    | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.buildingRenderer = new BuildingMesh(scene);
  }

  setShadowPipeline(pipeline: ShadowPipeline): void {
    this.shadowPipeline = pipeline;
  }

  /**
   * Create scaffolding for a newly placed building.
   * Scaffolding starts with only corner poles visible — beams and walls
   * will be added progressively via update().
   */
  startConstruction(building: BuildingData, nation?: NationType): void {
    // Don't double-start
    if (this.entries.has(building.index)) return;

    const scaffold = new TransformNode(
      `scaffold-${building.index}`,
      this.scene,
    );
    scaffold.position.set(building.x, 0, building.y);

    const mat = new StandardMaterial(
      `scaffoldMat-${building.index}`,
      this.scene,
    );
    mat.diffuseColor = new Color3(0.65, 0.45, 0.25); // Warm wood
    mat.specularColor = new Color3(0.05, 0.05, 0.05);
    mat.disableLighting = false;

    const hw = 0.9; // half-width
    const hd = 0.9; // half-depth
    const height = 2.8;

    // ── Corner poles (always visible) ──
    const cornerPoles: Mesh[] = [];
    const corners: [number, number][] = [
      [-hw, -hd],
      [hw, -hd],
      [-hw, hd],
      [hw, hd],
    ];
    for (const [cx, cz] of corners) {
      const pole = MeshBuilder.CreateCylinder(
        `cpole-${building.index}-${cx}-${cz}`,
        { height, diameter: 0.08 },
        this.scene,
      );
      pole.position.set(cx, height / 2, cz);
      pole.material = mat;
      pole.parent = scaffold;
      cornerPoles.push(pole);
    }

    // ── Horizontal beams (hidden initially, shown at STAGE_BEAMS) ──
    const beamY = 2.3; // near top
    const horizontalBeams: Mesh[] = [];
    const beamPairs: [number, number][] = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = beamPairs[i];
      const [bx, bz] = beamPairs[(i + 1) % 4];
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      const length = Math.sqrt((bx - ax) ** 2 + (bz - az) ** 2);
      const beam = MeshBuilder.CreateBox(
        `beam-${building.index}-${i}`,
        { width: length, height: 0.08, depth: 0.08 },
        this.scene,
      );
      beam.position.set(mx, beamY, mz);
      beam.material = mat;
      beam.isVisible = false;
      beam.parent = scaffold;
      horizontalBeams.push(beam);
    }

    // ── Wall planks (hidden initially, shown at STAGE_WALLS) ──
    const wallPlanks: Mesh[] = [];
    const plankCount = 6;
    const plankHeight = 0.12;
    const plankGap = (height - 0.3) / plankCount;
    // Walls on 4 sides
    const walls: { cx: number; cz: number; w: number; d: number }[] = [
      { cx: 0, cz: -hd, w: hw * 2, d: 0.04 }, // front
      { cx: 0, cz: hd, w: hw * 2, d: 0.04 }, // back
      { cx: -hw, cz: 0, w: 0.04, d: hd * 2 }, // left
      { cx: hw, cz: 0, w: 0.04, d: hd * 2 }, // right
    ];
    for (const wall of walls) {
      for (let p = 0; p < plankCount; p++) {
        const py = 0.15 + p * plankGap;
        const plank = MeshBuilder.CreateBox(
          `plank-${building.index}-${p}`,
          { width: wall.w, height: plankHeight, depth: wall.d },
          this.scene,
        );
        plank.position.set(wall.cx, py, wall.cz);
        plank.material = mat;
        plank.isVisible = false;
        plank.parent = scaffold;
        wallPlanks.push(plank);
      }
    }

    this.entries.set(building.index, {
      building,
      scaffold,
      cornerPoles,
      horizontalBeams,
      wallPlanks,
      completed: false,
      loadingFinal: false,
    });

    // Store nation for final model creation
    (scaffold as any)._s4wnNation = nation;
  }

  /**
   * Call every frame — reads constructionProgress from economy buildings
   * and updates scaffolding visuals; triggers final model swap on completion.
   */
  update(buildings: BuildingData[]): void {
    for (const building of buildings) {
      const entry = this.entries.get(building.index);
      if (!entry || entry.completed) continue;

      const progress = building.constructionProgress;

      // ── Completion: swap to final model ──
      if (progress >= 1.0) {
        this.swapToFinalModel(entry);
        continue;
      }

      // ── Stage transitions ──
      const showBeams = progress >= STAGE_BEAMS;
      const showWalls = progress >= STAGE_WALLS;
      const wallPct = showWalls
        ? (progress - STAGE_WALLS) / (1.0 - STAGE_WALLS)
        : 0;

      for (const beam of entry.horizontalBeams) {
        beam.isVisible = showBeams;
      }

      // Show wall planks progressively — bottom to top
      const totalPlanks = entry.wallPlanks.length;
      const visiblePlanks = showWalls
        ? Math.max(0, Math.floor(wallPct * totalPlanks))
        : 0;
      for (let i = 0; i < entry.wallPlanks.length; i++) {
        entry.wallPlanks[i].isVisible = showWalls && i < visiblePlanks;
      }
    }
  }

  /**
   * Replace scaffolding with the final building model.
   * Disposes scaffolding immediately; loads the actual model asynchronously.
   */
  private async swapToFinalModel(entry: ConstructionEntry): Promise<void> {
    if (entry.loadingFinal) return;
    entry.loadingFinal = true;

    const kindName = buildingName(entry.building.kind);
    const nation = (entry.scaffold as any)._s4wnNation as NationType | undefined;
    const x = entry.building.x;
    const y = entry.building.y;

    // Dispose scaffolding immediately — it's done its job
    this.disposeEntry(entry);

    try {
      const finalMesh = await this.buildingRenderer.createBuilding(
        kindName,
        x,
        y,
        2, 2, 2, null, nation,
      );

      // Register with shadow pipeline
      if (finalMesh && this.shadowPipeline) {
        this.shadowPipeline.addShadowCaster(finalMesh);
      }

      // Notify external listeners
      if (this.onConstructionComplete) {
        this.onConstructionComplete(finalMesh, entry.building);
      }
    } catch (err) {
      console.warn(
        `Failed to load final model for ${kindName}:`,
        err,
      );
    }
  }

  /** Remove a specific entry and its scaffolding. */
  private disposeEntry(entry: ConstructionEntry): void {
    entry.scaffold.dispose();
    this.entries.delete(entry.building.index);
    entry.completed = true;
  }

  /** Get all currently-tracked construction entries. */
  getEntries(): Map<number, ConstructionEntry> {
    return this.entries;
  }

  /** Check if a specific building index is under construction animation. */
  isTracked(buildingIndex: number): boolean {
    return this.entries.has(buildingIndex);
  }

  /** Remove tracking for a building (e.g., when destroyed). */
  removeTracking(buildingIndex: number): void {
    const entry = this.entries.get(buildingIndex);
    if (entry) {
      this.disposeEntry(entry);
    }
  }

  /** Dispose all scaffolding and finalize. */
  dispose(): void {
    for (const [, entry] of this.entries) {
      entry.scaffold.dispose();
      entry.completed = true;
    }
    this.entries.clear();
  }
}
