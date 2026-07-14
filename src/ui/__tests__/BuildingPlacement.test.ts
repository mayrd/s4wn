/**
 * S4WN - BuildingPlacement UI Tests
 * Tests for the building palette panel and placement logic.
 *
 * @jest-environment jsdom
 */

import { BuildingPlacement } from '../BuildingPlacement';
import { BuildingType, VALID_BUILDING_DISCRIMINANTS } from '../../economy/types';
import { ResourceType } from '../../economy/types';
import { Map as GameMap } from '../../game/Map';
import { Economy } from '../../game/Economy';

// Mock DOM elements
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
    // Clean up DOM
    document.body.innerHTML = '';
    void createMockOverlay();
    canvas = createMockCanvas();
    map = new GameMap(100, 100, 'demo');
    economy = new Economy();
    // Ensure enough resources for testing
    economy.addResource(ResourceType.Wood, 200);
    economy.addResource(ResourceType.Stone, 200);
    // Give player territory around center
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
      // At least one should have a cost indicator
      const costLabels = document.querySelectorAll('.bp-cost');
      expect(costLabels.length).toBeGreaterThan(0);
    });
  });

  describe('building selection', () => {
    it('should set selected building when clicked', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.toggle();

      // Find a building button and click it
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
        // selectBuilding re-renders content, so re-query for the selected state
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
        expect(btn.classList.contains('selected')).toBe(false);
      }
    });
  });

  describe('canAffordBuilding', () => {
    it('should return true for affordable buildings', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      // Farm costs 3 wood - economy starts with 20 wood
      expect(bp.canAffordBuilding(BuildingType.Farm)).toBe(true);
    });

    it('should return false for unaffordable buildings', () => {
      // Create economy with no resources
      const poorEconomy = new Economy();
      poorEconomy.resources.fill(0); // Remove all resources
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

  describe('dispose', () => {
    it('should remove panel and toggle button from DOM', () => {
      const bp = new BuildingPlacement(economy, map, 1, canvas);
      bp.dispose();
      expect(document.getElementById('building-palette')).toBeNull();
      expect(document.getElementById('btn-building-palette')).toBeNull();
    });
  });
});
