/**
 * S4WN Babylon.js/TypeScript - Combat Health Bar
 *
 * Renders floating health bars above units and buildings during combat.
 * Shows green -> yellow -> red based on HP percentage.
 * Disappears when unit/building is destroyed.
 */

import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';

/** Health bar data for tracking rendered bars */
interface HealthBarData {
  container: TransformNode;
  fill: any; // Mesh for the fill bar
  unitId?: number; // For units
  buildingIndex?: number; // For buildings
}

export class CombatHealthBar {
  private scene: Scene;
  private healthBars: Map<string, HealthBarData> = new Map();
  private barSize = { width: 2, height: 0.2 };

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Update health bars based on current combat state.
   * Creates/update/delete bars as needed.
   */
  update(units: Array<{ id: number; x: number; y: number; hp: number; getMaxHp(): number; isAlive(): boolean; state: number; attackTargetId: number | null }>,
         buildings: Array<{ index?: number; x: number; y: number; hp: number; maxHp: number; isComplete(): boolean }>): void {
    const activeBarKeys = new Set<string>();

    // Update/create health bars for units in combat
    for (const unit of units) {
      // Only show health bar if unit is alive AND (in combat state or being attacked)
      if (!unit.isAlive()) continue;
      
      const isInCombat = unit.attackTargetId !== null;
      
      if (isInCombat) {
        this.updateOrCreateUnitBar(unit);
        activeBarKeys.add(`unit-${unit.id}`);
      } else {
        // Remove health bar if unit is no longer in combat
        this.removeBar(`unit-${unit.id}`);
      }
    }

    // Update/create health bars for damaged buildings
    for (const building of buildings) {
      if (!building.isComplete()) continue;
      
      // Only show health bar if building has taken damage
      if (building.hp < building.maxHp) {
        this.updateOrCreateBuildingBar(building);
        activeBarKeys.add(`building-${building.index}`);
      } else {
        // Remove health bar if building is at full health
        this.removeBar(`building-${building.index}`);
      }
    }

    // Clean up bars that are no longer needed
    for (const key of this.healthBars.keys()) {
      if (!activeBarKeys.has(key)) {
        this.removeBar(key);
      }
    }
  }

  private updateOrCreateUnitBar(unit: { id: number; x: number; y: number; hp: number; getMaxHp(): number }): void {
    const key = `unit-${unit.id}`;
    let bar = this.healthBars.get(key);

    if (!bar) {
      bar = this.createHealthBar(unit.x, unit.y, 1.5);
      this.healthBars.set(key, bar);
    }

    this.updateBarPosition(bar, unit.x, unit.y, 1.5);
    this.updateBarFill(bar, unit.hp / unit.getMaxHp());
  }

  private updateOrCreateBuildingBar(building: { index?: number; x: number; y: number; hp: number; maxHp: number }): void {
    const key = `building-${building.index}`;
    let bar = this.healthBars.get(key);

    if (!bar) {
      bar = this.createHealthBar(building.x, building.y, 3.5);
      this.healthBars.set(key, bar);
    }

    this.updateBarPosition(bar, building.x, building.y, 3.5);
    this.updateBarFill(bar, building.hp / building.maxHp);
  }

  private createHealthBar(x: number, y: number, heightOffset: number): HealthBarData {
    const container = new TransformNode('healthbar-root', this.scene);
    container.position.set(x, heightOffset, y);

    // Background (dark outline)
    const background = MeshBuilder.CreatePlane('healthbar-bg', { 
      width: this.barSize.width, 
      height: this.barSize.height 
    }, this.scene);
    background.parent = container;
    background.position.y = 0.01; // Slightly above fill
    
    const bgMat = new StandardMaterial('healthbar-bg-mat', this.scene);
    bgMat.diffuseColor = new Color3(0.1, 0.1, 0.1);
    bgMat.emissiveColor = new Color3(0.1, 0.1, 0.1);
    background.material = bgMat;

    // Fill bar
    const fill = MeshBuilder.CreatePlane('healthbar-fill', { 
      width: this.barSize.width, 
      height: this.barSize.height 
    }, this.scene);
    fill.parent = container;
    fill.position.y = 0.02; // Slightly above background

    return { container, fill };
  }

  private updateBarPosition(bar: HealthBarData, x: number, y: number, heightOffset: number): void {
    bar.container.position.set(x, heightOffset, y);
  }

  private updateBarFill(bar: HealthBarData, hpRatio: number): void {
    // Scale the fill width based on HP ratio
    bar.fill.scaling.x = hpRatio;
    bar.fill.position.x = (hpRatio - 1) * 0.5; // Center the fill

    // Update color based on HP percentage: green -> yellow -> red
    const mat = new StandardMaterial('healthbar-fill-mat', this.scene);
    
    if (hpRatio > 0.5) {
      // Green (high health)
      mat.emissiveColor = new Color3(0.2, 0.8, 0.2);
      mat.diffuseColor = new Color3(0.2, 0.8, 0.2);
    } else if (hpRatio > 0.25) {
      // Yellow (medium health)
      mat.emissiveColor = new Color3(0.8, 0.8, 0.2);
      mat.diffuseColor = new Color3(0.8, 0.8, 0.2);
    } else {
      // Red (low health)
      mat.emissiveColor = new Color3(0.8, 0.2, 0.2);
      mat.diffuseColor = new Color3(0.8, 0.2, 0.2);
    }
    
    bar.fill.material = mat;
  }

  private removeBar(key: string): void {
    const bar = this.healthBars.get(key);
    if (bar) {
      bar.container.dispose();
      this.healthBars.delete(key);
    }
  }

  /** Clean up all health bars */
  dispose(): void {
    for (const bar of this.healthBars.values()) {
      bar.container.dispose();
    }
    this.healthBars.clear();
  }
}
