//! S4WN Server-Authoritative Game State
//!
//! Phase 3 — Multiplayer: server-side simulation that mirrors client
//! game logic for authoritative validation and state broadcast.
//!
//! ## Design
//!
//! When a game starts, the server creates a `ServerGameState` initialized
//! from a procedural map. Each tick (10 TPS), the server:
//! 1. Advances resource production in buildings
//! 2. Updates unit positions along paths
//! 3. Resolves combat
//! 4. Broadcasts a `GameStateSnapshot` to all room members
//!
//! Player actions (BuildingPlace, UnitSpawn, UnitMove, UnitAttack) are
//! validated against game rules BEFORE being applied — the server is
//! the source of truth.

use crate::protocol::{BuildingState, GameStateSnapshot, PlayerState, UnitState};
use log::{debug, info};
// serde is used in tests via serde_json re-export
use std::collections::HashMap;

// ── Map Data ─────────────────────────────────────────────────────────────────

/// Terrain types (mirrors engine Terrain enum).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
#[allow(dead_code)]
pub enum Terrain {
    Grass = 0,
    Forest = 1,
    Mountain = 2,
    Water = 3,
    DeepWater = 4,
    Desert = 5,
    Swamp = 6,
    Snow = 7,
}

impl Terrain {
    pub fn is_buildable(self) -> bool {
        matches!(self, Terrain::Grass | Terrain::Desert | Terrain::Forest)
    }

    pub fn is_passable(self) -> bool {
        !matches!(self, Terrain::Water | Terrain::DeepWater | Terrain::Mountain)
    }

    #[allow(dead_code)]
    pub fn speed_multiplier(self) -> f32 {
        match self {
            Terrain::Grass => 1.0,
            Terrain::Forest => 0.6,
            Terrain::Mountain => 0.0,
            Terrain::Water => 0.0,
            Terrain::DeepWater => 0.0,
            Terrain::Desert => 0.8,
            Terrain::Swamp => 0.4,
            Terrain::Snow => 0.7,
        }
    }
}

/// Resource deposits on the map.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Resource {
    None = 0,
    Stone = 1,
    Iron = 2,
    Coal = 3,
    Gold = 4,
    Sulfur = 5,
    Fish = 6,
    Game = 7,
}

/// A single map tile.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct Tile {
    pub terrain: Terrain,
    pub elevation: f32,
    pub resource: Resource,
}

/// The game map — a 2D grid of tiles.
#[derive(Debug, Clone)]
pub struct GameMap {
    pub width: usize,
    pub height: usize,
    tiles: Vec<Tile>,
}

impl GameMap {
    /// Create a procedural map with coherent biomes.
    pub fn new(width: usize, height: usize, seed: u64) -> Self {
        let size = width * height;
        let mut tiles = Vec::with_capacity(size);

        // Simple procedural generation mimicking engine's approach
        let mut rng = SplitMix64::new(seed);
        for y in 0..height {
            for x in 0..width {
                // Distance from edges for water boundary
                let edge_dist = (x.min(width - 1 - x)).min(y.min(height - 1 - y)) as f32;
                let max_edge = (width.min(height) / 2) as f32;
                let edge_factor = (edge_dist / max_edge.max(1.0)).clamp(0.0, 1.0);

                let noise = rng.next_f32();
                let center_x = (x as f32 - width as f32 / 2.0) / (width as f32 / 2.0);
                let center_y = (y as f32 - height as f32 / 2.0) / (height as f32 / 2.0);
                let dist_from_center = (center_x * center_x + center_y * center_y).sqrt();

                let terrain = if edge_dist < 2.0 && rng.next_f32() < 0.8 {
                    Terrain::Water
                } else if edge_dist < 3.0 && noise < 0.3 {
                    Terrain::Water
                } else if dist_from_center < 0.15 && noise < 0.3 {
                    Terrain::Mountain
                } else if noise < 0.25 {
                    Terrain::Forest
                } else if noise < 0.30 && dist_from_center > 0.7 {
                    Terrain::Desert
                } else if edge_factor < 0.15 {
                    Terrain::Swamp
                } else {
                    Terrain::Grass
                };

                // Resource deposits
                let resource = if terrain == Terrain::Mountain && rng.next_f32() < 0.4 {
                    match (rng.next_u32() % 4) as u8 {
                        0 => Resource::Stone,
                        1 => Resource::Iron,
                        2 => Resource::Coal,
                        _ => Resource::Gold,
                    }
                } else if terrain == Terrain::Forest && rng.next_f32() < 0.3 {
                    Resource::Game
                } else if terrain == Terrain::Water && rng.next_f32() < 0.2 {
                    Resource::Fish
                } else if terrain == Terrain::Swamp && rng.next_f32() < 0.2 {
                    Resource::Sulfur
                } else {
                    Resource::None
                };

                tiles.push(Tile {
                    terrain,
                    elevation: if terrain == Terrain::Mountain { 2.0 + noise } else { noise * 0.5 },
                    resource,
                });
            }
        }

        GameMap { width, height, tiles }
    }

