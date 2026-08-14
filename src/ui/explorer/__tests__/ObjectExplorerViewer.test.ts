/**
 * ObjectExplorer + AssetViewer integration tests.
 *
 * Verifies the "Open in 3D Viewer" button appears in the detail view for
 * assets with a real loadable model (and only when the viewer is enabled
 * in-game), and that clicking it opens the asset in the Babylon viewer.
 *
 * @jest-environment jsdom
 */

jest.mock('@babylonjs/core', () => ({
  MeshBuilder: { CreateGround: jest.fn(() => ({ dispose: jest.fn() })) },
  StandardMaterial: jest.fn(() => ({ dispose: jest.fn() })),
  DynamicTexture: jest.fn(),
  Texture: { BILINEAR_SAMPLINGMODE: 2, CLAMP_ADDRESSMODE: 0 },
  Color3: Object.assign(function(r?:number,g?:number,b?:number){return{r:r??0,g:g??0,b:b??0}},{Black:()=>({r:0,g:0,b:0}),White:()=>({r:1,g:1,b:1})}),
  Vector3: Object.assign(function(x?:number,y?:number,z?:number){return{x:x??0,y:y??0,z:z??0}},{Zero:()=>({x:0,y:0,z:0})}),
}));

jest.mock('../../../game/GameLoop', () => ({
  GameLoop: jest.fn(() => ({
    state: { isPaused: true },
    economy: {
      getResourceCounts: jest.fn(() => ({})),
      getBuildings: jest.fn(() => []),
      getUnits: jest.fn(() => []),
    },
    territoryManager: { borderPosts: { getCountByNation: jest.fn(() => null) } },
    unitManager: { units: [] },
    onTick: jest.fn(),
    update: jest.fn(),
  })),
}));

jest.mock('../../../game/NationRegistry', () => ({
  NationRegistry: {
    instance: { list: jest.fn(() => []), get: jest.fn(() => null) },
  },
}));

const viewerOpenMock = jest.fn(() => Promise.resolve());
jest.mock('../AssetViewer', () => {
  const isLoadableAssetPath = (v: string | undefined): v is string =>
    !!v && /\.(glb|gltf|obj|babylon|stl)(\?|#|$)/i.test(v);
  const splitAssetPath = (p: string) => {
    const i = p.lastIndexOf('/');
    return i === -1 ? { rootUrl: '', filename: p } : { rootUrl: p.slice(0, i + 1), filename: p.slice(i + 1) };
  };
  return {
    AssetViewer: jest.fn(() => ({
      open: viewerOpenMock,
      isOpen: false,
    })),
    isLoadableAssetPath,
    splitAssetPath,
  };
});
import { ObjectExplorer } from '../ObjectExplorer';
import { AssetViewer } from '../AssetViewer';

describe('ObjectExplorer 3D viewer integration', () => {
  const gl = {
    state: { isPaused: true },
    economy: {
      getResourceCounts: () => ({}),
      getBuildings: () => [],
      getUnits: () => [],
    },
    territoryManager: { borderPosts: { getCountByNation: () => null } },
    unitManager: { units: [] },
    onTick: () => {},
    update: () => {},
  } as any;

  const loadable = {
    id: 'nation-romans-building-castle',
    type: 'building',
    name: 'Castle',
    properties: {},
    _chain: { mesh: 'assets/models/castle.glb', texture: 'assets/terrain/grass.png', animation: 'idle' },
  } as any;

  const procedural = {
    id: 'd-water',
    type: 'deco',
    name: 'Water Plane',
    properties: {},
    _chain: { mesh: 'CreateGround 100×100', texture: 'Water normal', animation: 'UV scroll' },
  } as any;

  let explorer: ObjectExplorer;
  let explorerEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    const overlay = document.createElement('div');
    overlay.id = 'ui-overlay';
    document.body.appendChild(overlay);
    viewerOpenMock.mockClear();
    (AssetViewer as unknown as jest.Mock).mockClear();
    explorer = new ObjectExplorer();
    explorer.connectGame(gl);
    // show() renders the explorer panel into the DOM so we can inspect it.
    explorer.show();
    explorerEl = document.querySelector('.explorer-panel') as HTMLElement;
  });

  afterEach(() => {
    (explorer as any).dispose?.();
    document.body.innerHTML = '';
  });

  function detail(obj: any): HTMLElement {
    (explorer as any).showDetails(obj);
    return explorerEl.querySelector('.explorer-details') as HTMLElement;
  }

  test('viewer button is NOT shown for loadable models before connectViewer()', () => {
    const details = detail(loadable);
    expect(details.querySelector('[data-explorer-viewer]')).toBeNull();
  });

  test('connectViewer() creates the Babylon AssetViewer', async () => {
    (AssetViewer as unknown as jest.Mock).mockClear();
    await explorer.connectViewer();
    expect(AssetViewer).toHaveBeenCalledTimes(1);
  });

  test('viewer button appears for loadable models after connectViewer()', async () => {
    await explorer.connectViewer();
    const details = detail(loadable);
    expect(details.querySelector('[data-explorer-viewer]')).not.toBeNull();
  });

  test('viewer button is NOT shown for procedural (non-loadable) assets', async () => {
    await explorer.connectViewer();
    const details = detail(procedural);
    expect(details.querySelector('[data-explorer-viewer]')).toBeNull();
  });

  test('clicking the viewer button opens the asset in the viewer with its chain', async () => {
    await explorer.connectViewer();
    const details = detail(loadable);
    const btn = details.querySelector('[data-explorer-viewer]') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(viewerOpenMock).toHaveBeenCalledTimes(1);
    expect(viewerOpenMock).toHaveBeenCalledWith({
      mesh: 'assets/models/castle.glb',
      texture: 'assets/terrain/grass.png',
      animation: 'idle',
    });
  });
});