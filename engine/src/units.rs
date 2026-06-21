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

use crate::map::Map;
use crate::pathfinding::Path;

/// Unit type determines behavior and stats.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum UnitKind {
    /// Settler — can be assigned to buildings
    Settler = 0,
    /// Swordsman — melee fighter
    Swordsman = 1,
    /// Bowman — ranged fighter
    Bowman = 2,
}

impl UnitKind {
    /// Display name
    pub fn name(self) -> &'static str {
        match self {
            UnitKind::Settler => "Settler",
            UnitKind::Swordsman => "Swordsman",
            UnitKind::Bowman => "Bowman",
        }
    }

    /// Maximum HP for this unit type
    pub fn max_hp(self) -> u32 {
        match self {
            UnitKind::Settler => 50,
            UnitKind::Swordsman => 100,
            UnitKind::Bowman => 60,
        }
    }

    /// Movement speed in tiles per second
    pub fn speed(self) -> f32 {
        match self {
            UnitKind::Settler => 2.0,
            UnitKind::Swordsman => 2.5,
            UnitKind::Bowman => 2.0,
        }
    }

    /// Attack damage per hit
    pub fn attack_damage(self) -> u32 {
        match self {
            UnitKind::Settler => 0, // settlers can't fight
            UnitKind::Swordsman => 15,
            UnitKind::Bowman => 10,
        }
    }

    /// Attack range in tiles (1 = adjacent)
    pub fn attack_range(self) -> f32 {
        match self {
            UnitKind::Settler => 0.0,
            UnitKind::Swordsman => 1.0,
            UnitKind::Bowman => 3.0,
        }
    }

    /// Ticks between attacks (at 10 TPS)
    pub fn attack_interval(self) -> u32 {
        match self {
            UnitKind::Settler => 0,
            UnitKind::Swordsman => 15, // 1.5s
            UnitKind::Bowman => 20,    // 2.0s
        }
    }

    /// Whether this unit can be assigned to a building
    pub fn can_work(self) -> bool {
        matches!(self, UnitKind::Settler)
    }

    /// Whether this unit can fight
    pub fn can_fight(self) -> bool {
        !matches!(self, UnitKind::Settler)
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
    /// Patrolling — moving to/from a patrol point, attacking enemies encountered
    Patrolling,
    /// Dying — playing death animation (scale-down + fade), will become Dead
    Dying,
    /// Dead
    Dead,
}

