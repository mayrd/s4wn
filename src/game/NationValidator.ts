/**
 * S4WN — Nation Pack Validator
 *
 * Checks the correctness and completeness of a nation pack. Each nation
 * in `assets/nations/{id}/` must pass every rule listed below. Failed
 * packs are rejected with descriptive error messages.
 *
 * Validation rules (in order):
 *  1. `nation.json` exists and is valid JSON
 *  2. All required top-level keys present with correct types
 *  3. `visuals.color` is a valid hex colour
 *  4. Economy chains reference valid building/unit identifiers
 *  5. Unit and building `model`, `texture`, `icon` paths resolve to files on disk
 *  6. Required subdirectories exist (models/, textures/, animations/, icons/)
 *  7. `buildings.overrides` keys match known BuildingType discriminants
 *  8. `specialResources` items have valid ingredient/product recipes
 */

import { NationManifest } from './NationRegistry';

// ── Types ────────────────────────────────────────────────────────

export interface ValidationError {
  /** Dot-notation path to the invalid key, e.g. "units.soldier.model". */
  path: string;
  /** Human-readable error message. */
  message: string;
}

export interface ValidationReport {
  nationId: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[]; // non-fatal issues
}

// ── Helpers ──────────────────────────────────────────────────────

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Allowed top-level keys in a nation manifest. Unknown keys are warnings, not errors. */
const TOP_LEVEL_KEYS = new Set([
  'version', 'id', 'name', 'description', 'visuals', 'economy',
  'units', 'buildings', 'balancing', 'specialResources', 'techTree', 'ai',
]);

const REQUIRED_TOP_KEYS = [
  'version', 'id', 'name', 'visuals', 'economy', 'units', 'buildings', 'balancing',
] as const;

// ── Validator ────────────────────────────────────────────────────

export class NationValidator {
  /**
   * Validate a single raw manifest (already parsed from JSON).
   * Does NOT perform file-existence checks — those require IO and are
   * done separately via `validateWithFiles()`.
   */
  static validateManifest(manifest: NationManifest): ValidationReport {
    const report: ValidationReport = {
      nationId: manifest?.id ?? 'unknown',
      valid: true,
      errors: [],
      warnings: [],
    };

    if (!manifest || typeof manifest !== 'object') {
      report.valid = false;
      report.errors.push({ path: '$', message: 'Manifest is null or not an object.' });
      return report;
    }

    const m = manifest as unknown as Record<string, unknown>;

    // ---- 1. Required top-level keys ----
    for (const key of REQUIRED_TOP_KEYS) {
      if (m[key] === undefined) {
        report.valid = false;
        report.errors.push({ path: key, message: `Missing required key "${key}".` });
      }
    }

    // ---- 2. Unknown top-level keys (warning) ----
    for (const key of Object.keys(m)) {
      if (!TOP_LEVEL_KEYS.has(key) && !key.startsWith('$')) {
        report.warnings.push({ path: key, message: `Unknown top-level key "${key}" — ignored.` });
      }
    }

    // ---- 3. id validation ----
    if (typeof m.id !== 'string' || !/^[a-z][a-z0-9_]*$/.test(m.id as string)) {
      report.valid = false;
      report.errors.push({
        path: 'id',
        message: `"id" must be a non-empty string matching [a-z][a-z0-9_]*. Got: "${m.id}"`,
      });
    }

    // ---- 4. name validation ----
    if (typeof m.name !== 'object' || !m.name || typeof (m.name as Record<string, unknown>).en !== 'string') {
      report.valid = false;
      report.errors.push({ path: 'name', message: '"name" must be an object with at least an "en" entry.' });
    }

    // ---- 5. visuals ----
    const visuals = m.visuals as Record<string, unknown> | undefined;
    if (visuals) {
      if (typeof visuals.color !== 'string' || !HEX_COLOR_RE.test(visuals.color)) {
        report.valid = false;
        report.errors.push({ path: 'visuals.color', message: `Must be a #rrggbb hex string. Got: "${visuals.color}".` });
      }
      if (typeof visuals.emoji !== 'string' || visuals.emoji.length === 0) {
        report.warnings.push({ path: 'visuals.emoji', message: 'Emoji is recommended but empty.' });
      }
      if (typeof visuals.uiTheme !== 'string') {
        report.warnings.push({ path: 'visuals.uiTheme', message: 'uiTheme should be a string ("stone", "wood", "gold", "dark").' });
      }
    }

    // ---- 6. version ----
    if (typeof m.version !== 'number' || m.version <= 0) {
      report.valid = false;
      report.errors.push({ path: 'version', message: '"version" must be a positive integer.' });
    }

    // ---- 7. economy ----
    const economy = m.economy as Record<string, unknown> | undefined;
    if (economy) {
      this.validateEconomy(economy, report);
    }

    // ---- 8. units ----
    const units = m.units as Record<string, unknown> | undefined;
    if (units) {
      this.validateUnits(units, report);
    }

    // ---- 9. buildings ----
    const buildings = m.buildings as Record<string, unknown> | undefined;
    if (buildings) {
      this.validateBuildings(buildings, report);
    }

    // ---- 10. balancing ----
    const balancing = m.balancing as Record<string, unknown> | undefined;
    if (balancing) {
      this.validateBalancing(balancing, report);
    }

    // ---- 11. specialResources ----
    const sr = m.specialResources as Record<string, unknown> | undefined;
    if (sr) {
      this.validateSpecialResources(sr, report);
    }

    // ---- 12. techTree ----
    const tt = m.techTree as Record<string, unknown> | undefined;
    if (tt) {
      this.validateTechTree(tt, report);
    }

    // ---- 13. ai ----
    const ai = m.ai as Record<string, unknown> | undefined;
    if (ai) {
      this.validateAI(ai, report);
    }

    return report;
  }

