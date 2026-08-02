/**
 * TypeScript tests for economy/types.ts utility functions
 */

import {
  BuildingType,
  ResourceType,
  ToolKind,
  BuildingCategory,
  VALID_BUILDING_DISCRIMINANTS,
  isValidBuildingDiscriminant,
  buildingName,
  resourceName,
  buildCost,
  buildingInputs,
  buildingOutputs,
  productionInterval,
  requiresSettler,
  buildTime,
  requiredTool,
  buildingCategory,
  garrisonCapacity,
  maxHp,
  maxSettlers,
  nationForBuilding,
  inputBufferSize,
  outputBufferSize,
} from '../types';

describe('isValidBuildingDiscriminant', () => {
  test('returns true for all discriminants in VALID_BUILDING_DISCRIMINANTS', () => {
    for (const d of VALID_BUILDING_DISCRIMINANTS) {
      expect(isValidBuildingDiscriminant(d)).toBe(true);
    }
  });

  test('returns false for known gap discriminants', () => {
    expect(isValidBuildingDiscriminant(6)).toBe(false);
    expect(isValidBuildingDiscriminant(17)).toBe(false);
    expect(isValidBuildingDiscriminant(23)).toBe(false);
    expect(isValidBuildingDiscriminant(999)).toBe(false);
  });
});

describe('buildingName', () => {
  test('returns correct name for known discriminants', () => {
    expect(buildingName(BuildingType.Castle)).toBe('Castle');
    expect(buildingName(BuildingType.Sawmill)).toBe('Sawmill');
    expect(buildingName(BuildingType.Amphitheater)).toBe('Amphitheater');
  });

  test('falls back to Building#N for invalid/gap discriminants', () => {
    expect(buildingName(6)).toBe('Building#6');
    expect(buildingName(9999)).toBe('Building#9999');
  });
});

describe('resourceName', () => {
  test('returns correct name for known resources', () => {
    expect(resourceName(ResourceType.Wood)).toBe('Wood');
    expect(resourceName(ResourceType.IronOre)).toBe('Iron Ore');
    expect(resourceName(ResourceType.Wine)).toBe('Wine');
  });

  test('falls back to Resource#N for invalid discriminants', () => {
    expect(resourceName(20)).toBe('Resource#20');
    expect(resourceName(9999)).toBe('Resource#9999');
  });
});

describe('buildCost', () => {
  test('Castle costs 8 Planks + 7 Stone (Roman per BASE.md)', () => {
    const cost = buildCost(BuildingType.Castle);
    expect(cost).toEqual([
      { resource: ResourceType.Planks, amount: 8 },
      { resource: ResourceType.Stone, amount: 7 },
    ]);
  });

  test('Woodcutter costs 2 Planks + 1 Stone', () => {
    const cost = buildCost(BuildingType.Woodcutter);
    expect(cost).toEqual([
      { resource: ResourceType.Planks, amount: 2 },
      { resource: ResourceType.Stone, amount: 1 },
    ]);
  });

  test('Forester costs 2 Planks + 1 Stone (NOT free!)', () => {
    const cost = buildCost(BuildingType.Forester);
    expect(cost).toEqual([
      { resource: ResourceType.Planks, amount: 2 },
      { resource: ResourceType.Stone, amount: 1 },
    ]);
  });

  test('Marketplace costs 4 Planks + 2 Stone', () => {
    const cost = buildCost(BuildingType.Marketplace);
    expect(cost).toEqual([
      { resource: ResourceType.Planks, amount: 4 },
      { resource: ResourceType.Stone, amount: 2 },
    ]);
  });

  test('all Roman buildings have non-empty construction cost using Planks', () => {
    const romanBuildings: BuildingType[] = [
      BuildingType.Forester, BuildingType.Woodcutter, BuildingType.Sawmill,
      BuildingType.Stonecutter, BuildingType.Farm, BuildingType.Mill,
      BuildingType.Bakery, BuildingType.Slaughterhouse, BuildingType.Fisherman,
      BuildingType.Waterworks, BuildingType.CoalMine, BuildingType.IronOreMine,
      BuildingType.GoldMine, BuildingType.SulfurMine, BuildingType.IronSmelter,
      BuildingType.GoldSmelter, BuildingType.Toolsmith, BuildingType.Weaponsmith,
      BuildingType.Barracks, BuildingType.GuardTower, BuildingType.Fortress,
      BuildingType.Castle, BuildingType.Healer, BuildingType.Vineyard,
      BuildingType.SmallTemple, BuildingType.LargeTemple,
      BuildingType.SmallResidence, BuildingType.MediumResidence,
      BuildingType.LargeResidence, BuildingType.StorageYard,
      BuildingType.Marketplace, BuildingType.Shipyard, BuildingType.LandingDock,
      BuildingType.SheepRanch,
    ];
    for (const kind of romanBuildings) {
      const cost = buildCost(kind);
      expect(cost.length).toBeGreaterThan(0);
      // All construction costs should use Planks (not Wood logs)
      const hasPlanks = cost.some(c => c.resource === ResourceType.Planks);
      expect(hasPlanks).toBe(true);
    }
  });
});

