/**
 * S4WN Babylon.js/TypeScript - Unit Renderer
 *
 * Renders and animates units (Settler, Worker, Swordsman, etc.).
 * Handles mesh loading, instancing, and state-based animation (Idle, Moving, Working, etc.).
 */

import {
  Scene,
  SceneLoader,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';
import { Unit } from '../game/Unit';
import { UnitKind, UnitState } from '../game/types';

export class UnitRenderer {
  private scene: Scene;
  private templateMeshes: Map<string, Mesh> = new Map();
  private unitMeshes: Map<number, { root: TransformNode; mesh: Mesh }> = new Map();
  
  public onMeshCreated: ((mesh: Mesh) => void) | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Initialize templates by loading OBJ files.
   */
  async init(): Promise<void> {
    await this.loadTemplate('worker', 'unit_worker');
    await this.loadTemplate('soldier', 'unit_soldier');
    await this.loadTemplate('archer', 'unit_archer');
  }

  private async loadTemplate(key: string, filename: string): Promise<void> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', '/models/', `${filename}.obj`, this.scene);
      const rootMesh = result.meshes[0] as Mesh;
      rootMesh.isVisible = false; // Template is hidden
      
      // Merge all sub-meshes into one for easier instancing/cloning
      if (result.meshes.length > 1) {
        const merged = Mesh.MergeMeshes(result.meshes as Mesh[], true, true, undefined, false, true);
        if (merged) {
          merged.isVisible = false;
          this.templateMeshes.set(key, merged);
        } else {
          this.templateMeshes.set(key, rootMesh);
        }
      } else {
        this.templateMeshes.set(key, rootMesh);
      }
    } catch (e) {
      console.warn(`Failed to load unit template ${filename}.obj, using procedural fallback.`);
      const fallback = MeshBuilder.CreateCapsule(`fallback-${key}`, { height: 1.2, radius: 0.25 }, this.scene);
      fallback.isVisible = false;
      const mat = new StandardMaterial(`mat-${key}`, this.scene);
      mat.diffuseColor = key === 'soldier' ? new Color3(0.8, 0.2, 0.2) : new Color3(0.4, 0.6, 0.8);
      fallback.material = mat;
      this.templateMeshes.set(key, fallback);
    }
  }

  private getTemplateKey(kind: UnitKind): string {
    switch (kind) {
      case UnitKind.Swordsman: return 'soldier';
      case UnitKind.Bowman: return 'archer';
      case UnitKind.Worker:
      case UnitKind.Settler:
      case UnitKind.Pioneer:
      default: return 'worker';
    }
  }

  /**
   * Sync visually with the logical UnitManager state.
   */
  update(units: Unit[], dt: number): void {
    const activeUnitIds = new Set<number>();

    for (const unit of units) {
      if (!unit.isAlive() && unit.dyingTimer === null) continue;
      
      activeUnitIds.add(unit.id);

      let visual = this.unitMeshes.get(unit.id);
      if (!visual) {
        const key = this.getTemplateKey(unit.kind);
        const template = this.templateMeshes.get(key);
        if (!template) continue; // Still loading

        const root = new TransformNode(`unit-root-${unit.id}`, this.scene);
        const mesh = template.clone(`unit-mesh-${unit.id}`) as Mesh;
        mesh.isVisible = true;
        mesh.parent = root;
        
        visual = { root, mesh };
        this.unitMeshes.set(unit.id, visual);

        if (this.onMeshCreated) {
          this.onMeshCreated(mesh);
        }
      }

      // Base Position
      visual.root.position.set(unit.x, 0, unit.y);

      // Rotation (facing target if moving)
      if (unit.state === UnitState.Moving && unit.targetX !== null && unit.targetY !== null) {
        const dx = unit.targetX - unit.x;
        const dy = unit.targetY - unit.y;
        if (dx !== 0 || dy !== 0) {
          const targetAngle = Math.atan2(dx, dy);
          // Interpolate rotation could be added here
          visual.root.rotation.y = targetAngle;
        }
      }

      // Procedural Animation States
      this.applyAnimation(visual.mesh, unit, dt);
    }

    // Cleanup dead/removed units
    for (const [id, visual] of this.unitMeshes) {
      if (!activeUnitIds.has(id)) {
        visual.mesh.dispose();
        visual.root.dispose();
        this.unitMeshes.delete(id);
      }
    }
  }

  private applyAnimation(mesh: Mesh, unit: Unit, _dt: number): void {
    const time = performance.now() / 1000;
    
    // Reset base transforms
    mesh.position.y = 0;
    mesh.rotation.x = 0;
    mesh.rotation.z = 0;

    if (unit.dyingTimer !== null) {
      // Death animation: Fall over
      const progress = 1.0 - (unit.dyingTimer / 1.0); // assuming dyingTimer starts at 1.0
      mesh.rotation.x = Math.PI / 2 * progress;
      mesh.position.y = -0.5 * progress;
      return;
    }

    switch (unit.state) {
      case UnitState.Idle:
        // Soft breathing
        mesh.scaling.y = 1.0 + Math.sin(time * 2) * 0.02;
        break;
      
      case UnitState.Moving:
        // Bobbing up and down while walking
        mesh.position.y = Math.abs(Math.sin(time * 15)) * 0.15;
        // Slight waddle tilt
        mesh.rotation.z = Math.sin(time * 7.5) * 0.1;
        break;
        
      case UnitState.Working:
      case UnitState.Fighting:
        // Aggressive forward stab/work motion
        mesh.position.y = Math.abs(Math.sin(time * 10)) * 0.1;
        mesh.rotation.x = Math.sin(time * 10) * 0.2;
        break;
    }
  }

  dispose(): void {
    for (const [_, visual] of this.unitMeshes) {
      visual.mesh.dispose();
      visual.root.dispose();
    }
    this.unitMeshes.clear();
    for (const [_, mesh] of this.templateMeshes) {
      mesh.dispose();
    }
    this.templateMeshes.clear();
  }
}
