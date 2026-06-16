//! S4WN Nation Module
//!
//! Phase 2.8 — Nations & Balancing: nation data model, modifiers, and registry.
//!
//! ## Design
//!
//! Each nation has distinct playstyle modifiers that affect:
//! - Resource production rates
//! - Building costs
//! - Unit stats (HP, attack, speed, defense)
//! - Special abilities (formation bonus, berserk, etc.)
//!
//! Nation data is declared as const lookup tables — no runtime allocation.

// BuildingType and UnitKind used for future integration


// ── Nation Type ──────────────────────────────────────────────────────────────

/// The five playable nations of S4WN.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum NationType {
    Roman = 0,
    Viking = 1,
    Maya = 2,
    Trojan = 3,
    DarkTribe = 4,
}

impl NationType {
    /// All nation types, in order.
    pub const ALL: [NationType; 5] = [
        NationType::Roman,
        NationType::Viking,
        NationType::Maya,
        NationType::Trojan,
        NationType::DarkTribe,
    ];

    /// Display name for this nation.
    pub fn name(self) -> &'static str {
        match self {
            NationType::Roman => "Romans",
            NationType::Viking => "Vikings",
            NationType::Maya => "Maya",
            NationType::Trojan => "Trojans",
            NationType::DarkTribe => "Dark Tribe",
        }
    }

    /// Short description of the nation's playstyle.
    pub fn description(self) -> &'static str {
        match self {
            NationType::Roman => "Balanced builder — efficient production chains, strong economy",
            NationType::Viking => "Aggressive rusher — cheap military, fast unit production",
            NationType::Maya => "Defensive expander — fast workers, high HP buildings",
            NationType::Trojan => "Trade & quality — trade bonus, powerful elite units",
            NationType::DarkTribe => "Terraforming swarm — terrain control, cheap mass units",
        }
    }

    /// Primary display color (RGBA) for this nation.
    pub fn color(self) -> (u8, u8, u8, u8) {
        match self {
            NationType::Roman => (200, 50, 50, 255),     // Red
            NationType::Viking => (50, 100, 200, 255),   // Blue
            NationType::Maya => (50, 180, 50, 255),     // Green
            NationType::Trojan => (180, 150, 50, 255),   // Gold
            NationType::DarkTribe => (100, 50, 150, 255), // Purple
        }
    }

    /// Color as a hex string for web display.
    pub fn color_hex(self) -> &'static str {
        match self {
            NationType::Roman => "#C83232",
            NationType::Viking => "#3264C8",
            NationType::Maya => "#32B432",
            NationType::Trojan => "#B49632",
            NationType::DarkTribe => "#643296",
        }
    }
}

// ── Nation Modifiers ──────────────────────────────────────────────────────────

/// Production rate multiplier for a nation.
/// 1.0 = normal, 1.2 = 20% faster, 0.8 = 20% slower.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ProductionModifier {
    pub food: f32,
    pub wood: f32,
    pub stone: f32,
    pub iron: f32,
    pub coal: f32,
    pub gold: f32,
    pub tools: f32,
    pub weapons: f32,
}

/// Building cost multiplier for a nation.
/// 1.0 = normal, 0.8 = 20% cheaper, 1.2 = 20% more expensive.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CostModifier {
    pub economic: f32,
    pub military: f32,
    pub unique: f32,
}

/// Unit stat multipliers for a nation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct UnitModifier {
    pub worker_speed: f32,
    pub worker_build_speed: f32,
    pub soldier_hp: f32,
    pub soldier_attack: f32,
    pub soldier_defense: f32,
    pub archer_hp: f32,
    pub archer_attack: f32,
    pub archer_range: f32,
}

/// AI personality weights for a nation.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct AIPersonality {
    /// 0.0 = passive, 1.0 = very aggressive
    pub aggression: f32,
    /// 0.0 = turtle, 1.0 = rapid expansion
    pub expansion_rate: f32,
    /// 0.0 = ignore defense, 1.0 = heavily defensive
    pub defense_priority: f32,
    /// 0.0 = ignore trade, 1.0 = trade-focused
    pub trade_focus: f32,
}

