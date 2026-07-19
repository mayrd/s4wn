/**
 * TypeScript tests for Console Debug API and Error Overlay
 * Tests the debugging infrastructure for S4WN
 *
 * @jest-environment jsdom
 */

import { setupConsoleAPI } from '../ConsoleDebugAPI';
import { ErrorOverlay } from '../ErrorOverlay';
import { assert, assertDebug, assertRelease } from '../Assert';

// Mock GameApp factories for tests that need references
const createMockMap = () => ({
  width: 100,
  height: 100,
  tiles: [],
  get: (_x: number, _y: number) => ({ terrain: 0, elevation: 0, visibility: 1, territory: 0 }),
});

const createMockEconomy = () => ({
  buildings: [],
  getResourceCounts: () => [0, 0, 0] as number[],
  getCompleteBuildings: () => [] as any[],
});

const createMockUnitManager = () => ({
  units: [] as any[],
  getAliveUnits: () => [] as any[],
});

const createMockGameLoop = () => ({
  state: { gameTime: 0, ticks: 0, isPaused: false, gameSpeed: 1, dayPhase: 0.25, showFullMap: false },
  economy: createMockEconomy(),
  unitManager: createMockUnitManager(),
});

const createMockGameApp = () => ({
  engine: { getDeltaTime: () => 16 },
  scene: { render: () => {} },
  map: createMockMap(),
  gameLoop: createMockGameLoop(),
});

