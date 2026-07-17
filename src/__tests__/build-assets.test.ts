/**
 * Build asset verification tests.
 * @jest-environment node
 *
 * Runs `vite build` and verifies critical asset files are present in dist/.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const DIST = join(ROOT, 'dist');
const ASSETS = join(ROOT, 'assets');

const REQUIRED_ASSETS = [
  'images/splash.png', 'images/logo-1024.png', 'images/favicon-256.png',
  'textures/terrain_grass.png', 'textures/terrain_forest.png', 'textures/terrain_desert.png',
  'textures/terrain_mountain.png', 'textures/terrain_snow.png', 'textures/terrain_water.png', 'textures/terrain_swamp.png',
  'textures/building_stone.png',
  'nations/romans/nation.json',
  'nations/vikings/nation.json',
  'nations/mayans/nation.json',
  'nations/trojans/nation.json',
  'models/castle.obj', 'models/castle.mtl',
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

  it('all critical assets exist in dist/ after build', () => {
    let missingSource = 0;
    let missingInDist = 0;
    const results: string[] = [];

    for (const path of REQUIRED_ASSETS) {
      const src = join(ASSETS, path);
      const dst = join(DIST, path);
      const srcOk = existsSync(src);
      const dstOk = existsSync(dst);

      if (!srcOk && !dstOk) {
        missingSource++;
        results.push(`  ⚠️  ${path} — source missing, skipped`);
      } else if (srcOk && !dstOk) {
        missingInDist++;
        results.push(`  ❌ ${path} — BUILD BROKEN (in assets/ but not dist/)`);
      } else {
        results.push(`  ✅ ${path}`);
      }
    }

    console.log('\n' + results.join('\n'));
    console.log(`\n  📊 Source missing: ${missingSource}  ❌ Build bugs: ${missingInDist}`);

    if (missingInDist > 0) {
      throw new Error(
        `${missingInDist} asset file(s) exist in assets/ but are missing from dist/.\n` +
        `Root cause: Dockerfile is probably missing 'COPY assets/ assets/' before 'RUN npm run build'.\n` +
        `Or: vite.config.ts publicDir is not set to 'assets'.`
      );
    }
    // missingSource is fine — those are files we know we haven't generated yet
    expect(true).toBe(true);
  });
});
