//! S4WN Economy Module
//!
//! Phase 2 — Game Logic: resources, buildings, production chains, and storage.
//!
//! ## Design
//!
//! The economy is a tick-driven simulation. Each tick:
//! 1. Buildings with assigned workers produce resources (if inputs available)
//! 2. Resources flow along production chains (producer → consumer)
//! 3. Storage limits cap accumulation
//! 4. New buildings can be placed on buildable tiles by spending resources
//!
//! ## Resource Model
//!
//! Resources are the "currency" of the game. Each resource type can be stored
//! at a warehouse (HQ). Buildings consume and produce resources.
//!
//! ## Building Model
//!
//! A building occupies one tile. It has:
//! - A building type (defines what it produces/consumes)
//! - An optional assigned worker
//! - A construction progress (0.0 → 1.0, building is "active" at 1.0)
//! - An input buffer (small queue of resources waiting to be consumed)
//! - An output buffer (resources produced, waiting to be collected)

use crate::map::Resource;
use crate::units::UnitManager;

// ── Resource Types ──────────────────────────────────────────────────────────

/// All resource types in the game.
/// These extend the map's `Resource` enum (which represents raw deposits)
/// with processed goods created by buildings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum ResourceType {
    // Raw resources (mined/harvested from map deposits)
    Wood = 0,       // from forests
    Stone = 1,      // from stone deposits
    Iron = 2,       // from iron ore
    Coal = 3,       // from coal deposits
    Gold = 4,       // from gold deposits
    Sulfur = 5,     // from sulfur deposits
    Fish = 6,       // from fishing
    Grain = 7,      // from farming
    Game = 8,       // from hunting

    // Processed goods (produced by buildings)
    Planks = 16,    // Wood → Planks (sawmill)
    Tools = 17,     // Iron + Coal → Tools (blacksmith)
    Weapons = 18,   // Iron + Coal + Tools → Weapons (armory)
    Beer = 19,      // Grain → Beer (brewery)
    Bread = 20,     // Grain → Bread (bakery)
    Meat = 21,      // Game → Meat (butcher)
    Leather = 22,   // Game → Leather (tannery)
}

impl ResourceType {
    /// Total number of distinct resource types
    pub const COUNT: usize = 23;

    /// Whether this is a raw resource (harvested from the map)
    pub fn is_raw(self) -> bool {
        (self as u8) < 16
    }

    /// Whether this is a processed good
    pub fn is_processed(self) -> bool {
        (self as u8) >= 16
    }

    /// Display name for the resource
    pub fn name(self) -> &'static str {
        match self {
            ResourceType::Wood => "Wood",
            ResourceType::Stone => "Stone",
            ResourceType::Iron => "Iron",
            ResourceType::Coal => "Coal",
            ResourceType::Gold => "Gold",
            ResourceType::Sulfur => "Sulfur",
            ResourceType::Fish => "Fish",
            ResourceType::Grain => "Grain",
            ResourceType::Game => "Game",
            ResourceType::Planks => "Planks",
            ResourceType::Tools => "Tools",
            ResourceType::Weapons => "Weapons",
            ResourceType::Beer => "Beer",
            ResourceType::Bread => "Bread",
            ResourceType::Meat => "Meat",
            ResourceType::Leather => "Leather",
        }
    }

    /// Convert from map Resource to economy ResourceType
    pub fn from_map_resource(r: Resource) -> Option<ResourceType> {
        match r {
            Resource::Iron => Some(ResourceType::Iron),
            Resource::Coal => Some(ResourceType::Coal),
            Resource::Gold => Some(ResourceType::Gold),
            Resource::Stone => Some(ResourceType::Stone),
            Resource::Sulfur => Some(ResourceType::Sulfur),
            Resource::Fish => Some(ResourceType::Fish),
            Resource::Game => Some(ResourceType::Game),
            Resource::Grain => Some(ResourceType::Grain),
        }
    }
}

// ── Building Types ─────────────────────────────────────────────────────────

