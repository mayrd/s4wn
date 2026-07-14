/**
 * S4WN - BuildingPlacement UI Tests
 * Tests for the building palette panel and placement logic.
 *
 * @jest-environment jsdom
 */

import { BuildingPlacement } from '../BuildingPlacement';
import { BuildingType, VALID_BUILDING_DISCRIMINANTS } from '../../economy/types';
import { ResourceType } from '../../economy/types';
import { Map as GameMap, Terrain } from '../../game/Map';
import { Economy } from '../../game/Economy';

// Polyfill PointerEvent for jsdom (not natively available in the test environment)
// Use MouseEventInit + offsetX/offsetY since PointerEventInit is too strict for jsdom.
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type: string, opts?: Record<string, any>) {
      super(type, opts);
      // offsetX/offsetY are read-only getters on MouseEvent in jsdom.
      // Override them via Object.defineProperty.
      if (opts?.offsetX !== undefined) {
        Object.defineProperty(this, 'offsetX', { value: opts.offsetX, configurable: true });
      }
      if (opts?.offsetY !== undefined) {
        Object.defineProperty(this, 'offsetY', { value: opts.offsetY, configurable: true });
      }
    }
  };
}

// Mock Babylon.js Scene for picking tests
class MockScene {
  pick(_x: number, _y: number): { hit: boolean; pickedPoint: { x: number; y: number; z: number } | null } | null {
    // By default return a hit at tile (30, 40)
    return { hit: true, pickedPoint: { x: 30.5, y: 0, z: 40.5 } };
  }
}

function createMockOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'ui-overlay';
  document.body.appendChild(overlay);
  return overlay;
}

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = 'render-canvas';
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);
  return canvas;
}

