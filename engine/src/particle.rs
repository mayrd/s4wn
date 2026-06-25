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

    pub fn spawn(&mut self, x: f32, y: f32, z: f32, vx: f32, vy: f32, vz: f32,
                  life: f32, r: f32, g: f32, b: f32, size: f32) {
        self.x = x; self.y = y; self.z = z;
        self.vx = vx; self.vy = vy; self.vz = vz;
        self.life = life; self.max_life = life;
        self.r = r; self.g = g; self.b = b;
        self.size = size; self.alive = true;
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

    pub fn spawn(&mut self, x: f32, y: f32, z: f32, vx: f32, vy: f32, vz: f32,
                  life: f32, r: f32, g: f32, b: f32, size: f32) -> bool {
        for p in &mut self.particles {
            if !p.alive { p.spawn(x, y, z, vx, vy, vz, life, r, g, b, size); return true; }
        }
        false
    }

    /// Spawn a burst of particles in a circular pattern.
    /// Uses O(n) scanning for dead slots (not O(n^2) per burst iteration).
    pub fn spawn_burst(&mut self, x: f32, y: f32, z: f32, count: u32,
                        color_r: f32, color_g: f32, color_b: f32,
                        speed: f32, life: f32, size: f32) -> u32 {
        let mut spawned = 0u32;
        let max = self.particles.len();
        let mut dead_idx = 0usize;
        for i in 0..count {
            // Find next dead particle slot (single-pass cursor, O(n) total)
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
            self.particles[dead_idx].spawn(x, y, z, vx, vy, vz, life, color_r, color_g, color_b, size);
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
    ps.spawn_burst(tile_x, tile_y, 0.0, 12, 0.2, 0.9, 0.3, 3.0, 0.8, 6.0);
}

pub fn spawn_combat_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    ps.spawn_burst(tile_x, tile_y, 0.0, 16, 1.0, 0.4, 0.1, 4.5, 0.6, 5.0);
}

pub fn spawn_dust_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    ps.spawn_burst(tile_x, tile_y, 0.0, 4, 0.6, 0.55, 0.45, 1.0, 0.4, 4.0);
}

/// Spawn chimney smoke: slow-rising grey puffs.
pub fn spawn_smoke_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    let _ = ps.spawn(tile_x, tile_y, 1.5, 0.05, 0.0, 0.15, 1.5, 0.55, 0.55, 0.58, 10.0);
    let _ = ps.spawn(tile_x + 0.1, tile_y, 1.5, -0.03, 0.0, 0.12, 1.2, 0.50, 0.50, 0.53, 8.0);
}

/// Spawn floating leaf/forest particle: gentle drift, green tint.
pub fn spawn_leaf_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    let angle = (tile_x * 7.3 + tile_y * 3.7) % std::f32::consts::TAU;
    let vx = angle.cos() * 0.08;
    let vy = angle.sin() * 0.08;
    let _ = ps.spawn(
        tile_x, tile_y, 0.5,
        vx, vy, 0.05,
        1.8,
        0.25 + ((tile_x * 13.1) % 1.0) * 0.2,
        0.65 + ((tile_y * 11.3) % 1.0) * 0.25,
        0.15,
        5.0,
    );
}

/// Spawn building destruction rubble: brown/grey chunks burst + dust cloud.
/// Used when a building is destroyed (combat damage or demolition).
pub fn spawn_rubble_effect(ps: &mut ParticleSystem, tile_x: f32, tile_y: f32) {
    // Rubble chunks: brown/grey, medium speed, 20 particles
    ps.spawn_burst(tile_x, tile_y, 0.0, 20, 0.45, 0.35, 0.25, 3.5, 1.2, 7.0);
    // Dust overlay: lighter, slower, 8 particles
    ps.spawn_burst(tile_x, tile_y, 0.0, 8, 0.7, 0.65, 0.55, 1.5, 0.8, 10.0);
}

