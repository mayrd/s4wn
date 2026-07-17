/**
 * S4WN Babylon.js/TypeScript - HUD Manager
 *
 * Manages the Heads-Up Display (HTML overlay) showing game stats
 * and providing in-game action buttons (save, menu).
 */

import { GameLoop } from '../game/GameLoop';

const TOAST_DURATION = 2000;

export class HUD {
  private container: HTMLElement;
  private toastEl: HTMLElement | null = null;

  constructor(gameLoop: GameLoop) {
    this.container = document.getElementById('ui-overlay')!;
    this.createHUD(gameLoop);
    this.updateLoop(gameLoop);
  }

  private createHUD(gameLoop: GameLoop): void {
    const hud = document.createElement('div');
    hud.id = 'hud-container';
    hud.className = 'hud-container';
    hud.innerHTML = `
      <div class="hud-panel" id="stats-panel">
        <div class="hud-title">Game Stats</div>
        <div class="hud-stat">Time: <span id="hud-time">0s</span></div>
      </div>
      <div class="hud-actions">
        <button class="hud-btn" id="btn-save-game" title="Save Game">💾</button>
      </div>
    `;
    this.container.appendChild(hud);

    // Save button
    hud.querySelector('#btn-save-game')?.addEventListener('click', () => {
      if (gameLoop.save()) {
        this.showToast('Game saved!');
      } else {
        this.showToast('Save failed');
      }
    });

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      .hud-container {
        position: absolute;
        top: 10px;
        left: 10px;
        width: 150px;
        height: 130px;
        pointer-events: none;
        z-index: 20;
      }
      .hud-panel {
        background: #5d4037;
        border: 2px solid #d2b48c;
        border-radius: 8px;
        padding: 10px;
        color: #f4e4bc;
        font-family: 'Georgia', serif;
        min-width: 150px;
        height: 66px;
        box-sizing: border-box;
        pointer-events: auto;
        margin-bottom: 6px;
      }
      .hud-title {
        font-weight: bold;
        font-size: 1.1rem;
        border-bottom: 1px solid #d2b48c;
        margin-bottom: 5px;
        padding-bottom: 2px;
        height: 22px;
        box-sizing: border-box;
        overflow: hidden;
      }
      .hud-stat {
        font-size: 0.9rem;
        height: 18px;
        box-sizing: border-box;
        overflow: hidden;
      }
      .hud-actions {
        pointer-events: auto;
        display: flex;
        gap: 6px;
      }
      .hud-btn {
        background: #5d4037;
        border: 2px solid #d2b48c;
        border-radius: 6px;
        color: #f4e4bc;
        font-size: 1.2rem;
        width: 48px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        cursor: pointer;
        transition: background 0.2s;
      }
      .hud-btn:hover {
        background: #8b5a2b;
      }
      .toast {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: #281810;
        color: #f4e4bc;
        border: 1px solid #d2b48c;
        border-radius: 6px;
        padding: 10px 24px;
        font-family: 'Georgia', serif;
        font-size: 1rem;
        z-index: 999;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      .toast.show { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  /* ── Tutorial Hooks ───────────────────────────────────────── */

  lockAllMenus(): void {
    this.container.querySelectorAll('.hud-btn').forEach(btn => {
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLElement).style.opacity = '0.5';
      (btn as HTMLElement).style.pointerEvents = 'none';
    });
  }

  unlockSpecificMenu(menuId: string): void {
    const btn = document.getElementById(menuId) as HTMLButtonElement;
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }

  highlightButton(buttonId: string): void {
    const btn = document.getElementById(buttonId) as HTMLElement;
    if (btn) {
      btn.style.boxShadow = '0 0 10px 2px #fff';
    }
  }

  /* ── Toast ───────────────────────────────────────────────── */

  private showToast(message: string): void {
    if (this.toastEl) {
      this.toastEl.remove();
    }
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast';
    this.toastEl.textContent = message;
    document.body.appendChild(this.toastEl);

    requestAnimationFrame(() => {
      if (this.toastEl) this.toastEl.classList.add('show');
    });

    setTimeout(() => {
      if (this.toastEl) {
        this.toastEl.classList.remove('show');
        setTimeout(() => {
          if (this.toastEl) {
            this.toastEl.remove();
            this.toastEl = null;
          }
        }, 300);
      }
    }, TOAST_DURATION);
  }

  /* ── Update Loop ──────────────────────────────────────────── */

  private updateLoop(gameLoop: GameLoop): void {
    const update = () => {
      const stats = gameLoop.getStats();
      const timeEl = document.getElementById('hud-time');
      const menuTimeEl = document.getElementById('menu-time');
      
      const newTime = Math.floor(stats.gameTime).toString() + 's';
      
      if (timeEl && timeEl.textContent !== newTime) {
        timeEl.textContent = newTime;
      }
      if (menuTimeEl && menuTimeEl.textContent !== `Time: ${newTime}`) {
        menuTimeEl.textContent = `Time: ${newTime}`;
      }
      
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}