/// Complete nation modifiers — defines how this nation plays.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct NationModifiers {
    pub production: ProductionModifier,
    pub cost: CostModifier,
    pub units: UnitModifier,
    pub ai: AIPersonality,
}

// ── Nation-Specific Unit Specials ─────────────────────────────────────────────

/// Special combat abilities unique to each nation's soldiers.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum UnitSpecial {
    /// Roman: +10% attack when adjacent to other Roman soldiers
    FormationBonus,
    /// Viking: +30% attack below 50% HP, faster movement
    Berserk,
    /// Maya: stealth detection, +20% defense in forest
    ForestGuard,
    /// Trojan: +40% defense, -20% movement speed
    ShieldWall,
    /// Dark Tribe: no special (rely on numbers)
    None,
}

impl UnitSpecial {
    /// The unit special for each nation.
    pub fn for_nation(nation: NationType) -> UnitSpecial {
        match nation {
            NationType::Roman => UnitSpecial::FormationBonus,
            NationType::Viking => UnitSpecial::Berserk,
            NationType::Maya => UnitSpecial::ForestGuard,
            NationType::Trojan => UnitSpecial::ShieldWall,
            NationType::DarkTribe => UnitSpecial::None,
        }
    }

    /// Display name for this special.
    pub fn name(self) -> &'static str {
        match self {
            UnitSpecial::FormationBonus => "Formation Bonus",
            UnitSpecial::Berserk => "Berserk",
            UnitSpecial::ForestGuard => "Forest Guard",
            UnitSpecial::ShieldWall => "Shield Wall",
            UnitSpecial::None => "None",
        }
    }

    /// Description of the special ability.
    pub fn description(self) -> &'static str {
        match self {
            UnitSpecial::FormationBonus => "+10% attack when adjacent to friendly soldiers",
            UnitSpecial::Berserk => "+30% attack below 50% HP, +20% movement speed",
            UnitSpecial::ForestGuard => "Stealth detection, +20% defense in forest terrain",
            UnitSpecial::ShieldWall => "+40% defense, -20% movement speed",
            UnitSpecial::None => "No special ability — relies on numbers",
        }
    }
}

// ── Nation ────────────────────────────────────────────────────────────────────

/// A fully resolved nation with type, modifiers, and metadata.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Nation {
    pub nation_type: NationType,
    pub modifiers: NationModifiers,
}

impl Nation {
    /// Create a new nation from its type (looks up modifiers from registry).
    pub fn new(nation_type: NationType) -> Self {
        Self {
            nation_type,
            modifiers: NationRegistry::modifiers(nation_type),
        }
    }

    /// Get the unit special for this nation.
    pub fn unit_special(&self) -> UnitSpecial {
        UnitSpecial::for_nation(self.nation_type)
    }

    /// Get the production modifier for a specific resource category.
    pub fn production_rate(&self, category: ResourceCategory) -> f32 {
        let p = &self.modifiers.production;
        match category {
            ResourceCategory::Food => p.food,
            ResourceCategory::Wood => p.wood,
            ResourceCategory::Stone => p.stone,
            ResourceCategory::Iron => p.iron,
            ResourceCategory::Coal => p.coal,
            ResourceCategory::Gold => p.gold,
            ResourceCategory::Tools => p.tools,
            ResourceCategory::Weapons => p.weapons,
        }
    }

    /// Get the building cost modifier for a building category.
    pub fn building_cost(&self, category: BuildingCategory) -> f32 {
        let c = &self.modifiers.cost;
        match category {
            BuildingCategory::Economic => c.economic,
            BuildingCategory::Military => c.military,
            BuildingCategory::Unique => c.unique,
        }
    }
}

/// Resource categories for production rate lookups.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResourceCategory {
    Food,
    Wood,
    Stone,
    Iron,
    Coal,
    Gold,
    Tools,
    Weapons,
}

/// Building categories for cost modifier lookups.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuildingCategory {
    Economic,
    Military,
    Unique,
}

// ── Nation Registry ───────────────────────────────────────────────────────────

/// Const lookup table with all 5 nations and their modifiers.
pub struct NationRegistry;

