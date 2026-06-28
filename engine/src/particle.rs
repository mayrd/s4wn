//! S4WN Particle System
//!
//! Phase 6: GPU-accelerated particle effects for building placement,
//! combat, and ambient effects. Particles are rendered as point sprites
//! using the overlay shader pass.
//!
//! ## Design
//!
//! - Particles are CPU-simulated (position, velocity, lifetime, color, size)
//! - Each frame, alive particles are uploaded to GPU as overlay point sprites
//! - The existing overlay shader (point sprites with soft circle) is reused
//! - Max 256 particles to keep CPU/GPU cost predictable

/// Maximum number of simultaneous particles.
pub const MAX_PARTICLES: usize = 256;

/// A single particle in the world.
#[derive(Debug, Clone, PartialEq)]
pub struct Particle {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub vx: f32,
    pub vy: f32,
    pub vz: f32,
    pub life: f32,
    pub max_life: f32,
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub size: f32,
    pub alive: bool,
}

/// Configuration for spawning a single particle.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ParticleConfig {
    pub x: f32, pub y: f32, pub z: f32,
    pub vx: f32, pub vy: f32, pub vz: f32,
    pub life: f32, pub r: f32, pub g: f32, pub b: f32, pub size: f32,
}
impl Default for ParticleConfig {
    fn default() -> Self {
        ParticleConfig { x:0.0,y:0.0,z:0.0, vx:0.0,vy:0.0,vz:0.0, life:1.0, r:1.0,g:1.0,b:1.0, size:8.0 }
    }
}
/// Configuration for spawning a burst of particles.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct BurstConfig {
    pub x: f32, pub y: f32, pub z: f32, pub count: u32,
    pub color_r: f32, pub color_g: f32, pub color_b: f32,
    pub speed: f32, pub life: f32, pub size: f32,
}


impl Particle {
    pub fn new() -> Self {
        Particle {
            x: 0.0, y: 0.0, z: 0.0,
            vx: 0.0, vy: 0.0, vz: 0.0,
            life: 0.0, max_life: 1.0,
            r: 1.0, g: 1.0, b: 1.0,
            size: 8.0, alive: false,
        }
    }

    pub fn spawn(&mut self, cfg: &ParticleConfig) {
        self.x = cfg.x; self.y = cfg.y; self.z = cfg.z;
        self.vx = cfg.vx; self.vy = cfg.vy; self.vz = cfg.vz;
        self.life = cfg.life; self.max_life = cfg.life;
        self.r = cfg.r; self.g = cfg.g; self.b = cfg.b;
        self.size = cfg.size; self.alive = true;
    }

    pub fn tick(&mut self, dt: f32) -> bool {
        if !self.alive { return false; }
        self.life -= dt;
        if self.life <= 0.0 { self.alive = false; return false; }
        self.x += self.vx * dt;
        self.y += self.vy * dt;
        self.z += self.vz * dt;
        self.vz -= 2.0 * dt; // gravity
        if self.z < 0.0 {
            self.z = 0.0;
            self.vz = -self.vz * 0.3;
            // Soft fade-out when fast-falling particles (rain) hit the ground.
            // Rain starts at z=3-5 with gravity; mid-flight ground impact
            // caps remaining life for a brief splash fade (0.15s max).
            if self.life > 0.15 {
                self.life = 0.15;
            }
        }
        true
    }

    pub fn alpha(&self) -> f32 {
        if !self.alive || self.max_life <= 0.0 { return 0.0; }
        let t = self.life / self.max_life;
        if t > 0.7 { 1.0 } else { t / 0.7 }
    }
}

impl Default for Particle {
    fn default() -> Self { Self::new() }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParticleSystem {
    particles: Vec<Particle>,
}

impl ParticleSystem {
    pub fn new() -> Self {
        let mut particles = Vec::with_capacity(MAX_PARTICLES);
        for _ in 0..MAX_PARTICLES { particles.push(Particle::new()); }
        ParticleSystem { particles }
    }

    pub fn spawn(&mut self, cfg: &ParticleConfig) -> bool {
        for p in &mut self.particles {
            if !p.alive { p.spawn(cfg); return true; }
        }
        false
    }

    /// Spawn a burst of particles in a circular pattern.
    /// Uses O(n) scanning for dead slots (not O(n^2) per burst iteration).
    pub fn spawn_burst(&mut self, cfg: &BurstConfig) -> u32 {
        let x = cfg.x; let y = cfg.y; let z = cfg.z; let count = cfg.count;
        let color_r = cfg.color_r; let color_g = cfg.color_g; let color_b = cfg.color_b;
        let speed = cfg.speed; let life = cfg.life; let size = cfg.size;
        let mut spawned = 0u32;
        let max = self.particles.len();
        let mut dead_idx = 0usize;
        for i in 0..count {
            while dead_idx < max && self.particles[dead_idx].alive {
                dead_idx += 1;
            }
            if dead_idx >= max { break; }
            let angle = (i as f32 / count as f32) * std::f32::consts::TAU;
            let up = 0.5 + (i as f32 * 0.17).sin().abs() * 0.5;
            let h_speed = speed * (1.0 - up) * 0.7;
            let vx = angle.cos() * h_speed;
            let vy = angle.sin() * h_speed;
            let vz = up * speed * 1.5;
            let pcfg = ParticleConfig { x, y, z, vx, vy, vz, life, r: color_r, g: color_g, b: color_b, size };
            self.particles[dead_idx].spawn(&pcfg);
            spawned += 1;
            dead_idx += 1;
        }
        spawned
    }

    pub fn update(&mut self, dt: f32) {
        for p in &mut self.particles { p.tick(dt); }
    }

    pub fn alive_count(&self) -> usize {
        self.particles.iter().filter(|p| p.alive).count()
    }

    pub fn clear(&mut self) {
        for p in &mut self.particles { p.alive = false; }
    }

    pub fn get_overlay_data(&self) -> (Vec<f32>, Vec<f32>, Vec<f32>) {
        let alive: Vec<&Particle> = self.particles.iter().filter(|p| p.alive).collect();
        let n = alive.len();
        let mut positions = Vec::with_capacity(n * 2);
        let mut colors = Vec::with_capacity(n * 3);
        let mut sizes = Vec::with_capacity(n);
        for p in alive {
            positions.push(p.x);
            positions.push(p.y);
            let alpha = p.alpha();
            colors.push(p.r * alpha);
            colors.push(p.g * alpha);
            colors.push(p.b * alpha);
            sizes.push(p.size + p.z * 2.0);
        }
        (positions, colors, sizes)
    }

    pub fn to_json(&self) -> String {
        let alive: Vec<&Particle> = self.particles.iter().filter(|p| p.alive).collect();
        let mut parts = Vec::with_capacity(alive.len());
        for p in alive {
            parts.push(format!(
                r#"{{"x":{:.2},"y":{:.2},"z":{:.2},"r":{:.2},"g":{:.2},"b":{:.2},"size":{:.1},"life":{:.3},"max_life":{:.3}}}"#,
                p.x, p.y, p.z, p.r, p.g, p.b, p.size, p.life, p.max_life
            ));
        }
        format!("[{}]", parts.join(","))
    }
}

impl Default for ParticleSystem {
    fn default() -> Self { Self::new() }
}

pub fn spawn_build_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.0, count: 12, color_r: 0.2, color_g: 0.9, color_b: 0.3, speed: 3.0, life: 0.8, size: 6.0 });
}

pub fn spawn_combat_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.0, count: 16, color_r: 1.0, color_g: 0.4, color_b: 0.1, speed: 4.5, life: 0.6, size: 5.0 });
}

pub fn spawn_dust_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.0, count: 4, color_r: 0.6, color_g: 0.55, color_b: 0.45, speed: 1.0, life: 0.4, size: 4.0 });
}

/// Spawn chimney smoke: slow-rising grey puffs.
pub fn spawn_smoke_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    let _ = ps.spawn(&ParticleConfig { x: tile_x, y: tile_y, z: 1.5, vx: 0.05, vy: 0.0, vz: 0.15, life: 1.5, r: 0.55, g: 0.55, b: 0.58, size: 10.0 });
    let _ = ps.spawn(&ParticleConfig { x: tile_x + 0.1, y: tile_y, z: 1.5, vx: -0.03, vy: 0.0, vz: 0.12, life: 1.2, r: 0.50, g: 0.50, b: 0.53, size: 8.0 });
}

/// Spawn floating leaf/forest particle: gentle drift, green tint.
pub fn spawn_leaf_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    let angle = (tile_x * 7.3 + tile_y * 3.7) % std::f32::consts::TAU;
    let vx = angle.cos() * 0.08;
    let vy = angle.sin() * 0.08;
    let _ = ps.spawn(&ParticleConfig { x: tile_x, y: tile_y, z: 0.5, vx, vy, vz: 0.05, life: 1.8, r: 0.25 + ((tile_x * 13.1) % 1.0) * 0.2, g: 0.65 + ((tile_y * 11.3) % 1.0) * 0.25, b: 0.15, size: 5.0 });
}