describe('buildingInputs / buildingOutputs', () => {
  test('Sawmill takes wood logs and produces planks', () => {
    expect(buildingInputs(BuildingType.Sawmill)).toEqual([{ resource: ResourceType.Wood, amount: 2 }]);
    expect(buildingOutputs(BuildingType.Sawmill)).toEqual([{ resource: ResourceType.Planks, amount: 1 }]);
  });

  test('Woodcutter is a raw producer with no inputs', () => {
    expect(buildingInputs(BuildingType.Woodcutter)).toEqual([]);
    expect(buildingOutputs(BuildingType.Woodcutter)).toEqual([{ resource: ResourceType.Wood, amount: 2 }]);
  });

  test('Weaponsmith requires iron ingots and coal (not iron ore + tools)', () => {
    const inputs = buildingInputs(BuildingType.Weaponsmith);
    expect(inputs).toEqual([
      { resource: ResourceType.IronIngots, amount: 1 },
      { resource: ResourceType.Coal, amount: 1 },
    ]);
  });

  test('Toolsmith requires iron ingots and coal (not iron ore)', () => {
    const inputs = buildingInputs(BuildingType.Toolsmith);
    expect(inputs).toEqual([
      { resource: ResourceType.IronIngots, amount: 1 },
      { resource: ResourceType.Coal, amount: 1 },
    ]);
  });

  test('Bakery requires flour and water (not grain)', () => {
    expect(buildingInputs(BuildingType.Bakery)).toEqual([
      { resource: ResourceType.Flour, amount: 1 },
      { resource: ResourceType.Water, amount: 1 },
    ]);
  });

  test('Coal Mine requires bread (food for miners)', () => {
    expect(buildingInputs(BuildingType.CoalMine)).toEqual([
      { resource: ResourceType.Bread, amount: 1 },
    ]);
  });

  test('Iron Ore Mine requires meat (food for miners)', () => {
    expect(buildingInputs(BuildingType.IronOreMine)).toEqual([
      { resource: ResourceType.Meat, amount: 1 },
    ]);
  });

  test('Gold Mine requires fish (food for miners)', () => {
    expect(buildingInputs(BuildingType.GoldMine)).toEqual([
      { resource: ResourceType.Fish, amount: 1 },
    ]);
  });

  test('Sulfur Mine requires fish (food for miners)', () => {
    expect(buildingInputs(BuildingType.SulfurMine)).toEqual([
      { resource: ResourceType.Fish, amount: 1 },
    ]);
  });

  test('Iron Smelter requires iron ore and coal', () => {
    expect(buildingInputs(BuildingType.IronSmelter)).toEqual([
      { resource: ResourceType.IronOre, amount: 1 },
      { resource: ResourceType.Coal, amount: 1 },
    ]);
  });

  test('Gold Smelter requires gold ore and coal', () => {
    expect(buildingInputs(BuildingType.GoldSmelter)).toEqual([
      { resource: ResourceType.Gold, amount: 1 },
      { resource: ResourceType.Coal, amount: 1 },
    ]);
  });

  test('Sheep Ranch requires grain and water', () => {
    expect(buildingInputs(BuildingType.SheepRanch)).toEqual([
      { resource: ResourceType.Grain, amount: 1 },
      { resource: ResourceType.Water, amount: 1 },
    ]);
  });

  test('Small Temple requires wine (Roman mana source)', () => {
    expect(buildingInputs(BuildingType.SmallTemple)).toEqual([
      { resource: ResourceType.Wine, amount: 1 },
    ]);
  });

  test('Powder Mill requires sulfur and coal', () => {
    expect(buildingInputs(BuildingType.PowderMill)).toEqual([
      { resource: ResourceType.Sulfur, amount: 1 },
      { resource: ResourceType.Coal, amount: 1 },
    ]);
  });

  test('Weapon Foundry requires iron ingots and sulfur', () => {
    expect(buildingInputs(BuildingType.WeaponFoundry)).toEqual([
      { resource: ResourceType.IronIngots, amount: 1 },
      { resource: ResourceType.Sulfur, amount: 1 },
    ]);
  });

  test('Mead Maker requires honey', () => {
    expect(buildingInputs(BuildingType.MeadMaker)).toEqual([
      { resource: ResourceType.Honey, amount: 1 },
    ]);
  });

  test('Apiary produces honey', () => {
    expect(buildingOutputs(BuildingType.Apiary)).toEqual([
      { resource: ResourceType.Honey, amount: 1 },
    ]);
  });

  test('Mead Maker produces mead', () => {
    expect(buildingOutputs(BuildingType.MeadMaker)).toEqual([
      { resource: ResourceType.Mead, amount: 1 },
    ]);
  });

  test('Vineyard produces wine (not grain)', () => {
    expect(buildingOutputs(BuildingType.Vineyard)).toEqual([
      { resource: ResourceType.Wine, amount: 1 },
    ]);
  });

  test('building kind with no production has empty inputs/outputs', () => {
    expect(buildingInputs(BuildingType.Castle)).toEqual([]);
    expect(buildingOutputs(BuildingType.Castle)).toEqual([]);
  });
});