    pub fn get(&self, x: usize, y: usize) -> Option<&Tile> {
        if x < self.width && y < self.height {
            Some(&self.tiles[y * self.width + x])
        } else {
            None
        }
    }

    pub fn is_buildable(&self, x: usize, y: usize) -> bool {
        self.get(x, y).map(|t| t.terrain.is_buildable()).unwrap_or(false)
    }

    pub fn is_passable(&self, x: usize, y: usize) -> bool {
        self.get(x, y).map(|t| t.terrain.is_passable()).unwrap_or(false)
    }
}

// ── Economy Types ────────────────────────────────────────────────────────────

/// Building types (subset of engine's 14 types for server validation).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum BuildingKind {
    Headquarters = 0,
    Woodcutter = 1,
    Sawmill = 2,
    Stonemason = 3,
    IronMine = 4,
    CoalMine = 5,
    GoldMine = 6,
    Farm = 7,
    Fishery = 8,
    HuntersLodge = 9,
    Blacksmith = 10,
    Armory = 11,
    Bakery = 12,
    Warehouse = 14,
}

impl BuildingKind {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            0 => Some(BuildingKind::Headquarters),
            1 => Some(BuildingKind::Woodcutter),
            2 => Some(BuildingKind::Sawmill),
            3 => Some(BuildingKind::Stonemason),
            4 => Some(BuildingKind::IronMine),
            5 => Some(BuildingKind::CoalMine),
            6 => Some(BuildingKind::GoldMine),
            7 => Some(BuildingKind::Farm),
            8 => Some(BuildingKind::Fishery),
            9 => Some(BuildingKind::HuntersLodge),
            10 => Some(BuildingKind::Blacksmith),
            11 => Some(BuildingKind::Armory),
            12 => Some(BuildingKind::Bakery),
            14 => Some(BuildingKind::Warehouse),
            _ => None,
        }
    }

    /// Resource type produced by this building (0 = none).
    pub fn produces(self) -> u8 {
        match self {
            BuildingKind::Woodcutter => 0,  // Wood
            BuildingKind::Sawmill => 16,     // Planks
            BuildingKind::Stonemason => 1,   // Stone
            BuildingKind::IronMine => 2,     // Iron
            BuildingKind::CoalMine => 3,     // Coal
            BuildingKind::GoldMine => 4,     // Gold
            BuildingKind::Farm => 7,         // Grain
            BuildingKind::Fishery => 6,      // Fish
            BuildingKind::HuntersLodge => 8, // Game
            BuildingKind::Blacksmith => 17,  // Tools
            BuildingKind::Armory => 18,      // Weapons
            BuildingKind::Bakery => 19,      // Bread
            _ => 255, // HQ, Warehouse — no production
        }
    }

    /// Production interval in ticks.
    pub fn production_interval(self) -> u64 {
        match self {
            BuildingKind::Woodcutter => 20,
            BuildingKind::Sawmill => 25,
            BuildingKind::Stonemason => 30,
            BuildingKind::IronMine => 30,
            BuildingKind::CoalMine => 25,
            BuildingKind::GoldMine => 50,
            BuildingKind::Farm => 35,
            BuildingKind::Fishery => 25,
            BuildingKind::HuntersLodge => 30,
            BuildingKind::Blacksmith => 40,
            BuildingKind::Armory => 50,
            BuildingKind::Bakery => 35,
            _ => 0,
        }
    }

    /// Resources required to construct.
    pub fn construction_cost(self) -> [(u8, u32); 2] {
        match self {
            BuildingKind::Woodcutter => [(0, 10), (1, 5)],   // Wood + Stone
            BuildingKind::Sawmill => [(0, 10), (1, 10)],
            BuildingKind::Stonemason => [(0, 5), (1, 5)],
            BuildingKind::Farm => [(0, 5), (1, 5)],
            BuildingKind::Fishery => [(0, 10), (1, 5)],
            BuildingKind::HuntersLodge => [(0, 5), (1, 5)],
            BuildingKind::IronMine => [(0, 10), (1, 10)],
            BuildingKind::CoalMine => [(0, 10), (1, 5)],
            BuildingKind::GoldMine => [(0, 15), (1, 10)],
            BuildingKind::Blacksmith => [(0, 10), (1, 15)],
            BuildingKind::Armory => [(0, 15), (1, 20)],
            BuildingKind::Bakery => [(0, 10), (1, 5)],
            BuildingKind::Warehouse => [(0, 15), (1, 15)],
            BuildingKind::Headquarters => [(0, 0), (1, 0)], // Free (placed on start)
        }
    }
}

