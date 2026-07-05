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
import './ui/styles.css';

// ── Babylon.js Scene Setup ────────────────────────────────────────
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

scene.clearColor = new Color4(0.5, 0.7, 1.0, 1.0);

// ── Create Game Systems ──────────────────────────────────────────
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
const gameLoop = new GameLoop(map);
new UIManager();

// Listen for game start event
window.addEventListener('game-start', () => {
    gameLoop.state.isPaused = false;
    new HUD(gameLoop);
    new DebugPanel(document, engine, gameLoop);
});

// ── Create Terrain ────────────────────────────────────────────────
const terrainRenderer = new TerrainRenderer(scene, map);
terrainRenderer.createTerrain();
map.setAllVisible();

// ── Create Water Plane ───────────────────────────────────────────
const waterRenderer = new WaterPlane(scene, MAP_WIDTH, MAP_HEIGHT);
waterRenderer.createWaterPlane();
const waterPlane = waterRenderer.getMesh();

// ── Lighting & Shadows ───────────────────────────────────────────
const shadowPipeline = new ShadowPipeline(scene);
shadowPipeline.init();

// Add terrain to shadow caster
const terrainMesh = terrainRenderer.getMesh();
if (terrainMesh) {
  shadowPipeline.addShadowCaster(terrainMesh);
}

// ── Create Buildings ──────────────────────────────────────────────
const buildingRenderer = new BuildingMesh(scene);
const buildingData: Array<{ kind: string; x: number; y: number }> = [
    { kind: 'headquarters', x: 0, y: 0 },
];

// We use an async IIFE to handle the building creation
(async () => {
    for (const b of buildingData) {
        const buildingMesh = await buildingRenderer.createBuilding(b.kind, b.x, b.y, 2, 2, 2);
        if (buildingMesh) {
            // Link to economy via gameLoop
            gameLoop.economy.tryPlaceBuilding(b.kind as any, b.x, b.y, map, 0);
            // Add to shadow pipeline
            shadowPipeline.addShadowCaster(buildingMesh);
        }
    }
})();

// ── Setup Camera ─────────────────────────────────────────────────
const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 30, Vector3.Zero(), scene);
camera.setTarget(Vector3.Zero());
camera.lowerRadiusLimit = 10;
camera.upperRadiusLimit = 100;
scene.activeCamera = camera;

const particleSystem = new ParticleSystem(scene);

// ── Start Game Loop ──────────────────────────────────────────────
engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000; // Use seconds for GameLoop.update

    gameLoop.update(dt);
    particleSystem.update(dt);
    scene.render();
});

// ── Cleanup on Unload ────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
    if (waterPlane) waterPlane.dispose();
    shadowPipeline.dispose();
    particleSystem.dispose();
    // Building cleanup would happen via buildingRenderer or gameLoop
});
