/**
 * S4WN ResourceItemRenderer — Visualizes physical resource items on the terrain.
 *
 * When buildings produce resources, the LogisticsManager spawns physical
 * ResourceItem entities on the map. This renderer creates small colored
 * box meshes at each item's position so players can see resources waiting
 * to be picked up by carriers.
 *
 * Items disappear when picked up (removed from LogisticsManager) and new
 * meshes appear when new items are spawned. The renderer syncs with the
 * LogisticsManager on each call to `sync()`.
 */

import {
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Scene,
} from '@babylonjs/core';
import { LogisticsManager, ResourceItem } from '../game/Logistics';
import { ResourceType, resourceName } from '../economy/types';
import { RESOURCE_COLORS } from './SupplyChainRenderer';

/** Height offset above terrain for resource item meshes. */
const ITEM_Y_OFFSET = 0.15;
/** Size of each resource item box (half-extent in Babylon units). */
const ITEM_HALF_SIZE = 0.12;

export class ResourceItemRenderer {
  private scene: Scene;
  private logistics: LogisticsManager;
  /** Map from ResourceItem id → rendered Mesh. */
  private itemMeshes: Map<number, Mesh> = new Map();
  private _visible: boolean = true;

  constructor(scene: Scene, logistics: LogisticsManager) {
    this.scene = scene;
    this.logistics = logistics;
  }

  get visible(): boolean {
    return this._visible;
  }

  set visible(v: boolean) {
    this._visible = v;
    for (const mesh of this.itemMeshes.values()) {
      mesh.isVisible = v;
    }
  }

  /**
   * Synchronize 3D meshes with the current state of the LogisticsManager.
   * - Spawns new meshes for items that don't have one yet
   * - Disposes meshes for items that have been removed
   *
   * Call this once per frame (or at desired sync rate) from the render loop.
   */
  sync(): void {
    const items = this.logistics.getItems();
    const currentIds = new Set<number>();

    // Create meshes for new items
    for (const item of items) {
      currentIds.add(item.id);
      if (!this.itemMeshes.has(item.id)) {
        this.createItemMesh(item);
      }
    }

    // Dispose meshes for removed items
    for (const [id, mesh] of this.itemMeshes) {
      if (!currentIds.has(id)) {
        mesh.dispose();
        this.itemMeshes.delete(id);
      }
    }

    // Update positions for all existing items (handles edge cases)
    for (const item of items) {
      const mesh = this.itemMeshes.get(item.id);
      if (mesh) {
        mesh.position.x = item.x + 0.5;
        mesh.position.z = item.y + 0.5;
        mesh.position.y = ITEM_Y_OFFSET;
      }
    }
  }

  /** Create a single colored box mesh for a resource item. */
  private createItemMesh(item: ResourceItem): void {
    const color = RESOURCE_COLORS[item.type] || [0.5, 0.5, 0.5];
    const resName = resourceName(item.type as ResourceType) || `resource_${item.type}`;
    const name = `item_${resName}_${item.id}`;

    const box = MeshBuilder.CreateBox(name, { size: ITEM_HALF_SIZE * 2 }, this.scene);

    const mat = new StandardMaterial(`${name}_mat`, this.scene);
    mat.diffuseColor = new Color3(color[0], color[1], color[2]);
    mat.emissiveColor = new Color3(color[0] * 0.3, color[1] * 0.3, color[2] * 0.3);
    mat.specularColor = Color3.Black();
    box.material = mat;

    box.position.x = item.x + 0.5;
    box.position.z = item.y + 0.5;
    box.position.y = ITEM_Y_OFFSET;
    box.isVisible = this._visible;
    box.isPickable = false;

    // Slight random rotation so items don't all look identical
    box.rotation.y = ((item.id * 137.5) % 360) * (Math.PI / 180);

    this.itemMeshes.set(item.id, box);
  }

  /** Number of currently rendered items. */
  get itemCount(): number {
    return this.itemMeshes.size;
  }

  /** Remove all meshes and release GPU resources. */
  dispose(): void {
    for (const mesh of this.itemMeshes.values()) {
      if (mesh.material) {
        (mesh.material as StandardMaterial).dispose();
      }
      mesh.dispose();
    }
    this.itemMeshes.clear();
  }
}
