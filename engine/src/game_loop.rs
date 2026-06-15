//! S4WN Game Loop
//!
//! Tick-based deterministic update loop with frame-rate-independent
//! fixed timestep for game logic. Separates simulation (update) from
//! presentation (render), enabling multiplayer synchronization and
//! replay capabilities in future phases.
//!
//! ## Architecture
//!
//! ```text
//!   now ──► accumulator += frame_delta
//!            │
//!            ▼
//!   while accumulator >= tick_duration:
//!       game_state.update(tick_duration)   ◄── deterministic
//!       accumulator -= tick_duration
//!   ──► render(accumulator / tick_duration)  ◄── interpolation
//! ```
//!
//! ## Determinism Guarantees
//! - All game logic runs at fixed tick intervals (e.g., 100ms = 10 TPS)
//! - No access to wall-clock time inside game logic
//! - State transitions are purely functional: State → Input → State
//! - Randomness comes from a seeded PRNG (not system entropy)

use crate::map::Map;

/// Ticks per second for game logic (Settlers IV uses ~10 TPS)
pub const TICKS_PER_SECOND: f64 = 10.0;
/// Duration of one tick in seconds
pub const TICK_DURATION: f64 = 1.0 / TICKS_PER_SECOND;

/// The game state — data that evolves each tick.
/// This will grow significantly in Phase 2 (buildings, units, resources, players).
pub struct GameState {
    /// The world map (immutable terrain, mutable resources)
    pub map: Map,
    /// Total elapsed game ticks
    pub tick_count: u64,
    /// Game time in seconds (tick_count * TICK_DURATION)
    pub game_time: f64,
    /// Seeded random number generator state
    rng_seed: u64,
}

impl GameState {
    /// Create a new game state with the given map
    pub fn new(map: Map) -> Self {
        GameState {
            map,
            tick_count: 0,
            game_time: 0.0,
            rng_seed: 0xDEADBEEF_CAFE,
        }
    }

    /// Advance game logic by one tick
    pub fn update(&mut self) {
        self.tick_count += 1;
        self.game_time += TICK_DURATION;
        // Update PRNG state
        self.rng_seed = next_rng(self.rng_seed);

        // TODO Phase 2: Update economy, units, buildings, pathfinding, etc.
    }

    /// Get a seeded pseudo-random value in [0, 1)
    pub fn random(&self) -> f64 {
        // SplitMix64 / XorShift-style generator
        let x = self.rng_seed;
        let x = x.wrapping_add(0x9E3779B97F4A7C15);
        let mut z = x;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58476D1CE4E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D049BB133111EB);
        (z ^ (z >> 31)) as f64 / u64::MAX as f64
    }
}

/// Fast deterministic PRNG step (SplitMix64 variant)
fn next_rng(state: u64) -> u64 {
    state.wrapping_add(0x9E3779B97F4A7C15)
}

/// The main game loop controller.
/// Drives both simulation ticks and rendering.
pub struct GameLoop {
    /// Current game state
    pub state: GameState,
    /// Accumulated real-time for tick scheduling
    accumulator: f64,
    /// Last known wall-clock timestamp (seconds)
    last_time: f64,
    /// Whether we've received the first frame
    initialized: bool,
}

impl GameLoop {
    /// Create a new game loop with the given game state
    pub fn new(state: GameState) -> Self {
        GameLoop {
            state,
            accumulator: 0.0,
            last_time: 0.0,
            initialized: false,
        }
    }

    /// Call each frame with the current timestamp in seconds.
    /// Returns the number of ticks that ran this frame.
    pub fn frame(&mut self, now_seconds: f64) -> u32 {
        if !self.initialized {
            self.last_time = now_seconds;
            self.initialized = true;
            return 0;
        }

        // Clamp frame delta to avoid spiral of death
        let mut frame_delta = now_seconds - self.last_time;
        if frame_delta > 0.25 {
            frame_delta = 0.25; // max 4 frames behind
        }
        if frame_delta <= 0.0 {
            return 0;
        }

        self.last_time = now_seconds;
        self.accumulator += frame_delta;

        let mut ticks_ran = 0u32;
        while self.accumulator >= TICK_DURATION - 1e-9 {
            self.state.update();
            self.accumulator -= TICK_DURATION;
            ticks_ran += 1;
        }

        ticks_ran
    }