/// Defines a building type and its production characteristics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum BuildingType {
    /// Headquarters — stores resources, spawns settlers
    Headquarters = 0,
    /// Sawmill — converts Wood → Planks
    Sawmill = 1,
    /// Quarry — produces Stone (requires worker + stone deposit nearby)
    Quarry = 2,
    /// Mine — produces Iron/Coal/Gold (requires deposit)
    Mine = 3,
    /// Blacksmith — Iron + Coal → Tools
    Blacksmith = 4,
    /// Armory — Iron + Coal + Tools → Weapons
    Armory = 5,
    /// Brewery — Grain → Beer
    Brewery = 6,
    /// Bakery — Grain → Bread
    Bakery = 7,
    /// Butcher — Game → Meat
    Butcher = 8,
    /// Tannery — Game → Leather
    Tannery = 9,
    /// Farm — produces Grain (on grass tiles)
    Farm = 10,
    /// Fishery — produces Fish (on water-adjacent tiles)
    Fishery = 11,
    /// Lumberjack — produces Wood (near forests)
    Lumberjack = 12,
    /// Warehouse — extends storage capacity
    Warehouse = 13,
}

impl BuildingType {
    /// Display name
    pub fn name(self) -> &'static str {
        match self {
            BuildingType::Headquarters => "Headquarters",
            BuildingType::Sawmill => "Sawmill",
            BuildingType::Quarry => "Quarry",
            BuildingType::Mine => "Mine",
            BuildingType::Blacksmith => "Blacksmith",
            BuildingType::Armory => "Armory",
            BuildingType::Brewery => "Brewery",
            BuildingType::Bakery => "Bakery",
            BuildingType::Butcher => "Butcher",
            BuildingType::Tannery => "Tannery",
            BuildingType::Farm => "Farm",
            BuildingType::Fishery => "Fishery",
            BuildingType::Lumberjack => "Lumberjack",
            BuildingType::Warehouse => "Warehouse",
        }
    }

    /// Resource cost to construct this building
    pub fn build_cost(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Headquarters => &[(ResourceType::Wood, 10), (ResourceType::Stone, 5)],
            BuildingType::Sawmill => &[(ResourceType::Wood, 5), (ResourceType::Stone, 2)],
            BuildingType::Quarry => &[(ResourceType::Wood, 5)],
            BuildingType::Mine => &[(ResourceType::Wood, 8), (ResourceType::Stone, 3)],
            BuildingType::Blacksmith => &[(ResourceType::Wood, 5), (ResourceType::Stone, 5), (ResourceType::Iron, 2)],
            BuildingType::Armory => &[(ResourceType::Wood, 5), (ResourceType::Stone, 5), (ResourceType::Tools, 3)],
            BuildingType::Brewery => &[(ResourceType::Wood, 5), (ResourceType::Stone, 2)],
            BuildingType::Bakery => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::Butcher => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::Tannery => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::Farm => &[(ResourceType::Wood, 3)],
            BuildingType::Fishery => &[(ResourceType::Wood, 3)],
            BuildingType::Lumberjack => &[(ResourceType::Wood, 2)],
            BuildingType::Warehouse => &[(ResourceType::Wood, 8), (ResourceType::Stone, 4)],
        }
    }

    /// Input resources consumed per production cycle (empty if no inputs)
    pub fn inputs(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Sawmill => &[(ResourceType::Wood, 2)],
            BuildingType::Blacksmith => &[(ResourceType::Iron, 1), (ResourceType::Coal, 1)],
            BuildingType::Armory => &[(ResourceType::Iron, 1), (ResourceType::Coal, 1), (ResourceType::Tools, 1)],
            BuildingType::Brewery => &[(ResourceType::Grain, 3)],
            BuildingType::Bakery => &[(ResourceType::Grain, 2)],
            BuildingType::Butcher => &[(ResourceType::Game, 2)],
            BuildingType::Tannery => &[(ResourceType::Game, 2)],
            _ => &[], // raw producers and storage have no inputs
        }
    }

    /// Output resources produced per production cycle
    pub fn outputs(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Sawmill => &[(ResourceType::Planks, 1)],
            BuildingType::Quarry => &[(ResourceType::Stone, 1)],
            BuildingType::Mine => &[(ResourceType::Iron, 1)], // simplified: mine produces iron
            BuildingType::Blacksmith => &[(ResourceType::Tools, 1)],
            BuildingType::Armory => &[(ResourceType::Weapons, 1)],
            BuildingType::Brewery => &[(ResourceType::Beer, 1)],
            BuildingType::Bakery => &[(ResourceType::Bread, 1)],
            BuildingType::Butcher => &[(ResourceType::Meat, 1)],
            BuildingType::Tannery => &[(ResourceType::Leather, 1)],
            BuildingType::Farm => &[(ResourceType::Grain, 2)],
            BuildingType::Fishery => &[(ResourceType::Fish, 1)],
            BuildingType::Lumberjack => &[(ResourceType::Wood, 2)],
            _ => &[], // HQ and warehouse produce nothing
        }
    }

    /// Number of ticks between production cycles (at 10 TPS = 10 ticks/sec)
    pub fn production_interval(self) -> u32 {
        match self {
            BuildingType::Sawmill => 20,     // 2 seconds
            BuildingType::Quarry => 30,      // 3 seconds
            BuildingType::Mine => 40,        // 4 seconds
            BuildingType::Blacksmith => 30,  // 3 seconds
            BuildingType::Armory => 50,      // 5 seconds
            BuildingType::Brewery => 25,     // 2.5 seconds
            BuildingType::Bakery => 20,      // 2 seconds
            BuildingType::Butcher => 25,     // 2.5 seconds
            BuildingType::Tannery => 25,     // 2.5 seconds
            BuildingType::Farm => 20,        // 2 seconds
            BuildingType::Fishery => 20,     // 2 seconds
            BuildingType::Lumberjack => 15,  // 1.5 seconds
            _ => 0, // HQ and warehouse don't produce
        }
    }

    /// Maximum input buffer size (how many cycles worth of inputs can be queued)
    pub fn input_buffer_size(self) -> u32 {
        if self.inputs().is_empty() { 0 } else { 3 }
    }

    /// Maximum output buffer size
    pub fn output_buffer_size(self) -> u32 {
        if self.outputs().is_empty() { 0 } else { 3 }
    }

    /// Whether this building requires a worker to produce
    pub fn requires_worker(self) -> bool {
        !matches!(self, BuildingType::Headquarters | BuildingType::Warehouse)
    }

    /// Ticks needed to construct this building
    pub fn build_time(self) -> u32 {
        match self {
            BuildingType::Headquarters => 0,    // already built
            BuildingType::Warehouse => 50,
            BuildingType::Farm | BuildingType::Fishery | BuildingType::Lumberjack => 20,
            BuildingType::Quarry | BuildingType::Sawmill => 30,
            BuildingType::Mine => 40,
            BuildingType::Blacksmith | BuildingType::Brewery | BuildingType::Bakery => 35,
            BuildingType::Butcher | BuildingType::Tannery => 30,
            BuildingType::Armory => 50,
        }
    }
}

