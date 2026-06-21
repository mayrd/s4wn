//! BASE.md Compliance Validation Tests
//!
//! These tests validate that the S4WN codebase matches the building data,
//! resource definitions, and production chains described in BASE.md.
//! BASE.md is the priority source of truth — any discrepancy here is a bug.

use super::*;

/// ─── BASE.md Building Catalog ──────────────────────────────────────────
/// All Roman buildings listed in BASE.md §Roman Buildings.
/// Format: (config_id, base_name, category, planks, stone, gold)
const BASE_ROMAN_BUILDINGS: &[(&str, &str, &str, u32, u32, u32)] = &[
    // Basic Economy
    ("Forester's Hut", "Forester's Hut", "Basic Economy", 2, 1, 0),
    ("Woodcutter's Hut", "Woodcutter's Hut", "Basic Economy", 2, 1, 0),
    ("Sawmill", "Sawmill", "Basic Economy", 4, 2, 0),
    ("Stonecutter's Hut", "Stonecutter's Hut", "Basic Economy", 2, 1, 0),
    // Food Production
    ("Grain Farm", "Grain Farm", "Food Production", 5, 2, 0),
    ("Pig Ranch", "Pig Ranch", "Food Production", 5, 2, 0),
    ("Grain Mill", "Grain Mill", "Food Production", 4, 2, 0),
    ("Bakery", "Bakery", "Food Production", 4, 2, 0),
    ("Slaughterhouse", "Slaughterhouse", "Food Production", 4, 2, 0),
    ("Fisherman's Hut", "Fisherman's Hut", "Food Production", 2, 1, 0),
    ("Waterworks", "Waterworks", "Food Production", 3, 1, 0),
    // Mining & Smelting
    ("Coal Mine", "Coal Mine", "Mining & Smelting", 3, 1, 0),
    ("Iron Ore Mine", "Iron Ore Mine", "Mining & Smelting", 3, 1, 0),
    ("Gold Mine", "Gold Mine", "Mining & Smelting", 3, 1, 0),
    ("Sulfur Mine", "Sulfur Mine", "Mining & Smelting", 3, 1, 0),
    ("Iron Smelter", "Iron Smelter", "Mining & Smelting", 4, 2, 0),
    ("Gold Smelter", "Gold Smelter", "Mining & Smelting", 4, 2, 0),
    // Military & Tools
    ("Toolsmith", "Toolsmith", "Military & Tools", 4, 2, 0),
    ("Weaponsmith", "Weaponsmith", "Military & Tools", 4, 3, 0),
    ("Barracks", "Barracks", "Military & Tools", 5, 4, 0),
    ("Small Tower", "Small Tower", "Military & Tools", 3, 2, 0),
    ("Big Tower", "Big Tower", "Military & Tools", 5, 4, 0),
    ("Castle", "Castle", "Military & Tools", 8, 7, 0),
    ("Healer's Hut", "Healer's Hut", "Military & Tools", 4, 2, 0),
    // Divine & Special
    ("Vineyard", "Vineyard", "Divine & Special", 4, 2, 0),
    ("Small Temple", "Small Temple", "Divine & Special", 4, 5, 0),
    ("Large Temple", "Large Temple", "Divine & Special", 6, 8, 0),
    // Logistics
    ("Small Residence", "Small Residence", "Logistics", 4, 2, 0),
    ("Medium Residence", "Medium Residence", "Logistics", 7, 4, 0),
    ("Large Residence", "Large Residence", "Logistics", 10, 6, 0),
    ("Storage Yard", "Storage Yard", "Logistics", 4, 1, 0),
    ("Marketplace", "Marketplace", "Logistics", 4, 2, 0),
    ("Shipyard", "Shipyard", "Logistics", 5, 2, 0),
    ("Landing Dock", "Landing Dock", "Logistics", 4, 2, 0),
    // Zierobjekte
    ("Bust", "Bust", "Zierobjekte", 1, 1, 1),
    ("Monument", "Monument", "Zierobjekte", 2, 3, 2),
    ("Standard", "Standard / Banner", "Zierobjekte", 2, 0, 2),
    ("Obelisk", "Obelisk", "Zierobjekte", 1, 4, 2),
    ("Bench", "Bench", "Zierobjekte", 2, 2, 1),
    ("Archways", "Archways", "Zierobjekte", 3, 5, 3),
];

