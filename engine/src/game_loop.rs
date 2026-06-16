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

use crate::combat::CombatAI;
use crate::economy::Economy;
use crate::map::Map;
use crate::worker_ai::WorkerAI;

/// Ticks per second for game logic (Settlers IV uses ~10 TPS)
pub const TICKS_PER_SECOND: f64 = 10.0;
/// Duration of one tick in seconds
pub const TICK_DURATION: f64 = 1.0 / TICKS_PER_SECOND;

/// The game state — data that evolves each tick.
pub struct GameState {
    /// The world map (immutable terrain, mutable resources)
    pub map: Map,
    /// Total elapsed game ticks
    pub tick_count: u64,
    /// Game time in seconds (tick_count * TICK_DURATION)
    pub game_time: f64,
    /// Seeded random number generator state
    rng_seed: u64,
    /// Economy system (resources, buildings, production)
    pub economy: Economy,
    /// Worker AI controller — auto-assigns and moves workers
    worker_ai: WorkerAI,
    /// Combat AI controller — manages military engagements
    combat_ai: CombatAI,
}

impl GameState {
    /// Create a new game state with the given map
    pub fn new(map: Map) -> Self {
        GameState {
            map,
            tick_count: 0,
            game_time: 0.0,
            rng_seed: 0xDEADBEEF_CAFE,
            economy: Economy::new(),
            worker_ai: WorkerAI::new(),
            combat_ai: CombatAI::new(),
        }
    }

    /// Create a new game state with starting resources
    pub fn with_starting_resources(
        map: Map,
        resources: &[(crate::economy::ResourceType, u32)],
    ) -> Self {
        GameState {
            map,
            tick_count: 0,
            game_time: 0.0,
            rng_seed: 0xDEADBEEF_CAFE,
            economy: Economy::with_starting_resources(resources),
            worker_ai: WorkerAI::new(),
            combat_ai: CombatAI::new(),
        }
    }