/// A building on the map.
#[derive(Debug, Clone)]
pub struct ServerBuilding {
    pub id: u32,
    pub kind: BuildingKind,
    pub x: usize,
    pub y: usize,
    pub owner_id: u32,
    pub construction: f32, // 0.0 → 1.0; produces at 1.0
    pub assigned_worker: Option<u32>, // unit_id of assigned worker
    pub production_timer: u64, // ticks since last production
}

/// Unit types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum UnitKind {
    Worker = 0,
    Soldier = 1,
    Archer = 2,
}

impl UnitKind {
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            0 => Some(UnitKind::Worker),
            1 => Some(UnitKind::Soldier),
            2 => Some(UnitKind::Archer),
            _ => None,
        }
    }

    pub fn max_hp(self) -> u32 {
        match self {
            UnitKind::Worker => 50,
            UnitKind::Soldier => 100,
            UnitKind::Archer => 60,
        }
    }

    pub fn speed(self) -> f32 {
        match self {
            UnitKind::Worker => 2.0,
            UnitKind::Soldier => 2.5,
            UnitKind::Archer => 2.0,
        }
    }

    pub fn attack(self) -> u32 {
        match self {
            UnitKind::Worker => 3,
            UnitKind::Soldier => 12,
            UnitKind::Archer => 10,
        }
    }

    pub fn range(self) -> f32 {
        match self {
            UnitKind::Worker => 1.0,
            UnitKind::Soldier => 1.0,
            UnitKind::Archer => 4.0,
        }
    }

    pub fn attack_cooldown(self) -> u64 {
        match self {
            UnitKind::Worker => 30,
            UnitKind::Soldier => 10,
            UnitKind::Archer => 15,
        }
    }
}

/// A unit on the map.
#[derive(Debug, Clone)]
pub struct ServerUnit {
    pub id: u32,
    pub kind: UnitKind,
    pub x: f32,
    pub y: f32,
    pub hp: u32,
    pub owner_id: u32,
    pub attack_cooldown: u64,
    pub target_unit: Option<u32>,
    pub move_target: Option<(usize, usize)>,
}

// ── Player Resources ─────────────────────────────────────────────────────────

/// Per-player resource storage.
#[derive(Debug, Clone)]
pub struct PlayerResources {
    /// Indexed by ResourceType u8 value (0..28)
    pub amounts: [u32; 29],
}

impl PlayerResources {
    pub fn new() -> Self {
        let mut amounts = [0u32; 29];
        // Starting resources
        amounts[0] = 100; // Wood
        amounts[1] = 50;  // Stone
        PlayerResources { amounts }
    }

    pub fn has(&self, res_type: u8, amount: u32) -> bool {
        if (res_type as usize) < 23 {
            self.amounts[res_type as usize] >= amount
        } else {
            false
        }
    }

    pub fn spend(&mut self, res_type: u8, amount: u32) -> bool {
        if self.has(res_type, amount) {
            self.amounts[res_type as usize] -= amount;
            true
        } else {
            false
        }
    }

    pub fn add(&mut self, res_type: u8, amount: u32) {
        if (res_type as usize) < 23 {
            self.amounts[res_type as usize] = self.amounts[res_type as usize].saturating_add(amount);
        }
    }
}

// ── SplitMix64 PRNG ──────────────────────────────────────────────────────────

/// Minimal SplitMix64 for procedural generation (matches engine's PRNG).
struct SplitMix64 {
    state: u64,
}

impl SplitMix64 {
    fn new(seed: u64) -> Self {
        SplitMix64 { state: seed }
    }

    fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_add(0x9e3779b97f4a7c15);
        let mut z = self.state;
        z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
        z ^ (z >> 31)
    }

    fn next_u32(&mut self) -> u32 {
        (self.next_u64() >> 32) as u32
    }

    fn next_f32(&mut self) -> f32 {
        (self.next_u32() as f32) / (u32::MAX as f32)
    }
}