describe('BuildingPlacement', () => {
  let canvas: HTMLCanvasElement;
  let map: GameMap;
  let economy: Economy;

  beforeEach(() => {
    document.body.innerHTML = '';
    void createMockOverlay();
    canvas = createMockCanvas();
    map = new GameMap(100, 100, 'demo');
    economy = new Economy();
    economy.addResource(ResourceType.Wood, 200);
    economy.addResource(ResourceType.Stone, 200);
    for (let dx = -5; dx <= 5; dx++) {
      for (let dy = -5; dy <= 5; dy++) {
        const tile = map.get(50 + dx, 50 + dy);
        if (tile) tile.territory = 1;
      }
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('constructor and DOM', () => {
    it('should create the building palette panel in the UI overlay', () => {
      void new BuildingPlacement(economy, map, 1, canvas);
      const panel = document.getElementById('building-palette');
      expect(panel).not.toBeNull();
      expect(panel!.classList.contains('building-palette-panel')).toBe(true);
    });

    it('should start hidden', () => {
      void new BuildingPlacement(economy, map, 1, canvas);
      const panel = document.getElementById('building-palette');
      expect(panel!.classList.contains('hidden')).toBe(true);
    });

    it('should have a toggle button in the HUD area', () => {
      void new BuildingPlacement(economy, map, 1, canvas);
      const btn = document.getElementById('btn-building-palette');
      expect(btn).not.toBeNull();
    });
  });

  describe('toggle', () => {
    it('should show panel when toggled on', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();
      const panel = document.getElementById('building-palette');
      expect(panel!.classList.contains('hidden')).toBe(false);
    });

    it('should hide panel when toggled off', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle(); // show
      bp.toggle(); // hide
      const panel = document.getElementById('building-palette');
      expect(panel!.classList.contains('hidden')).toBe(true);
    });

    it('should return current visibility state', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      expect(bp.isVisible()).toBe(false);
      bp.toggle();
      expect(bp.isVisible()).toBe(true);
    });
  });

  describe('building categories', () => {
    it('should display category tabs (Basic Economy, Food, Mining, etc.)', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();
      const tabs = document.querySelectorAll('.bp-category-tab');
      expect(tabs.length).toBeGreaterThanOrEqual(4);
    });

    it('should show building buttons with cost labels', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();
      const buildingBtns = document.querySelectorAll('.bp-building-btn');
      expect(buildingBtns.length).toBeGreaterThan(0);
      const costLabels = document.querySelectorAll('.bp-cost');
      expect(costLabels.length).toBeGreaterThan(0);
    });
  });

  describe('building selection', () => {
    it('should set selected building when clicked', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();

      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      if (btn) {
        btn.click();
        expect(bp.getSelectedBuilding()).not.toBeNull();
      }
    });

    it('should highlight selected building button', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();

      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      if (btn) {
        btn.click();
        const selectedBtn = document.querySelector('.bp-building-btn.selected');
        expect(selectedBtn).not.toBeNull();
      }
    });

    it('should deselect when same building clicked again', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();

      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      if (btn) {
        btn.click();
        btn.click();
        expect(bp.getSelectedBuilding()).toBeNull();
      }
    });
  });

  describe('canAffordBuilding', () => {
    it('should return true for affordable buildings', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      expect(bp.canAffordBuilding(BuildingType.Farm)).toBe(true);
    });

    it('should return false for unaffordable buildings', () => {
      const poorEconomy = new Economy();
      poorEconomy.resources.fill(0);
      const bp = new BuildingPlacement(poorEconomy, map, 1, canvas);
      expect(bp.canAffordBuilding(BuildingType.Castle)).toBe(false);
    });
  });

  describe('getAllPlaceableBuildings', () => {
    it('should return only valid building discriminants', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      const buildings = bp.getAllPlaceableBuildings();
      for (const b of buildings) {
        expect(VALID_BUILDING_DISCRIMINANTS.includes(b)).toBe(true);
      }
    });

    it('should include core buildings like Farm, Sawmill, Woodcutter', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      const buildings = bp.getAllPlaceableBuildings();
      expect(buildings.includes(BuildingType.Farm)).toBe(true);
      expect(buildings.includes(BuildingType.Sawmill)).toBe(true);
      expect(buildings.includes(BuildingType.Woodcutter)).toBe(true);
    });
  });

  describe('ghost preview', () => {
    it('should start with ghost at (-1, -1) and inactive', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      expect(bp.ghostX).toBe(-1);
      expect(bp.ghostY).toBe(-1);
      expect(bp.isGhostActive).toBe(false);
    });

    it('should track ghost position from pointer move when scene is provided', () => {
      const scene = new MockScene() as any;
      const bp = new BuildingPlacement(economy, map, 1, canvas, scene);

      // Select a building first to activate ghost mode
      bp.toggle();
      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      expect(btn).not.toBeNull();
      btn.click();

      // Simulate pointer move with mock scene
      const pointerEvent = new (PointerEvent as any)('pointermove', { offsetX: 400, offsetY: 300 });
      canvas.dispatchEvent(pointerEvent);

      expect(bp.ghostX).toBe(31); // 30.5 rounded
      expect(bp.ghostY).toBe(41); // 40.5 rounded
      expect(bp.isGhostActive).toBe(true);
    });

    it('should reset ghost position when deselected', () => {
      const scene = new MockScene() as any;
      const bp = new BuildingPlacement(economy, map, 1, canvas, scene);

      bp.toggle();
      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      expect(btn).not.toBeNull();
      btn.click(); // select
      btn.click(); // deselect

      expect(bp.getSelectedBuilding()).toBeNull();
      expect(bp.ghostX).toBe(-1);
      expect(bp.ghostY).toBe(-1);
      expect(bp.isGhostActive).toBe(false);
    });

    it('should reset ghost position when palette is closed', () => {
      const scene = new MockScene() as any;
      const bp = new BuildingPlacement(economy, map, 1, canvas, scene);

      bp.toggle();
      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      expect(btn).not.toBeNull();
      btn.click(); // select

      // Move pointer to set ghost
      const pointerEvent = new (PointerEvent as any)('pointermove', { offsetX: 400, offsetY: 300 });
      canvas.dispatchEvent(pointerEvent);
      expect(bp.ghostX).toBeGreaterThanOrEqual(0);

      // Toggle palette off
      bp.toggle();
      expect(bp.ghostX).toBe(-1);
      expect(bp.ghostY).toBe(-1);
      expect(bp.isGhostActive).toBe(false);
    });
  });

  describe('scene picking placement', () => {
    it('should place building at picked tile when scene is provided', () => {
      const scene = new MockScene() as any;
      const bp = new BuildingPlacement(economy, map, 1, canvas, scene);

      // Set terrain and territory for the picked location (31, 41) — mock scene returns x:30.5,z:40.5 → round to 31,41
      const tile = map.get(31, 41);
      if (tile) {
        (tile as any).terrain = Terrain.Grass;
        tile.territory = 1;
      }

      // Spy on economy.tryPlaceBuilding
      const placeSpy = jest.spyOn(economy, 'tryPlaceBuilding');

      // Listen for the custom event
      let placedEvent: any = null;
      const handler = (e: Event) => { placedEvent = (e as CustomEvent).detail; };
      window.addEventListener('building-placed', handler);

      bp.toggle();
      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      expect(btn).not.toBeNull();
      btn.click(); // Select a building

      // Click on canvas — should pick tile (31, 41) from mock scene
      const downEvent = new (PointerEvent as any)('pointerdown', { offsetX: 400, offsetY: 300 });
      canvas.dispatchEvent(downEvent);

      // Verify building was placed at picked tile
      expect(placeSpy).toHaveBeenCalled();
      const callArgs = placeSpy.mock.calls[0];
      // Verify building was placed at picked tile coordinates
      expect(callArgs[1]).toBe(31);
      expect(callArgs[2]).toBe(41);

      // Verify custom event was dispatched with correct data
      expect(placedEvent).not.toBeNull();
      expect(placedEvent.x).toBe(31);
      expect(placedEvent.y).toBe(41);

      window.removeEventListener('building-placed', handler);
      placeSpy.mockRestore();
    });

    it('should fallback to (50, 50) when no scene provided', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);

      const placeSpy = jest.spyOn(economy, 'tryPlaceBuilding');

      bp.toggle();
      const btn = document.querySelector('.bp-building-btn') as HTMLElement;
      expect(btn).not.toBeNull();
      btn.click();

      const downEvent = new (PointerEvent as any)('pointerdown', { offsetX: 400, offsetY: 300 });
      canvas.dispatchEvent(downEvent);

      expect(placeSpy).toHaveBeenCalled();
      const callArgs = placeSpy.mock.calls[0];
      // Without scene, should fallback to 50, 50
      expect(callArgs[1]).toBe(50);
      expect(callArgs[2]).toBe(50);

      placeSpy.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should remove panel and toggle button from DOM', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.dispose();
      expect(document.getElementById('building-palette')).toBeNull();
      expect(document.getElementById('btn-building-palette')).toBeNull();
    });
  });
});