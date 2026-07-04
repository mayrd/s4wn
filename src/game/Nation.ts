/**
 * S4WN Babylon.js/TypeScript - Nation Module
 *
 * Nation types, modifiers, and building availability.
 * Fully migrated from engine/src/nation.rs
 */

export enum NationType {
  Romans = 0,
  Vikings = 1,
  Mayans = 2,
  Trojans = 3,
  DarkTribe = 4,
}

export const NATION_COUNT = 5;

export interface NationInfo {
  nameId: number;
  color: string;
  emoji: string;
  description: string;
}

export const NATION_NAMES: string[] = [
  "Romans",
  "Vikings",
  "Mayans",
  "Trojans",
  "Dark Tribe",
];

export const NATION_INFO: Record<number, NationInfo> = {
  0: { nameId: 0, color: "#cc3333", emoji: "🏛️", description: "Roman Empire — Engineering & Military" },
  1: { nameId: 1, color: "#3366cc", emoji: "⚔️", description: "Viking Raiders — Naval & Mead" },
  2: { nameId: 2, color: "#33cc33", emoji: "🌿", description: "Maya Civilization — Agriculture & Religion" },
  3: { nameId: 3, color: "#cc9933", emoji: "🐴", description: "Trojan Warriors — Defense & Trade" },
  4: { nameId: 4, color: "#9933cc", emoji: "🌑", description: "Dark Tribe — Mysticism & Dark Arts" },
};

export function getNationName(discriminant: number): string {
  return NATION_NAMES[discriminant] || "Unknown";
}

export class Nation {
  selectedNation: number = 0; // Default: Romans

  setNation(discriminant: number): boolean {
    if (discriminant >= 0 && discriminant < NATION_COUNT) {
      this.selectedNation = discriminant;
      return true;
    }
    return false;
  }

  getInfo(): NationInfo {
    return NATION_INFO[this.selectedNation] || NATION_INFO[0];
  }

  getBuildings(): number[] {
    // Return building discriminants available to this nation
    // Building discriminants are all valid ones that aren't locked to other nations
    const result: number[] = [];
    for (const disc of [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 27, 28]) {
      result.push(disc);
    }
    // Add nation-specific buildings
    const nationSpecific: Record<number, number[]> = {
      0: [31, 32, 33, 34], // Roman
      1: [35, 36, 37, 38, 39], // Viking
      2: [40, 41, 42, 43, 44, 45, 46], // Maya
      3: [47, 50, 51, 52, 53], // Trojan
      4: [54, 55, 56, 57, 58, 59, 60], // Dark Tribe
    };
    result.push(...(nationSpecific[this.selectedNation] || []));
    // Add all extra buildings (61+)
    for (let d = 61; d <= 86; d++) {
      if ([61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86].includes(d)) {
        result.push(d);
      }
    }
    return result.sort((a, b) => a - b);
  }
}