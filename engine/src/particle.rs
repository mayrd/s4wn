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
        if self.z < 0.0 { self.z = 0.0; self.vz = -self.vz * 0.3; }
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
            let angle = (i as f32 / count as f32) * 6.28318;
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
    let angle = (tile_x * 7.3 + tile_y * 3.7) % 6.28;
    let vx = angle.cos() * 0.08;
    let vy = angle.sin() * 0.08;
    let _ = ps.spawn(
        tile_x, tile_y, 0.5,
        vx, vy, 0.05,
        1.8,
        0.25 + (((tile_x * 13.1) % 1.0) as f32) * 0.2,
        0.65 + (((tile_y * 11.3) % 1.0) as f32) * 0.25,
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
            if (i as usize) < MAX_PARTICLES {
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
        assert!(count >= 1 && count <= 2, "smoke should spawn 1-2 particles, got {}", count);
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
}