// ── Server Game State ────────────────────────────────────────────────────────

/// The server-authoritative game state for a single match.
#[derive(Debug, Clone)]
pub struct ServerGameState {
    /// The world map.
    pub map: GameMap,
    /// Current game tick.
    pub tick: u64,
    /// All buildings on the map.
    pub buildings: Vec<ServerBuilding>,
    /// All units on the map.
    pub units: Vec<ServerUnit>,
    /// Per-player resources.
    pub player_resources: HashMap<u32, PlayerResources>,
    /// Next building ID counter.
    next_building_id: u32,
    /// Next unit ID counter.
    next_unit_id: u32,
}

impl ServerGameState {
    /// Create a new game state with a procedural map.
    pub fn new(width: usize, height: usize, seed: u64) -> Self {
        ServerGameState {
            map: GameMap::new(width, height, seed),
            tick: 0,
            buildings: Vec::new(),
            units: Vec::new(),
            player_resources: HashMap::new(),
            next_building_id: 1,
            next_unit_id: 1,
        }
    }

    /// Register a player with starting resources.
    pub fn add_player(&mut self, player_id: u32) {
        self.player_resources
            .entry(player_id)
            .or_insert_with(PlayerResources::new);
    }

    /// Remove a player and all their assets.
    #[allow(dead_code)]
    pub fn remove_player(&mut self, player_id: u32) {
        self.player_resources.remove(&player_id);
        self.buildings.retain(|b| b.owner_id != player_id);
        self.units.retain(|u| u.owner_id != player_id);
    }

    // ── Action Validation ────────────────────────────────────────────────────

    /// Validate placing a building. Returns Ok(()) or an error string.
    pub fn validate_building_place(
        &self,
        player_id: u32,
        building_type: u8,
        x: usize,
        y: usize,
    ) -> Result<(), String> {
        // Check building type is valid
        let kind = BuildingKind::from_u8(building_type)
            .ok_or(format!("Invalid building type: {}", building_type))?;

        // Check tile is buildable
        if !self.map.is_buildable(x, y) {
            return Err("Tile is not buildable".to_string());
        }

        // Check no building already exists on this tile
        if self.buildings.iter().any(|b| b.x == x && b.y == y) {
            return Err("Tile already occupied by a building".to_string());
        }

        // Check player has enough resources
        let resources = self
            .player_resources
            .get(&player_id)
            .ok_or("Player not found")?;
        let cost = kind.construction_cost();
        for (res_type, amount) in &cost {
            if !resources.has(*res_type, *amount) {
                return Err(format!(
                    "Insufficient resources: need {} of type {}",
                    amount, res_type
                ));
            }
        }

        Ok(())
    }

    /// Apply a validated building placement.
    pub fn apply_building_place(
        &mut self,
        player_id: u32,
        building_type: u8,
        x: usize,
        y: usize,
    ) -> Result<u32, String> {
        let kind = BuildingKind::from_u8(building_type).unwrap();

        // Deduct resources
        let cost = kind.construction_cost();
        if let Some(resources) = self.player_resources.get_mut(&player_id) {
            for (res_type, amount) in &cost {
                resources.spend(*res_type, *amount);
            }
        }

        let id = self.next_building_id;
        self.next_building_id += 1;

        self.buildings.push(ServerBuilding {
            id,
            kind,
            x,
            y,
            owner_id: player_id,
            construction: 0.0,
            assigned_worker: None,
            production_timer: 0,
        });

        debug!(
            "Player {} placed building {:?} (#{}) at ({}, {})",
            player_id, kind, id, x, y
        );

        Ok(id)
    }

    /// Validate spawning a unit.
    pub fn validate_unit_spawn(
        &self,
        player_id: u32,
        unit_kind: u8,
        x: f32,
        y: f32,
    ) -> Result<(), String> {
        let _kind = UnitKind::from_u8(unit_kind)
            .ok_or(format!("Invalid unit kind: {}", unit_kind))?;

        let tile_x = x.floor() as usize;
        let tile_y = y.floor() as usize;

        // Check position is on passable terrain
        if !self.map.is_passable(tile_x, tile_y) {
            return Err("Position is impassable".to_string());
        }

        // Check player exists
        if !self.player_resources.contains_key(&player_id) {
            return Err("Player not found".to_string());
        }

        Ok(())
    }