// ── Building Instance ───────────────────────────────────────────────────────

/// A placed building on the map.
#[derive(Debug, Clone)]
pub struct Building {
    /// Building type
    pub kind: BuildingType,
    /// Map tile position
    pub x: usize,
    pub y: usize,
    /// Construction progress (0.0 = just placed, 1.0 = complete)
    pub construction: f32,
    /// Whether the building is active (construction == 1.0 and has worker if needed)
    pub active: bool,
    /// Ticks since last production
    pub production_counter: u32,
    /// Input buffer: resources waiting to be consumed
    /// Indexed by ResourceType as u8
    pub input_buffer: [u32; ResourceType::COUNT],
    /// Output buffer: resources produced, waiting to be collected
    pub output_buffer: [u32; ResourceType::COUNT],
    /// Worker IDs assigned to this building (from UnitManager)
    pub assigned_workers: Vec<u32>,
    /// Maximum number of workers this building can employ
    pub max_workers: u32,
}

impl Building {
    /// Create a new building at the given position
    pub fn new(kind: BuildingType, x: usize, y: usize) -> Self {
        let max_workers = if kind.requires_worker() { 1 } else { 0 };
        Building {
            kind,
            x,
            y,
            construction: 0.0,
            active: false,
            production_counter: 0,
            input_buffer: [0u32; ResourceType::COUNT],
            output_buffer: [0u32; ResourceType::COUNT],
            assigned_workers: Vec::new(),
            max_workers,
        }
    }

    /// Whether the building has at least one worker assigned
    pub fn has_worker(&self) -> bool {
        !self.assigned_workers.is_empty() || !self.kind.requires_worker()
    }

    /// Assign a worker to this building
    pub fn assign_worker(&mut self, worker_id: u32) -> bool {
        if self.assigned_workers.len() < self.max_workers as usize {
            self.assigned_workers.push(worker_id);
            true
        } else {
            false
        }
    }

    /// Remove a worker from this building
    pub fn remove_worker(&mut self, worker_id: u32) {
        self.assigned_workers.retain(|&id| id != worker_id);
    }

