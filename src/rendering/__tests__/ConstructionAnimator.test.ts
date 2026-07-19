/**
 * S4WN Babylon.js/TypeScript - ConstructionAnimator Tests
 * @jest-environment jsdom
 *
 * Tests for construction scaffolding management and progress-based animation.
 */

jest.mock('../../audio/SoundManager', () => ({
  soundManager: {
    play: jest.fn(),
  },
}));

// Mock Babylon.js
const mockScene = {
  meshes: [],
} as any;

jest.mock('@babylonjs/core', () => ({
  Scene: jest.fn(() => mockScene),
  MeshBuilder: {
    CreateCylinder: jest.fn((name: string) => ({
      name,
      position: { x: 0, y: 0, z: 0, set: jest.fn() } as any,
      material: null,
      isVisible: true,
      parent: null,
      dispose: jest.fn(),
      getChildMeshes: jest.fn(() => []),
    })),
    CreateBox: jest.fn((name: string) => ({
      name,
      position: { x: 0, y: 0, z: 0, set: jest.fn() } as any,
      material: null,
      isVisible: false,
      parent: null,
      dispose: jest.fn(),
      getChildMeshes: jest.fn(() => []),
    })),
  },
  StandardMaterial: jest.fn((name: string) => ({
    name,
    diffuseColor: { r: 1, g: 1, b: 1 },
    specularColor: { r: 0, g: 0, b: 0 },
    disableLighting: false,
    dispose: jest.fn(),
  })),
  Color3: jest.fn((r: number, g: number, b: number) => ({ r, g, b })),
  TransformNode: jest.fn((name: string) => ({
    name,
    position: { x: 0, y: 0, z: 0, set: jest.fn() } as any,
    dispose: jest.fn(),
  })),
}));

jest.mock('@babylonjs/loaders', () => ({
  SceneLoader: {
    ImportMeshAsync: jest.fn(() => Promise.resolve({ meshes: [{ dispose: jest.fn() }] })),
  },
}));

import { ConstructionAnimator } from '../ConstructionAnimator';
import { BuildingData } from '../../game/Economy';

function makeBuilding(overrides: Partial<BuildingData> = {}): BuildingData {
  return {
    index: 1,
    kind: 0,
    x: 50,
    y: 50,
    hp: 100,
    maxHp: 100,
    constructionProgress: 0,
      garrisonUnitIds: [],
    isActive: false,
    productionProgress: 0,
    productionCounter: 0,
    inputBuffer: [],
    outputBuffer: [],
    assignedSettlers: [],
    maxSettlers: 0,
    destructionTimer: null,
    destructionProgress: null,
    ownerId: 0,
    ...overrides,
  };
}

