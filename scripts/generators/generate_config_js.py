#!/usr/bin/env python3
"""
Generate engine/config/data.js from JSON config files.

Reads:  engine/config/buildings.json, resources.json, terrain.json,
        units.json, nations.json, categories.json
Writes: engine/config/data.js (window.S4WN_CONFIG + lookup maps)

Run after any config JSON edit.
"""

import json
from pathlib import Path

CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "engine" / "config"

def main():
    if not CONFIG_DIR.exists():
        print(f"Error: Config directory '{CONFIG_DIR}' does not exist.")
        return

    with open(CONFIG_DIR / "buildings.json", encoding="utf-8") as f: buildings = json.load(f)
    with open(CONFIG_DIR / "resources.json", encoding="utf-8") as f: resources = json.load(f)
    with open(CONFIG_DIR / "terrain.json", encoding="utf-8") as f: terrain = json.load(f)
    with open(CONFIG_DIR / "units.json", encoding="utf-8") as f: units = json.load(f)
    with open(CONFIG_DIR / "nations.json", encoding="utf-8") as f: nations = json.load(f)
    with open(CONFIG_DIR / "categories.json", encoding="utf-8") as f: categories = json.load(f)

    js = "window.S4WN_CONFIG = " + json.dumps({
        "buildings": buildings, "resources": resources, "terrain": terrain,
        "units": units, "nations": nations, "categories": categories
    }, indent=2, ensure_ascii=False) + ";\n\n"

    # RESOURCE_NAMES for binary .map parser: indexed by map resource ID (0-7)
    # S4 map deposits: 0=Nothing,1=Iron,2=Coal,3=Gold,4=Stone,5=Sulfur,6=Fish,7=Game,8=Grain
    resource_names_list = [None, 'IronOre', 'Coal', 'Gold', 'Stone', 'Sulfur', 'Fish', 'Meat', 'Grain']

    js += f"""(function() {{
    const C = window.S4WN_CONFIG;
    window.BUILDING_ICONS = {{}};
    C.buildings.forEach(b => {{ window.BUILDING_ICONS[b.id] = b.icon; }});
    window.BUILDING_NAMES_DE = {{}};
    C.buildings.forEach(b => {{ window.BUILDING_NAMES_DE[b.id] = b.name_de; }});
    window.RESOURCE_ICONS = {{}};
    C.resources.forEach(r => {{ window.RESOURCE_ICONS[r.id] = r.icon; }});
    window.RESOURCE_NAMES_DE = {{}};
    C.resources.forEach(r => {{ window.RESOURCE_NAMES_DE[r.id] = r.name_de; }});
    window.RESOURCE_ORDER = C.resources.map(r => r.id);
    window.TERRAIN_BY_ID = C.terrain;
    window.TERRAIN_NAMES_DE = {{}};
    C.terrain.forEach(t => {{ window.TERRAIN_NAMES_DE[t.name] = t.name_de; }});
    window.TERRAIN_NAMES = C.terrain.map(t => t.name.toLowerCase());
    window.UNIT_NAMES_DE = {{}};
    C.units.forEach(u => {{ window.UNIT_NAMES_DE[u.id] = u.name_de; }});
    window.BUILDING_CATEGORIES = C.categories;
    window.UNIT_STATS = {{}};
    C.units.forEach(u => {{ window.UNIT_STATS[u.id] = u; }});
    window.NATION_CONFIG = {{}};
    C.nations.forEach(n => {{ window.NATION_CONFIG[n.id] = n; }});
    window.RESOURCE_NAMES = {json.dumps(resource_names_list)};
    
    // BUILDING_DISCRIMINANT_BY_CONFIG_ID — config ID → BuildingType discriminant
    // 45 of 69 config buildings mapped; 24 decorative (Zierobjekte) not in Rust enum
    window.BUILDING_DISCRIMINANT_BY_CONFIG_ID = {{
        "AgaveFarm": 41, "ApiaryImker": 27, "Bakery": 7, "Barracks": 16,
        "BigTower": 19, "Castle": 0, "CoalMine": 62, "DonkeyRanch": 76,
        "FishermansHut": 11, "ForestersHut": 71, "GoatRanch": 73, "GoldMine": 61,
        "GoldSmelter": 65, "GooseRanch": 75, "GrainFarm": 10, "GrainMill": 9,
        "HealersHut": 72, "IronOreMine": 63, "IronSmelter": 66, "LandingDock": 79,
        "LargeResidence": 84, "LargeTemple": 86, "Marketplace": 78, "MeadBrewery": 28,
        "MediumResidence": 83, "OilPress": 68, "PigRanch": 74, "PowderMill": 69,
        "RoundWell": 14, "Sawmill": 1, "Shipyard": 21, "Slaughterhouse": 67,
        "SmallResidence": 82, "SmallTemple": 85, "SmallTower": 18,
        "StonecuttersHut": 2, "StorageYard": 81, "SulfurMine": 64, "Toolsmith": 4,
        "TrojanFarm": 77, "Vineyard": 80, "Waterworks": 14, "WeaponFoundry": 70,
        "Weaponsmith": 5, "WoodcuttersHut": 12
    }};

    // Map UI config resource IDs → Rust ResourceType discriminants
    // Used to bridge config-driven resource panels with engine data
    window.RESOURCE_DISCRIMINANT_BY_CONFIG_ID = {{
        "WoodLog": 0, "Stone": 1, "IronOre": 2, "CoalOre": 3, "GoldOre": 4,
        "SulfurOre": 5, "Fish": 6, "Grain": 7, "Meat": 8, "Water": 9,
        "Honey": 12, "PlankWood": 16, "Flour": 22, "Bread": 20,
        "IronBar": 23, "Mead": 27, "Wine": 28
    }};

    window.NATION_DISCRIMINANT_BY_ID = {{
        "roman": 0, "viking": 1, "mayan": 2, "trojan": 3, "dark": 4
    }};

    window.NATION_NAMES_BY_ID = {{
        0: "Roman", 1: "Viking", 2: "Maya", 3: "Trojan", 4: "Dark Tribe"
    }};

    window.UNIT_NAMES_BY_ID = {{
        0: "Settler",        1: "Swordsman",        2: "Bowman",        3: "Pioneer",        4: "Geologist",
        5: "Thief",        6: "Gardener",        7: "Carrier",        8: "Digger",        9: "Builder",
        10: "Forester",        11: "Woodcutter",        12: "Sawyer",        13: "Stonecutter",        14: "Miner",
        15: "Smelter",        16: "ToolsmithWorker",        17: "WeaponsmithWorker",        18: "Farmer",        19: "Miller",
        20: "Baker",        21: "WaterWorker",        22: "AnimalBreeder",        23: "Butcher",        24: "Fisherman",
        25: "Trader",        26: "Shipwright",        27: "Healer",        28: "Priest",        29: "SquadLeader",
        30: "Vintner",        31: "Medic",        32: "AgaveFarmer",        33: "TequilaDistiller",        34: "PowderMaker",
        35: "BlowgunWarrior",        36: "Beekeeper",        37: "MeadBrewer",        38: "AxeWarrior",        39: "SunflowerFarmer",
        40: "OilMiller",        41: "WeaponFoundryWorker",        42: "BackpackCatapultist",        43: "DarkDigger",        44: "DarkFarmer",
        45: "Cultist",        46: "Shaman",        47: "ShadowSoldier"
    }};

    // Unit state names indexed by u8 discriminant (0=Idle..7=Dead)
    window.UNIT_STATE_NAMES_BY_ID = [
        "Idle", "Moving", "Working", "Fighting",
        "Patrolling", "FormationMove", "Dying", "Dead"
    ];

    // Category translations (DE)
    window.CATEGORY_NAMES_DE = {{
        // Buildings
        'Basic Economy': 'Basiswirtschaft',
        'Food Production': 'Nahrungsproduktion',
        'Mining & Smelting': 'Bergbau & Verhüttung',
        'Military & Tools': 'Militär & Werkzeuge',
        'Divine & Special': 'Göttlich & Spezial',
        'Logistics': 'Logistik',
        'Zierobjekte': 'Zierobjekte',
        // Resources
        'Construction': 'Baumaterial',
        'Raw Ores': 'Roherze',
        'Smelted Metals': 'Verhüttete Metalle',
        'Food & Crops': 'Nahrung & Feldfrüchte',
        'Livestock': 'Vieh',
        'Alcohol & Mana': 'Alkohol & Mana',
        'Tools': 'Werkzeuge',
        'Weapons': 'Waffen',
        'Munitions': 'Munition',
        // Settlers
        'Specialist': 'Spezialist',
        'Basic Economy': 'Basiswirtschaft',
        'Food & Crops': 'Nahrung & Feldfrüchte',
        'Heavy Industry': 'Schwerindustrie',
        'Mining': 'Bergbau',
        'Medical': 'Medizin',
        'Military': 'Militär',
        'Military (Special)': 'Militär (Spezial)',
        'Dark Tribe (NPC)': 'Dunkler Stamm (NPC)',
        'Sacrificial Wine': 'Opferwein',
        'Sacrificial Liquor': 'Opferschnaps',
        'Sacrificial Mead': 'Opfermet',
        'Sacrificial Oil': 'Opferöl',
        'Specialist Craft': 'Spezialhandwerk',
    }};

    console.log("S4WN config loaded:", C.buildings.length, "buildings,", C.resources.length, "resources,", C.terrain.length, "terrain,", C.units.length, "units,", C.nations.length, "nations");
}})();
"""

    out = CONFIG_DIR / "data.js"
    with open(out, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"Generated {out.name} ({len(js)} bytes)")

if __name__ == '__main__':
    main()
