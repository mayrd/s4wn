//! S4WN Units Module
//!
//! Phase 2 — Game Logic: settler/warfare units, movement, and combat.
//!
//! ## Design
//!
//! Units are the active agents of the game. They move around the map,
//! perform tasks (work in buildings, fight enemies), and carry resources.
//!
//! Two broad categories:
//! - **Workers** (settlers) — assigned to buildings to enable production
//! - **Soldiers** — military units for combat
//!
//! Units have:
//! - A position on the map (tile coordinates)
//! - Health points (HP)
//! - Movement speed (tiles per second)
//! - An optional path (A* computed waypoints)
//! - An optional assignment (building index they work at)

use crate::map::{Map, Terrain};
use crate::pathfinding::Path;

/// Unit type determines behavior and stats.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum UnitKind {
    /// Worker settler — can be assigned to buildings
    Worker = 0,
    /// Basic soldier — melee fighter
    Soldier = 1,
    /// Archer — ranged fighter
    Archer = 2,
}

impl UnitKind {
    /// Display name
    pub fn name(self) -> &'static str {
        match self {
            UnitKind::Worker => "Worker",
            UnitKind::Soldier => "Soldier",
            UnitKind::Archer => "Archer",
        }
    }

    /// Maximum HP for this unit type
    pub fn max_hp(self) -> u32 {
        match self {
            UnitKind::Worker => 50,
            UnitKind::Soldier => 100,
            UnitKind::Archer => 60,
        }
    }

    /// Movement speed in tiles per second
    pub fn speed(self) -> f32 {
        match self {
            UnitKind::Worker => 2.0,
            UnitKind::Soldier => 2.5,
            UnitKind::Archer => 2.0,
        }
    }

    /// Attack damage per hit
    pub fn attack_damage(self) -> u32 {
        match self {
            UnitKind::Worker => 0,   // workers can't fight
            UnitKind::Soldier => 15,
            UnitKind::Archer => 10,
        }
    }

    /// Attack range in tiles (1 = adjacent)
    pub fn attack_range(self) -> f32 {
        match self {
            UnitKind::Worker => 0.0,
            UnitKind::Soldier => 1.0,
            UnitKind::Archer => 3.0,
        }
    }

    /// Ticks between attacks (at 10 TPS)
    pub fn attack_interval(self) -> u32 {
        match self {
            UnitKind::Worker => 0,
            UnitKind::Soldier => 15,  // 1.5s
            UnitKind::Archer => 20,   // 2.0s
        }
    }

    /// Whether this unit can be assigned to a building
    pub fn can_work(self) -> bool {
        matches!(self, UnitKind::Worker)
    }

    /// Whether this unit can fight
    pub fn can_fight(self) -> bool {
        !matches!(self, UnitKind::Worker)
    }
}

/// Current state of a unit
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnitState {
    /// Idle — doing nothing
    Idle,
    /// Moving along a path
    Moving,
    /// Working at a building
    Working,
    /// Fighting an enemy
    Fighting,
    /// Dead
    Dead,
}

/// A game unit (worker or soldier)
#[derive(Debug, Clone)]
pub struct Unit {
    /// Unique unit ID
    pub id: u32,
    /// Unit type
    pub kind: UnitKind,
    /// Current position (tile coordinates, fractional for smooth movement)
    pub x: f32,
    pub y: f32,
    /// Current HP
    pub hp: u32,
    /// Maximum HP
    pub max_hp: u32,
    /// Current state
    pub state: UnitState,
    /// Movement path (waypoints), if moving
    pub path: Option<Path>,
    /// Current waypoint index in path
    pub path_index: usize,
    /// Assigned building index (into Economy.buildings), if any
    pub assigned_building: Option<usize>,
    /// Ticks until next attack
    pub attack_cooldown: u32,
    /// Target unit ID for combat
    pub target: Option<u32>,
}

impl Unit {
    /// Create a new unit at the given position
    pub fn new(id: u32, kind: UnitKind, x: f32, y: f32) -> Self {
        let max_hp = kind.max_hp();
        Unit {
            id,
            kind,
            x,
            y,
            hp: max_hp,
            max_hp,
            state: UnitState::Idle,
            path: None,
            path_index: 0,
            assigned_building: None,
            attack_cooldown: 0,
            target: None,
        }
    }

    /// Whether the unit is alive
    pub fn is_alive(&self) -> bool {
        self.hp > 0
    }

    /// Whether the unit is idle
    pub fn is_idle(&self) -> bool {
        self.state == UnitState::Idle && self.is_alive()
    }

    /// Whether the unit can be assigned to a building
    pub fn can_assign(&self) -> bool {
        self.kind.can_work() && self.is_idle()
    }