impl NationRegistry {
    /// Get the full modifiers for a nation.
    pub fn modifiers(nation: NationType) -> NationModifiers {
        match nation {
            NationType::Roman => NationModifiers {
                production: ProductionModifier {
                    food: 1.1,
                    wood: 1.1,
                    stone: 1.0,
                    iron: 1.0,
                    coal: 1.0,
                    gold: 1.0,
                    tools: 1.15,
                    weapons: 1.0,
                },
                cost: CostModifier {
                    economic: 0.95,
                    military: 1.0,
                    unique: 1.0,
                },
                units: UnitModifier {
                    worker_speed: 1.0,
                    worker_build_speed: 1.1,
                    soldier_hp: 1.0,
                    soldier_attack: 1.0,
                    soldier_defense: 1.0,
                    archer_hp: 1.0,
                    archer_attack: 1.0,
                    archer_range: 1.0,
                },
                ai: AIPersonality {
                    aggression: 0.4,
                    expansion_rate: 0.5,
                    defense_priority: 0.5,
                    trade_focus: 0.5,
                },
            },
            NationType::Viking => NationModifiers {
                production: ProductionModifier {
                    food: 0.9,
                    wood: 1.0,
                    stone: 1.1,
                    iron: 1.1,
                    coal: 1.0,
                    gold: 0.9,
                    tools: 1.0,
                    weapons: 1.2,
                },
                cost: CostModifier {
                    economic: 1.1,
                    military: 0.8,
                    unique: 1.0,
                },
                units: UnitModifier {
                    worker_speed: 1.0,
                    worker_build_speed: 0.9,
                    soldier_hp: 0.95,
                    soldier_attack: 1.15,
                    soldier_defense: 0.9,
                    archer_hp: 0.9,
                    archer_attack: 1.0,
                    archer_range: 1.0,
                },
                ai: AIPersonality {
                    aggression: 0.85,
                    expansion_rate: 0.7,
                    defense_priority: 0.2,
                    trade_focus: 0.2,
                },
            },
            NationType::Maya => NationModifiers {
                production: ProductionModifier {
                    food: 1.2,
                    wood: 1.0,
                    stone: 1.0,
                    iron: 0.9,
                    coal: 0.9,
                    gold: 1.0,
                    tools: 0.9,
                    weapons: 0.9,
                },
                cost: CostModifier {
                    economic: 1.0,
                    military: 1.05,
                    unique: 1.0,
                },
                units: UnitModifier {
                    worker_speed: 1.15,
                    worker_build_speed: 1.0,
                    soldier_hp: 1.1,
                    soldier_attack: 0.95,
                    soldier_defense: 1.15,
                    archer_hp: 1.05,
                    archer_attack: 1.0,
                    archer_range: 1.05,
                },
                ai: AIPersonality {
                    aggression: 0.25,
                    expansion_rate: 0.6,
                    defense_priority: 0.8,
                    trade_focus: 0.4,
                },
            },
            NationType::Trojan => NationModifiers {
                production: ProductionModifier {
                    food: 1.0,
                    wood: 1.0,
                    stone: 1.0,
                    iron: 1.0,
                    coal: 1.0,
                    gold: 1.15,
                    tools: 1.0,
                    weapons: 1.0,
                },
                cost: CostModifier {
                    economic: 1.1,
                    military: 1.15,
                    unique: 1.0,
                },
                units: UnitModifier {
                    worker_speed: 0.95,
                    worker_build_speed: 0.9,
                    soldier_hp: 1.1,
                    soldier_attack: 1.05,
                    soldier_defense: 1.1,
                    archer_hp: 1.0,
                    archer_attack: 1.1,
                    archer_range: 1.0,
                },
                ai: AIPersonality {
                    aggression: 0.3,
                    expansion_rate: 0.3,
                    defense_priority: 0.6,
                    trade_focus: 0.85,
                },
            },
            NationType::DarkTribe => NationModifiers {
                production: ProductionModifier {
                    food: 1.0,
                    wood: 0.9,
                    stone: 0.9,
                    iron: 0.85,
                    coal: 0.85,
                    gold: 0.85,
                    tools: 0.0,  // No toolmaker
                    weapons: 0.8,
                },
                cost: CostModifier {
                    economic: 0.9,
                    military: 0.7,
                    unique: 1.0,
                },
                units: UnitModifier {
                    worker_speed: 1.0,
                    worker_build_speed: 1.0,
                    soldier_hp: 0.8,
                    soldier_attack: 0.85,
                    soldier_defense: 0.8,
                    archer_hp: 0.75,
                    archer_attack: 0.9,
                    archer_range: 1.0,
                },
                ai: AIPersonality {
                    aggression: 0.6,
                    expansion_rate: 0.9,
                    defense_priority: 0.3,
                    trade_focus: 0.1,
                },
            },
        }
    }