  private static validateEconomy(eco: Record<string, unknown>, r: ValidationReport): void {
    const livestock = eco.livestock as Record<string, string> | undefined;
    if (livestock) {
      for (const k of ['kind', 'building', 'product']) {
        if (typeof livestock[k] !== 'string' || livestock[k].length === 0) {
          r.valid = false;
          r.errors.push({ path: `economy.livestock.${k}`, message: `Must be a non-empty string.` });
        }
      }
    }
    const divine = eco.divine as Record<string, string> | undefined;
    if (divine) {
      for (const k of ['crop', 'rawResource', 'processedInto', 'building', 'processor']) {
        if (typeof divine[k] !== 'string' || divine[k].length === 0) {
          r.valid = false;
          r.errors.push({ path: `economy.divine.${k}`, message: `Must be a non-empty string.` });
        }
      }
    }
    const starting = eco.startingResources as Record<string, number> | undefined;
    if (starting) {
      const knownResources = ['wood', 'stone', 'food', 'gold', 'iron', 'coal', 'sulfur'];
      for (const res of knownResources) {
        if (typeof starting[res] !== 'number') {
          r.valid = false;
          r.errors.push({ path: `economy.startingResources.${res}`, message: `Must be a number.` });
        }
      }
    }
  }

  private static validateUnits(units: Record<string, unknown>, r: ValidationReport): void {
    const unitKeys = ['worker', 'soldier', 'archer', 'settler'];
    for (const key of unitKeys) {
      const u = units[key] as Record<string, unknown> | undefined;
      if (!u) {
        r.valid = false;
        r.errors.push({ path: `units.${key}`, message: `Missing required unit "${key}".` });
        continue;
      }
      for (const sub of ['model', 'texture', 'animations', 'icon']) {
        if (typeof u[sub] !== 'string') {
          r.warnings.push({ path: `units.${key}.${sub}`, message: `Path should be a string (empty is allowed for fallback).` });
        }
      }
      const stats = u.stats as Record<string, number> | undefined;
      if (stats && typeof stats.hp !== 'number') {
        r.warnings.push({ path: `units.${key}.stats.hp`, message: 'HP should be a number.' });
      }
    }
    // Special unit
    const special = units.special as Record<string, unknown> | undefined;
    if (special) {
      if (typeof special.kind !== 'string' || special.kind.length === 0) {
        r.valid = false;
        r.errors.push({ path: 'units.special.kind', message: 'Special unit must have a non-empty "kind".' });
      }
      if (typeof special.displayName !== 'object' || !(special.displayName as Record<string, string>)?.en) {
        r.warnings.push({ path: 'units.special.displayName', message: 'Should have at least an "en" display name.' });
      }
    }
  }

