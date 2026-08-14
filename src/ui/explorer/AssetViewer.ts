/**
 * S4WN AssetViewer — dedicated Babylon.js 3D preview canvas for the
 * Object Explorer.
 *
 * Each asset in the explorer exposes an asset chain (mesh → texture →
 * animation). This viewer lets you *actually open* that asset: it spins up
 * its own Babylon `Engine`/`Scene` (a separate preview canvas, independent
 * of the live game), loads the model through Babylon's built-in asset
 * loading (`SceneLoader`), shows its texture, and plays its animation groups.
 *
 * It is only expected to run in-game (a WebGL-capable page); it is created
 * lazily and surfaces only when the explorer has been connected in-game.
 */

import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  Color4,
  SceneLoader,
  StandardMaterial,
  Texture,
  AbstractMesh,
  AnimationGroup,
} from '@babylonjs/core';

import type { AssetChainInput } from './assetPaths';
import { isLoadableAssetPath, splitAssetPath } from './assetPaths';
export { isLoadableAssetPath, splitAssetPath } from './assetPaths';
export type { AssetChainInput } from './assetPaths';

export class AssetViewer {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private light: HemisphericLight;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private statusEl: HTMLElement;

  private loadedMeshes: AbstractMesh[] = [];
  private animationGroups: AnimationGroup[] = [];
  private _isOpen = false;
  private _loopRunning = false;
  private disposed = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'asset-viewer';
    this.container.innerHTML = `
      <div class="asset-viewer-header">
        <span class="asset-viewer-title">🗂️ Asset Viewer</span>
        <button class="asset-viewer-close" title="Close">&times;</button>
      </div>
      <canvas class="asset-viewer-canvas"></canvas>
      <div class="asset-viewer-status">Idle</div>`;
    document.body.appendChild(this.container);

    this.canvas = this.container.querySelector('.asset-viewer-canvas') as HTMLCanvasElement;
    this.statusEl = this.container.querySelector('.asset-viewer-status') as HTMLElement;
    const closeBtn = this.container.querySelector('.asset-viewer-close');
    closeBtn?.addEventListener('click', () => this.close());

    // Own, independent preview engine + scene (separate canvas from the game).
    this.engine = new Engine(this.canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.14, 0.15, 0.17, 1);

    this.camera = new ArcRotateCamera(
      'asset-viewer-cam',
      Math.PI / 2.5,
      Math.PI / 3,
      6,
      Vector3.Zero(),
      this.scene
    );
    this.camera.minZ = 0.1;
    this.camera.maxZ = 2000;
    this.camera.attachControl(this.canvas, true);

    this.light = new HemisphericLight('asset-viewer-light', new Vector3(0.5, 1, 0.25), this.scene);
    this.light.intensity = 0.9;
  }

  /** Whether the viewer overlay is currently open. */
  get isOpen(): boolean {
    return this._isOpen;
  }

  /** Number of meshes currently loaded into the preview scene. */
  get meshCount(): number {
    return this.loadedMeshes.length;
  }

  /** Number of animation groups currently loaded/playing. */
  get animationCount(): number {
    return this.animationGroups.length;
  }
/**
   * Open the viewer and load the given asset's model, texture and animation.
   * Idempotent — safe to call multiple times (reloads the asset).
   */
  async open(chain: AssetChainInput): Promise<void> {
    if (this.disposed) return;
    if (!this._isOpen) {
      this.container.classList.add('open');
      this._isOpen = true;
    }

    const meshPath = isLoadableAssetPath(chain.mesh) ? chain.mesh : undefined;
    this.clearContents();
    this.setStatus(meshPath ? 'Loading…' : 'No loadable 3D model');

    if (!meshPath) return;

    const { rootUrl, filename } = splitAssetPath(meshPath);
    try {
      const result: any = await SceneLoader.ImportMeshAsync(rootUrl, '', filename, this.scene);
      this.loadedMeshes = result.meshes ?? [];
      this.animationGroups = result.animationGroups ?? [];

      this.fitCamera();

      if (isLoadableAssetPath(chain.texture) && this.loadedMeshes.length > 0) {
        await this.applyTexture(chain.texture as string);
      }

      this.playAnimations();
      this.startRenderLoop();

      const animLabel = this.animationGroups.length === 1 ? 'animation' : 'animations';
      this.setStatus(`Loaded ${this.loadedMeshes.length} mesh(es), ${this.animationGroups.length} ${animLabel}`);
    } catch (err) {
      this.setStatus(`Failed to load: ${String(err)}`);
    }
  }

  /** Hide the viewer overlay and free the currently loaded contents. */
  close(): void {
    if (!this._isOpen) return;
    this.container.classList.remove('open');
    this._isOpen = false;
    this.clearContents();
  }

  /** Dispose engine, scene and DOM. The viewer cannot be reused afterwards. */
  dispose(): void {
    if (this.disposed) return;
    this.close();
    this.scene.dispose();
    this.engine.dispose();
    this.container.remove();
    this.disposed = true;
  }

  private startRenderLoop(): void {
    if (this._loopRunning) return;
    this._loopRunning = true;
    this.engine.runRenderLoop(() => this.scene.render());
  }

  private stopRenderLoop(): void {
    if (!this._loopRunning) return;
    this._loopRunning = false;
    this.engine.stopRenderLoop();
  }

  private clearContents(): void {
    this.stopRenderLoop();
    for (const m of this.loadedMeshes) m.dispose();
    for (const g of this.animationGroups) {
      g.stop();
      g.dispose();
    }
    this.loadedMeshes = [];
    this.animationGroups = [];
  }

  private setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  private fitCamera(): void {
    this.camera.target = Vector3.Zero();
    if (this.loadedMeshes.length === 0) return;
    try {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const m of this.loadedMeshes) {
        const bb = m.getBoundingInfo().boundingBox;
        const min = bb.minimumWorld;
        const max = bb.maximumWorld;
        if (min.x < minX) minX = min.x;
        if (min.y < minY) minY = min.y;
        if (min.z < minZ) minZ = min.z;
        if (max.x > maxX) maxX = max.x;
        if (max.y > maxY) maxY = max.y;
        if (max.z > maxZ) maxZ = max.z;
      }
      const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
      this.camera.target = new Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
      this.camera.radius = extent * 1.8;
    } catch {
      this.camera.target = Vector3.Zero();
    }
  }

  private async applyTexture(url: string): Promise<void> {
    if (this.loadedMeshes.length === 0) return;
    const texture = await this.loadTexture(url);
    if (!texture) return; // failed — keep the model's native material
    const mat = new StandardMaterial('asset-viewer-tex', this.scene);
    mat.diffuseTexture = texture;
    for (const m of this.loadedMeshes) {
      if (!m.material) m.material = mat;
    }
  }

  /** Load a texture, resolving on load or safely giving up after a timeout. */
  private loadTexture(url: string): Promise<Texture | null> {
    return new Promise<Texture | null>((resolve) => {
      const texture = new Texture(url, this.scene);
      let settled = false;
      const finish = (t: Texture | null) => {
        if (settled) return;
        settled = true;
        resolve(t);
      };
      texture.onLoadObservable.addOnce(() => finish(texture));
      window.setTimeout(() => finish(null), 5000);
    });
  }

  private playAnimations(): void {
    for (const group of this.animationGroups) {
      group.play();
    }
  }
}