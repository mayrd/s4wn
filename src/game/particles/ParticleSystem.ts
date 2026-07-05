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
    switch (type) {
      case ParticleEffectType.Smoke:
        ps.particleTexture = new Texture(
          './assets/textures/particle_smoke.png',
          this.scene
        );
        ps.color1 = new Color4(0.5, 0.5, 0.5, 0.5);
        ps.color2 = new Color4(0.3, 0.3, 0.3, 0.3);
        ps.minSize = 0.5;
        ps.maxSize = 2.0;
        ps.minLifeTime = 0.5;
        ps.maxLifeTime = 2.0;
        break;

      case ParticleEffectType.Fire:
        ps.particleTexture = new Texture(
          './assets/textures/particle_fire.png',
          this.scene
        );
        ps.color1 = new Color4(1, 0.5, 0, 0.8);
        ps.color2 = new Color4(1, 0.2, 0, 0.4);
        ps.minSize = 0.3;
        ps.maxSize = 1.0;
        ps.minLifeTime = 0.3;
        ps.maxLifeTime = 1.0;
        break;

      case ParticleEffectType.Explosion:
        ps.particleTexture = new Texture(
          './assets/textures/particle_explosion.png',
          this.scene
        );
        ps.color1 = new Color4(1, 0.8, 0, 1);
        ps.color2 = new Color4(1, 0.3, 0, 0.5);
        ps.minSize = 0.2;
        ps.maxSize = 3.0;
        ps.minLifeTime = 0.2;
        ps.maxLifeTime = 1.5;
        break;

      case ParticleEffectType.Sparks:
        ps.particleTexture = new Texture(
          './assets/textures/particle_spark.png',
          this.scene
        );
        ps.color1 = new Color4(1, 1, 0.2, 1);
        ps.color2 = new Color4(1, 0.5, 0, 0.5);
        ps.minSize = 0.1;
        ps.maxSize = 0.5;
        break;

      case ParticleEffectType.Dust:
        ps.particleTexture = new Texture(
          './assets/textures/particle_dust.png',
          this.scene
        );
        ps.color1 = new Color4(0.6, 0.5, 0.3, 0.6);
        ps.color2 = new Color4(0.4, 0.3, 0.2, 0.3);
        ps.minSize = 0.5;
        ps.maxSize = 1.5;
        break;

      case ParticleEffectType.Rain:
        ps.particleTexture = new Texture(
          './assets/textures/particle_rain.png',
          this.scene
        );
        ps.color1 = new Color4(0.7, 0.7, 1, 0.3);
        ps.minSize = 0.1;
        ps.maxSize = 0.2;
        ps.minLifeTime = 1.0;
        ps.maxLifeTime = 2.0;
        break;

      case ParticleEffectType.Snow:
        ps.particleTexture = new Texture(
          './assets/textures/particle_snow.png',
          this.scene
        );
        ps.color1 = new Color4(1, 1, 1, 0.8);
        ps.minSize = 0.2;
        ps.maxSize = 0.5;
        break;

      case ParticleEffectType.WaterSplash:
        ps.particleTexture = new Texture(
          './assets/textures/particle_water.png',
          this.scene
        );
        ps.color1 = new Color4(0.5, 0.7, 1, 0.7);
        ps.minSize = 0.3;
        ps.maxSize = 1.0;
        break;

      case ParticleEffectType.BuildingConstruction:
        ps.particleTexture = new Texture(
          './assets/textures/particle_construction.png',
          this.scene
        );
        ps.color1 = new Color4(0.8, 0.8, 0.9, 0.6);
        ps.minSize = 0.5;
        ps.maxSize = 1.0;
        break;

      case ParticleEffectType.UnitSpawn:
        ps.particleTexture = new Texture(
          './assets/textures/particle_spawn.png',
          this.scene
        );
        ps.color1 = new Color4(0.5, 1, 0.5, 0.7);
        ps.minSize = 0.3;
        ps.maxSize = 0.8;
        break;

      case ParticleEffectType.UnitDeath:
        ps.particleTexture = new Texture(
          './assets/textures/particle_death.png',
          this.scene
        );
        ps.color1 = new Color4(0.8, 0.2, 0.2, 0.8);
        ps.minSize = 0.2;
        ps.maxSize = 1.5;
        break;

      case ParticleEffectType.WeaponMuzzleFlash:
        ps.particleTexture = new Texture(
          './assets/textures/particle_flash.png',
          this.scene
        );
        ps.color1 = new Color4(1, 0.8, 0.3, 1);
        ps.minSize = 0.5;
        ps.maxSize = 1.0;
        ps.minLifeTime = 0.05;
        ps.maxLifeTime = 0.1;
        break;

      case ParticleEffectType.WeaponImpact:
        ps.particleTexture = new Texture(
          './assets/textures/particle_impact.png',
          this.scene
        );
        ps.color1 = new Color4(0.8, 0.6, 0.2, 0.9);
        ps.minSize = 0.3;
        ps.maxSize = 1.2;
        break;

      case ParticleEffectType.AmbientFog:
        ps.particleTexture = new Texture(
          './assets/textures/particle_fog.png',
          this.scene
        );
        ps.color1 = new Color4(0.8, 0.8, 0.8, 0.1);
        ps.minSize = 2.0;
        ps.maxSize = 5.0;
        ps.minLifeTime = 5.0;
        ps.maxLifeTime = 10.0;
        break;

      case ParticleEffectType.MagicAura:
        ps.particleTexture = new Texture(
          './assets/textures/particle_magic.png',
          this.scene
        );
        ps.color1 = new Color4(0.5, 0.3, 1, 0.6);
        ps.color2 = new Color4(0.3, 0.5, 1, 0.3);
        ps.minSize = 0.5;
        ps.maxSize = 1.5;
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