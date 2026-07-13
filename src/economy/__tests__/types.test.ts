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
  test('Castle costs wood and stone', () => {
    const cost = buildCost(BuildingType.Castle);
    expect(cost).toEqual([
      { resource: ResourceType.Wood, amount: 10 },
      { resource: ResourceType.Stone, amount: 5 },
    ]);
  });

  test('Woodcutter is cheap (wood only)', () => {
    const cost = buildCost(BuildingType.Woodcutter);
    expect(cost).toEqual([{ resource: ResourceType.Wood, amount: 2 }]);
  });

  test('unknown/default building kind has empty cost', () => {
    // Marketplace has no explicit case in buildCost's switch → default []
    expect(buildCost(BuildingType.Marketplace)).toEqual([]);
  });
});

describe('buildingInputs / buildingOutputs', () => {
  test('Sawmill takes wood and produces planks', () => {
    expect(buildingInputs(BuildingType.Sawmill)).toEqual([{ resource: ResourceType.Wood, amount: 2 }]);
    expect(buildingOutputs(BuildingType.Sawmill)).toEqual([{ resource: ResourceType.Planks, amount: 1 }]);
  });

  test('Woodcutter is a raw producer with no inputs', () => {
    expect(buildingInputs(BuildingType.Woodcutter)).toEqual([]);
    expect(buildingOutputs(BuildingType.Woodcutter)).toEqual([{ resource: ResourceType.Wood, amount: 2 }]);
  });

  test('Weaponsmith requires iron ore, coal, and tools', () => {
    const inputs = buildingInputs(BuildingType.Weaponsmith);
    expect(inputs).toEqual([
      { resource: ResourceType.IronOre, amount: 1 },
      { resource: ResourceType.Coal, amount: 1 },
      { resource: ResourceType.Tools, amount: 1 },
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