    /// Get all 5 nations with their full data.
    pub fn all_nations() -> [Nation; 5] {
        [
            Nation::new(NationType::Roman),
            Nation::new(NationType::Viking),
            Nation::new(NationType::Maya),
            Nation::new(NationType::Trojan),
            Nation::new(NationType::DarkTribe),
        ]
    }

    /// Get the default starting resources for a nation.
    /// Returns (wood, stone, iron, coal, gold, grain, fish, game, sulfur).
    pub fn starting_resources(nation: NationType) -> (u32, u32, u32, u32, u32, u32, u32, u32, u32) {
        // Base starting resources
        let base: (u32, u32, u32, u32, u32, u32, u32, u32, u32) =
            (30, 20, 10, 10, 5, 15, 10, 5, 0);

        match nation {
            NationType::Roman => base,
            NationType::Viking => {
                // More stone for barracks, more iron for weapons
                (base.0, base.1 + 10, base.2 + 5, base.3, base.4, base.5 - 5, base.6, base.7, base.8)
            }
            NationType::Maya => {
                // More food, more wood
                (base.0 + 5, base.1, base.2, base.3, base.4, base.5 + 10, base.6 + 5, base.7 + 5, base.8)
            }
            NationType::Trojan => {
                // More gold, more stone
                (base.0, base.1 + 5, base.2, base.3, base.4 + 10, base.5, base.6, base.7, base.8)
            }
            NationType::DarkTribe => {
                // More wood, less iron/coal (no toolmaker)
                (base.0 + 10, base.1, base.2 - 5, base.3 - 5, base.4, base.5, base.6, base.7, base.8)
            }
        }
    }
}

// ── Unique Building Types ─────────────────────────────────────────────────────

/// Nation-specific unique building types.
/// These are in addition to the 25 common building types.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum UniqueBuildingType {
    // Romans
    TempleOfBacchus = 0,
    Vineyard = 1,
    WinePress = 2,
    SanctuaryOfMinerva = 3,
    SanctuaryOfVulcan = 4,
    Colosseum = 5,
    // Vikings
    MeadHall = 10,
    Apiary = 11,
    SanctuaryOfOdin = 12,
    SanctuaryOfThor = 13,
    SanctuaryOfFreya = 14,
    Runestone = 15,
    // Mayas
    TempleOfChac = 20,
    AgaveFarm = 21,
    Distillery = 22,
    SanctuaryOfKukulkan = 23,
    SanctuaryOfQuetzalcoatl = 24,
    SanctuaryOfHuitzilopochtli = 25,
    Observatory = 26,
    // Trojans
    OracleOfApollo = 30,
    OliveGrove = 31,
    OilPress = 32,
    SanctuaryOfArtemis = 33,
    SanctuaryOfPoseidon = 34,
    SanctuaryOfApollo = 35,
    Amphitheater = 36,
    // Dark Tribe
    DarkTemple = 40,
    DarkGarden = 41,
    MushroomFarm = 42,
    DarkBrewery = 43,
    SanctuaryOfMorbus = 44,
    SanctuaryOfPestilence = 45,
    DarkFortress = 46,
    DemonGate = 47,
}

impl UniqueBuildingType {
    /// The nation this unique building belongs to.
    pub fn nation(self) -> NationType {
        match self as u8 {
            0..=5 => NationType::Roman,
            10..=15 => NationType::Viking,
            20..=26 => NationType::Maya,
            30..=36 => NationType::Trojan,
            40..=47 => NationType::DarkTribe,
            _ => unreachable!(),
        }
    }