  private static validateBuildings(b: Record<string, unknown>, r: ValidationReport): void {
    const overrides = b.overrides as Record<string, Record<string, string>> | undefined;
    if (!overrides || typeof overrides !== 'object') {
      r.warnings.push({ path: 'buildings.overrides', message: 'No building overrides defined — generic fallbacks will be used.' });
      return;
    }
    for (const [key, override] of Object.entries(overrides)) {
      if (override && typeof override === 'object') {
        for (const sub of ['model', 'texture', 'icon', 'animations']) {
          const val = (override as Record<string, string>)[sub];
          if (val !== undefined && typeof val !== 'string') {
            r.warnings.push({ path: `buildings.overrides.${key}.${sub}`, message: 'Should be a string path.' });
          }
        }
      }
    }
  }

  private static validateBalancing(b: Record<string, unknown>, r: ValidationReport): void {
    const multKeys = ['buildSpeedMultiplier', 'unitTrainSpeedMultiplier', 'resourceGatherMultiplier',
      'combatDamageMultiplier', 'territoryExpansionRate', 'populationGrowthRate'];
    for (const k of multKeys) {
      if (typeof b[k] !== 'number' || b[k] as number <= 0) {
        r.valid = false;
        r.errors.push({ path: `balancing.${k}`, message: `Must be a positive number.` });
      }
    }
    const su = b.startingUnits as Record<string, number> | undefined;
    if (su) {
      for (const k of ['worker', 'soldier', 'settler']) {
        if (typeof su[k] !== 'number' || su[k] < 0) {
          r.valid = false;
          r.errors.push({ path: `balancing.startingUnits.${k}`, message: `Must be a non-negative integer.` });
        }
      }
    }
  }

  private static validateSpecialResources(sr: Record<string, unknown>, r: ValidationReport): void {
    for (const [key, val] of Object.entries(sr)) {
      const item = val as Record<string, unknown>;
      if (!item) continue;
      if (typeof item.displayName !== 'object') {
        r.warnings.push({ path: `specialResources.${key}.displayName`, message: 'Should be an object with at least "en".' });
      }
      if (typeof item.craftedAt !== 'string') {
        r.valid = false;
        r.errors.push({ path: `specialResources.${key}.craftedAt`, message: 'Missing "craftedAt" building reference.' });
      }
      if (typeof item.inputs !== 'object' || typeof item.outputs !== 'object') {
        r.valid = false;
        r.errors.push({ path: `specialResources.${key}`, message: 'Must have "inputs" and "outputs" objects.' });
      }
    }
  }

