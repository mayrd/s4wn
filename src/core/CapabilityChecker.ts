/**
 * S4WN Babylon.js/TypeScript - Capability Checker
 *
 * Lightweight, dependency-free browser/device capability checks.
 * This is the only thing that runs on the splash screen before the user
 * reaches the main menu. It must NOT import Babylon.js or any heavy module
 * so that the initial load stays minimal.
 */

export interface CapabilityResult {
  /** True when the environment can reasonably run the game. */
  ok: boolean;
  /** Fatal problems that prevent the game from running at all. */
  errors: string[];
  /** Non-fatal warnings (e.g. low memory) shown to the user. */
  warnings: string[];
  /** Informational flags useful for diagnostics. */
  info: {
    webgl2: boolean;
    webgpu: boolean;
    webAudio: boolean;
    deviceMemory?: number;
    hardwareConcurrency?: number;
    mobile: boolean;
    userAgent: string;
  };
}

/**
 * Runs a series of cheap browser/device checks.
 * Returns a structured result describing what the environment supports.
 */
export function checkCapabilities(): CapabilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // ── WebGL2 ──────────────────────────────────────────────────────
  let webgl2 = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    webgl2 = !!gl;
    // Release the context promptly to free resources.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2 = false;
  }
  if (!webgl2) {
    errors.push(
      'WebGL2 is not available in this browser. The 3D engine cannot start. ' +
      'Please use a recent version of Chrome, Edge, Firefox or Safari with hardware acceleration enabled.'
    );
  }

  // ── WebGPU (optional / informational only) ──────────────────────
  const webgpu = typeof (navigator as any).gpu !== 'undefined';

  // ── Web Audio (required for sound) ─────────────────────────────
  const webAudio =
    typeof window !== 'undefined' &&
    !!(window.AudioContext || (window as any).webkitAudioContext);
  if (!webAudio) {
    warnings.push('Web Audio API is unavailable — the game will run silently.');
  }

  // ── Device characteristics ───────────────────────────────────────
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;
  const hardwareConcurrency = navigator.hardwareConcurrency;
  const mobile =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(max-width: 768px)').matches === true;

  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory < 4) {
    warnings.push(
      `This device reports only ${deviceMemory} GB of memory. ` +
      'Performance may be limited on larger maps.'
    );
  }
  if (typeof hardwareConcurrency === 'number' && hardwareConcurrency > 0 && hardwareConcurrency < 2) {
    warnings.push(
      'This device has very few CPU cores; simulation speed may be reduced.'
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    info: {
      webgl2,
      webgpu,
      webAudio,
      deviceMemory,
      hardwareConcurrency,
      mobile,
      userAgent: navigator.userAgent,
    },
  };
}