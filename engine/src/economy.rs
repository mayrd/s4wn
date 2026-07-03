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
use crate::nation::{NationModifiers, NationType, ResourceCategory};
use crate::units::{UnitKind, UnitManager};

// ── Resource Types ──────────────────────────────────────────────────────────

/// All resource types in the game.
/// These extend the map's `Resource` enum (which represents raw deposits)
/// with processed goods created by buildings.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum ResourceType {
    // Raw resources (mined/harvested from map deposits)
    Wood = 0,     // from forests
    Stone = 1,    // from stone deposits
    IronOre = 2,  // from iron ore
    Coal = 3,     // from coal deposits
    Gold = 4,     // from gold deposits
    Sulfur = 5,   // from sulfur deposits
    Fish = 6,     // from fishing
    Grain = 7,    // from farming
    Meat = 8,     // from hunting
    Water = 9,    // from waterworks
    Honey = 12,   // from apiary

    // Processed goods (produced by buildings)
    Planks = 16,     // Wood → Planks (sawmill)
    Tools = 17,      // IronOre + Coal → Tools (toolsmith)
    Weapons = 18,    // IronOre + Coal + Tools → Weapons (weaponsmith)
    Bread = 20,      // Flour + Water → Bread (bakery)
    Flour = 22,      // Grain → Flour (mill)
    IronIngots = 23, // IronOre + Coal → Iron Ingots (smelter)
    Mead = 27,       // Honey + Water → Mead (mead maker)

    /// Wine — produced at Temples, Wine Press
    Wine = 28,
}

impl ResourceType {
    /// Total number of distinct resource types
    pub const COUNT: usize = 29; // max discriminant (Wine=28) + 1

    /// Returns the numeric discriminant (0–28) for this resource type.
    /// This is the efficient integer representation for JSON/JS communication.
    #[inline]
    pub fn discriminant(self) -> u8 {
        self as u8
    }

    /// All valid ResourceType discriminants (sorted).
    /// Covers 0-9 (raw), 12 (Honey), 16-18 (processed), 20 (Bread), 22-23 (Flour/IronIngots), 27-28 (Mead/Wine).
    pub const VALID_RESOURCE_DISCRIMINANTS: [u8; 19] = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 17, 18, 20, 22, 23, 27, 28,
    ];

    /// Whether this is a raw resource (harvested from the map)
    pub fn is_raw(self) -> bool {
        (self as u8) < 16
    }

    /// Whether this is a processed good
    pub fn is_processed(self) -> bool {
        (self as u8) >= 16
    }

    /// Display names for all resource types, indexed by discriminant.
    /// Gaps (invalid discriminants) contain empty strings.
    #[cfg(test)]
    pub const RESOURCE_NAMES: [&'static str; Self::COUNT] = [
        "Wood",      // 0
        "Stone",     // 1
        "IronOre",   // 2
        "Coal",      // 3
        "Gold",      // 4
        "Sulfur",    // 5
        "Fish",      // 6
        "Grain",     // 7
        "Meat",      // 8
        "Water",     // 9
        "",          // 10 (gap)
        "",          // 11 (gap)
        "Honey",     // 12
        "",          // 13 (gap)
        "",          // 14 (gap)
        "",          // 15 (gap)
        "Planks",    // 16
        "Tools",     // 17
        "Weapons",   // 18
        "",          // 19 (gap)
        "Bread",     // 20
        "",          // 21 (gap)
        "Flour",     // 22
        "IronIngots",// 23
        "",          // 24 (gap)
        "",          // 25 (gap)
        "",          // 26 (gap)
        "Mead",      // 27
        "Wine",      // 28
    ];


    /// Convert from map Resource to economy ResourceType
    pub fn from_map_resource(r: Resource) -> Option<ResourceType> {
        match r {
            Resource::Iron => Some(ResourceType::IronOre),
            Resource::Coal => Some(ResourceType::Coal),
            Resource::Gold => Some(ResourceType::Gold),
            Resource::Stone => Some(ResourceType::Stone),
            Resource::Sulfur => Some(ResourceType::Sulfur),
            Resource::Fish => Some(ResourceType::Fish),
            Resource::Game => Some(ResourceType::Meat),
Resource::Grain => Some(ResourceType::Grain),
        }
    }

    /// Convert a u8 discriminant to a ResourceType.
    /// Returns None for invalid discriminant values (gaps in the enum).
    pub fn from_u8(v: u8) -> Option<Self> {
        match v {
            0 => Some(ResourceType::Wood),
            1 => Some(ResourceType::Stone),
            2 => Some(ResourceType::IronOre),
            3 => Some(ResourceType::Coal),
            4 => Some(ResourceType::Gold),
            5 => Some(ResourceType::Sulfur),
            6 => Some(ResourceType::Fish),
            7 => Some(ResourceType::Grain),
            8 => Some(ResourceType::Meat),
            9 => Some(ResourceType::Water),
            12 => Some(ResourceType::Honey),
            16 => Some(ResourceType::Planks),
            17 => Some(ResourceType::Tools),
            18 => Some(ResourceType::Weapons),
            20 => Some(ResourceType::Bread),
            22 => Some(ResourceType::Flour),
            23 => Some(ResourceType::IronIngots),
            27 => Some(ResourceType::Mead),
            28 => Some(ResourceType::Wine),
            _ => None,
        }
    }

    /// Reconstruct a ResourceType from its numeric discriminant.
    /// Returns None for invalid/gap values (not in VALID_RESOURCE_DISCRIMINANTS).
    pub fn from_discriminant(d: u8) -> Option<Self> {
        if Self::VALID_RESOURCE_DISCRIMINANTS.binary_search(&d).is_ok() {
            Some(unsafe { core::mem::transmute::<u8, ResourceType>(d) })
        } else {
            None
        }
    }

    /// Resource group for UI categorization (#47).
    pub fn group_name(self) -> &'static str {
        match self {
            ResourceType::Wood | ResourceType::Stone | ResourceType::Planks => "Construction",
            ResourceType::Water
            | ResourceType::Grain
            | ResourceType::Fish
            | ResourceType::Meat
            | ResourceType::Bread
            | ResourceType::Flour
            | ResourceType::Honey
            | ResourceType::Mead
            | ResourceType::Wine => "Food",
            ResourceType::IronOre
            | ResourceType::Coal
            | ResourceType::Gold
            | ResourceType::Sulfur => "Metal",
            ResourceType::Tools | ResourceType::Weapons | ResourceType::IronIngots => {
                "Metal Products"
            }
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
    /// Sawmill — converts Wood → Planks
    Sawmill = 1,
    /// Stonecutter — produces Stone (requires settler + stone deposit nearby)
    Stonecutter = 2,
    /// Mine — produces Iron/Coal/Gold (requires deposit)
    Mine = 3,
    /// Toolsmith — Iron + Coal → Tools
    Toolsmith = 4,
    /// Weaponsmith — Iron + Coal + Tools → Weapons
    Weaponsmith = 5,
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
    /// Guard Tower — extends territory, garrisons soldiers
    GuardTower = 18,
    /// Fortress — larger territory expansion, stronger garrison
    Fortress = 19,
    /// Siege Workshop — produces Catapults and Ballistas
    SiegeWorkshop = 20,
    /// Shipyard — builds transport ships
    Shipyard = 21,
    /// Road Layer — builds paved roads for speed bonus
    RoadLayer = 22,
    /// Apiary — produces Honey
    Apiary = 27,
    /// Mead Maker — converts Honey + Water → Mead
    MeadMaker = 28,

    /// Temple of Bacchus — produces Wine from divine inspiration (Roman unique)
    TempleOfBacchus = 31,
    /// Colosseum — military morale building, extends territory (Roman unique)
    Colosseum = 32,
    /// Sanctuary of Minerva — special Roman building
    SanctuaryOfMinerva = 33,
    /// Sanctuary of Vulcan — special Roman building
    SanctuaryOfVulcan = 34,

    // ── Viking Unique Buildings ──────────────────────────────────────────────
    /// Mead Hall — produces Mead from Honey+Water (Viking unique)
    MeadHall = 35,
    /// Sanctuary of Odin — special Viking building
    SanctuaryOfOdin = 36,
    /// Sanctuary of Thor — special Viking building
    SanctuaryOfThor = 37,
    /// Sanctuary of Freya — special Viking building
    SanctuaryOfFreya = 38,
    /// Runestone — cultural monument, extends territory (Viking unique)
    Runestone = 39,

    // ── Maya Unique Buildings ────────────────────────────────────────────────
    /// Temple of Chac — rain god temple, produces Water (Maya unique)
    TempleOfChac = 40,
    /// Agave Farm — produces Agave (Maya unique)
    AgaveFarm = 41,
    /// Distillery — converts Agave → Pulque (Maya unique)
    Distillery = 42,
    /// Sanctuary of Kukulkan — feathered serpent god (Maya unique)
    SanctuaryOfKukulkan = 43,
    /// Sanctuary of Quetzalcoatl — wind god (Maya unique)
    SanctuaryOfQuetzalcoatl = 44,
    /// Sanctuary of Huitzilopochtli — war god (Maya unique)
    SanctuaryOfHuitzilopochtli = 45,
    /// Observatory — stargazing, extends territory (Maya unique)
    Observatory = 46,

    // ── Trojan Unique Buildings ────────────────────────────────────────────
    /// Oracle of Apollo — divine oracle, produces Wine (Trojan unique)
    OracleOfApollo = 47,
    /// Sanctuary of Artemis — hunting goddess (Trojan unique)
    SanctuaryOfArtemis = 50,
    /// Sanctuary of Poseidon — sea god (Trojan unique)
    SanctuaryOfPoseidon = 51,
    /// Sanctuary of Apollo — sun god (Trojan unique)
    SanctuaryOfApollo = 52,
    /// Amphitheater — cultural venue, extends territory (Trojan unique)
    Amphitheater = 53,

    // ── Dark Tribe Unique Buildings ────────────────────────────────────────────
    /// Dark Temple — spiritual center, produces Wine (DarkTribe unique)
    DarkTemple = 54,
    /// Dark Garden — grows dark crops (DarkTribe unique)
    DarkGarden = 55,
    /// Mushroom Farm — produces mushrooms/food (DarkTribe unique)
    MushroomFarm = 56,
    /// Sanctuary of Morbus — disease god (DarkTribe unique)
    SanctuaryOfMorbus = 57,
    /// Sanctuary of Pestilence — pestilence god (DarkTribe unique)
    SanctuaryOfPestilence = 58,
    /// Dark Fortress — military stronghold (DarkTribe unique)
    DarkFortress = 59,
    /// Demon Gate — spawns dark units (DarkTribe unique)
    DemonGate = 60,
    GoldMine = 61, CoalMine = 62, IronOreMine = 63, SulfurMine = 64,
    GoldSmelter = 65, IronSmelter = 66, Slaughterhouse = 67,
    OilPress = 68, PowderMill = 69, WeaponFoundry = 70,
    Forester = 71, Healer = 72, GoatRanch = 73, PigRanch = 74,
    GooseRanch = 75, DonkeyRanch = 76, TrojanFarm = 77,
    Marketplace = 78, LandingDock = 79, Vineyard = 80,
    StorageYard = 81, SmallResidence = 82, MediumResidence = 83,
    LargeResidence = 84, SmallTemple = 85, LargeTemple = 86,
}

