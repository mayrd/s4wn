window.S4WN_CONFIG = {
  "buildings": [
    {
      "id": "Woodcutter's Hut",
      "category": "Basic Economy",
      "cost": {
        "plank": 2,
        "stone": 1
      },
      "inputs": [],
      "outputs": [
        "wood_log"
      ],
      "interval": 10,
      "build_time": 20,
      "tool": "Axe",
      "workers": 1,
      "icon": "icon_woodcutter.png",
      "name_de": "Holzfällerhütte"
    },
    {
      "id": "Sawmill",
      "category": "Basic Economy",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "wood_log"
      ],
      "outputs": [
        "plank"
      ],
      "interval": 15,
      "build_time": 30,
      "tool": "Saw",
      "workers": 1,
      "icon": "icon_sawmill.png",
      "name_de": "Sägewerk"
    },
    {
      "id": "Stonecutter's Hut",
      "category": "Basic Economy",
      "cost": {
        "plank": 2,
        "stone": 1
      },
      "inputs": [],
      "outputs": [
        "stone",
        "catapult_ammo"
      ],
      "interval": 12,
      "build_time": 20,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "icon_stonecutter.png",
      "name_de": "Steinmetzhütte"
    },
    {
      "id": "Grain Farm",
      "category": "Food Production",
      "cost": {
        "plank": 5,
        "stone": 2
      },
      "inputs": [],
      "outputs": [
        "grain"
      ],
      "interval": 20,
      "build_time": 40,
      "tool": "Scythe",
      "workers": 1,
      "icon": "icon_grainfarm.png",
      "name_de": "Getreidefarm"
    },
    {
      "id": "Grain Mill",
      "category": "Food Production",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "grain"
      ],
      "outputs": [
        "flour"
      ],
      "interval": 15,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_grainmill.png",
      "name_de": "Getreidemühle"
    },
    {
      "id": "Bakery",
      "category": "Food Production",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "flour",
        "water"
      ],
      "outputs": [
        "bread"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_bakery.png",
      "name_de": "Bäckerei"
    },
    {
      "id": "Waterworks",
      "category": "Food Production",
      "cost": {
        "plank": 3,
        "stone": 1
      },
      "inputs": [],
      "outputs": [
        "water"
      ],
      "interval": 10,
      "build_time": 20,
      "tool": "Bucket",
      "workers": 1,
      "icon": "icon_waterworks.png",
      "name_de": "Wasserwerk"
    },
    {
      "id": "Fisherman's Hut",
      "category": "Food Production",
      "cost": {
        "plank": 2,
        "stone": 1
      },
      "inputs": [],
      "outputs": [
        "fish"
      ],
      "interval": 15,
      "build_time": 20,
      "tool": "Fishing Rod",
      "workers": 1,
      "icon": "icon_fisherman.png",
      "name_de": "Fischerhütte"
    },
    {
      "id": "Slaughterhouse",
      "category": "Food Production",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "pig"
      ],
      "outputs": [
        "meat"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": "Axe",
      "workers": 1,
      "icon": "icon_slaughterhouse.png",
      "name_de": "Metzgerei"
    },
    {
      "id": "Pig Ranch",
      "category": "Food Production",
      "cost": {
        "plank": 5,
        "stone": 2
      },
      "inputs": [
        "grain",
        "water"
      ],
      "outputs": [
        "pig"
      ],
      "interval": 30,
      "build_time": 40,
      "tool": null,
      "workers": 1,
      "icon": "icon_pigranch.png",
      "name_de": "Schweinezucht"
    },
    {
      "id": "Sheep Ranch",
      "category": "Food Production",
      "cost": {
        "plank": 5,
        "stone": 2
      },
      "inputs": [
        "grain",
        "water"
      ],
      "outputs": [
        "sheep"
      ],
      "interval": 30,
      "build_time": 40,
      "tool": null,
      "workers": 1,
      "icon": "icon_sheepranch.png",
      "name_de": "Schafzucht"
    },
    {
      "id": "Goat Ranch",
      "category": "Food Production",
      "cost": {
        "plank": 5,
        "stone": 2
      },
      "inputs": [
        "grain",
        "water"
      ],
      "outputs": [
        "goat"
      ],
      "interval": 30,
      "build_time": 40,
      "tool": null,
      "workers": 1,
      "icon": "icon_goatranch.png",
      "name_de": "Ziegenzucht"
    },
    {
      "id": "Goose Ranch",
      "category": "Food Production",
      "cost": {
        "plank": 5,
        "stone": 2
      },
      "inputs": [
        "grain",
        "water"
      ],
      "outputs": [
        "goose"
      ],
      "interval": 30,
      "build_time": 40,
      "tool": null,
      "workers": 1,
      "icon": "icon_gooseranch.png",
      "name_de": "Gänsezucht"
    },
    {
      "id": "Donkey Ranch",
      "category": "Logistics",
      "cost": {
        "plank": 5,
        "stone": 6
      },
      "inputs": [
        "grain",
        "water"
      ],
      "outputs": [
        "donkey"
      ],
      "interval": 30,
      "build_time": 40,
      "tool": null,
      "workers": 1,
      "icon": "icon_donkeyranch.png",
      "name_de": "Eselzucht"
    },
    {
      "id": "Coal Mine",
      "category": "Mining & Smelting",
      "cost": {
        "plank": 3,
        "stone": 1
      },
      "inputs": [
        "bread"
      ],
      "outputs": [
        "coal_ore"
      ],
      "interval": 15,
      "build_time": 30,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "icon_coalmine.png",
      "name_de": "Kohlemine"
    },
    {
      "id": "Iron Ore Mine",
      "category": "Mining & Smelting",
      "cost": {
        "plank": 3,
        "stone": 1
      },
      "inputs": [
        "meat"
      ],
      "outputs": [
        "iron_ore"
      ],
      "interval": 15,
      "build_time": 30,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "icon_ironmine.png",
      "name_de": "Eisenmine"
    },
    {
      "id": "Gold Mine",
      "category": "Mining & Smelting",
      "cost": {
        "plank": 3,
        "stone": 1
      },
      "inputs": [
        "fish"
      ],
      "outputs": [
        "gold_ore"
      ],
      "interval": 15,
      "build_time": 30,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "icon_goldmine.png",
      "name_de": "Goldmine"
    },
    {
      "id": "Sulfur Mine",
      "category": "Mining & Smelting",
      "cost": {
        "plank": 3,
        "stone": 1
      },
      "inputs": [
        "fish"
      ],
      "outputs": [
        "sulfur_ore"
      ],
      "interval": 15,
      "build_time": 30,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "icon_sulfurmine.png",
      "name_de": "Schwefelmine"
    },
    {
      "id": "Iron Smelter",
      "category": "Mining & Smelting",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "iron_ore",
        "coal_ore"
      ],
      "outputs": [
        "iron_bar"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_ironsmelter.png",
      "name_de": "Eisenschmelze"
    },
    {
      "id": "Gold Smelter",
      "category": "Mining & Smelting",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "gold_ore",
        "coal_ore"
      ],
      "outputs": [
        "gold_bar"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_goldsmelter.png",
      "name_de": "Goldschmelze"
    },
    {
      "id": "Toolsmith",
      "category": "Military & Tools",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [
        "iron_bar",
        "coal_ore"
      ],
      "outputs": [
        "hammer",
        "pickaxe",
        "axe",
        "saw",
        "shovel",
        "scythe",
        "fishing_rod"
      ],
      "interval": 25,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_toolsmith.png",
      "name_de": "Werkzeugschmiede"
    },
    {
      "id": "Weaponsmith",
      "category": "Military & Tools",
      "cost": {
        "plank": 4,
        "stone": 3
      },
      "inputs": [
        "iron_bar",
        "coal_ore"
      ],
      "outputs": [
        "sword",
        "bow",
        "armor",
        "spear",
        "battleaxe",
        "blowgun",
        "backpack_catapult"
      ],
      "interval": 25,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_weaponsmith.png",
      "name_de": "Waffenschmiede"
    },
    {
      "id": "Vineyard",
      "category": "Divine & Special",
      "cost": {
        "plank": 4,
        "stone": 2
      },
      "inputs": [],
      "outputs": [
        "grapes",
        "wine"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_vineyard.png",
      "name_de": "Winzerhütte"
    },
    {
      "id": "Apiary",
      "category": "Divine & Special",
      "cost": {
        "plank": 4,
        "stone": 1
      },
      "inputs": [],
      "outputs": [
        "honey"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_apiary.png",
      "name_de": "Imkerei"
    },
    {
      "id": "Mead Brewery",
      "category": "Divine & Special",
      "cost": {
        "plank": 4,
        "stone": 1
      },
      "inputs": [
        "honey"
      ],
      "outputs": [
        "mead"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_meadbrewery.png",
      "name_de": "Metbrauerei"
    },
    {
      "id": "Agave Farm",
      "category": "Divine & Special",
      "cost": {
        "plank": 4,
        "stone": 3
      },
      "inputs": [],
      "outputs": [
        "agave"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_agavefarm.png",
      "name_de": "Agavenfarm"
    },
    {
      "id": "Tequila Distillery",
      "category": "Divine & Special",
      "cost": {
        "plank": 3,
        "stone": 3
      },
      "inputs": [
        "agave"
      ],
      "outputs": [
        "tequila"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_tequiladiastillery.png",
      "name_de": "Schnapsbrennerei"
    },
    {
      "id": "Trojan Farm",
      "category": "Divine & Special",
      "cost": {
        "plank": 4,
        "stone": 4
      },
      "inputs": [],
      "outputs": [
        "sunflower"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_trojanfarm.png",
      "name_de": "Trojanische Farm"
    },
    {
      "id": "Oil Press",
      "category": "Divine & Special",
      "cost": {
        "plank": 3,
        "stone": 3
      },
      "inputs": [
        "sunflower"
      ],
      "outputs": [
        "sunflower_oil"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_oilpress.png",
      "name_de": "Ölmühle"
    },
    {
      "id": "Powder Mill",
      "category": "Divine & Special",
      "cost": {
        "plank": 3,
        "stone": 3
      },
      "inputs": [
        "sulfur_ore",
        "coal_ore"
      ],
      "outputs": [
        "gunpowder"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_powdermill.png",
      "name_de": "Pulvermühle"
    },
    {
      "id": "Weapon Foundry",
      "category": "Military & Tools",
      "cost": {
        "plank": 4,
        "stone": 4
      },
      "inputs": [
        "iron_bar",
        "sulfur_ore"
      ],
      "outputs": [
        "explosive_arrow"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": null,
      "workers": 1,
      "icon": "icon_weaponfoundry.png",
      "name_de": "Waffengießerei"
    },
    {
      "id": "Storage Yard",
      "category": "Logistics",
      "cost": {
        "plank": 4,
        "stone": 1
      },
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "icon_storage_yard.png",
      "name_de": "Lagerplatz"
    }
  ],
  "resources": [
    {
      "id": "wood_log",
      "category": "raw",
      "icon": "icon_wood_log.png",
      "name_de": "Baumstamm"
    },
    {
      "id": "plank",
      "category": "processed",
      "icon": "icon_plank.png",
      "name_de": "Holz / Brett"
    },
    {
      "id": "stone",
      "category": "raw",
      "icon": "icon_stone.png",
      "name_de": "Stein"
    },
    {
      "id": "coal_ore",
      "category": "raw",
      "icon": "icon_coal_ore.png",
      "name_de": "Kohle"
    },
    {
      "id": "iron_ore",
      "category": "raw",
      "icon": "icon_iron_ore.png",
      "name_de": "Eisenerz"
    },
    {
      "id": "gold_ore",
      "category": "raw",
      "icon": "icon_gold_ore.png",
      "name_de": "Golderz"
    },
    {
      "id": "sulfur_ore",
      "category": "raw",
      "icon": "icon_sulfur_ore.png",
      "name_de": "Schwefel"
    },
    {
      "id": "iron_bar",
      "category": "processed",
      "icon": "icon_iron_bar.png",
      "name_de": "Eisenbarren"
    },
    {
      "id": "gold_bar",
      "category": "processed",
      "icon": "icon_gold_bar.png",
      "name_de": "Goldbarren"
    },
    {
      "id": "water",
      "category": "raw",
      "icon": "icon_water.png",
      "name_de": "Wasser"
    },
    {
      "id": "grain",
      "category": "raw",
      "icon": "icon_grain.png",
      "name_de": "Getreide"
    },
    {
      "id": "flour",
      "category": "processed",
      "icon": "icon_flour.png",
      "name_de": "Mehl"
    },
    {
      "id": "fish",
      "category": "raw",
      "icon": "icon_fish.png",
      "name_de": "Fisch"
    },
    {
      "id": "bread",
      "category": "processed",
      "icon": "icon_bread.png",
      "name_de": "Brot"
    },
    {
      "id": "meat",
      "category": "processed",
      "icon": "icon_meat.png",
      "name_de": "Fleisch"
    },
    {
      "id": "pig",
      "category": "raw",
      "icon": "icon_pig.png",
      "name_de": "Schwein"
    },
    {
      "id": "sheep",
      "category": "raw",
      "icon": "icon_sheep.png",
      "name_de": "Schaf"
    },
    {
      "id": "goat",
      "category": "raw",
      "icon": "icon_goat.png",
      "name_de": "Ziege"
    },
    {
      "id": "goose",
      "category": "raw",
      "icon": "icon_goose.png",
      "name_de": "Gans"
    },
    {
      "id": "donkey",
      "category": "raw",
      "icon": "icon_donkey.png",
      "name_de": "Esel"
    },
    {
      "id": "grapes",
      "category": "raw",
      "icon": "icon_grapes.png",
      "name_de": "Trauben"
    },
    {
      "id": "wine",
      "category": "processed",
      "icon": "icon_wine.png",
      "name_de": "Wein"
    },
    {
      "id": "honey",
      "category": "raw",
      "icon": "icon_honey.png",
      "name_de": "Honig"
    },
    {
      "id": "mead",
      "category": "processed",
      "icon": "icon_mead.png",
      "name_de": "Met"
    },
    {
      "id": "agave",
      "category": "raw",
      "icon": "icon_agave.png",
      "name_de": "Agave"
    },
    {
      "id": "tequila",
      "category": "processed",
      "icon": "icon_tequila.png",
      "name_de": "Tequila / Schnaps"
    },
    {
      "id": "sunflower",
      "category": "raw",
      "icon": "icon_sunflower.png",
      "name_de": "Sonnenblume"
    },
    {
      "id": "sunflower_oil",
      "category": "processed",
      "icon": "icon_sunflower_oil.png",
      "name_de": "Sonnenblumenöl"
    },
    {
      "id": "hammer",
      "category": "processed",
      "icon": "icon_hammer.png",
      "name_de": "Hammer"
    },
    {
      "id": "pickaxe",
      "category": "processed",
      "icon": "icon_pickaxe.png",
      "name_de": "Spitzhacke"
    },
    {
      "id": "axe",
      "category": "processed",
      "icon": "icon_axe.png",
      "name_de": "Axt"
    },
    {
      "id": "saw",
      "category": "processed",
      "icon": "icon_saw.png",
      "name_de": "Säge"
    },
    {
      "id": "shovel",
      "category": "processed",
      "icon": "icon_shovel.png",
      "name_de": "Schaufel"
    },
    {
      "id": "scythe",
      "category": "processed",
      "icon": "icon_scythe.png",
      "name_de": "Sense"
    },
    {
      "id": "fishing_rod",
      "category": "processed",
      "icon": "icon_fishing_rod.png",
      "name_de": "Angel"
    },
    {
      "id": "sword",
      "category": "processed",
      "icon": "icon_sword.png",
      "name_de": "Schwert"
    },
    {
      "id": "bow",
      "category": "processed",
      "icon": "icon_bow.png",
      "name_de": "Bogen"
    },
    {
      "id": "armor",
      "category": "processed",
      "icon": "icon_armor.png",
      "name_de": "Rüstung"
    },
    {
      "id": "spear",
      "category": "processed",
      "icon": "icon_spear.png",
      "name_de": "Speer"
    },
    {
      "id": "battleaxe",
      "category": "processed",
      "icon": "icon_battleaxe.png",
      "name_de": "Streitaxt"
    },
    {
      "id": "blowgun",
      "category": "processed",
      "icon": "icon_blowgun.png",
      "name_de": "Blasrohr"
    },
    {
      "id": "backpack_catapult",
      "category": "processed",
      "icon": "icon_backpack_catapult.png",
      "name_de": "Rucksack-Katapult"
    },
    {
      "id": "gunpowder",
      "category": "processed",
      "icon": "icon_gunpowder.png",
      "name_de": "Schießpulver"
    },
    {
      "id": "explosive_arrow",
      "category": "processed",
      "icon": "icon_explosive_arrow.png",
      "name_de": "Explosivpfeil"
    },
    {
      "id": "catapult_ammo",
      "category": "processed",
      "icon": "icon_catapult_ammo.png",
      "name_de": "Munition"
    }
  ],
  "terrain": [
    {
      "id": 0,
      "name": "Grass",
      "name_de": "Grasland",
      "color": "#7cfc00",
      "buildable": true,
      "passable": true
    },
    {
      "id": 1,
      "name": "Forest",
      "name_de": "Wald",
      "color": "#228b22",
      "buildable": false,
      "passable": true
    },
    {
      "id": 2,
      "name": "Desert",
      "name_de": "Wüste",
      "color": "#edc9af",
      "buildable": true,
      "passable": true
    },
    {
      "id": 3,
      "name": "Snow",
      "name_de": "Schnee",
      "color": "#ffffff",
      "buildable": true,
      "passable": true
    },
    {
      "id": 4,
      "name": "Mountain",
      "name_de": "Gebirge",
      "color": "#808080",
      "buildable": false,
      "passable": false
    },
    {
      "id": 5,
      "name": "Shallow Water",
      "name_de": "Flachwasser",
      "color": "#add8e6",
      "buildable": false,
      "passable": true
    },
    {
      "id": 6,
      "name": "Deep Water",
      "name_de": "Tiefwasser",
      "color": "#00008b",
      "buildable": false,
      "passable": false
    },
    {
      "id": 7,
      "name": "Swamp",
      "name_de": "Sumpf",
      "color": "#556b2f",
      "buildable": false,
      "passable": true
    }
  ],
  "units": [
    {
      "id": "Settler",
      "name_de": "Siedler",
      "hp": 10,
      "speed": 1.0,
      "attack": 0,
      "defense": 0,
      "range": 0,
      "icon": "icon_settler.png"
    },
    {
      "id": "Swordsman",
      "name_de": "Schwertkämpfer",
      "hp": 20,
      "speed": 1.2,
      "attack": 5,
      "defense": 3,
      "range": 0,
      "icon": "icon_swordsman.png"
    },
    {
      "id": "Bowman",
      "name_de": "Bogenschütze",
      "hp": 15,
      "speed": 1.1,
      "attack": 4,
      "defense": 1,
      "range": 5,
      "icon": "icon_bowman.png"
    }
  ],
  "nations": [
    {
      "id": "Roman",
      "name_de": "Römer",
      "color": "#FFD700",
      "emoji": "🏛️",
      "description": "The classic empire.",
      "production": {},
      "cost": {},
      "units": {},
      "special": {},
      "unique_buildings": []
    },
    {
      "id": "Viking",
      "name_de": "Wikinger",
      "color": "#C0C0C0",
      "emoji": "🛡️",
      "description": "Raiders from the north.",
      "production": {},
      "cost": {},
      "units": {},
      "special": {},
      "unique_buildings": []
    },
    {
      "id": "Maya",
      "name_de": "Maya",
      "color": "#32CD32",
      "emoji": "🌴",
      "description": "Masters of the jungle.",
      "production": {},
      "cost": {},
      "units": {},
      "special": {},
      "unique_buildings": []
    },
    {
      "id": "Trojan",
      "name_de": "Trojaner",
      "color": "#FF4500",
      "emoji": "🐎",
      "description": "Defenders of the city.",
      "production": {},
      "cost": {},
      "units": {},
      "special": {},
      "unique_buildings": []
    },
    {
      "id": "Dark Tribe",
      "name_de": "Dunkler Stamm",
      "color": "#4B0082",
      "emoji": "🌑",
      "description": "The shadow corruption.",
      "production": {},
      "cost": {},
      "units": {},
      "special": {},
      "unique_buildings": []
    }
  ],
  "categories": {
    "Basic Economy": [
      "Woodcutter's Hut",
      "Sawmill",
      "Stonecutter's Hut"
    ],
    "Food Production": [
      "Grain Farm",
      "Grain Mill",
      "Bakery",
      "Waterworks",
      "Fisherman's Hut",
      "Slaughterhouse",
      "Pig Ranch",
      "Sheep Ranch",
      "Goat Ranch",
      "Goose Ranch"
    ],
    "Mining & Smelting": [
      "Coal Mine",
      "Iron Ore Mine",
      "Gold Mine",
      "Sulfur Mine",
      "Iron Smelter",
      "Gold Smelter"
    ],
    "Military & Tools": [
      "Toolsmith",
      "Weaponsmith",
      "Weapon Foundry"
    ],
    "Logistics": [
      "Donkey Ranch",
      "Storage Yard"
    ],
    "Divine & Special": [
      "Vineyard",
      "Apiary",
      "Mead Brewery",
      "Agave Farm",
      "Tequila Distillery",
      "Trojan Farm",
      "Oil Press",
      "Powder Mill"
    ]
  }
};

(function() {
    const C = window.S4WN_CONFIG;
    window.BUILDING_ICONS = {};
    C.buildings.forEach(b => { window.BUILDING_ICONS[b.id] = b.icon; });
    window.BUILDING_NAMES_DE = {};
    C.buildings.forEach(b => { window.BUILDING_NAMES_DE[b.id] = b.name_de; });
    window.RESOURCE_ICONS = {};
    C.resources.forEach(r => { window.RESOURCE_ICONS[r.id] = r.icon; });
    window.RESOURCE_NAMES_DE = {};
    C.resources.forEach(r => { window.RESOURCE_NAMES_DE[r.id] = r.name_de; });
    window.RESOURCE_ORDER = C.resources.map(r => r.id);
    window.TERRAIN_BY_ID = C.terrain;
    window.TERRAIN_NAMES_DE = {};
    C.terrain.forEach(t => { window.TERRAIN_NAMES_DE[t.name] = t.name_de; });
    window.TERRAIN_NAMES = C.terrain.map(t => t.name.toLowerCase());
    window.UNIT_NAMES_DE = {};
    C.units.forEach(u => { window.UNIT_NAMES_DE[u.id] = u.name_de; });
    window.BUILDING_CATEGORIES = C.categories;
    window.UNIT_STATS = {};
    C.units.forEach(u => { window.UNIT_STATS[u.id] = u; });
    window.NATION_CONFIG = {};
    C.nations.forEach(n => { window.NATION_CONFIG[n.id] = n; });
    window.RESOURCE_NAMES = [null, "IronOre", "Coal", "Gold", "Stone", "Sulfur", "Fish", "Meat", "Grain"];
    
    // BUILDING_DISCRIMINANT_BY_CONFIG_ID — config ID → BuildingType discriminant
    // 45 of 69 config buildings mapped; 24 decorative (Zierobjekte) not in Rust enum
    window.BUILDING_DISCRIMINANT_BY_CONFIG_ID = {
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
    };

    // Map UI config resource IDs → Rust ResourceType discriminants
    // Used to bridge config-driven resource panels with engine data
    window.RESOURCE_DISCRIMINANT_BY_CONFIG_ID = {
        "WoodLog": 0, "Stone": 1, "IronOre": 2, "CoalOre": 3, "GoldOre": 4,
        "SulfurOre": 5, "Fish": 6, "Grain": 7, "Meat": 8, "Water": 9,
        "Honey": 12, "PlankWood": 16, "Flour": 22, "Bread": 20,
        "IronBar": 23, "Mead": 27, "Wine": 28
    };

    window.NATION_DISCRIMINANT_BY_ID = {
        "roman": 0, "viking": 1, "mayan": 2, "trojan": 3, "dark": 4
    };

    window.NATION_NAMES_BY_ID = {
        0: "Roman", 1: "Viking", 2: "Maya", 3: "Trojan", 4: "Dark Tribe"
    };

    window.UNIT_NAMES_BY_ID = {
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
    };

    // Unit state names indexed by u8 discriminant (0=Idle..7=Dead)
    window.UNIT_STATE_NAMES_BY_ID = [
        "Idle", "Moving", "Working", "Fighting",
        "Patrolling", "FormationMove", "Dying", "Dead"
    ];

    // Category translations (DE)
    window.CATEGORY_NAMES_DE = {
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
    };

    console.log("S4WN config loaded:", C.buildings.length, "buildings,", C.resources.length, "resources,", C.terrain.length, "terrain,", C.units.length, "units,", C.nations.length, "nations");
})();
