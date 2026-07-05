/**
 * S4WN Babylon.js/TypeScript - Debug Panel
 * 
 * Provides a side panel with real-time game statistics and engine info.
 */

import { Engine, Scene } from '@babylonjs/core';
import { GameLoop } from '../game/GameLoop';

export class DebugPanel {
  private container: HTMLElement;
  private statsContainer: HTMLElement;

  constructor(document: Document, engine: Engine, gameLoop: GameLoop) {
    this.container = document.createElement('div');
    this.container.className = 'debug-panel';
    document.body.appendChild(this.container);

    this.createContent();
    this.startUpdateLoop(engine, gameLoop);
  }

  private createContent(): void {
    this.container.innerHTML = `
      <div class="debug-title">Debug Console</div>
      <div class="debug-stat-row"><span>FPS:</span> <span id="debug-fps">0</span></div>
      <div class="debug-stat-row"><span>Ticks:</span> <span id="debug-ticks">0</span></div>
      <div class="debug-stat-row"><span>Game Time:</span> <span id="debug-time">0s</span></div>
      <div class="debug-stat-row"><span>Engine:</span> <span id="debug-engine">Babylon.js</span></div>
    `;
    this.statsContainer = this.container;
  }

  private startUpdateLoop(engine: Engine, gameLoop: GameLoop): void {
    const update = () => {
      const stats = gameLoop.getStats();
      const fpsElement = document.getElementById('debug-fps');
      const ticksElement = document.getElementById('debug-ticks');
      const timeElement = document.getElementById('debug-time');

      if (fpsElement) fpsElement.textContent = Math.round(engine.getFps().toString());
      if (ticksElement) ticksElement.textContent = stats.ticks.toString();
      if (timeElement) timeElement.textContent = Math.floor(stats.gameTime).toString() + 's';

      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  public toggle(): void {
    this.container.classList.toggle('hidden');
  }

  public dispose(): void {
    this.container.remove();
  }
}