    /// Display name for this unique building.
    pub fn name(self) -> &'static str {
        match self {
            UniqueBuildingType::TempleOfBacchus => "Temple of Bacchus",
            UniqueBuildingType::Vineyard => "Vineyard",
            UniqueBuildingType::WinePress => "Wine Press",
            UniqueBuildingType::SanctuaryOfMinerva => "Sanctuary of Minerva",
            UniqueBuildingType::SanctuaryOfVulcan => "Sanctuary of Vulcan",
            UniqueBuildingType::Colosseum => "Colosseum",
            UniqueBuildingType::MeadHall => "Mead Hall",
            UniqueBuildingType::Apiary => "Apiary",
            UniqueBuildingType::SanctuaryOfOdin => "Sanctuary of Odin",
            UniqueBuildingType::SanctuaryOfThor => "Sanctuary of Thor",
            UniqueBuildingType::SanctuaryOfFreya => "Sanctuary of Freya",
            UniqueBuildingType::Runestone => "Runestone",
            UniqueBuildingType::TempleOfChac => "Temple of Chac",
            UniqueBuildingType::AgaveFarm => "Agave Farm",
            UniqueBuildingType::Distillery => "Distillery",
            UniqueBuildingType::SanctuaryOfKukulkan => "Sanctuary of Kukulkan",
            UniqueBuildingType::SanctuaryOfQuetzalcoatl => "Sanctuary of Quetzalcoatl",
            UniqueBuildingType::SanctuaryOfHuitzilopochtli => "Sanctuary of Huitzilopochtli",
            UniqueBuildingType::Observatory => "Observatory",
            UniqueBuildingType::OracleOfApollo => "Oracle of Apollo",
            UniqueBuildingType::OliveGrove => "Olive Grove",
            UniqueBuildingType::OilPress => "Oil Press",
            UniqueBuildingType::SanctuaryOfArtemis => "Sanctuary of Artemis",
            UniqueBuildingType::SanctuaryOfPoseidon => "Sanctuary of Poseidon",
            UniqueBuildingType::SanctuaryOfApollo => "Sanctuary of Apollo",
            UniqueBuildingType::Amphitheater => "Amphitheater",
            UniqueBuildingType::DarkTemple => "Dark Temple",
            UniqueBuildingType::DarkGarden => "Dark Garden",
            UniqueBuildingType::MushroomFarm => "Mushroom Farm",
            UniqueBuildingType::DarkBrewery => "Dark Brewery",
            UniqueBuildingType::SanctuaryOfMorbus => "Sanctuary of Morbus",
            UniqueBuildingType::SanctuaryOfPestilence => "Sanctuary of Pestilence",
            UniqueBuildingType::DarkFortress => "Dark Fortress",
            UniqueBuildingType::DemonGate => "Demon Gate",
        }
    }

    /// All unique buildings for a given nation.
    pub fn for_nation(nation: NationType) -> &'static [UniqueBuildingType] {
        match nation {
            NationType::Roman => &[
                UniqueBuildingType::TempleOfBacchus,
                UniqueBuildingType::Vineyard,
                UniqueBuildingType::WinePress,
                UniqueBuildingType::SanctuaryOfMinerva,
                UniqueBuildingType::SanctuaryOfVulcan,
                UniqueBuildingType::Colosseum,
            ],
            NationType::Viking => &[
                UniqueBuildingType::MeadHall,
                UniqueBuildingType::Apiary,
                UniqueBuildingType::SanctuaryOfOdin,
                UniqueBuildingType::SanctuaryOfThor,
                UniqueBuildingType::SanctuaryOfFreya,
                UniqueBuildingType::Runestone,
            ],
            NationType::Maya => &[
                UniqueBuildingType::TempleOfChac,
                UniqueBuildingType::AgaveFarm,
                UniqueBuildingType::Distillery,
                UniqueBuildingType::SanctuaryOfKukulkan,
                UniqueBuildingType::SanctuaryOfQuetzalcoatl,
                UniqueBuildingType::SanctuaryOfHuitzilopochtli,
                UniqueBuildingType::Observatory,
            ],
            NationType::Trojan => &[
                UniqueBuildingType::OracleOfApollo,
                UniqueBuildingType::OliveGrove,
                UniqueBuildingType::OilPress,
                UniqueBuildingType::SanctuaryOfArtemis,
                UniqueBuildingType::SanctuaryOfPoseidon,
                UniqueBuildingType::SanctuaryOfApollo,
                UniqueBuildingType::Amphitheater,
            ],
            NationType::DarkTribe => &[
                UniqueBuildingType::DarkTemple,
                UniqueBuildingType::DarkGarden,
                UniqueBuildingType::MushroomFarm,
                UniqueBuildingType::DarkBrewery,
                UniqueBuildingType::SanctuaryOfMorbus,
                UniqueBuildingType::SanctuaryOfPestilence,
                UniqueBuildingType::DarkFortress,
                UniqueBuildingType::DemonGate,
            ],
        }
    }
}