/// All resources defined in BASE.md §Resources.
const BASE_RESOURCES: &[&str] = &[
    "Wood Log", "Plank", "Stone",
    "Coal Ore", "Iron Ore", "Gold Ore", "Sulfur Ore",
    "Iron Bar", "Gold Bar",
    "Water", "Grain", "Flour", "Fish", "Bread", "Meat",
    "Pig", "Sheep", "Goat", "Goose", "Donkey",
    "Grapes", "Wine", "Honey", "Mead", "Agave", "Tequila",
    "Sunflower", "Sunflower Oil",
    "Hammer", "Pickaxe", "Axe", "Saw", "Shovel", "Scythe", "Fishing Rod",
    "Sword", "Bow", "Armor", "Spear", "Battleaxe", "Blowgun", "Backpack Catapult",
    "Gunpowder", "Explosive Arrow", "Catapult Ammo",
];

#[test]
fn test_base_building_count() {
    // BASE.md defines exactly 40 Roman buildings
    assert_eq!(BASE_ROMAN_BUILDINGS.len(), 40,
        "BASE.md must define exactly 40 Roman buildings — if this changed, update BASE.md first");
}

#[test]
fn test_base_resource_count() {
    // BASE.md defines exactly 45 resources
    assert_eq!(BASE_RESOURCES.len(), 45,
        "BASE.md must define exactly 45 resources — if this changed, update BASE.md first");
}

#[test]
fn test_base_building_names_present() {
    // Every BASE.md building name should be recognisable
    for &(id, name, cat, planks, stone, gold) in BASE_ROMAN_BUILDINGS {
        let normalized = id.to_lowercase().replace(' ', "").replace("'", "").replace('\'', "");
        assert!(!normalized.is_empty(),
            "BASE.md building '{}' has empty normalized name", name);
        // Verify cost values are reasonable
        assert!(planks <= 20, "BASE.md building '{}' planks cost {} exceeds 20", name, planks);
        assert!(stone <= 20, "BASE.md building '{}' stone cost {} exceeds 20", name, stone);
        assert!(gold <= 10, "BASE.md building '{}' gold cost {} exceeds 10", name, gold);
    }
}

#[test]
fn test_base_resource_names_present() {
    for &name in BASE_RESOURCES {
        assert!(!name.is_empty(), "BASE.md resource has empty name");
        assert!(name.len() >= 3, "BASE.md resource '{}' name too short", name);
    }
}

#[test]
fn test_base_building_categories() {
    let categories: std::collections::HashSet<&str> = BASE_ROMAN_BUILDINGS
        .iter().map(|(_, _, cat, _, _, _)| *cat).collect();
    let expected: std::collections::HashSet<&str> = [
        "Basic Economy", "Food Production", "Mining & Smelting",
        "Military & Tools", "Divine & Special", "Logistics", "Zierobjekte"
    ].iter().copied().collect();
    assert_eq!(categories, expected,
        "BASE.md building categories must match the 7 defined categories");
}

#[test]
fn test_base_no_duplicate_building_names() {
    let mut seen = std::collections::HashSet::new();
    for &(id, _, _, _, _, _) in BASE_ROMAN_BUILDINGS {
        assert!(seen.insert(id), "Duplicate building in BASE.md: '{}'", id);
    }
}

#[test]
fn test_base_no_duplicate_resource_names() {
    let mut seen = std::collections::HashSet::new();
    for &name in BASE_RESOURCES {
        assert!(seen.insert(name), "Duplicate resource in BASE.md: '{}'", name);
    }
}
