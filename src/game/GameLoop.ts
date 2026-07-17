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
import { SaveManager } from '../core/SaveManager';
import { ViewCuller } from '../core/ViewCuller';

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
    isPaused: false,  // Start unpaused — game-start event is redundant backup
    gameSpeed: 1.0,
    dayPhase: 0.25,
    showFullMap: false,
  };

  /** View culler — skips off-screen entities for performance. */
  viewCuller: ViewCuller = new ViewCuller();

  /** Per-tick callbacks for external subscribers (e.g. UI panels, debug tools). */
  private tickSubscribers: Array<(gameLoop: GameLoop) => void> = [];

  private tickAccumulator: number = 0;
  private readonly TICK_INTERVAL: number = 1.0 / 10;

  /** Register a callback that fires once per simulation tick. */
  onTick(fn: (gameLoop: GameLoop) => void): void {
    this.tickSubscribers.push(fn);
  }

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

    // Economy always runs (production is global)
    this.economy.tick(1.0);

    // Notify external subscribers (UI panels, debug tools)
    for (const fn of this.tickSubscribers) {
      fn(this);
    }

    const isFullTick = this.viewCuller.isFullTick(this.state.ticks);

    // Unit tick — cull off-screen units on non-full ticks
    if (isFullTick || this.state.showFullMap) {
      this.unitManager.tick(this.map);
    } else {
      this.unitManager.tickCulled(this.map, this.viewCuller);
    }

    // Worker AI
    this.workerAI.tick();
    this.workerAI.logisticsTick();

    // Combat AI
    this.combatAI.tick();

    // Update territory (only on full ticks for performance)
    if (isFullTick || this.state.showFullMap) {
      this.territoryManager.updateTerritory();
    }

    // Update visibility (always, but cull off-screen sources on non-full ticks)
    if (isFullTick || this.state.showFullMap) {
      this.updateVisibility();
    } else {
      this.updateVisibilityCulled();
    }
  }

  private updateVisibility(): void {
    if (this.state.showFullMap) {
      this.map.setAllVisible();
      return;
    }

    const sources: Array<{ x: number; y: number; radius: number }> = [];

    for (const building of this.economy.getCompleteBuildings()) {
      sources.push({ x: building.x, y: building.y, radius: 5 });
    }

    for (const unit of this.unitManager.getAliveUnits()) {
      sources.push({ x: Math.floor(unit.x), y: Math.floor(unit.y), radius: 3 });
    }

    this.map.computeVisibility(sources);
  }

  private updateVisibilityCulled(): void {
    if (this.state.showFullMap) {
      this.map.setAllVisible();
      return;
    }

    const sources: Array<{ x: number; y: number; radius: number }> = [];

    // Only include buildings near the view
    for (const building of this.economy.getCompleteBuildings()) {
      if (this.viewCuller.isWithinView(building.x, building.y)) {
        sources.push({ x: building.x, y: building.y, radius: 5 });
      }
    }

    // Only include units near the view
    for (const unit of this.unitManager.getAliveUnits()) {
      const ux = Math.floor(unit.x);
      const uy = Math.floor(unit.y);
      if (this.viewCuller.isWithinView(ux, uy)) {
        sources.push({ x: ux, y: uy, radius: 3 });
      }
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

  // ── Save / Load ──────────────────────────────────────────────

  save(): boolean {
    return SaveManager.save(this.state, this.map, this.economy, this.unitManager);
  }

  load(): boolean {
    const data = SaveManager.load();
    if (!data) return false;
    // Restore game state
    this.state = { ...data.gameState, isPaused: true };
    // Replace map, economy, unitManager
    this.map = SaveManager.restoreMap(data);
    this.economy = SaveManager.restoreEconomy(data);
    this.unitManager = SaveManager.restoreUnits(data);
    // Re-create AI systems with new instances
    this.workerAI = new WorkerAI(this.economy, this.unitManager, this.map);
    this.combatAI = new CombatAI(this.unitManager);
    this.territoryManager = new TerritoryManager(this.map, this.unitManager, this.economy);
    this.tickAccumulator = 0;
    return true;
  }

  hasSave(): boolean {
    return SaveManager.hasSave();
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