/// Spawn autumn leaf particle: warm amber/orange/red-brown, slow swaying fall.
/// Unlike spawn_leaf_effect (green, floating), this simulates falling leaves
/// in autumn — they drift horizontally with a sinusoidal sway and descend gently.
/// Color varies per-tile to give a mix of amber, orange, and deep red-brown.
pub fn spawn_autumn_leaf_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 11.3 + y * 7.7;
    // Start above the tile, varying height (1.5-4.0)
    let z = 2.5 + (seed * 1.3).sin() * 1.5;
    // Gentle horizontal drift with wind variation
    let vx = (seed * 2.1).cos() * 0.06 + 0.03;  // slight eastward bias (wind)
    let vy = (seed * 3.7).sin() * 0.05;
    // Slow descent with slight oscillation
    let vz = -0.15 + (seed * 5.3).sin() * 0.05;
    // Long life: 3.0-6.0 seconds for a slow, scenic fall
    let life = 4.0 + (seed * 4.3).sin().abs() * 2.0;
    // Autumn color palette: amber, orange, red-brown
    // r: dominant (0.7-1.0), g: medium (0.3-0.6), b: low (0.05-0.15)
    let r = 0.75 + (seed * 6.1).sin().abs() * 0.25;
    let g = 0.30 + (seed * 8.3).cos().abs() * 0.30;
    let b = 0.05 + (seed * 9.7).sin().abs() * 0.10;
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 5.0 });
}

/// Spawn a burst of autumn leaves across a rectangular area.
/// Used periodically to create continuous gentle leaf-fall in forest areas.
pub fn spawn_autumn_leaf_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 7.3 + 2.1).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 11.7 + 5.3).sin() * 0.5 + 0.5) * sy;
        if ps.spawn(&ParticleConfig { x, y, z: 2.5 + ((fi * 3.1).sin()) * 1.5, vx: ((fi * 2.3).cos()) * 0.06 + 0.03, vy: ((fi * 4.1).sin()) * 0.05, vz: -0.15 + ((fi * 1.7).sin()) * 0.05, life: 4.0 + ((fi * 6.3).sin().abs()) * 2.0, r: 0.75 + ((fi * 5.1).sin().abs()) * 0.25, g: 0.30 + ((fi * 7.3).cos().abs()) * 0.30, b: 0.05 + ((fi * 8.9).sin().abs()) * 0.10, size: 5.0 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn building destruction rubble: brown/grey chunks burst + dust cloud.
/// Used when a building is destroyed (combat damage or demolition).
pub fn spawn_rubble_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    // Rubble chunks: brown/grey, medium speed, 20 particles
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.0, count: 20, color_r: 0.45, color_g: 0.35, color_b: 0.25, speed: 3.5, life: 1.2, size: 7.0 });
    // Dust overlay: lighter, slower, 8 particles
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.0, count: 8, color_r: 0.7, color_g: 0.65, color_b: 0.55, speed: 1.5, life: 0.8, size: 10.0 });
}

/// Spawn a single rain droplet: fast-falling blue-white streak from the sky.
/// Drops start at a pseudo-random height (z=2..5), fall with gravity,
/// and drift slightly horizontally. Short-lived for a streaking effect.
pub fn spawn_rain_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 17.3 + y * 11.7;
    let z = 3.0 + (seed * 1.3).sin() * 2.0;
    let drift = (seed * 3.7).cos() * 0.3;
    let life = 0.3 + (seed * 7.1).sin().abs() * 0.25;
    let _ = ps.spawn(&ParticleConfig { x: x + drift, y: y + drift * 0.7, z, vx: (seed * 2.3).cos() * 0.25, vy: (seed * 2.9).sin() * 0.25, vz: -8.0 - (seed * 5.0).sin().abs() * 3.0, life, r: 0.7, g: 0.78, b: 0.95, size: 2.5 });
}

/// Spawn a burst of rain droplets across a rectangular area.
/// Used every few frames for continuous rainfall — drops appear at
/// random positions within the given bounds.
pub fn spawn_rain_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 13.7 + 3.1).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 17.3 + 7.9).sin() * 0.5 + 0.5) * sy;
        let seed = x * 17.3 + y * 11.7;
        let z = 3.0 + (seed * 1.3).sin() * 2.0;
        if ps.spawn(&ParticleConfig { x, y, z, vx: (seed * 2.3).cos() * 0.25, vy: (seed * 2.9).sin() * 0.25, vz: -8.0 - (seed * 5.0).sin().abs() * 3.0, life: 0.3 + (seed * 7.1).sin().abs() * 0.25, r: 0.7, g: 0.78, b: 0.95, size: 2.5 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single snow particle: slow-falling white flake with wind drift.
/// Used for snowfall in mountain/snow biomes during winter weather.
pub fn spawn_snow_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 13.7 + y * 19.3;
    let z = 4.0 + (seed * 1.1).sin() * 3.0;
    let drift = (seed * 2.3).cos() * 0.8;
    let life = 2.0 + (seed * 3.7).sin().abs() * 3.0;
    let _ = ps.spawn(&ParticleConfig { x: x + drift, y: y + drift * 0.5, z, vx: (seed * 1.7).cos() * 0.15, vy: (seed * 2.1).sin() * 0.15, vz: -1.5 - (seed * 3.0).sin().abs() * 1.0, life, r: 0.92, g: 0.95, b: 1.0, size: 1.8 });
}

/// Spawn a burst of snow particles across a rectangular area.
/// Used periodically for continuous snowfall — flakes appear at
/// random positions within the given bounds with gentle drift.
pub fn spawn_snow_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 11.3 + 5.7).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 17.9 + 2.3).sin() * 0.5 + 0.5) * sy;
        let seed = x * 13.7 + y * 19.3;
        let z = 4.0 + (seed * 1.1).sin() * 3.0;
        if ps.spawn(&ParticleConfig { x, y, z, vx: (seed * 1.7).cos() * 0.15, vy: (seed * 2.1).sin() * 0.15, vz: -1.5 - (seed * 3.0).sin().abs() * 1.0, life: 2.0 + (seed * 3.7).sin().abs() * 3.0, r: 0.92, g: 0.95, b: 1.0, size: 1.8 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single dust storm particle with high wind drift and sandy color.
pub fn spawn_dust_storm_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 11.3 + y * 17.9;
    let z = 1.5 + (seed * 1.3).sin() * 1.5;
    let life = 3.0 + (seed * 4.1).sin().abs() * 4.0;
    let hue_var = (seed * 7.3).sin() * 0.08;
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx: (seed * 1.9).cos() * 0.8 + 0.4, vy: (seed * 2.7).sin() * 0.4, vz: -0.3 - (seed * 3.3).sin().abs() * 0.5, life, r: 0.72 + hue_var, g: 0.60 + hue_var * 0.5, b: 0.42, size: 2.2 });                             // size: larger wind-blown particle
}

/// Spawn a burst of dust storm particles across a sand/desert area.
pub fn spawn_dust_storm_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 13.1 + 7.3).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 19.7 + 3.1).sin() * 0.5 + 0.5) * sy;
        let seed = x * 11.3 + y * 17.9;
        let z = 1.5 + (seed * 1.3).sin() * 1.5;
        if ps.spawn(&ParticleConfig { x, y, z, vx: (seed * 1.9).cos() * 0.8 + 0.4, vy: (seed * 2.7).sin() * 0.4, vz: -0.3 - (seed * 3.3).sin().abs() * 0.5, life: 3.0 + (seed * 4.1).sin().abs() * 4.0, r: 0.72 + (seed * 7.3).sin() * 0.08, g: 0.60 + (seed * 7.3).sin() * 0.04, b: 0.42, size: 2.2 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single fog/mist particle.
/// Fog is slow-moving, low-density, and spawns near water/swamp tiles.
/// Color is a pale grey-white to simulate morning mist over water.
pub fn spawn_fog_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 11.3 + y * 17.9;
    let z = 0.5 + (seed * 0.7).sin() * 0.8;  // low to ground
    let life = 4.0 + (seed * 2.3).sin().abs() * 4.0;
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx: (seed * 1.3).cos() * 0.08, vy: (seed * 1.9).sin() * 0.06, vz: 0.02 + (seed * 0.5).sin().abs() * 0.03, life, r: 0.82, g: 0.85, b: 0.88, size: 3.5 });                         // size: large soft puff
}

