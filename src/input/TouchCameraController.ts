/**
 * S4WN Touch Camera Controller
 *
 * Configures the Babylon.js ArcRotateCamera for mobile touch input:
 * - Pinch-to-zoom (two fingers)
 * - Two-finger pan (drag to move camera target)
 * - Single-finger rotate (orbit around target)
 *
 * Also syncs the camera target with the GameLoop's ViewCuller
 * so off-screen entity culling tracks the camera position.
 */

import { ArcRotateCamera } from '@babylonjs/core';

export class TouchCameraController {
  private camera: ArcRotateCamera;
  private onViewChange?: (x: number, y: number) => void;

  constructor(camera: ArcRotateCamera, onViewChange?: (x: number, y: number) => void) {
    this.camera = camera;
    this.onViewChange = onViewChange;
    this.configure();
  }

  private configure(): void {
    const c = this.camera;

    // Attach camera to canvas for all input types (mouse + touch)
    c.attachControl(true);

    // Pinch-to-zoom: adjust radius limits for touch zoom speed
    c.pinchPrecision = 2.0;          // Higher = more sensitive pinch zoom
    c.pinchDeltaPercentage = 0.005;  // Smoother zoom steps on mobile
    c.lowerRadiusLimit = 8;          // Allow closer zoom on mobile
    c.upperRadiusLimit = 120;

    // Touch pan: two-finger drag moves the camera target
    c.panningSensibility = 50;       // Pan speed for touch
    c.panningAxis = { x: 1, y: 1, z: 0 }; // Pan in X/Y plane (follow terrain)

    // Touch rotate: single finger orbits camera
    c.angularSensibilityX = 800;     // Rotation sensitivity
    c.angularSensibilityY = 800;

    // Inertia — smoother camera on touch devices
    c.inertia = 0.9;
    c.inertialRadiusOffset = 0;

    // Sync view culler on camera move
    if (this.onViewChange) {
      c.onAfterCheckInputsObservable.add(() => {
        const t = c.target;
        this.onViewChange!(Math.floor(t.x), Math.floor(t.z));
      });
    }
  }

  /** Get the current view center in map coordinates. */
  getViewCenter(): { x: number; y: number } {
    const t = this.camera.target;
    return { x: Math.floor(t.x), y: Math.floor(t.z) };
  }

  /** Dispose the controller (camera lifecycle handled by Babylon). */
  dispose(): void {
    this.camera.detachControl();
  }
}