describe('ConstructionAnimator', () => {
  let animator: ConstructionAnimator;

  beforeEach(() => {
    jest.clearAllMocks();
    animator = new ConstructionAnimator(mockScene as any);
    // Set a mock buildingRenderer so swapToFinalModel can proceed
    (animator as any).buildingRenderer = {
      createBuilding: jest.fn(() => Promise.resolve({ dispose: jest.fn() })),
    };
  });

  it('should create scaffolding when startConstruction is called', () => {
    const building = makeBuilding();
    animator.startConstruction(building);

    expect(animator.isTracked(building.index)).toBe(true);
  });

  it('should not double-start the same building', () => {
    const building = makeBuilding();
    animator.startConstruction(building);
    const initialCount = animator.getEntries().size;

    animator.startConstruction({ ...makeBuilding(), index: 1 });
    expect(animator.getEntries().size).toBe(initialCount);
  });

  it('should track multiple buildings independently', () => {
    const b1 = makeBuilding({ index: 1 });
    const b2 = makeBuilding({ index: 2, x: 60, y: 60 });

    animator.startConstruction(b1);
    animator.startConstruction(b2);

    expect(animator.isTracked(1)).toBe(true);
    expect(animator.isTracked(2)).toBe(true);
    expect(animator.getEntries().size).toBe(2);
  });

  it('should show only corner poles at start (progress 0)', () => {
    const building = makeBuilding({ constructionProgress: 0 });
    animator.startConstruction(building);

    const entries = animator.getEntries();
    const entry = entries.get(building.index)!;

    // Corner poles should be visible
    for (const pole of entry.cornerPoles) {
      expect(pole.isVisible).toBe(true);
    }
    // Beams should be hidden
    for (const beam of entry.horizontalBeams) {
      expect(beam.isVisible).toBe(false);
    }
    // Wall planks should be hidden
    for (const plank of entry.wallPlanks) {
      expect(plank.isVisible).toBe(false);
    }
  });

  it('should show beams when progress reaches 33%', () => {
    const building = makeBuilding({ constructionProgress: 0.33 });
    animator.startConstruction(building);

    animator.update([building]);

    const entry = animator.getEntries().get(building.index)!;
    for (const beam of entry.horizontalBeams) {
      expect(beam.isVisible).toBe(true);
    }
  });

  it('should show wall planks progressively from 66%', () => {
    const building = makeBuilding({ constructionProgress: 0.5 });
    animator.startConstruction(building);

    // At 50% — no walls
    animator.update([{ ...building, constructionProgress: 0.5 }]);
    let entry = animator.getEntries().get(building.index)!;
    for (const plank of entry.wallPlanks) {
      expect(plank.isVisible).toBe(false);
    }

    // At 75% — ~50% of walls
    animator.update([{ ...building, constructionProgress: 0.75 }]);
    entry = animator.getEntries().get(building.index)!;
    const visibleCount = entry.wallPlanks.filter(p => p.isVisible).length;
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThan(entry.wallPlanks.length);
  });

  it('should swap to final model when construction completes', async () => {
    const building = makeBuilding({ constructionProgress: 1.0, isActive: true });
    animator.startConstruction(building);

    // Trigger completion (the update reads progress from the passed buildings array)
    animator.update([building]);

    // After completion, the entry should be removed (completed)
    expect(animator.isTracked(building.index)).toBe(false);

    // Wait for the async model loading
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should call onConstructionComplete when building finishes', async () => {
    const onComplete = jest.fn();
    animator.onConstructionComplete = onComplete;

    const building = makeBuilding({ constructionProgress: 1.0, isActive: true });
    animator.startConstruction(building);

    animator.update([building]);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onComplete).toHaveBeenCalled();
  });

  it('should dispose all scaffolding on dispose()', () => {
    const b1 = makeBuilding({ index: 1 });
    const b2 = makeBuilding({ index: 2 });

    animator.startConstruction(b1);
    animator.startConstruction(b2);

    animator.dispose();

    expect(animator.getEntries().size).toBe(0);
    expect(animator.isTracked(1)).toBe(false);
    expect(animator.isTracked(2)).toBe(false);
  });

  it('should remove tracking for a specific building', () => {
    const building = makeBuilding();
    animator.startConstruction(building);
    expect(animator.isTracked(building.index)).toBe(true);

    animator.removeTracking(building.index);
    expect(animator.isTracked(building.index)).toBe(false);
  });

  it('should not crash if update is called with no tracked buildings', () => {
    expect(() => animator.update([])).not.toThrow();
    expect(() => animator.update([makeBuilding({ index: 999 })])).not.toThrow();
  });

  it('should not recomplete an already completed building', () => {
    const building = makeBuilding({ constructionProgress: 1.0, isActive: true });
    animator.startConstruction(building);

    // Mark as completed directly
    const entry = animator.getEntries().get(building.index)!;
    entry.completed = true;

    // Update should not crash
    animator.update([building]);

    // Entry should still be there but completed
    expect(animator.getEntries().get(building.index)?.completed).toBe(true);
  });
});
