/**
 * Tests for NationValidator — schema validation + disk checks.
 */
import { NationValidator, ValidationReport } from '../NationValidator';
import { NationManifest } from '../NationRegistry';

// Helper: create a minimal valid manifest
function mockManifest(overrides: Partial<NationManifest> = {}): NationManifest {
  return {
    version: 1,
    id: 'testnation',
    name: { en: 'Test Nation' },
    description: { en: 'A test nation.' },
    visuals: {
      color: '#ff8844', secondary: '#ffaa66', emoji: '🧪', uiTheme: 'default',
      particles: { dustColor: [0.5, 0.4, 0.3], magicColor: [0.2, 0.6, 1], constructionSpark: [1, 0.8, 0.2] },
      terrainModifiers: {},
    },
    economy: {
      livestock: { kind: 'sheep', building: 'sheep_ranch', product: 'meat' },
      divine: { crop: 'grapes', rawResource: 'grapes', processedInto: 'wine', building: 'vineyard', processor: 'wine_press' },
      munitions: null,
      startingResources: { wood: 40, stone: 30, food: 20, gold: 0, iron: 0, coal: 0, sulfur: 0 },
      resourceBonuses: { wood: 1.0, stone: 1.0, food: 1.0, gold: 1.0, iron: 1.0 },
    },
    units: {
      worker:    { model: '', texture: '', animations: '', icon: '', stats: { hp: 50, speed: 2.5, carryCapacity: 10 } },
      soldier:   { model: '', texture: '', animations: '', icon: '', stats: { hp: 80, speed: 3, attack: 12, defence: 8, range: 1 } },
      archer:    { model: '', texture: '', animations: '', icon: '', stats: { hp: 60, speed: 2.8, attack: 10, defence: 4, range: 6 } },
      settler:   { model: '', texture: '', animations: '', icon: '', stats: { hp: 40, speed: 2, carryCapacity: 15 } },
      special:   { kind: 'medic', displayName: { en: 'Medic' }, description: { en: 'Heals.' },
        model: '', texture: '', animations: '', icon: '', stats: { hp: 45, speed: 2.5, healRate: 3, healRange: 3 } },
    },
    buildings: { categories: [], overrides: {} },
    balancing: {
      buildSpeedMultiplier: 1, unitTrainSpeedMultiplier: 1, resourceGatherMultiplier: 1,
      combatDamageMultiplier: 1, territoryExpansionRate: 1, populationGrowthRate: 1,
      startingUnits: { worker: 6, soldier: 4, settler: 2 },
    },
    specialResources: {},
    techTree: { nodes: [] },
    ai: { aggression: 0.5, expansionism: 0.7, economyFocus: 0.6, preferredUnits: ['soldier'] },
    ...overrides,
  };
}

function assertValid(r: ValidationReport) {
  expect({ valid: r.valid, errors: r.errors.map(e => `${e.path}: ${e.message}`) })
    .toEqual({ valid: true, errors: [] });
}

// ── Schema Validation Tests ──────────────────────────────────