impl BuildingType {
    /// Valid BuildingType discriminants (77 total — gaps in the enum).
    /// Sorted for binary_search. Used by from_discriminant() and tests.
    pub const VALID_DISCRIMINANTS: [u8; 77] = [
        0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        18, 19, 20, 21, 22, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 39,
        40, 41, 42, 43, 44, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56,
        57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
        72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
    ];

    /// Total number of discriminant slots (max discriminant + 1).
    pub const COUNT: usize = 87;

    /// Display names for all building types, indexed by discriminant.
    /// Gaps (invalid discriminants) contain empty strings.
    #[cfg(test)]
    pub const BUILDING_NAMES: [&'static str; Self::COUNT] = [
        "Castle",                     // 0
        "Sawmill",                    // 1
        "Stonecutter",                // 2
        "Mine",                       // 3
        "Toolsmith",                  // 4
        "Weaponsmith",                // 5
        "",                           // 6 (gap)
        "Bakery",                     // 7
        "Butcher",                    // 8
        "Mill",                       // 9
        "Farm",                       // 10
        "Fisherman",                  // 11
        "Woodcutter",                 // 12
        "Storehouse",                 // 13
        "Waterworks",                 // 14
        "Smelter",                    // 15
        "Barracks",                   // 16
        "",                           // 17 (gap)
        "Guard Tower",                // 18
        "Fortress",                   // 19
        "Siege Workshop",             // 20
        "Shipyard",                   // 21
        "Road Layer",                 // 22
        "",                           // 23 (gap)
        "",                           // 24 (gap)
        "",                           // 25 (gap)
        "",                           // 26 (gap)
        "Apiary",                     // 27
        "Mead Maker",                 // 28
        "",                           // 29 (gap)
        "",                           // 30 (gap)
        "Temple of Bacchus",          // 31
        "Colosseum",                  // 32
        "Sanctuary of Minerva",       // 33
        "Sanctuary of Vulcan",        // 34
        "Mead Hall",                  // 35
        "Sanctuary of Odin",          // 36
        "Sanctuary of Thor",          // 37
        "Sanctuary of Freya",         // 38
        "Runestone",                  // 39
        "Temple of Chac",             // 40
        "Agave Farm",                 // 41
        "Distillery",                 // 42
        "Sanctuary of Kukulkan",      // 43
        "Sanctuary of Quetzalcoatl",  // 44
        "Sanctuary of Huitzilopochtli", // 45
        "Observatory",                // 46
        "Oracle of Apollo",           // 47
        "",                           // 48 (gap)
        "",                           // 49 (gap)
        "Sanctuary of Artemis",       // 50
        "Sanctuary of Poseidon",      // 51
        "Sanctuary of Apollo",        // 52
        "Amphitheater",               // 53
        "Dark Temple",                // 54
        "Dark Garden",                // 55
        "Mushroom Farm",              // 56
        "Sanctuary of Morbus",        // 57
        "Sanctuary of Pestilence",    // 58
        "Dark Fortress",              // 59
        "Demon Gate",                 // 60
        "Gold Mine",                  // 61
        "Coal Mine",                  // 62
        "Iron Ore Mine",              // 63
        "Sulfur Mine",                // 64
        "Gold Smelter",               // 65
        "Iron Smelter",               // 66
        "Slaughterhouse",             // 67
        "Oil Press",                  // 68
        "Powder Mill",                // 69
        "Weapon Foundry",             // 70
        "Forester",                   // 71
        "Healer",                     // 72
        "Goat Ranch",                 // 73
        "Pig Ranch",                  // 74
        "Goose Ranch",                // 75
        "Donkey Ranch",               // 76
        "Trojan Farm",                // 77
        "Marketplace",                // 78
        "Landing Dock",               // 79
        "Vineyard",                   // 80
        "Storage Yard",               // 81
        "Small Residence",            // 82
        "Medium Residence",           // 83
        "Large Residence",            // 84
        "Small Temple",               // 85
        "Large Temple",               // 86
    ];

    /// Returns the numeric discriminant (0–86) for this building type.
    /// This is the efficient integer representation for JSON/JS communication.
    pub fn discriminant(self) -> u8 {
        self as u8
    }

    /// Reconstruct a BuildingType from its numeric discriminant.
    /// Returns None for invalid/gap values (not in VALID_DISCRIMINANTS).
    /// # Safety
    /// Only transmutes values known to be valid via binary search of VALID_DISCRIMINANTS.
    pub fn from_discriminant(d: u8) -> Option<Self> {
        if Self::VALID_DISCRIMINANTS.binary_search(&d).is_ok() {
            // SAFETY: d has been verified against the known-valid discriminant list
            Some(unsafe { core::mem::transmute::<u8, BuildingType>(d) })
        } else {
            None
        }
    }