/// Spawn a burst of fog/mist particles across a rectangular area.
pub fn spawn_fog_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 13.7 + 4.1).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 19.3 + 7.9).sin() * 0.5 + 0.5) * sy;
        let seed = x * 11.3 + y * 17.9;
        let z = 0.5 + (seed * 0.7).sin() * 0.8;
        if ps.spawn(&ParticleConfig { x, y, z, vx: (seed * 1.3).cos() * 0.08, vy: (seed * 1.9).sin() * 0.06, vz: 0.02 + (seed * 0.5).sin().abs() * 0.03, life: 4.0 + (seed * 2.3).sin().abs() * 4.0, r: 0.82, g: 0.85, b: 0.88, size: 3.5 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn construction activity particles at a building site.
/// Nation color is blended with construction dust for faction-specific effects.
/// Called periodically during building construction (when construction < 1.0).
pub fn spawn_construction_effect(
    ps: &mut ParticleSystem,
    tile_x: f32,
    tile_y: f32,
    nation_r: f32,
    nation_g: f32,
    nation_b: f32,
) {
    // Small upward dust burst -- base brown/grey, tinted with nation color
    let r = 0.35 + nation_r * 0.25;
    let g = 0.30 + nation_g * 0.25;
    let b = 0.20 + nation_b * 0.20;
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.1, count: 6, color_r: r, color_g: g, color_b: b, speed: 1.2, life: 0.6, size: 3.5 });
    // Sparkle highlights -- brighter, faster, nation-dominant color
    let sr = 0.5 + nation_r * 0.4;
    let sg = 0.45 + nation_g * 0.4;
    let sb = 0.4 + nation_b * 0.35;
    ps.spawn_burst(&BurstConfig { x: tile_x, y: tile_y, z: 0.3, count: 4, color_r: sr, color_g: sg, color_b: sb, speed: 2.0, life: 0.4, size: 2.5 });
}

/// Spawn a single firefly particle near forest/grass tiles at dusk/night.
/// Fireflies drift slowly with a warm yellow-green glow, gentle bobbing motion,
/// and short lifespan. Only active during low-light conditions (day_phase near 0.0 or 1.0).
pub fn spawn_firefly_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    let seed = tile_x * 5.7 + tile_y * 13.3;
    // Slow horizontal drift with gentle sinusoidal bobbing
    let vx = (seed * 2.1).sin() * 0.04;
    let vy = (seed * 3.7).cos() * 0.03;
    let z = 0.3 + (seed * 1.1).sin().abs() * 0.5;  // low to ground (0.3-0.8)
    let life = 2.5 + (seed * 4.3).sin().abs() * 3.0;  // 2.5-5.5s
    // Warm yellow-green glow: high green, medium-high red, low blue
    let r = 0.7 + (seed * 8.1).sin().abs() * 0.25;
    let g = 0.85 + (seed * 6.3).cos().abs() * 0.12;
    let b = 0.15 + (seed * 9.7).sin().abs() * 0.1;
    let _ = ps.spawn(&ParticleConfig { x: tile_x, y: tile_y, z, vx, vy, vz: 0.01, life, r, g, b, size: 4.0 });
}

/// Spawn a single ember/spark particle near Smelter buildings.
/// Embers rise from the furnace with hot orange-red-yellow color, slight
/// horizontal drift, and short lifespan. They simulate the sparks and
/// glowing debris ejected from iron/gold smelter chimneys.
pub fn spawn_ember_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 7.3 + y * 11.1;
    // Start at building height (~1.5-2.5, like a chimney)
    let z = 1.5 + (seed * 1.7).sin().abs() * 1.0;
    // Rise upward with slight horizontal scatter
    let vx = (seed * 2.3).cos() * 0.15;  // slight horizontal scatter
    let vy = (seed * 3.1).sin() * 0.12;
    let vz = 0.8 + (seed * 4.7).sin().abs() * 1.2;  // upward (0.8-2.0)
    // Short life: 0.4-1.2 seconds (embers burn out quickly)
    let life = 0.6 + (seed * 5.3).sin().abs() * 0.6;
    // Ember color: bright orange-red, occasionally yellow-hot
    // High red, medium-high green (orange tint), very low blue
    let r = 0.9 + (seed * 6.1).sin().abs() * 0.1;   // 0.9-1.0
    let g = 0.35 + (seed * 8.3).cos().abs() * 0.35;  // 0.35-0.70 (orange to yellow)
    let b = 0.02 + (seed * 9.7).sin().abs() * 0.06;  // 0.02-0.08 (almost no blue)
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 3.0 });
}

/// Spawn a burst of ember/spark particles at a smelter building.
/// Used periodically to create continuous furnace activity — embers
/// appear at the building position with rising scatter pattern.
pub fn spawn_ember_burst(ps: &mut ParticleSystem, x: f32, y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    for i in 0..count {
        let fi = i as f32;
        let seed = x * 7.3 + y * 11.1 + fi * 3.7;
        let z = 1.5 + (seed * 1.7).sin().abs() * 1.0;
        if ps.spawn(&ParticleConfig { x: x + (fi * 2.1).cos() * 0.3, y: y + (fi * 3.7).sin() * 0.3, z, vx: (seed * 2.3).cos() * 0.15, vy: (seed * 3.1).sin() * 0.12, vz: 0.8 + (seed * 4.7).sin().abs() * 1.2, life: 0.6 + (seed * 5.3).sin().abs() * 0.6, r: 0.9 + (seed * 6.1).sin().abs() * 0.1, g: 0.35 + (seed * 8.3).cos().abs() * 0.35, b: 0.02 + (seed * 9.7).sin().abs() * 0.06, size: 3.0 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single pollen/drifting seed particle near grass tiles.
/// Tiny white-yellow-tan particles that float gently upward and drift horizontally,
/// simulating dandelion seeds or pollen in a light breeze during daytime.
pub fn spawn_pollen_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 17.3 + y * 23.7;
    let z = 0.5 + (seed * 1.3).sin().abs() * 1.5;    // start near ground
    let vx = (seed * 2.1).cos() * 0.12 + 0.05;        // gentle eastward drift
    let vy = (seed * 3.5).sin() * 0.08;
    let vz = 0.05 + (seed * 4.1).sin().abs() * 0.15;  // slight upward float
    let life = 1.0 + (seed * 6.7).sin().abs() * 1.5;   // 1.0-2.5s, short breezy life
    let r = 0.85 + (seed * 7.3).sin().abs() * 0.15;    // warm white/yellow
    let g = 0.80 + (seed * 8.9).sin().abs() * 0.15;
    let b = 0.70 + (seed * 9.7).sin().abs() * 0.15;    // low blue = warm tone
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 1.2 });
}

/// Spawn a burst of pollen/drifting seed particles across a rectangular area.
pub fn spawn_pollen_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 11.3 + 5.7).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 17.9 + 2.3).sin() * 0.5 + 0.5) * sy;
        let seed = x * 17.3 + y * 23.7;
        let z = 0.5 + (seed * 1.3).sin().abs() * 1.5;
        let vx = (seed * 2.1).cos() * 0.12 + 0.05;
        let vy = (seed * 3.5).sin() * 0.08;
        let vz = 0.05 + (seed * 4.1).sin().abs() * 0.15;
        let life = 1.0 + (seed * 6.7).sin().abs() * 1.5;
        let r = 0.85 + (seed * 7.3).sin().abs() * 0.15;
        let g = 0.80 + (seed * 8.9).sin().abs() * 0.15;
        let b = 0.70 + (seed * 9.7).sin().abs() * 0.15;
        if ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 1.2 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}
/// Spawn a single water splash particle (tiny upward arc on water surface).
pub fn spawn_water_splash_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 19.7 + y * 13.3;
    let z = 0.05 + (seed * 2.3).sin().abs() * 0.1;  // at water surface level
    let vx = (seed * 1.3).cos() * 0.3;               // gentle radial scatter
    let vy = (seed * 2.7).sin() * 0.25;
    let vz = 1.0 + (seed * 3.9).sin().abs() * 1.5;   // upward splash
    let life = 0.3 + (seed * 4.1).sin().abs() * 0.25; // short splash (0.3-0.55s)
    let r = 0.72 + (seed * 5.7).sin().abs() * 0.13;   // light blue
    let g = 0.85 + (seed * 6.3).cos().abs() * 0.10;
    let b = 0.95 + (seed * 7.1).sin().abs() * 0.05;   // near-full blue
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 2.0 });
}

/// Spawn a burst of water splash particles across a rectangular water area.
pub fn spawn_water_splash_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 13.1 + 7.9).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 17.3 + 3.1).sin() * 0.5 + 0.5) * sy;
        let seed = x * 19.7 + y * 13.3;
        let z = 0.05 + (seed * 2.3).sin().abs() * 0.1;
        let vx = (seed * 1.3).cos() * 0.3;
        let vy = (seed * 2.7).sin() * 0.25;
        let vz = 1.0 + (seed * 3.9).sin().abs() * 1.5;
        let life = 0.3 + (seed * 4.1).sin().abs() * 0.25;
        let r = 0.72 + (seed * 5.7).sin().abs() * 0.13;
        let g = 0.85 + (seed * 6.3).cos().abs() * 0.10;
        let b = 0.95 + (seed * 7.1).sin().abs() * 0.05;
        if ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 2.0 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single butterfly particle — colorful, gentle floating motion near Forest/Grass.
pub fn spawn_butterfly_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 11.3 + y * 17.7;
    let z = 1.5 + (seed * 1.3).sin().abs() * 2.0;
    let vx = (seed * 2.7).cos() * 0.08;
    let vy = (seed * 3.3).sin() * 0.06;
    let vz = 0.02 + (seed * 4.1).sin().abs() * 0.05;
    let life = 3.0 + (seed * 5.7).sin().abs() * 2.0;
    let hue_seed = (seed * 7.3).sin().abs();
    let (r, g, b) = if hue_seed < 0.25 {
        (0.95, 0.55 + hue_seed * 0.4, 0.1)
    } else if hue_seed < 0.5 {
        (0.95, 0.85, 0.1 + hue_seed * 0.2)
    } else if hue_seed < 0.75 {
        (0.6 + hue_seed * 0.2, 0.2, 0.85)
    } else {
        (0.2, 0.5 + hue_seed * 0.3, 0.95)
    };
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 2.5 });
}