/// A game unit (settler or soldier)
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
    /// Tool this settler carries (ToolType discriminant as u8). None = no tool.
    /// Only relevant for settlers; military units don't carry tools.
    pub carried_tool: Option<u8>,
    /// When routing through a Storehouse for tool pickup, this stores the real
    /// target building index. Cleared once the tool is picked up.
    pub pickup_target: Option<usize>,
    /// Nation-specific attack multiplier (1.0 = normal)
    pub attack_mult: f32,
    /// Nation-specific defense multiplier (1.0 = normal)
    pub defense_mult: f32,
    /// Nation-specific attack range multiplier (1.0 = normal)
    pub attack_range_mult: f32,
    /// Nation-specific worker speed multiplier (1.0 = normal). Applied to settler movement.
    pub nation_speed_mult: f32,
    /// Death animation timer (seconds remaining). When 0 and state is Dying, unit becomes Dead.
    pub dying_timer: f32,
    /// Patrol target position (tile coordinates). Some((x, y)) when unit is patrolling.
    pub patrol_point: Option<(usize, usize)>,
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
            carried_tool: None,
            pickup_target: None,
            attack_mult: 1.0,
            defense_mult: 1.0,
            attack_range_mult: 1.0,
            nation_speed_mult: 1.0,
            dying_timer: 0.0,
            patrol_point: None,
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
                // Preserve Patrolling state when path completes naturally
                if self.state != UnitState::Patrolling {
                    self.state = UnitState::Idle;
                }
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

        let move_speed = self.kind.speed() * speed_mult * self.nation_speed_mult;
        let step = move_speed * dt;

        if dist <= step {
            // Reached waypoint
            self.x = tx;
            self.y = ty;
            self.path_index += 1;
            if self.path_index >= path.tiles().len() {
                // Reached destination
                // Preserve Patrolling state when path completes
                if self.state != UnitState::Patrolling {
                    self.state = UnitState::Idle;
                }
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
            self.state = UnitState::Dying;
            self.dying_timer = 1.0;
            self.target = None;
            self.path = None;
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

    /// Tick the death animation. Returns true if the unit just transitioned to Dead.
    pub fn tick_dying(&mut self, dt: f32) -> bool {
        if self.state != UnitState::Dying {
            return false;
        }
        self.dying_timer -= dt;
        if self.dying_timer <= 0.0 {
            self.state = UnitState::Dead;
            self.dying_timer = 0.0;
            true
        } else {
            false
        }
    }

    /// Get death animation progress (0.0 = just started, 1.0 = finished).
    /// Returns None if the unit is not dying.
    pub fn death_animation_progress(&self) -> Option<f32> {
        if self.state == UnitState::Dying {
            Some(1.0 - self.dying_timer)
        } else {
            None
        }
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
    /// Positions of units that died since last drain (for particle effects)
    pub recently_died_positions: Vec<(f32, f32)>,
    /// Number of combat hits (damage applications) since last drain.
    /// Used for triggering combat sound effects from JS.
    pub recent_combat_hits: u32,
}

impl UnitManager {
    /// Create a new unit manager
    pub fn new() -> Self {
        UnitManager {
            units: Vec::new(),
            next_id: 1,
            recently_died_positions: Vec::new(),
            recent_combat_hits: 0,
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

    /// Add an already-constructed unit (used for save/load).
    /// Does NOT increment next_id — caller must manage ID sequence.
    pub fn add_existing(&mut self, unit: Unit) {
        self.units.push(unit);
    }

    /// Set the next unit ID (used for save/load to continue ID sequence).
    pub fn set_next_id(&mut self, id: u32) {
        self.next_id = id;
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

    /// Count alive settlers
    pub fn settler_count(&self) -> usize {
        self.alive_of_kind(UnitKind::Settler).count()
    }

    /// Count idle settlers (available for assignment)
    pub fn idle_settler_count(&self) -> usize {
        self.units
            .iter()
            .filter(|u| u.kind == UnitKind::Settler && u.is_idle())
            .count()
    }

    /// Get all idle settlers
    pub fn idle_settlers(&self) -> impl Iterator<Item = &Unit> {
        self.units
            .iter()
            .filter(|u| u.kind == UnitKind::Settler && u.is_idle())
    }

    /// Get the first idle settler, if any
    pub fn find_idle_settler(&self) -> Option<&Unit> {
        self.units
            .iter()
            .find(|u| u.kind == UnitKind::Settler && u.is_idle())
    }

    /// Get mutable reference to first idle settler
    pub fn find_idle_settler_mut(&mut self) -> Option<&mut Unit> {
        self.units
            .iter_mut()
            .find(|u| u.kind == UnitKind::Settler && u.is_idle())
    }

    /// Set the nation speed multiplier on all settler units.
    /// Called when nation modifiers are applied so workers move faster/slower.
    pub fn set_nation_speed_mult(&mut self, mult: f32) {
        for unit in self.units.iter_mut() {
            if unit.kind == UnitKind::Settler {
                unit.nation_speed_mult = mult;
            }
        }
    }
    pub fn assign_settler(&mut self, building_index: usize) -> Option<u32> {
        let settler = self.find_idle_settler_mut()?;
        settler.assign_to(building_index);
        Some(settler.id)
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
    /// Drain the list of recently-died unit positions (for particle effects).
    /// Returns positions of units that died since last call.
    pub fn drain_recently_died(&mut self) -> Vec<(f32, f32)> {
        let positions = self.recently_died_positions.clone();
        self.recently_died_positions.clear();
        positions
    }

    /// Drain and reset the combat hit counter. Returns number of damage applications since last call.
    /// Used by JS to trigger combat sound effects each frame.
    pub fn drain_combat_hits(&mut self) -> u32 {
        let hits = self.recent_combat_hits;
        self.recent_combat_hits = 0;
        hits
    }

    /// Apply damage to a unit. Returns true if the unit entered Dying state.
    /// Note: death position is recorded via tick_dying_to_dead(), not here,
    /// so particles spawn at the end of the animation, not the start.
    pub fn apply_damage_and_record_death(&mut self, unit_id: u32, amount: u32) -> bool {
        if let Some(unit) = self.get_mut(unit_id) {
            unit.take_damage(amount)
        } else {
            false
        }
    }

    /// Tick dying units. Records positions of units that just transitioned to Dead
    /// into recently_died_positions for particle effects.
    /// Call once per frame with dt.
    pub fn tick_dying_units(&mut self, dt: f32) {
        for unit in self.units.iter_mut() {
            if unit.tick_dying(dt) {
                // Unit just transitioned Dying -> Dead
                self.recently_died_positions.push((unit.x, unit.y));
            }
        }
    }

    pub fn remove_dead(&mut self) {
        self.units.retain(|u| u.is_alive());
    }

    /// Get total unit count (including dead)
    pub fn total_count(&self) -> usize {
        self.units.len()
    }

    /// Get IDs and positions of military units (Swordsman, Bowman) within a world-coordinate rectangle.
    /// Returns vector of (id, kind_name, x, y, hp, state_name) tuples.
    pub fn military_in_rect(&self, min_x: f32, min_y: f32, max_x: f32, max_y: f32) -> Vec<(u32, &str, f32, f32, u32, &str)> {
        self.units
            .iter()
            .filter(|u| u.is_alive() && u.kind.can_fight())
            .filter(|u| u.x >= min_x && u.x <= max_x && u.y >= min_y && u.y <= max_y)
            .map(|u| {
                let state_name = match u.state {
                    UnitState::Idle => "Idle",
                    UnitState::Moving => "Moving",
                    UnitState::Working => "Working",
                    UnitState::Fighting => "Fighting",
                    UnitState::Patrolling => "Patrolling",
                    UnitState::Dying => "Dying",
                    UnitState::Dead => "Dead",
                };
                (u.id, u.kind.name(), u.x, u.y, u.hp, state_name)
            })
            .collect()
    }

    /// Order a set of units to move to a target tile.
    /// Takes a list of unit IDs and a target (x, y) tile position.
    /// Units that are alive and have the specified ID will be given a path.
    /// Returns the number of units successfully ordered to move.
    pub fn move_units_to(&mut self, unit_ids: &[u32], target_x: usize, target_y: usize, map: &Map) -> u32 {
        use crate::pathfinding::Pathfinder;
        let mut count = 0u32;
        for unit in self.units.iter_mut() {
            if !unit.is_alive() {
                continue;
            }
            if !unit_ids.contains(&unit.id) {
                continue;
            }
            unit.target = None;
            if unit.state == UnitState::Fighting {
                unit.state = UnitState::Idle;
            }
            let sx = unit.x as usize;
            let sy = unit.y as usize;
            if let Some(path) = Pathfinder::find_path(map, (sx, sy), (target_x, target_y)) {
                unit.move_along(path);
                count += 1;
            }
        }
        count
    }

    /// Order a set of units to patrol to a target tile.
    /// Units will move to the target, and engage any enemies encountered.
    /// Returns the number of units successfully ordered to patrol.
    pub fn order_patrol(&mut self, unit_ids: &[u32], target_x: usize, target_y: usize, map: &Map) -> u32 {
        use crate::pathfinding::Pathfinder;
        let mut count = 0u32;
        for unit in self.units.iter_mut() {
            if !unit.is_alive() {
                continue;
            }
            if !unit_ids.contains(&unit.id) {
                continue;
            }
            unit.target = None;
            unit.patrol_point = Some((target_x, target_y));
            let sx = unit.x as usize;
            let sy = unit.y as usize;
            if let Some(path) = Pathfinder::find_path(map, (sx, sy), (target_x, target_y)) {
                unit.move_along(path);
                unit.state = UnitState::Patrolling;
                count += 1;
            } else {
                // No path found — unit stays in place but is still patrolling
                unit.state = UnitState::Patrolling;
            }
        }
        count
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
        let u = Unit::new(1, UnitKind::Settler, 5.0, 10.0);
        assert_eq!(u.id, 1);
        assert_eq!(u.kind, UnitKind::Settler);
        assert_eq!(u.hp, 50);
        assert_eq!(u.max_hp, 50);
        assert_eq!(u.state, UnitState::Idle);
        assert!(u.is_alive());
        assert!(u.is_idle());
    }

    #[test]
    fn test_unit_kind_stats() {
        assert_eq!(UnitKind::Settler.max_hp(), 50);
        assert_eq!(UnitKind::Swordsman.max_hp(), 100);
        assert_eq!(UnitKind::Bowman.max_hp(), 60);

        assert_eq!(UnitKind::Settler.attack_damage(), 0);
        assert_eq!(UnitKind::Swordsman.attack_damage(), 15);
        assert_eq!(UnitKind::Bowman.attack_damage(), 10);

        assert!(UnitKind::Settler.can_work());
        assert!(!UnitKind::Swordsman.can_work());
        assert!(!UnitKind::Bowman.can_work());

        assert!(!UnitKind::Settler.can_fight());
        assert!(UnitKind::Swordsman.can_fight());
        assert!(UnitKind::Bowman.can_fight());
    }

    #[test]
    fn test_unit_assign_settler() {
        let mut u = Unit::new(1, UnitKind::Settler, 0.0, 0.0);
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
    fn test_unit_assign_non_settler() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        assert!(!u.can_assign());
        // assign_to should be a no-op
        u.assign_to(5);
        assert_eq!(u.assigned_building, None);
    }

    #[test]
    fn test_unit_take_damage() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        assert!(!u.take_damage(30));
        assert_eq!(u.hp, 70);
        assert!(u.is_alive());

        assert!(u.take_damage(70));
        assert_eq!(u.hp, 0);
        assert!(!u.is_alive());
        assert_eq!(u.state, UnitState::Dying);
        assert_eq!(u.dying_timer, 1.0);
        assert!(u.tick_dying(1.0));
        assert_eq!(u.state, UnitState::Dead);
    }

    #[test]
    fn test_unit_heal() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        u.take_damage(50);
        assert_eq!(u.hp, 50);
        u.heal(20);
        assert_eq!(u.hp, 70);
        u.heal(100); // should cap at max
        assert_eq!(u.hp, 100);
    }

    #[test]
    fn test_unit_distance() {
        let u1 = Unit::new(1, UnitKind::Settler, 0.0, 0.0);
        let u2 = Unit::new(2, UnitKind::Settler, 3.0, 4.0);
        let d = u1.distance_to(&u2);
        assert!((d - 5.0).abs() < 0.01);
    }

    #[test]
    fn test_unit_attack_cooldown() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
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
        let mut u = Unit::new(1, UnitKind::Settler, 0.5, 0.5);

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
        let id1 = mgr.spawn(UnitKind::Settler, 1.0, 1.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 2.0, 2.0);
        let id3 = mgr.spawn(UnitKind::Settler, 3.0, 3.0);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
        assert_eq!(mgr.alive_count(), 3);
        assert_eq!(mgr.settler_count(), 2);
        assert_eq!(mgr.idle_settler_count(), 2);
    }

    #[test]
    fn test_unit_manager_assign_settler() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Settler, 1.0, 1.0);
        mgr.spawn(UnitKind::Settler, 2.0, 2.0);
        mgr.spawn(UnitKind::Swordsman, 3.0, 3.0);

        let wid = mgr.assign_settler(0);
        assert!(wid.is_some());
        assert_eq!(mgr.idle_settler_count(), 1); // one settler assigned

        let wid2 = mgr.assign_settler(1);
        assert!(wid2.is_some());
        assert_eq!(mgr.idle_settler_count(), 0); // all settlers assigned

        // No more idle settlers
        let wid3 = mgr.assign_settler(2);
        assert!(wid3.is_none());
    }

    #[test]
    fn test_unit_manager_get() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Settler, 5.0, 5.0);

        let u = mgr.get(1);
        assert!(u.is_some());
        assert_eq!(u.unwrap().x, 5.0);

        assert!(mgr.get(999).is_none());
    }

    #[test]
    fn test_unit_manager_remove_dead() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 1.0, 1.0);
        mgr.spawn(UnitKind::Swordsman, 2.0, 2.0);

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
        let id = mgr.spawn(UnitKind::Settler, 0.5, 0.5);

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

    #[test]
    fn test_nation_speed_mult_default() {
        let u = Unit::new(1, UnitKind::Settler, 0.5, 0.5);
        assert!((u.nation_speed_mult - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_nation_speed_mult_applied_to_movement() {
        let map = Map::new(10, 10);

        // Create two settlers: one normal, one with 1.5x speed
        let mut u1 = Unit::new(1, UnitKind::Settler, 0.5, 0.5);
        let mut u2 = Unit::new(2, UnitKind::Settler, 0.5, 0.5);
        u2.nation_speed_mult = 1.5;

        let path1 = Path::new(vec![(0, 0), (5, 0)]);
        let path2 = Path::new(vec![(0, 0), (5, 0)]);
        u1.move_along(path1);
        u2.move_along(path2);

        // Move both for the same number of ticks
        for _ in 0..100 {
            u1.tick_movement(0.016, &map);
            u2.tick_movement(0.016, &map);
        }

        // u2 should have moved farther (1.5x speed)
        assert!(
            u2.x > u1.x,
            "Faster settler should move farther: u1.x={}, u2.x={}",
            u1.x,
            u2.x
        );
    }

    #[test]
    fn test_unit_manager_set_nation_speed_mult() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Settler, 1.0, 1.0);
        mgr.spawn(UnitKind::Settler, 2.0, 2.0);
        mgr.spawn(UnitKind::Swordsman, 3.0, 3.0); // should not be affected

        mgr.set_nation_speed_mult(1.15);

        let s1 = mgr.get(1).unwrap();
        let s2 = mgr.get(2).unwrap();
        let sw = mgr.get(3).unwrap();

        assert!((s1.nation_speed_mult - 1.15).abs() < 0.01);
        assert!((s2.nation_speed_mult - 1.15).abs() < 0.01);
        assert!((sw.nation_speed_mult - 1.0).abs() < 0.01); // soldiers unaffected
    }

    #[test]
    fn test_nation_speed_mult_slower() {
        let map = Map::new(10, 10);

        // Trojan workers are 0.95x speed
        let mut u1 = Unit::new(1, UnitKind::Settler, 0.5, 0.5);
        let mut u2 = Unit::new(2, UnitKind::Settler, 0.5, 0.5);
        u2.nation_speed_mult = 0.95;

        let path1 = Path::new(vec![(0, 0), (5, 0)]);
        let path2 = Path::new(vec![(0, 0), (5, 0)]);
        u1.move_along(path1);
        u2.move_along(path2);

        for _ in 0..100 {
            u1.tick_movement(0.016, &map);
            u2.tick_movement(0.016, &map);
        }

        // u2 should have moved less (0.95x speed)
        assert!(
            u2.x < u1.x,
            "Slower settler should move less: u1.x={}, u2.x={}",
            u1.x,
            u2.x
        );
    }
}

