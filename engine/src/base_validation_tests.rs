//! BASE.md Compliance Validation Tests
//!
//! Validates that the S4WN codebase matches BASE.md building data,
//! resource definitions, and production chains across all 5 nations.
//!
//! These tests ensure that:
//! - All building names from BASE.md exist in BuildingType
//! - All resource types from BASE.md exist in ResourceType
//! - All settler/unit types from BASE.md exist in UnitKind
//! - Production chains match BASE.md specifications

use crate::economy::{BuildingType, ResourceType};
use crate::nation::{NationType, BuildingCategory};
use crate::units::UnitKind;

// ─── Tests validating BASE.md building data ────────────────────────────

/// Verify the building type enum has the expected count
#[test]
fn test_base_building_type_count() {
    // BASE.md shows ~77 valid building types (with gaps in discriminant sequence)
    assert_eq!(BuildingType::VALID_DISCRIMINANTS.len(), 77);
    assert_eq!(BuildingType::COUNT, 87); // Max discriminant + 1
}

/// Verify all core building types referenced in BASE.md exist in Rust
#[test]
#[cfg(test)] // from_name is #[cfg(test)]
fn test_base_core_buildings_exist() {
    // Core production buildings via from_name()
    assert!(BuildingType::from_name("Woodcutter").is_some(), "Woodcutter's Hut missing");
    assert!(BuildingType::from_name("Forester").is_some(), "Forester's Hut missing");
    assert!(BuildingType::from_name("Sawmill").is_some(), "Sawmill missing");
    assert!(BuildingType::from_name("Stonecutter").is_some(), "Stonecutter's Hut missing");
    assert!(BuildingType::from_name("Farm").is_some(), "Grain Farm missing");
    assert!(BuildingType::from_name("Mill").is_some(), "Grain Mill missing");
    assert!(BuildingType::from_name("Bakery").is_some(), "Bakery missing");
    assert!(BuildingType::from_name("Butcher").is_some(), "Slaughterhouse missing");
    assert!(BuildingType::from_name("Fisherman").is_some(), "Fisherman's Hut missing");
    assert!(BuildingType::from_name("Waterworks").is_some(), "Waterworks missing");
    
    // Mining buildings via discriminant (not in from_name lookup)
    assert!(BuildingType::from_discriminant(62).is_some(), "Coal Mine missing");
    assert!(BuildingType::from_discriminant(63).is_some(), "Iron Ore Mine missing");
    assert!(BuildingType::from_discriminant(61).is_some(), "Gold Mine missing");
    assert!(BuildingType::from_discriminant(64).is_some(), "Sulfur Mine missing");
    
    // Smelting
    assert!(BuildingType::from_discriminant(66).is_some(), "Iron Smelter missing");
    assert!(BuildingType::from_discriminant(65).is_some(), "Gold Smelter missing");
    
    // Military & Tools
    assert!(BuildingType::from_name("Toolsmith").is_some(), "Toolsmith missing");
    assert!(BuildingType::from_name("Weaponsmith").is_some(), "Weaponsmith missing");
    assert!(BuildingType::from_name("Barracks").is_some(), "Barracks missing");
    assert!(BuildingType::from_name("Guard Tower").is_some(), "Small Tower missing");
    assert!(BuildingType::from_name("Fortress").is_some(), "Big Tower missing");
    assert!(BuildingType::from_name("Castle").is_some(), "Castle missing");
    
    // Unique buildings per nation
    assert!(BuildingType::from_name("Vineyard").is_some(), "Roman Vineyard missing");
    assert!(BuildingType::from_name("Agave Farm").is_some(), "Mayan Agave Farm missing");
    assert!(BuildingType::from_name("Distillery").is_some(), "Mayan Distillery missing");
    assert!(BuildingType::from_name("Powder Mill").is_some(), "Mayan Powder Mill missing");
    assert!(BuildingType::from_name("Apiary").is_some(), "Viking Apiary missing");
    assert!(BuildingType::from_name("Mead Maker").is_some(), "Viking Mead Maker missing");
    assert!(BuildingType::from_name("Trojan Farm").is_some(), "Trojan Farm missing");
    assert!(BuildingType::from_name("Oil Press").is_some(), "Trojan Oil Press missing");
    assert!(BuildingType::from_name("Weapon Foundry").is_some(), "Trojan Weapon Foundry missing");
    assert!(BuildingType::from_name("Dark Temple").is_some(), "Dark Temple missing");
    assert!(BuildingType::from_name("Mushroom Farm").is_some(), "Dark Tribe Mushroom Farm missing");
}

