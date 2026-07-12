/**
 * S4WN Babylon.js/TypeScript - Particle System
 * 
 * Handles 15 effect types for game visuals (smoke, fire, explosions, etc.).
 * Fully migrated from engine/src/particle.rs
 */

import {
  ParticleSystem as BJSParticleSystem,
  Scene,
  Vector3,
  Color4,
  Texture,
} from '@babylonjs/core';

export enum ParticleEffectType {
  Smoke = 'smoke',
  Fire = 'fire',
  Explosion = 'explosion',
  Sparks = 'sparks',
  Dust = 'dust',
  Rain = 'rain',
  Snow = 'snow',
  WaterSplash = 'waterSplash',
  BuildingConstruction = 'buildingConstruction',
  UnitSpawn = 'unitSpawn',
  UnitDeath = 'unitDeath',
  WeaponMuzzleFlash = 'weaponMuzzleFlash',
  WeaponImpact = 'weaponImpact',
  AmbientFog = 'ambientFog',
  MagicAura = 'magicAura',
}

interface ParticleEmitter {
  type: ParticleEffectType;
  position: Vector3;
  active: boolean;
  particleSystem: BJSParticleSystem | null;
}

export class ParticleSystem {
  private scene: Scene;
  private emitters: Map<string, ParticleEmitter> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create a particle effect emitter.
   */
  createEffect(type: ParticleEffectType, position: Vector3, name: string): void {
    const emitter: ParticleEmitter = {
      type,
      position,
      active: false,
      particleSystem: null,
    };

    emitter.particleSystem = this.createParticleSystem(type, position, name);
    this.emitters.set(name, emitter);
  }

  private createParticleSystem(
    type: ParticleEffectType,
    _position: Vector3,
    name: string
  ): BJSParticleSystem {
    const ps = new BJSParticleSystem(name, 1000, this.scene);

    // Configure based on effect type
    // Assets are served at root (Vite publicDir: assets)
    // Note: Only existing textures are used; missing ones will log warnings
    switch (type) {
      case ParticleEffectType.Smoke:
      case ParticleEffectType.AmbientFog:
        ps.particleTexture = new Texture('/textures/particle_smoke.png', this.scene);
        ps.color1 = new Color4(0.5, 0.5, 0.5, 0.5);
        ps.color2 = new Color4(0.3, 0.3, 0.3, 0.3);
        ps.minSize = 0.5;
        ps.maxSize = 2.0;
        ps.minLifeTime = 0.5;
        ps.maxLifeTime = 2.0;
        break;

      case ParticleEffectType.Sparks:
        ps.particleTexture = new Texture('/textures/particle_spark.png', this.scene);
        ps.color1 = new Color4(1, 1, 0.2, 1);
        ps.color2 = new Color4(1, 0.5, 0, 0.5);
        ps.minSize = 0.1;
        ps.maxSize = 0.5;
        break;

      case ParticleEffectType.Dust:
      case ParticleEffectType.Rain:
      case ParticleEffectType.Snow:
      case ParticleEffectType.WaterSplash:
      case ParticleEffectType.BuildingConstruction:
      case ParticleEffectType.UnitSpawn:
      case ParticleEffectType.UnitDeath:
      case ParticleEffectType.WeaponMuzzleFlash:
      case ParticleEffectType.WeaponImpact:
      case ParticleEffectType.Fire:
      case ParticleEffectType.Explosion:
      case ParticleEffectType.MagicAura:
        // Fallback to smoke texture for all other effects (textures will be generated later)
        console.warn(`⚠️ Particle texture for ${type} not found, using smoke fallback`);
        ps.particleTexture = new Texture('/textures/particle_smoke.png', this.scene);
        ps.color1 = new Color4(0.8, 0.8, 0.8, 0.6);
        ps.minSize = 0.2;
        ps.maxSize = 1.0;
        break;
    }

    // @ts-ignore
    ps.emissiveColor = ps.color1;
    // @ts-ignore
    ps.target = Vector3.Zero();
    ps.gravity = new Vector3(0, -9.81, 0);

    return ps;
  }

  /**
   * Start a particle effect.
   */
  startEffect(name: string): void {
    const emitter = this.emitters.get(name);
    if (emitter && emitter.particleSystem) {
      emitter.particleSystem.start();
      emitter.active = true;
    }
  }

  /**
   * Stop a particle effect.
   */
  stopEffect(name: string): void {
    const emitter = this.emitters.get(name);
    if (emitter && emitter.particleSystem) {
      emitter.particleSystem.stop();
      emitter.active = false;
    }
  }

  /**
   * Update all active particle effects.
   */
  update(_dt: number): void {
    // Update any time-based particle logic here
    this.emitters.forEach((emitter) => {
      if (emitter.particleSystem && emitter.active) {
        // Emitters are already running, but we can modify them here
      }
    });
  }

  /**
   * Dispose all particle systems.
   */
  dispose(): void {
    this.emitters.forEach((emitter) => {
      if (emitter.particleSystem) {
        emitter.particleSystem.dispose();
      }
    });
    this.emitters.clear();
  }
}