    /// Assign this unit to a building
    pub fn assign_to(&mut self, building_index: usize) {
        if self.can_assign() {
            self.assigned_building = Some(building_index);
            self.state = UnitState::Working;
        }
    }

    /// Unassign from current building
    pub fn unassign(&mut self) {
        self.assigned_building = None;
        if self.state == UnitState::Working {
            self.state = UnitState::Idle;
        }
    }

    /// Order the unit to move along a path
    pub fn move_along(&mut self, path: Path) {
        if path.is_empty() {
            return;
        }
        self.path = Some(path);
        self.path_index = 0;
        self.state = UnitState::Moving;
        self.unassign();
    }

    /// Get the unit's current target tile (for pathfinding destinations)
    pub fn target_tile(&self) -> Option<(usize, usize)> {
        self.path.as_ref().and_then(|p| {
            if self.path_index < p.tiles().len() {
                Some(p.tiles()[self.path_index])
            } else {
                None
            }
        })
    }

    /// Advance unit movement by `dt` seconds.
    /// Returns true if the unit reached its destination.
    pub fn tick_movement(&mut self, dt: f32, map: &Map) -> bool {
        let path = match &self.path {
            Some(p) if self.path_index < p.tiles().len() => p,
            _ => {
                self.state = UnitState::Idle;
                self.path = None;
                return true;
            }
        };

        let target = path.tiles()[self.path_index];
        let tx = target.0 as f32 + 0.5; // center of tile
        let ty = target.1 as f32 + 0.5;

        let dx = tx - self.x;
        let dy = ty - self.y;
        let dist = (dx * dx + dy * dy).sqrt();

        // Get terrain speed multiplier at current position
        let tile_x = self.x as usize;
        let tile_y = self.y as usize;
        let speed_mult = map
            .get(tile_x, tile_y)
            .map(|t| t.terrain.speed_multiplier())
            .unwrap_or(1.0);

        let move_speed = self.kind.speed() * speed_mult;
        let step = move_speed * dt;

        if dist <= step {
            // Reached waypoint
            self.x = tx;
            self.y = ty;
            self.path_index += 1;
            if self.path_index >= path.tiles().len() {
                // Reached destination
                self.state = UnitState::Idle;
                self.path = None;
                return true;
            }
        } else {
            // Move toward waypoint
            self.x += (dx / dist) * step;
            self.y += (dy / dist) * step;
        }

        false
    }

    /// Take damage. Returns true if unit died.
    pub fn take_damage(&mut self, amount: u32) -> bool {
        self.hp = self.hp.saturating_sub(amount);
        if self.hp == 0 {
            self.state = UnitState::Dead;
            true
        } else {
            false
        }
    }

    /// Heal the unit
    pub fn heal(&mut self, amount: u32) {
        self.hp = (self.hp + amount).min(self.max_hp);
    }

    /// Tick attack cooldown
    pub fn tick_attack(&mut self) {
        if self.attack_cooldown > 0 {
            self.attack_cooldown -= 1;
        }
    }

    /// Whether the unit can attack now
    pub fn can_attack(&self) -> bool {
        self.kind.can_fight() && self.attack_cooldown == 0 && self.is_alive()
    }

    /// Distance to another unit
    pub fn distance_to(&self, other: &Unit) -> f32 {
        let dx = self.x - other.x;
        let dy = self.y - other.y;
        (dx * dx + dy * dy).sqrt()
    }
}

/// Manages all units in the game.
#[derive(Debug, Clone)]
pub struct UnitManager {
    /// All units (alive and dead)
    units: Vec<Unit>,
    /// Next unit ID to assign
    next_id: u32,
}

impl UnitManager {
    /// Create a new unit manager
    pub fn new() -> Self {
        UnitManager {
            units: Vec::new(),
            next_id: 1,
        }
    }

    /// Spawn a new unit at the given position
    pub fn spawn(&mut self, kind: UnitKind, x: f32, y: f32) -> u32 {
        let id = self.next_id;
        self.next_id += 1;
        let unit = Unit::new(id, kind, x, y);
        self.units.push(unit);
        id
    }

    /// Get a unit by ID
    pub fn get(&self, id: u32) -> Option<&Unit> {
        self.units.iter().find(|u| u.id == id)
    }

    /// Get a mutable unit by ID
    pub fn get_mut(&mut self, id: u32) -> Option<&mut Unit> {
        self.units.iter_mut().find(|u| u.id == id)
    }

    /// Get all units
    pub fn all(&self) -> &[Unit] {
        &self.units
    }

    /// Get all units mutably
    pub fn all_mut(&mut self) -> &mut [Unit] {
        &mut self.units
    }

