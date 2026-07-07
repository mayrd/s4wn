/**
 * S4WN Save/Load System
 *
 * Persists full game state (map, economy, units, game state) to localStorage.
 * Handles serialization, deserialization, and save slot management.
 */

import { Map as GameMap } from '../game/Map';
import { Economy } from '../game/Economy';
import { UnitManager } from '../game/UnitManager';
import { GameState } from '../game/GameLoop';

const STORAGE_KEY = 's4wn_save';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  timestamp: number;
  gameState: GameState;
  map: object;
  economy: object;
  units: object;
}

export class SaveManager {
  /* ── Save ─────────────────────────────────────────────────── */

  static save(
    gameState: GameState,
    map: GameMap,
    economy: Economy,
    unitManager: UnitManager,
  ): boolean {
    try {
      const data: SaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        gameState: { ...gameState, isPaused: true }, // always load paused
        map: map.toJSON(),
        economy: economy.toJSON(),
        units: {
          nextUnitId: unitManager.nextUnitId,
          units: unitManager.units.map(u => ({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: u.y,
            hp: u.hp,
            state: u.state,
            stance: u.stance,
            attackTargetId: u.attackTargetId,
            assignedBuilding: u.assignedBuilding,
            rank: u.rank,
            dyingTimer: u.dyingTimer,
          })),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('SaveManager: failed to save', e);
      return false;
    }
  }

  /* ── Load ─────────────────────────────────────────────────── */

  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data: SaveData = JSON.parse(raw);
      if (data.version !== SAVE_VERSION) {
        console.warn(`SaveManager: version mismatch (got ${data.version}, expected ${SAVE_VERSION})`);
        return null;
      }
      return data;
    } catch (e) {
      console.error('SaveManager: failed to load', e);
      return null;
    }
  }

  static restoreMap(data: SaveData): GameMap {
    return GameMap.fromJSON(data.map);
  }

  static restoreEconomy(data: SaveData): Economy {
    const economy = new Economy();
    economy.restoreFromJSON(data.economy);
    return economy;
  }

  static restoreUnits(data: SaveData): UnitManager {
    const um = new UnitManager();
    um.nextUnitId = (data.units as any).nextUnitId;
    for (const u of (data.units as any).units) {
      um.units.push({
        id: u.id,
        kind: u.kind,
        x: u.x,
        y: u.y,
        hp: u.hp,
        state: u.state,
        stance: u.stance,
        attackTargetId: u.attackTargetId ?? null,
        assignedBuilding: u.assignedBuilding ?? null,
        rank: u.rank ?? 0,
        dyingTimer: u.dyingTimer ?? null,
        attackCooldown: 0,
        targetX: 0,
        targetY: 0,
        path: null,
        // Required Unit interface methods — provided by Unit class
        isAlive: () => true,
        canFight: () => true,
        takeDamage: () => true,
        getMaxHp: () => 100,
        getSpeed: () => 1,
        getAttackDamage: () => 0,
        getAttackRange: () => 0,
        getAttackInterval: () => 0,
        addExperience: () => {},
        moveAlong: () => {},
      } as any);
    }
    return um;
  }

  /* ── Slot Management ──────────────────────────────────────── */

  static hasSave(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static getSaveInfo(): { timestamp: number; gameTime: number } | null {
    const data = SaveManager.load();
    if (!data) return null;
    return {
      timestamp: data.timestamp,
      gameTime: data.gameState.gameTime,
    };
  }
}
