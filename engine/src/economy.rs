//! S4WN Economy Module
//!
//! Phase 2 — Game Logic: resources, buildings, production chains, and storage.
//!
//! ## Design
//!
//! The economy is a tick-driven simulation. Each tick:
//! 1. Buildings with assigned settlers produce resources (if inputs available)
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
//! - An optional assigned settler
//! - A construction progress (0.0 → 1.0, building is "active" at 1.0)
//! - An input buffer (small queue of resources waiting to be consumed)
//! - An output buffer (resources produced, waiting to be collected)

use crate::map::Resource;
use crate::nation::{NationModifiers, ResourceCategory};
use crate::units::{UnitKind, UnitManager};

// ── Resource Types ──────────────────────────────────────────────────────────

/// All resource types in the game.
/// These extend the map's `Resource` enum (which represents raw deposits)
/// with processed goods created by buildings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum ResourceType {
    // Raw resources (mined/harvested from map deposits)
    Wood = 0,   // from forests
    Stone = 1,  // from stone deposits
    Iron = 2,   // from iron ore
    Coal = 3,   // from coal deposits
    Gold = 4,   // from gold deposits
    Sulfur = 5, // from sulfur deposits
    Fish = 6,   // from fishing
    Grain = 7,  // from farming
    Game = 8,   // from hunting
    Water = 9,  // from waterworks

    // Processed goods (produced by buildings)
    Boards = 16,     // Wood → Boards (sawmill)
    Tools = 17,      // Iron + Coal → Tools (toolsmith)
    Weapons = 18,    // Iron + Coal + Tools → Weapons (weaponsmith)
    Beer = 19,       // Grain → Beer (brewery)
    Bread = 20,      // Grain → Bread (bakery)
    Meat = 21,       // Game → Meat (butcher)
    Flour = 22,      // Grain → Flour (mill)
    IronIngots = 23, // Iron + Coal → Iron Ingots (smelter)
    Coins = 24,     // Gold + Coal → Coins (mint)
}

impl ResourceType {
    /// Total number of distinct resource types
    pub const COUNT: usize = 26;

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
            ResourceType::Boards => "Boards",
            ResourceType::Tools => "Tools",
            ResourceType::Weapons => "Weapons",
            ResourceType::Beer => "Beer",
            ResourceType::Bread => "Bread",
            ResourceType::Meat => "Meat",
            ResourceType::Flour => "Flour",
            ResourceType::Water => "Water",
            ResourceType::IronIngots => "Iron Ingots",
            ResourceType::Coins => "Coins",
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

/// Ticks between settler recruitment at each Castle
/// At 10 TPS, 50 ticks = 5 seconds per settler
pub const CASTLE_SETTLER_INTERVAL: u32 = 50;
/// Ticks between swordsman training at each Barracks
/// At 10 TPS, 60 ticks = 6 seconds per swordsman
pub const BARRACKS_TRAINING_INTERVAL: u32 = 60;

// ── Building Types ─────────────────────────────────────────────────────────

/// Defines a building type and its production characteristics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum BuildingType {
    /// Castle — stores resources, spawns settlers
    Castle = 0,
    /// Sawmill — converts Wood → Boards
    Sawmill = 1,
    /// Stonecutter — produces Stone (requires settler + stone deposit nearby)
    Stonecutter = 2,
    /// Mine — produces Iron/Coal/Gold (requires deposit)
    Mine = 3,
    /// Toolsmith — Iron + Coal → Tools
    Toolsmith = 4,
    /// Weaponsmith — Iron + Coal + Tools → Weapons
    Weaponsmith = 5,
    /// Brewery — Grain → Beer
    Brewery = 6,
    /// Bakery — Grain → Bread
    Bakery = 7,
    /// Butcher — Meat → Sausages
    Butcher = 8,
    /// Mill — Grain → Flour
    Mill = 9,
    /// Farm — produces Grain (on grass tiles)
    Farm = 10,
    /// Fisherman — produces Fish (on water-adjacent tiles)
    Fisherman = 11,
    /// Woodcutter — produces Wood (near forests)
    Woodcutter = 12,
    /// Storehouse — extends storage capacity
    Storehouse = 13,
    /// Waterworks — produces Water (requires Bucket tool)
    Waterworks = 14,
    /// Smelter — converts Iron Ore + Coal → Iron Ingots
    Smelter = 15,
    /// Barracks — converts settlers into Swordsmen (requires Weapons)
    Barracks = 16,
    /// Mint — converts Gold Ore + Coal → Coins
    Mint = 17,
}

