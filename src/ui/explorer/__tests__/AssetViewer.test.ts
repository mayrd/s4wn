/**
 * AssetViewer unit tests — dedicated Babylon.js 3D preview canvas for the
 * Object Explorer. Loads a model via SceneLoader, shows textures, and
 * plays animations through a separate Babylon Engine/scene.
 *
 * @jest-environment jsdom
 */

jest.mock('@babylonjs/core', () => {
  const createMesh = (name = 'mesh') => ({
    name,
    position: { x: 0, y: 0, z: 0 },
    dispose: jest.fn(),
    material: null,
    getBoundingInfo: jest.fn(() => ({
      boundingBox: {
        minimumWorld: { x: -1, y: 0, z: -1 },
        maximumWorld: { x: 1, y: 2, z: 1 },
      },
    })),
  });
  return {
    Engine: jest.fn(() => ({
      runRenderLoop: jest.fn((cb: () => void) => { cb && cb(); }),
      stopRenderLoop: jest.fn(),
      dispose: jest.fn(),
    })),
    Scene: jest.fn(() => ({
      render: jest.fn(),
      dispose: jest.fn(),
      clearColor: { r: 0.12, g: 0.12, b: 0.14, a: 1 },
    })),
    ArcRotateCamera: jest.fn(() => ({
      target: { x: 0, y: 0, z: 0 },
      radius: 6,
      minZ: 0.1,
      maxZ: 1000,
      attachControl: jest.fn(),
    })),
    Vector3: Object.assign(
      function (x?: number, y?: number, z?: number) { return { x: x ?? 0, y: y ?? 0, z: z ?? 0 }; },
      { Zero: () => ({ x: 0, y: 0, z: 0 }) }
    ),
    Color3: Object.assign(
      function (r?: number, g?: number, b?: number) { return { r: r ?? 0, g: g ?? 0, b: b ?? 0 }; },
      { Black: () => ({ r: 0, g: 0, b: 0 }), White: () => ({ r: 1, g: 1, b: 1 }) }
    ),
    Color4: jest.fn(() => ({ r: 0.12, g: 0.12, b: 0.14, a: 1 })),
    HemisphericLight: jest.fn(() => ({ intensity: 0.9, dispose: jest.fn() })),
    SceneLoader: {
      ImportMeshAsync: jest.fn(() =>
        Promise.resolve({ meshes: [createMesh('castle')], animationGroups: [] })
      ),
    },
    StandardMaterial: jest.fn(() => ({ diffuseTexture: null, dispose: jest.fn() })),
    Texture: jest.fn(() => ({
      dispose: jest.fn(),
      onLoadObservable: { addOnce: jest.fn((cb: (t: any) => void) => cb({})) },
    })),
    AnimationGroup: jest.fn(() => ({
      play: jest.fn(),
      stop: jest.fn(),
      dispose: jest.fn(),
      name: 'anim',
    })),
    AbstractMesh: createMesh,
    Mesh: createMesh,
  };
});

jest.mock('@babylonjs/loaders', () => ({
  SceneLoader: {
    ImportMeshAsync: jest.fn(() => Promise.resolve({ meshes: [], animationGroups: [] })),
  },
}));

import { SceneLoader } from '@babylonjs/core';
import { AssetViewer, isLoadableAssetPath, splitAssetPath } from '../AssetViewer';

/** Reference to the Engine created by the most recent AssetViewer instance. */
function currentEngine(): any {
  const Engine = require('@babylonjs/core').Engine;
  const results = Engine.mock.results;
  return results[results.length - 1].value;
}