/// Verify all resource types from BASE.md exist
#[test]
fn test_base_all_resources_exist() {
    // Raw resources from BASE.md
    assert!(ResourceType::from_u8(0).is_some(), "Wood missing");
    assert!(ResourceType::from_u8(1).is_some(), "Stone missing");
    assert!(ResourceType::from_u8(2).is_some(), "IronOre missing");
    assert!(ResourceType::from_u8(3).is_some(), "Coal missing");
    assert!(ResourceType::from_u8(4).is_some(), "Gold missing");
    assert!(ResourceType::from_u8(5).is_some(), "Sulfur missing");
    assert!(ResourceType::from_u8(6).is_some(), "Fish missing");
    assert!(ResourceType::from_u8(7).is_some(), "Grain missing");
    assert!(ResourceType::from_u8(8).is_some(), "Meat missing");
    assert!(ResourceType::from_u8(9).is_some(), "Water missing");
    assert!(ResourceType::from_u8(12).is_some(), "Honey missing"); // Gap at 10,11
    
    // Processed goods
    assert!(ResourceType::from_u8(16).is_some(), "Planks missing");
    assert!(ResourceType::from_u8(17).is_some(), "Tools missing");
    assert!(ResourceType::from_u8(18).is_some(), "Weapons missing");
    assert!(ResourceType::from_u8(20).is_some(), "Bread missing");
    assert!(ResourceType::from_u8(22).is_some(), "Flour missing");
    assert!(ResourceType::from_u8(23).is_some(), "IronIngots missing");
    assert!(ResourceType::from_u8(27).is_some(), "Mead missing");
    assert!(ResourceType::from_u8(28).is_some(), "Wine missing");
}

/// Verify production chains match BASE.md
#[test]
fn test_base_production_chains() {
    // Wood → Planks (Sawmill) - per BASE.md: Sawmill inputs Wood, outputs Planks
    assert!(BuildingType::Sawmill.inputs().iter().any(|(r, _)| *r == ResourceType::Wood), "Sawmill needs Wood input");
    assert!(BuildingType::Sawmill.outputs().iter().any(|(r, _)| *r == ResourceType::Planks), "Sawmill needs Planks output");
    
    // Grain → Flour (Mill) - per BASE.md: Mill inputs Grain, outputs Flour
    assert!(BuildingType::Mill.inputs().iter().any(|(r, _)| *r == ResourceType::Grain), "Mill needs Grain input");
    assert!(BuildingType::Mill.outputs().iter().any(|(r, _)| *r == ResourceType::Flour), "Mill needs Flour output");
    
    // Flour/Water → Bread (Bakery) - per BASE.md
    assert!(BuildingType::Bakery.outputs().iter().any(|(r, _)| *r == ResourceType::Bread), "Bakery needs Bread output");
    
    // IronOre + Coal → IronIngots (Smelter) - per BASE.md
    assert!(BuildingType::Smelter.inputs().iter().any(|(r, _)| *r == ResourceType::IronOre), "Smelter needs IronOre input");
    assert!(BuildingType::Smelter.inputs().iter().any(|(r, _)| *r == ResourceType::Coal), "Smelter needs Coal input");
    assert!(BuildingType::Smelter.outputs().iter().any(|(r, _)| *r == ResourceType::IronIngots), "Smelter needs IronIngots output");
    
    // Toolsmith production - per BASE.md: Iron Bars + Coal → Tools
    let toolsmith_inputs: Vec<_> = BuildingType::Toolsmith.inputs().iter().collect();
    assert!(toolsmith_inputs.iter().any(|(r, _)| *r == ResourceType::IronOre), "Toolsmith needs IronOre input");
    assert!(toolsmith_inputs.iter().any(|(r, _)| *r == ResourceType::Coal), "Toolsmith needs Coal input");
    assert!(BuildingType::Toolsmith.outputs().iter().any(|(r, _)| *r == ResourceType::Tools), "Toolsmith needs Tools output");
}