    /// Whether the building can produce (has all prerequisites)
    #[allow(dead_code)]
    fn can_produce(&self, _storage: &ResourceStorage) -> bool {
        if !self.has_worker() {
            return false;
        }
        // Check if we have enough inputs
        for &(ref_type, amount) in self.kind.inputs() {
            if self.input_buffer[ref_type as usize] < amount {
                return false;
            }
        }
        // Check if output buffer has space
        for &(ref_type, amount) in self.kind.outputs() {
            let current = self.output_buffer[ref_type as usize];
            if current + amount > self.kind.output_buffer_size() {
                return false;
            }
        }
        true
    }

    /// Whether construction is complete
    pub fn is_complete(&self) -> bool {
        self.construction >= 1.0
    }

    /// Advance construction by one tick
    pub fn tick_construction(&mut self) {
        if !self.is_complete() {
            let build_ticks = self.kind.build_time();
            if build_ticks > 0 {
                self.construction += 1.0 / build_ticks as f32;
                if self.construction >= 1.0 {
                    self.construction = 1.0;
                }
            }
        }
    }

    /// Try to produce resources for this tick.
    /// Returns true if production occurred.
    /// Note: this does NOT check for assigned workers — caller must check `has_worker()`.
    pub fn try_produce(&mut self, _storage: &mut ResourceStorage) -> bool {
        if !self.is_complete() || self.kind.production_interval() == 0 {
            return false;
        }

        self.production_counter += 1;
        if self.production_counter < self.kind.production_interval() {
            return false;
        }
        self.production_counter = 0;

        // Check if we have enough inputs
        for &(ref_type, amount) in self.kind.inputs() {
            if self.input_buffer[ref_type as usize] < amount {
                return false; // not enough inputs
            }
        }

        // Check if output buffer has space
        for &(ref_type, amount) in self.kind.outputs() {
            let current = self.output_buffer[ref_type as usize];
            if current + amount > self.kind.output_buffer_size() {
                return false; // output full
            }
        }

        // Consume inputs
        for &(ref_type, amount) in self.kind.inputs() {
            self.input_buffer[ref_type as usize] -= amount;
        }

        // Produce outputs
        for &(ref_type, amount) in self.kind.outputs() {
            self.output_buffer[ref_type as usize] += amount;
        }

        true
    }

    /// Collect all resources from the output buffer into storage.
    /// Returns the amounts collected.
    pub fn collect_output(&mut self, storage: &mut ResourceStorage) -> [u32; ResourceType::COUNT] {
        let mut collected = [0u32; ResourceType::COUNT];
        for i in 0..ResourceType::COUNT {
            if self.output_buffer[i] > 0 {
                collected[i] = self.output_buffer[i];
                self.output_buffer[i] = 0;
            }
        }
        storage.add_all(&collected);
        collected
    }
}

// ── Resource Storage ───────────────────────────────────────────────────────

/// Central storage for a player's resources (warehouse/HQ).
#[derive(Debug, Clone)]
pub struct ResourceStorage {
    /// Amount of each resource type in storage
    amounts: [u32; ResourceType::COUNT],
    /// Maximum storage capacity (base 200, +100 per warehouse)
    capacity: u32,
}

impl ResourceStorage {
    /// Create new storage with default capacity
    pub fn new() -> Self {
        ResourceStorage {
            amounts: [0u32; ResourceType::COUNT],
            capacity: 200,
        }
    }

    /// Create with specific capacity
    pub fn with_capacity(capacity: u32) -> Self {
        ResourceStorage {
            amounts: [0u32; ResourceType::COUNT],
            capacity,
        }
    }

    /// Get amount of a specific resource
    pub fn get(&self, rt: ResourceType) -> u32 {
        self.amounts[rt as usize]
    }

    /// Set amount of a specific resource
    pub fn set(&mut self, rt: ResourceType, amount: u32) {
        self.amounts[rt as usize] = amount;
    }

    /// Add amount of a specific resource (clamped to capacity)
    pub fn add(&mut self, rt: ResourceType, amount: u32) -> u32 {
        let current = self.amounts[rt as usize];
        let new = current.saturating_add(amount).min(self.capacity);
        let added = new - current;
        self.amounts[rt as usize] = new;
        added
    }

    /// Add multiple resource amounts at once
    pub fn add_all(&mut self, amounts: &[u32; ResourceType::COUNT]) {
        for i in 0..ResourceType::COUNT {
            if amounts[i] > 0 {
                self.amounts[i] = self.amounts[i].saturating_add(amounts[i]).min(self.capacity);
            }
        }
    }