    /// Look up a building type by name (FNV-1a hash → discriminant lookup).
    #[cfg(test)]
    pub fn from_name(name: &str) -> Option<Self> {
        const fn fnv1a_64(s: &[u8]) -> u64 {
            let mut h: u64 = 0xcbf29ce484222325;
            let mut i = 0;
            while i < s.len() {
                h ^= s[i] as u64;
                h = h.wrapping_mul(0x100000001b3);
                i += 1;
            }
            h
        }

        /// Sorted (hash, discriminant) pairs for binary search.
        const LOOKUP: &[(u64, u8)] = &[
            (0x0024f990708ec717, 71),
            (0x003c1dbab657aad3, 79),
            (0x04dc16aea8ff5276, 3),
            (0x04e31baea90579a3, 9),
            (0x07f343c4534e03aa, 14),
            (0x096d26ddf77f9ee4, 8),
            (0x0c4de2f645e3a11b, 37),
            (0x0cdd8b1d1a958684, 11),
            (0x0e35614a8b676efd, 2),
            (0x0ed544eef3710fe3, 65),
            (0x143b2bff2bcf343d, 20),
            (0x16396f53fe03fe23, 12),
            (0x1889925a4bc65bd9, 0),
            (0x19464c8d57f23fa7, 46),
            (0x19e44685183274f9, 10),
            (0x208ed129e3c53da4, 82),
            (0x218dbaaa56aadabc, 1),
            (0x224edea26ab36dc2, 55),
            (0x250549d2bcdc6c6b, 19),
            (0x26f0e3350258c250, 43),
            (0x2a2c576067064b5f, 15),
            (0x2c272e5217f7dd47, 64),
            (0x2e942fd376212c29, 56),
            (0x2f3845d85c8b82b0, 58),
            (0x332a058bece5bea2, 4),
            (0x3b6f40eb776efcbb, 51),
            (0x3e24882dba18b76e, 67),
            (0x43a089d4f31af1df, 21),
            (0x45edb66a6cf1d0ab, 41),
            (0x47cd2baa6ffa6967, 76),
            (0x4be22a85e14b1eed, 62),
            (0x4c8008b32366010e, 54),
            (0x5255b03e612eed1d, 59),
            (0x58bbb0110bc0b6e4, 73),
            (0x5a89c62cc78917ee, 13),
            (0x5f2b077005a962a1, 50),
            (0x64fdf5db299eeb5d, 34),
            (0x70672ee0fa8041a6, 81),
            (0x72484573bf6fa2a6, 63),
            (0x76b3ae7ade1e1191, 44),
            (0x7a7c040fcd7a364c, 31),
            (0x800929a50f97335b, 27),
            (0x887b5952a366c41a, 22),
            (0x93005ba1cfcdeba4, 5),
            (0x947f21967d65c480, 78),
            (0x95d1d03e63a84132, 57),
            (0x9661f79118789974, 70),
            (0xaf801e7e2ec7209f, 18),
            (0xb0fc163d9e06c049, 52),
            (0xb136ea11eb87b00c, 84),
            (0xb34cc479b7ec2e82, 75),
            (0xb4934df83575c764, 40),
            (0xb8610b31ee4da8f2, 36),
            (0xbb2397c4180ec718, 72),
            (0xbb837a893890bd12, 61),
            (0xbca04836ea53d4cb, 66),
            (0xc1a1f1c513bab636, 83),
            (0xc2a4f58cb6e4a854, 33),
            (0xc54b3a0e4701e5e1, 80),
            (0xc58d61957bdfb19e, 16),
            (0xca35f9b63c7c59bf, 53),
            (0xcb4641d055919711, 32),
            (0xcf5bc9f52b88ba6f, 47),
            (0xcfa5d06e841da9df, 38),
            (0xd5cc7202d1e3787d, 85),
            (0xd713a4e62257a46a, 69),
            (0xdc57532fa354d1ed, 74),
            (0xdcf4b5bc555f930d, 45),
            (0xdd9fa2d994a78095, 86),
            (0xdda004d4fa1ade02, 39),
            (0xe310760915c7154f, 60),
            (0xe4513d9410f97abd, 7),
            (0xe908caee02607222, 42),
            (0xea56fa21c298839a, 28),
            (0xea910f72b9962a71, 35),
            (0xecaa86620d998de3, 77),
            (0xf918371fa706d6e0, 68),
        ];

        let hash = fnv1a_64(name.as_bytes());
        match LOOKUP.binary_search_by_key(&hash, |&(h, _)| h) {
            Ok(idx) => {
                let disc = LOOKUP[idx].1;
                // SAFETY: discriminants are valid (verified at compile time by the const array)
                Some(unsafe { core::mem::transmute::<u8, BuildingType>(disc) })
            }
            Err(_) => None,
        }
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
                (ResourceType::IronOre, 2),
            ],
            BuildingType::Weaponsmith => &[
                (ResourceType::Wood, 5),
                (ResourceType::Stone, 5),
                (ResourceType::Tools, 3),
            ],
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
            BuildingType::GuardTower => &[(ResourceType::Stone, 8), (ResourceType::Planks, 6)],
            BuildingType::Fortress => &[(ResourceType::Stone, 20), (ResourceType::Planks, 12), (ResourceType::IronOre, 8)],
            BuildingType::SiegeWorkshop => &[(ResourceType::Wood, 10), (ResourceType::Stone, 8), (ResourceType::Tools, 3)],
            BuildingType::Shipyard => &[(ResourceType::Wood, 10), (ResourceType::Stone, 6), (ResourceType::Planks, 6)],
            BuildingType::RoadLayer => &[(ResourceType::Wood, 4), (ResourceType::Stone, 2)],
            BuildingType::TempleOfChac => &[(ResourceType::Stone, 20), (ResourceType::Gold, 5)],
            BuildingType::AgaveFarm => &[(ResourceType::Wood, 3)],
            BuildingType::Distillery => &[(ResourceType::Wood, 5), (ResourceType::Stone, 3)],
            BuildingType::SanctuaryOfKukulkan => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::SanctuaryOfQuetzalcoatl => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::SanctuaryOfHuitzilopochtli => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::Observatory => &[(ResourceType::Stone, 25), (ResourceType::Gold, 10)],
            BuildingType::OracleOfApollo => &[(ResourceType::Stone, 20), (ResourceType::Gold, 10)],
            BuildingType::SanctuaryOfArtemis => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::SanctuaryOfPoseidon => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::SanctuaryOfApollo => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::Amphitheater => &[(ResourceType::Stone, 30), (ResourceType::Gold, 15)],
            BuildingType::DarkTemple => &[(ResourceType::Stone, 20), (ResourceType::Gold, 10)],
            BuildingType::DarkGarden => &[(ResourceType::Wood, 5), (ResourceType::Stone, 3)],
            BuildingType::MushroomFarm => &[(ResourceType::Wood, 8), (ResourceType::Stone, 4)],
            BuildingType::SanctuaryOfMorbus => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::SanctuaryOfPestilence => &[(ResourceType::Stone, 15), (ResourceType::Gold, 5)],
            BuildingType::DarkFortress => &[(ResourceType::Stone, 25), (ResourceType::Planks, 15), (ResourceType::IronOre, 10)],
            BuildingType::DemonGate => &[(ResourceType::Stone, 30), (ResourceType::IronIngots, 15), (ResourceType::Gold, 20)],
            _ => &[], // planned buildings — no cost yet
        }
    }

    /// Input resources consumed per production cycle (empty if no inputs)
    pub fn inputs(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Sawmill => &[(ResourceType::Wood, 2)],
            BuildingType::Toolsmith => &[(ResourceType::IronOre, 1), (ResourceType::Coal, 1)],
            BuildingType::Weaponsmith => &[
                (ResourceType::IronOre, 1),
                (ResourceType::Coal, 1),
                (ResourceType::Tools, 1),
            ],
            BuildingType::Bakery => &[(ResourceType::Grain, 2)],
            BuildingType::Butcher => &[],
            BuildingType::Mill => &[(ResourceType::Grain, 3)],
            BuildingType::Smelter => &[(ResourceType::IronOre, 1), (ResourceType::Coal, 1)],
            BuildingType::SiegeWorkshop => &[(ResourceType::IronIngots, 2), (ResourceType::Wood, 3)],
            BuildingType::Shipyard => &[(ResourceType::Wood, 3), (ResourceType::Planks, 2)],
            _ => &[], // raw producers and storage have no inputs
        }
    }

    /// Output resources produced per production cycle
    pub fn outputs(self) -> &'static [(ResourceType, u32)] {
        match self {
            BuildingType::Sawmill => &[(ResourceType::Planks, 1)],
            BuildingType::Stonecutter => &[(ResourceType::Stone, 1)],
            BuildingType::Mine => &[(ResourceType::IronOre, 1)], // simplified: mine produces iron
            BuildingType::Toolsmith => &[(ResourceType::Tools, 1)],
            BuildingType::Weaponsmith => &[(ResourceType::Weapons, 1)],
            BuildingType::Bakery => &[(ResourceType::Bread, 1)],
            BuildingType::Butcher => &[(ResourceType::Meat, 2)],
            BuildingType::Mill => &[(ResourceType::Flour, 1)],
            BuildingType::Farm => &[(ResourceType::Grain, 2)],
            BuildingType::Fisherman => &[(ResourceType::Fish, 1)],
            BuildingType::Woodcutter => &[(ResourceType::Wood, 2)],
            BuildingType::Waterworks => &[(ResourceType::Water, 1)],
            BuildingType::Smelter => &[(ResourceType::IronIngots, 1)],
            BuildingType::SiegeWorkshop => &[(ResourceType::Weapons, 1)], // Catapults/Ballistas = siege weapons
            BuildingType::Shipyard => &[(ResourceType::Weapons, 1)], // Transport ships (placeholder)
            BuildingType::TempleOfBacchus => &[(ResourceType::Wine, 1)], // Divine wine production
            BuildingType::TempleOfChac => &[(ResourceType::Water, 2)], // Rain god temple produces Water
            BuildingType::OracleOfApollo => &[(ResourceType::Wine, 1)], // Divine wine production (Trojan)
            BuildingType::DarkTemple => &[(ResourceType::Wine, 1)], // Dark divine wine production (DarkTribe)
            BuildingType::MushroomFarm => &[(ResourceType::Grain, 2)], // Mushroom harvest (DarkTribe)
            BuildingType::DemonGate => &[(ResourceType::Weapons, 1)],
            BuildingType::GoldMine => &[(ResourceType::Gold, 2)],
            BuildingType::CoalMine => &[(ResourceType::Coal, 2)],
            BuildingType::IronOreMine => &[(ResourceType::IronOre, 2)],
            BuildingType::SulfurMine => &[(ResourceType::Sulfur, 2)],
            BuildingType::GoldSmelter => &[(ResourceType::Gold, 1)],
            BuildingType::IronSmelter => &[(ResourceType::IronIngots, 1)],
            BuildingType::Slaughterhouse => &[(ResourceType::Meat, 1)],
            BuildingType::OilPress => &[(ResourceType::Water, 1)],
            BuildingType::PowderMill => &[(ResourceType::Sulfur, 1)],
            BuildingType::WeaponFoundry => &[(ResourceType::Weapons, 1)],
            BuildingType::Forester => &[(ResourceType::Wood, 1)],
            BuildingType::Healer => &[],
            BuildingType::GoatRanch => &[(ResourceType::Meat, 2)],
            BuildingType::PigRanch => &[(ResourceType::Meat, 2)],
            BuildingType::GooseRanch => &[(ResourceType::Meat, 1)],
            BuildingType::DonkeyRanch => &[(ResourceType::Meat, 1)],
            BuildingType::TrojanFarm => &[(ResourceType::Grain, 2)],
            BuildingType::Marketplace => &[],
            BuildingType::LandingDock => &[],
            BuildingType::Vineyard => &[(ResourceType::Grain, 2)],
            BuildingType::StorageYard => &[],
            BuildingType::SmallResidence => &[],
            BuildingType::MediumResidence => &[],
            BuildingType::LargeResidence => &[],
            BuildingType::SmallTemple => &[],
            BuildingType::LargeTemple => &[],
            _ => &[], // Barracks, Castle, Storehouse, Fortress, RoadLayer, Colosseum, Sanctuaries produce nothing
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
            BuildingType::Bakery => 20,      // 2 seconds
            BuildingType::Butcher => 25,     // 2.5 seconds
            BuildingType::Mill => 25,        // 2.5 seconds
            BuildingType::Farm => 20,        // 2 seconds
            BuildingType::Fisherman => 20,   // 2 seconds
            BuildingType::Woodcutter => 15,  // 1.5 seconds
            BuildingType::Waterworks => 30,  // 3 seconds
            BuildingType::Smelter => 30,     // 3 seconds
            BuildingType::GuardTower => 0,   // territory building, no production
            BuildingType::Fortress => 0,         // territory building, no production
            BuildingType::SiegeWorkshop => 60,    // 6 seconds — slow, expensive siege weapons
            BuildingType::Shipyard => 50,         // 5 seconds — ships take time
            BuildingType::RoadLayer => 25,        // 2.5 seconds — efficient road builder
            BuildingType::TempleOfBacchus => 40,  // 4 seconds — divine inspiration
            BuildingType::TempleOfChac => 35,              // 3.5 seconds — rain cycle
            BuildingType::AgaveFarm => 25,                  // 2.5 seconds — agave growth
            BuildingType::Distillery => 35,                  // 3.5 seconds — fermentation
            BuildingType::OracleOfApollo => 40,                   // 4 seconds — divine inspiration (Trojan)
            BuildingType::DarkTemple => 40,                       // 4 seconds — dark divine inspiration (DarkTribe)
            BuildingType::MushroomFarm => 25,                     // 2.5 seconds — mushroom growth
            BuildingType::DemonGate => 50,
            BuildingType::GoldMine => 22,
            BuildingType::CoalMine => 20,
            BuildingType::IronOreMine => 22,
            BuildingType::SulfurMine => 20,
            BuildingType::GoldSmelter => 18,
            BuildingType::IronSmelter => 18,
            BuildingType::Slaughterhouse => 15,
            BuildingType::OilPress => 15,
            BuildingType::PowderMill => 18,
            BuildingType::WeaponFoundry => 20,
            BuildingType::Forester => 12,
            BuildingType::Healer => 18,
            BuildingType::GoatRanch => 15,
            BuildingType::PigRanch => 15,
            BuildingType::GooseRanch => 15,
            BuildingType::DonkeyRanch => 15,
            BuildingType::TrojanFarm => 15,
            BuildingType::Marketplace => 20,
            BuildingType::LandingDock => 20,
            BuildingType::Vineyard => 15,
            BuildingType::StorageYard => 12,
            BuildingType::SmallResidence => 12,
            BuildingType::MediumResidence => 15,
            BuildingType::LargeResidence => 20,
            BuildingType::SmallTemple => 20,
            BuildingType::LargeTemple => 30,
            _ => 0,                          // Barracks, Castle, Storehouse, Colosseum, Sanctuaries don't produce
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
            BuildingType::Toolsmith | BuildingType::Bakery => 35,
            BuildingType::Butcher | BuildingType::Mill => 30,
            BuildingType::Weaponsmith => 50,
            BuildingType::Waterworks => 25,
            BuildingType::Smelter => 35,
            BuildingType::Barracks => 40,
            BuildingType::GuardTower => 40,
            BuildingType::Fortress => 80,
            BuildingType::SiegeWorkshop => 60,
            BuildingType::Shipyard => 50,
            BuildingType::RoadLayer => 30,
            BuildingType::DarkTemple => 50,
            BuildingType::DarkGarden => 25,
            BuildingType::MushroomFarm => 30,
            BuildingType::SanctuaryOfMorbus => 45,
            BuildingType::SanctuaryOfPestilence => 45,
            BuildingType::DarkFortress => 80,
            BuildingType::DemonGate => 60,
            _ => 0, // planned buildings — no build time yet
        }
    }

    /// The tool a settler must carry to work at this building.
    /// Returns None for buildings that don't require a tool.
    /// The tool code a settler must work with at this building.
    /// Returns None for buildings that don't require a tool.
    /// Tool codes: 0=Hammer, 1=Pickaxe, 2=Axe, 3=Saw, 4=Fishing Rod, 5=Rolling Pin, 6=Cleaver, 7=Bucket, 8=Dagger, 9=Shovel, 10=Bow
    pub fn required_tool(self) -> Option<u8> {
        match self {
            BuildingType::Stonecutter | BuildingType::Mine => Some(1), // Pickaxe
            BuildingType::Sawmill => Some(3), // Saw
            BuildingType::Toolsmith | BuildingType::Weaponsmith => Some(0), // Hammer
            BuildingType::Bakery | BuildingType::Mill => Some(5), // Rolling Pin
            BuildingType::Butcher => Some(6), // Cleaver
            BuildingType::Fisherman => Some(4), // Fishing Rod
            BuildingType::Woodcutter => Some(2), // Axe
            BuildingType::Waterworks => Some(7), // Bucket
            BuildingType::Smelter => Some(0), // Hammer
            BuildingType::GuardTower => Some(0), // Hammer
            BuildingType::Fortress => Some(0), // Hammer
            BuildingType::SiegeWorkshop => Some(0), // Hammer
            BuildingType::Shipyard => Some(3), // Saw
            BuildingType::RoadLayer => None,
            BuildingType::TempleOfChac => Some(7), // Bucket — Water gathering
            BuildingType::AgaveFarm => Some(9),          // Shovel — Agave planting
            BuildingType::Distillery => Some(7),         // Bucket — Fermentation vessel
            BuildingType::DarkTemple => Some(7),             // Bucket — Ritual vessel (DarkTribe)
            BuildingType::DarkGarden => Some(9),             // Shovel — Dark garden planting (DarkTribe)
            BuildingType::MushroomFarm => Some(9),           // Shovel — Mushroom planting (DarkTribe)
            BuildingType::DarkFortress => Some(0),           // Hammer — Construction (DarkTribe)
            BuildingType::DemonGate => Some(0),              // Hammer — Construction (DarkTribe)
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
            | BuildingType::Smelter | BuildingType::Toolsmith
            | BuildingType::Castle | BuildingType::Storehouse => {
                BuildingCategory::Economic
            }
            // Military buildings
            BuildingType::Weaponsmith | BuildingType::Barracks | BuildingType::Mine
            | BuildingType::GuardTower | BuildingType::Fortress | BuildingType::SiegeWorkshop
            | BuildingType::Shipyard => {
                BuildingCategory::Military
            }
            BuildingType::RoadLayer => {
                BuildingCategory::Economic
            }
            // Roman unique buildings
            BuildingType::TempleOfBacchus
            | BuildingType::Colosseum
            | BuildingType::SanctuaryOfMinerva
            | BuildingType::SanctuaryOfVulcan
            // Viking unique buildings
            | BuildingType::MeadHall
            | BuildingType::SanctuaryOfOdin
            | BuildingType::SanctuaryOfThor
            | BuildingType::SanctuaryOfFreya
            | BuildingType::Runestone
            // Maya unique buildings
            | BuildingType::TempleOfChac
            | BuildingType::AgaveFarm
            | BuildingType::Distillery
            | BuildingType::SanctuaryOfKukulkan
            | BuildingType::SanctuaryOfQuetzalcoatl
            | BuildingType::SanctuaryOfHuitzilopochtli
            | BuildingType::Observatory
            // Trojan unique buildings
            | BuildingType::OracleOfApollo
            | BuildingType::SanctuaryOfArtemis
            | BuildingType::SanctuaryOfPoseidon
            | BuildingType::SanctuaryOfApollo
            | BuildingType::Amphitheater
            // DarkTribe unique buildings
            | BuildingType::DarkTemple
            | BuildingType::DarkGarden
            | BuildingType::MushroomFarm
            | BuildingType::SanctuaryOfMorbus
            | BuildingType::SanctuaryOfPestilence
            | BuildingType::DarkFortress
            | BuildingType::DemonGate => BuildingCategory::Unique,
            _ => BuildingCategory::Economic, // planned buildings
        }
    }

    /// If this building is nation-locked, return the required NationType.
    /// Common buildings return None (available to all nations).
    pub fn nation_for_building(self) -> Option<NationType> {
        match self {
            BuildingType::TempleOfBacchus
            | BuildingType::Colosseum
            | BuildingType::SanctuaryOfMinerva
            | BuildingType::SanctuaryOfVulcan => Some(NationType::Roman),
            BuildingType::MeadHall
            | BuildingType::SanctuaryOfOdin
            | BuildingType::SanctuaryOfThor
            | BuildingType::SanctuaryOfFreya
            | BuildingType::Runestone => Some(NationType::Viking),
            BuildingType::TempleOfChac
            | BuildingType::AgaveFarm
            | BuildingType::Distillery
            | BuildingType::SanctuaryOfKukulkan
            | BuildingType::SanctuaryOfQuetzalcoatl
            | BuildingType::SanctuaryOfHuitzilopochtli
            | BuildingType::Observatory => Some(NationType::Maya),
            BuildingType::OracleOfApollo
            | BuildingType::SanctuaryOfArtemis
            | BuildingType::SanctuaryOfPoseidon
            | BuildingType::SanctuaryOfApollo
            | BuildingType::Amphitheater => Some(NationType::Trojan),
            BuildingType::DarkTemple
            | BuildingType::DarkGarden
            | BuildingType::MushroomFarm
            | BuildingType::SanctuaryOfMorbus
            | BuildingType::SanctuaryOfPestilence
            | BuildingType::DarkFortress
            | BuildingType::DemonGate => Some(NationType::DarkTribe),
            _ => None,
        }
    }

    /// Maximum number of soldiers this building can garrison.
    /// GuardTower=1, Fortress=3, Castle=6, Barracks=0 (trains but doesn't garrison).
    pub fn garrison_capacity(self) -> u32 {
        match self {
            BuildingType::GuardTower => 1,
            BuildingType::Fortress | BuildingType::DarkFortress => 3,
            BuildingType::Castle => 6,
            BuildingType::Colosseum | BuildingType::Amphitheater => 2,
            BuildingType::Runestone => 1,
            BuildingType::Observatory => 1,
            _ => 0,
        }
    }

    /// Maximum hit points for this building type.
    /// Castle, Fortress, and DarkFortress are the toughest; light economic buildings are fragile.
    pub fn max_hp(self) -> u32 {
        match self {
            BuildingType::Castle => 500,
            BuildingType::Fortress | BuildingType::DarkFortress => 500,
            BuildingType::GuardTower => 300,
            BuildingType::Barracks => 250,
            BuildingType::SiegeWorkshop => 250,
            BuildingType::DemonGate => 350,
            BuildingType::Storehouse => 200,
            BuildingType::Colosseum | BuildingType::Amphitheater => 300,
            BuildingType::TempleOfBacchus | BuildingType::SanctuaryOfMinerva
            | BuildingType::SanctuaryOfVulcan => 200,
            BuildingType::MeadHall | BuildingType::SanctuaryOfOdin
            | BuildingType::SanctuaryOfThor | BuildingType::SanctuaryOfFreya
            | BuildingType::Runestone => 200,
            BuildingType::TempleOfChac | BuildingType::SanctuaryOfKukulkan
            | BuildingType::SanctuaryOfQuetzalcoatl | BuildingType::SanctuaryOfHuitzilopochtli
            | BuildingType::Observatory => 200,
            BuildingType::OracleOfApollo | BuildingType::SanctuaryOfArtemis
            | BuildingType::SanctuaryOfPoseidon | BuildingType::SanctuaryOfApollo => 200,
            BuildingType::DarkTemple | BuildingType::SanctuaryOfMorbus
            | BuildingType::SanctuaryOfPestilence => 200,
            BuildingType::Mine | BuildingType::Toolsmith | BuildingType::Weaponsmith
            | BuildingType::Waterworks | BuildingType::Smelter => 150,
            BuildingType::Stonecutter | BuildingType::Sawmill | BuildingType::Mill
            | BuildingType::Bakery | BuildingType::Butcher => 120,
            BuildingType::Farm | BuildingType::Fisherman | BuildingType::Woodcutter => 100,
            BuildingType::Apiary | BuildingType::MeadMaker => 100,
            BuildingType::DarkGarden | BuildingType::MushroomFarm => 100,
            BuildingType::Shipyard => 200,
            BuildingType::RoadLayer => 80,
            BuildingType::AgaveFarm => 100,
            BuildingType::Distillery => 120,
            _ => 150,
        }
    }
}

