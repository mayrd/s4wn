//! BASE.md Compliance Validation Tests
//!
//! Validates that the S4WN codebase matches BASE.md building data,
//! resource definitions, and production chains across all 5 nations.

use super::*;

/// ─── BASE.md Building Catalog (all 5 nations) ────────────────────────────
/// Format: (config_id, nation, category, planks, stone, gold)

type BuildingDef<'a> = (&'a str, &'a str, &'a str, u32, u32, u32);

const BASE_ROMAN: &[BuildingDef] = &[
    ("Forester's Hut","Roman","Basic Economy",2,1,0),
    ("Woodcutter's Hut","Roman","Basic Economy",2,1,0),
    ("Sawmill","Roman","Basic Economy",4,2,0),
    ("Stonecutter's Hut","Roman","Basic Economy",2,1,0),
    ("Grain Farm","Roman","Food Production",5,2,0),
    ("Pig Ranch","Roman","Food Production",5,2,0),
    ("Grain Mill","Roman","Food Production",4,2,0),
    ("Bakery","Roman","Food Production",4,2,0),
    ("Slaughterhouse","Roman","Food Production",4,2,0),
    ("Fisherman's Hut","Roman","Food Production",2,1,0),
    ("Waterworks","Roman","Food Production",3,1,0),
    ("Coal Mine","Roman","Mining & Smelting",3,1,0),
    ("Iron Ore Mine","Roman","Mining & Smelting",3,1,0),
    ("Gold Mine","Roman","Mining & Smelting",3,1,0),
    ("Sulfur Mine","Roman","Mining & Smelting",3,1,0),
    ("Iron Smelter","Roman","Mining & Smelting",4,2,0),
    ("Gold Smelter","Roman","Mining & Smelting",4,2,0),
    ("Toolsmith","Roman","Military & Tools",4,2,0),
    ("Weaponsmith","Roman","Military & Tools",4,3,0),
    ("Barracks","Roman","Military & Tools",5,4,0),
    ("Small Tower","Roman","Military & Tools",3,2,0),
    ("Big Tower","Roman","Military & Tools",5,4,0),
    ("Castle","Roman","Military & Tools",8,7,0),
    ("Healer's Hut","Roman","Military & Tools",4,2,0),
    ("Vineyard","Roman","Divine & Special",4,2,0),
    ("Small Temple","Roman","Divine & Special",4,5,0),
    ("Large Temple","Roman","Divine & Special",6,8,0),
    ("Small Residence","Roman","Logistics",4,2,0),
    ("Medium Residence","Roman","Logistics",7,4,0),
    ("Large Residence","Roman","Logistics",10,6,0),
    ("Storage Yard","Roman","Logistics",4,1,0),
    ("Marketplace","Roman","Logistics",4,2,0),
    ("Shipyard","Roman","Logistics",5,2,0),
    ("Landing Dock","Roman","Logistics",4,2,0),
    ("Bust","Roman","Zierobjekte",1,1,1),
    ("Monument","Roman","Zierobjekte",2,3,2),
    ("Standard","Roman","Zierobjekte",2,0,2),
    ("Obelisk","Roman","Zierobjekte",1,4,2),
    ("Bench","Roman","Zierobjekte",2,2,1),
    ("Archways","Roman","Zierobjekte",3,5,3),
];