    /// Try to spend resources. Returns true if all could be spent.
    pub fn try_spend(&mut self, costs: &[(ResourceType, u32)]) -> bool {
        // Check affordability first
        for &(rt, amount) in costs {
            if self.amounts[rt as usize] < amount {
                return false;
            }
        }
        // Deduct
        for &(rt, amount) in costs {
            self.amounts[rt as usize] -= amount;
        }
        true
    }

    /// Get total resources stored (sum of all types)
    pub fn total(&self) -> u32 {
        self.amounts.iter().sum()
    }

    /// Get storage capacity
    pub fn capacity(&self) -> u32 {
        self.capacity
    }

    /// Increase capacity (e.g., when warehouse is built)
    pub fn increase_capacity(&mut self, amount: u32) {
        self.capacity += amount;
    }

    /// Check if storage can accept at least `amount` of resource `rt`
    pub fn can_accept(&self, rt: ResourceType, amount: u32) -> bool {
        self.amounts[rt as usize].saturating_add(amount) <= self.capacity
    }

    /// Get all amounts as a slice
    pub fn amounts(&self) -> &[u32; ResourceType::COUNT] {
        &self.amounts
    }
}

impl Default for ResourceStorage {
    fn default() -> Self {
        Self::new()
    }
}

// ── Economy Manager ────────────────────────────────────────────────────────

/// Manages the full economy: storage, buildings, production chains.
#[derive(Debug, Clone)]
pub struct Economy {
    /// Central resource storage
    pub storage: ResourceStorage,
    /// All placed buildings
    pub buildings: Vec<Building>,
    /// Unit manager for worker assignment
    pub units: UnitManager,
    /// Total production events (for statistics)
    pub production_events: u64,
    /// Total resources collected (for statistics)
    pub resources_collected: u64,
}

impl Economy {
    /// Create a new economy with default storage
    pub fn new() -> Self {
        Economy {
            storage: ResourceStorage::new(),
            buildings: Vec::new(),
            units: UnitManager::new(),
            production_events: 0,
            resources_collected: 0,
        }
    }

    /// Create with starting resources
    pub fn with_starting_resources(resources: &[(ResourceType, u32)]) -> Self {
        let mut economy = Self::new();
        for &(rt, amount) in resources {
            economy.storage.set(rt, amount);
        }
        economy
    }

    /// Spawn a worker and assign it to a building.
    /// Returns the worker ID if successful.
    pub fn spawn_worker_for(&mut self, building_index: usize) -> Option<u32> {
        let building = self.buildings.get(building_index)?;
        if !building.kind.requires_worker() {
            return None;
        }
        let bx = building.x as f32 + 0.5;
        let by = building.y as f32 + 0.5;
        let id = self.units.spawn(crate::units::UnitKind::Worker, bx, by);
        self.buildings[building_index].assign_worker(id);
        self.units.get_mut(id)?.assign_to(building_index);
        Some(id)
    }

    /// Auto-assign idle workers to buildings that need them.
    /// Returns the number of assignments made.
    pub fn auto_assign_workers(&mut self) -> usize {
        let mut assigned = 0;
        // Find buildings that need workers
        for i in 0..self.buildings.len() {
            let building = &self.buildings[i];
            if building.kind.requires_worker() && building.assigned_workers.is_empty() {
                if let Some(worker_id) = self.units.find_idle_worker().map(|w| w.id) {
                    self.buildings[i].assign_worker(worker_id);
                    self.units.get_mut(worker_id).unwrap().assign_to(i);
                    assigned += 1;
                }
            }
        }
        assigned
    }

    /// Get the number of idle workers
    pub fn idle_workers(&self) -> usize {
        self.units.idle_worker_count()
    }

    /// Get the number of total workers
    pub fn total_workers(&self) -> usize {
        self.units.worker_count()
    }

    /// Place a new building. Returns the building index.
    pub fn place_building(&mut self, kind: BuildingType, x: usize, y: usize) -> usize {
        let building = Building::new(kind, x, y);
        self.buildings.push(building);
        self.buildings.len() - 1
    }

    /// Try to place a building, checking if we can afford it.
    /// Returns the building index if successful.
    pub fn try_place_building(&mut self, kind: BuildingType, x: usize, y: usize) -> Option<usize> {
        let cost = kind.build_cost();
        if self.storage.try_spend(cost) {
            Some(self.place_building(kind, x, y))
        } else {
            None
        }
    }