describe('productionInterval', () => {
  test('returns expected interval for known buildings', () => {
    expect(productionInterval(BuildingType.Woodcutter)).toBe(15);
    expect(productionInterval(BuildingType.Sawmill)).toBe(20);
  });

  test('returns 0 for buildings with no production (e.g. GuardTower, Castle)', () => {
    expect(productionInterval(BuildingType.GuardTower)).toBe(0);
    expect(productionInterval(BuildingType.Castle)).toBe(0);
  });
});

describe('requiresSettler', () => {
  test('Castle, Storehouse, Barracks do not require a settler', () => {
    expect(requiresSettler(BuildingType.Castle)).toBe(false);
    expect(requiresSettler(BuildingType.Storehouse)).toBe(false);
    expect(requiresSettler(BuildingType.Barracks)).toBe(false);
  });

  test('production buildings require a settler', () => {
    expect(requiresSettler(BuildingType.Sawmill)).toBe(true);
    expect(requiresSettler(BuildingType.Farm)).toBe(true);
  });
});

describe('buildTime', () => {
  test('Castle has 0 build time (instant)', () => {
    expect(buildTime(BuildingType.Castle)).toBe(0);
  });

  test('Sawmill/Stonecutter take 30 ticks', () => {
    expect(buildTime(BuildingType.Sawmill)).toBe(30);
    expect(buildTime(BuildingType.Stonecutter)).toBe(30);
  });

  test('unlisted building kind defaults to 0', () => {
    expect(buildTime(BuildingType.Marketplace)).toBe(0);
  });
});

describe('requiredTool', () => {
  test('Stonecutter/Mine require Pickaxe', () => {
    expect(requiredTool(BuildingType.Stonecutter)).toBe(ToolKind.Pickaxe);
    expect(requiredTool(BuildingType.Mine)).toBe(ToolKind.Pickaxe);
  });

  test('Woodcutter requires Axe', () => {
    expect(requiredTool(BuildingType.Woodcutter)).toBe(ToolKind.Axe);
  });

  test('unlisted building kind requires no tool (null)', () => {
    expect(requiredTool(BuildingType.Castle)).toBeNull();
  });
});