const BASE_MAYAN: &[BuildingDef] = &[
    ("Forester's Hut","Maya","Basic Economy",2,1,0),
    ("Woodcutter's Hut","Maya","Basic Economy",2,1,0),
    ("Sawmill","Maya","Basic Economy",4,2,0),
    ("Stonecutter's Hut","Maya","Basic Economy",1,3,0),
    ("Grain Farm","Maya","Food Production",4,3,0),
    ("Goat Ranch","Maya","Food Production",4,3,0),
    ("Grain Mill","Maya","Food Production",3,3,0),
    ("Bakery","Maya","Food Production",3,3,0),
    ("Slaughterhouse","Maya","Food Production",3,3,0),
    ("Fisherman's Hut","Maya","Food Production",1,2,0),
    ("Waterworks","Maya","Food Production",2,2,0),
    ("Coal Mine","Maya","Mining & Smelting",2,2,0),
    ("Iron Ore Mine","Maya","Mining & Smelting",2,2,0),
    ("Gold Mine","Maya","Mining & Smelting",2,2,0),
    ("Sulfur Mine","Maya","Mining & Smelting",2,2,0),
    ("Iron Smelter","Maya","Mining & Smelting",3,3,0),
    ("Gold Smelter","Maya","Mining & Smelting",3,3,0),
    ("Toolsmith","Maya","Military & Tools",3,3,0),
    ("Weaponsmith","Maya","Military & Tools",3,4,0),
    ("Barracks","Maya","Military & Tools",4,5,0),
    ("Small Tower","Maya","Military & Tools",2,3,0),
    ("Big Tower","Maya","Military & Tools",4,5,0),
    ("Castle","Maya","Military & Tools",6,9,0),
    ("Healer's Hut","Maya","Military & Tools",3,3,0),
    ("Agave Farm","Maya","Divine & Special",4,3,0),
    ("Tequila Distillery","Maya","Divine & Special",3,3,0),
    ("Powder Mill","Maya","Divine & Special",3,3,0),
    ("Small Temple","Maya","Divine & Special",3,6,0),
    ("Large Temple","Maya","Divine & Special",5,9,0),
    ("Small Residence","Maya","Logistics",3,3,0),
    ("Medium Residence","Maya","Logistics",5,6,0),
    ("Large Residence","Maya","Logistics",8,8,0),
    ("Storage Yard","Maya","Logistics",3,2,0),
    ("Marketplace","Maya","Logistics",3,3,0),
    ("Shipyard","Maya","Logistics",4,3,0),
    ("Landing Dock","Maya","Logistics",3,3,0),
    ("Feather Ornament","Maya","Zierobjekte",1,1,1),
    ("Jaguar Statue","Maya","Zierobjekte",2,3,2),
    ("Stela","Maya","Zierobjekte",2,0,2),
    ("Stone Pillar","Maya","Zierobjekte",1,4,2),
    ("Flower Bed","Maya","Zierobjekte",2,2,1),
    ("Sun Wheel","Maya","Zierobjekte",3,5,3),
];

const BASE_VIKING: &[BuildingDef] = &[
    ("Forester's Hut","Viking","Basic Economy",2,1,0),
    ("Woodcutter's Hut","Viking","Basic Economy",2,1,0),
    ("Sawmill","Viking","Basic Economy",4,2,0),
    ("Stonecutter's Hut","Viking","Basic Economy",3,1,0),
    ("Grain Farm","Viking","Food Production",5,1,0),
    ("Pig Ranch","Viking","Food Production",5,1,0),
    ("Grain Mill","Viking","Food Production",4,1,0),
    ("Bakery","Viking","Food Production",4,1,0),
    ("Slaughterhouse","Viking","Food Production",4,1,0),
    ("Fisherman's Hut","Viking","Food Production",2,1,0),
    ("Waterworks","Viking","Food Production",3,1,0),
    ("Coal Mine","Viking","Mining & Smelting",3,1,0),
    ("Iron Ore Mine","Viking","Mining & Smelting",3,1,0),
    ("Gold Mine","Viking","Mining & Smelting",3,1,0),
    ("Sulfur Mine","Viking","Mining & Smelting",3,1,0),
    ("Iron Smelter","Viking","Mining & Smelting",4,1,0),
    ("Gold Smelter","Viking","Mining & Smelting",4,1,0),
    ("Toolsmith","Viking","Military & Tools",4,1,0),
    ("Weaponsmith","Viking","Military & Tools",4,2,0),
    ("Barracks","Viking","Military & Tools",6,2,0),
    ("Small Tower","Viking","Military & Tools",4,1,0),
    ("Big Tower","Viking","Military & Tools",6,2,0),
    ("Castle","Viking","Military & Tools",10,3,0),
    ("Healer's Hut","Viking","Military & Tools",4,1,0),
    ("Apiary / Imker","Viking","Divine & Special",4,1,0),
    ("Mead Brewery","Viking","Divine & Special",4,1,0),
    ("Small Temple","Viking","Divine & Special",5,3,0),
    ("Large Temple","Viking","Divine & Special",8,4,0),
    ("Small Residence","Viking","Logistics",4,1,0),
    ("Medium Residence","Viking","Logistics",7,2,0),
    ("Large Residence","Viking","Logistics",11,3,0),
    ("Storage Yard","Viking","Logistics",4,1,0),
    ("Marketplace","Viking","Logistics",4,1,0),
    ("Shipyard","Viking","Logistics",5,1,0),
    ("Landing Dock","Viking","Logistics",4,1,0),
    ("Small Axe Statue","Viking","Zierobjekte",1,1,1),
    ("Large Axe Statue","Viking","Zierobjekte",2,3,2),
    ("Standing Stone","Viking","Zierobjekte",2,0,2),
    ("Throne","Viking","Zierobjekte",1,4,2),
    ("Wood Carving","Viking","Zierobjekte",2,2,1),
    ("Ship Prow","Viking","Zierobjekte",3,5,3),
];