    /// Advance economy by one tick.
    pub fn update(&mut self) {
        // 1. Tick construction for all buildings
        for building in self.buildings.iter_mut() {
            building.tick_construction();
        }

        // 2. Try production for all buildings (only if they have workers)
        for building in self.buildings.iter_mut() {
            if building.has_worker() {
                if building.try_produce(&mut self.storage) {
                    self.production_events += 1;
                }
            }
        }

        // 3. Collect outputs from all buildings into storage
        for building in self.buildings.iter_mut() {
            let collected = building.collect_output(&mut self.storage);
            self.resources_collected += collected.iter().sum::<u32>() as u64;
        }

        // 4. Update warehouse capacity
        let warehouse_count = self.buildings.iter()
            .filter(|b| b.kind == BuildingType::Warehouse && b.is_complete())
            .count() as u32;
        // Base 200 + 100 per warehouse (recalculate from scratch)
        self.storage.capacity = 200 + warehouse_count * 100;
    }

    /// Get all buildings of a specific type
    pub fn buildings_of_type(&self, kind: BuildingType) -> impl Iterator<Item = &Building> {
        self.buildings.iter().filter(move |b| b.kind == kind)
    }

    /// Count completed buildings of a type
    pub fn count_completed(&self, kind: BuildingType) -> usize {
        self.buildings.iter()
            .filter(|b| b.kind == kind && b.is_complete())
            .count()
    }

    /// Get total building count
    pub fn building_count(&self) -> usize {
        self.buildings.len()
    }
}

impl Default for Economy {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resource_type_name() {
        assert_eq!(ResourceType::Wood.name(), "Wood");
        assert_eq!(ResourceType::Planks.name(), "Planks");
        assert_eq!(ResourceType::Weapons.name(), "Weapons");
    }

    #[test]
    fn test_resource_type_is_raw() {
        assert!(ResourceType::Wood.is_raw());
        assert!(ResourceType::Iron.is_raw());
        assert!(!ResourceType::Planks.is_raw());
        assert!(!ResourceType::Tools.is_raw());
    }

    #[test]
    fn test_resource_type_from_map_resource() {
        use crate::map::Resource;
        assert_eq!(ResourceType::from_map_resource(Resource::Iron), Some(ResourceType::Iron));
        assert_eq!(ResourceType::from_map_resource(Resource::Coal), Some(ResourceType::Coal));
        assert_eq!(ResourceType::from_map_resource(Resource::Stone), Some(ResourceType::Stone));
    }

    #[test]
    fn test_building_type_name() {
        assert_eq!(BuildingType::Headquarters.name(), "Headquarters");
        assert_eq!(BuildingType::Sawmill.name(), "Sawmill");
    }

    #[test]
    fn test_building_build_cost() {
        let cost = BuildingType::Sawmill.build_cost();
        assert_eq!(cost.len(), 2);
        assert_eq!(cost[0], (ResourceType::Wood, 5));
        assert_eq!(cost[1], (ResourceType::Stone, 2));
    }

    #[test]
    fn test_building_production_interval() {
        assert_eq!(BuildingType::Sawmill.production_interval(), 20);
        assert_eq!(BuildingType::Headquarters.production_interval(), 0);
        assert_eq!(BuildingType::Warehouse.production_interval(), 0);
    }

    #[test]
    fn test_building_requires_worker() {
        assert!(!BuildingType::Headquarters.requires_worker());
        assert!(!BuildingType::Warehouse.requires_worker());
        assert!(BuildingType::Sawmill.requires_worker());
        assert!(BuildingType::Farm.requires_worker());
    }

    #[test]
    fn test_building_new() {
        let b = Building::new(BuildingType::Sawmill, 5, 10);
        assert_eq!(b.kind, BuildingType::Sawmill);
        assert_eq!(b.x, 5);
        assert_eq!(b.y, 10);
        assert_eq!(b.construction, 0.0);
        assert!(!b.active);
    }

    #[test]
    fn test_building_construction_progress() {
        let mut b = Building::new(BuildingType::Sawmill, 0, 0);
        assert!(!b.is_complete());
        // Sawmill build_time = 30 ticks
        for _ in 0..30 {
            b.tick_construction();
        }
        assert!(b.is_complete());
    }

    #[test]
    fn test_storage_new() {
        let s = ResourceStorage::new();
        assert_eq!(s.capacity(), 200);
        assert_eq!(s.total(), 0);
    }

    #[test]
    fn test_storage_add() {
        let mut s = ResourceStorage::new();
        s.add(ResourceType::Wood, 50);
        assert_eq!(s.get(ResourceType::Wood), 50);
    }