describe('buildingCategory', () => {
  test('economic buildings are categorized correctly', () => {
    expect(buildingCategory(BuildingType.Farm)).toBe(BuildingCategory.Economic);
    expect(buildingCategory(BuildingType.Castle)).toBe(BuildingCategory.Economic);
  });

  test('military buildings are categorized correctly', () => {
    expect(buildingCategory(BuildingType.Barracks)).toBe(BuildingCategory.Military);
    expect(buildingCategory(BuildingType.Fortress)).toBe(BuildingCategory.Military);
  });

  test('unlisted/unique buildings default to Unique category', () => {
    expect(buildingCategory(BuildingType.Colosseum)).toBe(BuildingCategory.Unique);
  });
});

describe('garrisonCapacity', () => {
  test('Castle holds 6 garrisoned soldiers', () => {
    expect(garrisonCapacity(BuildingType.Castle)).toBe(6);
  });

  test('GuardTower holds 1', () => {
    expect(garrisonCapacity(BuildingType.GuardTower)).toBe(1);
  });

  test('non-garrison buildings default to 0', () => {
    expect(garrisonCapacity(BuildingType.Farm)).toBe(0);
  });
});

describe('maxHp', () => {
  test('Castle/Fortress/DarkFortress have highest HP', () => {
    expect(maxHp(BuildingType.Castle)).toBe(500);
    expect(maxHp(BuildingType.Fortress)).toBe(500);
    expect(maxHp(BuildingType.DarkFortress)).toBe(500);
  });

  test('basic production buildings have lower HP', () => {
    expect(maxHp(BuildingType.Farm)).toBe(100);
  });

  test('unlisted building kind defaults to 150', () => {
    expect(maxHp(BuildingType.Marketplace)).toBe(150);
  });
});

describe('maxSettlers', () => {
  test('Castle allows up to 3 settlers', () => {
    expect(maxSettlers(BuildingType.Castle)).toBe(3);
  });

  test('Sawmill/Farm/Mill/Bakery allow up to 2', () => {
    expect(maxSettlers(BuildingType.Sawmill)).toBe(2);
    expect(maxSettlers(BuildingType.Farm)).toBe(2);
  });

  test('default is 1 settler', () => {
    expect(maxSettlers(BuildingType.Woodcutter)).toBe(1);
    expect(maxSettlers(BuildingType.Storehouse)).toBe(1);
  });
});

describe('nationForBuilding', () => {
  test('Roman unique buildings map to nation 0', () => {
    expect(nationForBuilding(BuildingType.TempleOfBacchus)).toBe(0);
    expect(nationForBuilding(BuildingType.SanctuaryOfVulcan)).toBe(0);
  });

  test('Viking unique buildings map to nation 1', () => {
    expect(nationForBuilding(BuildingType.MeadHall)).toBe(1);
    expect(nationForBuilding(BuildingType.Runestone)).toBe(1);
  });

  test('Maya unique buildings map to nation 2', () => {
    expect(nationForBuilding(BuildingType.TempleOfChac)).toBe(2);
    expect(nationForBuilding(BuildingType.Observatory)).toBe(2);
  });

  test('Trojan unique buildings map to nation 3', () => {
    expect(nationForBuilding(BuildingType.OracleOfApollo)).toBe(3);
    expect(nationForBuilding(BuildingType.Amphitheater)).toBe(3);
  });

  test('Dark Tribe unique buildings map to nation 4', () => {
    expect(nationForBuilding(BuildingType.DarkTemple)).toBe(4);
    expect(nationForBuilding(BuildingType.DemonGate)).toBe(4);
  });

  test('generic/economic buildings are not nation-locked (null)', () => {
    expect(nationForBuilding(BuildingType.Castle)).toBeNull();
    expect(nationForBuilding(BuildingType.Sawmill)).toBeNull();
  });
});

describe('inputBufferSize / outputBufferSize', () => {
  test('buildings with inputs get a buffer of size 3', () => {
    expect(inputBufferSize(BuildingType.Sawmill)).toBe(3);
  });

  test('buildings with no inputs get 0 input buffer size', () => {
    expect(inputBufferSize(BuildingType.Woodcutter)).toBe(0);
  });

  test('buildings with outputs get a buffer of size 3', () => {
    expect(outputBufferSize(BuildingType.Woodcutter)).toBe(3);
  });

  test('buildings with no outputs get 0 output buffer size', () => {
    expect(outputBufferSize(BuildingType.Castle)).toBe(0);
  });
});
