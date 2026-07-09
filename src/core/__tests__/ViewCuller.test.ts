/**
 * Tests for ViewCuller — frustum/radius-based entity culling.
 */

import { ViewCuller } from '../ViewCuller';

describe('ViewCuller', () => {
  let culler: ViewCuller;

  beforeEach(() => {
    culler = new ViewCuller();
  });

  it('should default to radius 30 and center 0,0', () => {
    expect(culler.radius).toBe(30);
    expect(culler.center).toEqual({ x: 0, y: 0 });
  });

  it('should return true for positions within radius', () => {
    culler.setCenter(10, 10);
    expect(culler.isWithinView(10, 10)).toBe(true);
    expect(culler.isWithinView(20, 10)).toBe(true);
    expect(culler.isWithinView(10, 39)).toBe(true);
  });

  it('should return false for positions outside radius', () => {
    culler.setCenter(10, 10);
    expect(culler.isWithinView(10, 41)).toBe(false); // dy=31 > r=30
    expect(culler.isWithinView(-21, 10)).toBe(false); // dx=-31 > r=30
    expect(culler.isWithinView(50, 50)).toBe(false);
  });

  it('should update center', () => {
    culler.setCenter(5, 5);
    expect(culler.isWithinView(5, 5)).toBe(true);
    culler.setCenter(100, 100);
    expect(culler.isWithinView(5, 5)).toBe(false);
    expect(culler.isWithinView(100, 100)).toBe(true);
  });

  it('should update radius', () => {
    culler.setCenter(0, 0);
    culler.setRadius(10);
    expect(culler.isWithinView(10, 0)).toBe(true);
    expect(culler.isWithinView(11, 0)).toBe(false);
    culler.setRadius(50);
    expect(culler.isWithinView(30, 30)).toBe(true);
  });

  it('should clamp radius to valid range', () => {
    culler.setRadius(2); // below min 5
    expect(culler.radius).toBe(5);
    culler.setRadius(999); // above max 200
    expect(culler.radius).toBe(200);
    culler.setRadius(50);
    expect(culler.radius).toBe(50);
  });

  it('should produce correct bounding box', () => {
    culler.setCenter(10, 20);
    culler.setRadius(15);
    const b = culler.getBounds();
    expect(b.minX).toBe(-5);
    expect(b.minY).toBe(5);
    expect(b.maxX).toBe(25);
    expect(b.maxY).toBe(35);
  });

  it('should detect full ticks at correct interval', () => {
    expect(culler.isFullTick(0)).toBe(true);
    expect(culler.isFullTick(30)).toBe(true);
    expect(culler.isFullTick(60)).toBe(true);
    expect(culler.isFullTick(1)).toBe(false);
    expect(culler.isFullTick(29)).toBe(false);
  });

  it('should compute cull statistics', () => {
    culler.setCenter(0, 0);
    culler.setRadius(5);
    const entities = [
      { x: 0, y: 0 },     // visible
      { x: 3, y: 4 },     // visible (dist=5, on edge)
      { x: 10, y: 10 },   // culled
      { x: -10, y: -10 }, // culled
      { x: 0, y: -3 },    // visible
    ];
    const stats = ViewCuller.cullStats(entities, culler);
    expect(stats.total).toBe(5);
    expect(stats.visible).toBe(3);
    expect(stats.culled).toBe(2);
  });
});
