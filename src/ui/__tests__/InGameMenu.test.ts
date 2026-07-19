/**
 * S4WN - InGameMenu UI Tests
 * Tests for the hybrid bottom build bar, deep panel, and categorized construction menu.
 *
 * @jest-environment jsdom
 */

jest.mock('@babylonjs/core', () => ({
  Scene: jest.fn(),
  MeshBuilder: {
    CreateBox: jest.fn(() => ({
      name: 'ghost',
      position: { set: jest.fn() },
      material: null,
      isPickable: true,
      dispose: jest.fn(),
    })),
  },
  StandardMaterial: jest.fn(() => ({
    diffuseColor: {},
    alpha: 1,
    wireframe: false,
    dispose: jest.fn(),
  })),
  Color3: jest.fn(() => ({})),
  Mesh: jest.fn(),
}));

jest.mock('../../rendering/SupplyChainRenderer', () => ({
  RESOURCE_COLORS: {
    0: [0.8, 0.6, 0.2],
    1: [0.5, 0.5, 0.5],
    2: [0.2, 0.4, 0.8],
    3: [0.3, 0.7, 0.3],
    4: [0.1, 0.1, 0.1],
  },
}));

import { InGameMenu } from '../InGameMenu';
import { BuildingPlacement } from '../BuildingPlacement';
import { Map as GameMap } from '../../game/Map';
import { Economy } from '../../game/Economy';

// Mock Babylon.js Scene for picking tests
class MockEngine {
  getRenderingCanvas(): HTMLCanvasElement | null {
    return document.getElementById('renderCanvas') as HTMLCanvasElement;
  }
}
class MockScene {
  private engine = new MockEngine();
  getEngine() {
    return this.engine;
  }
  pick() {
    return { hit: true, pickedPoint: { x: 50, y: 0, z: 50 } };
  }
}

