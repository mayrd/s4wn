/**
 * S4WN Babylon.js/TypeScript - Production Animator
 *
 * Manages production animations for completed buildings:
 * - `idle`: Constant building base animation (looped, continuous)
 * - `produce`: Loop triggered by production cycle
 *
 * Integrates with GameLoop tick for efficient animation updates.
 */

import {
  Scene,
  Mesh,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import { BuildingData } from '../game/Economy';
import { productionInterval, requiresSettler, buildingInputs } from '../economy/types';

/**
 * Animation state for a single building.
 */
interface ProductionEntry {
  building: BuildingData;
  meshNode: TransformNode | null;
  idleEffect: {
    mesh: Mesh | null;
    material: StandardMaterial | null;
    rotationSpeed: number;
  } | null;
  produceEffect: {
    mesh: Mesh | null;
    material: StandardMaterial | null;
    animationTime: number;
  } | null;
  isPlayingProduce: boolean;
  // Track if effects were created
  effectsCreated: boolean;
}

export class ProductionAnimator {
  private scene: Scene;
  private entries: Map<number, ProductionEntry> = new Map();
  private _visible: boolean = true;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Register a building mesh for production animation.
   * Called when a building model is created or loaded.
   */
  registerBuilding(building: BuildingData, meshNode: TransformNode | null): void {
    if (!this.entries.has(building.index)) {
      this.entries.set(building.index, {
        building,
        meshNode,
        idleEffect: null,
        produceEffect: null,
        isPlayingProduce: false,
        effectsCreated: false,
      });
    } else {
      // Update mesh node if it was created later
      const entry = this.entries.get(building.index)!;
      entry.meshNode = meshNode;
    }
  }

  /**
   * Update production animations for all buildings.
   * Called each frame from the render loop.
   *
   * @param buildings - Array of all buildings from the economy
   * @param buildingMeshes - Map of building index to mesh node
   */
  update(buildings: BuildingData[], buildingMeshes: Map<number, any>): void {
    const activeIndices = new Set<number>();

    for (const building of buildings) {
      // Skip buildings under construction
      if (building.constructionProgress < 1.0) continue;

      // Skip buildings that are not active producers
      const interval = productionInterval(building.kind);
      if (interval <= 0) continue;

      activeIndices.add(building.index);

      // Get or create entry
      let entry = this.entries.get(building.index);
      if (!entry) {
        entry = {
          building,
          meshNode: buildingMeshes.get(building.index) || null,
          idleEffect: null,
          produceEffect: null,
          isPlayingProduce: false,
          effectsCreated: false,
        };
        this.entries.set(building.index, entry);
      }

      // Determine if building is actively producing (has inputs available or doesn't require settler)
      const isProcessing = this.isBuildingProcessing(building);

      if (isProcessing) {
        this.playProduceAnimation(entry, building);
      } else {
        this.playIdleAnimation(entry, building);
      }
    }
  }

  /**
   * Check if a building is actively processing/producing.
   */
  private isBuildingProcessing(building: BuildingData): boolean {
    const interval = productionInterval(building.kind);
    if (interval <= 0) return false;

    // Buildings that require settlers need an assigned worker
    if (requiresSettler(building.kind) && building.assignedSettlers.length === 0) {
      return false;
    }

    // Check if the building has inputs available for production
    // (or if it's a producer that doesn't consume inputs)
    const inputs = buildingInputs(building.kind);
    if (inputs.length === 0) {
      // Producer buildings (sawmill, farm, etc.) are always processing
      return true;
    }

    // Consumer buildings need input resources
    return inputs.some(inp => {
      const disc = inp.resource as number;
      return building.inputBuffer[disc] > 0;
    });
  }

  /**
   * Play the production animation for a building.
   */
  private playProduceAnimation(entry: ProductionEntry, building: BuildingData): void {
    entry.isPlayingProduce = true;

    // Create effects if needed
    if (!entry.effectsCreated) {
      entry.produceEffect = this.createProduceEffect(building);
      entry.idleEffect = this.createIdleEffect(building);
      entry.effectsCreated = true;
    }

    if (entry.produceEffect?.mesh) {
      entry.produceEffect.mesh.isVisible = true;
      entry.produceEffect.animationTime += 0.016; // dt approximation
    }

    // Hide idle effect when producing
    if (entry.idleEffect?.mesh) {
      entry.idleEffect.mesh.isVisible = false;
    }
  }

  /**
   * Play the idle animation for a building.
   */
  private playIdleAnimation(entry: ProductionEntry, building: BuildingData): void {
    entry.isPlayingProduce = false;

    // Create effects if needed
    if (!entry.effectsCreated) {
      entry.idleEffect = this.createIdleEffect(building);
      entry.produceEffect = this.createProduceEffect(building);
      entry.effectsCreated = true;
    }

    if (entry.idleEffect?.mesh) {
      entry.idleEffect.mesh.isVisible = true;
      // Continuous rotation for idle animation
      entry.idleEffect.mesh.rotation.y += entry.idleEffect.rotationSpeed * 0.016;
    }

    // Hide produce effect when idle
    if (entry.produceEffect?.mesh) {
      entry.produceEffect.mesh.isVisible = false;
    }
  }

  /**
   * Create a subtle produce animation effect (e.g., smoke puff, emissive pulse).
   */
  private createProduceEffect(building: BuildingData): { mesh: Mesh; material: StandardMaterial; animationTime: number } | null {
    // Create a small indicator mesh above the building
    const effectMesh = MeshBuilder.CreateBox(
      `produce-effect-${building.index}`,
      { width: 0.3, height: 0.1, depth: 0.3 },
      this.scene
    );

    const mat = new StandardMaterial(`produce-mat-${building.index}`, this.scene);
    mat.diffuseColor = new Color3(0.8, 0.6, 0.2); // Amber/yellow for production
    mat.emissiveColor = new Color3(0.5, 0.3, 0.0);
    mat.specularColor = Color3.Black();
    effectMesh.material = mat;

    // Position above building center
    effectMesh.position.set(0.5, 1.5, 0.5);
    effectMesh.isVisible = false;

    return { mesh: effectMesh, material: mat, animationTime: 0 };
  }

  /**
   * Create a subtle idle animation effect (e.g., small rotation, pulsing).
   */
  private createIdleEffect(building: BuildingData): { mesh: Mesh; material: StandardMaterial; rotationSpeed: number } | null {
    // Create a small decorative mesh for idle effect
    const effectMesh = MeshBuilder.CreateSphere(
      `idle-effect-${building.index}`,
      { diameter: 0.15 },
      this.scene
    );

    const mat = new StandardMaterial(`idle-mat-${building.index}`, this.scene);
    mat.diffuseColor = new Color3(0.6, 0.6, 0.6);
    mat.emissiveColor = new Color3(0.1, 0.1, 0.1);
    mat.specularColor = Color3.Black();
    effectMesh.material = mat;

    // Position near building top
    effectMesh.position.set(0.5, 2.0, 0.5);
    effectMesh.isVisible = false;

    // Rotation speed varies by building kind for visual variety
    const rotationSpeed = 0.3 + (building.kind % 5) * 0.1; // 0.3 to 0.7 rad/s

    return { mesh: effectMesh, material: mat, rotationSpeed };
  }

  /**
   * Get all tracked production entries.
   */
  getEntries(): Map<number, ProductionEntry> {
    return this.entries;
  }

  /**
   * Check if a building has production animation registered.
   */
  isTracked(buildingIndex: number): boolean {
    return this.entries.has(buildingIndex);
  }

  /**
   * Remove tracking for a specific building.
   */
  removeTracking(buildingIndex: number): void {
    const entry = this.entries.get(buildingIndex);
    if (entry) {
      this.disposeEntry(entry);
      this.entries.delete(buildingIndex);
    }
  }

  /**
   * Get/set visibility of production effects.
   */
  get visible(): boolean {
    return this._visible;
  }

  set visible(v: boolean) {
    this._visible = v;
    for (const entry of this.entries.values()) {
      if (entry.idleEffect?.mesh) {
        entry.idleEffect.mesh.isVisible = v && !entry.isPlayingProduce;
      }
      if (entry.produceEffect?.mesh) {
        entry.produceEffect.mesh.isVisible = v && entry.isPlayingProduce;
      }
    }
  }

  /**
   * Dispose a single production entry.
   */
  private disposeEntry(entry: ProductionEntry): void {
    if (entry.idleEffect?.mesh) {
      entry.idleEffect.mesh.dispose();
    }
    if (entry.produceEffect?.mesh) {
      entry.produceEffect.mesh.dispose();
    }
    if (entry.idleEffect?.material) {
      entry.idleEffect.material.dispose();
    }
    if (entry.produceEffect?.material) {
      entry.produceEffect.material.dispose();
    }
  }

  /**
   * Dispose all production animation meshes and effects.
   */
  dispose(): void {
    for (const entry of this.entries.values()) {
      this.disposeEntry(entry);
    }
    this.entries.clear();
  }
}