    /// Apply a validated unit spawn.
    pub fn apply_unit_spawn(
        &mut self,
        player_id: u32,
        unit_kind: u8,
        x: f32,
        y: f32,
    ) -> u32 {
        let kind = UnitKind::from_u8(unit_kind).unwrap();
        let id = self.next_unit_id;
        self.next_unit_id += 1;

        self.units.push(ServerUnit {
            id,
            kind,
            x,
            y,
            hp: kind.max_hp(),
            owner_id: player_id,
            attack_cooldown: 0,
            target_unit: None,
            move_target: None,
        });

        debug!(
            "Player {} spawned {:?} (#{}) at ({:.1}, {:.1}) — {}/{} units",
            player_id, kind, id, x, y, self.units.len(), self.units.capacity()
        );

        id
    }

    /// Validate a unit move command.
    pub fn validate_unit_move(
        &self,
        player_id: u32,
        unit_id: u32,
        target_x: usize,
        target_y: usize,
    ) -> Result<(), String> {
        let unit = self.units.iter().find(|u| u.id == unit_id)
            .ok_or("Unit not found")?;

        if unit.owner_id != player_id {
            return Err("Not your unit".to_string());
        }

        if !self.map.is_passable(target_x, target_y) {
            return Err("Target tile is impassable".to_string());
        }

        if target_x >= self.map.width || target_y >= self.map.height {
            return Err("Target out of bounds".to_string());
        }

        Ok(())
    }

    /// Apply a validated unit move command.
    pub fn apply_unit_move(
        &mut self,
        unit_id: u32,
        target_x: usize,
        target_y: usize,
    ) {
        if let Some(unit) = self.units.iter_mut().find(|u| u.id == unit_id) {
            debug!(
                "Unit #{} ({:?}) moving to ({}, {})",
                unit_id, unit.kind, target_x, target_y
            );
            unit.move_target = Some((target_x, target_y));
            unit.target_unit = None;
        }
    }

    /// Validate an attack command.
    pub fn validate_unit_attack(
        &self,
        player_id: u32,
        attacker_id: u32,
        target_id: u32,
    ) -> Result<(), String> {
        let attacker = self.units.iter().find(|u| u.id == attacker_id)
            .ok_or("Attacker not found")?;
        let target = self.units.iter().find(|u| u.id == target_id)
            .ok_or("Target not found")?;

        if attacker.owner_id != player_id {
            return Err("Not your unit".to_string());
        }

        if target.owner_id == player_id {
            return Err("Cannot attack your own unit".to_string());
        }

        Ok(())
    }

    /// Apply a validated attack command.
    pub fn apply_unit_attack(&mut self, attacker_id: u32, target_id: u32) {
        if let Some(unit) = self.units.iter_mut().find(|u| u.id == attacker_id) {
            debug!(
                "Unit #{} ({:?}) targeting unit #{}",
                attacker_id, unit.kind, target_id
            );
            unit.target_unit = Some(target_id);
            unit.move_target = None;
        }
    }

    /// Set a move target for a unit (used by server AI).
    #[allow(dead_code)]
    pub fn set_unit_move_target(&mut self, unit_id: u32, target_x: usize, target_y: usize) -> bool {
        if let Some(unit) = self.units.iter_mut().find(|u| u.id == unit_id) {
            unit.move_target = Some((target_x, target_y));
            true
        } else {
            false
        }
    }

    // ── Tick Update ──────────────────────────────────────────────────────────

    /// Advance one game tick.
    pub fn tick(&mut self) {
        self.tick += 1;
        self.tick_buildings();
        self.tick_units();
        self.tick_combat();

        // Periodic stats every 100 ticks (10 seconds at 10 TPS)
        if self.tick % 100 == 0 {
            let players = self.player_resources.len();
            let buildings = self.buildings.len();
            let units = self.units.len();
            let in_construction = self.buildings.iter().filter(|b| b.construction < 1.0).count();
            info!(
                "Tick {} — {} players, {} buildings ({} in construction), {} units",
                self.tick, players, buildings, in_construction, units
            );
        }
    }

