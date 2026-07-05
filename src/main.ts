/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 * 
 * Complete game initialization with terrain, water, buildings, units, and particles.
 * Babylon.js engine with ArcRotateCamera for default isometric view.
 */

import { 
  Engine, 
  Scene, 
  ArcRotateCamera, 
  Vector3, 
  Color4 
} from '@babylonjs/core';

import { Map as GameMap } from './game/Map';
import { GameLoop } from './game/GameLoop';
import { TerrainRenderer } from './rendering/TerrainRenderer';
import { WaterPlane } from './rendering/WaterPlane';
import { BuildingMesh } from './rendering/BuildingMesh';
import { UIManager } from './ui/UIManager';
import { ShadowPipeline } from './rendering/pipelines/ShadowPipeline';
import { ParticleSystem } from './game/particles/ParticleSystem';
import { HUD } from './ui/HUD';
import { DebugPanel } from './ui/panels/DebugPanel';
import { GameApp } from './GameApp';
import './ui/styles.css';

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
