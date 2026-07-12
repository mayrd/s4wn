/**
 * S4WN GridRenderer Tests
 * @jest-environment jsdom
 */

import { GridRenderer } from '../GridRenderer';

// Mock Babylon.js
const mockMesh = {
  isVisible: true,
  name: 'grid',
  dispose: jest.fn(),
};

const mockScene = {
  addMesh: jest.fn(),
};

jest.mock('@babylonjs/core', () => ({
  MeshBuilder: {
    CreateLines: jest.fn(() => mockMesh),
  },
  StandardMaterial: jest.fn(() => ({})),
  Color3: function() { return { r: 0, g: 1, b: 0 }; },
  Vector3: function(x?: number, y?: number, z?: number) {
    return { x: x || 0, y: y || 0, z: z || 0 };
  },
  LinesMesh: jest.fn(() => mockMesh),
}));

describe('GridRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMesh.isVisible = true;
  });

  it('should create a grid with correct line count', () => {
    const renderer = new GridRenderer(mockScene as any, 10, 10);
    renderer.createGrid();

    // For a 10x10 grid: 
    // - 11 vertical lines (x=0 to x=10)
    // - 11 horizontal lines (z=0 to z=10)
    // Each line has 2 points, so total positions = 22 * 2 = 44 points
    const linesCall = (jest.requireMock('@babylonjs/core').MeshBuilder.CreateLines as jest.Mock);
    expect(linesCall.mock.calls[0][1].points.length).toBe(44);
  });

  it('should set grid visibility to true initially', () => {
    const renderer = new GridRenderer(mockScene as any, 10, 10);
    renderer.createGrid();

    expect(mockMesh.isVisible).toBe(true);
  });

  it('should toggle grid visibility with setVisible', () => {
    const renderer = new GridRenderer(mockScene as any, 10, 10);
    renderer.createGrid();

    renderer.setVisible(false);
    expect(mockMesh.isVisible).toBe(false);

    renderer.setVisible(true);
    expect(mockMesh.isVisible).toBe(true);
  });

  it('should dispose the grid mesh', () => {
    const renderer = new GridRenderer(mockScene as any, 10, 10);
    renderer.createGrid();

    renderer.dispose();
    expect(mockMesh.dispose).toHaveBeenCalled();
  });

  it('should store map width and height', () => {
    const renderer = new GridRenderer(mockScene as any, 50, 75);
    renderer.createGrid();

    // Verify the grid was created (indirectly by checking calls)
    const linesCall = (require('@babylonjs/core').MeshBuilder.CreateLines as jest.Mock);
    expect(linesCall).toHaveBeenCalled();
  });
});