    /// Update building construction and production.
    fn tick_buildings(&mut self) {
        for building in &mut self.buildings {
            // Construction progress
            if building.construction < 1.0 {
                let prev = building.construction;
                building.construction = (building.construction + 0.05).min(1.0);
                if building.construction >= 1.0 && prev < 1.0 {
                    debug!(
                        "Player {} — {:?} #{} construction complete at ({}, {})",
                        building.owner_id, building.kind, building.id, building.x, building.y
                    );
                }
                continue;
            }

            // Production (only if fully built AND has assigned worker)
            if building.assigned_worker.is_some() {
                let interval = building.kind.production_interval();
                if interval > 0 {
                    building.production_timer += 1;
                    if building.production_timer >= interval {
                        building.production_timer = 0;
                        let produced = building.kind.produces();
                        if produced != 255 {
                            if let Some(resources) = self.player_resources.get_mut(&building.owner_id) {
                                resources.add(produced, 1);
                            }
                        }
                    }
                }
            }
        }
    }

    /// Update unit movement toward targets.
    fn tick_units(&mut self) {
        for i in 0..self.units.len() {
            if let Some((tx, ty)) = self.units[i].move_target {
                let target_x = tx as f32 + 0.5;
                let target_y = ty as f32 + 0.5;
                let dx = target_x - self.units[i].x;
                let dy = target_y - self.units[i].y;
                let dist = (dx * dx + dy * dy).sqrt();

                if dist < 0.05 {
                    self.units[i].x = target_x;
                    self.units[i].y = target_y;
                    self.units[i].move_target = None;
                } else {
                    let speed = self.units[i].kind.speed() * 0.1; // per tick at 10 TPS
                    let fraction = (speed / dist).min(1.0);
                    self.units[i].x += dx * fraction;
                    self.units[i].y += dy * fraction;
                }
            }
        }
    }

    /// Resolve combat — units with attack targets move toward them and deal damage.
    fn tick_combat(&mut self) {
        // Snapshot of unit positions for this tick
        let unit_snapshots: Vec<(u32, f32, f32, u32, UnitKind, u32, Option<u32>)> = self
            .units
            .iter()
            .map(|u| (u.id, u.x, u.y, u.owner_id, u.kind, u.hp, u.target_unit))
            .collect();

        for i in 0..self.units.len() {
            let _attacker_id = self.units[i].id;
            let target_id = match self.units[i].target_unit {
                Some(tid) => tid,
                None => continue,
            };

            // Find target position
            let target_pos = unit_snapshots
                .iter()
                .find(|(id, _, _, _, _, _, _)| *id == target_id)
                .map(|(_, tx, ty, _, _, _, _)| (*tx, *ty));

            let (target_x, target_y) = match target_pos {
                Some(pos) => pos,
                None => {
                    self.units[i].target_unit = None;
                    continue;
                }
            };

            let dx = target_x - self.units[i].x;
            let dy = target_y - self.units[i].y;
            let dist = (dx * dx + dy * dy).sqrt();

            let range = self.units[i].kind.range();

            if dist <= range + 0.5 {
                // In range — attack
                if self.units[i].attack_cooldown == 0 {
                    let damage = self.units[i].kind.attack();
                    let attacker_id = self.units[i].id;
                    let attacker_kind = self.units[i].kind;
                    let attacker_owner = self.units[i].owner_id;
                    // Apply damage to target
                    if let Some(target) = self.units.iter_mut().find(|u| u.id == target_id) {
                        target.hp = target.hp.saturating_sub(damage);
                        if target.hp == 0 {
                            // Target died
                            debug!(
                                "Unit #{} ({:?}, P{}) killed by unit #{} ({:?}, P{})",
                                target_id,
                                target.kind,
                                target.owner_id,
                                attacker_id,
                                attacker_kind,
                                attacker_owner
                            );
                            target.target_unit = None;
                            // Clear any references to this dead unit
                            for u in self.units.iter_mut() {
                                if u.target_unit == Some(target_id) {
                                    u.target_unit = None;
                                }
                            }
                        }
                    }
                    self.units[i].attack_cooldown = self.units[i].kind.attack_cooldown();
                }
            } else {
                // Move toward target
                let speed = self.units[i].kind.speed() * 0.1;
                let fraction = (speed / dist).min(1.0);
                self.units[i].x += dx * fraction;
                self.units[i].y += dy * fraction;
            }

            // Decrease cooldown
            if self.units[i].attack_cooldown > 0 {
                self.units[i].attack_cooldown -= 1;
            }
        }

        // Remove dead units
        self.units.retain(|u| u.hp > 0);
    }

    // ── Snapshot ─────────────────────────────────────────────────────────────

