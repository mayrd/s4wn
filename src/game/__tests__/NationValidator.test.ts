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
    buildings: { overrides: {} },
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
});
