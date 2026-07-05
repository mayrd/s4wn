/**
 * S4WN Babylon.js/TypeScript - GameApp Tests
 * 
 * Verifies that the engine and scene are properly initialized on startup.
 * 
 * @jest-environment jsdom
 */

import { GameApp } from '../../GameApp';

// Mock Babylon.js core and loaders to avoid ESM issues in Jest
jest.mock('@babylonjs/core', () => {
  const mockEngine = jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    getDeltaTime: jest.fn().mockReturnValue(16),
    runRenderLoop: jest.fn(),
  }));
  const mockScene = jest.fn().mockImplementation(() => ({
    render: jest.fn(),
    clearColor: {},
  }));
  const mockArcRotateCamera = jest.fn().mockImplementation(() => ({
    setTarget: jest.fn(),
    lowerRadiusLimit: 0,
    upperRadiusLimit: 0,
  }));
  
  return {
    Engine: mockEngine,
    Scene: mockScene,
    ArcRotateCamera: mockArcRotateCamera,
    Vector3: Object.assign(
      jest.fn().mockImplementation((x, y, z) => ({
        x, y, z,
        dimension: 3,
        rank: 1,
        _x: x, _y: y, _z: z,
      })),
      { Zero: jest.fn().mockReturnValue({ x: 0, y: 0, z: 0 }) }
    ),
    Color4: jest.fn().mockImplementation((r, g, b, a) => ({ r, g, b, a })),
    Color3: jest.fn().mockImplementation((r, g, b) => ({ r, g, b })),
    DirectionalLight: jest.fn().mockImplementation(() => ({
      position: { x: 0, y: 0, z: 0 },
      intensity: 0,
    })),
    HemisphericLight: jest.fn().mockImplementation(() => ({
      intensity: 0,
    })),
    Texture: jest.fn().mockImplementation(() => ({
      uScale: 0,
      vScale: 0,
      uOffset: 0,
      vOffset: 0,
    })),
    DynamicTexture: jest.fn().mockImplementation(() => ({
      setPixels: jest.fn(),
    })),
    MirrorTexture: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
  MeshBuilder: {
    CreateGroundFromHeightMap: jest.fn().mockReturnValue({
      position: { x: 0, y: 0, z: 0 },
      dispose: jest.fn(),
    }),
    CreateGround: jest.fn().mockReturnValue({
      position: { x: 0, y: 0, z: 0 },
      dispose: jest.fn(),
    }),
  },
    StandardMaterial: jest.fn().mockImplementation(() => ({
      dispose: jest.fn(),
    })),
  };
});

jest.mock('@babylonjs/loaders', () => {
  const mockSceneLoader = {
    ImportMeshAsync: jest.fn().mockResolvedValue({
      meshes: [{}],
    }),
  };
  return {
    __esModule: true,
    SceneLoader: mockSceneLoader,
    default: {
      SceneLoader: mockSceneLoader,
    },
  };
});

import { Engine, Scene } from '@babylonjs/core';

describe('GameApp Initialization', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Set up a mock canvas and UI overlay for Babylon.js Engine and UIManager
    canvas = document.createElement('canvas');
    canvas.id = 'renderCanvas';
    document.body.appendChild(canvas);

    const overlay = document.createElement('div');
    overlay.id = 'ui-overlay';
    document.body.appendChild(overlay);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should initialize the Babylon.js engine and scene on startup', () => {
    const app = new GameApp('renderCanvas');

    // Using toBeDefined since toBeInstanceOf can fail with mock constructors
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