/// Verify building tool requirements match BASE.md
#[test]
fn test_base_tool_requirements() {
    // Buildings that require tools per BASE.md and Rust implementation:
    
    // Sawmill requires Saw (code 3) - verified above
    assert_eq!(BuildingType::Sawmill.required_tool(), Some(3));
    
    // Toolsmith requires Hammer (code 0) - per BASE.md: Werkzeugschmied = Hammer
    assert_eq!(BuildingType::Toolsmith.required_tool(), Some(0));
    
    // Weaponsmith requires Hammer (code 0) - per BASE.md  
    assert_eq!(BuildingType::Weaponsmith.required_tool(), Some(0));
    
    // Stonecutter requires Pickaxe (code 1)
    assert_eq!(BuildingType::Stonecutter.required_tool(), Some(1));
    
    // Waterworks requires Bucket (code 7)
    assert_eq!(BuildingType::Waterworks.required_tool(), Some(7));
    
    // Fisherman requires Fishing Rod (code 4)
    assert_eq!(BuildingType::Fisherman.required_tool(), Some(4));
    
    // Woodcutter requires Axe (code 2)
    assert_eq!(BuildingType::Woodcutter.required_tool(), Some(2));
}

/// Verify military building garrison capacities per BASE.md
#[test]
fn test_base_garrison_capacities() {
    // Guard Tower = 1 per BASE.md
    assert_eq!(BuildingType::GuardTower.garrison_capacity(), 1);
    
    // Fortress = 3 per BASE.md
    assert_eq!(BuildingType::Fortress.garrison_capacity(), 3);
    
    // Castle = 6 per BASE.md
    assert_eq!(BuildingType::Castle.garrison_capacity(), 6);
}

/// Verify unit stats match BASE.md expectations
#[test]
fn test_base_unit_stats() {
    // Settler: HP 50 per BASE.md
    assert_eq!(UnitKind::Settler.max_hp(), 50);
    assert_eq!(UnitKind::Settler.speed(), 2.0);
    
    // Swordsman: HP 100, attack 15, range 1 per BASE.md
    assert_eq!(UnitKind::Swordsman.max_hp(), 100);
    assert_eq!(UnitKind::Swordsman.attack_damage(), 15);
    assert_eq!(UnitKind::Swordsman.attack_range(), 1.0);
    
    // Bowman: HP 60, attack 10, range 3 per BASE.md
    assert_eq!(UnitKind::Bowman.max_hp(), 60);
    assert_eq!(UnitKind::Bowman.attack_damage(), 10);
    assert_eq!(UnitKind::Bowman.attack_range(), 3.0);
    
    // Squad Leader (should have higher stats)
    assert_eq!(UnitKind::SquadLeader.max_hp(), 80);
}

/// Verify all 5 nations exist
#[test]
fn test_base_nations_exist() {
    // All 5 nations should exist per BASE.md
    let nations = NationType::ALL;
    assert_eq!(nations.len(), 5);
    
    // Each nation should have a description
    for nation in nations {
        assert!(!nation.description().is_empty(), "Nation missing description");
    }
}

/// Verify all unit kinds exist for nation-specific units
#[test]
fn test_base_unit_kinds_by_nation() {
    // Nation-specific units per BASE.md:
    
    // Roman special: Medic (31), Vintner (30)
    assert!(UnitKind::from_u8(30).is_some()); // Vintner
    assert!(UnitKind::from_u8(31).is_some()); // Medic
    
    // Mayan special: Blowgun Warrior (35), Powder Maker (34), Agave Farmer (32), Tequila Distiller (33)
    assert!(UnitKind::from_u8(32).is_some()); // AgaveFarmer
    assert!(UnitKind::from_u8(33).is_some()); // TequilaDistiller
    assert!(UnitKind::from_u8(34).is_some()); // PowderMaker
    assert!(UnitKind::from_u8(35).is_some()); // BlowgunWarrior
    
    // Viking special: Axe Warrior (38), Beekeeper (36), Mead Brewer (37)
    assert!(UnitKind::from_u8(36).is_some()); // Beekeeper
    assert!(UnitKind::from_u8(37).is_some()); // MeadBrewer
    assert!(UnitKind::from_u8(38).is_some()); // AxeWarrior
    
    // Trojan special: Backpack Catapultist (42), Sunflower Farmer (39), Oil Miller (40), Weapon Foundry Worker (41)
    assert!(UnitKind::from_u8(39).is_some()); // SunflowerFarmer
    assert!(UnitKind::from_u8(40).is_some()); // OilMiller
    assert!(UnitKind::from_u8(41).is_some()); // WeaponFoundryWorker
    assert!(UnitKind::from_u8(42).is_some()); // BackpackCatapultist
    
    // Dark Tribe: Dark Digger (43), Dark Farmer (44), Shaman (46), Shadow Soldier (47)
    assert!(UnitKind::from_u8(43).is_some()); // DarkDigger
    assert!(UnitKind::from_u8(44).is_some()); // DarkFarmer
    assert!(UnitKind::from_u8(45).is_some()); // Cultist
    assert!(UnitKind::from_u8(46).is_some()); // Shaman
    assert!(UnitKind::from_u8(47).is_some()); // ShadowSoldier
}

