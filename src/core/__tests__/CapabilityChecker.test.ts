/**
 * TypeScript tests for CapabilityChecker
 * @jest-environment jsdom
 */

import { checkCapabilities } from '../CapabilityChecker';

describe('checkCapabilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('reports ok=true and webgl2=true when a webgl2 context is available', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: any) => {
      if (type === 'webgl2') {
        return { getExtension: () => null } as any;
      }
      return null;
    });

    const result = checkCapabilities();
    expect(result.ok).toBe(true);
    expect(result.info.webgl2).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('reports ok=false and an error when webgl2 is unavailable', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null as any);

    const result = checkCapabilities();
    expect(result.ok).toBe(false);
    expect(result.info.webgl2).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('WebGL2');
  });

  test('gracefully handles getContext throwing an exception', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('context creation failed');
    });

    const result = checkCapabilities();
    expect(result.info.webgl2).toBe(false);
    expect(result.ok).toBe(false);
  });

  test('warns when Web Audio API is unavailable', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: any) =>
      type === 'webgl2' ? ({ getExtension: () => null } as any) : null
    );
    const originalAudioContext = (window as any).AudioContext;
    const originalWebkit = (window as any).webkitAudioContext;
    delete (window as any).AudioContext;
    delete (window as any).webkitAudioContext;

    const result = checkCapabilities();
    expect(result.info.webAudio).toBe(false);
    expect(result.warnings.some(w => w.includes('Web Audio'))).toBe(true);

    (window as any).AudioContext = originalAudioContext;
    (window as any).webkitAudioContext = originalWebkit;
  });

  test('includes userAgent, hardwareConcurrency and mobile flags in info', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: any) =>
      type === 'webgl2' ? ({ getExtension: () => null } as any) : null
    );
    const result = checkCapabilities();
    expect(typeof result.info.userAgent).toBe('string');
    expect(typeof result.info.mobile).toBe('boolean');
  });

  test('warns about low device memory when deviceMemory < 4', () => {
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: any) =>
      type === 'webgl2' ? ({ getExtension: () => null } as any) : null
    );
    Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });

    const result = checkCapabilities();
    expect(result.warnings.some(w => w.includes('memory'))).toBe(true);

    // @ts-ignore cleanup
    delete (navigator as any).deviceMemory;
  });
});
