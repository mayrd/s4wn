/**
 * S4WN Babylon.js/TypeScript - DestructionAnimator Tests
 * @jest-environment jsdom
 */

import { DestructionAnimator } from '../DestructionAnimator';
import { BuildingData } from '../../game/Economy';
import { ParticleEffectType } from '../../game/particles/ParticleSystem';
import { Vector3 } from '@babylonjs/core';

jest.mock('../../audio/SoundManager', () => ({
  soundManager: {
    play: jest.fn(),
  },
}));

jest.mock('@babylonjs/core', () => ({
  Scene: jest.fn(),
  Vector3: class {
    x: number; y: number; z: number;
    constructor(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; }
  },
  TransformNode: jest.fn(),
  MeshBuilder: {},
  StandardMaterial: jest.fn(),
  Color3: jest.fn(),
}));

function makeBuilding(overrides: Partial<BuildingData> = {}): BuildingData {
  return {
    index: 1,
    kind: 0,
    x: 50,
    y: 50,
    hp: 0,
    maxHp: 100,
    constructionProgress: 1,
    isActive: false,
    productionProgress: 0,
    productionCounter: 0,
    inputBuffer: [],
    outputBuffer: [],
    assignedSettlers: [],
    maxSettlers: 0,
    destructionTimer: 5.0,
    destructionProgress: 0,
    ownerId: 0,
    ...overrides,
  };
}

describe('DestructionAnimator', () => {
  let particleSystemMock: any;
  let animator: DestructionAnimator;
  let buildingMeshes: Map<number, any>;

  beforeEach(() => {
    particleSystemMock = {
      createEffect: jest.fn(),
      startEffect: jest.fn(),
      stopEffect: jest.fn(),
    };
    animator = new DestructionAnimator({} as any, particleSystemMock as any);
    buildingMeshes = new Map();
  });

  it('should play sound and emit particles when destruction starts', () => {
    const building = makeBuilding({ destructionTimer: 4.5, destructionProgress: 0.2 });
    const mockMesh = { position: new Vector3(50, 0, 50), dispose: jest.fn() };
    buildingMeshes.set(building.index, mockMesh);

    animator.update([building], buildingMeshes);

    expect(particleSystemMock.createEffect).toHaveBeenCalledWith(
      ParticleEffectType.Dust,
      expect.any(Vector3),
      `destruct-dust-${building.index}`
    );
    expect(particleSystemMock.startEffect).toHaveBeenCalledWith(`destruct-dust-${building.index}`);
    
    const { soundManager } = require('../../audio/SoundManager');
    expect(soundManager.play).toHaveBeenCalledWith('destroy', 0.8);
  });

  it('should sink the building into the ground based on progress', () => {
    const building = makeBuilding({ destructionTimer: 4.0, destructionProgress: 0.2 }); // 1 - 4.0/5.0 = 0.2
    const mockMesh = { position: new Vector3(50, 0, 50), dispose: jest.fn() };
    buildingMeshes.set(building.index, mockMesh);

    animator.update([building], buildingMeshes);

    // Initial Y is 0. With progress 0.2, it sinks by 0.2 * 2.0 = 0.4
    expect(mockMesh.position.y).toBeCloseTo(-0.4);
  });

  it('should remove the mesh and stop particles when destruction completes', () => {
    const building = makeBuilding({ destructionTimer: 4.5, destructionProgress: 0.2 });
    const mockMesh = { position: new Vector3(50, 0, 50), dispose: jest.fn() };
    buildingMeshes.set(building.index, mockMesh);

    // Initial update to register
    animator.update([building], buildingMeshes);
    expect(particleSystemMock.startEffect).toHaveBeenCalled();

    // Now building is removed from the economy (destruction Timer finished)
    animator.update([], buildingMeshes);

    expect(particleSystemMock.stopEffect).toHaveBeenCalledWith(`destruct-dust-${building.index}`);
    expect(mockMesh.dispose).toHaveBeenCalled();
    expect(buildingMeshes.has(building.index)).toBe(false);
  });

});
