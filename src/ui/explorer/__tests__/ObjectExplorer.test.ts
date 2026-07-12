/**
 * ObjectExplorer regression tests.
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
jest.mock('../../../game/Map', () => ({ Map: jest.fn() }));
jest.mock('../../../game/GameLoop', () => ({
  GameLoop: jest.fn(() => ({ state:{isPaused:true}, economy:{getCompleteBuildings:jest.fn(()=>[]),tryPlaceBuilding:jest.fn(()=>true)}, viewCuller:{setCenter:jest.fn()}, update:jest.fn(), hasSave:jest.fn(()=>false) })),
}));
jest.mock('../../../game/particles/ParticleSystem', () => ({ ParticleSystem: jest.fn(()=>({update:jest.fn(),dispose:jest.fn()})) }));
jest.mock('../../../input/TouchCameraController', () => ({ TouchCameraController: jest.fn(()=>({dispose:jest.fn()})) }));
jest.mock('../../../audio/SoundManager', () => ({ soundManager: { generateDefaults: jest.fn(), dispose: jest.fn() } }));
jest.mock('../../../core/CapabilityChecker', () => ({
  checkCapabilities: () => ({
    ok: true,
    errors: [],
    warnings: [],
    info: { webgl2: true, webgpu: false, webAudio: true, mobile: false, userAgent: 'node' },
  }),
}));
jest.mock('../../explorer/ObjectExplorer', () => ({ ObjectExplorer: jest.fn() }));

import { UIManager } from '../../UIManager';
import { GameLoop } from '../../../game/GameLoop';

describe('UIManager', () => {
  beforeEach(() => {
    const canvas = document.createElement('canvas'); canvas.id = 'renderCanvas'; document.body.appendChild(canvas);
    const overlay = document.createElement('div'); overlay.id = 'ui-overlay'; document.body.appendChild(overlay);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('creates without error', () => {
    const gl = new GameLoop({} as any);
    const ui = new UIManager(gl);
    expect(ui).toBeDefined();
  });
});
