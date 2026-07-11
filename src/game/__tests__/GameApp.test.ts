/**
 * S4WN Babylon.js/TypeScript - GameApp Tests
 * @jest-environment jsdom
 *
 * Tests for the Game Application initialization and lifecycle management
 */

// Mock Babylon.js before any imports to avoid constructor issues in node environment
jest.mock('@babylonjs/core', () => ({
  Engine: jest.fn(() => ({
    runRenderLoop: jest.fn(),
    getDeltaTime: jest.fn(() => 16),
    getRenderingCanvas: jest.fn(() => document.createElement('canvas')),
    dispose: jest.fn(),
  })),
  Scene: jest.fn(() => ({
    render: jest.fn(),
    meshes: [],
    getEngine: jest.fn(),
    clearColor: { set: jest.fn() },
    activeCamera: null,
  })),
  ArcRotateCamera: jest.fn(),
  Vector3: { Zero: () => ({ x: 0, y: 0, z: 0 }) },
  Color4: jest.fn(),
  MeshBuilder: {
    CreateGround: jest.fn(() => ({ position: { set: jest.fn() }, material: null, receiveShadows: false, getTotalVertices: jest.fn(() => 4), dispose: jest.fn() })),
  },
  StandardMaterial: jest.fn(() => ({ dispose: jest.fn() })),
  Color3: { Black: jest.fn(() => ({})), White: jest.fn(() => ({})), FromHexString: jest.fn(() => ({})), Random: jest.fn(() => ({})) },
  Texture: jest.fn(),
  Mesh: {
    CAPACITY: 0,
  },
}));

jest.mock('@babylonjs/loaders', () => ({
  SceneLoader: {
    ImportMeshAsync: jest.fn(() => Promise.resolve({ meshes: [{ dispose: jest.fn(), receiveShadows: false }] })),
  },
}));

jest.mock('../../audio/SoundManager', () => ({
  soundManager: {
    generateDefaults: jest.fn(),
    dispose: jest.fn(),
  },
}));

jest.mock('../../rendering/TerrainRenderer', () => ({
  TerrainRenderer: jest.fn(() => ({
    createGround: jest.fn(),
    loadTerrainTextures: jest.fn(),
    getMesh: jest.fn(() => null),
  })),
}));

jest.mock('../../rendering/BuildingMesh', () => ({
  BuildingMesh: jest.fn(() => ({
    createBuilding: jest.fn(() => Promise.resolve({ dispose: jest.fn() })),
  })),
}));

jest.mock('../../ui/UIManager', () => ({
  UIManager: jest.fn(),
}));

jest.mock('../../rendering/pipelines/ShadowPipeline', () => ({
  ShadowPipeline: jest.fn(() => ({
    init: jest.fn(),
    addShadowCaster: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('../../game/particles/ParticleSystem', () => ({
  ParticleSystem: jest.fn(() => ({
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock('../../ui/HUD', () => ({
  HUD: jest.fn(),
}));

jest.mock('../../ui/panels/DebugPanel', () => ({
  DebugPanel: jest.fn(),
}));

jest.mock('../../input/TouchCameraController', () => ({
  TouchCameraController: jest.fn(() => ({
    dispose: jest.fn(),
  })),
}));

jest.mock('../../game/GameLoop', () => ({
  GameLoop: jest.fn(() => ({
    state: { isPaused: true },
    economy: { tryPlaceBuilding: jest.fn(() => true) },
    viewCuller: { setCenter: jest.fn() },
    update: jest.fn(),
  })),
}));

jest.mock('../../game/Map', () => ({
  Map: jest.fn(() => ({
    width: 100,
    height: 100,
    tiles: Array.from({ length: 100 }, () =>
      Array.from({ length: 100 }, () => ({
        terrain: 'Grass',
        elevation: 0,
        resource: null,
        visibility: 0,
        territory: 0,
      }))
    ),
    setAllVisible: jest.fn(),
  })),
  Terrain: { Grass: 'Grass', Water: 'Water', DeepWater: 'DeepWater' },
}));

import { GameApp } from '../../GameApp';

describe('GameApp Initialization', () => {
  beforeEach(() => {
    const canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should initialize the Babylon.js engine and scene on startup', () => {
    const app = new GameApp('renderCanvas');
    expect(app.engine).toBeDefined();
    expect(app.scene).toBeDefined();
    expect(app.map).toBeDefined();
    expect(app.gameLoop).toBeDefined();
    app.dispose();
  });

  it('should throw an error if the canvas element is not found', () => {
    expect(() => {
      new GameApp('non-existent-canvas');
    }).toThrow('Canvas element with id non-existent-canvas not found');
  });
});