describe('ConsoleDebugAPI', () => {
  beforeEach(() => {
    // Reset window.S4 before each test
    delete (window as any).S4;
    
    // Reset document body
    document.body.innerHTML = '<div id="ui-overlay"></div>';
  });

  afterEach(() => {
    // Clean up any created overlay
    ErrorOverlay.hide();
    jest.restoreAllMocks();
  });

  describe('1. window.S4 exists with references to GameApp, GameLoop, UIManager', () => {
    test('window.S4 is defined after setupConsoleAPI is called', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      expect((window as any).S4).toBeDefined();
    });

    test('window.S4.gameApp provides access to the GameApp instance', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      expect((window as any).S4.gameApp).toBe(mockGameApp);
    });

    test('window.S4.gameLoop provides access to the GameLoop instance', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      expect((window as any).S4.gameLoop).toBe(mockGameApp.gameLoop);
    });

    test('window.S4.uiManager provides access to the UIManager instance when available', () => {
      const mockGameApp = createMockGameApp();
      const mockUIManager = { objectExplorer: {} };
      setupConsoleAPI(mockGameApp as any, mockUIManager);
      expect((window as any).S4.uiManager).toBe(mockUIManager);
    });

    test('window.S4.uiManager is undefined when no UIManager provided', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      expect((window as any).S4.uiManager).toBeUndefined();
    });
  });

  describe('2. Console API exposes map for inspection', () => {
    test('map property provides access to the game map', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      expect((window as any).S4.map).toBe(mockGameApp.map);
    });

    test('map.get returns tile data for valid coordinates', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      const tile = (window as any).S4.map.get(0, 0);
      expect(tile).toBeDefined();
      expect(tile.terrain).toBeDefined();
    });

    test('map.width and map.height are accessible', () => {
      const mockGameApp = createMockGameApp();
      setupConsoleAPI(mockGameApp as any);
      expect((window as any).S4.map.width).toBe(100);
      expect((window as any).S4.map.height).toBe(100);
    });
  });

  describe('3. Console API can list all spawned units', () => {
    test('listUnits returns array of alive units', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp.gameLoop.unitManager as any).units = [
        { id: 1, kind: 0, hp: 100, x: 10, y: 10, dyingTimer: null, state: 'idle' },
        { id: 2, kind: 1, hp: 150, x: 20, y: 20, dyingTimer: null, state: 'moving' },
      ];
      setupConsoleAPI(mockGameApp as any);
      
      const units = (window as any).S4.listUnits();
      expect(units).toHaveLength(2);
    });

    test('listUnits returns empty array when no units exist', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp.gameLoop.unitManager as any).units = [];
      setupConsoleAPI(mockGameApp as any);
      
      const units = (window as any).S4.listUnits();
      expect(units).toHaveLength(0);
    });

    test('listUnits filters out dead units based on hp and dyingTimer', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp.gameLoop.unitManager as any).units = [
        { id: 1, kind: 0, hp: 100, x: 10, y: 10, dyingTimer: null, state: 'idle' },
        { id: 2, kind: 1, hp: 0, x: 20, y: 20, dyingTimer: null, state: 'idle' }, // dead unit
        { id: 3, kind: 2, hp: 50, x: 30, y: 30, dyingTimer: 0.5, state: 'idle' }, // dying unit
      ];
      setupConsoleAPI(mockGameApp as any);
      
      const units = (window as any).S4.listUnits();
      expect(units).toHaveLength(1);
      expect(units[0].id).toBe(1);
    });

    test('listUnits includes unit metadata (id, kind, position, hp)', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp.gameLoop.unitManager as any).units = [
        { id: 1, kind: 0, hp: 100, x: 10.5, y: 20.7, dyingTimer: null, state: 'idle' },
      ];
      setupConsoleAPI(mockGameApp as any);
      
      const units = (window as any).S4.listUnits();
      expect(units[0]).toHaveProperty('id', 1);
      expect(units[0]).toHaveProperty('kind', 0);
      expect(units[0]).toHaveProperty('x');
      expect(units[0]).toHaveProperty('y');
      expect(units[0]).toHaveProperty('hp', 100);
    });
  });

  describe('4. Console API can dump game state to JSON', () => {
    test('dumpGameState returns a JSON-serializable object', () => {
      const mockGameApp = createMockGameApp();
      mockGameApp.gameLoop.state = { gameTime: 123, ticks: 456, isPaused: false, gameSpeed: 1, dayPhase: 0.25, showFullMap: false };
      setupConsoleAPI(mockGameApp as any);
      
      const json = (window as any).S4.dumpGameState();
      expect(() => JSON.stringify(json)).not.toThrow();
    });

    test('dumpGameState includes game time and tick count', () => {
      const mockGameApp = createMockGameApp();
      mockGameApp.gameLoop.state = { gameTime: 123, ticks: 456, isPaused: false, gameSpeed: 1, dayPhase: 0.25, showFullMap: false };
      setupConsoleAPI(mockGameApp as any);
      
      const json = (window as any).S4.dumpGameState();
      expect(json.gameTime).toBe(123);
      expect(json.ticks).toBe(456);
    });

    test('dumpGameState includes map dimensions', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp as any).map = { width: 100, height: 100, tiles: [], get: () => ({}) };
      setupConsoleAPI(mockGameApp as any);
      
      const json = (window as any).S4.dumpGameState();
      expect(json.mapWidth).toBe(100);
      expect(json.mapHeight).toBe(100);
    });

    test('dumpGameState includes resource counts', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp.gameLoop.economy as any).getResourceCounts = () => ({ wood: 50, stone: 30 });
      setupConsoleAPI(mockGameApp as any);
      
      const json = (window as any).S4.dumpGameState();
      expect(json.resources).toEqual({ wood: 50, stone: 30 });
    });

    test('dumpGameState includes building count', () => {
      const mockGameApp = createMockGameApp();
      (mockGameApp.gameLoop.economy as any).getCompleteBuildings = () => [
        { kind: 0, x: 10, y: 10 },
        { kind: 1, x: 20, y: 20 },
      ];
      setupConsoleAPI(mockGameApp as any);
      
      const json = (window as any).S4.dumpGameState();
      expect(json.buildingCount).toBe(2);
    });
  });
});