/// Spawn a single rain droplet: fast-falling blue-white streak from the sky.
/// Drops start at a pseudo-random height (z=2..5), fall with gravity,
/// and drift slightly horizontally. Short-lived for a streaking effect.
pub fn spawn_rain_particle(ps: &mut ParticleSystem, x: f32, y: f32) {
    let seed = x * 17.3 + y * 11.7;
    let z = 3.0 + (seed * 1.3).sin() * 2.0;
    let drift = (seed * 3.7).cos() * 0.3;
    let life = 0.3 + (seed * 7.1).sin().abs() * 0.25;
    let _ = ps.spawn(x + drift, y + drift * 0.7, z,
        (seed * 2.3).cos() * 0.25, (seed * 2.9).sin() * 0.25,
        -8.0 - (seed * 5.0).sin().abs() * 3.0,
        life, 0.7, 0.78, 0.95, 2.5);
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
        if ps.spawn(x, y, z,
            (seed * 2.3).cos() * 0.25, (seed * 2.9).sin() * 0.25,
            -8.0 - (seed * 5.0).sin().abs() * 3.0,
            0.3 + (seed * 7.1).sin().abs() * 0.25,
            0.7, 0.78, 0.95, 2.5) {
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
    let _ = ps.spawn(x + drift, y + drift * 0.5, z,
        (seed * 1.7).cos() * 0.15, (seed * 2.1).sin() * 0.15,
        -1.5 - (seed * 3.0).sin().abs() * 1.0,
        life, 0.92, 0.95, 1.0, 1.8);
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
        if ps.spawn(x, y, z,
            (seed * 1.7).cos() * 0.15, (seed * 2.1).sin() * 0.15,
            -1.5 - (seed * 3.0).sin().abs() * 1.0,
            2.0 + (seed * 3.7).sin().abs() * 3.0,
            0.92, 0.95, 1.0, 1.8) {
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
    let _ = ps.spawn(x, y, z,
        (seed * 1.9).cos() * 0.8 + 0.4,  // vx: strong prevailing wind (eastward)
        (seed * 2.7).sin() * 0.4,        // vy: gentle lateral sway
        -0.3 - (seed * 3.3).sin().abs() * 0.5,  // vz: very slow fall (suspended)
        life,
        0.72 + hue_var,                   // r: sandy brown
        0.60 + hue_var * 0.5,             // g
        0.42,                             // b
        2.2);                             // size: larger wind-blown particle
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
        if ps.spawn(x, y, z,
            (seed * 1.9).cos() * 0.8 + 0.4,
            (seed * 2.7).sin() * 0.4,
            -0.3 - (seed * 3.3).sin().abs() * 0.5,
            3.0 + (seed * 4.1).sin().abs() * 4.0,
            0.72 + (seed * 7.3).sin() * 0.08,
            0.60 + (seed * 7.3).sin() * 0.04,
            0.42,
            2.2) {
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
    let _ = ps.spawn(x, y, z,
        (seed * 1.3).cos() * 0.08,   // vx: very gentle drift
        (seed * 1.9).sin() * 0.06,   // vy: minimal
        0.02 + (seed * 0.5).sin().abs() * 0.03,  // vz: slight rise (mist lifts)
        life,
        0.82, 0.85, 0.88,           // r,g,b: pale grey-white
        3.5);                         // size: large soft puff
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
        if ps.spawn(x, y, z,
            (seed * 1.3).cos() * 0.08, (seed * 1.9).sin() * 0.06,
            0.02 + (seed * 0.5).sin().abs() * 0.03,
            4.0 + (seed * 2.3).sin().abs() * 4.0,
            0.82, 0.85, 0.88, 3.5) {
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
    ps.spawn_burst(tile_x, tile_y, 0.1, 6, r, g, b, 1.2, 0.6, 3.5);
    // Sparkle highlights -- brighter, faster, nation-dominant color
    let sr = 0.5 + nation_r * 0.4;
    let sg = 0.45 + nation_g * 0.4;
    let sb = 0.4 + nation_b * 0.35;
    ps.spawn_burst(tile_x, tile_y, 0.3, 4, sr, sg, sb, 2.0, 0.4, 2.5);
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
        p.spawn(1.0, 2.0, 0.0, 0.5, 0.5, 2.0, 1.0, 1.0, 0.0, 0.0, 8.0);
        assert!(p.alive);
        assert_eq!(p.x, 1.0);
        assert_eq!(p.vz, 2.0);
    }

    #[test]
    fn test_particle_tick_moves() {
        let mut p = Particle::new();
        p.spawn(0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 2.0, 1.0, 1.0, 1.0, 8.0);
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
        p.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 8.0);
        assert!(p.tick(0.3));
        assert!(!p.tick(0.3));
        assert!(!p.alive);
    }

    #[test]
    fn test_particle_alpha_fade() {
        let mut p = Particle::new();
        p.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 8.0);
        assert!((p.alpha() - 1.0).abs() < 0.001);
        p.life = 0.5;
        let alpha = p.alpha();
        assert!(alpha < 1.0 && alpha > 0.0);
    }

    #[test]
    fn test_particle_bounce() {
        let mut p = Particle::new();
        p.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 1.0, 1.0, 1.0, 8.0);
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
        assert!(ps.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 8.0));
        assert_eq!(ps.alive_count(), 1);
    }

    #[test]
    fn test_system_spawn_burst() {
        let mut ps = ParticleSystem::new();
        let n = ps.spawn_burst(5.0, 5.0, 0.0, 8, 0.0, 1.0, 0.0, 2.0, 1.0, 6.0);
        assert_eq!(n, 8);
        assert_eq!(ps.alive_count(), 8);
    }

    #[test]
    fn test_system_update_removes_dead() {
        let mut ps = ParticleSystem::new();
        ps.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 1.0, 1.0, 1.0, 8.0);
        assert_eq!(ps.alive_count(), 1);
        ps.update(0.5);
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_system_clear() {
        let mut ps = ParticleSystem::new();
        ps.spawn_burst(0.0, 0.0, 0.0, 10, 1.0, 1.0, 1.0, 2.0, 1.0, 6.0);
        assert_eq!(ps.alive_count(), 10);
        ps.clear();
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_system_max_particles() {
        let mut ps = ParticleSystem::new();
        for i in 0..MAX_PARTICLES + 10 {
            let spawned = ps.spawn(i as f32, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 1.0, 8.0);
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
        ps.spawn(3.0, 4.0, 0.5, 0.0, 0.0, 0.0, 1.0, 0.2, 0.8, 0.3, 10.0);
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
        ps.spawn(1.0, 2.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.5, 0.2, 8.0);
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
        p.spawn(0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 3.0, 1.0, 1.0, 1.0, 8.0);
        p.tick(0.1);
        assert!(p.vz < 0.0, "vz should be negative after gravity");
        p.tick(0.1);
        assert!(p.z < 5.0, "z should decrease after 2 ticks: {}", p.z);
    }

    #[test]
    fn test_burst_deterministic() {
        let mut ps1 = ParticleSystem::new();
        let mut ps2 = ParticleSystem::new();
        let n1 = ps1.spawn_burst(0.0, 0.0, 0.0, 10, 1.0, 0.0, 0.0, 2.0, 1.0, 6.0);
        let n2 = ps2.spawn_burst(0.0, 0.0, 0.0, 10, 1.0, 0.0, 0.0, 2.0, 1.0, 6.0);
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
        ps.spawn_burst(0.0, 0.0, 0.0, 50, 1.0, 0.0, 0.0, 2.0, 1.0, 6.0);
        assert_eq!(ps.alive_count(), 50);
        ps.clear();
        assert_eq!(ps.alive_count(), 0);
        let n = ps.spawn_burst(0.0, 0.0, 0.0, 30, 0.0, 1.0, 0.0, 2.0, 1.0, 6.0);
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
            ps.spawn(i as f32, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 1.0, 8.0);
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
            ps.spawn(i as f32, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 1.0, 8.0);
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
            ps.spawn(i as f32, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 1.0, 8.0);
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
            ps.spawn(i as f32, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 1.0, 8.0);
        }
        assert_eq!(ps.alive_count(), MAX_PARTICLES);
        let n = spawn_fog_burst(&mut ps, 0.0, 0.0, 10.0, 10.0, 20);
        assert_eq!(n, 0, "fog burst should spawn 0 when system full");
    }
}

