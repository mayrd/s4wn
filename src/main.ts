/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 * 
 * Complete game initialization with terrain, water, buildings, units, and particles.
 * Babylon.js engine with ArcRotateCamera for default isometric view.
 */

import { Engine, Scene, Texture, ShadowGenerator } from '@babylonjs/core';
import { HemisphericLight, DirectionalLight, StandardMaterial, PBRMaterial } from '@babylonjs/core/Materials';
import { ArcRotateCamera } from '@babylonjs/core/Camera';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math.vector';

import { Map as GameMap } from './game/Map';
import { GameLoop } from './game/GameLoop';
import { TerrainRenderer } from './rendering/TerrainRenderer';
import { WaterPlane } from './rendering/WaterPlane';
import { BuildingMesh } from './rendering/BuildingMesh';

// ── Babylon.js Scene Setup ────────────────────────────────────────
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

scene.clearColor = new Color3(0.5, 0.7, 1.0);

// ── Create Game Systems ──────────────────────────────────────────
const MAP_WIDTH = 100;
const MAP_HEIGHT = 100;
const map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
const gameLoop = new GameLoop(map);

// ── Create Terrain ────────────────────────────────────────────────
const terrainRenderer = new TerrainRenderer(scene, map);
terrainRenderer.createTerrain();
map.setAllVisible();

// ── Create Water Plane ───────────────────────────────────────────
const waterRenderer = new WaterPlane(scene, MAP_WIDTH, MAP_HEIGHT);
waterRenderer.createWaterPlane();
const waterPlane = waterRenderer.getMesh();

// ── Create Buildings ──────────────────────────────────────────────
const buildingRenderer = new BuildingMesh(scene);
const buildingData: Array<{ kind: string; x: number; y: number }> = [
    { kind: 'headquarters', x: 0, y: 0 },
];

for (const b of buildingData) {
    const buildingMesh = buildingRenderer.createBuilding(b.kind, b.x, b.y, 2, 2, 2);
    if (buildingMesh) {
        // Link to economy via gameLoop
        gameLoop.economy.tryPlaceBuilding(0, b.x, b.y, map);
    }
}

// ── Setup Camera ─────────────────────────────────────────────────
const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 30, Vector3.Zero(), scene);
camera.setTarget(Vector3.Zero());
camera.lowerRadiusLimit = 10;
camera.upperRadiusLimit = 100;
scene.activeCamera = camera;

// ── Lighting ─────────────────────────────────────────────────────
const hemiLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
hemiLight.intensity = 0.6;

const dirLight = new DirectionalLight('dir', new Vector3(-1, -2, -1).normalize(), scene);
dirLight.intensity = 0.5;

// ── Shadows ──────────────────────────────────────────────────────
const shadowGenerator = new ShadowGenerator(1024, dirLight);
shadowGenerator.useBlurExponentialShadowMap = true;
shadowGenerator.blurKernel = 32;

// Add terrain as shadow receiver
if (terrainRenderer.getMesh()) {
    shadowGenerator.addShadowCaster(terrainRenderer.getMesh()); // Terrain usually doesn't cast, but can receive
}

// ── Start Game Loop ──────────────────────────────────────────────
engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 1000; // Use seconds for GameLoop.update

    gameLoop.update(dt);
    scene.render();
});

// ── Cleanup on Unload ────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
    if (map) map.dispose();
    if (waterPlane) waterPlane.dispose();
    for (const b of buildingData) {
        // Building cleanup would happen via buildingRenderer or gameLoop
    }
});