// ── Specialist Types ──────────────────────────────────────────────────────────

/// Specialist units that can be trained at specific buildings.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SpecialistType {
    Pioneer = 0,
    Geologist = 1,
    Thief = 2,
    Saboteur = 3,
    Priest = 4,
    /// Dark Tribe only — replaces toolmaker
    Shaman = 5,
}

impl SpecialistType {
    pub fn name(self) -> &'static str {
        match self {
            SpecialistType::Pioneer => "Pioneer",
            SpecialistType::Geologist => "Geologist",
            SpecialistType::Thief => "Thief",
            SpecialistType::Saboteur => "Saboteur",
            SpecialistType::Priest => "Priest",
            SpecialistType::Shaman => "Shaman",
        }
    }

    pub fn description(self) -> &'static str {
        match self {
            SpecialistType::Pioneer => "Expands territory by planting flags",
            SpecialistType::Geologist => "Prospects for resource deposits",
            SpecialistType::Thief => "Steals resources from enemy storehouse",
            SpecialistType::Saboteur => "Destroys enemy buildings",
            SpecialistType::Priest => "Generates manna at temple",
            SpecialistType::Shaman => "Dark Tribe specialist — provides tools",
        }
    }

    /// Tool required for this specialist (from ToolType).
    pub fn required_tool(self) -> Option<ToolType> {
        match self {
            SpecialistType::Pioneer => Some(ToolType::Hammer),
            SpecialistType::Geologist => Some(ToolType::Pickaxe),
            SpecialistType::Thief => Some(ToolType::Dagger),
            SpecialistType::Saboteur => Some(ToolType::Dagger),
            SpecialistType::Priest => None,
            SpecialistType::Shaman => None,
        }
    }
}

/// Tool types required for various tasks.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ToolType {
    Hammer = 0,
    Pickaxe = 1,
    Axe = 2,
    Saw = 3,
    FishingRod = 4,
    RollingPin = 5,
    Cleaver = 6,
    Bucket = 7,
    Dagger = 8,
    Shovel = 9,
    Bow = 10,
}

