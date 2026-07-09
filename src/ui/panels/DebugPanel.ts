/**
 * S4WN Babylon.js/TypeScript - Debug Panel
 * 
 * Real-time game statistics and coordinate tile inspection.
 */

import { Engine } from '@babylonjs/core';
import { GameLoop } from '../../game/GameLoop';

export class DebugPanel {
  private container: HTMLElement;
  private inspectResult!: HTMLElement;

  constructor(document: Document, engine: Engine, gameLoop: GameLoop) {
    this.container = document.createElement('div');
    this.container.className = 'debug-panel';
    document.body.appendChild(this.container);

    this.createContent(gameLoop);
    this.startUpdateLoop(engine, gameLoop);
  }

  private createContent(gameLoop: GameLoop): void {
    this.container.innerHTML = `
      <div class="debug-title">Debug Console</div>
      <div class="debug-stat-row"><span>FPS:</span> <span id="debug-fps">0</span></div>
      <div class="debug-stat-row"><span>Ticks:</span> <span id="debug-ticks">0</span></div>
      <div class="debug-stat-row"><span>Game Time:</span> <span id="debug-time">0s</span></div>
      <div class="debug-stat-row"><span>Units:</span> <span id="debug-units">0</span></div>
      <div class="debug-stat-row"><span>Buildings:</span> <span id="debug-buildings">0</span></div>
      <div class="debug-stat-row"><span>Engine:</span> <span id="debug-engine">Babylon.js</span></div>
      <hr class="debug-divider" />
      <div class="debug-title" style="font-size:0.85rem;margin-top:4px">Tile Inspector</div>
      <div style="display:flex;gap:4px;margin:4px 0">
        <input type="text" id="debug-tile-x" placeholder="x" style="width:40px;padding:2px;font-size:0.7rem" />
        <input type="text" id="debug-tile-y" placeholder="y" style="width:40px;padding:2px;font-size:0.7rem" />
        <button id="debug-tile-go" style="padding:2px 6px;font-size:0.7rem;cursor:pointer">Inspect</button>
      </div>
      <div id="debug-tile-result" style="font-size:0.7rem;line-height:1.4;max-height:120px;overflow-y:auto;margin-top:4px"></div>
    `;

    const xInput = this.container.querySelector('#debug-tile-x') as HTMLInputElement;
    const yInput = this.container.querySelector('#debug-tile-y') as HTMLInputElement;
    const goBtn  = this.container.querySelector('#debug-tile-go') as HTMLButtonElement;
    this.inspectResult = this.container.querySelector('#debug-tile-result') as HTMLElement;

    const inspect = () => {
      const x = parseInt(xInput.value.trim(), 10);
      const y = parseInt(yInput.value.trim(), 10);
      this.inspectTile(gameLoop, x, y);
    };
    goBtn.addEventListener('click', inspect);
    xInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') inspect(); });
    yInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') inspect(); });
  }

  private inspectTile(gameLoop: GameLoop, x: number, y: number): void {
    if (isNaN(x) || isNaN(y)) {
      this.inspectResult.innerHTML = '<span style="color:#f88">Enter both x and y</span>';
      return;
    }
    const tile = gameLoop.map.get(x, y);
    if (!tile) {
      this.inspectResult.innerHTML = `<span style="color:#f88">Tile (${x},${y}) not found on map</span>`;
      return;
    }
    this.inspectResult.innerHTML = `
      <div><b>${tile.terrain}</b> (${x},${y})</div>
      <div>Elevation: ${tile.elevation.toFixed(2)}</div>
      <div>Resource: ${tile.resource?.toString() ?? 'none'}</div>
      <div>Visibility: ${tile.visibility.toFixed(2)}</div>
      <div>Territory: ${tile.territory}</div>
    `;
  }

  private startUpdateLoop(engine: Engine, gameLoop: GameLoop): void {
    const update = () => {
      const stats = gameLoop.getStats();
      const fpsElement = document.getElementById('debug-fps');
      const ticksElement = document.getElementById('debug-ticks');
      const timeElement = document.getElementById('debug-time');
      const unitsElement = document.getElementById('debug-units');
      const buildingsElement = document.getElementById('debug-buildings');

      if (fpsElement) fpsElement.textContent = Math.round(engine.getFps()).toString();
      if (ticksElement) ticksElement.textContent = stats.ticks.toString();
      if (timeElement) timeElement.textContent = Math.floor(stats.gameTime).toString() + 's';
      if (unitsElement) unitsElement.textContent = gameLoop.unitManager.getAliveUnits().length.toString();
      if (buildingsElement) buildingsElement.textContent = gameLoop.economy.getCompleteBuildings().length.toString();

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
