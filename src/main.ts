/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 *
 * BOOTSTRAP ONLY. This file must stay lightweight: it initializes global error
 * handling and the splash-screen / main-menu UI (UIManager), then waits for the
 * user to actually start or load a game before pulling in the heavy Babylon.js
 * engine, map, terrain, units and buildings (GameApp).
 *
 * This keeps the initial page load fast — no map or 3D assets are loaded until
 * the player chooses to enter the game. The splash screen is reused to bridge
 * the heavier GameApp initialization if needed.
 */

import { errorHandler } from './core/ErrorHandler';
import { UIManager } from './ui/UIManager';
import './ui/styles.css';

// NOTE: GameApp (and the entire Babylon.js engine) is intentionally NOT imported
// here. It is loaded on demand via dynamic import() below so that the heavy
// 3D engine, map, terrain and asset pipelines are only fetched/parsed once the
// player actually starts or loads a game.

// ── Initialize Global Error Handling ────────────────────────────────
errorHandler.init();

// ── Lightweight Menu Bootstrap (no engine, no map) ──────────────────
const menu = new UIManager();

// Type-only reference used for the lazily-loaded app instance.
type GameAppType = import('./GameApp').GameApp;

// Keep a reference so we can dispose on unload.
let app: GameAppType | null = null;

// ── Lazily start the heavy game only when requested ──────────────────
window.addEventListener('game-start', async (event: Event) => {
  const mode = (event as CustomEvent).detail?.mode ?? 'new';

  // Bridge the (potentially heavy) engine initialization with the splash screen.
  menu.showLoading(mode === 'load' ? 'Restoring your world...' : 'Loading the world...');

  // Defer one frame so the splash screen actually paints before the
  // (potentially large) Babylon.js chunk is fetched over the network.
  window.requestAnimationFrame(async () => {
    try {
      const { GameApp } = await import('./GameApp');
      app = new GameApp('renderCanvas', mode);
      // Hide the splash once the engine is up and rendering.
      menu.hideAll();
      // For global accessibility in debug/cleanup
      (window as any).gameApp = app;
    } catch (err) {
      errorHandler.handleError('GameInit', err);
    }
  });
});

// ── Cleanup on Unload ───────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});