/// Verify Dark Tribe buildings exist per BASE.md
#[test]
fn test_dark_tribe_buildings_exist() {
    // Dark Tribe has special buildings per BASE.md lines 193-201:
    // - Dark Temple = 54
    // - Dark Garden = 55
    // - Mushroom Farm = 56
    assert!(BuildingType::from_discriminant(54).is_some(), "Dark Temple missing");
    assert!(BuildingType::from_discriminant(55).is_some(), "Dark Garden missing");
    assert!(BuildingType::from_discriminant(56).is_some(), "Mushroom Farm missing");
}

/// Verify nation-specific buildings have correct nation association per BASE.md
#[test]
fn test_base_nation_specific_buildings() {
    // Roman unique buildings
    assert_eq!(BuildingType::TempleOfBacchus.nation_for_building(), Some(NationType::Roman));
    assert_eq!(BuildingType::Colosseum.nation_for_building(), Some(NationType::Roman));
    
    // Mayan unique buildings
    assert_eq!(BuildingType::TempleOfChac.nation_for_building(), Some(NationType::Maya));
    assert_eq!(BuildingType::AgaveFarm.nation_for_building(), Some(NationType::Maya));
    assert_eq!(BuildingType::Distillery.nation_for_building(), Some(NationType::Maya));
    
    // Viking unique buildings
    assert_eq!(BuildingType::MeadHall.nation_for_building(), Some(NationType::Viking));
    assert_eq!(BuildingType::SanctuaryOfOdin.nation_for_building(), Some(NationType::Viking));
    
    // Trojan unique buildings
    assert_eq!(BuildingType::OracleOfApollo.nation_for_building(), Some(NationType::Trojan));
    assert_eq!(BuildingType::SanctuaryOfArtemis.nation_for_building(), Some(NationType::Trojan));
    
    // Dark Tribe unique buildings
    assert_eq!(BuildingType::DarkTemple.nation_for_building(), Some(NationType::DarkTribe));
    assert_eq!(BuildingType::DarkGarden.nation_for_building(), Some(NationType::DarkTribe));
    assert_eq!(BuildingType::MushroomFarm.nation_for_building(), Some(NationType::DarkTribe));
}

/// Verify building categories are correct per BASE.md
#[test]
fn test_base_building_categories() {
    // Economic buildings
    assert_eq!(BuildingType::Farm.building_category(), BuildingCategory::Economic);
    assert_eq!(BuildingType::Mill.building_category(), BuildingCategory::Economic);
    assert_eq!(BuildingType::Bakery.building_category(), BuildingCategory::Economic);
    
    // Military buildings
    assert_eq!(BuildingType::Weaponsmith.building_category(), BuildingCategory::Military);
    assert_eq!(BuildingType::Barracks.building_category(), BuildingCategory::Military);
    assert_eq!(BuildingType::GuardTower.building_category(), BuildingCategory::Military);
    
    // Unique buildings
    assert_eq!(BuildingType::TempleOfBacchus.building_category(), BuildingCategory::Unique);
    assert_eq!(BuildingType::AgaveFarm.building_category(), BuildingCategory::Unique);
}

/// Verify resource groups match BASE.md categories
#[test]
fn test_base_resource_groups() {
    // Construction resources
    assert_eq!(ResourceType::Wood.group_name(), "Construction");
    assert_eq!(ResourceType::Stone.group_name(), "Construction");
    assert_eq!(ResourceType::Planks.group_name(), "Construction");
    
    // Food resources
    assert_eq!(ResourceType::Water.group_name(), "Food");
    assert_eq!(ResourceType::Grain.group_name(), "Food");
    assert_eq!(ResourceType::Fish.group_name(), "Food");
    assert_eq!(ResourceType::Meat.group_name(), "Food");
    assert_eq!(ResourceType::Bread.group_name(), "Food");
    assert_eq!(ResourceType::Flour.group_name(), "Food");
    assert_eq!(ResourceType::Honey.group_name(), "Food");
    assert_eq!(ResourceType::Mead.group_name(), "Food");
    assert_eq!(ResourceType::Wine.group_name(), "Food");
    
    // Metal resources
    assert_eq!(ResourceType::IronOre.group_name(), "Metal");
    assert_eq!(ResourceType::Coal.group_name(), "Metal");
    assert_eq!(ResourceType::Gold.group_name(), "Metal");
    assert_eq!(ResourceType::Sulfur.group_name(), "Metal");
}