// Mock GameLoop for stats
class MockGameLoop {
  public economy = new Economy();
  public state = { isPaused: false, gameSpeed: 1 };
  getStats() {
    return { ticks: 123, gameTime: 45.6, zoom: 1 };
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
  canvas.id = 'renderCanvas';
  document.body.appendChild(canvas);
  return canvas;
}

describe('InGameMenu', () => {
  let canvas: HTMLCanvasElement;
  let map: GameMap;
  let gameLoop: any;
  let scene: any;
  let bp: any;
  let menu: InGameMenu;

  beforeEach(() => {
    document.body.innerHTML = '';
    createMockOverlay();
    canvas = createMockCanvas();
    map = new GameMap(100, 100, 'demo');
    gameLoop = new MockGameLoop();
    scene = new MockScene();
    
    bp = new BuildingPlacement(gameLoop.economy, map, 0, canvas, scene as any);
    menu = new InGameMenu(gameLoop, scene as any, 0, bp);
  });

  afterEach(() => {
    menu.dispose();
    bp.dispose();
    document.body.innerHTML = '';
  });

  it('should initialize DOM elements', () => {
    const buildBar = document.getElementById('anno-build-bar');
    const deepPanel = document.getElementById('s4-deep-panel');
    const tooltip = document.querySelector('.menu-tooltip');

    expect(buildBar).not.toBeNull();
    expect(deepPanel).not.toBeNull();
    expect(tooltip).not.toBeNull();

    expect(deepPanel!.classList.contains('hidden')).toBe(true);
  });

  it('should select building when build bar item is clicked', () => {
    const item = document.querySelector('.build-bar-item[data-kind]') as HTMLElement;
    expect(item).not.toBeNull();

    // Trigger click on a build bar item
    item.click();

    // Building placement should become visible and select the building
    expect(bp.isVisible()).toBe(true);
    expect(bp.getSelectedBuilding()).toBe(parseInt(item.dataset.kind!));
  });

  it('should toggle deep panel visibility', () => {
    const toggleBtn = document.getElementById('btn-toggle-deep-menu');
    expect(toggleBtn).not.toBeNull();

    // Click to open
    toggleBtn!.click();
    expect(menu.isDeepPanelVisible()).toBe(true);
    const deepPanel = document.getElementById('s4-deep-panel');
    expect(deepPanel!.classList.contains('hidden')).toBe(false);

    // Click to close via close button
    const closeBtn = deepPanel!.querySelector('.deep-panel-close') as HTMLElement;
    closeBtn.click();
    expect(menu.isDeepPanelVisible()).toBe(false);
    expect(deepPanel!.classList.contains('hidden')).toBe(true);
  });

  it('should change active tab inside deep panel', () => {
    menu.toggleDeepPanel();

    const militaryTabBtn = document.querySelector('.deep-tab-btn[data-tab="military"]') as HTMLElement;
    expect(militaryTabBtn).not.toBeNull();

    militaryTabBtn.click();
    expect(menu.getActiveTab()).toBe('military');

    const specialistsTabBtn = document.querySelector('.deep-tab-btn[data-tab="specialists"]') as HTMLElement;
    specialistsTabBtn.click();
    expect(menu.getActiveTab()).toBe('specialists');
  });

  it('should support collapsing and expanding the menu via toggle button', () => {
    const toggleBtn = document.getElementById('menu-toggle-btn') as HTMLButtonElement;
    expect(toggleBtn).not.toBeNull();
    expect(menu.isMenuCollapsed()).toBe(false);

    // Click to collapse
    toggleBtn.click();
    expect(menu.isMenuCollapsed()).toBe(true);
    expect(document.getElementById('anno-build-bar')!.classList.contains('collapsed')).toBe(true);
    expect(document.body.classList.contains('menu-collapsed')).toBe(true);
    expect(toggleBtn.textContent).toBe('▶');

    // Click to expand
    toggleBtn.click();
    expect(menu.isMenuCollapsed()).toBe(false);
    expect(document.getElementById('anno-build-bar')!.classList.contains('collapsed')).toBe(false);
    expect(document.body.classList.contains('menu-collapsed')).toBe(false);
    expect(toggleBtn.textContent).toBe('◀');
  });

  it('should switch to tutorial tab and render tutorial content', () => {
    const tutorialTab = document.querySelector('.build-bar-tab-btn[data-main-tab="tutorial"]') as HTMLButtonElement;
    expect(tutorialTab).not.toBeNull();
    tutorialTab.click();

    expect(document.querySelector('.build-bar-tab-btn.active')?.textContent).toContain('🎓 Tutorial');
    expect(document.querySelector('.deep-stats-section h3')?.textContent).toContain('Tutorial Guidance');
    expect(document.getElementById('tutorial-skip-btn')).not.toBeNull();
    expect(document.getElementById('tutorial-reset-btn')).not.toBeNull();
  });

  it('should switch to campaign tab and render campaign content', () => {
    const campaignTab = document.querySelector('.build-bar-tab-btn[data-main-tab="campaign"]') as HTMLButtonElement;
    expect(campaignTab).not.toBeNull();
    campaignTab.click();

    expect(document.querySelector('.build-bar-tab-btn.active')?.textContent).toContain('📖 Campaign');
    expect(document.querySelector('.deep-stats-section h3')?.textContent).toContain('Campaign Missions');
    // Check that there are multiple stats rows (story log, objectives)
    const statsRows = document.querySelectorAll('.stats-row');
    expect(statsRows.length).toBeGreaterThan(0);
  });

  it('should create speed toggle button', () => {
    const speedBtn = document.getElementById('speed-toggle-btn') as HTMLButtonElement;
    expect(speedBtn).not.toBeNull();
    expect(speedBtn.textContent).toBe('1x');
    expect(speedBtn.title).toBe('1x Speed');
  });

  it('should cycle through pause and game speeds', () => {
    const speedBtn = document.getElementById('speed-toggle-btn') as HTMLButtonElement;
    expect(speedBtn).not.toBeNull();

    // Initial: unpaused at 1x speed
    expect(gameLoop.state.isPaused).toBe(false);
    expect(gameLoop.state.gameSpeed).toBe(1);
    expect(speedBtn.textContent).toBe('1x');

    // Click 1: 1x → 2x
    speedBtn.click();
    expect(gameLoop.state.isPaused).toBe(false);
    expect(gameLoop.state.gameSpeed).toBe(2);
    expect(speedBtn.textContent).toBe('2x');

    // Click 2: 2x → 4x
    speedBtn.click();
    expect(gameLoop.state.isPaused).toBe(false);
    expect(gameLoop.state.gameSpeed).toBe(4);
    expect(speedBtn.textContent).toBe('4x');

    // Click 3: 4x → pause
    speedBtn.click();
    expect(gameLoop.state.isPaused).toBe(true);
    expect(gameLoop.state.gameSpeed).toBe(1);
    expect(speedBtn.textContent).toBe('⏸️');

    // Click 4: paused → 1x
    speedBtn.click();
    expect(gameLoop.state.isPaused).toBe(false);
    expect(gameLoop.state.gameSpeed).toBe(1);
    expect(speedBtn.textContent).toBe('1x');
  });

  it('should move speed button when menu is collapsed', () => {
    const toggleBtn = document.getElementById('menu-toggle-btn') as HTMLButtonElement;
    const speedBtn = document.getElementById('speed-toggle-btn') as HTMLElement;

    // Collapse menu
    toggleBtn.click();
    expect(speedBtn.classList.contains('collapsed')).toBe(true);

    // Expand menu
    toggleBtn.click();
    expect(speedBtn.classList.contains('collapsed')).toBe(false);
  });
});