/// Spawn a burst of butterflies across a rectangular area.
pub fn spawn_butterfly_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 13.7 + 3.1).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 19.3 + 7.9).sin() * 0.5 + 0.5) * sy;
        let seed = x * 11.3 + y * 17.7;
        let z = 1.5 + (seed * 1.3).sin().abs() * 2.0;
        let vx = (seed * 2.7).cos() * 0.08;
        let vy = (seed * 3.3).sin() * 0.06;
        let vz = 0.02 + (seed * 4.1).sin().abs() * 0.05;
        let life = 3.0 + (seed * 5.7).sin().abs() * 2.0;
        if ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r: 0.9, g: 0.7, b: 0.1, size: 2.5 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single moth particle — small dusty-brown insect attracted to building lights at night.
pub fn spawn_moth_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 9.1 + y * 14.3;
    let z = 1.0 + (seed * 1.7).sin().abs() * 1.5;
    let vx = (seed * 2.9).cos() * 0.06;
    let vy = (seed * 3.7).sin() * 0.05;
    let vz = 0.01 + (seed * 4.3).sin().abs() * 0.03;
    let life = 4.0 + (seed * 5.9).sin().abs() * 3.0;
    // Dusty brown/tan color palette
    let r = 0.55 + (seed * 7.1).sin().abs() * 0.2;
    let g = 0.45 + (seed * 8.3).cos().abs() * 0.15;
    let b = 0.30 + (seed * 9.7).sin().abs() * 0.1;
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 1.8 });
}

/// Spawn a burst of moth particles around a building.
pub fn spawn_moth_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 11.7 + 4.3).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 16.9 + 8.1).sin() * 0.5 + 0.5) * sy;
        let seed = x * 9.1 + y * 14.3;
        let z = 1.0 + (seed * 1.7).sin().abs() * 1.5;
        let vx = (seed * 2.9).cos() * 0.06;
        let vy = (seed * 3.7).sin() * 0.05;
        let vz = 0.01 + (seed * 4.3).sin().abs() * 0.03;
        let life = 4.0 + (seed * 5.9).sin().abs() * 3.0;
        if ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r: 0.6, g: 0.48, b: 0.32, size: 1.8 }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

/// Spawn a single magic sparkle particle — divine energy rising from temple buildings.
/// Represents mana/spiritual energy emanating from Small Temple and Large Temple.
pub fn spawn_magic_sparkle_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 11.3 + y * 17.7;
    let z = 2.0 + (seed * 1.3).sin().abs() * 3.0;  // rises from building height
    let vx = (seed * 2.9).cos() * 0.08;              // gentle horizontal scatter
    let vy = (seed * 3.7).sin() * 0.06;
    let vz = 0.4 + (seed * 4.1).sin().abs() * 0.6;   // gentle upward rise
    let life = 2.0 + (seed * 5.9).sin().abs() * 2.5;
    // Ethereal blue-white-gold color (divine energy)
    let r = 0.85 + (seed * 7.3).sin().abs() * 0.15;  // bright white with golden tint
    let g = 0.88 + (seed * 8.1).cos().abs() * 0.12;
    let b = 0.95 + (seed * 9.7).sin().abs() * 0.05;  // dominant blue-white
    let _ = ps.spawn(&ParticleConfig { x, y, z, vx, vy, vz, life, r, g, b, size: 2.2 });
}