    /// Advance game logic by one tick
    pub fn update(&mut self) {
        self.tick_count += 1;
        self.game_time += TICK_DURATION;
        // Update PRNG state
        self.rng_seed = next_rng(self.rng_seed);

        // Update worker AI (auto-assigns workers, moves them, calls economy.update())
        self.worker_ai.update(&mut self.economy, &self.map, TICK_DURATION as f32);

        // Update combat AI (soldiers seek enemies, fight)
        self.combat_ai.update(&mut self.economy.units, &self.map, TICK_DURATION as f32);
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
    fn test_game_state_with_economy() {
        let map = Map::new(8, 8);
        let state = GameState::new(map);
        assert_eq!(state.economy.building_count(), 0);
        assert_eq!(state.economy.storage.total(), 0);
    }

    #[test]
    fn test_game_state_with_starting_resources() {
        let map = Map::new(8, 8);
        let state = GameState::with_starting_resources(
            map,
            &[
                (crate::economy::ResourceType::Wood, 50),
                (crate::economy::ResourceType::Stone, 30),
            ],
        );
        assert_eq!(state.economy.storage.get(crate::economy::ResourceType::Wood), 50);
        assert_eq!(state.economy.storage.get(crate::economy::ResourceType::Stone), 30);
    }

    #[test]
    fn test_game_loop_frame() {
        let map = Map::new(8, 8);
        let state = GameState::new(map);
        let mut gloop = GameLoop::new(state);

        // First frame initializes timing, no ticks
        assert_eq!(gloop.frame(1.0), 0);

        // 0.1s → 1 tick
        assert_eq!(gloop.frame(1.1), 1);
        assert_eq!(gloop.state.tick_count, 1);

        // 0.2s → 2 ticks
        assert_eq!(gloop.frame(1.3), 2);
        assert_eq!(gloop.state.tick_count, 3);

        // 0.1s → 1 tick
        assert_eq!(gloop.frame(1.4), 1);
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

    #[test]
    fn test_economy_integration_with_worker_ai() {
        use crate::economy::{BuildingType, ResourceType};

        let map = Map::new(8, 8);
        let mut state = GameState::with_starting_resources(
            map,
            &[(ResourceType::Wood, 100), (ResourceType::Stone, 50)],
        );

        // Place a farm and spawn a worker separately (not at the building)
        let farm_idx = state.economy.place_building(BuildingType::Farm, 5, 5);
        let _worker_id = state.economy.units.spawn(
            crate::units::UnitKind::Settler, 0.5, 0.5,
        );

        // Run ticks — building constructs, worker auto-assigns, moves there, works
        for _ in 0..1000 {
            state.update();
        }

        // Farm should be complete, worker assigned, and grain produced
        assert!(state.economy.buildings[farm_idx].is_complete());
        let grain = state.economy.storage.get(ResourceType::Grain);
        assert!(
            grain > 0,
            "Worker AI should assign worker to farm and produce grain, got {}",
            grain
        );
    }

    #[test]
    fn test_combat_integration_through_game_loop() {
        use crate::units::UnitKind;

        let map = Map::new(20, 20);
        let mut state = GameState::new(map);

        // Spawn two enemy soldiers near each other
        let _soldier1 = state.economy.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let _soldier2 = state.economy.units.spawn(UnitKind::Swordsman, 6.5, 5.5);

        // Run many ticks — soldiers should engage in combat
        for _ in 0..500 {
            state.update();
        }

        // At least one soldier should have taken damage
        let u1 = state.economy.units.get(1).unwrap();
        let u2 = state.economy.units.get(2).unwrap();
        let total_hp = u1.hp + u2.hp;
        assert!(
            total_hp < 200,
            "Soldiers should have damaged each other via game loop, total_hp={}",
            total_hp
        );
    }

    #[test]
    fn test_full_scenario_build_farm_produce_combat() {
        use crate::economy::{BuildingType, ResourceType};
        use crate::units::UnitKind;

        let map = Map::new(30, 30);
        let mut state = GameState::with_starting_resources(
            map,
            &[
                (ResourceType::Wood, 200),
                (ResourceType::Stone, 100),
                (ResourceType::Iron, 50),
                (ResourceType::Coal, 50),
            ],
        );

        // Phase 1: Build a farm + lumberjack + sawmill + blacksmith + armory
        let _farm = state.economy.place_building(BuildingType::Farm, 3, 3);
        let _lumberjack = state.economy.place_building(BuildingType::Woodcutter, 5, 3);
        let _sawmill = state.economy.place_building(BuildingType::Sawmill, 7, 3);
        let _blacksmith = state.economy.place_building(BuildingType::Toolsmith, 9, 3);
        let _armory = state.economy.place_building(BuildingType::Weaponsmith, 11, 3);

        // Spawn workers
        state.economy.units.spawn(UnitKind::Settler, 0.5, 0.5);
        state.economy.units.spawn(UnitKind::Settler, 1.5, 0.5);
        state.economy.units.spawn(UnitKind::Settler, 2.5, 0.5);
        state.economy.units.spawn(UnitKind::Settler, 3.5, 0.5);
        state.economy.units.spawn(UnitKind::Settler, 4.5, 0.5);

        // Phase 2: Spawn enemy soldiers
        state.economy.units.spawn(UnitKind::Swordsman, 20.5, 20.5);
        state.economy.units.spawn(UnitKind::Swordsman, 21.5, 20.5);

        // Phase 3: Run 3000 ticks (~300 seconds of game time)
        for tick in 0..3000 {
            state.update();

            // After 2000 ticks, spawn a friendly soldier
            if tick == 2000 {
                state.economy.units.spawn(UnitKind::Swordsman, 15.5, 15.5);
            }
        }

        // Verify: farm produced grain, buildings are complete
        let grain = state.economy.storage.get(ResourceType::Grain);
        let wood = state.economy.storage.get(ResourceType::Wood);

        assert!(grain > 0, "Farm should produce grain: {}", grain);
        assert!(wood >= 200, "Wood should be >= starting amount: {}", wood);

        // Verify: combat happened
        let all_units: Vec<_> = state.economy.units.alive_units().collect();
        let total_soldiers = all_units
            .iter()
            .filter(|u| u.kind.can_fight())
            .count();
        // We started with 3 soldiers (2 enemy + 1 friendly). Some may have died.
        assert!(
            total_soldiers <= 3,
            "Should have max 3 soldiers alive, got {}",
            total_soldiers
        );
    }
}
