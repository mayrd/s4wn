/**
 * Minimal, Babylon-free helpers shared between the Object Explorer and its
 * dedicated 3D AssetViewer. Kept free of any engine import so that modules
 * importing these can load without a WebGL/Babylon context (e.g. tests).
 */

/** The subset of an asset's chain used to open it in the 3D viewer. */
export interface AssetChainInput {
  mesh?: string;
  texture?: string;
  animation?: string;
}

const MODEL_EXT = /\.(glb|gltf|obj|babylon|stl)(\?|#|$)/i;

/** True when a chain value points to a real, loadable model file. */
export function isLoadableAssetPath(value: string | undefined): value is string {
  return !!value && MODEL_EXT.test(value);
}

/** Split an asset path into the rootUrl + filename expected by SceneLoader. */
export function splitAssetPath(path: string): { rootUrl: string; filename: string } {
  const idx = path.lastIndexOf('/');
  if (idx === -1) return { rootUrl: '', filename: path };
  return { rootUrl: path.slice(0, idx + 1), filename: path.slice(idx + 1) };
}