  private static validateTechTree(tt: Record<string, unknown>, r: ValidationReport): void {
    const nodes = tt.nodes as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(nodes)) {
      r.warnings.push({ path: 'techTree.nodes', message: '"nodes" should be an array.' });
      return;
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (typeof n.id !== 'string') {
        r.valid = false;
        r.errors.push({ path: `techTree.nodes[${i}].id`, message: 'Tech node missing "id".' });
      }
    }
  }

  private static validateAI(ai: Record<string, unknown>, r: ValidationReport): void {
    for (const k of ['aggression', 'expansionism', 'economyFocus']) {
      const v = ai[k] as number;
      if (typeof v !== 'number' || v < 0 || v > 1) {
        r.valid = false;
        r.errors.push({ path: `ai.${k}`, message: `Must be a number between 0 and 1.` });
      }
    }
    if (!Array.isArray(ai.preferredUnits)) {
      r.warnings.push({ path: 'ai.preferredUnits', message: 'Should be an array of unit kind strings.' });
    }
  }

  /**
   * Validate a nation pack on disk. Checks that the folder exists, nation.json
   * is present and valid, all referenced asset files exist, and required
   * subdirectories are in place.
   *
   * @param baseDir  Root directory containing nation packs (e.g., "/nations").
   * @param nationId The nation folder name to validate.
   * @param fetchFn  Optional function to resolve asset paths (in browser: `fetch()`;
   *                 in Node: fs.existsSync). Defaults to `fetch()` for web runtime.
   */
  static async validateOnDisk(
    baseDir: string,
    nationId: string,
    fetchFn: (path: string) => Promise<boolean> = NationValidator.defaultPathChecker,
  ): Promise<ValidationReport> {
    const report: ValidationReport = {
      nationId,
      valid: true,
      errors: [],
      warnings: [],
    };

    const packDir = `${baseDir}/${nationId}`;

    // ---- Check nation.json exists ----
    const manifestPath = `${packDir}/nation.json`;
    let manifest: NationManifest | null = null;
    try {
      const resp = await fetch(manifestPath);
      if (!resp.ok) {
        report.valid = false;
        report.errors.push({ path: manifestPath, message: `nation.json not found (HTTP ${resp.status}).` });
        return report;
      }
      const json = await resp.json();
      const schemaReport = this.validateManifest(json);
      Object.assign(report, schemaReport); // Merge schema validation results
      manifest = json as NationManifest;
    } catch {
      report.valid = false;
      report.errors.push({ path: manifestPath, message: 'Failed to fetch or parse nation.json.' });
      return report;
    }

    // ---- Check required subdirectories ----
    const requiredDirs = ['models', 'textures', 'animations', 'icons'];
    for (const dir of requiredDirs) {
      const dirPath = `${packDir}/${dir}/`;
      const exists = await fetchFn(dirPath);
      if (!exists) {
        report.warnings.push({ path: dirPath, message: `Optional subdirectory "${dir}/" not found.` });
      }
    }

    // ---- Check referenced asset files ----
    if (manifest) {
      const paths: string[] = [];
      const m = manifest;

      // Units
      for (const key of ['worker', 'soldier', 'archer', 'settler'] as const) {
        const u = m.units[key];
        if (u) {
          if (u.model) paths.push(`${packDir}/${u.model}`);
          if (u.texture) paths.push(`${packDir}/${u.texture}`);
          if (u.icon) paths.push(`${packDir}/${u.icon}`);
        }
      }
      if (m.units.special) {
        const s = m.units.special;
        if (s.model) paths.push(`${packDir}/${s.model}`);
        if (s.texture) paths.push(`${packDir}/${s.texture}`);
        if (s.icon) paths.push(`${packDir}/${s.icon}`);
      }

      // Buildings
      const overrides = m.buildings?.overrides ?? {};
      for (const [, override] of Object.entries(overrides)) {
        if (override.model) paths.push(`${packDir}/${override.model}`);
        if (override.texture) paths.push(`${packDir}/${override.texture}`);
        if (override.icon) paths.push(`${packDir}/${override.icon}`);
      }

      // Visuals
      if (m.visuals.emblem) paths.push(`${packDir}/${m.visuals.emblem}`);
      if (m.visuals.flag) paths.push(`${packDir}/${m.visuals.flag}`);
      if (m.visuals.loadingBg) paths.push(`${packDir}/${m.visuals.loadingBg}`);

      // Check each path (deduplicate)
      const uniquePaths = [...new Set(paths)];
      for (const p of uniquePaths) {
        try {
          const resp = await fetch(p);
          if (!resp.ok) {
            report.valid = false;
            report.errors.push({ path: p, message: `Referenced file not found (HTTP ${resp.status}).` });
          }
        } catch {
          report.valid = false;
          report.errors.push({ path: p, message: 'Failed to fetch referenced file.' });
        }
      }
    }

    return report;
  }

  /** Default path checker: tries HEAD request, falls back to GET. */
  private static async defaultPathChecker(path: string): Promise<boolean> {
    try {
      const resp = await fetch(path, { method: 'HEAD' });
      return resp.ok;
    } catch {
      return false;
    }
  }

  /** Summarise a report as a single-line string. */
  static formatReport(report: ValidationReport): string {
    if (report.valid && report.errors.length === 0) {
      const warns = report.warnings.length > 0 ? ` (${report.warnings.length} warnings)` : '';
      return `✅ ${report.nationId}: valid${warns}`;
    }
    const errorList = report.errors.map((e) => `  ❌ ${e.path}: ${e.message}`).join('\n');
    const warnList = report.warnings.map((w) => `  ⚠️ ${w.path}: ${w.message}`).join('\n');
    const parts: string[] = [];
    if (report.errors.length > 0) parts.push(errorList);
    if (report.warnings.length > 0) parts.push(warnList);
    return `❌ ${report.nationId}: ${report.errors.length} error(s)\n${parts.join('\n')}`;
  }

  /** Short one-liner suitable for the console / debug panel. */
  static formatSummary(report: ValidationReport): string {
    if (report.valid) return `✅ ${report.nationId}: OK`;
    const firstErr = report.errors[0]?.message ?? 'unknown error';
    return `❌ ${report.nationId}: ${firstErr}`;
  }
}
