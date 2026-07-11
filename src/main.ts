/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 * 
 * Complete game initialization with terrain, water, buildings, units, and particles.
 * Babylon.js engine with ArcRotateCamera for default isometric view.
 */

import { GameApp } from './GameApp';
import { errorHandler } from './core/ErrorHandler';
import './ui/styles.css';

// ── Initialize Global Error Handling ────────────────────────────────
errorHandler.init();

// ── Initialize Game Application ──────────────────────────────────
const app = new GameApp('renderCanvas');

// Listen for game start event
window.addEventListener('game-start', () => {
    app.gameLoop.state.isPaused = false;
});

// For global accessibility in debug/cleanup
(window as any).gameApp = app;

// ── Cleanup on Unload ────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
    app.dispose();
});