    /// Generate a game state snapshot for broadcast to clients.
    pub fn to_snapshot(&self) -> GameStateSnapshot {
        GameStateSnapshot {
            tick: self.tick,
            players: self
                .player_resources
                .iter()
                .map(|(id, res)| PlayerState {
                    id: *id,
                    name: format!("Player {}", id),
                    resources: [
                        res.amounts[0], // Wood
                        res.amounts[1], // Stone
                        res.amounts[2], // Iron
                        res.amounts[3], // Coal
                        res.amounts[4], // Gold
                    ],
                })
                .collect(),
            buildings: self
                .buildings
                .iter()
                .map(|b| BuildingState {
                    id: b.id,
                    kind: b.kind as u8,
                    x: b.x,
                    y: b.y,
                    construction: b.construction,
                    owner_id: b.owner_id,
                })
                .collect(),
            units: self
                .units
                .iter()
                .map(|u| UnitState {
                    id: u.id,
                    kind: u.kind as u8,
                    x: u.x,
                    y: u.y,
                    hp: u.hp,
                    owner_id: u.owner_id,
                })
                .collect(),
        }
    }

    /// Get a building by its ID.
    #[allow(dead_code)]
    pub fn get_building_mut(&mut self, building_id: u32) -> Option<&mut ServerBuilding> {
        self.buildings.iter_mut().find(|b| b.id == building_id)
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_creation() {
        let map = GameMap::new(64, 64, 42);
        assert_eq!(map.width, 64);
        assert_eq!(map.height, 64);
        // At least some tiles should be grass
        let grass_count = (0..64 * 64)
            .filter(|&i| {
                let x = i % 64;
                let y = i / 64;
                matches!(map.get(x, y).unwrap().terrain, Terrain::Grass)
            })
            .count();
        assert!(grass_count > 0);
    }

    #[test]
    fn test_map_buildable() {
        let map = GameMap::new(32, 32, 99);
        // Center tiles should be mostly buildable
        let center = map.get(16, 16).unwrap();
        assert!(center.terrain.is_buildable());
    }

    #[test]
    fn test_server_game_state_new() {
        let state = ServerGameState::new(32, 32, 7);
        assert_eq!(state.tick, 0);
        assert_eq!(state.buildings.len(), 0);
        assert_eq!(state.units.len(), 0);
        assert_eq!(state.map.width, 32);
    }

    #[test]
    fn test_add_player() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        let res = state.player_resources.get(&1).unwrap();
        assert_eq!(res.amounts[0], 100); // Wood
        assert_eq!(res.amounts[1], 50);  // Stone
    }