impl ToolType {
    pub fn name(self) -> &'static str {
        match self {
            ToolType::Hammer => "Hammer",
            ToolType::Pickaxe => "Pickaxe",
            ToolType::Axe => "Axe",
            ToolType::Saw => "Saw",
            ToolType::FishingRod => "Fishing Rod",
            ToolType::RollingPin => "Rolling Pin",
            ToolType::Cleaver => "Cleaver",
            ToolType::Bucket => "Bucket",
            ToolType::Dagger => "Dagger",
            ToolType::Shovel => "Shovel",
            ToolType::Bow => "Bow",
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nation_type_names() {
        assert_eq!(NationType::Roman.name(), "Romans");
        assert_eq!(NationType::Viking.name(), "Vikings");
        assert_eq!(NationType::Maya.name(), "Maya");
        assert_eq!(NationType::Trojan.name(), "Trojans");
        assert_eq!(NationType::DarkTribe.name(), "Dark Tribe");
    }

    #[test]
    fn test_nation_type_colors() {
        let roman = NationType::Roman.color();
        assert_eq!(roman.3, 255); // Alpha always 255
        let viking = NationType::Viking.color();
        assert!(viking.2 > viking.0); // Blue > Red for Vikings
    }

    #[test]
    fn test_nation_type_all() {
        assert_eq!(NationType::ALL.len(), 5);
    }

    #[test]
    fn test_nation_new() {
        let roman = Nation::new(NationType::Roman);
        assert_eq!(roman.nation_type, NationType::Roman);
        // Romans have 1.15 tools production bonus
        assert!((roman.modifiers.production.tools - 1.15).abs() < 0.001);
    }

    #[test]
    fn test_nation_unit_special() {
        let roman = Nation::new(NationType::Roman);
        assert_eq!(roman.unit_special(), UnitSpecial::FormationBonus);

        let viking = Nation::new(NationType::Viking);
        assert_eq!(viking.unit_special(), UnitSpecial::Berserk);

        let mayan = Nation::new(NationType::Maya);
        assert_eq!(mayan.unit_special(), UnitSpecial::ForestGuard);

        let trojan = Nation::new(NationType::Trojan);
        assert_eq!(trojan.unit_special(), UnitSpecial::ShieldWall);

        let dark = Nation::new(NationType::DarkTribe);
        assert_eq!(dark.unit_special(), UnitSpecial::None);
    }

    #[test]
    fn test_unit_special_names() {
        assert_eq!(UnitSpecial::FormationBonus.name(), "Formation Bonus");
        assert_eq!(UnitSpecial::Berserk.name(), "Berserk");
        assert_eq!(UnitSpecial::ForestGuard.name(), "Forest Guard");
        assert_eq!(UnitSpecial::ShieldWall.name(), "Shield Wall");
        assert_eq!(UnitSpecial::None.name(), "None");
    }

    #[test]
    fn test_roman_production_modifiers() {
        let roman = Nation::new(NationType::Roman);
        // Romans: efficient production chains
        assert!(roman.production_rate(ResourceCategory::Food) > 1.0);
        assert!(roman.production_rate(ResourceCategory::Wood) > 1.0);
        assert!(roman.production_rate(ResourceCategory::Tools) > 1.0);
        // Average military
        assert_eq!(roman.production_rate(ResourceCategory::Weapons), 1.0);
    }

    #[test]
    fn test_viking_production_modifiers() {
        let viking = Nation::new(NationType::Viking);
        // Vikings: cheap military, weak economy
        assert!(viking.production_rate(ResourceCategory::Weapons) > 1.0);
        assert!(viking.production_rate(ResourceCategory::Food) < 1.0);
        assert!(viking.building_cost(BuildingCategory::Military) < 1.0);
    }

    #[test]
    fn test_mayan_production_modifiers() {
        let mayan = Nation::new(NationType::Maya);
        // Mayas: fast workers, defensive
        assert!(mayan.modifiers.units.worker_speed > 1.0);
        assert!(mayan.modifiers.units.soldier_defense > 1.0);
        assert!(mayan.modifiers.ai.defense_priority > 0.7);
    }

    #[test]
    fn test_dark_tribe_no_toolmaker() {
        let dark = Nation::new(NationType::DarkTribe);
        // Dark Tribe has no toolmaker
        assert_eq!(dark.modifiers.production.tools, 0.0);
        // But cheap military
        assert!(dark.building_cost(BuildingCategory::Military) < 1.0);
        // Weak individual units
        assert!(dark.modifiers.units.soldier_hp < 1.0);
    }

    #[test]
    fn test_nation_registry_all_nations() {
        let nations = NationRegistry::all_nations();
        assert_eq!(nations.len(), 5);
    }

    #[test]
    fn test_starting_resources() {
        let roman = NationRegistry::starting_resources(NationType::Roman);
        let viking = NationRegistry::starting_resources(NationType::Viking);

        // Vikings get more stone
        assert!(viking.1 > roman.1);
        // Vikings get more iron
        assert!(viking.2 > roman.2);
    }

    #[test]
    fn test_unique_building_nations() {
        assert_eq!(UniqueBuildingType::TempleOfBacchus.nation(), NationType::Roman);
        assert_eq!(UniqueBuildingType::MeadHall.nation(), NationType::Viking);
        assert_eq!(UniqueBuildingType::TempleOfChac.nation(), NationType::Maya);
        assert_eq!(UniqueBuildingType::OracleOfApollo.nation(), NationType::Trojan);
        assert_eq!(UniqueBuildingType::DarkTemple.nation(), NationType::DarkTribe);
    }

    #[test]
    fn test_unique_buildings_for_nation() {
        assert_eq!(UniqueBuildingType::for_nation(NationType::Roman).len(), 6);
        assert_eq!(UniqueBuildingType::for_nation(NationType::Viking).len(), 6);
        assert_eq!(UniqueBuildingType::for_nation(NationType::Maya).len(), 7);
        assert_eq!(UniqueBuildingType::for_nation(NationType::Trojan).len(), 7);
        assert_eq!(UniqueBuildingType::for_nation(NationType::DarkTribe).len(), 8);
    }

    #[test]
    fn test_unique_building_names() {
        assert_eq!(UniqueBuildingType::Colosseum.name(), "Colosseum");
        assert_eq!(UniqueBuildingType::MeadHall.name(), "Mead Hall");
        assert_eq!(UniqueBuildingType::DarkFortress.name(), "Dark Fortress");
    }

    #[test]
    fn test_specialist_types() {
        assert_eq!(SpecialistType::Pioneer.name(), "Pioneer");
        assert_eq!(SpecialistType::Shaman.name(), "Shaman");
        assert_eq!(SpecialistType::Pioneer.required_tool(), Some(ToolType::Hammer));
        assert_eq!(SpecialistType::Priest.required_tool(), None);
    }

    #[test]
    fn test_tool_types() {
        assert_eq!(ToolType::Hammer.name(), "Hammer");
        assert_eq!(ToolType::FishingRod.name(), "Fishing Rod");
        assert_eq!(ToolType::Dagger.name(), "Dagger");
    }

    #[test]
    fn test_ai_personalities() {
        let roman = Nation::new(NationType::Roman);
        let viking = Nation::new(NationType::Viking);
        let mayan = Nation::new(NationType::Maya);
        let trojan = Nation::new(NationType::Trojan);
        let dark = Nation::new(NationType::DarkTribe);

        // Vikings are most aggressive
        assert!(viking.modifiers.ai.aggression > roman.modifiers.ai.aggression);
        assert!(viking.modifiers.ai.aggression > mayan.modifiers.ai.aggression);

        // Mayas are most defensive
        assert!(mayan.modifiers.ai.defense_priority > viking.modifiers.ai.defense_priority);

        // Trojans are most trade-focused
        assert!(trojan.modifiers.ai.trade_focus > roman.modifiers.ai.trade_focus);
        assert!(trojan.modifiers.ai.trade_focus > viking.modifiers.ai.trade_focus);

        // Dark Tribe expands fastest
        assert!(dark.modifiers.ai.expansion_rate > trojan.modifiers.ai.expansion_rate);
    }

    #[test]
    fn test_nation_color_hex() {
        assert!(NationType::Roman.color_hex().starts_with('#'));
        assert_eq!(NationType::Roman.color_hex().len(), 7);
    }

    #[test]
    fn test_balance_roman_vs_viking() {
        let roman = Nation::new(NationType::Roman);
        let viking = Nation::new(NationType::Viking);

        // Romans should have better economy
        assert!(roman.modifiers.production.food > viking.modifiers.production.food);
        // Vikings should have better military production
        assert!(viking.modifiers.production.weapons > roman.modifiers.production.weapons);
        // Vikings should have cheaper military buildings
        assert!(viking.modifiers.cost.military < roman.modifiers.cost.military);
    }

    #[test]
    fn test_total_unique_buildings() {
        let total = UniqueBuildingType::for_nation(NationType::Roman).len()
            + UniqueBuildingType::for_nation(NationType::Viking).len()
            + UniqueBuildingType::for_nation(NationType::Maya).len()
            + UniqueBuildingType::for_nation(NationType::Trojan).len()
            + UniqueBuildingType::for_nation(NationType::DarkTribe).len();
        assert_eq!(total, 34); // 6 + 6 + 7 + 7 + 8
    }
}
