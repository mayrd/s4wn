/**
 * S4WN Babylon.js/TypeScript - Destruction Animator
 *
 * Manages destruction animation for buildings:
 * - Sinks mesh down when destructionTimer decreases
 * - Emits dust particles
 * - Plays collapse sounds
 */

import { TransformNode, Vector3 } from '@babylonjs/core';
import { BuildingData } from '../game/Economy';
import { ParticleSystem, ParticleEffectType } from '../game/particles/ParticleSystem';
import { soundManager } from '../audio/SoundManager';
interface DestructionEntry {
  building: BuildingData;
  meshNode: TransformNode | null;
  startY: number;
  soundPlayed: boolean;
  particlesPlayed: boolean;
}

export class DestructionAnimator {
  private particleSystem: ParticleSystem;
  private entries: Map<number, DestructionEntry> = new Map();

  constructor(_scene: any, particleSystem: ParticleSystem) {
    this.particleSystem = particleSystem;
  }

  /**
   * Update destruction visuals based on building.destructionTimer.
   */
  update(buildings: BuildingData[], buildingMeshes: Map<number, any>): void {
    const activeDestroyedIndices = new Set<number>();

    for (const building of buildings) {
      if (building.destructionTimer !== null) {
        activeDestroyedIndices.add(building.index);
        
        let entry = this.entries.get(building.index);
        if (!entry) {
          // Initialize destruction entry
          const meshNode = buildingMeshes.get(building.index);
          entry = {
            building,
            meshNode: meshNode || null,
            startY: meshNode ? meshNode.position.y : 0,
            soundPlayed: false,
            particlesPlayed: false,
          };
          this.entries.set(building.index, entry);
        }

        const progress = building.destructionProgress ?? 0;

        // Play sound once
        if (!entry.soundPlayed && progress > 0) {
          entry.soundPlayed = true;
          soundManager.play('destroy', 0.8);
        }

        // Spawn particles
        if (!entry.particlesPlayed && progress > 0.1) {
          entry.particlesPlayed = true;
          this.particleSystem.createEffect(
            ParticleEffectType.Dust, 
            new Vector3(building.x, 0.5, building.y), 
            `destruct-dust-${building.index}`
          );
          this.particleSystem.startEffect(`destruct-dust-${building.index}`);
        }

        // Sink building into ground
        if (entry.meshNode) {
          entry.meshNode.position.y = entry.startY - (progress * 2.0); // Sink up to 2 units
          
          // Slight random shaking
          const shake = (1 - progress) * 0.05;
          entry.meshNode.position.x = building.x + (Math.random() - 0.5) * shake;
          entry.meshNode.position.z = building.y + (Math.random() - 0.5) * shake;
        }
      }
    }

    // Cleanup finished destructions
    for (const [index, entry] of this.entries) {
      if (!activeDestroyedIndices.has(index)) {
        this.particleSystem.stopEffect(`destruct-dust-${index}`);
        if (entry.meshNode) {
          entry.meshNode.dispose();
        }
        buildingMeshes.delete(index);
        this.entries.delete(index);
      }
    }
  }

  dispose(): void {
    for (const [index] of this.entries) {
      this.particleSystem.stopEffect(`destruct-dust-${index}`);
    }
    this.entries.clear();
  }
}