impl BuildingType {
    /// Display name
    pub fn name(self) -> &'static str {
        match self {
            BuildingType::Castle => "Castle",
            BuildingType::Sawmill => "Sawmill",
            BuildingType::Stonecutter => "Stonecutter",
            BuildingType::Mine => "Mine",
            BuildingType::Toolsmith => "Toolsmith",
            BuildingType::Weaponsmith => "Weaponsmith",
            BuildingType::Brewery => "Brewery",
            BuildingType::Bakery => "Bakery",
            BuildingType::Butcher => "Butcher",
            BuildingType::Mill => "Mill",
            BuildingType::Farm => "Farm",
            BuildingType::Fisherman => "Fisherman",
            BuildingType::Woodcutter => "Woodcutter",
            BuildingType::Storehouse => "Storehouse",
            BuildingType::Waterworks => "Waterworks",
            BuildingType::Smelter => "Smelter",
            BuildingType::Barracks => "Barracks",
            BuildingType::Mint => "Mint",
        }
    }

    /// Look up a building type by name.
    pub fn from_name(name: &str) -> Option<Self> {
        match name {
            "Castle" => Some(BuildingType::Castle),
            "Sawmill" => Some(BuildingType::Sawmill),
            "Stonecutter" => Some(BuildingType::Stonecutter),
            "Mine" => Some(BuildingType::Mine),
            "Toolsmith" => Some(BuildingType::Toolsmith),
            "Weaponsmith" => Some(BuildingType::Weaponsmith),
            "Brewery" => Some(BuildingType::Brewery),
            "Bakery" => Some(BuildingType::Bakery),
            "Butcher" => Some(BuildingType::Butcher),
            "Mill" => Some(BuildingType::Mill),
            "Farm" => Some(BuildingType::Farm),
            "Fisherman" => Some(BuildingType::Fisherman),
            "Woodcutter" => Some(BuildingType::Woodcutter),
            "Storehouse" => Some(BuildingType::Storehouse),
            "Waterworks" => Some(BuildingType::Waterworks),
            "Smelter" => Some(BuildingType::Smelter),
            "Barracks" => Some(BuildingType::Barracks),
            "Mint" => Some(BuildingType::Mint),
            _ => None,
        }
    }

    /// Get all building type names.
    pub fn all_names() -> Vec<&'static str> {
        vec![
            "Castle",
            "Sawmill",
            "Stonecutter",
            "Mine",
            "Toolsmith",
            "Weaponsmith",
            "Brewery",
            "Bakery",
            "Butcher",
            "Mill",
            "Farm",
            "Fisherman",
            "Woodcutter",
            "Storehouse",
            "Waterworks",
            "Smelter",
            "Barracks",
            "Mint",
        ]
    }

    /// Resource cost to construct this building
    pub fn build_cost(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Castle => &[(ResourceType::Wood, 10), (ResourceType::Stone, 5)],
            BuildingType::Sawmill => &[(ResourceType::Wood, 5), (ResourceType::Stone, 2)],
            BuildingType::Stonecutter => &[(ResourceType::Wood, 5)],
            BuildingType::Mine => &[(ResourceType::Wood, 8), (ResourceType::Stone, 3)],
            BuildingType::Toolsmith => &[
                (ResourceType::Wood, 5),
                (ResourceType::Stone, 5),
                (ResourceType::Iron, 2),
            ],
            BuildingType::Weaponsmith => &[
                (ResourceType::Wood, 5),
                (ResourceType::Stone, 5),
                (ResourceType::Tools, 3),
            ],
            BuildingType::Brewery => &[(ResourceType::Wood, 5), (ResourceType::Stone, 2)],
            BuildingType::Bakery => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::Butcher => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::Mill => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::Farm => &[(ResourceType::Wood, 3)],
            BuildingType::Fisherman => &[(ResourceType::Wood, 3)],
            BuildingType::Woodcutter => &[(ResourceType::Wood, 2)],
            BuildingType::Storehouse => &[(ResourceType::Wood, 8), (ResourceType::Stone, 4)],
            BuildingType::Waterworks => &[(ResourceType::Wood, 4), (ResourceType::Stone, 3)],
            BuildingType::Smelter => &[(ResourceType::Wood, 5), (ResourceType::Stone, 5)],
            BuildingType::Barracks => &[(ResourceType::Wood, 6), (ResourceType::Stone, 6)],
            BuildingType::Mint => &[(ResourceType::Wood, 5), (ResourceType::Stone, 5)],
        }
    }

    /// Input resources consumed per production cycle (empty if no inputs)
    pub fn inputs(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Sawmill => &[(ResourceType::Wood, 2)],
            BuildingType::Toolsmith => &[(ResourceType::Iron, 1), (ResourceType::Coal, 1)],
            BuildingType::Weaponsmith => &[
                (ResourceType::Iron, 1),
                (ResourceType::Coal, 1),
                (ResourceType::Tools, 1),
            ],
            BuildingType::Brewery => &[(ResourceType::Grain, 3)],
            BuildingType::Bakery => &[(ResourceType::Grain, 2)],
            BuildingType::Butcher => &[(ResourceType::Game, 2)],
            BuildingType::Mill => &[(ResourceType::Grain, 3)],
            BuildingType::Smelter => &[(ResourceType::Iron, 1), (ResourceType::Coal, 1)],
            BuildingType::Mint => &[(ResourceType::Gold, 1), (ResourceType::Coal, 1)],
            _ => &[], // raw producers and storage have no inputs
        }
    }

    /// Output resources produced per production cycle
    pub fn outputs(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Sawmill => &[(ResourceType::Boards, 1)],
            BuildingType::Stonecutter => &[(ResourceType::Stone, 1)],
            BuildingType::Mine => &[(ResourceType::Iron, 1)], // simplified: mine produces iron
            BuildingType::Toolsmith => &[(ResourceType::Tools, 1)],
            BuildingType::Weaponsmith => &[(ResourceType::Weapons, 1)],
            BuildingType::Brewery => &[(ResourceType::Beer, 1)],
            BuildingType::Bakery => &[(ResourceType::Bread, 1)],
            BuildingType::Butcher => &[(ResourceType::Meat, 1)],
            BuildingType::Mill => &[(ResourceType::Flour, 1)],
            BuildingType::Farm => &[(ResourceType::Grain, 2)],
            BuildingType::Fisherman => &[(ResourceType::Fish, 1)],
            BuildingType::Woodcutter => &[(ResourceType::Wood, 2)],
            BuildingType::Waterworks => &[(ResourceType::Water, 1)],
            BuildingType::Smelter => &[(ResourceType::IronIngots, 1)],
            BuildingType::Mint => &[(ResourceType::Coins, 1)],
            _ => &[], // Barracks, Castle, Storehouse produce nothing
        }
    }

    /// Number of ticks between production cycles (at 10 TPS = 10 ticks/sec)
    pub fn production_interval(self) -> u32 {
        match self {
            BuildingType::Sawmill => 20,     // 2 seconds
            BuildingType::Stonecutter => 30, // 3 seconds
            BuildingType::Mine => 40,        // 4 seconds
            BuildingType::Toolsmith => 30,   // 3 seconds
            BuildingType::Weaponsmith => 50, // 5 seconds
            BuildingType::Brewery => 25,     // 2.5 seconds
            BuildingType::Bakery => 20,      // 2 seconds
            BuildingType::Butcher => 25,     // 2.5 seconds
            BuildingType::Mill => 25,        // 2.5 seconds
            BuildingType::Farm => 20,        // 2 seconds
            BuildingType::Fisherman => 20,   // 2 seconds
            BuildingType::Woodcutter => 15,  // 1.5 seconds
            BuildingType::Waterworks => 30,  // 3 seconds
            BuildingType::Smelter => 30,     // 3 seconds
            BuildingType::Mint => 30,        // 3 seconds
            _ => 0,                          // Barracks, Castle, Storehouse don't produce
        }
    }

    /// Maximum input buffer size (how many cycles worth of inputs can be queued)
    pub fn input_buffer_size(self) -> u32 {
        if self.inputs().is_empty() {
            0
        } else {
            3
        }
    }

    /// Maximum output buffer size
    pub fn output_buffer_size(self) -> u32 {
        if self.outputs().is_empty() {
            0
        } else {
            3
        }
    }

    /// Whether this building requires a settler to produce
    pub fn requires_settler(self) -> bool {
        !matches!(
            self,
            BuildingType::Castle | BuildingType::Storehouse | BuildingType::Barracks
        )
    }

    /// Ticks needed to construct this building
    pub fn build_time(self) -> u32 {
        match self {
            BuildingType::Castle => 0, // already built
            BuildingType::Storehouse => 50,
            BuildingType::Farm | BuildingType::Fisherman | BuildingType::Woodcutter => 20,
            BuildingType::Stonecutter | BuildingType::Sawmill => 30,
            BuildingType::Mine => 40,
            BuildingType::Toolsmith | BuildingType::Brewery | BuildingType::Bakery => 35,
            BuildingType::Butcher | BuildingType::Mill => 30,
            BuildingType::Weaponsmith => 50,
            BuildingType::Waterworks => 25,
            BuildingType::Smelter => 35,
            BuildingType::Barracks => 40,
            BuildingType::Mint => 35,
        }
    }

    /// The tool a settler must carry to work at this building.
    /// Returns None for buildings that don't require a tool.
    pub fn required_tool(self) -> Option<&'static str> {
        match self {
            BuildingType::Stonecutter | BuildingType::Mine => Some("Pickaxe"),
            BuildingType::Sawmill => Some("Saw"),
            BuildingType::Toolsmith | BuildingType::Weaponsmith => Some("Hammer"),
            BuildingType::Brewery | BuildingType::Bakery | BuildingType::Mill => {
                Some("Rolling Pin")
            }
            BuildingType::Butcher => Some("Cleaver"),
            BuildingType::Fisherman => Some("Fishing Rod"),
            BuildingType::Woodcutter => Some("Axe"),
            BuildingType::Waterworks => Some("Bucket"),
            BuildingType::Smelter => Some("Hammer"),
            BuildingType::Mint => Some("Hammer"),
            _ => None, // Castle, Storehouse, Farm, Barracks — no tool needed
        }
    }

    /// The building category for nation cost modifier lookups.
    pub fn building_category(self) -> crate::nation::BuildingCategory {
        use crate::nation::BuildingCategory;
        match self {
            // Economic buildings
            BuildingType::Farm | BuildingType::Mill | BuildingType::Bakery
            | BuildingType::Fisherman | BuildingType::Butcher | BuildingType::Waterworks
            | BuildingType::Woodcutter | BuildingType::Sawmill | BuildingType::Stonecutter
            | BuildingType::Smelter | BuildingType::Mint | BuildingType::Toolsmith
            | BuildingType::Brewery | BuildingType::Castle | BuildingType::Storehouse => {
                BuildingCategory::Economic
            }
            // Military buildings
            BuildingType::Weaponsmith | BuildingType::Barracks | BuildingType::Mine => {
                BuildingCategory::Military
            }
        }
    }
}

/// Convert a tool name string to its ToolType discriminant (u8).
/// None if the name doesn't map to a known tool.
pub fn tool_code_from_name(name: &str) -> Option<u8> {
    match name {
        "Hammer" => Some(0),
        "Pickaxe" => Some(1),
        "Axe" => Some(2),
        "Saw" => Some(3),
        "Fishing Rod" => Some(4),
        "Rolling Pin" => Some(5),
        "Cleaver" => Some(6),
        "Bucket" => Some(7),
        "Dagger" => Some(8),
        "Shovel" => Some(9),
        "Bow" => Some(10),
        _ => None,
    }
}

/// Convert a tool code (u8 discriminant) to its name string.
/// Returns "Unknown" for codes outside 0..=10.
pub fn tool_code_to_name(code: u8) -> &'static str {
    match code {
        0 => "Hammer",
        1 => "Pickaxe",
        2 => "Axe",
        3 => "Saw",
        4 => "Fishing Rod",
        5 => "Rolling Pin",
        6 => "Cleaver",
        7 => "Bucket",
        8 => "Dagger",
        9 => "Shovel",
        10 => "Bow",
        _ => "Unknown",
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
    /// Whether the building is active (construction == 1.0 and has settler if needed)
    pub active: bool,
    /// Ticks until next settler recruitment (Castle only)
    pub recruitment_timer: u32,
    /// Ticks since last production (f32 for nation-modifier precision)
    pub production_counter: f32,
    /// Input buffer: resources waiting to be consumed
    /// Indexed by ResourceType as u8
    pub input_buffer: [u32; ResourceType::COUNT],
    /// Output buffer: resources produced, waiting to be collected
    pub output_buffer: [u32; ResourceType::COUNT],
    /// Worker IDs assigned to this building (from UnitManager)
    pub assigned_settlers: Vec<u32>,
    /// Maximum number of settlers this building can employ
    pub max_settlers: u32,
    /// Tool required for work (ToolType discriminant). None = no tool needed.
    pub required_tool: Option<u8>,
    /// Which unit kind this barracks is currently training (alternates Swordsman/Bowman)
    pub training_kind: UnitKind,
}

impl Building {
    /// Create a new building at the given position
    pub fn new(kind: BuildingType, x: usize, y: usize) -> Self {
        let max_settlers = if kind.requires_settler() { 1 } else { 0 };
        let required_tool = kind.required_tool().and_then(tool_code_from_name);
        // Buildings with 0 build time start immediately complete (Castle, Storehouse)
        let start_construction = if kind.build_time() == 0 { 1.0 } else { 0.0 };
        Building {
            kind,
            x,
            y,
            construction: start_construction,
            active: start_construction >= 1.0,
            recruitment_timer: 0,
            production_counter: 0.0,
            input_buffer: [0u32; ResourceType::COUNT],
            output_buffer: [0u32; ResourceType::COUNT],
            assigned_settlers: Vec::new(),
            max_settlers,
            required_tool,
            training_kind: UnitKind::Swordsman,
        }
    }

