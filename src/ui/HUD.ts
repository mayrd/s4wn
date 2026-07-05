/**
 * S4WN Babylon.js/TypeScript - HUD Manager
 * 
 * Manages the Heads-Up Display (HTML overlay) showing game stats.
 */

import { GameLoop } from '../game/GameLoop';

export class HUD {
  private container: HTMLElement;
  private statsElement: HTMLElement;

  constructor(gameLoop: GameLoop) {
    this.container = document.getElementById('ui-overlay')!;
    
    this.createHUD();
    this.updateLoop(gameLoop);
  }

  private createHUD(): void {
    this.container.innerHTML = `
      <div id="hud-container" class="hud-container">
        <div class="hud-panel" id="stats-panel">
          <div class="hud-title">Game Stats</div>
          <div class="hud-stat">Ticks: <span id="hud-ticks">0</span></div>
          <div class="hud-stat">Time: <span id="hud-time">0s</span></div>
        </div>
      </div>
    `;

    // Add some styles via JS for simplicity in this task
    const style = document.createElement('style');
    style.textContent = `
      .hud-container {
        position: absolute;
        top: 10px;
        left: 10px;
        pointer-events: none;
        z-index: 20;
      }
      .hud-panel {
        background: rgba(93, 64, 55, 0.8);
        border: 2px solid #d2b48c;
        border-radius: 8px;
        padding: 10px;
        color: #f4e4bc;
        font-family: 'Georgia', serif;
        min-width: 150px;
        pointer-events: auto;
      }
      .hud-title {
        font-weight: bold;
        font-size: 1.1rem;
        border-bottom: 1px solid #d2b48c;
        margin-bottom: 5px;
        padding-bottom: 2px;
      }
      .hud-stat {
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(style);

    this.statsElement = document.getElementById('stats-panel')!;
  }

  private updateLoop(gameLoop: GameLoop): void {
    const update = () => {
      const stats = gameLoop.getStats();
      document.getElementById('hud-ticks')!.textContent = stats.ticks.toString();
      document.getElementById('hud-time')!.textContent = Math.floor(stats.gameTime).toString() + 's';
      
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}
