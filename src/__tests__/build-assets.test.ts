/**
 * Build asset verification tests.
 * @jest-environment node
 *
 * Runs `vite build` and verifies critical asset files are present in dist/.
 * Distinguishes between:
 *   - Source file missing → WARN (known gap, logged for tracking)
 *   - Source exists but missing in dist → FAIL (build bug like missing COPY)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const ASSETS = join(ROOT, 'assets');

/** Files that must land in dist/ if they exist in assets/ */
const REQUIRED_ASSETS = [
  'images/splash.png',
  'images/logo-1024.png',
  'images/favicon-256.png',
  'textures/terrain_grass.png',
  'textures/terrain_forest.png',
  'textures/terrain_desert.png',
  'textures/terrain_mountain.png',
  'textures/terrain_snow.png',
  'textures/terrain_water.png',
  'textures/terrain_swamp.png',
  'textures/building_stone.png',
  'textures/building_timber.png',
  'textures/ui_button.png',
  'textures/ui_panel.png',
  'textures/ui_corner.png',
  'textures/ui_button_hover.png',
  'models/castle.obj',
  'models/castle.mtl',
  'maps/test/tutorial.json',
  'maps/test/big_4P.json',
];

describe('Vite build assets', () => {
  beforeAll(() => {
    execSync('npx vite build', { cwd: ROOT, stdio: 'pipe', timeout: 60_000 });
  }, 70_000);

  it('dist/ exists and has index.html', () => {
    expect(existsSync(DIST)).toBe(true);
    expect(existsSync(join(DIST, 'index.html'))).toBe(true);
  });

  it('dist/ has at least 20 files', () => {
    let c = 0;
    const w = (d: string) => {
      for (const e of require('fs').readdirSync(d, { withFileTypes: true })) {
        if (e.isFile()) c++;
        if (e.isDirectory()) w(join(d, e.name));
      }
    };
    w(DIST);
    expect(c).toBeGreaterThanOrEqual(20);
  });

  // Check each asset
  let missingSource = 0;
  let missingInDist = 0;

  for (const path of REQUIRED_ASSETS) {
    const src = join(ASSETS, path);
    const dst = join(DIST, path);

    const srcExists = existsSync(src);
    const dstExists = existsSync(dst);

    if (!srcExists && !dstExists) {
      // Neither exists — known gap, log warning
      it(`${path} [KNOWN MISSING]`, () => {
        missingSource++;
        console.warn(`  ⚠️  ${path} — source file does not exist in assets/, skipped.`);
        expect(true).toBe(true); // pass but log
      });
    } else if (srcExists && !dstExists) {
      // Source exists but NOT in dist — BUILD BUG!
      it(`${path} — BUILD BROKEN ❌`, () => {
        missingInDist++;
        throw new Error(
          `❌ ${path} exists in assets/ but NOT in dist/!\n` +
          `   Source: ${src}\n` +
          `   Expected: ${dst}\n` +
          `   Root cause: Dockerfile probably didn't COPY assets/ assets/\n` +
          `   Check: Dockerfile line ~20 should have 'COPY assets/ assets/'\n` +
          `          AND vite.config.ts should have publicDir: 'assets'`
        );
      });
    } else {
      // Both exist — OK
      it(`${path} ✅`, () => {
        expect(dstExists).toBe(true);
      });
    }
  }

  it('summary: no build regressions detected', () => {
    console.log(`\n  📊 Source missing (known gaps): ${missingSource}`);
    console.log(`  ❌ Missing in dist (build bugs):  ${missingInDist}`);
    expect(missingInDist).toBe(0);
  });
});
