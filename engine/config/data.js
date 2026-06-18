window.S4WN_CONFIG = {
  "buildings": [
    {
      "id": "Castle",
      "category": "Infrastructure",
      "cost": {
        "Wood": 0,
        "Stone": 0
      },
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏰",
      "name_de": "Burg"
    },
    {
      "id": "Sawmill",
      "category": "Raw Materials",
      "cost": {
        "Wood": 5,
        "Stone": 3
      },
      "inputs": [
        "Wood"
      ],
      "outputs": [
        "Boards"
      ],
      "interval": 20,
      "build_time": 30,
      "tool": "Saw",
      "workers": 1,
      "icon": "🪚",
      "name_de": "Sägewerk"
    },
    {
      "id": "Stonecutter",
      "category": "Raw Materials",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [],
      "outputs": [
        "Stone"
      ],
      "interval": 30,
      "build_time": 25,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "🪨",
      "name_de": "Steinmetz"
    },
    {
      "id": "Mine",
      "category": "Raw Materials",
      "cost": {
        "Wood": 5,
        "Stone": 3
      },
      "inputs": [],
      "outputs": [
        "IronOre",
        "Coal",
        "Gold",
        "Sulfur"
      ],
      "interval": 40,
      "build_time": 35,
      "tool": "Pickaxe",
      "workers": 1,
      "icon": "⛏️",
      "name_de": "Mine"
    },
    {
      "id": "Toolsmith",
      "category": "Processing",
      "cost": {
        "Wood": 5,
        "Stone": 5
      },
      "inputs": [
        "IronOre",
        "Coal"
      ],
      "outputs": [
        "Tools"
      ],
      "interval": 30,
      "build_time": 35,
      "tool": "Hammer",
      "workers": 1,
      "icon": "🔨",
      "name_de": "Werkzeugschmiede"
    },
    {
      "id": "Weaponsmith",
      "category": "Processing",
      "cost": {
        "Wood": 5,
        "Stone": 5
      },
      "inputs": [
        "IronOre",
        "Coal",
        "Tools"
      ],
      "outputs": [
        "Weapons"
      ],
      "interval": 50,
      "build_time": 40,
      "tool": "Hammer",
      "workers": 1,
      "icon": "⚔️",
      "name_de": "Waffenschmiede"
    },
    {
      "id": "Bakery",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [
        "Flour",
        "Water"
      ],
      "outputs": [
        "Bread"
      ],
      "interval": 20,
      "build_time": 20,
      "tool": "Rolling Pin",
      "workers": 1,
      "icon": "🍞",
      "name_de": "Bäckerei"
    },
    {
      "id": "Butcher",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [],
      "outputs": [
        "Meat"
      ],
      "interval": 30,
      "build_time": 25,
      "tool": "Cleaver",
      "workers": 1,
      "icon": "🔪",
      "name_de": "Schlachthaus"
    },
    {
      "id": "Mill",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 3
      },
      "inputs": [
        "Grain"
      ],
      "outputs": [
        "Flour"
      ],
      "interval": 25,
      "build_time": 25,
      "tool": "Rolling Pin",
      "workers": 1,
      "icon": "🏭",
      "name_de": "Mühle"
    },
    {
      "id": "Farm",
      "category": "Food",
      "cost": {
        "Wood": 3,
        "Stone": 1
      },
      "inputs": [],
      "outputs": [
        "Grain"
      ],
      "interval": 20,
      "build_time": 20,
      "tool": null,
      "workers": 1,
      "icon": "🌾",
      "name_de": "Getreidefarm"
    },
    {
      "id": "Fisherman",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 1
      },
      "inputs": [],
      "outputs": [
        "Fish"
      ],
      "interval": 20,
      "build_time": 20,
      "tool": "Fishing Rod",
      "workers": 1,
      "icon": "🎣",
      "name_de": "Fischerhütte"
    },
    {
      "id": "Woodcutter",
      "category": "Raw Materials",
      "cost": {
        "Wood": 3,
        "Stone": 1
      },
      "inputs": [],
      "outputs": [
        "Wood"
      ],
      "interval": 15,
      "build_time": 15,
      "tool": "Axe",
      "workers": 1,
      "icon": "🪓",
      "name_de": "Holzfällerhütte"
    },
    {
      "id": "Storehouse",
      "category": "Infrastructure",
      "cost": {
        "Wood": 4,
        "Stone": 4
      },
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏚️",
      "name_de": "Lagerhaus"
    },
    {
      "id": "Waterworks",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 3
      },
      "inputs": [],
      "outputs": [
        "Water"
      ],
      "interval": 30,
      "build_time": 30,
      "tool": "Bucket",
      "workers": 1,
      "icon": "💧",
      "name_de": "Wasserwerk"
    },
    {
      "id": "Smelter",
      "category": "Raw Materials",
      "cost": {
        "Wood": 5,
        "Stone": 5
      },
      "inputs": [
        "IronOre",
        "Coal"
      ],
      "outputs": [
        "IronIngots"
      ],
      "interval": 30,
      "build_time": 35,
      "tool": null,
      "workers": 1,
      "icon": "🔥",
      "name_de": "Schmelze",
      "status": "planned"
    },
    {
      "id": "Barracks",
      "category": "Military",
      "cost": {
        "Wood": 6,
        "Stone": 6
      },
      "inputs": [
        "Weapons"
      ],
      "outputs": [],
      "interval": 0,
      "build_time": 40,
      "tool": null,
      "workers": 0,
      "icon": "⚔️",
      "name_de": "Kaserne"
    },
    {
      "id": "Guard Tower",
      "category": "Military",
      "cost": {
        "Stone": 8,
        "Boards": 6
      },
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 40,
      "tool": "Hammer",
      "workers": 0,
      "icon": "🗼",
      "name_de": "Wachturm"
    },
    {
      "id": "Fortress",
      "category": "Military",
      "cost": {
        "Stone": 20,
        "Boards": 12,
        "IronOre": 8
      },
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 80,
      "tool": "Hammer",
      "workers": 0,
      "icon": "🏯",
      "name_de": "Festung"
    },
    {
      "id": "Siege Workshop",
      "category": "Military",
      "cost": {
        "Wood": 10,
        "Stone": 8,
        "Tools": 3
      },
      "inputs": [
        "IronIngots",
        "Wood"
      ],
      "outputs": [
        "Weapons"
      ],
      "interval": 60,
      "build_time": 60,
      "tool": "Hammer",
      "workers": 1,
      "icon": "🔫",
      "name_de": "Belagerungswerkstatt"
    },
    {
      "id": "Shipyard",
      "category": "Military",
      "cost": {
        "Wood": 10,
        "Stone": 6,
        "Boards": 6
      },
      "inputs": [
        "Wood",
        "Boards"
      ],
      "outputs": [],
      "interval": 50,
      "build_time": 50,
      "tool": "Saw",
      "workers": 1,
      "icon": "🚢",
      "name_de": "Werft"
    },
    {
      "id": "Road Layer",
      "category": "Infrastructure",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [
        "Stone"
      ],
      "outputs": [],
      "interval": 25,
      "build_time": 25,
      "tool": null,
      "workers": 1,
      "icon": "🛤️",
      "name_de": "Straßenbauer"
    },
    {
      "id": "ClayPit",
      "category": "Raw Materials",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [],
      "outputs": [
        "Clay"
      ],
      "interval": 25,
      "build_time": 25,
      "tool": "Shovel",
      "workers": 1,
      "icon": "🧱",
      "name_de": "Lehmgrube",
      "status": "planned"
    },
    {
      "id": "Brickworks",
      "category": "Processing",
      "cost": {
        "Wood": 5,
        "Stone": 5
      },
      "inputs": [
        "Clay"
      ],
      "outputs": [
        "Bricks"
      ],
      "interval": 30,
      "build_time": 35,
      "tool": "Hammer",
      "workers": 1,
      "icon": "🧱",
      "name_de": "Ziegelei",
      "status": "planned"
    },
    {
      "id": "HempFarm",
      "category": "Raw Materials",
      "cost": {
        "Wood": 3,
        "Stone": 1
      },
      "inputs": [],
      "outputs": [
        "Hemp"
      ],
      "interval": 25,
      "build_time": 20,
      "tool": null,
      "workers": 1,
      "icon": "🌿",
      "name_de": "Hanffarm",
      "status": "planned"
    },
    {
      "id": "Ropemaker",
      "category": "Processing",
      "cost": {
        "Wood": 4,
        "Stone": 3
      },
      "inputs": [
        "Hemp"
      ],
      "outputs": [
        "Rope"
      ],
      "interval": 25,
      "build_time": 30,
      "tool": "Hammer",
      "workers": 1,
      "icon": "🪢",
      "name_de": "Seilerei",
      "status": "planned"
    },
    {
      "id": "Apiary",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [],
      "outputs": [
        "Honey"
      ],
      "interval": 30,
      "build_time": 25,
      "tool": null,
      "workers": 1,
      "icon": "🍯",
      "name_de": "Bienenhaus",
      "status": "planned"
    },
    {
      "id": "MeadMaker",
      "category": "Food",
      "cost": {
        "Wood": 5,
        "Stone": 3
      },
      "inputs": [
        "Honey",
        "Water"
      ],
      "outputs": [
        "Mead"
      ],
      "interval": 35,
      "build_time": 30,
      "tool": "Bucket",
      "workers": 1,
      "icon": "🍺",
      "name_de": "Metbrauer",
      "status": "planned"
    },
    {
      "id": "Temple of Bacchus",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Bacchus-Tempel",
      "status": "planned"
    },
    {
      "id": "Vineyard",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Weinberg",
      "status": "planned"
    },
    {
      "id": "Wine Press",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Kelterei",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Minerva",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein der Minerva",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Vulcan",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Vulcan",
      "status": "planned"
    },
    {
      "id": "Colosseum",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Kolosseum",
      "status": "planned"
    },
    {
      "id": "Mead Hall",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Methalle",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Odin",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Odin",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Thor",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Thor",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Freya",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein der Freya",
      "status": "planned"
    },
    {
      "id": "Runestone",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Runenstein",
      "status": "planned"
    },
    {
      "id": "Temple of Chac",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Tempel des Chac",
      "status": "planned"
    },
    {
      "id": "Agave Farm",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Agavenfarm",
      "status": "planned"
    },
    {
      "id": "Distillery",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Brennerei",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Kukulkan",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Kukulkan",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Quetzalcoatl",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Quetzalcoatl",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Huitzilopochtli",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Huitzilopochtli",
      "status": "planned"
    },
    {
      "id": "Observatory",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Observatorium",
      "status": "planned"
    },
    {
      "id": "Oracle of Apollo",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Orakel des Apollo",
      "status": "planned"
    },
    {
      "id": "Olive Grove",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Olivenhain",
      "status": "planned"
    },
    {
      "id": "Oil Press",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Ölpresse",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Artemis",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein der Artemis",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Poseidon",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Poseidon",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Apollo",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Apollo",
      "status": "planned"
    },
    {
      "id": "Amphitheater",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Amphitheater",
      "status": "planned"
    },
    {
      "id": "Dark Temple",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Dunkler Tempel",
      "status": "planned"
    },
    {
      "id": "Dark Garden",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Dunkler Garten",
      "status": "planned"
    },
    {
      "id": "Mushroom Farm",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Pilzfarm",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Morbus",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein des Morbus",
      "status": "planned"
    },
    {
      "id": "Sanctuary of Pestilence",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Schrein der Pestilenz",
      "status": "planned"
    },
    {
      "id": "Dark Fortress",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Dunkle Festung",
      "status": "planned"
    },
    {
      "id": "Demon Gate",
      "category": "Nation",
      "cost": {},
      "inputs": [],
      "outputs": [],
      "interval": 0,
      "build_time": 0,
      "tool": null,
      "workers": 0,
      "icon": "🏛️",
      "name_de": "Dämonentor",
      "status": "planned"
    },
    {
      "id": "Hunter",
      "category": "Food",
      "cost": {
        "Wood": 4,
        "Stone": 2
      },
      "inputs": [],
      "outputs": [
        "Game"
      ],
      "interval": 25,
      "build_time": 25,
      "tool": "Bow",
      "workers": 1,
      "icon": "🏹",
      "name_de": "Jägerhütte",
      "status": "planned"
    }
  ],
  "resources": [
    {
      "id": "Wood",
      "category": "raw",
      "icon": "🪵",
      "name_de": "Holz"
    },
    {
      "id": "Stone",
      "category": "raw",
      "icon": "🪨",
      "name_de": "Stein"
    },
    {
      "id": "IronOre",
      "category": "raw",
      "icon": "⛏️",
      "name_de": "Eisenerz"
    },
    {
      "id": "Coal",
      "category": "raw",
      "icon": "🪨",
      "name_de": "Kohle"
    },
    {
      "id": "Gold",
      "category": "raw",
      "icon": "✨",
      "name_de": "Gold"
    },
    {
      "id": "Sulfur",
      "category": "raw",
      "icon": "🟡",
      "name_de": "Schwefel"
    },
    {
      "id": "Clay",
      "category": "raw",
      "icon": "🧱",
      "name_de": "Lehm"
    },
    {
      "id": "Water",
      "category": "raw",
      "icon": "💧",
      "name_de": "Wasser"
    },
    {
      "id": "Grain",
      "category": "raw",
      "icon": "🌾",
      "name_de": "Getreide"
    },
    {
      "id": "Fish",
      "category": "raw",
      "icon": "🐟",
      "name_de": "Fisch"
    },
    {
      "id": "Meat",
      "category": "raw",
      "icon": "🍖",
      "name_de": "Fleisch"
    },
    {
      "id": "Hemp",
      "category": "raw",
      "icon": "🌿",
      "name_de": "Hanf"
    },
    {
      "id": "Honey",
      "category": "raw",
      "icon": "🍯",
      "name_de": "Honig"
    },
    {
      "id": "Boards",
      "category": "processed",
      "icon": "🪵",
      "name_de": "Bretter"
    },
    {
      "id": "IronIngots",
      "category": "processed",
      "icon": "🔩",
      "name_de": "Eisenbarren"
    },
    {
      "id": "Tools",
      "category": "processed",
      "icon": "🔧",
      "name_de": "Werkzeuge"
    },
    {
      "id": "Weapons",
      "category": "processed",
      "icon": "⚔️",
      "name_de": "Waffen"
    },
    {
      "id": "Flour",
      "category": "processed",
      "icon": "🌾",
      "name_de": "Mehl"
    },
    {
      "id": "Bread",
      "category": "processed",
      "icon": "🍞",
      "name_de": "Brot"
    },
    {
      "id": "Bricks",
      "category": "processed",
      "icon": "🧱",
      "name_de": "Ziegel"
    },
    {
      "id": "Rope",
      "category": "processed",
      "icon": "🪢",
      "name_de": "Seile"
    },
    {
      "id": "Mead",
      "category": "processed",
      "icon": "🍺",
      "name_de": "Met"
    }
  ],
  "terrain": [
    {
      "id": 0,
      "name": "Grass",
      "color": "#3d993d",
      "buildable": true,
      "passable": true,
      "name_de": "Grasland"
    },
    {
      "id": 1,
      "name": "Forest",
      "color": "#267326",
      "buildable": true,
      "passable": true,
      "name_de": "Wald"
    },
    {
      "id": 2,
      "name": "Mountain",
      "color": "#8c8073",
      "buildable": false,
      "passable": false,
      "name_de": "Gebirge"
    },
    {
      "id": 3,
      "name": "Water",
      "color": "#2659b3",
      "buildable": false,
      "passable": false,
      "name_de": "Wasser"
    },
    {
      "id": 4,
      "name": "DeepWater",
      "color": "#143380",
      "buildable": false,
      "passable": false,
      "name_de": "Tiefes Wasser"
    },
    {
      "id": 5,
      "name": "Desert",
      "color": "#d9bf66",
      "buildable": true,
      "passable": true,
      "name_de": "Wüste"
    },
    {
      "id": 6,
      "name": "Swamp",
      "color": "#4d6640",
      "buildable": false,
      "passable": true,
      "name_de": "Sumpf"
    },
    {
      "id": 7,
      "name": "Snow",
      "color": "#e6ebf2",
      "buildable": false,
      "passable": true,
      "name_de": "Schnee"
    }
  ],
  "units": [
    {
      "id": "Settler",
      "hp": 50,
      "speed": 1.0,
      "attack": 0,
      "defense": 0,
      "range": 0,
      "icon": "👷",
      "name_de": "Siedler"
    },
    {
      "id": "Swordsman",
      "hp": 100,
      "speed": 0.8,
      "attack": 15,
      "defense": 8,
      "range": 1,
      "icon": "⚔️",
      "name_de": "Schwertkämpfer"
    },
    {
      "id": "Bowman",
      "hp": 60,
      "speed": 0.9,
      "attack": 10,
      "defense": 4,
      "range": 5,
      "icon": "🏹",
      "name_de": "Bogenschütze"
    }
  ],
  "nations": [
    {
      "id": "Roman",
      "name_de": "Römer",
      "color": "#CC3333",
      "emoji": "🏛️",
      "description": "Balanced Builder — Efficient production chains, strong economy",
      "production": {
        "food": 1.1,
        "wood": 1.0,
        "stone": 1.0,
        "iron": 1.0,
        "coal": 1.0,
        "gold": 1.0,
        "tools": 1.0,
        "weapons": 1.0
      },
      "cost": {
        "economic": 1.0,
        "military": 1.0,
        "unique": 1.0
      },
      "units": {
        "worker_speed": 1.0,
        "worker_build_speed": 1.1,
        "soldier_hp": 1.0,
        "soldier_attack": 1.0,
        "soldier_defense": 1.0,
        "archer_hp": 1.0,
        "archer_attack": 1.0,
        "archer_range": 1.0
      },
      "special": "FormationBonus",
      "unique_buildings": [
        "Temple of Bacchus",
        "Vineyard",
        "Wine Press",
        "Sanctuary of Minerva",
        "Sanctuary of Vulcan",
        "Colosseum"
      ]
    },
    {
      "id": "Viking",
      "name_de": "Wikinger",
      "color": "#3366CC",
      "emoji": "🪓",
      "description": "Aggressive Rusher — Cheap military, fast unit production, naval bonus",
      "production": {
        "food": 1.0,
        "wood": 1.0,
        "stone": 1.0,
        "iron": 1.0,
        "coal": 1.0,
        "gold": 1.0,
        "tools": 1.0,
        "weapons": 1.0
      },
      "cost": {
        "economic": 1.0,
        "military": 0.8,
        "unique": 1.0
      },
      "units": {
        "worker_speed": 1.0,
        "worker_build_speed": 0.9,
        "soldier_hp": 1.0,
        "soldier_attack": 1.1,
        "soldier_defense": 0.9,
        "archer_hp": 0.9,
        "archer_attack": 1.1,
        "archer_range": 1.05
      },
      "special": "Berserk",
      "unique_buildings": [
        "Mead Hall",
        "Apiary",
        "Sanctuary of Odin",
        "Sanctuary of Thor",
        "Sanctuary of Freya",
        "Runestone"
      ]
    },
    {
      "id": "Maya",
      "name_de": "Maya",
      "color": "#33AA33",
      "emoji": "🌿",
      "description": "Defensive Expander — Fast workers, high HP buildings, natural healing",
      "production": {
        "food": 1.0,
        "wood": 1.0,
        "stone": 1.0,
        "iron": 1.0,
        "coal": 1.0,
        "gold": 1.0,
        "tools": 1.0,
        "weapons": 1.0
      },
      "cost": {
        "economic": 1.0,
        "military": 1.0,
        "unique": 1.0
      },
      "units": {
        "worker_speed": 1.15,
        "worker_build_speed": 1.0,
        "soldier_hp": 1.1,
        "soldier_attack": 1.0,
        "soldier_defense": 1.15,
        "archer_hp": 1.0,
        "archer_attack": 1.0,
        "archer_range": 1.0
      },
      "special": "ForestGuard",
      "unique_buildings": [
        "Temple of Chac",
        "Agave Farm",
        "Distillery",
        "Sanctuary of Kukulkan",
        "Sanctuary of Quetzalcoatl",
        "Sanctuary of Huitzilopochtli",
        "Observatory"
      ]
    },
    {
      "id": "Trojan",
      "name_de": "Trojaner",
      "color": "#CCAA33",
      "emoji": "🏺",
      "description": "Trade & Quality — Trade bonus, powerful elite units",
      "production": {
        "food": 1.0,
        "wood": 1.0,
        "stone": 1.0,
        "iron": 1.0,
        "coal": 1.0,
        "gold": 1.0,
        "tools": 1.0,
        "weapons": 1.0
      },
      "cost": {
        "economic": 1.0,
        "military": 1.1,
        "unique": 1.0
      },
      "units": {
        "worker_speed": 1.0,
        "worker_build_speed": 0.9,
        "soldier_hp": 1.0,
        "soldier_attack": 1.0,
        "soldier_defense": 1.2,
        "archer_hp": 1.0,
        "archer_attack": 1.0,
        "archer_range": 1.0
      },
      "special": "ShieldWall",
      "unique_buildings": [
        "Oracle of Apollo",
        "Olive Grove",
        "Oil Press",
        "Sanctuary of Artemis",
        "Sanctuary of Poseidon",
        "Sanctuary of Apollo",
        "Amphitheater"
      ]
    },
    {
      "id": "Dark Tribe",
      "name_de": "Dunkle",
      "color": "#8833AA",
      "emoji": "🌑",
      "description": "Terraforming Swarm — Terrain control, cheap mass units, auto-spread",
      "production": {
        "food": 1.0,
        "wood": 1.0,
        "stone": 1.0,
        "iron": 1.0,
        "coal": 1.0,
        "gold": 1.0,
        "tools": 1.0,
        "weapons": 1.0
      },
      "cost": {
        "economic": 1.0,
        "military": 0.7,
        "unique": 1.0
      },
      "units": {
        "worker_speed": 1.0,
        "worker_build_speed": 1.15,
        "soldier_hp": 0.8,
        "soldier_attack": 0.9,
        "soldier_defense": 0.8,
        "archer_hp": 0.8,
        "archer_attack": 0.9,
        "archer_range": 1.0
      },
      "special": "None",
      "unique_buildings": [
        "Dark Temple",
        "Dark Garden",
        "Mushroom Farm",
        "Sanctuary of Morbus",
        "Sanctuary of Pestilence",
        "Dark Fortress",
        "Demon Gate"
      ]
    }
  ],
  "categories": {
    "Food": [
      "Farm",
      "Fisherman",
      "Butcher",
      "Mill",
      "Bakery",
      "Waterworks",
      "Apiary",
      "MeadMaker"
    ],
    "Raw Materials": [
      "Woodcutter",
      "Sawmill",
      "Stonecutter",
      "Mine",
      "Smelter",
      "ClayPit",
      "HempFarm"
    ],
    "Processing": [
      "Toolsmith",
      "Weaponsmith",
      "Brickworks",
      "Ropemaker"
    ],
    "Military": [
      "Barracks",
      "Guard Tower",
      "Fortress",
      "Siege Workshop",
      "Shipyard"
    ],
    "Infrastructure": [
      "Castle",
      "Storehouse",
      "Road Layer"
    ],
    "Nation": [
      "Temple of Bacchus",
      "Vineyard",
      "Wine Press",
      "Sanctuary of Minerva",
      "Sanctuary of Vulcan",
      "Colosseum",
      "Mead Hall",
      "Sanctuary of Odin",
      "Sanctuary of Thor",
      "Sanctuary of Freya",
      "Runestone",
      "Temple of Chac",
      "Agave Farm",
      "Distillery",
      "Sanctuary of Kukulkan",
      "Sanctuary of Quetzalcoatl",
      "Sanctuary of Huitzilopochtli",
      "Observatory",
      "Oracle of Apollo",
      "Olive Grove",
      "Oil Press",
      "Sanctuary of Artemis",
      "Sanctuary of Poseidon",
      "Sanctuary of Apollo",
      "Amphitheater",
      "Dark Temple",
      "Dark Garden",
      "Mushroom Farm",
      "Sanctuary of Morbus",
      "Sanctuary of Pestilence",
      "Dark Fortress",
      "Demon Gate",
      "Hunter"
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
    console.log("S4WN config loaded:", C.buildings.length, "buildings,", C.resources.length, "resources,", C.terrain.length, "terrain,", C.units.length, "units,", C.nations.length, "nations");
})();
