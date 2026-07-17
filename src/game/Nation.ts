/**
 * S4WN Babylon.js/TypeScript - Nation Module
 *
 * **Backward-compatible wrapper around `NationRegistry`.**
 *
 * Use `NationRegistry.instance` directly for new code. This file exists
 * so existing consumers that import `NationType`, `NATION_NAMES`,
 * `getNationName()` continue to work without changes.
 */

import { NationRegistry, NationInfo } from './NationRegistry';

// ── Legacy numeric enum (backward compat) ───────────────────────

export enum NationType {
  Romans = 0,
  Vikings = 1,
  Mayans = 2,
  Trojans = 3,
  DarkTribe = 4,
}

/** Legacy constant — computed from registry at runtime. */
export function getNATION_COUNT(): number {
  return NationRegistry.instance.count;
}

// ── Legacy name/color accessors (backward compat) ──────────────

/** Returns the English name for a legacy numeric nation ID. */
export function getNationName(discriminant: number): string {
  const n = NationRegistry.instance.getByNumber(discriminant);
  return n?.info.name ?? 'Unknown';
}

/** Legacy color lookup. */
export function getNationColor(discriminant: number): string {
  const n = NationRegistry.instance.getByNumber(discriminant);
  return n?.info.color ?? '#888888';
}

/** Legacy emoji lookup. */
export function getNationEmoji(discriminant: number): string {
  const n = NationRegistry.instance.getByNumber(discriminant);
  return n?.info.emoji ?? '❓';
}

// ── Legacy constants (eager — pre-filled from fallbacks) ───────────

/** Legacy name array — indices match NationType values. */
export let NATION_NAMES: string[] = ['Romans', 'Vikings', 'Mayans', 'Trojans', 'Dark Tribe'];

/** Legacy info map — keys are numeric NationType values. */
export let NATION_INFO: Record<number, NationInfo> = {
  0: { id: 'romans', name: 'Romans', color: '#cc3333', secondary: '#ff6644', emoji: '🏛️', displayName: { en: 'Romans', de: 'Römer' } },
  1: { id: 'vikings', name: 'Vikings', color: '#3366cc', secondary: '#6699ff', emoji: '⚔️', displayName: { en: 'Vikings', de: 'Wikinger' } },
  2: { id: 'mayans', name: 'Mayans', color: '#33cc33', secondary: '#66ff66', emoji: '🌿', displayName: { en: 'Mayans', de: 'Maya' } },
  3: { id: 'trojans', name: 'Trojans', color: '#cc9933', secondary: '#ffcc66', emoji: '🐴', displayName: { en: 'Trojans', de: 'Trojaner' } },
  4: { id: 'dark', name: 'Dark Tribe', color: '#9933cc', secondary: '#cc66ff', emoji: '🌑', displayName: { en: 'Dark Tribe', de: 'Dunkler Stamm' } },
};

/** Rebuild legacy constants from the registry. Called after boot. */
export function rebuildLegacyConstants(): void {
  const reg = NationRegistry.instance;
  const list = reg.list();
  NATION_NAMES = list.map((n) => n.info.name);
  NATION_INFO = {};
  for (let i = 0; i < list.length; i++) {
    NATION_INFO[i] = { ...list[i].info };
  }
}

// ── Legacy Nation class (thin wrapper) ──────────────────────────

export class Nation {
  selectedNation: number = 0;

  setNation(n: number): boolean {
    if (n >= 0 && n < NationRegistry.instance.count) {
      this.selectedNation = n;
      return true;
    }
    return false;
  }

  getInfo(): NationInfo {
    const reg = NationRegistry.instance;
    const rn = reg.getByNumber(this.selectedNation);
    return rn?.info ?? reg.getByNumber(0)!.info;
  }

  /** Returns building discriminants available to this nation. */
  getBuildings(): number[] {
    const result: number[] = [];
    // Generic buildings available to everyone
    for (const disc of [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 27, 28]) {
      result.push(disc);
    }
    // Nation-specific buildings by legacy numeric ID
    const nationSpecific: Record<number, number[]> = {
      0: [31, 32, 33, 34],       // Romans
      1: [35, 36, 37, 38, 39],   // Vikings
      2: [40, 41, 42, 43, 44, 45, 46], // Mayans
      3: [47, 50, 51, 52, 53],   // Trojans
      4: [54, 55, 56, 57, 58, 59, 60], // Dark Tribe
    };
    result.push(...(nationSpecific[this.selectedNation] || []));
    // Extra buildings 61+
    for (let d = 61; d <= 86; d++) result.push(d);
    return result.sort((a, b) => a - b);
  }
}