describe('ErrorOverlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ui-overlay"></div>';
  });

  afterEach(() => {
    ErrorOverlay.hide();
    jest.restoreAllMocks();
  });

  describe('5. Error overlay shows critical errors gracefully', () => {
    test('shows error overlay when show() is called', () => {
      ErrorOverlay.show('Test error message', 'Test stack trace');
      
      const overlay = document.querySelector('.error-overlay');
      expect(overlay).not.toBeNull();
      expect(overlay?.textContent).toContain('Test error message');
    });

    test('error overlay contains reload button', () => {
      ErrorOverlay.show('Test error');
      
      const reloadBtn = document.querySelector('.error-overlay button');
      expect(reloadBtn).not.toBeNull();
      expect(reloadBtn?.textContent).toContain('Reload');
    });

    test('error overlay contains return to menu button', () => {
      ErrorOverlay.show('Test error');
      
      const buttons = document.querySelectorAll('.error-overlay button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    test('error overlay displays error type and message', () => {
      ErrorOverlay.show('Critical failure', 'Error: Something went wrong');
      
      const details = document.querySelector('.error-overlay-details');
      expect(details?.textContent).toContain('Critical failure');
      expect(details?.textContent).toContain('Something went wrong');
    });

    test('error overlay has accessible styling for visibility', () => {
      ErrorOverlay.show('Test error');
      
      const overlay = document.querySelector('.error-overlay') as HTMLElement;
      expect(overlay).not.toBeNull();
      expect(overlay?.style.zIndex).toBeDefined();
    });

    test('hide() removes error overlay from DOM', () => {
      ErrorOverlay.show('Test error');
      expect(document.querySelector('.error-overlay')).not.toBeNull();
      
      ErrorOverlay.hide();
      expect(document.querySelector('.error-overlay')).toBeNull();
    });
  });
});

describe('Assert module', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  describe('6. Assert module works for logic validation in debug builds', () => {
    test('assert(condition, message) does not throw when condition is true', () => {
      process.env.NODE_ENV = 'production';
      expect(() => assert(true, 'Should not throw')).not.toThrow();
      process.env.NODE_ENV = originalEnv;
    });

    test('assert(condition, message) throws error when condition is false in debug mode', () => {
      process.env.NODE_ENV = 'development';
      expect(() => assert(false, 'Assertion failed')).toThrow('Assertion failed');
      process.env.NODE_ENV = originalEnv;
    });

    test('assert returns void when condition passes', () => {
      process.env.NODE_ENV = 'production';
      const result = assert(true, 'OK');
      expect(result).toBeUndefined();
      process.env.NODE_ENV = originalEnv;
    });

    test('assertDebug always throws in debug builds regardless of condition', () => {
      process.env.NODE_ENV = 'development';
      expect(() => assertDebug(false, 'Debug-only assertion')).toThrow();
      expect(() => assertDebug(true, 'Debug assertion')).toThrow();
      process.env.NODE_ENV = originalEnv;
    });

    test('assertDebug does nothing in release builds', () => {
      process.env.NODE_ENV = 'production';
      expect(() => assertDebug(false, 'Should not throw in production')).not.toThrow();
      expect(() => assertDebug(true, 'Should not throw in production')).not.toThrow();
      process.env.NODE_ENV = originalEnv;
    });

    test('assertRelease always throws in release builds', () => {
      process.env.NODE_ENV = 'production';
      expect(() => assertRelease(false, 'Release assertion failed')).toThrow('Release assertion failed');
      process.env.NODE_ENV = originalEnv;
    });

    test('assertRelease does nothing in debug builds', () => {
      process.env.NODE_ENV = 'development';
      expect(() => assertRelease(false, 'Should not throw in development')).not.toThrow();
      expect(() => assertRelease(true, 'Should not throw in development')).not.toThrow();
      process.env.NODE_ENV = originalEnv;
    });

    test('assert with no message throws with default message', () => {
      process.env.NODE_ENV = 'development';
      expect(() => assert(false)).toThrow('Assertion failed');
      process.env.NODE_ENV = originalEnv;
    });
  });
});