    /// Get all alive units
    pub fn alive_units(&self) -> impl Iterator<Item = &Unit> {
        self.units.iter().filter(|u| u.is_alive())
    }

    /// Get alive units of a specific kind
    pub fn alive_of_kind(&self, kind: UnitKind) -> impl Iterator<Item = &Unit> {
        self.units
            .iter()
            .filter(move |u| u.is_alive() && u.kind == kind)
    }

    /// Count alive units
    pub fn alive_count(&self) -> usize {
        self.units.iter().filter(|u| u.is_alive()).count()
    }

    /// Count alive workers
    pub fn worker_count(&self) -> usize {
        self.alive_of_kind(UnitKind::Worker).count()
    }

    /// Count idle workers (available for assignment)
    pub fn idle_worker_count(&self) -> usize {
        self.units
            .iter()
            .filter(|u| u.kind == UnitKind::Worker && u.is_idle())
            .count()
    }

    /// Get all idle workers
    pub fn idle_workers(&self) -> impl Iterator<Item = &Unit> {
        self.units
            .iter()
            .filter(|u| u.kind == UnitKind::Worker && u.is_idle())
    }

    /// Get the first idle worker, if any
    pub fn find_idle_worker(&self) -> Option<&Unit> {
        self.units
            .iter()
            .find(|u| u.kind == UnitKind::Worker && u.is_idle())
    }

    /// Get mutable reference to first idle worker
    pub fn find_idle_worker_mut(&mut self) -> Option<&mut Unit> {
        self.units
            .iter_mut()
            .find(|u| u.kind == UnitKind::Worker && u.is_idle())
    }

    /// Assign an idle worker to a building. Returns the worker ID.
    pub fn assign_worker(&mut self, building_index: usize) -> Option<u32> {
        let worker = self.find_idle_worker_mut()?;
        worker.assign_to(building_index);
        Some(worker.id)
    }

    /// Tick all units: movement, attack cooldowns
    pub fn tick(&mut self, dt: f32, map: &Map) {
        for unit in self.units.iter_mut() {
            if !unit.is_alive() {
                continue;
            }

            // Tick movement
            if unit.state == UnitState::Moving {
                unit.tick_movement(dt, map);
            }

            // Tick attack cooldown
            unit.tick_attack();
        }
    }

    /// Remove dead units (call periodically to clean up)
    pub fn remove_dead(&mut self) {
        self.units.retain(|u| u.is_alive());
    }

    /// Get total unit count (including dead)
    pub fn total_count(&self) -> usize {
        self.units.len()
    }
}

impl Default for UnitManager {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unit_new() {
        let u = Unit::new(1, UnitKind::Worker, 5.0, 10.0);
        assert_eq!(u.id, 1);
        assert_eq!(u.kind, UnitKind::Worker);
        assert_eq!(u.hp, 50);
        assert_eq!(u.max_hp, 50);
        assert_eq!(u.state, UnitState::Idle);
        assert!(u.is_alive());
        assert!(u.is_idle());
    }

    #[test]
    fn test_unit_kind_stats() {
        assert_eq!(UnitKind::Worker.max_hp(), 50);
        assert_eq!(UnitKind::Soldier.max_hp(), 100);
        assert_eq!(UnitKind::Archer.max_hp(), 60);

        assert_eq!(UnitKind::Worker.attack_damage(), 0);
        assert_eq!(UnitKind::Soldier.attack_damage(), 15);
        assert_eq!(UnitKind::Archer.attack_damage(), 10);

        assert!(UnitKind::Worker.can_work());
        assert!(!UnitKind::Soldier.can_work());
        assert!(!UnitKind::Archer.can_work());

        assert!(!UnitKind::Worker.can_fight());
        assert!(UnitKind::Soldier.can_fight());
        assert!(UnitKind::Archer.can_fight());
    }

    #[test]
    fn test_unit_assign_worker() {
        let mut u = Unit::new(1, UnitKind::Worker, 0.0, 0.0);
        assert!(u.can_assign());

        u.assign_to(5);
        assert_eq!(u.assigned_building, Some(5));
        assert_eq!(u.state, UnitState::Working);
        assert!(!u.can_assign());

        u.unassign();
        assert_eq!(u.assigned_building, None);
        assert_eq!(u.state, UnitState::Idle);
    }

    #[test]
    fn test_unit_assign_non_worker() {
        let mut u = Unit::new(1, UnitKind::Soldier, 0.0, 0.0);
        assert!(!u.can_assign());
        // assign_to should be a no-op
        u.assign_to(5);
        assert_eq!(u.assigned_building, None);
    }