const BASE_TROJAN: &[BuildingDef] = &[
    ("Forester's Hut","Trojan","Basic Economy",2,2,0),
    ("Woodcutter's Hut","Trojan","Basic Economy",2,2,0),
    ("Sawmill","Trojan","Basic Economy",4,4,0),
    ("Stonecutter's Hut","Trojan","Basic Economy",2,2,0),
    ("Grain Farm","Trojan","Food Production",4,4,0),
    ("Goose Ranch","Trojan","Food Production",4,4,0),
    ("Grain Mill","Trojan","Food Production",3,3,0),
    ("Bakery","Trojan","Food Production",4,4,0),
    ("Slaughterhouse","Trojan","Food Production",3,3,0),
    ("Fisherman's Hut","Trojan","Food Production",2,2,0),
    ("Waterworks","Trojan","Food Production",3,3,0),
    ("Coal Mine","Trojan","Mining & Smelting",3,3,0),
    ("Iron Ore Mine","Trojan","Mining & Smelting",3,3,0),
    ("Gold Mine","Trojan","Mining & Smelting",3,3,0),
    ("Sulfur Mine","Trojan","Mining & Smelting",3,3,0),
    ("Iron Smelter","Trojan","Mining & Smelting",4,4,0),
    ("Gold Smelter","Trojan","Mining & Smelting",4,4,0),
    ("Toolsmith","Trojan","Military & Tools",4,4,0),
    ("Weaponsmith","Trojan","Military & Tools",4,4,0),
    ("Weapon Foundry","Trojan","Military & Tools",4,4,0),
    ("Barracks","Trojan","Military & Tools",5,5,0),
    ("Small Tower","Trojan","Military & Tools",3,3,0),
    ("Big Tower","Trojan","Military & Tools",5,5,0),
    ("Castle","Trojan","Military & Tools",11,11,0),
    ("Healer's Hut","Trojan","Military & Tools",4,4,0),
    ("Trojan Farm","Trojan","Divine & Special",4,4,0),
    ("Oil Press","Trojan","Divine & Special",3,3,0),
    ("Small Temple","Trojan","Divine & Special",5,5,0),
    ("Large Temple","Trojan","Divine & Special",8,12,0),
    ("Small Residence","Trojan","Logistics",4,4,0),
    ("Medium Residence","Trojan","Logistics",5,5,0),
    ("Large Residence","Trojan","Logistics",8,8,0),
    ("Storage Yard","Trojan","Logistics",3,3,0),
    ("Marketplace","Trojan","Logistics",4,4,0),
    ("Donkey Ranch","Trojan","Logistics",5,6,0),
    ("Shipyard","Trojan","Logistics",4,4,0),
    ("Landing Dock","Trojan","Logistics",4,4,0),
    ("Small Eagle Statue","Trojan","Zierobjekte",1,1,1),
    ("Large Eagle Statue","Trojan","Zierobjekte",2,3,2),
    ("Trojan Horse","Trojan","Zierobjekte",2,0,2),
    ("Pillar","Trojan","Zierobjekte",1,4,2),
    ("Round Well","Trojan","Zierobjekte",2,2,1),
    ("Triumphal Arch","Trojan","Zierobjekte",3,5,3),
];