/// Convert a tool name string to its ToolType discriminant (u8).
/// None if the name doesn't map to a known tool.
#[cfg(test)]
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
#[cfg(test)]
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
    /// Owner player ID (0 = player 1, 1 = player 2, etc.)
    pub owner_id: u8,
    /// Rally point — units trained at this building auto-move here. None = no rally point set.
    pub rally_point: Option<(usize, usize)>,
    /// Destruction animation timer (seconds remaining). When Some(t), building is being destroyed.
    /// None = building is not being destroyed.
    pub destruction_timer: Option<f32>,
    /// Current hit points. When 0, the building starts destruction.
    pub hp: u32,
    /// Maximum hit points (set from BuildingType::max_hp()).
    pub max_hp: u32,
    /// Garrisoned unit IDs (soldiers stationed inside for defense).
    pub garrison: Vec<u32>,
    /// Maximum number of soldiers this building can garrison.
    pub max_garrison: u32,
}

impl Building {
    /// Create a new building at the given position
    pub fn new(kind: BuildingType, x: usize, y: usize) -> Self {
        let max_settlers = if kind.requires_settler() { 1 } else { 0 };
        let required_tool = kind.required_tool();
        // Buildings with 0 build time start immediately complete (Castle, Storehouse)
        let start_construction = if kind.build_time() == 0 { 1.0 } else { 0.0 };
        let max_hp = kind.max_hp();
        let max_garrison = kind.garrison_capacity();
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
            owner_id: 0,
            rally_point: None,
            destruction_timer: None,
            hp: max_hp,
            max_hp,
            garrison: Vec::new(),
            max_garrison,
        }
    }

    /// Whether the building has at least one settler assigned
    pub fn has_settler(&self) -> bool {
        !self.assigned_settlers.is_empty() || !self.kind.requires_settler()
    }

    /// Whether the building has at least one garrisoned soldier.
    pub fn is_garrisoned(&self) -> bool {
        !self.garrison.is_empty()
    }

    /// Number of garrisoned soldiers.
    pub fn garrison_count(&self) -> usize {
        self.garrison.len()
    }

    /// Whether the building can accept more garrisoned soldiers.
    pub fn can_garrison(&self) -> bool {
        (self.garrison.len() as u32) < self.max_garrison
    }

    /// Add a unit to the garrison. Returns true if successful.
    pub fn garrison_unit(&mut self, unit_id: u32) -> bool {
        if self.can_garrison() {
            self.garrison.push(unit_id);
            true
        } else {
            false
        }
    }

    /// Remove a unit from the garrison. Returns true if the unit was found and removed.
    pub fn ungarrison_unit(&mut self, unit_id: u32) -> bool {
        if let Some(pos) = self.garrison.iter().position(|&id| id == unit_id) {
            self.garrison.remove(pos);
            true
        } else {
            false
        }
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


    /// Apply damage to this building. If HP reaches 0, starts the destruction animation.
    /// Returns the remaining HP after damage.
    pub fn take_damage(&mut self, amount: u32) -> u32 {
        self.hp = self.hp.saturating_sub(amount);
        if self.hp == 0 {
            self.start_destruction(1.5);
        }
        self.hp
    }

    /// Start the destruction animation for this building.
    /// Sets the destruction timer to the given duration in seconds.
    pub fn start_destruction(&mut self, duration_secs: f32) {
        self.destruction_timer = Some(duration_secs);
        self.active = false;
    }

    /// Tick the destruction timer by `dt` seconds.
    /// Returns true if the destruction animation just completed this tick.
    /// Returns false if the building is not being destroyed or the animation is still playing.
    pub fn tick_destruction(&mut self, dt: f32) -> bool {
        if let Some(remaining) = self.destruction_timer {
            let new_val = remaining - dt;
            if new_val <= 0.0 {
                self.destruction_timer = None;
                return true; /* destruction complete */
            } else {
                self.destruction_timer = Some(new_val);
            }
        }
        false
    }

    /// Returns the destruction animation progress (0.0 = just started, 1.0 = about to finish).
    /// Returns None if the building is not being destroyed.
    pub fn destruction_progress(&self) -> Option<f32> {
        self.destruction_timer.map(|remaining| {
            let total = remaining.max(0.0) + 0.001; /* avoid div by zero */
            1.0 - (remaining / total)
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

    /// Advance construction by one tick.
    /// `speed_mult` applies nation build speed modifiers (1.0 = normal).
    /// Returns true if construction completed this tick.
    pub fn tick_construction(&mut self, speed_mult: f32) -> bool {
        if !self.is_complete() {
            let build_ticks = self.kind.build_time();
            if build_ticks > 0 {
                self.construction += speed_mult / build_ticks as f32;
                if self.construction >= 1.0 {
                    self.construction = 1.0;
                    return true;
                }
            }
        }
        false
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
        for (i, item) in self.output_buffer.iter().enumerate() {
            if *item > 0 {
                collected[i] = *item;
            }
        }
        self.output_buffer = [0u32; ResourceType::COUNT];
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
        for (i, amount) in amounts.iter().enumerate() {
            if *amount > 0 {
                self.amounts[i] = self.amounts[i]
                    .saturating_add(*amount)
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
    /// Construction completions this tick (drained each frame for sound effects)
    pub construction_completions: u32,
    /// Resource production events this tick (drained each frame for sound effects)
    pub resource_pickups: u32,
    /// Named tool storage — tracks how many of each ToolType are in the storehouse.
    /// Indexed by ToolType discriminant (0=Hammer, 1=Pickaxe, ..., 10=Scythe).
    pub tool_storage: [u32; 12],
    /// Nation modifiers applied to production costs and speeds (None = unset)
    pub nation_modifiers: Option<NationModifiers>,
    /// The nation this economy belongs to (None = unset / spectator)
    pub player_nation: Option<NationType>,
    /// Reference to the map for pathfinding (set after economy creation)
    pub map: Option<crate::map::Map>,
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
            construction_completions: 0,
            resource_pickups: 0,
            tool_storage: [0u32; 12],
            nation_modifiers: None,
            player_nation: None,
            map: None,
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

    /// Set the map reference for pathfinding (must be called before using rally points).
    pub fn set_map(&mut self, map: crate::map::Map) {
        self.map = Some(map);
    }

    /// Set the rally point for a building at the given index.
    /// Returns true if the building exists and the rally point was set.
    pub fn set_building_rally_point(&mut self, building_index: usize, x: usize, y: usize) -> bool {
        if let Some(building) = self.buildings.get_mut(building_index) {
            building.rally_point = Some((x, y));
            true
        } else {
            false
        }
    }

    /// Clear the rally point for a building at the given index.
    /// Returns true if the building existed.
    pub fn clear_building_rally_point(&mut self, building_index: usize) -> bool {
        if let Some(building) = self.buildings.get_mut(building_index) {
            building.rally_point = None;
            true
        } else {
            false
        }
    }

    /// Get the rally point for a building at the given index.
    /// Returns Some((x, y)) if the building exists and has a rally point, None otherwise.
    pub fn get_building_rally_point(&self, building_index: usize) -> Option<(usize, usize)> {
        self.buildings.get(building_index).and_then(|b| b.rally_point)
    }

    /// Tick destruction timers for all buildings.
    /// Returns a Vec of (building_index, x, y) for buildings whose destruction animation completed this tick.
    pub fn tick_destructions(&mut self, dt: f32) -> Vec<(usize, usize, usize)> {
        let mut destroyed = Vec::new();
        for (i, b) in self.buildings.iter_mut().enumerate() {
            if b.tick_destruction(dt) {
                destroyed.push((i, b.x, b.y));
            }
        }
        // Remove destroyed buildings in reverse index order to preserve indices
        let mut indices: Vec<usize> = destroyed.iter().map(|(i, _, _)| *i).collect();
        indices.sort_unstable();
        indices.dedup();
        for &i in indices.iter().rev() {
            if i < self.buildings.len() {
                self.buildings.remove(i);
            }
        }
        destroyed
    }

    /// Start the destruction animation for a building at the given index.
    /// Returns true if the building exists and destruction was started.
    pub fn start_building_destruction(&mut self, building_index: usize, duration_secs: f32) -> bool {
        if let Some(b) = self.buildings.get_mut(building_index) {
            b.start_destruction(duration_secs);
            true
        } else {
            false
        }
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

    /// Set the player nation for this economy.
    /// Used for nation-gated building placement.
    pub fn set_player_nation(&mut self, nation: NationType) {
        self.player_nation = Some(nation);
    }

    /// Check if a building type is available for the player's nation.
    /// Returns true if the building is common (not nation-locked) or if it
    /// belongs to the player's current nation.
    pub fn is_building_available(&self, kind: BuildingType) -> bool {
        if let Some(required) = kind.nation_for_building() {
            // Nation-locked building: check player's nation
            self.player_nation == Some(required)
        } else {
            // Common building: available to all
            true
        }
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

    /// Get the build speed multiplier from nation modifiers (default 1.0).
    fn build_speed(&self) -> f32 {
        if let Some(ref mods) = self.nation_modifiers {
            mods.units.worker_build_speed
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

    /// Try to place a building, checking if we can afford it AND if the tile
    /// is within the given player's territory.
    ///
    /// Territory rules:
    /// - The tile must be within `player_id`'s territory (or neutral).
    /// - The tile must be buildable terrain (grass, desert, or forest).
    /// - The player must be able to afford the building (with nation cost modifiers).
    ///
    /// Returns the building index if successful.
    pub fn try_place_building_checked(
        &mut self,
        kind: BuildingType,
        x: usize,
        y: usize,
        player_id: u8,
        map: &crate::map::Map,
    ) -> Option<usize> {
        // Check terrain buildability
        if let Some(tile) = map.get(x, y) {
            if !tile.terrain.is_buildable() {
                return None;
            }
        } else {
            return None; // out of bounds
        }
        // Check territory: tile must be owned by this player (not neutral, not enemy)
        if map.get_territory(x, y) != Some(player_id) {
            return None;
        }
        // Check tile isn't already occupied by another building
        if self.buildings.iter().any(|b| b.x == x && b.y == y) {
            return None;
        }
        // Check nation gating: building must be available for player's nation
        if !self.is_building_available(kind) {
            return None;
        }
        // Check building-specific terrain/resource requirements
        // Waterworks requires adjacent water (river/lake)
        if kind == BuildingType::Waterworks && !map.has_adjacent_water(x, y) {
            return None;
        }
        // Stonecutter requires adjacent Stone resource deposit
        if kind == BuildingType::Stonecutter && !map.has_adjacent_resource(x, y, crate::map::Resource::Stone) {
            return None;
        }
        // Fisherman requires adjacent Fish resource deposit
        if kind == BuildingType::Fisherman && !map.has_adjacent_resource(x, y, crate::map::Resource::Fish) {
            return None;
        }
        // Woodcutter requires adjacent Forest terrain
        if kind == BuildingType::Woodcutter && !map.has_adjacent_terrain(x, y, crate::map::Terrain::Forest) {
            return None;
        }
        // Mine requires any adjacent resource deposit (not just adjacent — can be the tile itself)
        // Check self-tile for resource deposit
        let has_self_resource = map.get(x, y).and_then(|t| t.resource).is_some();
        if kind == BuildingType::Mine && !has_self_resource {
            return None;
        }
        // Forester requires adjacent Forest tiles (to plant/manage nearby woodlands)
        if kind == BuildingType::Forester && !map.has_adjacent_terrain(x, y, crate::map::Terrain::Forest) {
            return None;
        }
        // Sawmill requires adjacent Forest — processes logs from nearby woodlands
        if kind == BuildingType::Sawmill && !map.has_adjacent_terrain(x, y, crate::map::Terrain::Forest) {
            return None;
        }
        // Marketplace requires Grass terrain — flat, accessible land for trade caravans
        if kind == BuildingType::Marketplace
            && map.get(x, y).map(|t| t.terrain != crate::map::Terrain::Grass).unwrap_or(true)
        {
            return None;
        }
        // Farm (Grain Farm) requires Grass terrain — crops need fertile soil
        if kind == BuildingType::Farm
            && map.get(x, y).map(|t| t.terrain != crate::map::Terrain::Grass).unwrap_or(true)
        {
            return None;
        }
        // Check affordability
        self.try_place_building(kind, x, y)
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
        // 1. Tick construction for all buildings (with nation build speed modifier)
        let build_speed = self.build_speed();
        let mut completions: u32 = 0;
        for building in self.buildings.iter_mut() {
            if building.tick_construction(build_speed) {
                completions += 1;
            }
        }
        self.construction_completions = completions;

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
            // Rally point: auto-move trained unit to the building's rally point
            // Find the building that spawned this unit by position
            if let Some(bidx) = self.buildings.iter().position(|b| {
                b.kind == BuildingType::Barracks
                    && (b.x as f32 + 0.5 - bx).abs() < 0.1
                    && (b.y as f32 + 0.5 - by).abs() < 0.1
            }) {
                if let Some((rpx, rpy)) = self.buildings[bidx].rally_point {
                    use crate::pathfinding::Pathfinder;
                    if let Some(ref map) = self.map {
                        let from = (bx as usize, by as usize);
                        if let Some(path) = Pathfinder::find_path(map, from, (rpx, rpy)) {
                            if let Some(unit) = self.units.get_mut(sid) {
                                unit.move_along(path);
                            }
                        }
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
        let prev_collected = self.resources_collected;
        for (i, building) in self.buildings.iter_mut().enumerate() {
            if can_produce[i]
                && building.try_produce(&mut self.storage, speeds[i]) {
                    self.production_events += 1;
                }
        }

        // 3. Collect outputs from all buildings into storage
        //    and track Toolsmith tool production in separate pass to avoid borrow conflict
        for building in self.buildings.iter_mut() {
            let collected = building.collect_output(&mut self.storage);
            self.resources_collected += collected.iter().sum::<u32>() as u64;
        }
        // Count new resource pickups this tick (for sound triggers)
        let newly_collected = (self.resources_collected - prev_collected) as u32;
        self.resource_pickups = newly_collected;

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

        // 5. Building auto-repair: idle settlers near damaged buildings restore HP
        self.repair_buildings();

        // 6. Barracks auto-promotion: ranked soldiers -> SquadLeader
        self.promote_ranked_soldiers();

        // 7. SquadLeader combat aura: nearby allies get +15% attack damage
        self.apply_squad_leader_auras();

        // 8. Garrison morale: combat units near garrisoned military buildings get +5% per building
        self.apply_garrison_morale();
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

    /// Find the nearest completed Storehouse or Castle to the given position.
    /// Returns the building index if one exists.
    pub fn find_nearest_storehouse(&self, x: f32, y: f32) -> Option<usize> {
        let mut best: Option<(usize, f32)> = None;
        for (i, b) in self.buildings.iter().enumerate() {
            if !b.is_complete() {
                continue;
            }
            if b.kind != BuildingType::Storehouse && b.kind != BuildingType::Castle {
                continue;
            }
            let dx = b.x as f32 + 0.5 - x;
            let dy = b.y as f32 + 0.5 - y;
            let dist = (dx * dx + dy * dy).sqrt();
            if best.is_none_or(|(_, d)| dist < d) {
                best = Some((i, dist));
            }
        }
        best.map(|(i, _)| i)
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
                // Stable tiebreaker: when counts tie, pick higher tool code.
        // HashMap iteration non-deterministic, but (count,code) tuple is deterministic.
        demand.into_iter().max_by_key(|&(code, count)| (count, code)).map(|(code, _)| code)
    }

    /// How much HP is restored per tick per building from nearby idle settlers
    const REPAIR_RATE: u32 = 1;
    /// Maximum range (in tile units) for idle settlers to repair a building
    const REPAIR_RANGE: f32 = 3.0;

    /// Auto-repair damaged buildings using nearby idle settlers.
    /// Each building with hp < max_hp that has at least one idle settler within
    /// REPAIR_RANGE tile units gets REPAIR_RATE HP restored per tick.
    pub const PROMOTION_RANGE: f32 = 4.0;

    pub fn promote_ranked_soldiers(&mut self) -> u32 {
        let mut promoted = 0u32;
        let candidates: Vec<(u32, f32, f32)> = self
            .units
            .alive_units()
            .filter(|u| {
                u.is_idle() && u.rank >= 1
                    && (u.kind == crate::units::UnitKind::Swordsman
                        || u.kind == crate::units::UnitKind::Bowman)
            })
            .map(|u| (u.id, u.x, u.y))
            .collect();
        if candidates.is_empty() { return 0; }
        let gold_cost: u32 = 2;
        let range_sq = Self::PROMOTION_RANGE * Self::PROMOTION_RANGE;
        let barrack_positions: Vec<(f32, f32)> = self
            .buildings
            .iter()
            .filter(|b| b.kind == BuildingType::Barracks && b.is_complete())
            .map(|b| (b.x as f32 + 0.5, b.y as f32 + 0.5))
            .collect();
        if barrack_positions.is_empty() { return 0; }
        for (uid, ux, uy) in &candidates {
            let near = barrack_positions.iter().any(|(bx, by)| {
                let dx = ux - bx; let dy = uy - by;
                dx * dx + dy * dy <= range_sq
            });
            if !near { continue; }
            if self.storage.amounts()[ResourceType::Gold as usize] < gold_cost { break; }
            self.storage.try_spend(&[(ResourceType::Gold, gold_cost)]);
            if let Some(unit) = self.units.get_mut(*uid) {
                unit.kind = crate::units::UnitKind::SquadLeader;
                unit.max_hp = unit.effective_max_hp();
                unit.hp = unit.max_hp;
                unit.path = None;
                unit.target = None;
                unit.path_index = 0;
                unit.attack_cooldown = 0;
            }
            promoted += 1;
        }
        promoted
    }

    /// Apply SquadLeader combat aura to nearby allied units.
    ///
    /// For each alive SquadLeader, finds all allied combat units (same faction)
    /// within SQUAD_LEADER_AURA_RANGE tiles and grants them +15% attack damage
    /// and +10% defense (damage reduction).
    /// Clears the aura from units no longer in range of any SquadLeader.
    pub fn apply_squad_leader_auras(&mut self) -> u32 {
        let aura_range_sq = crate::units::SQUAD_LEADER_AURA_RANGE * crate::units::SQUAD_LEADER_AURA_RANGE;

        // Collect SquadLeader positions and faction
        let sl_info: Vec<(f32, f32, u32)> = self
            .units
            .alive_units()
            .filter(|u| u.kind == crate::units::UnitKind::SquadLeader)
            .map(|u| (u.x, u.y, u.id % 2))
            .collect();

        if sl_info.is_empty() {
            // No SquadLeaders alive — clear all aura buffs
            for unit in self.units.all_mut() {
                unit.aura_buff = false;
                unit.defense_aura_buff = false;
            }
            return 0;
        }

        let mut buffed = 0u32;

        // For each alive combat unit (non-SquadLeader), check if in range of any SquadLeader
        let candidate_ids: Vec<u32> = self
            .units
            .alive_units()
            .filter(|u| u.kind.can_fight() && u.kind != crate::units::UnitKind::SquadLeader)
            .map(|u| u.id)
            .collect();

        for uid in candidate_ids {
            let (ux, uy, my_faction) = {
                if let Some(u) = self.units.get(uid) {
                    (u.x, u.y, u.id % 2)
                } else {
                    continue;
                }
            };

            let in_aura = sl_info.iter().any(|(sx, sy, sl_faction)| {
                if *sl_faction != my_faction {
                    return false; // different faction — no buff
                }
                let dx = ux - sx;
                let dy = uy - sy;
                dx * dx + dy * dy <= aura_range_sq
            });

            if let Some(unit) = self.units.get_mut(uid) {
                if in_aura {
                    if !unit.aura_buff {
                        unit.aura_buff = true;
                        buffed += 1;
                    }
                    unit.defense_aura_buff = true;
                } else {
                    if unit.aura_buff {
                        unit.aura_buff = false;
                    }
                    unit.defense_aura_buff = false;
                }
            }
        }

        buffed
    }

    /// Apply morale bonus to combat units near garrisoned military buildings.
    ///
    /// For each garrisoned military building (GuardTower, Fortress, Castle with garrison),
    /// finds all allied combat units within MORALE_RANGE tiles and grants them a stacking
    /// +5% attack and +5% defense bonus per building (capped at MORALE_MAX_BONUS).
    /// Clears morale from units no longer in range of any garrisoned building.
    pub fn apply_garrison_morale(&mut self) -> u32 {
        let morale_range_sq = crate::units::MORALE_RANGE * crate::units::MORALE_RANGE;

        // Collect garrisoned military building positions and owner
        let garrison_info: Vec<(usize, usize, u8)> = self
            .buildings
            .iter()
            .filter(|b| b.is_garrisoned() && b.is_complete())
            .map(|b| (b.x, b.y, b.owner_id))
            .collect();

        if garrison_info.is_empty() {
            // No garrisoned buildings — clear all morale bonuses
            for unit in self.units.all_mut() {
                unit.morale_bonus = 0.0;
            }
            return 0;
        }

        let mut buffed = 0u32;

        // For each alive combat unit, count how many garrisoned buildings are in range
        let candidate_ids: Vec<u32> = self
            .units
            .alive_units()
            .filter(|u| u.kind.can_fight())
            .map(|u| u.id)
            .collect();

        for uid in candidate_ids {
            let (ux, uy, owner_id) = {
                if let Some(u) = self.units.get(uid) {
                    (u.x, u.y, u.id % 2)
                } else {
                    continue;
                }
            };

            // Count garrisoned buildings in range owned by same faction
            let mut building_count = 0u32;
            for &(bx, by, b_owner) in &garrison_info {
                if b_owner as u32 != owner_id {
                    continue; // different faction — no morale
                }
                let dx = ux - bx as f32;
                let dy = uy - by as f32;
                if dx * dx + dy * dy <= morale_range_sq {
                    building_count += 1;
                }
            }

            let new_bonus = if building_count > 0 {
                let raw = building_count as f32 * crate::units::MORALE_BONUS_PER_BUILDING;
                raw.min(crate::units::MORALE_MAX_BONUS)
            } else {
                0.0
            };

            if let Some(unit) = self.units.get_mut(uid) {
                if new_bonus != unit.morale_bonus {
                    if new_bonus > 0.0 && unit.morale_bonus == 0.0 {
                        buffed += 1;
                    }
                    unit.morale_bonus = new_bonus;
                }
            }
        }

        buffed
    }

    pub fn repair_buildings(&mut self) -> u32 {
        let mut repaired = 0u32;
        // Collect idle settler positions
        let idle_positions: Vec<(f32, f32)> = self
            .units
            .alive_units()
            .filter(|u| u.is_idle() && u.kind == crate::units::UnitKind::Settler)
            .map(|u| (u.x, u.y))
            .collect();

        if idle_positions.is_empty() {
            return 0;
        }

        for building in self.buildings.iter_mut() {
            if building.hp >= building.max_hp || !building.is_complete() {
                continue;
            }
            let bx = building.x as f32 + 0.5;
            let by = building.y as f32 + 0.5;
            let range_sq = Self::REPAIR_RANGE * Self::REPAIR_RANGE;
            let has_nearby = idle_positions.iter().any(|(ux, uy)| {
                let dx = ux - bx;
                let dy = uy - by;
                dx * dx + dy * dy <= range_sq
            });
            if has_nearby {
                building.hp = (building.hp + Self::REPAIR_RATE).min(building.max_hp);
                repaired += 1;
            }
        }
        repaired
    }
}

impl Default for Economy {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
#[path = "economy_tests.rs"]
mod tests;
