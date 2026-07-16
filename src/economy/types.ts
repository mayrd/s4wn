/**
 * S4WN Babylon.js/TypeScript - Economy Types
 *
 * Complete BuildingType enum (77 variants), ResourceType (19 resources),
 * tool types, production chains, building costs, and metadata.
 * Fully migrated from engine/src/economy.rs
 */

// ── Resource Types (19 valid resources, discriminants 0–28) ─────────
export enum ResourceType {
  Wood = 0,
  IronOre = 1,
  Coal = 2,
  Gold = 3,
  Stone = 4,
  Sulfur = 5,
  Fish = 6,
  Grain = 7,
  Meat = 8,
  Water = 9,
  Honey = 10,
  Planks = 11,
  Tools = 12,
  Weapons = 13,
  Bread = 14,
  Flour = 15,
  IronIngots = 16,
  Mead = 17,
  Wine = 18,
}
export const RESOURCE_COUNT = 29; // max discriminant + 1 (19 valid + 10 gaps)

// ── Tool Types (discriminants 0–10) ────────────────────────────────
export enum ToolKind {
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
export const TOOL_COUNT = 11;

// ── Building Categories ────────────────────────────────────────────
export enum BuildingCategory {
  Economic = 0,
  Military = 1,
  Unique = 2,
}

// ── Building Type (77 variants, discriminants 0–86) ────────────────
export enum BuildingType {
  Castle = 0,
  Sawmill = 1,
  Stonecutter = 2,
  Mine = 3,
  Toolsmith = 4,
  Weaponsmith = 5,
  Bakery = 7,
  Butcher = 8,
  Mill = 9,
  Farm = 10,
  Fisherman = 11,
  Woodcutter = 12,
  Storehouse = 13,
  Waterworks = 14,
  Smelter = 15,
  Barracks = 16,
  GuardTower = 18,
  Fortress = 19,
  SiegeWorkshop = 20,
  Shipyard = 21,
  RoadLayer = 22,
  Apiary = 27,
  MeadMaker = 28,
  // ── Roman Unique ──
  TempleOfBacchus = 31,
  Colosseum = 32,
  SanctuaryOfMinerva = 33,
  SanctuaryOfVulcan = 34,
  // ── Viking Unique ──
  MeadHall = 35,
  SanctuaryOfOdin = 36,
  SanctuaryOfThor = 37,
  SanctuaryOfFreya = 38,
  Runestone = 39,
  // ── Maya Unique ──
  TempleOfChac = 40,
  AgaveFarm = 41,
  Distillery = 42,
  SanctuaryOfKukulkan = 43,
  SanctuaryOfQuetzalcoatl = 44,
  SanctuaryOfHuitzilopochtli = 45,
  Observatory = 46,
  // ── Trojan Unique ──
  OracleOfApollo = 47,
  SanctuaryOfArtemis = 50,
  SanctuaryOfPoseidon = 51,
  SanctuaryOfApollo = 52,
  Amphitheater = 53,
  // ── Dark Tribe Unique ──
  DarkTemple = 54,
  DarkGarden = 55,
  MushroomFarm = 56,
  SanctuaryOfMorbus = 57,
  SanctuaryOfPestilence = 58,
  DarkFortress = 59,
  DemonGate = 60,
  // ── Additional Buildings ──
  GoldMine = 61,
  CoalMine = 62,
  IronOreMine = 63,
  SulfurMine = 64,
  GoldSmelter = 65,
  IronSmelter = 66,
  Slaughterhouse = 67,
  OilPress = 68,
  PowderMill = 69,
  WeaponFoundry = 70,
  Forester = 71,
  Healer = 72,
  GoatRanch = 73,
  PigRanch = 74,
  GooseRanch = 75,
  DonkeyRanch = 76,
  TrojanFarm = 77,
  Marketplace = 78,
  LandingDock = 79,
  Vineyard = 80,
  StorageYard = 81,
  SmallResidence = 82,
  MediumResidence = 83,
  LargeResidence = 84,
  SmallTemple = 85,
  LargeTemple = 86,
  SheepRanch = 87,
}

export const BUILDING_COUNT = 88;

// ── Valid Building Discriminants ────────────────────────────────────
export const VALID_BUILDING_DISCRIMINANTS: number[] = [
  0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  18, 19, 20, 21, 22, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56,
  57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
  72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
];

// ── Building Names (indexed by discriminant) ───────────────────────
export const BUILDING_NAMES: string[] = [
  "Castle", "Sawmill", "Stonecutter", "Mine", "Toolsmith",
  "Weaponsmith", "", "Bakery", "Butcher", "Mill",
  "Farm", "Fisherman", "Woodcutter", "Storehouse", "Waterworks",
  "Smelter", "Barracks", "", "Guard Tower", "Fortress",
  "Siege Workshop", "Shipyard", "Road Layer", "", "", "", "",
  "Apiary", "Mead Maker", "", "",
  "Temple of Bacchus", "Colosseum", "Sanctuary of Minerva", "Sanctuary of Vulcan",
  "Mead Hall", "Sanctuary of Odin", "Sanctuary of Thor", "Sanctuary of Freya",
  "Runestone",
  "Temple of Chac", "Agave Farm", "Distillery", "Sanctuary of Kukulkan",
  "Sanctuary of Quetzalcoatl", "Sanctuary of Huitzilopochtli", "Observatory",
  "Oracle of Apollo",
  "", "",
  "Sanctuary of Artemis", "Sanctuary of Poseidon", "Sanctuary of Apollo",
  "Amphitheater",
  "Dark Temple", "Dark Garden", "Mushroom Farm",
  "Sanctuary of Morbus", "Sanctuary of Pestilence",
  "Dark Fortress", "Demon Gate",
  "Gold Mine", "Coal Mine", "Iron Ore Mine", "Sulfur Mine",
  "Gold Smelter", "Iron Smelter", "Slaughterhouse",
  "Oil Press", "Powder Mill", "Weapon Foundry",
  "Forester", "Healer",
  "Goat Ranch", "Pig Ranch", "Goose Ranch", "Donkey Ranch",
  "Trojan Farm", "Marketplace", "Landing Dock", "Vineyard",
  "Storage Yard",
  "Small Residence", "Medium Residence", "Large Residence",
  "Small Temple", "Large Temple", "Sheep Ranch",
];

// ── Utility Functions ──────────────────────────────────────────────
export function isValidBuildingDiscriminant(d: number): boolean {
  return VALID_BUILDING_DISCRIMINANTS.includes(d);
}

export function buildingName(d: BuildingType | number): string {
  const disc = typeof d === 'number' ? d : (d as number);
  return BUILDING_NAMES[disc] || `Building#${disc}`;
}

export function resourceName(r: ResourceType | number): string {
  const names: Record<number, string> = {
    0: "Wood", 1: "Iron Ore", 2: "Coal", 3: "Gold", 4: "Stone",
    5: "Sulfur", 6: "Fish", 7: "Grain", 8: "Meat", 9: "Water",
    10: "Honey", 11: "Planks", 12: "Tools", 13: "Weapons", 14: "Bread",
    15: "Flour", 16: "Iron Ingots", 17: "Mead", 18: "Wine",
  };
  const disc = typeof r === 'number' ? r : (r as number);
  return names[disc] || `Resource#${disc}`;
}

// ── Building Cost ──────────────────────────────────────────────────
export interface CostItem {
  resource: ResourceType;
  amount: number;
}

/** Resource cost to construct a building */
export function buildCost(kind: BuildingType): CostItem[] {
  switch (kind) {
    case BuildingType.Castle: return [{ resource: ResourceType.Wood, amount: 10 }, { resource: ResourceType.Stone, amount: 5 }];
    case BuildingType.Sawmill: return [{ resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Stone, amount: 2 }];
    case BuildingType.Stonecutter: return [{ resource: ResourceType.Wood, amount: 5 }];
    case BuildingType.Mine: return [{ resource: ResourceType.Wood, amount: 8 }, { resource: ResourceType.Stone, amount: 3 }];
    case BuildingType.Toolsmith: return [
      { resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Stone, amount: 5 },
      { resource: ResourceType.IronOre, amount: 2 },
    ];
    case BuildingType.Weaponsmith: return [
      { resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Stone, amount: 5 },
      { resource: ResourceType.Tools, amount: 3 },
    ];
    case BuildingType.Bakery: return [{ resource: ResourceType.Wood, amount: 4 }, { resource: ResourceType.Stone, amount: 2 }];
    case BuildingType.Butcher: return [{ resource: ResourceType.Wood, amount: 4 }, { resource: ResourceType.Stone, amount: 2 }];
    case BuildingType.Mill: return [{ resource: ResourceType.Wood, amount: 4 }, { resource: ResourceType.Stone, amount: 2 }];
    case BuildingType.Farm: return [{ resource: ResourceType.Wood, amount: 3 }];
    case BuildingType.Fisherman: return [{ resource: ResourceType.Wood, amount: 3 }];
    case BuildingType.Woodcutter: return [{ resource: ResourceType.Wood, amount: 2 }];
    case BuildingType.Storehouse: return [{ resource: ResourceType.Wood, amount: 8 }, { resource: ResourceType.Stone, amount: 4 }];
    case BuildingType.Waterworks: return [{ resource: ResourceType.Wood, amount: 4 }, { resource: ResourceType.Stone, amount: 3 }];
    case BuildingType.Smelter: return [{ resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Stone, amount: 5 }];
    case BuildingType.Barracks: return [{ resource: ResourceType.Wood, amount: 6 }, { resource: ResourceType.Stone, amount: 6 }];
    case BuildingType.GuardTower: return [{ resource: ResourceType.Stone, amount: 8 }, { resource: ResourceType.Planks, amount: 6 }];
    case BuildingType.Fortress: return [
      { resource: ResourceType.Stone, amount: 20 }, { resource: ResourceType.Planks, amount: 12 },
      { resource: ResourceType.IronOre, amount: 8 },
    ];
    case BuildingType.SiegeWorkshop: return [
      { resource: ResourceType.Wood, amount: 10 }, { resource: ResourceType.Stone, amount: 8 },
      { resource: ResourceType.Tools, amount: 3 },
    ];
    case BuildingType.Shipyard: return [
      { resource: ResourceType.Wood, amount: 10 }, { resource: ResourceType.Stone, amount: 6 },
      { resource: ResourceType.Planks, amount: 6 },
    ];
    case BuildingType.RoadLayer: return [{ resource: ResourceType.Wood, amount: 4 }, { resource: ResourceType.Stone, amount: 2 }];
    case BuildingType.TempleOfChac: return [{ resource: ResourceType.Stone, amount: 20 }, { resource: ResourceType.Gold, amount: 5 }];
    case BuildingType.AgaveFarm: return [{ resource: ResourceType.Wood, amount: 3 }];
    case BuildingType.Distillery: return [{ resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Stone, amount: 3 }];
    case BuildingType.SanctuaryOfKukulkan:
    case BuildingType.SanctuaryOfQuetzalcoatl:
    case BuildingType.SanctuaryOfHuitzilopochtli:
      return [{ resource: ResourceType.Stone, amount: 15 }, { resource: ResourceType.Gold, amount: 5 }];
    case BuildingType.Observatory: return [{ resource: ResourceType.Stone, amount: 25 }, { resource: ResourceType.Gold, amount: 10 }];
    case BuildingType.OracleOfApollo: return [{ resource: ResourceType.Stone, amount: 20 }, { resource: ResourceType.Gold, amount: 10 }];
    case BuildingType.SanctuaryOfArtemis:
    case BuildingType.SanctuaryOfPoseidon:
    case BuildingType.SanctuaryOfApollo:
      return [{ resource: ResourceType.Stone, amount: 15 }, { resource: ResourceType.Gold, amount: 5 }];
    case BuildingType.Amphitheater: return [{ resource: ResourceType.Stone, amount: 30 }, { resource: ResourceType.Gold, amount: 15 }];
    case BuildingType.DarkTemple: return [{ resource: ResourceType.Stone, amount: 20 }, { resource: ResourceType.Gold, amount: 10 }];
    case BuildingType.DarkGarden: return [{ resource: ResourceType.Wood, amount: 5 }, { resource: ResourceType.Stone, amount: 3 }];
    case BuildingType.MushroomFarm: return [{ resource: ResourceType.Wood, amount: 8 }, { resource: ResourceType.Stone, amount: 4 }];
    case BuildingType.SanctuaryOfMorbus:
    case BuildingType.SanctuaryOfPestilence:
      return [{ resource: ResourceType.Stone, amount: 15 }, { resource: ResourceType.Gold, amount: 5 }];
    case BuildingType.DarkFortress: return [
      { resource: ResourceType.Stone, amount: 25 }, { resource: ResourceType.Planks, amount: 15 },
      { resource: ResourceType.IronOre, amount: 10 },
    ];
    case BuildingType.DemonGate: return [
      { resource: ResourceType.Stone, amount: 30 }, { resource: ResourceType.IronIngots, amount: 15 },
      { resource: ResourceType.Gold, amount: 20 },
    ];
    default: return [];
  }
}

// ── Production Chains ──────────────────────────────────────────────
export interface ProdIO {
  resource: ResourceType;
  amount: number;
}

export function buildingInputs(kind: BuildingType): ProdIO[] {
  switch (kind) {
    case BuildingType.Sawmill: return [{ resource: ResourceType.Wood, amount: 2 }];
    case BuildingType.Toolsmith: return [
      { resource: ResourceType.IronOre, amount: 1 }, { resource: ResourceType.Coal, amount: 1 },
    ];
    case BuildingType.Weaponsmith: return [
      { resource: ResourceType.IronOre, amount: 1 }, { resource: ResourceType.Coal, amount: 1 },
      { resource: ResourceType.Tools, amount: 1 },
    ];
    case BuildingType.Bakery: return [{ resource: ResourceType.Grain, amount: 2 }];
    case BuildingType.Mill: return [{ resource: ResourceType.Grain, amount: 3 }];
    case BuildingType.Smelter: return [
      { resource: ResourceType.IronOre, amount: 1 }, { resource: ResourceType.Coal, amount: 1 },
    ];
    case BuildingType.SiegeWorkshop: return [
      { resource: ResourceType.IronIngots, amount: 2 }, { resource: ResourceType.Wood, amount: 3 },
    ];
    case BuildingType.Shipyard: return [
      { resource: ResourceType.Wood, amount: 3 }, { resource: ResourceType.Planks, amount: 2 },
    ];
    default: return [];
  }
}

export function buildingOutputs(kind: BuildingType): ProdIO[] {
  switch (kind) {
    case BuildingType.Sawmill: return [{ resource: ResourceType.Planks, amount: 1 }];
    case BuildingType.Stonecutter: return [{ resource: ResourceType.Stone, amount: 1 }];
    case BuildingType.Mine: return [{ resource: ResourceType.IronOre, amount: 1 }];
    case BuildingType.Toolsmith: return [{ resource: ResourceType.Tools, amount: 1 }];
    case BuildingType.Weaponsmith: return [{ resource: ResourceType.Weapons, amount: 1 }];
    case BuildingType.Bakery: return [{ resource: ResourceType.Bread, amount: 1 }];
    case BuildingType.Butcher: return [{ resource: ResourceType.Meat, amount: 2 }];
    case BuildingType.Mill: return [{ resource: ResourceType.Flour, amount: 1 }];
    case BuildingType.Farm: return [{ resource: ResourceType.Grain, amount: 2 }];
    case BuildingType.Fisherman: return [{ resource: ResourceType.Fish, amount: 1 }];
    case BuildingType.Woodcutter: return [{ resource: ResourceType.Wood, amount: 2 }];
    case BuildingType.Waterworks: return [{ resource: ResourceType.Water, amount: 1 }];
    case BuildingType.Smelter: return [{ resource: ResourceType.IronIngots, amount: 1 }];
    case BuildingType.SiegeWorkshop: return [{ resource: ResourceType.Weapons, amount: 1 }];
    case BuildingType.Shipyard: return [{ resource: ResourceType.Weapons, amount: 1 }];
    case BuildingType.TempleOfBacchus:
    case BuildingType.OracleOfApollo:
    case BuildingType.DarkTemple:
      return [{ resource: ResourceType.Wine, amount: 1 }];
    case BuildingType.TempleOfChac: return [{ resource: ResourceType.Water, amount: 2 }];
    case BuildingType.MushroomFarm: return [{ resource: ResourceType.Grain, amount: 2 }];
    case BuildingType.DemonGate: return [{ resource: ResourceType.Weapons, amount: 1 }];
    case BuildingType.GoldMine: return [{ resource: ResourceType.Gold, amount: 2 }];
    case BuildingType.CoalMine: return [{ resource: ResourceType.Coal, amount: 2 }];
    case BuildingType.IronOreMine: return [{ resource: ResourceType.IronOre, amount: 2 }];
    case BuildingType.SulfurMine: return [{ resource: ResourceType.Sulfur, amount: 2 }];
    case BuildingType.GoldSmelter: return [{ resource: ResourceType.Gold, amount: 1 }];
    case BuildingType.IronSmelter: return [{ resource: ResourceType.IronIngots, amount: 1 }];
    case BuildingType.Slaughterhouse: return [{ resource: ResourceType.Meat, amount: 1 }];
    case BuildingType.OilPress: return [{ resource: ResourceType.Water, amount: 1 }];
    case BuildingType.PowderMill: return [{ resource: ResourceType.Sulfur, amount: 1 }];
    case BuildingType.WeaponFoundry: return [{ resource: ResourceType.Weapons, amount: 1 }];
    case BuildingType.Forester: return [{ resource: ResourceType.Wood, amount: 1 }];
    case BuildingType.GoatRanch:
    case BuildingType.PigRanch:
    case BuildingType.SheepRanch:
      return [{ resource: ResourceType.Meat, amount: 2 }];
    case BuildingType.GooseRanch:
    case BuildingType.DonkeyRanch:
      return [{ resource: ResourceType.Meat, amount: 1 }];
    case BuildingType.TrojanFarm:
    case BuildingType.Farm:
    case BuildingType.Vineyard:
      return [{ resource: ResourceType.Grain, amount: 2 }];
    default: return [];
  }
}

// ── Building Metadata ──────────────────────────────────────────────
/** Ticks between production cycles (at 10 TPS) */
export function productionInterval(kind: BuildingType): number {
  switch (kind) {
    case BuildingType.Sawmill: return 20;
    case BuildingType.Stonecutter: return 30;
    case BuildingType.Mine: return 40;
    case BuildingType.Toolsmith: return 30;
    case BuildingType.Weaponsmith: return 50;
    case BuildingType.Bakery: return 20;
    case BuildingType.Butcher: return 25;
    case BuildingType.Mill: return 25;
    case BuildingType.Farm: return 20;
    case BuildingType.Fisherman: return 20;
    case BuildingType.Woodcutter: return 15;
    case BuildingType.Waterworks: return 30;
    case BuildingType.Smelter: return 30;
    case BuildingType.GuardTower:
    case BuildingType.Fortress:
    case BuildingType.Colosseum:
    case BuildingType.SanctuaryOfMinerva:
    case BuildingType.SanctuaryOfVulcan:
    case BuildingType.SanctuaryOfOdin:
    case BuildingType.SanctuaryOfThor:
    case BuildingType.SanctuaryOfFreya:
    case BuildingType.SanctuaryOfKukulkan:
    case BuildingType.SanctuaryOfQuetzalcoatl:
    case BuildingType.SanctuaryOfHuitzilopochtli:
    case BuildingType.SanctuaryOfArtemis:
    case BuildingType.SanctuaryOfPoseidon:
    case BuildingType.SanctuaryOfApollo:
    case BuildingType.SanctuaryOfMorbus:
    case BuildingType.SanctuaryOfPestilence:
      return 0;
    case BuildingType.SiegeWorkshop: return 60;
    case BuildingType.Shipyard: return 50;
    case BuildingType.RoadLayer: return 25;
    case BuildingType.TempleOfBacchus:
    case BuildingType.OracleOfApollo:
    case BuildingType.DarkTemple:
      return 40;
    case BuildingType.TempleOfChac: return 35;
    case BuildingType.AgaveFarm: return 25;
    case BuildingType.Distillery: return 35;
    case BuildingType.MushroomFarm: return 25;
    case BuildingType.DemonGate: return 50;
    case BuildingType.GoldMine: return 22;
    case BuildingType.CoalMine: return 20;
    case BuildingType.IronOreMine: return 22;
    case BuildingType.SulfurMine: return 20;
    case BuildingType.GoldSmelter: return 18;
    case BuildingType.IronSmelter: return 18;
    case BuildingType.Slaughterhouse: return 15;
    case BuildingType.OilPress: return 15;
    case BuildingType.PowderMill: return 18;
    case BuildingType.WeaponFoundry: return 20;
    case BuildingType.Forester: return 12;
    case BuildingType.Healer: return 18;
    case BuildingType.GoatRanch:
    case BuildingType.PigRanch:
    case BuildingType.GooseRanch:
    case BuildingType.SheepRanch:
    case BuildingType.DonkeyRanch:
      return 15;
    case BuildingType.TrojanFarm: return 15;
    case BuildingType.Marketplace: return 20;
    case BuildingType.LandingDock: return 20;
    case BuildingType.Vineyard: return 15;
    case BuildingType.StorageYard: return 12;
    case BuildingType.SmallResidence: return 12;
    case BuildingType.MediumResidence: return 15;
    case BuildingType.LargeResidence: return 20;
    case BuildingType.SmallTemple: return 20;
    case BuildingType.LargeTemple: return 30;
    case BuildingType.Apiary: return 25;
    case BuildingType.MeadMaker: return 35;
    default: return 0;
  }
}

/** Whether building requires a settler to produce */
export function requiresSettler(kind: BuildingType): boolean {
  return kind !== BuildingType.Castle && kind !== BuildingType.Storehouse && kind !== BuildingType.Barracks;
}

/** Ticks to construct this building */
export function buildTime(kind: BuildingType): number {
  switch (kind) {
    case BuildingType.Castle: return 0;
    case BuildingType.Storehouse: return 50;
    case BuildingType.Farm:
    case BuildingType.Fisherman:
    case BuildingType.Woodcutter:
      return 20;
    case BuildingType.Stonecutter:
    case BuildingType.Sawmill:
      return 30;
    case BuildingType.Mine: return 40;
    case BuildingType.Toolsmith:
    case BuildingType.Bakery:
      return 35;
    case BuildingType.Butcher:
    case BuildingType.Mill:
      return 30;
    case BuildingType.Weaponsmith: return 50;
    case BuildingType.Waterworks: return 25;
    case BuildingType.Smelter: return 35;
    case BuildingType.Barracks: return 40;
    case BuildingType.GuardTower: return 40;
    case BuildingType.Fortress: return 80;
    case BuildingType.SiegeWorkshop: return 60;
    case BuildingType.Shipyard: return 50;
    case BuildingType.RoadLayer: return 30;
    case BuildingType.DarkTemple: return 50;
    case BuildingType.DarkGarden: return 25;
    case BuildingType.MushroomFarm: return 30;
    case BuildingType.SanctuaryOfMorbus: return 45;
    case BuildingType.SanctuaryOfPestilence: return 45;
    case BuildingType.DarkFortress: return 80;
    case BuildingType.DemonGate: return 60;
    default: return 0;
  }
}

/** Tool a settler must carry to work at this building */
export function requiredTool(kind: BuildingType): ToolKind | null {
  switch (kind) {
    case BuildingType.Stonecutter:
    case BuildingType.Mine:
    case BuildingType.GoldMine:
    case BuildingType.CoalMine:
    case BuildingType.IronOreMine:
    case BuildingType.SulfurMine:
      return ToolKind.Pickaxe;
    case BuildingType.Sawmill:
    case BuildingType.Shipyard:
      return ToolKind.Saw;
    case BuildingType.Toolsmith:
    case BuildingType.Weaponsmith:
    case BuildingType.Smelter:
    case BuildingType.GuardTower:
    case BuildingType.Fortress:
    case BuildingType.SiegeWorkshop:
    case BuildingType.DarkFortress:
    case BuildingType.DemonGate:
    case BuildingType.GoldSmelter:
    case BuildingType.IronSmelter:
    case BuildingType.WeaponFoundry:
      return ToolKind.Hammer;
    case BuildingType.Bakery:
    case BuildingType.Mill:
      return ToolKind.RollingPin;
    case BuildingType.Butcher:
    case BuildingType.Slaughterhouse:
      return ToolKind.Cleaver;
    case BuildingType.Fisherman: return ToolKind.FishingRod;
    case BuildingType.Woodcutter:
    case BuildingType.Forester:
      return ToolKind.Axe;
    case BuildingType.Waterworks:
    case BuildingType.TempleOfChac:
    case BuildingType.Distillery:
    case BuildingType.DarkTemple:
      return ToolKind.Bucket;
    case BuildingType.AgaveFarm:
    case BuildingType.DarkGarden:
    case BuildingType.MushroomFarm:
      return ToolKind.Shovel;
    default: return null;
  }
}

/** Building category for nation cost modifiers */
export function buildingCategory(kind: BuildingType): BuildingCategory {
  switch (kind) {
    case BuildingType.Farm: case BuildingType.Mill: case BuildingType.Bakery:
    case BuildingType.Fisherman: case BuildingType.Butcher: case BuildingType.Waterworks:
    case BuildingType.Woodcutter: case BuildingType.Sawmill: case BuildingType.Stonecutter:
    case BuildingType.Smelter: case BuildingType.Toolsmith: case BuildingType.Castle:
    case BuildingType.Storehouse: case BuildingType.RoadLayer:
      return BuildingCategory.Economic;
    case BuildingType.Weaponsmith: case BuildingType.Barracks: case BuildingType.Mine:
    case BuildingType.GuardTower: case BuildingType.Fortress: case BuildingType.SiegeWorkshop:
    case BuildingType.Shipyard:
      return BuildingCategory.Military;
    default:
      return BuildingCategory.Unique;
  }
}

/** Garrison capacity: max soldiers this building can hold */
export function garrisonCapacity(kind: BuildingType): number {
  switch (kind) {
    case BuildingType.GuardTower: return 1;
    case BuildingType.Fortress:
    case BuildingType.DarkFortress:
      return 3;
    case BuildingType.Castle: return 6;
    case BuildingType.Colosseum:
    case BuildingType.Amphitheater:
      return 2;
    case BuildingType.Runestone:
    case BuildingType.Observatory:
      return 1;
    default: return 0;
  }
}

/** Maximum hit points */
export function maxHp(kind: BuildingType): number {
  switch (kind) {
    case BuildingType.Castle:
    case BuildingType.Fortress:
    case BuildingType.DarkFortress:
      return 500;
    case BuildingType.GuardTower:
    case BuildingType.Colosseum:
    case BuildingType.Amphitheater:
      return 300;
    case BuildingType.Barracks:
    case BuildingType.SiegeWorkshop:
    case BuildingType.Storehouse:
    case BuildingType.Shipyard:
      return 250;
    case BuildingType.DemonGate: return 350;
    case BuildingType.TempleOfBacchus: case BuildingType.SanctuaryOfMinerva:
    case BuildingType.SanctuaryOfVulcan: case BuildingType.MeadHall:
    case BuildingType.SanctuaryOfOdin: case BuildingType.SanctuaryOfThor:
    case BuildingType.SanctuaryOfFreya: case BuildingType.Runestone:
    case BuildingType.TempleOfChac: case BuildingType.SanctuaryOfKukulkan:
    case BuildingType.SanctuaryOfQuetzalcoatl: case BuildingType.SanctuaryOfHuitzilopochtli:
    case BuildingType.Observatory: case BuildingType.OracleOfApollo:
    case BuildingType.SanctuaryOfArtemis: case BuildingType.SanctuaryOfPoseidon:
    case BuildingType.SanctuaryOfApollo: case BuildingType.DarkTemple:
    case BuildingType.SanctuaryOfMorbus: case BuildingType.SanctuaryOfPestilence:
      return 200;
    case BuildingType.Mine: case BuildingType.Toolsmith: case BuildingType.Weaponsmith:
    case BuildingType.Waterworks: case BuildingType.Smelter:
      return 150;
    case BuildingType.Stonecutter: case BuildingType.Sawmill: case BuildingType.Mill:
    case BuildingType.Bakery: case BuildingType.Butcher:
      return 120;
    case BuildingType.Farm: case BuildingType.Fisherman: case BuildingType.Woodcutter:
    case BuildingType.Apiary: case BuildingType.MeadMaker:
    case BuildingType.DarkGarden: case BuildingType.MushroomFarm:
    case BuildingType.AgaveFarm:
      return 100;
    case BuildingType.RoadLayer: return 80;
    case BuildingType.Distillery: return 120;
    default: return 150;
  }
}

/** Max settlers / workers for a building */
export function maxSettlers(kind: BuildingType): number {
  switch (kind) {
    case BuildingType.Castle: return 3;
    case BuildingType.Farm:
    case BuildingType.Sawmill:
    case BuildingType.Mill:
    case BuildingType.Bakery:
      return 2;
    case BuildingType.Storehouse: return 1;
    default: return 1;
  }
}

/** If building is nation-locked, return the required nation (0–4) */
export function nationForBuilding(kind: BuildingType): number | null {
  const n = kind as number;
  if ((n >= 31 && n <= 34) || n === BuildingType.SheepRanch || n === BuildingType.Vineyard) return 0; // Roman
  if ((n >= 35 && n <= 39) || n === BuildingType.PigRanch || n === BuildingType.Apiary || n === BuildingType.MeadMaker) return 1; // Viking
  if ((n >= 40 && n <= 46) || n === BuildingType.GoatRanch || n === BuildingType.AgaveFarm || n === BuildingType.Distillery || n === BuildingType.PowderMill) return 2; // Maya
  if (n === 47 || (n >= 50 && n <= 53) || n === BuildingType.GooseRanch || n === BuildingType.TrojanFarm || n === BuildingType.OilPress || n === BuildingType.WeaponFoundry) return 3; // Trojan
  if ((n >= 54 && n <= 60)) return 4; // Dark Tribe
  return null;
}

export function inputBufferSize(kind: BuildingType): number {
  return buildingInputs(kind).length > 0 ? 3 : 0;
}

export function outputBufferSize(kind: BuildingType): number {
  return buildingOutputs(kind).length > 0 ? 3 : 0;
}