describe('NationValidator.validateManifest', () => {
  test('accepts a fully valid manifest', () => {
    assertValid(NationValidator.validateManifest(mockManifest()));
  });

  test('accepts the real Roman manifest', () => {
    const roman = mockManifest({
      id: 'romans',
      name: { en: 'Romans', de: 'Römer' },
      visuals: { ...mockManifest().visuals, color: '#cc3333', emoji: '🏛️', uiTheme: 'stone' },
    });
    assertValid(NationValidator.validateManifest(roman));
  });

  test('accepts the real Viking manifest', () => {
    const viking = mockManifest({
      id: 'vikings',
      name: { en: 'Vikings', de: 'Wikinger' },
      visuals: { ...mockManifest().visuals, color: '#3366cc', emoji: '⚔️', uiTheme: 'wood' },
      economy: {
        ...mockManifest().economy,
        livestock: { kind: 'pig', building: 'pig_ranch', product: 'meat' },
        divine: { crop: 'honey', rawResource: 'honey', processedInto: 'mead', building: 'apiary', processor: 'mead_maker' },
      },
      units: {
        ...mockManifest().units,
        special: { kind: 'axe_warrior', displayName: { en: 'Axe Warrior' }, description: { en: 'Shock troop.' },
          model: '', texture: '', animations: '', icon: '', stats: { hp: 100, speed: 2.8, attack: 20, defence: 10, range: 1 } },
      },
    });
    assertValid(NationValidator.validateManifest(viking));
  });

  // ── Required key checks ──

  test('rejects null manifest', () => {
    const r = NationValidator.validateManifest(null as any);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === '$')).toBe(true);
  });

  test('rejects manifest missing id', () => {
    const m = mockManifest() as any;
    delete m.id;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'id')).toBe(true);
  });

  test('rejects manifest missing visuals', () => {
    const m = mockManifest() as any;
    delete m.visuals;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects manifest missing economy', () => {
    const m = mockManifest() as any;
    delete m.economy;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects manifest missing units', () => {
    const m = mockManifest() as any;
    delete m.units;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects manifest missing buildings', () => {
    const m = mockManifest() as any;
    delete m.buildings;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects manifest missing balancing', () => {
    const m = mockManifest() as any;
    delete m.balancing;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── id validation ──

  test.each([
    ['', 'empty'],
    ['UPPERCASE', 'uppercase'],
    ['has-dash', 'dash'],
    ['123start', 'starts with digit'],
  ])('rejects invalid id "%s" (%s)', (id) => {
    const r = NationValidator.validateManifest(mockManifest({ id } as any));
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'id')).toBe(true);
  });

  test.each([
    'romans', 'vikings', 'mayans', 'trojans', 'dark', 'egyptians',
    'camelot', 'norse2', 'great_empire',
  ])('accepts valid id "%s"', (id) => {
    const r = NationValidator.validateManifest(mockManifest({ id } as any));
    expect(r.valid).toBe(true);
  });

  // ── name validation ──

  test('rejects name without english entry', () => {
    const m = mockManifest();
    (m as any).name = { de: 'Test' };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'name')).toBe(true);
  });

  test('rejects non-object name', () => {
    const m = mockManifest();
    (m as any).name = 'JustString';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── visuals.color validation ──

  test.each([
    'rgb(255,0,0)', '#ggg', 'red', '#12345', '',
  ])('rejects invalid color "%s"', (color) => {
    const m = mockManifest();
    m.visuals.color = color;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.color')).toBe(true);
  });

  test.each(['#ff0000', '#00FF00', '#123abc', '#ABCDEF'])('accepts valid hex color "%s"', (color) => {
    const m = mockManifest();
    m.visuals.color = color;
    assertValid(NationValidator.validateManifest(m));
  });

  // ── version validation ──

  test('rejects version 0', () => {
    const r = NationValidator.validateManifest(mockManifest({ version: 0 } as any));
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'version')).toBe(true);
  });

  test('rejects negative version', () => {
    const r = NationValidator.validateManifest(mockManifest({ version: -1 } as any));
    expect(r.valid).toBe(false);
  });

  // ── Economy validation ──

  test('rejects missing livestock fields', () => {
    const m = mockManifest();
    (m.economy.livestock as any) = { kind: '', building: '', product: '' };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects missing starting resources', () => {
    const m = mockManifest();
    delete (m.economy.startingResources as any).wood;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── Units validation ──

  test('rejects missing worker unit', () => {
    const m = mockManifest();
    delete (m as any).units.worker;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects special unit without kind', () => {
    const m = mockManifest();
    (m.units.special as any).kind = '';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── Balancing validation ──

  test.each([
    'buildSpeedMultiplier', 'unitTrainSpeedMultiplier', 'resourceGatherMultiplier',
    'combatDamageMultiplier', 'territoryExpansionRate', 'populationGrowthRate',
  ])('rejects non-positive %s', (key) => {
    const m = mockManifest();
    (m.balancing as any)[key] = 0;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects negative starting units', () => {
    const m = mockManifest();
    m.balancing.startingUnits.worker = -1;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── AI validation ──

  test.each(['aggression', 'expansionism', 'economyFocus'] as const)(
    'rejects ai.%s > 1', (key) => {
      const m = mockManifest();
      (m.ai as any)[key] = 1.5;
      const r = NationValidator.validateManifest(m);
      expect(r.valid).toBe(false);
    }
  );

  // ── Warnings (non-fatal) ──

  test('warns on unknown top-level key', () => {
    const m = mockManifest() as any;
    m.customKey = 'hello';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(true); // still valid
    expect(r.warnings.some(w => w.path === 'customKey')).toBe(true);
  });

  test('warns on empty emoji', () => {
    const m = mockManifest();
    m.visuals.emoji = '';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(true);
    expect(r.warnings.some(w => w.path === 'visuals.emoji')).toBe(true);
  });

  test('warns on special unit without displayName', () => {
    const m = mockManifest();
    delete (m.units.special as any).displayName;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(true); // still valid (kind exists)
    expect(r.warnings.some(w => w.path === 'units.special.displayName')).toBe(true);
  });

  // ── Formatting ──

  test('formatReport returns success for valid manifest', () => {
    const r = NationValidator.validateManifest(mockManifest({ id: 'romans' }));
    expect(NationValidator.formatReport(r)).toContain('✅');
    expect(NationValidator.formatSummary(r)).toContain('OK');
  });

  test('formatReport returns error detail for invalid manifest', () => {
    const r = NationValidator.validateManifest(mockManifest({ id: 'BAD!' } as any));
    const formatted = NationValidator.formatReport(r);
    expect(formatted).toContain('❌');
    expect(formatted).toContain('BAD!');
  });

  // ── Description validation ──

  test('rejects description without english entry', () => {
    const m = mockManifest();
    (m as any).description = { de: 'Test' };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'description')).toBe(true);
  });

  test('rejects non-object description', () => {
    const m = mockManifest();
    (m as any).description = 'JustString';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── visuals.secondary validation ──

  test.each(['rgb(0,0,255)', '#ggg', 'blue', '#12345', ''])(
    'rejects invalid secondary color "%s"', (color) => {
      const m = mockManifest();
      m.visuals.secondary = color;
      const r = NationValidator.validateManifest(m);
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.path === 'visuals.secondary')).toBe(true);
    }
  );

  test.each(['#3366cc', '#00FF00', '#ffcc66'])('accepts valid hex secondary color "%s"', (color) => {
    const m = mockManifest();
    m.visuals.secondary = color;
    assertValid(NationValidator.validateManifest(m));
  });

  // ── visuals.particles validation ──

  test('rejects particles missing dustColor', () => {
    const m = mockManifest();
    delete (m.visuals.particles as any).dustColor;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.particles.dustColor')).toBe(true);
  });

  test('rejects particles with non-array magicColor', () => {
    const m = mockManifest();
    (m.visuals.particles as any).magicColor = 'red';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.particles.magicColor')).toBe(true);
  });

  test('rejects particles with wrong-length constructionSpark', () => {
    const m = mockManifest();
    (m.visuals.particles as any).constructionSpark = [1, 2];
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.particles.constructionSpark')).toBe(true);
  });

  // ── Unit stats validation ──

  test('rejects worker without hp stat', () => {
    const m = mockManifest();
    delete (m.units.worker.stats as any).hp;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'units.worker.stats.hp')).toBe(true);
  });

  test('rejects soldier without attack stat', () => {
    const m = mockManifest();
    delete (m.units.soldier.stats as any).attack;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'units.soldier.stats.attack')).toBe(true);
  });

  test('rejects archer without range stat', () => {
    const m = mockManifest();
    delete (m.units.archer.stats as any).range;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'units.archer.stats.range')).toBe(true);
  });

  test('rejects settler without carryCapacity stat', () => {
    const m = mockManifest();
    delete (m.units.settler.stats as any).carryCapacity;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'units.settler.stats.carryCapacity')).toBe(true);
  });

  test('rejects worker with zero hp', () => {
    const m = mockManifest();
    m.units.worker.stats.hp = 0;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── Building overrides validation ──

  test('rejects building override missing category', () => {
    const m = mockManifest();
    m.buildings.overrides = {
      castle: { model: 'models/castle.obj', texture: 'textures/castle.png', icon: 'icons/castle.png' },
    };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path.startsWith('buildings.overrides.castle'))).toBe(true);
  });

  test('rejects building override missing model', () => {
    const m = mockManifest();
    m.buildings.overrides = {
      castle: { category: 'military', texture: 'textures/castle.png', icon: 'icons/castle.png' },
    };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects building override with non-array cost', () => {
    const m = mockManifest();
    m.buildings.overrides = {
      castle: {
        category: 'military', model: 'models/castle.obj', texture: 'textures/castle.png',
        icon: 'icons/castle.png', cost: 'not-an-array' as any,
      },
    };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects building override cost item missing resource', () => {
    const m = mockManifest();
    m.buildings.overrides = {
      castle: {
        category: 'military', model: 'models/castle.obj', texture: 'textures/castle.png',
        icon: 'icons/castle.png', cost: [{ amount: 5 } as any],
      },
    };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('accepts building override with all required fields', () => {
    const m = mockManifest();
    m.buildings.overrides = {
      castle: {
        category: 'military', model: 'models/castle.obj', texture: 'textures/castle.png',
        icon: 'icons/castle.png', animations: 'animations/generic.json',
        cost: [{ resource: 'planks', amount: 8 }], inputs: [], outputs: [],
        productionInterval: 0, buildTime: 0, requiredTool: null,
        garrisonCapacity: 6, maxHp: 500, maxSettlers: 3,
      },
    };
    assertValid(NationValidator.validateManifest(m));
  });

  // ── Buildings.categories validation ──

  test('rejects categories entry missing id', () => {
    const m = mockManifest();
    m.buildings.categories = [{ label: 'Basic', buildings: [] } as any];
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'buildings.categories[0].id')).toBe(true);
  });

  test('rejects categories entry missing label', () => {
    const m = mockManifest();
    m.buildings.categories = [{ id: 'basic', buildings: [] } as any];
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('rejects categories entry with non-array buildings', () => {
    const m = mockManifest();
    m.buildings.categories = [{ id: 'basic', label: 'Basic', buildings: 'not-array' as any }];
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  test('accepts valid categories', () => {
    const m = mockManifest();
    m.buildings.categories = [
      { id: 'basic', label: 'Basic Economy', buildings: ['forester', 'woodcutter'] },
    ];
    assertValid(NationValidator.validateManifest(m));
  });

  // ── Starting resources non-negative validation ──

  test('rejects negative starting resource', () => {
    const m = mockManifest();
    m.economy.startingResources.wood = -5;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'economy.startingResources.wood')).toBe(true);
  });

  // ── Resource bonuses positive validation ──

  test('rejects zero resource bonus', () => {
    const m = mockManifest();
    m.economy.resourceBonuses.wood = 0;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'economy.resourceBonuses.wood')).toBe(true);
  });

  test('rejects negative resource bonus', () => {
    const m = mockManifest();
    m.economy.resourceBonuses.stone = -0.5;
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
  });

  // ── Economy building reference validation (warnings) ──

  test('warns when livestock building not in overrides', () => {
    const m = mockManifest();
    m.economy.livestock.building = 'nonexistent_ranch';
    const r = NationValidator.validateManifest(m);
    expect(r.warnings.some(w => w.path === 'economy.livestock.building')).toBe(true);
  });

  test('warns when divine building not in overrides', () => {
    const m = mockManifest();
    m.economy.divine.building = 'nonexistent_crop_farm';
    const r = NationValidator.validateManifest(m);
    expect(r.warnings.some(w => w.path === 'economy.divine.building')).toBe(true);
  });

  test('warns when specialResources craftedAt not in overrides', () => {
    const m = mockManifest();
    m.specialResources = {
      gunpowder: {
        displayName: { en: 'Gunpowder' }, craftedAt: 'nonexistent_building',
        inputs: { sulfur: 2 }, outputs: { gunpowder: 1 }, icon: '',
      },
    };
    const r = NationValidator.validateManifest(m);
    expect(r.warnings.some(w => w.path === 'specialResources.gunpowder.craftedAt')).toBe(true);
  });

  // ── visuals.decorations validation ──

  test('accepts valid decorations with borderPost', () => {
    const m = mockManifest();
    m.visuals.decorations = {
      borderPost: { model: 'models/decorations/borderpost.obj', material: 'models/decorations/borderpost.mtl' },
    };
    assertValid(NationValidator.validateManifest(m));
  });

  test('accepts decorations without borderPost (optional)', () => {
    const m = mockManifest();
    m.visuals.decorations = {};
    assertValid(NationValidator.validateManifest(m));
  });

  test('rejects decorations that is not an object', () => {
    const m = mockManifest();
    (m.visuals as any).decorations = 'not-an-object';
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.decorations')).toBe(true);
  });

  test('rejects borderPost missing model', () => {
    const m = mockManifest();
    m.visuals.decorations = { borderPost: { material: 'models/decorations/borderpost.mtl' } as any };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.decorations.borderPost.model')).toBe(true);
  });

  test('rejects borderPost with empty model', () => {
    const m = mockManifest();
    m.visuals.decorations = { borderPost: { model: '' } };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.decorations.borderPost.model')).toBe(true);
  });

  test('rejects borderPost with non-string material', () => {
    const m = mockManifest();
    m.visuals.decorations = { borderPost: { model: 'models/decorations/borderpost.obj', material: 42 as any } };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.decorations.borderPost.material')).toBe(true);
  });

  test('rejects borderPost that is not an object', () => {
    const m = mockManifest();
    (m.visuals as any).decorations = { borderPost: 'nope' };
    const r = NationValidator.validateManifest(m);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.path === 'visuals.decorations.borderPost')).toBe(true);
  });

  // ── validateAllNations static method ──

  test('validateAllNations returns reports for multiple manifests', () => {
    const manifests: Record<string, NationManifest> = {
      romans: mockManifest({ id: 'romans' }),
      bad: mockManifest({ id: 'BAD!' } as any),
    };
    const reports = NationValidator.validateAllNations(manifests);
    expect(reports).toHaveLength(2);
    expect(reports.find(r => r.nationId === 'romans')?.valid).toBe(true);
    expect(reports.find(r => r.nationId === 'BAD!')?.valid).toBe(false);
  });
});
