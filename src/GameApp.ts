/**
 * S4WN Babylon.js/TypeScript - Game Application (DEBUG: terrain-only test)
 *
 * Stripped to absolute minimum to isolate the terrain rendering bug.
 * Creates only: engine, scene, camera, magenta ground plane.
 * No UIManager, no GameLoop, no buildings, no shadows, no particles.
 */

import { Engine, Scene, ArcRotateCamera, Vector3, Color4, MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core';

export class GameApp {
  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);

    // Engine
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.5, 0.7, 1.0, 1.0);

    // Terrain — magenta ground plane, 100×100 at y=0
    const ground = MeshBuilder.CreateGround('gnd', { width: 100, height: 100 }, scene);
    const mat = new StandardMaterial('gndM', scene);
    mat.diffuseColor = new Color3(1, 0, 1);
    mat.emissiveColor = new Color3(0.3, 0, 0.3);
    mat.backFaceCulling = false;
    ground.material = mat;
    ground.position = new Vector3(50, 0, 50);

    // Diagnostic: small red sphere at center, visible from above
    const sphere = MeshBuilder.CreateSphere('diag', { diameter: 2 }, scene);
    sphere.position = new Vector3(50, 3, 50);
    const smat = new StandardMaterial('smat', scene);
    smat.diffuseColor = new Color3(1, 0, 0);
    smat.emissiveColor = new Color3(0.5, 0, 0);
    sphere.material = smat;

    console.log('🧪 DEBUG: terrain=', !!ground, 'verts=', ground.getTotalVertices(), 'sphere=', !!sphere);

    // Camera
    const cam = new ArcRotateCamera('cam', -Math.PI/4, Math.PI/4, 70, new Vector3(50, 1, 50), scene);
    cam.lowerRadiusLimit = 5;
    cam.upperRadiusLimit = 200;
    scene.activeCamera = cam;

    // Render loop
    engine.runRenderLoop(() => scene.render());
    console.log('🧪 Render loop started — scene meshes:', scene.meshes?.length ?? '?');
  }
}
