/**
 * S4WN Babylon.js/TypeScript - Asset Loading Manager
 *
 * Tracks loading progress for terrain textures, buildings, and other assets.
 * Provides progress callbacks so the UI can display loading status.
 */

export interface LoadProgress {
  phase: 'init' | 'textures' | 'buildings' | 'complete';
  message: string;
  percent: number; // 0-100
}

export type ProgressCallback = (progress: LoadProgress) => void;

export class AssetLoader {
  private static instance: AssetLoader | null = null;
  private callbacks: ProgressCallback[] = [];

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  subscribe(fn: ProgressCallback): void {
    this.callbacks.push(fn);
  }

  unsubscribe(fn: ProgressCallback): void {
    const idx = this.callbacks.indexOf(fn);
    if (idx >= 0) this.callbacks.splice(idx, 1);
  }

  private notify(progress: LoadProgress): void {
    for (const fn of this.callbacks) {
      try {
        fn(progress);
      } catch (e) {
        console.warn('Progress callback error:', e);
      }
    }
  }

  /**
   * Load terrain textures with progress reporting.
   * Returns when textures are ready to be applied to the terrain mesh.
   */
  async loadTerrainTextures(
    loadImage: (src: string) => Promise<HTMLImageElement>,
    textureNames: string[],
    onProgress?: (loaded: number, total: number) => void
  ): Promise<HTMLImageElement[]> {
    this.notify({ phase: 'textures', message: 'Loading terrain textures...', percent: 10 });
    
    const images: HTMLImageElement[] = [];
    const total = textureNames.length;
    
    for (let i = 0; i < textureNames.length; i++) {
      const name = textureNames[i];
      try {
        const img = await loadImage(`/textures/${name}.png`);
        images.push(img);
      } catch {
        // Use a 1×1 placeholder canvas as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#55aa55';
        ctx.fillRect(0, 0, 1, 1);
        const img = new Image();
        img.src = canvas.toDataURL();
        images.push(img);
      }
      onProgress?.(i + 1, total);
    }
    
    this.notify({ phase: 'textures', message: 'Terrain textures loaded', percent: 60 });
    return images;
  }
}