    /// Get the interpolation factor for smooth rendering between ticks.
    /// Range [0.0, 1.0) — 0 = exactly at last tick, near 1 = about to do next tick.
    pub fn interpolation(&self) -> f64 {
        self.accumulator / TICK_DURATION
    }

    /// Reset timing (useful after pause/resume or tab-switch)
    pub fn reset_timing(&mut self, now_seconds: f64) {
        self.last_time = now_seconds;
        self.accumulator = 0.0;
        self.initialized = true;
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tick_constants() {
        assert!((TICK_DURATION - 0.1).abs() < 0.001);
        assert_eq!(TICKS_PER_SECOND as i32, 10);
    }

    #[test]
    fn test_game_state_update() {
        let map = Map::new(8, 8);
        let mut state = GameState::new(map);
        assert_eq!(state.tick_count, 0);
        assert_eq!(state.game_time, 0.0);

        state.update();
        assert_eq!(state.tick_count, 1);
        assert!((state.game_time - 0.1).abs() < 0.0001);
    }

    #[test]
    fn test_game_loop_frame() {
        let map = Map::new(8, 8);
        let state = GameState::new(map);
        let mut gloop = GameLoop::new(state);

        // First frame initializes timing, no ticks
        assert_eq!(gloop.frame(1.0), 0);

        // 0.3s runs 3 ticks (delta=0.3 < 0.25 clamp? No, clamped to 0.25 = 2 ticks)
        // Let's use small deltas that don't hit clamping
        assert_eq!(gloop.frame(1.1), 1); // delta=0.1 → 1 tick
        assert_eq!(gloop.state.tick_count, 1);

        // 0.2s → 2 ticks
        assert_eq!(gloop.frame(1.3), 2); // delta=0.2 → 2 ticks
        assert_eq!(gloop.state.tick_count, 3);

        // 0.1s → 1 tick
        assert_eq!(gloop.frame(1.4), 1); // delta=0.1 → 1 tick
        assert_eq!(gloop.state.tick_count, 4);
    }

    #[test]
    fn test_interpolation() {
        let map = Map::new(8, 8);
        let state = GameState::new(map);
        let mut gloop = GameLoop::new(state);

        gloop.frame(0.0);
        assert!(gloop.interpolation() < 0.01,
            "after init, interpolation should be ~0, got {}", gloop.interpolation());

        // 0.05s = half a tick
        gloop.frame(0.05);
        assert!(gloop.interpolation() > 0.4 && gloop.interpolation() < 0.6,
            "interpolation should be ~0.5, got {}", gloop.interpolation());
    }

    #[test]
    fn test_max_frame_delta() {
        let map = Map::new(8, 8);
        let state = GameState::new(map);
        let mut gloop = GameLoop::new(state);

        gloop.frame(0.0);
        // Huge delta (5 seconds) should be clamped to 0.25s = max 2 ticks
        let ticks = gloop.frame(5.0);
        assert!(ticks <= 3, "Spiral of death protection: got {} ticks", ticks);
    }

    #[test]
    fn test_deterministic_random() {
        let map = Map::new(8, 8);
        let state1 = GameState::new(map.clone());
        let state2 = GameState::new(map);

        // Same seed → same sequence
        assert!((state1.random() - state2.random()).abs() < 0.0001);
    }

    #[test]
    fn test_random_range() {
        let map = Map::new(8, 8);
        let state = GameState::new(map);
        for _ in 0..100 {
            let r = state.random();
            assert!(r >= 0.0 && r < 1.0, "random out of range: {}", r);
        }
    }
}