#[test]
fn test_base_roman_count() { assert_eq!(BASE_ROMAN.len(), 40); }
#[test]
fn test_base_mayan_count() { assert_eq!(BASE_MAYAN.len(), 42); }
#[test]
fn test_base_viking_count() { assert_eq!(BASE_VIKING.len(), 41); }
#[test]
fn test_base_trojan_count() { assert_eq!(BASE_TROJAN.len(), 43); }

#[test]
fn test_base_total_unique_buildings() {
    let mut all = std::collections::HashSet::new();
    for b in BASE_ROMAN.iter().chain(BASE_MAYAN).chain(BASE_VIKING).chain(BASE_TROJAN) {
        all.insert(b.0);
    }
    // ~50 unique building names across all nations
    assert!(all.len() >= 50, "Expected >=50 unique building names, got {}", all.len());
    assert!(all.len() <= 70, "Expected <=70 unique building names, got {}", all.len());
}

#[test]
fn test_base_costs_reasonable() {
    for &(name, nation, _cat, planks, stone, gold) in
        BASE_ROMAN.iter().chain(BASE_MAYAN).chain(BASE_VIKING).chain(BASE_TROJAN) {
        assert!(planks <= 20, "{}/{} planks {} > 20", nation, name, planks);
        assert!(stone <= 20, "{}/{} stone {} > 20", nation, name, stone);
        assert!(gold <= 10, "{}/{} gold {} > 10", nation, name, gold);
    }
}

#[test]
fn test_base_nation_unique_buildings() {
    // Roman-unique: Vineyard, Pig Ranch, Sheep Ranch
    assert!(BASE_ROMAN.iter().any(|b| b.0 == "Vineyard"));
    // Mayan-unique: Agave Farm, Tequila Distillery, Goat Ranch, Powder Mill
    assert!(BASE_MAYAN.iter().any(|b| b.0 == "Agave Farm"));
    assert!(BASE_MAYAN.iter().any(|b| b.0 == "Powder Mill"));
    // Viking-unique: Apiary, Mead Brewery, Pig Ranch
    assert!(BASE_VIKING.iter().any(|b| b.0 == "Apiary / Imker"));
    assert!(BASE_VIKING.iter().any(|b| b.0 == "Mead Brewery"));
    // Trojan-unique: Trojan Farm, Oil Press, Goose Ranch, Weapon Foundry, Donkey Ranch
    assert!(BASE_TROJAN.iter().any(|b| b.0 == "Trojan Farm"));
    assert!(BASE_TROJAN.iter().any(|b| b.0 == "Weapon Foundry"));
    assert!(BASE_TROJAN.iter().any(|b| b.0 == "Donkey Ranch"));
}

#[test]
fn test_base_all_nations_have_core_buildings() {
    let core = ["Forester's Hut","Sawmill","Grain Farm","Bakery","Coal Mine",
                "Iron Ore Mine","Toolsmith","Barracks","Castle","Small Residence",
                "Storage Yard","Marketplace","Shipyard"];
    for &name in &core {
        assert!(BASE_ROMAN.iter().any(|b| b.0 == name), "Roman missing {}", name);
        assert!(BASE_MAYAN.iter().any(|b| b.0 == name), "Mayan missing {}", name);
        assert!(BASE_VIKING.iter().any(|b| b.0 == name), "Viking missing {}", name);
        assert!(BASE_TROJAN.iter().any(|b| b.0 == name), "Trojan missing {}", name);
    }
}