    #[test]
    fn test_storage_capacity_limit() {
        let mut s = ResourceStorage::with_capacity(100);
        s.add(ResourceType::Wood, 200);
        assert_eq!(s.get(ResourceType::Wood), 100);
    }

    #[test]
    fn test_storage_try_spend() {
        let mut s = ResourceStorage::new();
        s.set(ResourceType::Wood, 10);
        s.set(ResourceType::Stone, 5);

        assert!(s.try_spend(&[(ResourceType::Wood, 5), (ResourceType::Stone, 3)]));
        assert_eq!(s.get(ResourceType::Wood), 5);
        assert_eq!(s.get(ResourceType::Stone), 2);

        // Can't afford
        assert!(!s.try_spend(&[(ResourceType::Wood, 100)]));
        // Balance unchanged
        assert_eq!(s.get(ResourceType::Wood), 5);
    }

    #[test]
    fn test_storage_increase_capacity() {
        let mut s = ResourceStorage::with_capacity(100);
        s.increase_capacity(50);
        assert_eq!(s.capacity(), 150);
    }

    #[test]
    fn test_economy_new() {
        let e = Economy::new();
        assert_eq!(e.building_count(), 0);
        assert_eq!(e.storage.total(), 0);
    }

    #[test]
    fn test_economy_with_starting_resources() {
        let e = Economy::with_starting_resources(&[
            (ResourceType::Wood, 50),
            (ResourceType::Stone, 30),
        ]);
        assert_eq!(e.storage.get(ResourceType::Wood), 50);
        assert_eq!(e.storage.get(ResourceType::Stone), 30);
    }

    #[test]
    fn test_economy_place_building() {
        let mut e = Economy::new();
        let idx = e.place_building(BuildingType::Sawmill, 5, 10);
        assert_eq!(idx, 0);
        assert_eq!(e.building_count(), 1);
    }

    #[test]
    fn test_economy_try_place_building_afford() {
        let mut e = Economy::with_starting_resources(&[
            (ResourceType::Wood, 10),
            (ResourceType::Stone, 10),
        ]);
        let idx = e.try_place_building(BuildingType::Sawmill, 5, 10);
        assert!(idx.is_some());
        // Cost: 5 wood + 2 stone
        assert_eq!(e.storage.get(ResourceType::Wood), 5);
        assert_eq!(e.storage.get(ResourceType::Stone), 8);
    }

    #[test]
    fn test_economy_try_place_building_cant_afford() {
        let mut e = Economy::with_starting_resources(&[
            (ResourceType::Wood, 1),
        ]);
        let idx = e.try_place_building(BuildingType::Sawmill, 5, 10);
        assert!(idx.is_none());
        // Unchanged
        assert_eq!(e.storage.get(ResourceType::Wood), 1);
    }

    #[test]
    fn test_building_production_sawmill() {
        let mut storage = ResourceStorage::new();
        let mut building = Building::new(BuildingType::Sawmill, 0, 0);

        // Complete construction
        for _ in 0..30 {
            building.tick_construction();
        }
        assert!(building.is_complete());

        // Add inputs
        building.input_buffer[ResourceType::Wood as usize] = 10;

        // Sawmill: 20 ticks per cycle, consumes 2 Wood → produces 1 Planks
        let mut produced = 0;
        for _ in 0..100 {
            if building.try_produce(&mut storage) {
                produced += 1;
            }
        }
        assert!(produced > 0, "Should have produced planks");
        assert_eq!(building.output_buffer[ResourceType::Planks as usize], produced);
    }

    #[test]
    fn test_building_production_farm() {
        let mut storage = ResourceStorage::new();
        let mut building = Building::new(BuildingType::Farm, 0, 0);

        // Complete construction
        for _ in 0..20 {
            building.tick_construction();
        }
        assert!(building.is_complete());

        // Farm: no inputs, produces 2 Grain every 20 ticks
        let mut produced = 0;
        for _ in 0..100 {
            if building.try_produce(&mut storage) {
                produced += 1;
            }
        }
        assert!(produced > 0, "Should have produced grain");
        assert_eq!(building.output_buffer[ResourceType::Grain as usize], produced * 2);
    }