    #[test]
    fn test_unit_take_damage() {
        let mut u = Unit::new(1, UnitKind::Soldier, 0.0, 0.0);
        assert!(!u.take_damage(30));
        assert_eq!(u.hp, 70);
        assert!(u.is_alive());

        assert!(u.take_damage(70));
        assert_eq!(u.hp, 0);
        assert!(!u.is_alive());
        assert_eq!(u.state, UnitState::Dead);
    }

    #[test]
    fn test_unit_heal() {
        let mut u = Unit::new(1, UnitKind::Soldier, 0.0, 0.0);
        u.take_damage(50);
        assert_eq!(u.hp, 50);
        u.heal(20);
        assert_eq!(u.hp, 70);
        u.heal(100); // should cap at max
        assert_eq!(u.hp, 100);
    }

    #[test]
    fn test_unit_distance() {
        let u1 = Unit::new(1, UnitKind::Worker, 0.0, 0.0);
        let u2 = Unit::new(2, UnitKind::Worker, 3.0, 4.0);
        let d = u1.distance_to(&u2);
        assert!((d - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_unit_attack_cooldown() {
        let mut u = Unit::new(1, UnitKind::Soldier, 0.0, 0.0);
        assert!(u.can_attack());

        // Simulate an attack
        u.attack_cooldown = u.kind.attack_interval();
        assert!(!u.can_attack());

        // Tick down
        for _ in 0..u.kind.attack_interval() {
            u.tick_attack();
        }
        assert!(u.can_attack());
    }

    #[test]
    fn test_unit_movement() {
        let map = Map::new(10, 10);
        let mut u = Unit::new(1, UnitKind::Worker, 0.5, 0.5);

        // Create a path: (0,0) → (5,0) — unit starts at center of (0,0)
        let path = Path::new(vec![(0, 0), (5, 0)]);
        u.move_along(path);
        assert_eq!(u.state, UnitState::Moving);

        // Move for several ticks
        for _ in 0..200 {
            let done = u.tick_movement(0.016, &map);
            if done {
                break;
            }
        }
        // Should have moved toward (5,0)
        assert!(u.x > 1.0, "Unit should have moved right, x={}", u.x);
    }

    #[test]
    fn test_unit_manager_spawn() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Worker, 1.0, 1.0);
        let id2 = mgr.spawn(UnitKind::Soldier, 2.0, 2.0);
        let id3 = mgr.spawn(UnitKind::Worker, 3.0, 3.0);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
        assert_eq!(mgr.alive_count(), 3);
        assert_eq!(mgr.worker_count(), 2);
        assert_eq!(mgr.idle_worker_count(), 2);
    }

    #[test]
    fn test_unit_manager_assign_worker() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Worker, 1.0, 1.0);
        mgr.spawn(UnitKind::Worker, 2.0, 2.0);
        mgr.spawn(UnitKind::Soldier, 3.0, 3.0);

        let wid = mgr.assign_worker(0);
        assert!(wid.is_some());
        assert_eq!(mgr.idle_worker_count(), 1); // one worker assigned

        let wid2 = mgr.assign_worker(1);
        assert!(wid2.is_some());
        assert_eq!(mgr.idle_worker_count(), 0); // all workers assigned

        // No more idle workers
        let wid3 = mgr.assign_worker(2);
        assert!(wid3.is_none());
    }

    #[test]
    fn test_unit_manager_get() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Worker, 5.0, 5.0);

        let u = mgr.get(1);
        assert!(u.is_some());
        assert_eq!(u.unwrap().x, 5.0);

        assert!(mgr.get(999).is_none());
    }

    #[test]
    fn test_unit_manager_remove_dead() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Soldier, 1.0, 1.0);
        mgr.spawn(UnitKind::Soldier, 2.0, 2.0);

        mgr.get_mut(id1).unwrap().take_damage(200);
        assert_eq!(mgr.alive_count(), 1);
        assert_eq!(mgr.total_count(), 2);

        mgr.remove_dead();
        assert_eq!(mgr.total_count(), 1);
    }

    #[test]
    fn test_unit_manager_tick() {
        let map = Map::new(10, 10);
        let mut mgr = UnitManager::new();
        let id = mgr.spawn(UnitKind::Worker, 0.5, 0.5);

        let path = Path::new(vec![(0, 0), (5, 0)]);
        mgr.get_mut(id).unwrap().move_along(path);

        // Tick for a while
        for _ in 0..100 {
            mgr.tick(0.016, &map);
        }
        let u = mgr.get(id).unwrap();
        assert_eq!(u.state, UnitState::Moving);
        // Should have moved slightly right
        assert!(u.x > 0.6, "Unit should have moved, x={}", u.x);
    }
}
