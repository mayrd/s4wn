/**
 * S4WN Babylon.js/TypeScript - Game Loop
 *
 * Tick-based simulation loop. Runs economy, units, AI at 10 TPS.
 * Fully migrated from engine/src/lib.rs game loop logic.
 */

import { Economy } from './Economy';
import { UnitManager } from './UnitManager';
import { Map as GameMap } from './Map';
import { Nation } from './Nation';
import { WorkerAI } from './WorkerAI';
import { CombatAI } from './CombatAI';
import { TerritoryManager } from './TerritoryManager';

export interface GameState {
  gameTime: number;
  ticks: number;
  isPaused: boolean;
  gameSpeed: number;
  dayPhase: number;
  showFullMap: boolean;
}

export class GameLoop {
  economy: Economy;
  unitManager: UnitManager;
  map: GameMap;
  nation: Nation;
  territoryManager: TerritoryManager;
  workerAI: WorkerAI;
  combatAI: CombatAI;

  state: GameState = {
    gameTime: 0,
    ticks: 0,
    isPaused: false,
    gameSpeed: 1.0,
    dayPhase: 0.25,
    showFullMap: false,
  };

  private tickAccumulator: number = 0;
  private readonly TICK_INTERVAL: number = 1.0 / 10;

  constructor(map: GameMap) {
    this.map = map;
    this.economy = new Economy();
    this.unitManager = new UnitManager();
    this.nation = new Nation();
    this.workerAI = new WorkerAI(this.economy, this.unitManager, this.map);
    this.combatAI = new CombatAI(this.unitManager);
    this.territoryManager = new TerritoryManager(map, this.unitManager, this.economy);
  }

  update(dt: number): void {
    if (this.state.isPaused) return;

    this.state.gameTime += dt;
    this.tickAccumulator += dt * this.state.gameSpeed;

    while (this.tickAccumulator >= this.TICK_INTERVAL) {
      this.tickAccumulator -= this.TICK_INTERVAL;
      this.tick();
    }

    // Update day phase (full cycle every 120 seconds)
    this.state.dayPhase = (this.state.gameTime % 120) / 120;
  }

  private tick(): void {
    this.state.ticks++;

    // Economy tick
    this.economy.tick(1.0);

    // Unit tick (movement, state updates)
    this.unitManager.tick(this.map);

    // Worker AI
    this.workerAI.tick();

    // Combat AI
    this.combatAI.tick();

    // Update territory
    this.territoryManager.updateTerritory();

    // Update visibility
    this.updateVisibility();
  }

  private updateVisibility(): void {
    if (this.state.showFullMap) {
      this.map.setAllVisible();
      return;
    }

    // Compute visibility from buildings and units
    const sources: Array<{ x: number; y: number; radius: number }> = [];

    // Buildings provide visibility
    for (const building of this.economy.getCompleteBuildings()) {
      sources.push({ x: building.x, y: building.y, radius: 5 });
    }

    // Units provide visibility
    for (const unit of this.unitManager.getAliveUnits()) {
      sources.push({ x: Math.floor(unit.x), y: Math.floor(unit.y), radius: 3 });
    }

    this.map.computeVisibility(sources);
  }

  // ── Controls ─────────────────────────────────────────────────────

  togglePause(): void {
    this.state.isPaused = !this.state.isPaused;
  }

  setGameSpeed(speed: number): void {
    this.state.gameSpeed = Math.max(0.25, Math.min(8.0, speed));
  }

  setDayPhase(phase: number): void {
    this.state.dayPhase = phase;
  }

  revealMap(): void {
    this.state.showFullMap = true;
    this.map.setAllVisible();
  }

  // ── Stats ────────────────────────────────────────────────────────

  getStats(): { fps: number; ticks: number; gameTime: number; zoom: number } {
    return {
      fps: 0, // Set externally by renderer
      ticks: this.state.ticks,
      gameTime: this.state.gameTime,
      zoom: 0, // Set externally by camera
    };
  }
}