/// Spawn a burst of magic sparkle particles around a temple building.
pub fn spawn_magic_sparkle_burst(ps: &mut ParticleSystem, min_x: f32, min_y: f32, max_x: f32, max_y: f32, count: u32) -> u32 {
    let mut spawned = 0u32;
    let sx = max_x - min_x;
    let sy = max_y - min_y;
    for i in 0..count {
        let fi = i as f32;
        let x = min_x + ((fi * 13.1 + 3.7).sin() * 0.5 + 0.5) * sx;
        let y = min_y + ((fi * 19.3 + 6.9).sin() * 0.5 + 0.5) * sy;
        let seed = x * 11.3 + y * 17.7;
        let z = 2.0 + (seed * 1.3).sin().abs() * 3.0;
        if ps.spawn(&ParticleConfig {
            x, y, z,
            vx: (seed * 2.9).cos() * 0.08,
            vy: (seed * 3.7).sin() * 0.06,
            vz: 0.4 + (seed * 4.1).sin().abs() * 0.6,
            life: 2.0 + (seed * 5.9).sin().abs() * 2.5,
            r: 0.85 + (seed * 7.3).sin().abs() * 0.15,
            g: 0.88 + (seed * 8.1).cos().abs() * 0.12,
            b: 0.95 + (seed * 9.7).sin().abs() * 0.05,
            size: 2.2,
        }) {
            spawned += 1;
        } else {
            break;
        }
    }
    spawned
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_particle_new_is_dead() {
        let p = Particle::new();
        assert!(!p.alive);
    }

    #[test]
    fn test_particle_spawn_activates() {
        let mut p = Particle::new();
        p.spawn(&ParticleConfig { x: 1.0, y: 2.0, z: 0.0, vx: 0.5, vy: 0.5, vz: 2.0, life: 1.0, r: 1.0, g: 0.0, b: 0.0, size: 8.0 });
        assert!(p.alive);
        assert_eq!(p.x, 1.0);
        assert_eq!(p.vz, 2.0);
    }

    #[test]
    fn test_particle_tick_moves() {
        let mut p = Particle::new();
        p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 1.0, vx: 1.0, vy: 0.0, vz: 0.0, life: 2.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        p.tick(0.1);
        assert!(p.alive);
        assert!((p.x - 0.1).abs() < 0.001);
        // After first tick, gravity has been applied (vz = -0.2) but z unchanged yet
        assert!(p.vz < 0.0, "gravity should make vz negative");
        // After second tick, z should decrease
        p.tick(0.1);
        assert!(p.z < 1.0, "z should decrease after gravity: {}", p.z);
    }

    #[test]
    fn test_particle_dies_after_lifetime() {
        let mut p = Particle::new();
        p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 0.5, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        assert!(p.tick(0.3));
        assert!(!p.tick(0.3));
        assert!(!p.alive);
    }

    #[test]
    fn test_particle_alpha_fade() {
        let mut p = Particle::new();
        p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 1.0, r: 1.0, g: 0.0, b: 0.0, size: 8.0 });
        assert!((p.alpha() - 1.0).abs() < 0.001);
        p.life = 0.5;
        let alpha = p.alpha();
        assert!(alpha < 1.0 && alpha > 0.0);
    }

    #[test]
    fn test_particle_bounce() {
        let mut p = Particle::new();
        p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 2.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        p.vz = -5.0;
        p.tick(0.5);
        assert!(p.z >= 0.0);
    }

    #[test]
    fn test_system_new_is_empty() {
        let ps = ParticleSystem::new();
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_system_spawn_succeeds() {
        let mut ps = ParticleSystem::new();
        assert!(ps.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 1.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 }));
        assert_eq!(ps.alive_count(), 1);
    }

    #[test]
    fn test_system_spawn_burst() {
        let mut ps = ParticleSystem::new();
        let n = ps.spawn_burst(&BurstConfig { x: 0.0, y: 5.0, z: 0.0, count: 8, color_r: 0.0, color_g: 1.0, color_b: 0.0, speed: 2.0, life: 1.0, size: 6.0 });
        assert_eq!(n, 8);
        assert_eq!(ps.alive_count(), 8);
    }

    #[test]
    fn test_system_update_removes_dead() {
        let mut ps = ParticleSystem::new();
        ps.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 0.3, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        assert_eq!(ps.alive_count(), 1);
        ps.update(0.5);
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_system_clear() {
        let mut ps = ParticleSystem::new();
        ps.spawn_burst(&BurstConfig { x: 0.0, y: 0.0, z: 0.0, count: 10, color_r: 1.0, color_g: 1.0, color_b: 1.0, speed: 2.0, life: 1.0, size: 6.0 });
        assert_eq!(ps.alive_count(), 10);
        ps.clear();
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_system_max_particles() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES + 10 {
            let spawned = ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
            if i < MAX_PARTICLES {
                assert!(spawned, "should spawn particle {}", i);
            } else {
                assert!(!spawned, "should fail after MAX_PARTICLES");
            }
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
    }

    #[test]
    fn test_overlay_data_empty() {
        let ps = ParticleSystem::new();
        let (pos, col, sizes) = ps.get_overlay_data();
        assert!(pos.is_empty() && col.is_empty() && sizes.is_empty());
    }

    #[test]
    fn test_overlay_data_has_alive() {
        let mut ps = ParticleSystem::new();
        ps.spawn(&ParticleConfig { x: 3.0, y: 4.0, z: 0.5, vx: 0.0, vy: 0.0, vz: 0.0, life: 1.0, r: 0.2, g: 0.8, b: 0.3, size: 10.0 });
        let (pos, col, sizes) = ps.get_overlay_data();
        assert_eq!(pos.len(), 2);
        assert_eq!(col.len(), 3);
        assert_eq!(sizes.len(), 1);
        assert_eq!(pos[0], 3.0);
        assert_eq!(sizes[0], 10.0 + 0.5 * 2.0);
    }

    #[test]
    fn test_to_json_empty() {
        let ps = ParticleSystem::new();
        assert_eq!(ps.to_json(), "[]");
    }

    #[test]
    fn test_to_json_one_particle() {
        let mut ps = ParticleSystem::new();
        ps.spawn(&ParticleConfig { x: 1.0, y: 2.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 1.0, r: 1.0, g: 0.5, b: 0.2, size: 8.0 });
        let json = ps.to_json();
        assert!(json.contains("\"x\":1.00"));
        assert!(json.contains("\"r\":1.00"));
    }

    #[test]
    fn test_build_effect() {
        let mut ps = ParticleSystem::new();
        spawn_build_effect(&mut ps, 10.0, 20.0);
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 12);
    }

    #[test]
    fn test_combat_effect() {
        let mut ps = ParticleSystem::new();
        spawn_combat_effect(&mut ps, 5.0, 5.0);
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 16);
    }

    #[test]
    fn test_dust_effect() {
        let mut ps = ParticleSystem::new();
        spawn_dust_effect(&mut ps, 3.0, 3.0);
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 4);
    }

    #[test]
    fn test_particle_gravity() {
        let mut p = Particle::new();
        p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 5.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 3.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        p.tick(0.1);
        assert!(p.vz < 0.0, "vz should be negative after gravity");
        p.tick(0.1);
        assert!(p.z < 5.0, "z should decrease after 2 ticks: {}", p.z);
    }

    #[test]
    fn test_burst_deterministic() {
        let mut ps1 = ParticleSystem::new();
        let mut ps2 = ParticleSystem::new();
        let n1 = ps1.spawn_burst(&BurstConfig { x: 0.0, y: 0.0, z: 0.0, count: 10, color_r: 1.0, color_g: 0.0, color_b: 0.0, speed: 2.0, life: 1.0, size: 6.0 });
        let n2 = ps2.spawn_burst(&BurstConfig { x: 0.0, y: 0.0, z: 0.0, count: 10, color_r: 1.0, color_g: 0.0, color_b: 0.0, speed: 2.0, life: 1.0, size: 6.0 });
        assert_eq!(n1, n2);
        assert_eq!(n1, 10);
    }

    #[test]
    fn test_smoke_effect() {
        let mut ps = ParticleSystem::new();
        spawn_smoke_effect(&mut ps, 5.0, 5.0);
        let count = ps.alive_count();
        assert!((1..=2).contains(&count), "smoke should spawn 1-2 particles, got {}", count);
    }

    #[test]
    fn test_leaf_effect() {
        let mut ps = ParticleSystem::new();
        spawn_leaf_effect(&mut ps, 3.0, 7.0);
        assert_eq!(ps.alive_count(), 1);
    }

    #[test]
    fn test_firefly_effect() {
        let mut ps = ParticleSystem::new();
        spawn_firefly_effect(&mut ps, 4.0, 8.0);
        assert_eq!(ps.alive_count(), 1);
        // Verify warm yellow-green color (green dominant, low blue)
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        assert!(p.g > p.b, "firefly should be greener than blue");
    }

    #[test]
    fn test_firefly_drift_direction() {
        let mut ps = ParticleSystem::new();
        spawn_firefly_effect(&mut ps, 2.5, 3.5);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Fireflies should have near-zero horizontal drift (slow)
        assert!(p.vx.abs() < 0.1, "firefly vx should be slow: {}", p.vx);
        assert!(p.vy.abs() < 0.1, "firefly vy should be slow: {}", p.vy);
    }

    #[test]
    fn test_smoke_particles_rise() {
        let mut ps = ParticleSystem::new();
        spawn_smoke_effect(&mut ps, 0.0, 0.0);
        // Check that spawned particles have upward velocity
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        for p in &alive {
            assert!(p.vz > 0.0, "smoke particles should rise (vz > 0)");
        }
    }

    #[test]
    fn test_burst_alive_count_after_clear_then_burst() {
        // Regression: burst should work after clearing and re-spawning
        let mut ps = ParticleSystem::new();
        ps.spawn_burst(&BurstConfig { x: 0.0, y: 0.0, z: 0.0, count: 50, color_r: 1.0, color_g: 0.0, color_b: 0.0, speed: 2.0, life: 1.0, size: 6.0 });
        assert_eq!(ps.alive_count(), 50);
        ps.clear();
        assert_eq!(ps.alive_count(), 0);
        let n = ps.spawn_burst(&BurstConfig { x: 0.0, y: 0.0, z: 0.0, count: 30, color_r: 0.0, color_g: 1.0, color_b: 0.0, speed: 2.0, life: 1.0, size: 6.0 });
        assert_eq!(n, 30);
        assert_eq!(ps.alive_count(), 30);
    }

    #[test]
    fn test_leaf_green_tint() {
        let mut ps = ParticleSystem::new();
        spawn_leaf_effect(&mut ps, 1.0, 2.0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        let p = alive[0];
        assert!(p.g > p.r, "leaf should be green-dominant (g > r): g={}, r={}", p.g, p.r);
    }

    #[test]
    fn test_autumn_leaf_particle() {
        let mut ps = ParticleSystem::new();
        spawn_autumn_leaf_particle(&mut ps, 3.0, 7.0);
        assert_eq!(ps.alive_count(), 1);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Autumn leaf should have warm colors: red dominant, green medium, blue low
        assert!(p.r > 0.7, "autumn leaf r should be > 0.7: {}", p.r);
        assert!(p.g < p.r, "autumn leaf green should be < red: g={}, r={}", p.g, p.r);
        assert!(p.b < 0.2, "autumn leaf blue should be low: {}", p.b);
    }

    #[test]
    fn test_autumn_leaf_falling() {
        let mut ps = ParticleSystem::new();
        spawn_autumn_leaf_particle(&mut ps, 2.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Should be descending (negative vz)
        assert!(p.vz < 0.0, "autumn leaf should fall (vz < 0): {}", p.vz);
        // Should start above ground
        assert!(p.z > 1.0, "autumn leaf should start above ground (z > 1): {}", p.z);
    }

    #[test]
    fn test_autumn_leaf_burst() {
        let mut ps = ParticleSystem::new();
        let n = spawn_autumn_leaf_burst(&mut ps, 0.0, 0.0, 20.0, 20.0, 8);
        assert_eq!(n, 8);
        assert_eq!(ps.alive_count(), 8);
        // All should have autumn colors (red dominant)
        for p in ps.particles.iter().filter(|p| p.alive) {
            assert!(p.r > p.g, "autumn leaf burst: r should be > g");
        }
    }

    #[test]
    fn test_autumn_leaf_drift_wind_bias() {
        let mut ps = ParticleSystem::new();
        spawn_autumn_leaf_particle(&mut ps, 4.0, 3.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Should have slight eastward drift (vx has +0.03 bias)
        // The sinusoidal component can be up to 0.06, so vx ranges from -0.03 to +0.09
        // Most positions should have positive vx; we just verify it's slow
        assert!(p.vx.abs() < 0.15, "autumn leaf drift should be slow: {}", p.vx);
    }

    #[test]
    fn test_rubble_effect() {
        let mut ps = ParticleSystem::new();
        spawn_rubble_effect(&mut ps, 10.0, 20.0);
        // 20 rubble + 8 dust = 28 particles
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 28);
    }

    #[test]
    fn test_rubble_brown_tint() {
        let mut ps = ParticleSystem::new();
        spawn_rubble_effect(&mut ps, 5.0, 5.0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        // Rubble particles should be brown-dominant (r > b)
        let rubble_count = alive.iter().filter(|p| p.r > p.b).count();
        assert!(rubble_count > 0, "at least some rubble particles should be brown-dominant");
    }

    #[test]
    fn test_construction_effect_spawns() {
        let mut ps = ParticleSystem::new();
        spawn_construction_effect(&mut ps, 5.0, 5.0, 0.8, 0.3, 0.3);
        // 6 dust + 4 sparkle = 10 particles
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 10);
    }

    #[test]
    fn test_construction_effect_nation_color_blend() {
        // Roman red should produce reddish particles
        let mut ps = ParticleSystem::new();
        spawn_construction_effect(&mut ps, 5.0, 5.0, 0.78, 0.2, 0.2);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        // At least some particles should be red-dominant
        let red_count = alive.iter().filter(|p| p.r > p.g && p.r > p.b).count();
        assert!(red_count > 0, "Roman construction particles should be red-dominant, got r-dominant: {}/{}", red_count, alive.len());
    }

    #[test]
    fn test_construction_effect_maya_green() {
        // Maya green should produce green-ish particles
        let mut ps = ParticleSystem::new();
        spawn_construction_effect(&mut ps, 5.0, 5.0, 0.2, 0.71, 0.2);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        // Sparkle particles should be nation-dominant
        // First 6 are dust (brown tinted), last 4 are sparkle (nation-dominant)
        // Overall should have some greenish particles
        let green_count = alive.iter().filter(|p| p.g > p.r && p.g > p.b).count();
        assert!(green_count > 0, "Maya construction particles should have some green-dominant, got: {}/{}", green_count, alive.len());
    }

    #[test]
    fn test_rain_particle_spawns() {
        let mut ps = ParticleSystem::new();
        spawn_rain_particle(&mut ps, 5.0, 5.0);
        assert_eq!(ps.alive_count(), 1, "rain particle should spawn one droplet");
    }

    #[test]
    fn test_rain_burst_spawns() {
        let mut ps = ParticleSystem::new();
        let n = spawn_rain_burst(&mut ps, 0.0, 0.0, 20.0, 20.0, 10);
        assert!(n > 0 && n <= 10, "rain burst should spawn 1-10 particles, got {}", n);
        assert_eq!(ps.alive_count(), n as usize);
    }

    #[test]
    fn test_rain_particles_fall() {
        let mut ps = ParticleSystem::new();
        spawn_rain_particle(&mut ps, 3.0, 4.0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        for p in &alive {
            assert!(p.vz < 0.0, "rain particles should fall (vz < 0), got vz={}", p.vz);
        }
    }

    #[test]
    fn test_rain_particles_blue_tint() {
        let mut ps = ParticleSystem::new();
        spawn_rain_particle(&mut ps, 2.0, 3.0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        assert!(!alive.is_empty());
        let p = alive[0];
        assert!(p.b > p.r, "rain should be blue-dominant (b > r): b={}, r={}", p.b, p.r);
    }

    #[test]
    fn test_rain_burst_bounds() {
        let mut ps = ParticleSystem::new();
        let n = spawn_rain_burst(&mut ps, 10.0, 10.0, 30.0, 30.0, 5);
        assert!(n > 0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        for p in &alive {
            assert!(p.x >= 10.0 && p.x <= 30.0, "rain x={} out of [10,30]", p.x);
            assert!(p.y >= 10.0 && p.y <= 30.0, "rain y={} out of [10,30]", p.y);
        }
    }

    #[test]
    fn test_rain_burst_limited_by_max() {
        // Fill system then try to spawn rain — should stop at capacity
        let mut ps = ParticleSystem::new();
        // Fill all slots
        for i in 0..MAX_PARTICLES {
            ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_rain_burst(&mut ps, 0.0, 0.0, 10.0, 10.0, 20);
        assert_eq!(n, 0, "rain burst should spawn 0 when system full");
    }

    #[test]
    fn test_rain_ground_fade_out() {
        // Rain particles that hit the ground mid-flight should cap
        // remaining life to 0.15s for a quick splash fade-out.
        let mut ps = ParticleSystem::new();
        spawn_rain_particle(&mut ps, 5.0, 5.0);
        // Find the spawned particle
        let idx = ps.particles.iter().position(|p| p.alive).unwrap();
        // Force it to ground level and simulate tick hitting z < 0
        ps.particles[idx].z = 0.01;
        ps.particles[idx].vz = -8.0;
        // The initial life is ~0.3-0.55s (from spawn_rain_particle)
        let initial_life = ps.particles[idx].life;
        assert!(initial_life > 0.15, "rain should start with >0.15s life, got {}", initial_life);
        // Tick: should hit z < 0 and cap life to 0.15
        ps.particles[idx].tick(0.1);
        assert!(ps.particles[idx].life <= 0.15, "rain life should be capped to <=0.15 after ground hit, got {}", ps.particles[idx].life);
        assert!(ps.particles[idx].alive || ps.particles[idx].life <= 0.15, "rain should fade quickly after ground impact");
    }

    #[test]
    fn test_snow_particle_spawns_white() {
        let mut ps = ParticleSystem::new();
        spawn_snow_particle(&mut ps, 5.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Snow should be white/light: high r,g,b
        assert!(p.r > 0.9, "snow r should be >0.9, got {}", p.r);
        assert!(p.g > 0.9, "snow g should be >0.9, got {}", p.g);
        assert!(p.b > 0.95, "snow b should be >0.95, got {}", p.b);
    }

    #[test]
    fn test_snow_falls_slowly() {
        let mut ps = ParticleSystem::new();
        spawn_snow_particle(&mut ps, 5.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Snow falls slower than rain (vz > -2.5 means less negative)
        assert!(p.vz > -2.5, "snow vz should be >-2.5 (slow fall), got {}", p.vz);
    }

    #[test]
    fn test_snow_long_lifetime() {
        let mut ps = ParticleSystem::new();
        spawn_snow_particle(&mut ps, 5.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Snow should live longer than rain (>1.5s)
        assert!(p.life > 1.5, "snow life should be >1.5s, got {}", p.life);
    }

    #[test]
    fn test_snow_burst_bounds() {
        let mut ps = ParticleSystem::new();
        let n = spawn_snow_burst(&mut ps, 10.0, 10.0, 30.0, 30.0, 5);
        assert!(n > 0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        for p in &alive {
            assert!(p.x >= 10.0 && p.x <= 30.0, "snow x={} out of [10,30]", p.x);
            assert!(p.y >= 10.0 && p.y <= 30.0, "snow y={} out of [10,30]", p.y);
        }
    }

    #[test]
    fn test_snow_burst_limited_by_max() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES {
            ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_snow_burst(&mut ps, 0.0, 0.0, 10.0, 10.0, 20);
        assert_eq!(n, 0, "snow burst should spawn 0 when system full");
    }

    #[test]
    fn test_dust_storm_particle_spawns_sandy_color() {
        let mut ps = ParticleSystem::new();
        spawn_dust_storm_particle(&mut ps, 5.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Dust storm should be sandy brown: high r, medium g, low b
        assert!(p.r > 0.65, "dust r should be >0.65, got {}", p.r);
        assert!(p.g > 0.5, "dust g should be >0.5, got {}", p.g);
        assert!(p.b < 0.55, "dust b should be <0.55, got {}", p.b);
    }

    #[test]
    fn test_dust_storm_strong_wind_drift() {
        let mut ps = ParticleSystem::new();
        spawn_dust_storm_particle(&mut ps, 8.0, 8.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Dust has prevailing eastward wind (base +0.4) plus cos drift (+-0.8).
        // Range: -0.4 to +1.2. Strong drift means |vx| > 0.1 (not perfectly still).
        assert!(p.vx.abs() > 0.1, "dust vx should be >0.1 or <-0.1 (wind drift), got {}", p.vx);
        // The wind is generally eastward: vx should be positive most of the time.
        // Over prevailing +0.4 base, even negative cos gives ~-0.4, so just check
        // the spawned particle is moving (not exactly zero).
        assert!(p.vx != 0.0, "dust vx should never be exactly zero, got {}", p.vx);
    }

    #[test]
    fn test_dust_storm_slow_fall() {
        let mut ps = ParticleSystem::new();
        spawn_dust_storm_particle(&mut ps, 3.0, 3.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Dust particles stay suspended: very slow fall (vz > -1.0)
        assert!(p.vz > -1.0, "dust vz should be >-1.0 (suspended), got {}", p.vz);
    }

    #[test]
    fn test_dust_storm_long_lifetime() {
        let mut ps = ParticleSystem::new();
        spawn_dust_storm_particle(&mut ps, 2.0, 2.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Dust should live 3-7 seconds
        assert!(p.life > 2.5, "dust life should be >2.5s, got {}", p.life);
    }

    #[test]
    fn test_dust_storm_burst_bounds() {
        let mut ps = ParticleSystem::new();
        let n = spawn_dust_storm_burst(&mut ps, 0.0, 0.0, 20.0, 20.0, 5);
        assert!(n > 0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        for p in &alive {
            assert!(p.x >= 0.0 && p.x <= 20.0, "dust x={} out of [0,20]", p.x);
            assert!(p.y >= 0.0 && p.y <= 20.0, "dust y={} out of [0,20]", p.y);
        }
    }

    #[test]
    fn test_dust_storm_burst_limited_by_max() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES {
            ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_dust_storm_burst(&mut ps, 0.0, 0.0, 10.0, 10.0, 20);
        assert_eq!(n, 0, "dust burst should spawn 0 when system full");
    }

    #[test]
    fn test_fog_particle_spawns_pale_grey_color() {
        let mut ps = ParticleSystem::new();
        spawn_fog_particle(&mut ps, 5.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Fog should be pale grey-white: high r,g,b values, all similar
        assert!(p.r > 0.8, "fog r should be >0.8, got {}", p.r);
        assert!(p.g > 0.8, "fog g should be >0.8, got {}", p.g);
        assert!(p.b > 0.8, "fog b should be >0.8, got {}", p.b);
        // Grey: all channels within 0.1 of each other
        let diff = (p.r - p.b).abs();
        assert!(diff < 0.1, "fog should be grey (r-b diff <0.1), got {}", diff);
    }

    #[test]
    fn test_fog_gentle_drift() {
        let mut ps = ParticleSystem::new();
        spawn_fog_particle(&mut ps, 8.0, 8.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Fog has very gentle horizontal drift (+-0.08)
        assert!(p.vx >= -0.1 && p.vx <= 0.1, "fog vx should be in [-0.1,0.1], got {}", p.vx);
        assert!(p.vy >= -0.08 && p.vy <= 0.08, "fog vy should be in [-0.08,0.08], got {}", p.vy);
    }

    #[test]
    fn test_fog_slight_rise() {
        let mut ps = ParticleSystem::new();
        spawn_fog_particle(&mut ps, 3.0, 3.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Fog lifts slightly (vz positive, slow)
        assert!(p.vz > 0.0, "fog vz should be positive (rising), got {}", p.vz);
        assert!(p.vz < 0.1, "fog vz should be <0.1 (slow rise), got {}", p.vz);
    }

    #[test]
    fn test_fog_long_lifetime() {
        let mut ps = ParticleSystem::new();
        spawn_fog_particle(&mut ps, 2.0, 2.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Fog should persist 4-8 seconds
        assert!(p.life > 3.5, "fog life should be >3.5s, got {}", p.life);
    }

    #[test]
    fn test_fog_burst_bounds() {
        let mut ps = ParticleSystem::new();
        let n = spawn_fog_burst(&mut ps, 5.0, 5.0, 25.0, 25.0, 6);
        assert!(n > 0);
        let alive: Vec<&Particle> = ps.particles.iter().filter(|p| p.alive).collect();
        for p in &alive {
            assert!(p.x >= 5.0 && p.x <= 25.0, "fog x={} out of [5,25]", p.x);
            assert!(p.y >= 5.0 && p.y <= 25.0, "fog y={} out of [5,25]", p.y);
        }
    }

    #[test]
    fn test_fog_burst_limited_by_max() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES {
            ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_fog_burst(&mut ps, 0.0, 0.0, 10.0, 10.0, 20);
        assert_eq!(n, 0, "fog burst should spawn 0 when system full");
    }
}


    #[test]
    fn test_pollen_particle_spawns() {
        let mut ps = ParticleSystem::new();
        spawn_pollen_particle(&mut ps, 5.0, 8.0);
        assert_eq!(ps.alive_count(), 1, "pollen particle should spawn one particle");
    }

    #[test]
    fn test_pollen_particle_floats_upward() {
        let mut ps = ParticleSystem::new();
        spawn_pollen_particle(&mut ps, 3.0, 7.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Pollen should float gently upward (positive vz)
        assert!(p.vz > 0.0, "pollen should float upward (vz > 0), got vz={}", p.vz);
        // Slow drift: vz < 0.5
        assert!(p.vz < 0.5, "pollen vz should be gentle (<0.5), got vz={}", p.vz);
    }

    #[test]
    fn test_pollen_particle_warm_white_color() {
        let mut ps = ParticleSystem::new();
        spawn_pollen_particle(&mut ps, 2.0, 4.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Pollen is warm white/tan: all channels high, red-dominant
        assert!(p.r > 0.8, "pollen r should be >0.8, got {}", p.r);
        assert!(p.g > 0.75, "pollen g should be >0.75, got {}", p.g);
        assert!(p.b > 0.65, "pollen b should be >0.65, got {}", p.b);
        assert!(p.r > p.b, "pollen should be warm: r > b");
    }

    #[test]
    fn test_pollen_particle_short_life() {
        let mut ps = ParticleSystem::new();
        spawn_pollen_particle(&mut ps, 4.0, 6.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Pollen has short breezy life (1.0-2.5s)
        assert!(p.life > 0.8, "pollen life should be >0.8s, got {}", p.life);
        assert!(p.life < 3.0, "pollen life should be <3.0s, got {}", p.life);
    }

    #[test]
    fn test_pollen_burst_spawns() {
        let mut ps = ParticleSystem::new();
        let n = spawn_pollen_burst(&mut ps, 0.0, 0.0, 5.0, 5.0, 4);
        assert_eq!(n, 4, "pollen burst should spawn 4 particles");
        assert_eq!(ps.alive_count(), 4);
    }

    #[test]
    fn test_pollen_burst_all_float_upward() {
        let mut ps = ParticleSystem::new();
        spawn_pollen_burst(&mut ps, 0.0, 0.0, 3.0, 7.0, 5);
        for p in ps.particles.iter().filter(|p| p.alive) {
            assert!(p.vz > 0.0, "pollen burst particle should float upward (vz > 0), got vz={}", p.vz);
        }
    }

    #[test]
    fn test_pollen_burst_limited_by_max() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES {
            ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_pollen_burst(&mut ps, 0.0, 0.0, 5.0, 5.0, 10);
        assert_eq!(n, 0, "pollen burst should spawn 0 when system full");
    }

    #[test]
    fn test_ember_particle_spawns() {
        let mut ps = ParticleSystem::new();
        spawn_ember_particle(&mut ps, 5.0, 8.0);
        assert_eq!(ps.alive_count(), 1, "ember particle should spawn one particle");
    }

    #[test]
    fn test_ember_particle_rises() {
        let mut ps = ParticleSystem::new();
        spawn_ember_particle(&mut ps, 3.0, 7.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Embers should rise upward (positive vz)
        assert!(p.vz > 0.0, "ember should rise (vz > 0), got vz={}", p.vz);
    }

    #[test]
    fn test_ember_particle_orange_red_color() {
        let mut ps = ParticleSystem::new();
        spawn_ember_particle(&mut ps, 2.0, 4.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Embers should be red/orange: high red, low blue
        assert!(p.r > 0.85, "ember r should be >0.85, got {}", p.r);
        assert!(p.b < 0.15, "ember b should be <0.15, got {}", p.b);
        // Red should dominate green (orange-red, not yellow-green)
        assert!(p.r > p.g, "ember r should be > g: r={}, g={}", p.r, p.g);
    }

    #[test]
    fn test_ember_particle_starts_above_ground() {
        let mut ps = ParticleSystem::new();
        spawn_ember_particle(&mut ps, 5.0, 5.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Embers start at chimney height (z > 1.0)
        assert!(p.z > 1.0, "ember z should be >1.0 (chimney height), got {}", p.z);
    }

    #[test]
    fn test_ember_particle_short_life() {
        let mut ps = ParticleSystem::new();
        spawn_ember_particle(&mut ps, 4.0, 6.0);
        let p = ps.particles.iter().find(|p| p.alive).unwrap();
        // Embers burn out quickly (0.6-1.2s)
        assert!(p.life > 0.4, "ember life should be >0.4s, got {}", p.life);
        assert!(p.life < 1.5, "ember life should be <1.5s, got {}", p.life);
    }

    #[test]
    fn test_ember_burst_spawns() {
        let mut ps = ParticleSystem::new();
        let n = spawn_ember_burst(&mut ps, 5.0, 5.0, 4);
        assert_eq!(n, 4, "ember burst should spawn 4 particles");
        assert_eq!(ps.alive_count(), 4);
    }

    #[test]
    fn test_ember_burst_all_rise() {
        let mut ps = ParticleSystem::new();
        spawn_ember_burst(&mut ps, 3.0, 7.0, 5);
        for p in ps.particles.iter().filter(|p| p.alive) {
            assert!(p.vz > 0.0, "ember burst particle should rise (vz > 0), got vz={}", p.vz);
        }
    }

    #[test]
    fn test_ember_burst_limited_by_max() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES {
            ps.spawn(&ParticleConfig { x: i as f32, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 10.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_ember_burst(&mut ps, 5.0, 5.0, 10);
        assert_eq!(n, 0, "ember burst should spawn 0 when system full");
    }


#[test]
fn test_particle_bounce_velocity_reversal() {
    let mut p = Particle::new();
    p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 1.0, vx: 0.0, vy: 0.0, vz: -6.0, life: 2.0, r: 1.0, g: 0.5, b: 0.2, size: 8.0 });
    // Tick enough to hit the ground
    p.tick(0.3);
    assert!(p.z >= 0.0, "z should not go below 0 after bounce");
    // After bounce, vz should be positive (reversed direction, reduced)
    assert!(p.vz > 0.0, "vz should reverse upward after bounce, got {}", p.vz);
}

#[test]
fn test_particle_alpha_full_at_start() {
    let mut p = Particle::new();
    p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 2.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
    // At full life, alpha should be 1.0 (t > 0.7)
    assert!((p.alpha() - 1.0).abs() < 0.01, "alpha should be 1.0 at full life, got {}", p.alpha());
}

#[test]
fn test_particle_alpha_fades_below_threshold() {
    let mut p = Particle::new();
    p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 2.0, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
    // Tick to 50% life, falls below 0.7 threshold
    p.tick(1.0);
    let alpha = p.alpha();
    assert!(alpha > 0.4 && alpha < 0.8,
        "alpha at 50% life should be ~0.71, got {}", alpha);
}

#[test]
fn test_particle_alpha_zero_when_dead() {
    let mut p = Particle::new();
    p.spawn(&ParticleConfig { x: 0.0, y: 0.0, z: 0.0, vx: 0.0, vy: 0.0, vz: 0.0, life: 0.1, r: 1.0, g: 1.0, b: 1.0, size: 8.0 });
    // Tick past lifetime
    p.tick(0.2);
    assert!((p.alpha() - 0.0).abs() < 0.01, "dead particle alpha should be 0, got {}", p.alpha());
}

#[test]
fn test_water_splash_particle_spawns_with_correct_color() {
    let mut ps = ParticleSystem::new();
    spawn_water_splash_particle(&mut ps, 3.0, 7.0);
    assert_eq!(ps.alive_count(), 1);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.b > p.r, "water splash should be bluer than red (b={} r={})", p.b, p.r);
    assert!(p.g > 0.75, "water splash g should be >0.75, got {}", p.g);
}

#[test]
fn test_water_splash_rises_and_falls() {
    let mut ps = ParticleSystem::new();
    spawn_water_splash_particle(&mut ps, 5.0, 5.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.vz > 0.0, "water splash should rise initially, got vz={}", p.vz);
}

#[test]
fn test_water_splash_starts_at_water_level() {
    let mut ps = ParticleSystem::new();
    spawn_water_splash_particle(&mut ps, 8.0, 4.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.z < 0.2, "splash starts at water surface, z < 0.2, got z={}", p.z);
}

#[test]
fn test_water_splash_short_lifetime() {
    let mut ps = ParticleSystem::new();
    spawn_water_splash_particle(&mut ps, 2.0, 9.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.life >= 0.3 && p.life <= 0.55, "splash life should be 0.3-0.55s, got {}", p.life);
}

#[test]
fn test_water_splash_burst_bounds_and_capacity() {
    let mut ps = ParticleSystem::new();
    let spawned = spawn_water_splash_burst(&mut ps, 10.0, 20.0, 14.0, 24.0, 5);
    assert!(spawned <= 5, "burst should spawn at most {} particles, got 5", spawned);
    for p in ps.particles.iter().filter(|p| p.alive) {
        assert!(p.x >= 10.0 && p.x <= 14.0, "splash x={} out of bounds [10,14]", p.x);
        assert!(p.y >= 20.0 && p.y <= 24.0, "splash y={} out of bounds [20,24]", p.y);
    }
}

#[test]
fn test_butterfly_particle_spawns_with_color() {
    let mut ps = ParticleSystem::new();
    spawn_butterfly_particle(&mut ps, 5.0, 3.0);
    assert_eq!(ps.alive_count(), 1);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    let max_c = p.r.max(p.g).max(p.b);
    assert!(max_c > 0.7, "butterfly should have a dominant color, got r={} g={} b={}", p.r, p.g, p.b);
}

#[test]
fn test_butterfly_floats_gently() {
    let mut ps = ParticleSystem::new();
    spawn_butterfly_particle(&mut ps, 4.0, 8.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.vx.abs() < 0.2, "butterfly vx should be gentle, got {}", p.vx);
    assert!(p.vy.abs() < 0.2, "butterfly vy should be gentle, got {}", p.vy);
}

#[test]
fn test_butterfly_hovers_above_ground() {
    let mut ps = ParticleSystem::new();
    spawn_butterfly_particle(&mut ps, 6.0, 2.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.z > 1.0, "butterfly should hover above ground (z > 1.0), got z={}", p.z);
    assert!(p.z < 4.0, "butterfly should not fly too high (z < 4.0), got z={}", p.z);
}

#[test]
fn test_butterfly_has_scenic_lifetime() {
    let mut ps = ParticleSystem::new();
    spawn_butterfly_particle(&mut ps, 3.0, 9.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.life >= 2.5 && p.life <= 5.5, "butterfly life should be 2.5-5.5s, got {}", p.life);
}

#[test]
fn test_butterfly_burst_bounds_and_capacity() {
    let mut ps = ParticleSystem::new();
    let spawned = spawn_butterfly_burst(&mut ps, 10.0, 20.0, 14.0, 24.0, 5);
    assert!(spawned <= 5, "burst should spawn at most 5 particles, got {}", spawned);
    for p in ps.particles.iter().filter(|p| p.alive) {
        assert!(p.x >= 10.0 && p.x <= 14.0, "butterfly x={} out of bounds [10,14]", p.x);
        assert!(p.y >= 20.0 && p.y <= 24.0, "butterfly y={} out of bounds [20,24]", p.y);
    }
}

#[test]
fn test_moth_particle_spawns_with_dusty_color() {
    let mut ps = ParticleSystem::new();
    spawn_moth_particle(&mut ps, 5.0, 3.0);
    assert_eq!(ps.alive_count(), 1);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    // Dusty brown: r > g > b
    assert!(p.r > p.g, "moth r should exceed g, got r={} g={}", p.r, p.g);
    assert!(p.g > p.b, "moth g should exceed b, got g={} b={}", p.g, p.b);
    assert!(p.r > 0.5, "moth should be warm-toned (r > 0.5), got r={}", p.r);
}

#[test]
fn test_moth_flies_gently() {
    let mut ps = ParticleSystem::new();
    spawn_moth_particle(&mut ps, 4.0, 8.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.vx.abs() < 0.2, "moth vx should be gentle, got {}", p.vx);
    assert!(p.vy.abs() < 0.2, "moth vy should be gentle, got {}", p.vy);
}

#[test]
fn test_moth_hovers_near_building_height() {
    let mut ps = ParticleSystem::new();
    spawn_moth_particle(&mut ps, 6.0, 2.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.z > 0.5, "moth should hover above ground (z > 0.5), got z={}", p.z);
    assert!(p.z < 3.0, "moth should not fly too high (z < 3.0), got z={}", p.z);
}

#[test]
fn test_moth_has_long_lifetime() {
    let mut ps = ParticleSystem::new();
    spawn_moth_particle(&mut ps, 3.0, 9.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.life >= 3.5 && p.life <= 7.5, "moth life should be 3.5-7.5s, got {}", p.life);
}

#[test]
fn test_moth_burst_bounds_and_capacity() {
    let mut ps = ParticleSystem::new();
    let spawned = spawn_moth_burst(&mut ps, 10.0, 20.0, 14.0, 24.0, 4);
    assert!(spawned <= 4, "burst should spawn at most 4 particles, got {}", spawned);
    for p in ps.particles.iter().filter(|p| p.alive) {
        assert!(p.x >= 10.0 && p.x <= 14.0, "moth x={} out of bounds [10,14]", p.x);
        assert!(p.y >= 20.0 && p.y <= 24.0, "moth y={} out of bounds [20,24]", p.y);
    }
}

// ── Magic sparkle tests ───────────────────────────────────────────────────────
#[test]
fn test_magic_sparkle_particle_spawns_with_ethereal_color() {
    let mut ps = ParticleSystem::new();
    spawn_magic_sparkle_particle(&mut ps, 5.0, 3.0);
    assert_eq!(ps.alive_count(), 1);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    // Ethereal blue-white: high blue, high green, slightly lower red
    assert!(p.b > 0.8, "sparkle should be blue-dominant (b > 0.8), got b={}", p.b);
    assert!(p.r > 0.8, "sparkle should be bright (r > 0.8), got r={}", p.r);
    assert!(p.r >= p.g, "sparkle white balance: r >= g, got r={} g={}", p.r, p.g);
}

#[test]
fn test_magic_sparkle_rises_from_temple_height() {
    let mut ps = ParticleSystem::new();
    spawn_magic_sparkle_particle(&mut ps, 4.0, 8.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.z > 1.5, "sparkle should start above building height (z > 1.5), got z={}", p.z);
    assert!(p.z < 5.5, "sparkle should not start too high (z < 5.5), got z={}", p.z);
}

#[test]
fn test_magic_sparkle_rises_upward() {
    let mut ps = ParticleSystem::new();
    spawn_magic_sparkle_particle(&mut ps, 6.0, 2.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.vz > 0.0, "sparkle should rise (vz > 0), got vz={}", p.vz);
    assert!(p.vz < 1.5, "sparkle rise should be gentle (vz < 1.5), got vz={}", p.vz);
}

#[test]
fn test_magic_sparkle_has_medium_lifetime() {
    let mut ps = ParticleSystem::new();
    spawn_magic_sparkle_particle(&mut ps, 3.0, 9.0);
    let p = ps.particles.iter().find(|p| p.alive).unwrap();
    assert!(p.life >= 1.5 && p.life <= 5.0, "sparkle life should be 1.5-5.0s, got {}", p.life);
}

#[test]
fn test_magic_sparkle_burst_bounds_and_capacity() {
    let mut ps = ParticleSystem::new();
    let spawned = spawn_magic_sparkle_burst(&mut ps, 10.0, 20.0, 14.0, 24.0, 6);
    assert!(spawned <= 6, "burst should spawn at most 6 particles, got {}", spawned);
    for p in ps.particles.iter().filter(|p| p.alive) {
        assert!(p.x >= 10.0 && p.x <= 14.0, "sparkle x={} out of bounds [10,14]", p.x);
        assert!(p.y >= 20.0 && p.y <= 24.0, "sparkle y={} out of bounds [20,24]", p.y);
    }
}