describe('AssetViewer', () => {
  let viewer: AssetViewer;

  beforeEach(() => {
    document.body.innerHTML = '';
    (SceneLoader.ImportMeshAsync as jest.Mock).mockClear();
    viewer = new AssetViewer();
  });

  afterEach(() => {
    viewer.dispose();
  });

  describe('helpers', () => {
    test('isLoadableAssetPath accepts real model file extensions', () => {
      expect(isLoadableAssetPath('assets/models/castle.glb')).toBe(true);
      expect(isLoadableAssetPath('/nations/romans/models/unit.obj')).toBe(true);
      expect(isLoadableAssetPath('assets/x.gltf')).toBe(true);
      expect(isLoadableAssetPath('CreateGround 100×100')).toBe(false);
      expect(isLoadableAssetPath('CSS bg-image')).toBe(false);
      expect(isLoadableAssetPath(undefined)).toBe(false);
    });

    test('splitAssetPath splits rootUrl + filename at last slash', () => {
      expect(splitAssetPath('assets/models/castle.glb')).toEqual({
        rootUrl: 'assets/models/',
        filename: 'castle.glb',
      });
      expect(splitAssetPath('castle.glb')).toEqual({ rootUrl: '', filename: 'castle.glb' });
    });
  });

  describe('construction', () => {
    test('creates an overlay container in the DOM', () => {
      const el = document.querySelector('.asset-viewer');
      expect(el).not.toBeNull();
      expect(document.querySelector('.asset-viewer-canvas')).not.toBeNull();
      expect(document.querySelector('.asset-viewer-close')).not.toBeNull();
    });

    test('isOpen is false initially', () => {
      expect(viewer.isOpen).toBe(false);
      expect(viewer.meshCount).toBe(0);
      expect(viewer.animationCount).toBe(0);
    });
  });

  describe('open', () => {
    test('loads a loadable model via SceneLoader with split path', async () => {
      await viewer.open({ mesh: 'assets/models/castle.glb' });
      expect(SceneLoader.ImportMeshAsync).toHaveBeenCalledWith(
        'assets/models/', '', 'castle.glb', expect.anything()
      );
      expect(viewer.isOpen).toBe(true);
      expect(viewer.meshCount).toBe(1);
      expect(viewer.animationCount).toBe(0);
    });

    test('does not call SceneLoader when no loadable mesh path is given', async () => {
      (SceneLoader.ImportMeshAsync as jest.Mock).mockClear();
      await viewer.open({ mesh: 'CSS bg-image', texture: 'CSS opacity', animation: 'fade' });
      expect(SceneLoader.ImportMeshAsync).not.toHaveBeenCalled();
      expect(viewer.isOpen).toBe(true);
      expect(viewer.meshCount).toBe(0);
      const status = document.querySelector('.asset-viewer-status');
      expect(status?.textContent).toContain('No loadable 3D model');
    });

    test('plays animation groups when loaded', async () => {
      const animGroup = { play: jest.fn(), stop: jest.fn(), dispose: jest.fn(), name: 'walk' };
      (SceneLoader.ImportMeshAsync as jest.Mock).mockResolvedValueOnce({
        meshes: [{ dispose: jest.fn(), material: null, getBoundingInfo: jest.fn(() => ({ boundingBox: { minimumWorld: { x: 0, y: 0, z: 0 }, maximumWorld: { x: 1, y: 1, z: 1 } } })) }],
        animationGroups: [animGroup],
      });
      await viewer.open({ mesh: 'assets/models/npc.glb' });
      expect(viewer.animationCount).toBe(1);
      expect(animGroup.play).toHaveBeenCalled();
    });

    test('starts the render loop on successful mesh load', async () => {
      await viewer.open({ mesh: 'assets/models/castle.glb' });
      expect(currentEngine().runRenderLoop).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    test('closing hides overlay, clears contents and stops render loop', async () => {
      await viewer.open({ mesh: 'assets/models/castle.glb' });
      expect(viewer.isOpen).toBe(true);
      viewer.close();
      expect(viewer.isOpen).toBe(false);
      expect(viewer.meshCount).toBe(0);
      expect(currentEngine().stopRenderLoop).toHaveBeenCalled();
    });

    test('close button in DOM triggers viewer close', async () => {
      await viewer.open({ mesh: 'assets/models/castle.glb' });
      const closeBtn = document.querySelector('.asset-viewer-close') as HTMLButtonElement;
      closeBtn.click();
      expect(viewer.isOpen).toBe(false);
    });
  });

  describe('dispose', () => {
    test('dispose removes the container from the DOM and disposes scene', () => {
      viewer.dispose();
      expect(document.querySelector('.asset-viewer')).toBeNull();
      expect(currentEngine().dispose).toHaveBeenCalled();
    });

    test('open after dispose is a no-op', async () => {
      viewer.dispose();
      viewer.dispose = () => {};
      await viewer.open({ mesh: 'assets/models/castle.glb' });
      expect(SceneLoader.ImportMeshAsync).not.toHaveBeenCalled();
    });
  });
});