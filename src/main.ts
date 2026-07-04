/**
 * S4WN Babylon.js/TypeScript - Main Entry Point
 * 
 * Complete game initialization with terrain, water, buildings, units, and particles.
 * Babylon.js engine with ArcRotateCamera for default isometric view.
 */

import { Engine, Scene, Texture } from '@babylonjs/core';
import { HemisphericLight, DirectionalLight, StandardMaterial, PBRMaterial } from '@babylonjs/core/Materials';
import { ArcRotateCamera } from '@babylonjs/core/Camera';
import { Vector3, Color3 } from '@babylonjs/core/Maths/math.vector';

import { Map as GameMap } from './game/Map';
import { UnitManager } from './game/UnitManager';
import { Economy } from './game/Economy';
import { Nation } from './game/Nation';
import { WorkerAI, SoldierAI, ArcherAI } from './game/AI';

// ── Babylon.js Scene Setup ────────────────────────────────────────
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

scene.clearColor = new Color3(0.5, 0.7, 1.0);

// ── Create Game Systems ──────────────────────────────────────────
const map = new GameMap(scene);
const economy = new Economy();
const nations: Nation[] = [new Nation(), new Nation()];
const unitManager = new UnitManager(economy, nations[0], nations[1]);

// Set initial worker units for each nation
for (let i = 0; i < 3; i++) {
    const worker = unitManager.spawnWorker(nations[i].id, -5 + i * 20, 0);
    unitManager.setUnitProperty(worker, 'idle', true);
}

// ── Create Terrain (Grass Plane) ──────────────────────────────────
const grassMaterial = new StandardMaterial('grassMat', scene);
grassMaterial.diffuseColor = new Color3(0.35, 0.68, 0.19); // Green
grassMaterial.diffuseTexture = new Texture('./assets/textures/grass.png', scene);
grassMaterial.diffuseTexture.hasAlpha = true;

const terrainMesh = map.createGroundPlane(grassMaterial);
map.setAllVisible();

// ── Create Water Plane ───────────────────────────────────────────
const waterMaterial = new StandardMaterial('waterMat', scene);
waterMaterial.diffuseColor = new Color3(0.2, 0.5, 0.8); // Blue
waterMaterial.alpha = 0.4;

const waterPlane = map.createWaterPlane(waterMaterial);

// ── Create Buildings from JSON data ───────────────────────────────
const buildingData: Array<{ kind: string; x: number; y: number }> = [
    { kind: 'headquarters', x: 0, y: 0 },
];

for (const b of buildingData) {
    const building = map.createBuilding(b.kind, b.x, b.y);
    if (building) {
        economy.tryPlaceBuilding(building.data.index as any, b.x, b.y, map);
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

// ── Start Game Loop ──────────────────────────────────────────────
engine.runRenderLoop(() => {
    const dt = engine.getDeltaTime() / 16.67; // Normalize to ~60fps

    if (economy.tick(dt)) {
        unitManager.tick(dt);
        map.tick(dt);
        
        for (const nation of nations) {
            WorkerAI.tick(nation, unitManager, dt);
            SoldierAI.tick(nation, unitManager, dt);
            ArcherAI.tick(nation, unitManager, dt);
        }
    }
    scene.render();
});

// ── Cleanup on Unload ────────────────────────────────────────────
window.addEventListener('beforeunload', () => {
    if (map) map.dispose();
    if (waterPlane) waterPlane.dispose();
    for (const b of buildingData) {
        const building = map.getBuilding(b.x, b.y);
        if (building && building.mesh) building.mesh.dispose();
    }
});