    /// Whether the building has at least one settler assigned
    pub fn has_settler(&self) -> bool {
        !self.assigned_settlers.is_empty() || !self.kind.requires_settler()
    }

    /// Whether at least one assigned settler carries the required tool.
    /// Buildings that don't require a tool always return true.
    pub fn has_tooled_settler(&self, units: &UnitManager) -> bool {
        if self.required_tool.is_none() {
            return true; // No tool required
        }
        let needed = self.required_tool.unwrap();
        self.assigned_settlers.iter().any(|&sid| {
            units
                .get(sid)
                .map(|u| u.carried_tool == Some(needed))
                .unwrap_or(false)
        })
    }

    /// Assign a settler to this building
    pub fn assign_settler(&mut self, settler_id: u32) -> bool {
        if self.assigned_settlers.len() < self.max_settlers as usize {
            self.assigned_settlers.push(settler_id);
            true
        } else {
            false
        }
    }

    /// Remove a settler from this building
    pub fn remove_settler(&mut self, settler_id: u32) {
        self.assigned_settlers.retain(|&id| id != settler_id);
    }

    /// Whether the building can produce (has all prerequisites)
    #[allow(dead_code)]
    fn can_produce(&self, _storage: &ResourceStorage) -> bool {
        if !self.has_settler() {
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
    /// `speed_multiplier` applies nation production modifiers (1.0 = normal).
    /// Returns true if production occurred.
    /// Note: this does NOT check for assigned settlers — caller must check `has_settler()`.
    pub fn try_produce(&mut self, _storage: &mut ResourceStorage, speed_multiplier: f32) -> bool {
        if !self.is_complete() || self.kind.production_interval() == 0 {
            return false;
        }

        self.production_counter += speed_multiplier;
        if self.production_counter < self.kind.production_interval() as f32 {
            return false;
        }
        self.production_counter = 0.0;

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
                self.amounts[i] = self.amounts[i]
                    .saturating_add(amounts[i])
                    .min(self.capacity);
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
    /// Unit manager for settler assignment
    pub units: UnitManager,
    /// Total production events (for statistics)
    pub production_events: u64,
    /// Total resources collected (for statistics)
    pub resources_collected: u64,
    /// Named tool storage — tracks how many of each ToolType are in the storehouse.
    /// Indexed by ToolType discriminant (0=Hammer, 1=Pickaxe, ..., 10=Scythe).
    pub tool_storage: [u32; 12],
    /// Nation modifiers applied to production costs and speeds (None = unset)
    pub nation_modifiers: Option<NationModifiers>,
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
            tool_storage: [0u32; 12],
            nation_modifiers: None,
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

    /// Spawn a settler and assign it to a building.
    /// Returns the settler ID if successful.
    pub fn spawn_settler_for(&mut self, building_index: usize) -> Option<u32> {
        let building = self.buildings.get(building_index)?;
        if !building.kind.requires_settler() {
            return None;
        }
        let bx = building.x as f32 + 0.5;
        let by = building.y as f32 + 0.5;
        let id = self.units.spawn(crate::units::UnitKind::Settler, bx, by);
        self.buildings[building_index].assign_settler(id);
        self.units.get_mut(id)?.assign_to(building_index);
        Some(id)
    }

    /// Auto-assign idle settlers to buildings that need them.
    /// Tries to give the settler the required tool from storage.
    /// Returns the number of assignments made.
    pub fn auto_assign_settlers(&mut self) -> usize {
        let mut assigned = 0;
        // Find buildings that need settlers
        for i in 0..self.buildings.len() {
            let building = &self.buildings[i];
            if building.kind.requires_settler()
                && building.is_complete()
                && building.assigned_settlers.is_empty()
            {
                if let Some(settler_id) = self.units.find_idle_settler().map(|w| w.id) {
                    // Tool pickup: try to give the settler the required tool
                    let tool_code = building.required_tool;
                    if let Some(tc) = tool_code {
                        if self.withdraw_tool(tc) {
                            if let Some(unit) = self.units.get_mut(settler_id) {
                                unit.carried_tool = Some(tc);
                            }
                        }
                    }
                    self.buildings[i].assign_settler(settler_id);
                    self.units.get_mut(settler_id).unwrap().assign_to(i);
                    assigned += 1;
                }
            }
        }
        assigned
    }

    /// Set the nation modifiers for this economy.
    /// Also applies the worker speed multiplier to all existing settlers.
    pub fn set_nation_modifiers(&mut self, modifiers: NationModifiers) {
        self.nation_modifiers = Some(modifiers);
        self.units.set_nation_speed_mult(modifiers.units.worker_speed);
    }

    /// Map a building type to its resource category for nation production speed lookups.
    fn building_to_resource_category(kind: BuildingType) -> ResourceCategory {
        match kind {
            // Food buildings
            BuildingType::Farm | BuildingType::Fisherman | BuildingType::Butcher
            | BuildingType::Mill | BuildingType::Bakery | BuildingType::Waterworks => {
                ResourceCategory::Food
            }
            // Wood buildings
            BuildingType::Woodcutter | BuildingType::Sawmill => {
                ResourceCategory::Wood
            }
            // Stone
            BuildingType::Stonecutter => {
                ResourceCategory::Stone
            }
            // Iron-related (mining + smelting)
            BuildingType::Smelter => {
                ResourceCategory::Iron
            }
            // Gold
            BuildingType::Mint => {
                ResourceCategory::Gold
            }
            // Tools
            BuildingType::Toolsmith => {
                ResourceCategory::Tools
            }
            // Weapons
            BuildingType::Weaponsmith => {
                ResourceCategory::Weapons
            }
            // Buildings without resource production (Castle, Storehouse, Barracks, Mine)
            // use a default 1.0 multiplier — handled upstream
            _ => ResourceCategory::Food, // unreachable for production, safe default
        }
    }

    /// Get the production speed multiplier for a building type from nation modifiers.
    fn production_speed_for(&self, kind: BuildingType) -> f32 {
        if let Some(ref mods) = self.nation_modifiers {
            let cat = Self::building_to_resource_category(kind);
            match cat {
                ResourceCategory::Food => mods.production.food,
                ResourceCategory::Wood => mods.production.wood,
                ResourceCategory::Stone => mods.production.stone,
                ResourceCategory::Iron => mods.production.iron,
                ResourceCategory::Coal => mods.production.coal,
                ResourceCategory::Gold => mods.production.gold,
                ResourceCategory::Tools => mods.production.tools,
                ResourceCategory::Weapons => mods.production.weapons,
            }
        } else {
            1.0
        }
    }

    /// Get the number of idle settlers
    pub fn idle_settlers(&self) -> usize {
        self.units.idle_settler_count()
    }

    /// Get the number of total settlers
    pub fn total_settlers(&self) -> usize {
        self.units.settler_count()
    }

    /// Place a new building. Returns the building index.
    pub fn place_building(&mut self, kind: BuildingType, x: usize, y: usize) -> usize {
        let building = Building::new(kind, x, y);
        self.buildings.push(building);
        self.buildings.len() - 1
    }

    /// Try to place a building, checking if we can afford it.
    /// Applies nation cost modifiers to building costs.
    /// Returns the building index if successful.
    pub fn try_place_building(&mut self, kind: BuildingType, x: usize, y: usize) -> Option<usize> {
        let base_cost = kind.build_cost();
        let cost_multiplier = self.nation_modifiers
            .map(|m| {
                use crate::nation::BuildingCategory;
                match kind.building_category() {
                    BuildingCategory::Economic => m.cost.economic,
                    BuildingCategory::Military => m.cost.military,
                    BuildingCategory::Unique => m.cost.unique,
                }
            })
            .unwrap_or(1.0);
        // Apply modifier: multiply each cost entry and round up (ceil)
        let adjusted_cost: Vec<(ResourceType, u32)> = base_cost.iter().map(|&(rt, amt)| {
            let adj = (amt as f32 * cost_multiplier).ceil() as u32;
            (rt, adj)
        }).collect();
        if self.storage.try_spend(&adjusted_cost) {
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

        // 1b. Castle recruitment — spawn idle settlers from completed Castles
        // Pre-collect spawn positions to avoid borrowing conflicts
        let castle_spawns: Vec<(f32, f32)> = self
            .buildings
            .iter_mut()
            .filter(|b| b.kind == BuildingType::Castle && b.is_complete())
            .filter_map(|b| {
                b.recruitment_timer += 1;
                if b.recruitment_timer >= CASTLE_SETTLER_INTERVAL {
                    b.recruitment_timer = 0;
                    Some((b.x as f32 + 0.5, b.y as f32 + 0.5))
                } else {
                    None
                }
            })
            .collect();
        for (cx, cy) in castle_spawns {
            let sid = self.units.spawn(crate::units::UnitKind::Settler, cx, cy);
            // Apply nation worker speed modifier to newly spawned settler
            if let Some(ref mods) = self.nation_modifiers {
                if let Some(unit) = self.units.get_mut(sid) {
                    unit.nation_speed_mult = mods.units.worker_speed;
                }
            }
        }

        // 1c. Barracks training — spawn swordsmen/bowmen from completed Barracks that have Weapons
        let barracks_spawns: Vec<(f32, f32, crate::units::UnitKind)> = self
            .buildings
            .iter_mut()
            .filter(|b| b.kind == BuildingType::Barracks && b.is_complete())
            .filter_map(|b| {
                b.recruitment_timer += 1;
                if b.recruitment_timer >= BARRACKS_TRAINING_INTERVAL {
                    // Check if we have at least 1 Weapon in storage
                    if self.storage.amounts()[ResourceType::Weapons as usize] >= 1 {
                        b.recruitment_timer = 0;
                        let trained_kind = b.training_kind;
                        // Toggle for next training cycle
                        b.training_kind = match b.training_kind {
                            crate::units::UnitKind::Swordsman => crate::units::UnitKind::Bowman,
                            _ => crate::units::UnitKind::Swordsman,
                        };
                        Some((b.x as f32 + 0.5, b.y as f32 + 0.5, trained_kind))
                    } else {
                        // No weapons — hold the timer (don't reset, just wait)
                        None
                    }
                } else {
                    None
                }
            })
            .collect();
        for (bx, by, kind) in barracks_spawns {
            // Consume 1 Weapon from storage
            self.storage.try_spend(&[(ResourceType::Weapons, 1)]);
            let sid = self.units.spawn(kind, bx, by);
            // Apply nation combat modifiers to trained unit
            if let Some(ref mods) = self.nation_modifiers {
                if let Some(unit) = self.units.get_mut(sid) {
                    let base_hp = unit.hp as f32;
                    match unit.kind {
                        crate::units::UnitKind::Swordsman => {
                            unit.hp = (base_hp * mods.units.soldier_hp).max(1.0) as u32;
                            unit.max_hp = unit.hp;
                            unit.attack_mult = mods.units.soldier_attack;
                            unit.defense_mult = mods.units.soldier_defense;
                        }
                        crate::units::UnitKind::Bowman => {
                            unit.hp = (base_hp * mods.units.archer_hp).max(1.0) as u32;
                            unit.max_hp = unit.hp;
                            unit.attack_mult = mods.units.archer_attack;
                            unit.defense_mult = 1.0; // bowmen use attack_mult + range for balance
                            unit.attack_range_mult = mods.units.archer_range;
                        }
                        _ => {}
                    }
                }
            }
        }

        // Pre-compute which buildings have tooled settlers
        // (separate pass to avoid borrowing both buildings and units simultaneously)
        let can_produce: Vec<bool> = self
            .buildings
            .iter()
            .map(|b| b.has_settler() && b.has_tooled_settler(&self.units))
            .collect();

        // 2. Try production for all buildings (only if they have tooled settlers)
        //    Pre-compute production speeds to avoid borrow conflict
        let speeds: Vec<f32> = self.buildings.iter()
            .map(|b| self.production_speed_for(b.kind))
            .collect();
        for (i, building) in self.buildings.iter_mut().enumerate() {
            if can_produce[i] {
                if building.try_produce(&mut self.storage, speeds[i]) {
                    self.production_events += 1;
                }
            }
        }

        // 3. Collect outputs from all buildings into storage
        //    and track Toolsmith tool production in separate pass to avoid borrow conflict
        for building in self.buildings.iter_mut() {
            let collected = building.collect_output(&mut self.storage);
            self.resources_collected += collected.iter().sum::<u32>() as u64;
        }

        // 3b. Toolsmith named tool production — separate pass after output collection
        let toolsmith_count = self
            .buildings
            .iter()
            .filter(|b| b.kind == BuildingType::Toolsmith && b.is_complete())
            .count();
        if toolsmith_count > 0 {
            let needed = self.most_needed_tool().unwrap_or(0); // 0 = Hammer default
            self.add_tool(needed, toolsmith_count as u32);
        }

        // 4. Update warehouse capacity
        let warehouse_count = self
            .buildings
            .iter()
            .filter(|b| b.kind == BuildingType::Storehouse && b.is_complete())
            .count() as u32;
        // Base 200 + 100 per warehouse (recalculate from scratch)
        self.storage.capacity = 200 + warehouse_count * 100;
    }
    pub fn buildings_of_type(&self, kind: BuildingType) -> impl Iterator<Item = &Building> {
        self.buildings.iter().filter(move |b| b.kind == kind)
    }

    /// Count completed buildings of a type
    pub fn count_completed(&self, kind: BuildingType) -> usize {
        self.buildings
            .iter()
            .filter(|b| b.kind == kind && b.is_complete())
            .count()
    }

    /// Get total building count
    pub fn building_count(&self) -> usize {
        self.buildings.len()
    }
}

impl Economy {
    // ── Named Tool Storage ────────────────────────────────────────────────────

    /// Get the count of a specific tool type in storage
    pub fn get_tool_count(&self, tool_code: u8) -> u32 {
        self.tool_storage[tool_code as usize]
    }

    /// Add a specific tool to storage
    pub fn add_tool(&mut self, tool_code: u8, count: u32) {
        self.tool_storage[tool_code as usize] = self.tool_storage[tool_code as usize].saturating_add(count);
    }

    /// Try to withdraw a specific tool from storage. Returns true if successful.
    pub fn withdraw_tool(&mut self, tool_code: u8) -> bool {
        if self.tool_storage[tool_code as usize] > 0 {
            self.tool_storage[tool_code as usize] -= 1;
            true
        } else {
            false
        }
    }

    /// Scan all unstaffed buildings and return the most-needed tool code.
    /// Returns None if no buildings need tools.
    pub fn most_needed_tool(&self) -> Option<u8> {
        use std::collections::HashMap;
        let mut demand: HashMap<u8, u32> = HashMap::new();
        for building in &self.buildings {
            // Skip incomplete buildings — they can't be staffed yet
            if !building.is_complete() {
                continue;
            }
            // Skip buildings that already have a tooled settler
            if building.has_tooled_settler(&self.units) {
                continue;
            }
            if let Some(tool_code) = building.required_tool {
                *demand.entry(tool_code).or_insert(0) += 1;
            }
        }
        demand.into_iter().max_by_key(|&(_, count)| count).map(|(code, _)| code)
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
    use crate::units::UnitKind;

    #[test]
    fn test_resource_type_name() {
        assert_eq!(ResourceType::Wood.name(), "Wood");
        assert_eq!(ResourceType::Boards.name(), "Boards");
        assert_eq!(ResourceType::Weapons.name(), "Weapons");
    }

    #[test]
    fn test_resource_type_is_raw() {
        assert!(ResourceType::Wood.is_raw());
        assert!(ResourceType::Iron.is_raw());
        assert!(!ResourceType::Boards.is_raw());
        assert!(!ResourceType::Tools.is_raw());
    }

    #[test]
    fn test_resource_type_from_map_resource() {
        use crate::map::Resource;
        assert_eq!(
            ResourceType::from_map_resource(Resource::Iron),
            Some(ResourceType::Iron)
        );
        assert_eq!(
            ResourceType::from_map_resource(Resource::Coal),
            Some(ResourceType::Coal)
        );
        assert_eq!(
            ResourceType::from_map_resource(Resource::Stone),
            Some(ResourceType::Stone)
        );
    }

    #[test]
    fn test_building_type_name() {
        assert_eq!(BuildingType::Castle.name(), "Castle");
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
        assert_eq!(BuildingType::Castle.production_interval(), 0);
        assert_eq!(BuildingType::Storehouse.production_interval(), 0);
    }

    #[test]
    fn test_building_requires_settler() {
        assert!(!BuildingType::Castle.requires_settler());
        assert!(!BuildingType::Storehouse.requires_settler());
        assert!(BuildingType::Sawmill.requires_settler());
        assert!(BuildingType::Farm.requires_settler());
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
        let mut e = Economy::with_starting_resources(&[(ResourceType::Wood, 1)]);
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

        // Sawmill: 20 ticks per cycle, consumes 2 Wood → produces 1 Boards
        let mut produced = 0;
        for _ in 0..100 {
            if building.try_produce(&mut storage, 1.0) {
                produced += 1;
            }
        }
        assert!(produced > 0, "Should have produced planks");
        assert_eq!(
            building.output_buffer[ResourceType::Boards as usize],
            produced
        );
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
            if building.try_produce(&mut storage, 1.0) {
                produced += 1;
            }
        }
        assert!(produced > 0, "Should have produced grain");
        assert_eq!(
            building.output_buffer[ResourceType::Grain as usize],
            produced * 2
        );
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
            if building.try_produce(&mut storage, 1.0) {
                produced += 1;
            }
        }
        assert_eq!(produced, 0, "Should not produce without inputs");
    }

    #[test]
    fn test_economy_update() {
        let mut e = Economy::with_starting_resources(&[(ResourceType::Wood, 100)]);

        let farm_idx = e.place_building(BuildingType::Farm, 0, 0);

        // Build the farm (20 ticks), then spawn a settler
        for _ in 0..20 {
            e.update();
        }
        e.spawn_settler_for(farm_idx);

        // Run 200 more ticks — farm should produce grain now
        for _ in 0..200 {
            e.update();
        }

        // Farm should have produced some grain
        let grain: u32 = e
            .buildings
            .iter()
            .map(|b| b.output_buffer[ResourceType::Grain as usize])
            .sum();
        // Grain in buildings + collected into storage
        let total_grain = grain + e.storage.get(ResourceType::Grain);
        assert!(
            total_grain > 0,
            "Should have produced grain, got {}",
            total_grain
        );
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
        // Full chain: Lumberjack produces Wood → Sawmill converts to Boards
        let mut storage = ResourceStorage::new();
        let mut lumberjack = Building::new(BuildingType::Woodcutter, 0, 0);
        let mut sawmill = Building::new(BuildingType::Sawmill, 1, 0);

        // Complete construction
        for _ in 0..20 {
            lumberjack.tick_construction();
        }
        for _ in 0..30 {
            sawmill.tick_construction();
        }

        // Lumberjack: no inputs, produces 2 Wood every 15 ticks
        // Sawmill: 2 Wood → 1 Boards every 20 ticks
        let mut total_wood = 0u32;
        let mut total_planks = 0u32;

        for _tick in 0..300 {
            // Lumberjack produces
            if lumberjack.try_produce(&mut storage, 1.0) {
                total_wood += 2;
            }
            // Move wood from lumberjack output to sawmill input
            let lj_output = lumberjack.output_buffer[ResourceType::Wood as usize];
            if lj_output > 0 {
                sawmill.input_buffer[ResourceType::Wood as usize] += lj_output;
                lumberjack.output_buffer[ResourceType::Wood as usize] = 0;
            }
            // Sawmill produces
            if sawmill.try_produce(&mut storage, 1.0) {
                total_planks += 1;
            }
        }

        assert!(total_wood > 0, "Lumberjack should produce wood");
        assert!(total_planks > 0, "Sawmill should produce planks");
    }

    #[test]
    fn test_building_inputs_outputs() {
        // Verify all buildings with inputs have matching outputs
        for kind in [
            BuildingType::Sawmill,
            BuildingType::Toolsmith,
            BuildingType::Weaponsmith,
            BuildingType::Brewery,
            BuildingType::Bakery,
            BuildingType::Butcher,
            BuildingType::Mill,
            BuildingType::Smelter,
            BuildingType::Mint,
        ] {
            let inputs = kind.inputs();
            let outputs = kind.outputs();
            assert!(!inputs.is_empty(), "{} should have inputs", kind.name());
            assert!(!outputs.is_empty(), "{} should have outputs", kind.name());
            assert!(
                kind.production_interval() > 0,
                "{} should have production interval",
                kind.name()
            );
        }
    }

    #[test]
    fn test_building_required_tool() {
        assert_eq!(BuildingType::Stonecutter.required_tool(), Some("Pickaxe"));
        assert_eq!(BuildingType::Mine.required_tool(), Some("Pickaxe"));
        assert_eq!(BuildingType::Sawmill.required_tool(), Some("Saw"));
        assert_eq!(BuildingType::Toolsmith.required_tool(), Some("Hammer"));
        assert_eq!(BuildingType::Weaponsmith.required_tool(), Some("Hammer"));
        assert_eq!(BuildingType::Woodcutter.required_tool(), Some("Axe"));
        assert_eq!(BuildingType::Fisherman.required_tool(), Some("Fishing Rod"));
        assert_eq!(BuildingType::Waterworks.required_tool(), Some("Bucket"));
        assert_eq!(BuildingType::Smelter.required_tool(), Some("Hammer"));
        assert_eq!(BuildingType::Mint.required_tool(), Some("Hammer"));
        assert_eq!(BuildingType::Butcher.required_tool(), Some("Cleaver"));
        assert_eq!(BuildingType::Brewery.required_tool(), Some("Rolling Pin"));
        assert_eq!(BuildingType::Bakery.required_tool(), Some("Rolling Pin"));
        assert_eq!(BuildingType::Mill.required_tool(), Some("Rolling Pin"));
        // Buildings without tool requirements
        assert_eq!(BuildingType::Castle.required_tool(), None);
        assert_eq!(BuildingType::Farm.required_tool(), None);
        assert_eq!(BuildingType::Storehouse.required_tool(), None);
        assert_eq!(BuildingType::Barracks.required_tool(), None);
    }

    #[test]
    fn test_new_resource_types() {
        assert_eq!(ResourceType::Water.name(), "Water");
        assert_eq!(ResourceType::IronIngots.name(), "Iron Ingots");
        assert!(ResourceType::Water.is_raw());
        assert!(ResourceType::IronIngots.is_processed());
    }

    #[test]
    fn test_new_building_types_count() {
        assert_eq!(BuildingType::all_names().len(), 18);
        assert!(BuildingType::all_names().contains(&"Waterworks"));
        assert!(BuildingType::all_names().contains(&"Smelter"));
        assert!(BuildingType::all_names().contains(&"Barracks"));
        assert!(BuildingType::all_names().contains(&"Mint"));
    }

    #[test]
    fn test_waterworks_production() {
        let mut storage = ResourceStorage::new();
        let mut building = Building::new(BuildingType::Waterworks, 0, 0);

        // Complete construction (25 ticks)
        for _ in 0..25 {
            building.tick_construction();
        }
        assert!(building.is_complete());

        // Waterworks: no inputs, produces 1 Water every 30 ticks
        let mut produced = 0;
        for _ in 0..100 {
            if building.try_produce(&mut storage, 1.0) {
                produced += 1;
            }
        }
        assert!(produced > 0, "Waterworks should produce water");
        assert_eq!(
            building.output_buffer[ResourceType::Water as usize],
            produced
        );
    }

    #[test]
    fn test_smelter_production_chain() {
        let mut storage = ResourceStorage::new();
        let mut mine = Building::new(BuildingType::Mine, 0, 0);
        let mut smelter = Building::new(BuildingType::Smelter, 1, 0);

        // Complete construction (extra tick for float safety)
        for _ in 0..41 {
            mine.tick_construction();
        }
        for _ in 0..36 {
            smelter.tick_construction();
        }
        assert!(mine.is_complete());
        assert!(smelter.is_complete());

        // Mine: no inputs, 1 Iron every 40 ticks
        // Smelter: 1 Iron + 1 Coal → 1 IronIngot every 30 ticks
        // Set up coal manually since mine only produces iron
        smelter.input_buffer[ResourceType::Coal as usize] = 10;

        for _ in 0..200 {
            if mine.try_produce(&mut storage, 1.0) {
                let iron = mine.output_buffer[ResourceType::Iron as usize];
                if iron > 0 {
                    smelter.input_buffer[ResourceType::Iron as usize] += iron;
                    mine.output_buffer[ResourceType::Iron as usize] = 0;
                }
            }
            smelter.try_produce(&mut storage, 1.0);
        }

        let ingots = smelter.output_buffer[ResourceType::IronIngots as usize];
        assert!(
            ingots > 0,
            "Smelter should produce iron ingots, got {}",
            ingots
        );
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

    #[test]
    fn test_tool_code_from_name() {
        assert_eq!(tool_code_from_name("Hammer"), Some(0));
        assert_eq!(tool_code_from_name("Pickaxe"), Some(1));
        assert_eq!(tool_code_from_name("Axe"), Some(2));
        assert_eq!(tool_code_from_name("Saw"), Some(3));
        assert_eq!(tool_code_from_name("Fishing Rod"), Some(4));
        assert_eq!(tool_code_from_name("Rolling Pin"), Some(5));
        assert_eq!(tool_code_from_name("Cleaver"), Some(6));
        assert_eq!(tool_code_from_name("Bucket"), Some(7));
        assert_eq!(tool_code_from_name("Nonexistent"), None);
        assert_eq!(tool_code_from_name(""), None);
    }

    #[test]
    fn test_building_required_tool_field() {
        // Buildings that need tools
        let sawmill = Building::new(BuildingType::Sawmill, 0, 0);
        assert_eq!(sawmill.required_tool, Some(3)); // Saw = 3

        let mine = Building::new(BuildingType::Mine, 0, 0);
        assert_eq!(mine.required_tool, Some(1)); // Pickaxe = 1

        let waterworks = Building::new(BuildingType::Waterworks, 0, 0);
        assert_eq!(waterworks.required_tool, Some(7)); // Bucket = 7

        // Buildings that don't need tools
        let farm = Building::new(BuildingType::Farm, 0, 0);
        assert_eq!(farm.required_tool, None);

        let castle = Building::new(BuildingType::Castle, 0, 0);
        assert_eq!(castle.required_tool, None);
    }

    #[test]
    fn test_has_tooled_settler_no_tool_required() {
        let farm = Building::new(BuildingType::Farm, 0, 0);
        let units = UnitManager::new();
        // Buildings without tool requirements always return true
        assert!(farm.has_tooled_settler(&units));
    }

    #[test]
    fn test_has_tooled_settler_without_tool() {
        let sawmill = Building::new(BuildingType::Sawmill, 0, 0);
        let units = UnitManager::new();
        // Sawmill requires a Saw but no settler assigned → false
        assert!(!sawmill.has_tooled_settler(&units));
    }

    #[test]
    fn test_mint_production_chain() {
        // Mint: 1 Gold + 1 Coal → 1 Coins every 30 ticks
        let mut storage = ResourceStorage::new();
        let mut mint = Building::new(BuildingType::Mint, 0, 0);

        // Complete construction (35 ticks, +1 for float safety)
        for _ in 0..36 {
            mint.tick_construction();
        }
        assert!(mint.is_complete());

        // Set up inputs (gold + coal)
        mint.input_buffer[ResourceType::Gold as usize] = 10;
        mint.input_buffer[ResourceType::Coal as usize] = 10;

        let mut produced = 0;
        for _ in 0..200 {
            if mint.try_produce(&mut storage, 1.0) {
                produced += 1;
            }
        }
        assert!(produced > 0, "Mint should produce coins");
        assert_eq!(
            mint.output_buffer[ResourceType::Coins as usize],
            produced
        );
    }

    #[test]
    fn test_economy_update_tool_requirement_blocks_production() {
        // A Sawmill with a settler but no tool should NOT produce
        let mut e = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        let _sawmill_idx = e.place_building(BuildingType::Sawmill, 0, 0);
        // Complete construction
        for _ in 0..31 {
            e.update();
        }

        // Assign a settler without a tool
        let settler_id = e.units.spawn(UnitKind::Settler, 0.5, 0.5);
        e.buildings[0].assign_settler(settler_id);
        e.units.get_mut(settler_id).unwrap().carried_tool = None;

        // Run production ticks
        let prev_events = e.production_events;
        for _ in 0..100 {
            e.update();
        }

        // No production should have occurred (settler has no tool)
        assert_eq!(
            e.production_events, prev_events,
            "Sawmill should not produce without a tool-carrying settler"
        );
    }

    #[test]
    fn test_economy_update_tool_requirement_allows_production() {
        // A Sawmill with a tool-carrying settler should produce
        let mut e = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        let _sawmill_idx = e.place_building(BuildingType::Sawmill, 0, 0);
        // Complete construction
        for _ in 0..31 {
            e.update();
        }

        // Assign a settler WITH a Saw (tool code 3)
        let settler_id = e.units.spawn(UnitKind::Settler, 0.5, 0.5);
        e.buildings[0].assign_settler(settler_id);
        e.units.get_mut(settler_id).unwrap().carried_tool = Some(3); // Saw

        // Run production ticks — need to feed wood to the sawmill input
        e.buildings[0].input_buffer[ResourceType::Wood as usize] = 10;

        let prev_events = e.production_events;
        for _ in 0..100 {
            e.update();
        }

        // Production should have occurred
        assert!(
            e.production_events > prev_events,
            "Sawmill should produce with a tool-carrying settler"
        );
    }

    #[test]
    fn test_auto_assign_settlers_tool_pickup() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        // Add a pickaxe to tool storage
        economy.add_tool(1, 1); // Pickaxe (tool code 1)

        // Place a Stonecutter (requires pickaxe, does NOT produce tools)
        let sc_idx = economy.place_building(BuildingType::Stonecutter, 2, 2);
        for _ in 0..31 {
            economy.update();
        }
        assert!(economy.buildings[sc_idx].is_complete());

        // Spawn an idle settler
        economy.units.spawn(UnitKind::Settler, 0.5, 0.5);

        // Run auto_assign_settlers
        let assigned = economy.auto_assign_settlers();
        assert_eq!(assigned, 1, "Should assign settler to stonecutter");

        // Check settler carries the pickaxe
        let settler = economy.units.get(1).unwrap();
        assert_eq!(settler.assigned_building, Some(sc_idx));
        assert_eq!(
            settler.carried_tool,
            Some(1),
            "Settler should carry pickaxe"
        );

        // Tool storage should be empty now (pickaxe was withdrawn)
        assert_eq!(
            economy.get_tool_count(1),
            0,
            "Pickaxe should be withdrawn (got {})",
            economy.get_tool_count(1)
        );
    }

    #[test]
    fn test_castle_recruits_settlers() {
        // Castle should spawn a settler every CASTLE_SETTLER_INTERVAL ticks
        let mut e = Economy::new();
        e.place_building(BuildingType::Castle, 5, 5);

        // Castle has build_time=0, so is_complete immediately
        assert!(
            e.buildings[0].is_complete(),
            "Castle should be complete immediately"
        );

        let initial_settler_count = e.units.settler_count();

        // Run exactly CASTLE_SETTLER_INTERVAL ticks
        for _ in 0..CASTLE_SETTLER_INTERVAL {
            e.update();
        }

        let count_after = e.units.settler_count();
        assert_eq!(
            count_after,
            initial_settler_count + 1,
            "Castle should recruit one settler after {} ticks; got {} settlers (was {})",
            CASTLE_SETTLER_INTERVAL,
            count_after,
            initial_settler_count
        );

        // Run another CASTLE_SETTLER_INTERVAL ticks
        for _ in 0..CASTLE_SETTLER_INTERVAL {
            e.update();
        }

        let count_after2 = e.units.settler_count();
        assert_eq!(
            count_after2,
            initial_settler_count + 2,
            "Castle should recruit two settlers after {} ticks",
            CASTLE_SETTLER_INTERVAL * 2
        );
    }

    #[test]
    fn test_castle_no_recruitment_during_construction() {
        let mut e = Economy::new();
        e.place_building(BuildingType::Castle, 5, 5);
        assert_eq!(e.buildings[0].recruitment_timer, 0);

        // Run only 10 ticks — not enough for a settler
        for _ in 0..10 {
            e.update();
        }
        assert_eq!(
            e.units.settler_count(),
            0,
            "No settlers should be recruited before CASTLE_SETTLER_INTERVAL ticks"
        );
    }

    #[test]
    fn test_multiple_castles_recruit() {
        // Multiple Castles should each recruit settlers independently
        let mut e = Economy::new();
        e.place_building(BuildingType::Castle, 0, 0);
        e.place_building(BuildingType::Castle, 5, 5);
        e.place_building(BuildingType::Castle, 10, 10);

        // Run CASTLE_SETTLER_INTERVAL ticks
        for _ in 0..CASTLE_SETTLER_INTERVAL {
            e.update();
        }

        // Each Castle should have produced one settler
        assert_eq!(
            e.units.settler_count(),
            3,
            "Three Castles should recruit three settlers after {} ticks",
            CASTLE_SETTLER_INTERVAL
        );

        // Run another interval
        for _ in 0..CASTLE_SETTLER_INTERVAL {
            e.update();
        }

        assert_eq!(
            e.units.settler_count(),
            6,
            "Three Castles should recruit six settlers after {} ticks",
            CASTLE_SETTLER_INTERVAL * 2
        );
    }

    // ── Tool Storage Tests ────────────────────────────────────────────────

    #[test]
    fn test_tool_storage_add_withdraw() {
        let mut e = Economy::new();
        assert_eq!(e.get_tool_count(0), 0); // Hammer = 0
        assert_eq!(e.get_tool_count(1), 0); // Pickaxe = 1

        e.add_tool(0, 3); // Add 3 Hammers
        assert_eq!(e.get_tool_count(0), 3);

        assert!(e.withdraw_tool(0)); // Withdraw one
        assert_eq!(e.get_tool_count(0), 2);

        assert!(e.withdraw_tool(0));
        assert_eq!(e.get_tool_count(0), 1);

        assert!(e.withdraw_tool(0));
        assert_eq!(e.get_tool_count(0), 0);

        // Can't withdraw from empty
        assert!(!e.withdraw_tool(0));
        assert_eq!(e.get_tool_count(0), 0);
    }

    #[test]
    fn test_tool_storage_multiple_types() {
        let mut e = Economy::new();
        e.add_tool(0, 5); // 5 Hammers
        e.add_tool(3, 2); // 2 Saws
        assert_eq!(e.get_tool_count(0), 5);
        assert_eq!(e.get_tool_count(3), 2);
        // Unused tool types stay at 0
        assert_eq!(e.get_tool_count(10), 0); // Scythe
    }

    #[test]
    fn test_tool_code_to_name() {
        assert_eq!(tool_code_to_name(0), "Hammer");
        assert_eq!(tool_code_to_name(1), "Pickaxe");
        assert_eq!(tool_code_to_name(4), "Fishing Rod");
        assert_eq!(tool_code_to_name(10), "Bow");
        assert_eq!(tool_code_to_name(11), "Unknown");
        assert_eq!(tool_code_to_name(255), "Unknown");
    }

    #[test]
    fn test_tool_code_from_name_all_11() {
        // Verify all 11 tool types map round-trip
        for code in 0..=10u8 {
            let name = tool_code_to_name(code);
            let back = tool_code_from_name(name);
            assert_eq!(back, Some(code), "Round-trip failed for code {code} → '{name}'");
        }
    }

    #[test]
    fn test_most_needed_tool_empty() {
        let e = Economy::new();
        // No buildings → no tools needed
        assert_eq!(e.most_needed_tool(), None);
    }

    #[test]
    fn test_most_needed_tool_demand() {
        let mut e = Economy::new();
        // Place a Sawmill (requires Saw = tool code 3)
        let idx = e.place_building(BuildingType::Sawmill, 5, 5);
        // Building is placed but not complete yet (build_time > 0)
        // So most_needed_tool should still return None (no completed unstaffed buildings)
        assert_eq!(e.most_needed_tool(), None);
        // Advance construction to completion
        let build_ticks = BuildingType::Sawmill.build_time();
        for _ in 0..build_ticks + 1 {
            e.buildings[idx].tick_construction();
        }
        assert!(e.buildings[idx].is_complete());
        // Now the completed building needs a tooled settler
        assert_eq!(e.most_needed_tool(), Some(3)); // Saw = 3
    }

    #[test]
    fn test_barracks_trains_swordsman() {
        // Barracks should train a swordsman every BARRACKS_TRAINING_INTERVAL ticks
        // when Weapons are available in storage.
        let mut e = Economy::new();

        // Add Weapons to storage (Weaponsmith produces these)
        e.storage.try_spend(&[]); // nop, just to have storage populated
        // We need Weapons in storage — use add_resource or similar
        // Actually, ResourceStorage only adds via add()
        e.storage.add(ResourceType::Weapons, 3);

        // Place a Barracks and fully construct it (build_time = 40)
        e.place_building(BuildingType::Barracks, 5, 5);
        for _ in 0..41 {  // build_time + 1 for float precision
            e.buildings[0].tick_construction();
        }
        assert!(e.buildings[0].is_complete(), "Barracks should be complete");

        // No swordsmen yet
        let initial_alive = e.units.alive_count();

        // Run exactly BARRACKS_TRAINING_INTERVAL ticks
        for _ in 0..BARRACKS_TRAINING_INTERVAL {
            e.update();
        }

        let count_after = e.units.alive_count();
        assert_eq!(
            count_after,
            initial_alive + 1,
            "Barracks should train one swordsman after {} ticks; got {} alive (was {})",
            BARRACKS_TRAINING_INTERVAL,
            count_after,
            initial_alive
        );

        // Weapons should be consumed (3 - 1 = 2)
        assert_eq!(
            e.storage.amounts()[ResourceType::Weapons as usize],
            2,
            "Weapons should decrease from 3 to 2 after training one swordsman"
        );

        // Run another BARRACKS_TRAINING_INTERVAL ticks — second swordsman
        for _ in 0..BARRACKS_TRAINING_INTERVAL {
            e.update();
        }

        let count_after2 = e.units.alive_count();
        assert_eq!(
            count_after2,
            initial_alive + 2,
            "Barracks should train two swordsmen after {} ticks",
            BARRACKS_TRAINING_INTERVAL * 2
        );
        assert_eq!(
            e.storage.amounts()[ResourceType::Weapons as usize],
            1,
            "Weapons should decrease from 3 to 1 after training two swordsmen"
        );
    }

    #[test]
    fn test_barracks_no_training_without_weapons() {
        // Barracks should NOT train swordsmen when no Weapons are available.
        let mut e = Economy::new();

        // Place and construct Barracks
        e.place_building(BuildingType::Barracks, 5, 5);
        for _ in 0..41 {
            e.buildings[0].tick_construction();
        }
        assert!(e.buildings[0].is_complete());

        let initial_alive = e.units.alive_count();

        // Run many ticks — no Weapons, so no training should happen
        for _ in 0..BARRACKS_TRAINING_INTERVAL * 2 {
            e.update();
        }

        assert_eq!(
            e.units.alive_count(),
            initial_alive,
            "No swordsmen should be trained without Weapons"
        );
    }

    #[test]
    fn test_barracks_no_training_during_construction() {
        // Barracks should NOT train swordsmen while under construction.
        // update() ticks both construction and recruitment.
        // Build time = 40, so first swordsman at tick 100 (40+60).
        let mut e = Economy::new();

        e.storage.add(ResourceType::Weapons, 5);
        e.place_building(BuildingType::Barracks, 5, 5);

        // Not complete yet
        assert!(!e.buildings[0].is_complete());
        let initial_alive = e.units.alive_count();

        // Run 39 ticks — just before construction completes
        for _ in 0..39 {
            e.update();
        }
        assert!(!e.buildings[0].is_complete(), "Barracks should still be under construction");

        // No swordsmen should be trained from an incomplete Barracks
        assert_eq!(
            e.units.alive_count(),
            initial_alive,
            "No swordsmen should be trained from incomplete Barracks after 39 ticks"
        );

        // Now run 1 more tick to complete construction, then BARRACKS_TRAINING_INTERVAL
        // Total: 1 + BARRACKS_TRAINING_INTERVAL = 1 + 60 = 61 more ticks
        for _ in 0..(1 + BARRACKS_TRAINING_INTERVAL) {
            e.update();
        }
        assert!(e.buildings[0].is_complete(), "Barracks should now be complete");

        // Now 1 swordsman should have been trained (after construction + interval)
        assert_eq!(
            e.units.alive_count(),
            initial_alive + 1,
            "Swordsman should be trained after construction completes + interval"
        );
    }

    #[test]
    fn test_multiple_barracks_train_swordsmen() {
        // Multiple Barracks should each train swordsmen independently.
        let mut e = Economy::new();

        e.storage.add(ResourceType::Weapons, 10);

        // Place 3 Barracks
        e.place_building(BuildingType::Barracks, 3, 3);
        e.place_building(BuildingType::Barracks, 5, 5);
        e.place_building(BuildingType::Barracks, 7, 7);

        // Fully construct all 3
        for idx in 0..3 {
            for _ in 0..41 {
                e.buildings[idx].tick_construction();
            }
            assert!(e.buildings[idx].is_complete());
        }

        let initial_alive = e.units.alive_count();

        // Run BARRACKS_TRAINING_INTERVAL ticks
        for _ in 0..BARRACKS_TRAINING_INTERVAL {
            e.update();
        }

        let count_after = e.units.alive_count();
        assert_eq!(
            count_after,
            initial_alive + 3,
            "3 Barracks should train 3 swordsmen after {} ticks; got {}",
            BARRACKS_TRAINING_INTERVAL,
            count_after
        );

        // 3 Weapons consumed
        assert_eq!(
            e.storage.amounts()[ResourceType::Weapons as usize],
            7,
            "Weapons should decrease from 10 to 7 after 3 swordsmen"
        );
    }

    #[test]
    fn test_nation_production_speed_modifier() {
        // Roman food production is 1.1x (10% faster)
        // A Farm produces Grain every 30 ticks normally
        // With Roman modifier, effective interval should be shorter
        use crate::nation::{NationModifiers, ProductionModifier, CostModifier, UnitModifier, AIPersonality};

        let mut e = Economy::new();
        let roman_mods = NationModifiers {
            production: ProductionModifier {
                food: 2.0, wood: 1.0, stone: 1.0, iron: 1.0,
                coal: 1.0, gold: 1.0, tools: 1.0, weapons: 1.0,
            },
            cost: CostModifier { economic: 1.0, military: 1.0, unique: 1.0 },
            units: UnitModifier {
                worker_speed: 1.0, worker_build_speed: 1.0,
                soldier_hp: 1.0, soldier_attack: 1.0, soldier_defense: 1.0,
                archer_hp: 1.0, archer_attack: 1.0, archer_range: 1.0,
            },
            ai: AIPersonality {
                aggression: 0.5, expansion_rate: 0.5, defense_priority: 0.5, trade_focus: 0.5,
            },
        };
        e.set_nation_modifiers(roman_mods);

        // Place and construct a Farm (no tool needed, no inputs)
        e.place_building(BuildingType::Farm, 5, 5);
        for _ in 0..41 { e.buildings[0].tick_construction(); }
        assert!(e.buildings[0].is_complete());

        // Assign a settler (no tool needed for Farm, so has_tooled_settler returns true)
        let sid = e.units.spawn(crate::units::UnitKind::Settler, 5.5, 5.5);
        e.buildings[0].assign_settler(sid);
        e.units.get_mut(sid).unwrap().assign_to(0);

        // With 2.0x speed, production should fire every ~15 ticks instead of 30
        // After 20 ticks, we should have at least 1 production event
        let mut produced = 0u64;
        for _ in 0..20 {
            e.update();
        }
        // Grain should have been produced (some number of times)
        let grain = e.storage.amounts()[ResourceType::Grain as usize];
        assert!(grain > 0, "Farm should have produced Grain with 2.0x speed modifier (got {})", grain);
    }

    #[test]
    fn test_nation_worker_speed_modifier() {
        // Maya workers are 1.15x speed — applied to settlers spawned via Castle recruitment
        use crate::nation::{AIPersonality, CostModifier, NationModifiers, ProductionModifier, UnitModifier};

        let mut e = Economy::new();
        let maya_mods = NationModifiers {
            production: ProductionModifier {
                food: 1.0, wood: 1.0, stone: 1.0, iron: 1.0,
                coal: 1.0, gold: 1.0, tools: 1.0, weapons: 1.0,
            },
            cost: CostModifier { economic: 1.0, military: 1.0, unique: 1.0 },
            units: UnitModifier {
                worker_speed: 1.15, worker_build_speed: 1.0,
                soldier_hp: 1.0, soldier_attack: 1.0, soldier_defense: 1.0,
                archer_hp: 1.0, archer_attack: 1.0, archer_range: 1.0,
            },
            ai: AIPersonality {
                aggression: 0.5, expansion_rate: 0.5, defense_priority: 0.5, trade_focus: 0.5,
            },
        };
        e.set_nation_modifiers(maya_mods);

        // Place a Castle (build_time = 0, so it's immediately complete)
        e.place_building(crate::economy::BuildingType::Castle, 5, 5);

        // Run enough ticks for Castle recruitment (CASTLE_SETTLER_INTERVAL = 50)
        for _ in 0..51 {
            e.update();
        }

        // A settler should have been spawned by the Castle with the 1.15x speed multiplier
        let settlers: Vec<u32> = e.units.alive_of_kind(crate::units::UnitKind::Settler)
            .map(|u| u.id)
            .collect();
        assert!(!settlers.is_empty(), "Castle should have recruited a settler");

        let settler = e.units.get(settlers[0]).unwrap();
        assert!(
            (settler.nation_speed_mult - 1.15).abs() < 0.01,
            "Settler should have Maya 1.15x speed mult, got {}",
            settler.nation_speed_mult
        );
    }

    #[test]
    fn test_nation_cost_modifier() {
        // Viking military buildings are 0.8x cost (20% cheaper)
        use crate::nation::{NationModifiers, ProductionModifier, CostModifier, UnitModifier, AIPersonality};

        let mut e = Economy::new();
        let viking_mods = NationModifiers {
            production: ProductionModifier {
                food: 1.0, wood: 1.0, stone: 1.0, iron: 1.0,
                coal: 1.0, gold: 1.0, tools: 1.0, weapons: 1.0,
            },
            cost: CostModifier { economic: 1.0, military: 0.5, unique: 1.0 },
            units: UnitModifier {
                worker_speed: 1.0, worker_build_speed: 1.0,
                soldier_hp: 1.0, soldier_attack: 1.0, soldier_defense: 1.0,
                archer_hp: 1.0, archer_attack: 1.0, archer_range: 1.0,
            },
            ai: AIPersonality {
                aggression: 0.5, expansion_rate: 0.5, defense_priority: 0.5, trade_focus: 0.5,
            },
        };
        e.set_nation_modifiers(viking_mods);

        // Barracks normal cost: [(Wood, 20), (Stone, 15), (IronIngots, 5)]
        // With 0.5x cost modifier: [(Wood, 10), (Stone, 8), (IronIngots, 3)]
        // We need 10 Wood, 8 Stone, 3 IronIngots (ceil of 5*0.5)
        e.storage.add(ResourceType::Wood, 10);
        e.storage.add(ResourceType::Stone, 8);
        e.storage.add(ResourceType::IronIngots, 3);

        let idx = e.try_place_building(BuildingType::Barracks, 3, 3);
        assert!(idx.is_some(), "Should be able to place Barracks with discounted costs");
    }

    #[test]
    fn test_nation_swordsman_hp_modifier() {
        // Maya swordsman has 1.1x HP (10% more)
        use crate::nation::{NationModifiers, ProductionModifier, CostModifier, UnitModifier, AIPersonality};

        let mut e = Economy::new();
        let maya_mods = NationModifiers {
            production: ProductionModifier {
                food: 1.0, wood: 1.0, stone: 1.0, iron: 1.0,
                coal: 1.0, gold: 1.0, tools: 1.0, weapons: 1.0,
            },
            cost: CostModifier { economic: 1.0, military: 1.0, unique: 1.0 },
            units: UnitModifier {
                worker_speed: 1.0, worker_build_speed: 1.0,
                soldier_hp: 1.1, soldier_attack: 1.0, soldier_defense: 1.15,
                archer_hp: 1.0, archer_attack: 1.0, archer_range: 1.0,
            },
            ai: AIPersonality {
                aggression: 0.5, expansion_rate: 0.5, defense_priority: 0.5, trade_focus: 0.5,
            },
        };
        e.set_nation_modifiers(maya_mods);

        // Place and construct a Barracks with Weapons
        e.storage.add(ResourceType::Weapons, 5);
        e.place_building(BuildingType::Barracks, 5, 5);
        for _ in 0..41 { e.buildings[0].tick_construction(); }
        assert!(e.buildings[0].is_complete());

        // Run BARRACKS_TRAINING_INTERVAL ticks to spawn a swordsman
        for _ in 0..BARRACKS_TRAINING_INTERVAL {
            e.update();
        }

        let swordsmen: Vec<u32> = e.units.alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::Swordsman)
            .map(|u| u.id)
            .collect();
        assert!(!swordsmen.is_empty(), "Should have spawned a swordsman");

        let unit = e.units.get(swordsmen[0]).unwrap();
        // Base swordsman HP = 100, Maya modifier = 1.1x → 110
        assert_eq!(unit.hp, 110, "Maya swordsman should have 110 HP (100 * 1.1)");
        assert_eq!(unit.max_hp, 110);
        assert!((unit.attack_mult - 1.0).abs() < 0.01, "Attack mult should be 1.0");
        assert!((unit.defense_mult - 1.15).abs() < 0.01, "Defense mult should be 1.15");
    }

    #[test]
    fn test_barracks_alternates_swordsman_bowman() {
        // Barracks should alternate between Swordsman and Bowman each training cycle.
        let mut e = Economy::new();
        e.storage.add(ResourceType::Weapons, 5);

        e.place_building(BuildingType::Barracks, 3, 3);
        for _ in 0..41 { e.buildings[0].tick_construction(); }
        assert!(e.buildings[0].is_complete());

        // Run 2 training cycles
        for _ in 0..(BARRACKS_TRAINING_INTERVAL * 2) {
            e.update();
        }

        // Should have 1 swordsman + 1 bowman
        let swordsmen: Vec<u32> = e.units.alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::Swordsman)
            .map(|u| u.id)
            .collect();
        let bowmen: Vec<u32> = e.units.alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::Bowman)
            .map(|u| u.id)
            .collect();

        assert_eq!(swordsmen.len(), 1, "Should have 1 swordsman after 2 cycles");
        assert_eq!(bowmen.len(), 1, "Should have 1 bowman after 2 cycles");

        // Run 2 more cycles — should get another swordsman + bowman
        e.storage.add(ResourceType::Weapons, 5);
        for _ in 0..(BARRACKS_TRAINING_INTERVAL * 2) {
            e.update();
        }

        let swordsmen2: Vec<u32> = e.units.alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::Swordsman)
            .map(|u| u.id)
            .collect();
        let bowmen2: Vec<u32> = e.units.alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::Bowman)
            .map(|u| u.id)
            .collect();

        assert_eq!(swordsmen2.len(), 2, "Should have 2 swordsmen after 4 cycles");
        assert_eq!(bowmen2.len(), 2, "Should have 2 bowmen after 4 cycles");
    }

    #[test]
    fn test_nation_bowman_archer_modifiers() {
        // Bowmen should receive archer multipliers from nation modifiers.
        use crate::nation::{NationModifiers, ProductionModifier, CostModifier, UnitModifier, AIPersonality};

        let mut e = Economy::new();
        // Viking archers have 0.9× HP, 1.0× attack, 1.0× range
        let viking_mods = NationModifiers {
            production: ProductionModifier {
                food: 1.0, wood: 1.0, stone: 1.0, iron: 1.0,
                coal: 1.0, gold: 1.0, tools: 1.0, weapons: 1.0,
            },
            cost: CostModifier {
                economic: 1.0, military: 1.0, unique: 1.0,
            },
            units: UnitModifier {
                soldier_hp: 1.0, soldier_attack: 1.0, soldier_defense: 1.0,
                archer_hp: 0.9, archer_attack: 1.1, archer_range: 1.05,
                worker_speed: 1.0, worker_build_speed: 1.0,
            },
            ai: AIPersonality {
                aggression: 0.5, expansion_rate: 0.5,
                defense_priority: 0.5, trade_focus: 0.5,
            },
        };
        e.set_nation_modifiers(viking_mods);

        // Place Barracks, construct it, add Weapons. First cycle = Swordsman, second = Bowman.
        // We need to skip the first cycle to get a Bowman.
        e.storage.add(ResourceType::Weapons, 5);
        e.place_building(BuildingType::Barracks, 5, 5);
        for _ in 0..41 { e.buildings[0].tick_construction(); }
        assert!(e.buildings[0].is_complete());

        // Run first cycle → Swordsman (ignore)
        for _ in 0..BARRACKS_TRAINING_INTERVAL {
            e.update();
        }

        // Run second cycle → Bowman
        for _ in 0..BARRACKS_TRAINING_INTERVAL {
            e.update();
        }

        let bowmen: Vec<u32> = e.units.alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::Bowman)
            .map(|u| u.id)
            .collect();
        assert!(!bowmen.is_empty(), "Should have spawned a bowman");

        let unit = e.units.get(bowmen[0]).unwrap();
        // Base bowman HP = 60, Viking archer_hp = 0.9x → floor(54) = 54
        assert_eq!(unit.hp, 54, "Viking bowman should have 54 HP (60 * 0.9)");
        assert_eq!(unit.max_hp, 54);
        assert!((unit.attack_mult - 1.1).abs() < 0.01, "Attack mult should be 1.1");
        assert!((unit.defense_mult - 1.0).abs() < 0.01, "Defense mult should be 1.0");
        assert!((unit.attack_range_mult - 1.05).abs() < 0.01, "Range mult should be 1.05");
    }
}