    #[test]
    fn test_building_place_validation() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);

        // Find a buildable tile
        let mut buildable_x = 5;
        let mut buildable_y = 5;
        for y in 2..30 {
            for x in 2..30 {
                if state.map.is_buildable(x, y) {
                    buildable_x = x;
                    buildable_y = y;
                    break;
                }
            }
        }

        // Valid placement
        assert!(state
            .validate_building_place(1, 1, buildable_x, buildable_y) // Woodcutter
            .is_ok());

        // Invalid building type
        assert!(state.validate_building_place(1, 99, 5, 5).is_err());

        // Player not found
        assert!(state.validate_building_place(99, 1, 5, 5).is_err());
    }

    #[test]
    fn test_building_place_apply() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);

        let id = state
            .apply_building_place(1, 1, 5, 5) // Woodcutter
            .unwrap();
        assert_eq!(id, 1);
        assert_eq!(state.buildings.len(), 1);
        assert_eq!(state.buildings[0].x, 5);
        assert_eq!(state.buildings[0].y, 5);

        // Resources were deducted
        let res = state.player_resources.get(&1).unwrap();
        assert!(res.amounts[0] < 100); // Wood spent
    }

    #[test]
    fn test_building_production_tick() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        state.apply_building_place(1, 1, 5, 5).unwrap(); // Woodcutter

        // No worker assigned — should not produce
        let before = state.player_resources[&1].amounts[0];
        for _ in 0..50 {
            state.tick();
        }
        assert_eq!(state.player_resources[&1].amounts[0], before);

        // Assign a worker
        state.add_player(1);
        let unit_id = state.apply_unit_spawn(1, 0, 5.0, 5.0); // Worker
        if let Some(building) = state.buildings.iter_mut().find(|b| b.id == 1) {
            building.construction = 1.0; // Fully built
            building.assigned_worker = Some(unit_id);
        }

        // Now tick — should produce wood
        let before = state.player_resources[&1].amounts[0];
        for _ in 0..21 {
            state.tick();
        }
        assert!(state.player_resources[&1].amounts[0] > before);
    }

    #[test]
    fn test_unit_spawn_and_move() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);

        let id = state.apply_unit_spawn(1, 0, 5.0, 5.0);
        assert_eq!(id, 1);
        assert_eq!(state.units.len(), 1);

        // Move unit
        state.apply_unit_move(1, 10, 10);
        let initial_pos = (state.units[0].x, state.units[0].y);

        // Tick several times — unit should move
        for _ in 0..20 {
            state.tick();
        }
        let final_pos = (state.units[0].x, state.units[0].y);
        assert!(final_pos != initial_pos);
    }

    #[test]
    fn test_unit_attack_and_death() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        state.add_player(2);

        // Spawn two soldiers near each other
        let a_id = state.apply_unit_spawn(1, 1, 5.0, 5.0); // Soldier P1
        let t_id = state.apply_unit_spawn(2, 1, 6.0, 5.0); // Soldier P2
        assert_eq!(state.units.len(), 2);

        // Attack
        state.apply_unit_attack(a_id, t_id);

        // Tick enough for combat to resolve
        for _ in 0..300 {
            state.tick();
            if state.units.len() < 2 {
                break;
            }
        }

        // One unit should have died
        assert!(state.units.len() < 2);
    }

    #[test]
    fn test_attack_validation() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        state.add_player(2);

        let a_id = state.apply_unit_spawn(1, 1, 5.0, 5.0);
        let t_id = state.apply_unit_spawn(2, 1, 6.0, 5.0);

        // Valid attack
        assert!(state.validate_unit_attack(1, a_id, t_id).is_ok());

        // Attack own unit
        assert!(state.validate_unit_attack(1, a_id, a_id).is_err());

        // Not your unit
        assert!(state.validate_unit_attack(2, a_id, t_id).is_err());
    }

    #[test]
    fn test_snapshot() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        state.apply_building_place(1, 1, 5, 5).unwrap();
        state.apply_unit_spawn(1, 0, 5.0, 5.0);

        let snapshot = state.to_snapshot();
        assert_eq!(snapshot.tick, 0);
        assert_eq!(snapshot.players.len(), 1);
        assert_eq!(snapshot.buildings.len(), 1);
        assert_eq!(snapshot.units.len(), 1);
    }

    #[test]
    fn test_snapshot_serialization() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        state.apply_building_place(1, 1, 5, 5).unwrap();
        state.apply_unit_spawn(1, 0, 5.0, 5.0);

        let snapshot = state.to_snapshot();
        let json = serde_json::to_string(&snapshot).unwrap();
        assert!(json.contains("\"tick\":0"));
        assert!(json.contains("\"buildings\""));
        assert!(json.contains("\"units\""));

        // Roundtrip
        let deserialized: GameStateSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.tick, 0);
        assert_eq!(deserialized.buildings.len(), 1);
    }

    #[test]
    fn test_remove_player() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);
        state.add_player(2);
        state.apply_building_place(1, 1, 5, 5).unwrap();
        state.apply_unit_spawn(1, 0, 5.0, 5.0);
        state.apply_unit_spawn(2, 0, 8.0, 8.0);

        assert_eq!(state.buildings.len(), 1);
        assert_eq!(state.units.len(), 2);

        state.remove_player(1);

        assert_eq!(state.buildings.len(), 0);
        assert_eq!(state.units.len(), 1);
        assert!(!state.player_resources.contains_key(&1));
        assert!(state.player_resources.contains_key(&2));
    }

    #[test]
    fn test_multiple_ticks_scenario() {
        let mut state = ServerGameState::new(32, 32, 1);
        state.add_player(1);

        // Place two woodcutters
        state.apply_building_place(1, 1, 5, 5).unwrap();
        state.apply_building_place(1, 1, 7, 7).unwrap();

        // Assign workers (fully construct and assign)
        let w1 = state.apply_unit_spawn(1, 0, 5.0, 5.0);
        let w2 = state.apply_unit_spawn(1, 0, 7.0, 7.0);
        for b in &mut state.buildings {
            b.construction = 1.0;
            b.assigned_worker = Some(if b.x == 5 { w1 } else { w2 });
        }

        let wood_before = state.player_resources[&1].amounts[0];

        // Run 100 ticks
        for _ in 0..100 {
            state.tick();
        }

        let wood_after = state.player_resources[&1].amounts[0];
        assert!(wood_after > wood_before, "Wood should have increased");
        assert!(state.tick == 100);
    }
}