    #[test]
    fn test_building_production_no_inputs() {
        let mut storage = ResourceStorage::new();
        let mut building = Building::new(BuildingType::Sawmill, 0, 0);

        // Complete construction
        for _ in 0..30 {
            building.tick_construction();
        }

        // No inputs → no production
        let mut produced = 0;
        for _ in 0..100 {
            if building.try_produce(&mut storage) {
                produced += 1;
            }
        }
        assert_eq!(produced, 0, "Should not produce without inputs");
    }

    #[test]
    fn test_economy_update() {
        let mut e = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
        ]);

        let farm_idx = e.place_building(BuildingType::Farm, 0, 0);

        // Build the farm (20 ticks), then spawn a worker
        for _ in 0..20 {
            e.update();
        }
        e.spawn_worker_for(farm_idx);

        // Run 200 more ticks — farm should produce grain now
        for _ in 0..200 {
            e.update();
        }

        // Farm should have produced some grain
        let grain: u32 = e.buildings.iter()
            .map(|b| b.output_buffer[ResourceType::Grain as usize])
            .sum();
        // Grain in buildings + collected into storage
        let total_grain = grain + e.storage.get(ResourceType::Grain);
        assert!(total_grain > 0, "Should have produced grain, got {}", total_grain);
    }

    #[test]
    fn test_economy_count_completed() {
        let mut e = Economy::new();
        e.place_building(BuildingType::Farm, 0, 0);
        e.place_building(BuildingType::Farm, 1, 0);
        e.place_building(BuildingType::Sawmill, 2, 0);

        assert_eq!(e.count_completed(BuildingType::Farm), 0);

        // Build farms (20 ticks each)
        for _ in 0..20 {
            e.update();
        }
        assert_eq!(e.count_completed(BuildingType::Farm), 2);
        assert_eq!(e.count_completed(BuildingType::Sawmill), 0);

        // Build sawmill (30 ticks)
        for _ in 0..10 {
            e.update();
        }
        assert_eq!(e.count_completed(BuildingType::Sawmill), 1);
    }

    #[test]
    fn test_production_chain_wood_to_planks() {
        // Full chain: Lumberjack produces Wood → Sawmill converts to Planks
        let mut storage = ResourceStorage::new();
        let mut lumberjack = Building::new(BuildingType::Lumberjack, 0, 0);
        let mut sawmill = Building::new(BuildingType::Sawmill, 1, 0);

        // Complete construction
        for _ in 0..20 { lumberjack.tick_construction(); }
        for _ in 0..30 { sawmill.tick_construction(); }

        // Lumberjack: no inputs, produces 2 Wood every 15 ticks
        // Sawmill: 2 Wood → 1 Planks every 20 ticks
        let mut total_wood = 0u32;
        let mut total_planks = 0u32;

        for _tick in 0..300 {
            // Lumberjack produces
            if lumberjack.try_produce(&mut storage) {
                total_wood += 2;
            }
            // Move wood from lumberjack output to sawmill input
            let lj_output = lumberjack.output_buffer[ResourceType::Wood as usize];
            if lj_output > 0 {
                sawmill.input_buffer[ResourceType::Wood as usize] += lj_output;
                lumberjack.output_buffer[ResourceType::Wood as usize] = 0;
            }
            // Sawmill produces
            if sawmill.try_produce(&mut storage) {
                total_planks += 1;
            }
        }

        assert!(total_wood > 0, "Lumberjack should produce wood");
        assert!(total_planks > 0, "Sawmill should produce planks");
    }

    #[test]
    fn test_building_inputs_outputs() {
        // Verify all buildings with inputs have matching outputs
        for kind in [BuildingType::Sawmill, BuildingType::Blacksmith, BuildingType::Armory,
                     BuildingType::Brewery, BuildingType::Bakery, BuildingType::Butcher,
                     BuildingType::Tannery] {
            let inputs = kind.inputs();
            let outputs = kind.outputs();
            assert!(!inputs.is_empty(), "{} should have inputs", kind.name());
            assert!(!outputs.is_empty(), "{} should have outputs", kind.name());
            assert!(kind.production_interval() > 0, "{} should have production interval", kind.name());
        }
    }

    #[test]
    fn test_storage_can_accept() {
        let mut s = ResourceStorage::with_capacity(100);
        assert!(s.can_accept(ResourceType::Wood, 50));
        assert!(s.can_accept(ResourceType::Wood, 100));
        assert!(!s.can_accept(ResourceType::Wood, 101));

        s.add(ResourceType::Wood, 60);
        assert!(s.can_accept(ResourceType::Wood, 40));
        assert!(!s.can_accept(ResourceType::Wood, 41));
    }
}