#[cfg(test)]
mod marquee_selection_tests {
    use super::*;

    #[test]
    fn test_military_in_rect_finds_correct_units() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Settler, 1.0, 1.0);     // settler - should NOT be selected
        mgr.spawn(UnitKind::Swordsman, 2.0, 3.0);    // swordsman - IN rect
        mgr.spawn(UnitKind::Bowman, 4.0, 5.0);       // bowman - IN rect
        mgr.spawn(UnitKind::Swordsman, 8.0, 8.0);    // swordsman - OUTSIDE rect

        let result = mgr.military_in_rect(0.0, 0.0, 6.0, 6.0);
        assert_eq!(result.len(), 2, "Should find 2 military units in rect");
        
        let ids: Vec<u32> = result.iter().map(|(id, ..)| *id).collect();
        assert!(ids.contains(&2), "Should contain Swordsman id=2");
        assert!(ids.contains(&3), "Should contain Bowman id=3");
        assert!(!ids.contains(&1), "Should NOT contain Settler id=1");
        assert!(!ids.contains(&4), "Should NOT contain unit id=4 (outside rect)");
    }

    #[test]
    fn test_military_in_rect_empty_when_no_military() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Settler, 1.0, 1.0);
        mgr.spawn(UnitKind::Settler, 3.0, 3.0);

        let result = mgr.military_in_rect(0.0, 0.0, 10.0, 10.0);
        assert_eq!(result.len(), 0, "Should find 0 units since only settlers (can_fight=false)");
    }

    #[test]
    fn test_military_in_rect_respects_bounds() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 1.0, 1.0);
        mgr.spawn(UnitKind::Swordsman, 5.0, 5.0);
        mgr.spawn(UnitKind::Bowman, 9.0, 9.0);

        // Only the middle one
        let result = mgr.military_in_rect(3.0, 3.0, 6.0, 6.0);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, 2);
        assert_eq!(result[0].2, 5.0);
        assert_eq!(result[0].3, 5.0);
    }

    #[test]
    fn test_military_in_rect_excludes_dead_units() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 2.0, 2.0);
        mgr.spawn(UnitKind::Bowman, 3.0, 3.0);
        
        // Kill the bowman
        if let Some(u) = mgr.get_mut(2) {
            u.hp = 0;
        }

        // Bowman is dead, should only find the Swordsman
        let result = mgr.military_in_rect(0.0, 0.0, 10.0, 10.0);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, 1, "Should only find the alive Swordsman");
    }

    #[test]
    fn test_military_in_rect_edge_case_exact_bounds() {
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 2.0, 2.0);
        
        // Exactly bounding the unit
        let result = mgr.military_in_rect(2.0, 2.0, 2.0, 2.0);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].0, 1);
    }
}


#[cfg(test)]
mod death_animation_tests {
    use super::*;

    #[test]
    fn test_unit_dying_state_on_zero_hp() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 5.0, 5.0);
        assert_eq!(u.state, UnitState::Idle);
        assert!(u.take_damage(100));
        assert_eq!(u.state, UnitState::Dying);
        assert_eq!(u.dying_timer, 1.0);
        assert!(u.target.is_none());
        assert!(u.path.is_none());
    }

    #[test]
    fn test_unit_dying_timer_counts_down() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        u.take_damage(100);
        assert_eq!(u.state, UnitState::Dying);
        assert!(u.dying_timer > 0.0);

        // Tick with small dt - should not transition yet
        let transitioned = u.tick_dying(0.5);
        assert!(!transitioned);
        assert_eq!(u.state, UnitState::Dying);
        assert!((u.dying_timer - 0.5).abs() < 0.001);

        // Tick with remaining dt - should transition to Dead
        let transitioned = u.tick_dying(0.5);
        assert!(transitioned);
        assert_eq!(u.state, UnitState::Dead);
        assert_eq!(u.dying_timer, 0.0);
    }

    #[test]
    fn test_unit_dying_progress() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        assert!(u.death_animation_progress().is_none());

        u.take_damage(100);
        let progress = u.death_animation_progress().unwrap();
        assert!(progress < 0.01, "progress should be ~0 at start");

        u.tick_dying(0.5);
        let progress = u.death_animation_progress().unwrap();
        assert!((progress - 0.5).abs() < 0.01, "progress should be ~0.5");

        u.tick_dying(0.5);
        assert!(u.death_animation_progress().is_none(), "Dead units have no progress");
    }

    #[test]
    fn test_tick_dying_non_dying_unit() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        assert!(!u.tick_dying(1.0));
        assert_eq!(u.state, UnitState::Idle);

        u.state = UnitState::Dead;
        assert!(!u.tick_dying(1.0));
        assert_eq!(u.state, UnitState::Dead);
    }

    #[test]
    fn test_unit_manager_tick_dying_units() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 1.0, 0.0);

        // Kill both units
        mgr.get_mut(id1).unwrap().take_damage(100);
        mgr.get_mut(id2).unwrap().take_damage(100);
        assert_eq!(mgr.get(id1).unwrap().state, UnitState::Dying);
        assert_eq!(mgr.get(id2).unwrap().state, UnitState::Dying);

        // Tick dying with small dt - neither transitions
        mgr.tick_dying_units(0.5);
        assert_eq!(mgr.get(id1).unwrap().state, UnitState::Dying);
        assert_eq!(mgr.get(id2).unwrap().state, UnitState::Dying);
        assert!(mgr.drain_recently_died().is_empty());

        // Tick dying with remaining dt - both transition
        mgr.tick_dying_units(0.5);
        assert_eq!(mgr.get(id1).unwrap().state, UnitState::Dead);
        assert_eq!(mgr.get(id2).unwrap().state, UnitState::Dead);

        // Positions should be recorded for particles
        let dead = mgr.drain_recently_died();
        assert_eq!(dead.len(), 2);
    }

    #[test]
    fn test_dying_unit_not_targetable() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 1.0, 0.0);

        // Kill unit 2
        mgr.get_mut(id2).unwrap().take_damage(100);
        assert_eq!(mgr.get(id2).unwrap().state, UnitState::Dying);

        // Dying unit should not be in alive_units
        let alive_ids: Vec<u32> = mgr.alive_units().map(|u| u.id).collect();
        assert!(alive_ids.contains(&id1));
        assert!(!alive_ids.contains(&id2));

        // Dying unit should not be in combatant list
        let combatant_ids: Vec<u32> = mgr
            .alive_units()
            .filter(|u| u.kind.can_fight())
            .map(|u| u.id)
            .collect();
        assert_eq!(combatant_ids, vec![id1]);
    }

    #[test]
    fn test_dying_unit_clears_attack_target() {
        let mut u = Unit::new(1, UnitKind::Swordsman, 0.0, 0.0);
        u.target = Some(42);
        u.path = Some(Path::new(vec![(0, 0), (5, 5)]));
        u.take_damage(100);
        // take_damage should clear target and path when entering Dying
        assert!(u.target.is_none());
        assert!(u.path.is_none());
    }

    #[test]
    fn test_death_animation_deterministic() {
        let mut u1 = Unit::new(1, UnitKind::Bowman, 3.0, 3.0);
        let mut u2 = Unit::new(2, UnitKind::Bowman, 3.0, 3.0);
        u1.take_damage(100);
        u2.take_damage(100);

        // Tick both identically
        for _ in 0..10 {
            u1.tick_dying(0.1);
            u2.tick_dying(0.1);
        }

        assert_eq!(u1.state, u2.state);
        assert_eq!(u1.dying_timer, u2.dying_timer);
        assert_eq!(u1.state, UnitState::Dead);
    }

    #[test]
    fn test_move_units_to_single_unit() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let moved = mgr.move_units_to(&[id1], 10, 10, &map);
        assert_eq!(moved, 1, "Should move 1 unit");

        let u = mgr.get(id1).unwrap();
        assert_eq!(u.state, UnitState::Moving);
        assert!(u.path.is_some(), "Unit should have a path");
        assert!(u.target.is_none(), "Combat target should be cleared");
    }

    #[test]
    fn test_move_units_to_multiple_units() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 3.5, 3.5);
        let id2 = mgr.spawn(UnitKind::Bowman, 4.5, 4.5);
        let id3 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let moved = mgr.move_units_to(&[id1, id2, id3], 15, 15, &map);
        assert_eq!(moved, 3, "Should move all 3 units");

        for id in [id1, id2, id3] {
            let u = mgr.get(id).unwrap();
            assert_eq!(u.state, UnitState::Moving);
            assert!(u.path.is_some());
        }
    }

    #[test]
    fn test_move_units_to_ignores_dead() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 6.5);

        // Kill unit 2
        mgr.get_mut(id2).unwrap().hp = 0;
        mgr.get_mut(id2).unwrap().state = UnitState::Dead;

        let moved = mgr.move_units_to(&[id1, id2], 10, 10, &map);
        assert_eq!(moved, 1, "Should only move the alive unit");

        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Moving);

        let u2 = mgr.get(id2).unwrap();
        assert_eq!(u2.state, UnitState::Dead);
    }

    #[test]
    fn test_move_units_to_clears_fighting_state() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        // Set unit as fighting
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;
        mgr.get_mut(id1).unwrap().target = Some(99);

        let moved = mgr.move_units_to(&[id1], 10, 10, &map);
        assert_eq!(moved, 1);

        let u = mgr.get(id1).unwrap();
        assert_eq!(u.state, UnitState::Moving);
        assert!(u.target.is_none(), "Combat target should be cleared");
    }

    #[test]
    fn test_move_units_to_empty_list() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let moved = mgr.move_units_to(&[], 10, 10, &map);
        assert_eq!(moved, 0, "No units to move");
    }

    #[test]
    fn test_move_units_to_nonexistent_id() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let moved = mgr.move_units_to(&[999], 10, 10, &map);
        assert_eq!(moved, 0, "Nonexistent unit ID should not be found");
    }

    #[test]
    fn test_move_units_to_unreachable_target() {
        let mut map = Map::new(20, 20);
        // Surround target with mountains (impassable)
        for dx in 0..3 {
            for dy in 0..3 {
                if dx != 1 || dy != 1 {
                    map.set_terrain(10 + dx, 10 + dy, crate::map::Terrain::Mountain);
                }
            }
        }
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        // Target is at (11, 11) which is surrounded by mountains
        let moved = mgr.move_units_to(&[id1], 11, 11, &map);
        // Pathfinder may or may not find a path depending on blocking
        // The important thing is it doesn't panic
        let u = mgr.get(id1).unwrap();
        if moved > 0 {
            assert_eq!(u.state, UnitState::Moving);
        } else {
            assert_eq!(u.state, UnitState::Idle);
        }
    }

    #[test]
    fn test_order_patrol_basic() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let count = mgr.order_patrol(&[id1], 10, 10, &map);
        assert_eq!(count, 1);

        let u = mgr.get(id1).unwrap();
        assert_eq!(u.state, UnitState::Patrolling);
        assert_eq!(u.patrol_point, Some((10, 10)));
        assert!(u.target.is_none(), "Combat target should be cleared");
        assert!(u.path.is_none() == false, "Unit should have a path");
    }

    #[test]
    fn test_order_patrol_ignores_dead() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 6.5);

        // Kill unit 2
        mgr.get_mut(id2).unwrap().hp = 0;
        mgr.get_mut(id2).unwrap().state = UnitState::Dead;

        let count = mgr.order_patrol(&[id1, id2], 10, 10, &map);
        assert_eq!(count, 1, "Should only patrol-order the alive unit");

        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Patrolling);

        let u2 = mgr.get(id2).unwrap();
        assert_eq!(u2.state, UnitState::Dead);
        assert!(u2.patrol_point.is_none());
    }

    #[test]
    fn test_order_patrol_empty_list() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let count = mgr.order_patrol(&[], 10, 10, &map);
        assert_eq!(count, 0);
    }

    #[test]
    fn test_order_patrol_nonexistent_id() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let count = mgr.order_patrol(&[999], 10, 10, &map);
        assert_eq!(count, 0);
    }

    #[test]
    fn test_order_patrol_multiple_units() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 3.5, 3.5);
        let id2 = mgr.spawn(UnitKind::Bowman, 4.5, 4.5);
        let id3 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        let count = mgr.order_patrol(&[id1, id2, id3], 15, 15, &map);
        assert_eq!(count, 3);

        for id in &[id1, id2, id3] {
            let u = mgr.get(*id).unwrap();
            assert_eq!(u.state, UnitState::Patrolling);
            assert_eq!(u.patrol_point, Some((15, 15)));
        }
    }

    #[test]
    fn test_unit_new_has_no_patrol_point() {
        let u = Unit::new(1, UnitKind::Swordsman, 5.0, 10.0);
        assert!(u.patrol_point.is_none());
    }

    #[test]
    fn test_order_patrol_clears_fighting_state() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);

        // Set unit as fighting
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;
        mgr.get_mut(id1).unwrap().target = Some(99);

        let count = mgr.order_patrol(&[id1], 10, 10, &map);
        assert_eq!(count, 1);

        let u = mgr.get(id1).unwrap();
        assert_eq!(u.state, UnitState::Patrolling);
        assert!(u.target.is_none(), "Combat target should be cleared");
    }
}
