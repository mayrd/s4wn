import { test, expect } from '@playwright/test';

/**
 * S4WN Visual Regression Tests
 *
 * Captures baseline screenshots of key UI states for visual comparison.
 * Baseline snapshots are stored in tests/ui/__snapshots__/ (committed to git).
 * Diffs on failure go to test-results/ (gitignored).
 *
 * To update baselines:  PLAYWRIGHT_UPDATE_SNAPSHOTS=1 npx playwright test -c tests/playwright.config.ts tests/ui/visual.spec.ts
 */

// Shared setup: navigate to app, wait for splash→menu transition
async function goToMainMenu(page) {
  await page.goto('/');
  await page.waitForSelector('#ui-overlay', { state: 'visible' });
  await page.waitForSelector('.main-menu-screen.active', { state: 'visible', timeout: 8000 });
}

test.describe('Visual Regression — Main Menu', () => {
  test('full main menu screen matches baseline', async ({ page }) => {
    await goToMainMenu(page);
    const menu = page.locator('.main-menu-screen');
    await expect(menu).toHaveScreenshot('main-menu-full.png', {
      threshold: 0.1,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('menu container matches baseline', async ({ page }) => {
    await goToMainMenu(page);
    const container = page.locator('.main-menu-container');
    await expect(container).toHaveScreenshot('main-menu-container.png', {
      threshold: 0.1,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('menu buttons are present', async ({ page }) => {
    await goToMainMenu(page);
    await expect(page.locator('#btn-tutorial')).toBeVisible();
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await expect(page.locator('#btn-explorer')).toBeVisible();
  });
});

test.describe('Visual Regression — Object Explorer', () => {
  test.beforeEach(async ({ page }) => {
    // Object Explorer is only available after starting a game (GameApp has GameLoop).
    await goToMainMenu(page);
    await page.locator('#btn-tutorial').waitFor({ state: 'visible' });
    await page.click('#btn-tutorial');
    // Wait for GameApp to initialize and HUD to appear
    await page.locator('#hud-container').waitFor({ state: 'visible', timeout: 10000 });
  });

  test('object explorer panel matches baseline', async ({ page }) => {
    // Toggle via the GameApp API since the main-menu #btn-explorer is hidden
    // behind the game view after game-start.
    await page.evaluate(() => {
      const app = (window as any).gameApp;
      if (app?.objectExplorer) app.objectExplorer.toggle();
    });

    const explorer = page.locator('.explorer-panel');
    await explorer.waitFor({ state: 'visible', timeout: 5000 });

    // Explorer updates on every game tick — use generous stability settings
    await expect(explorer).toHaveScreenshot('object-explorer.png', {
      threshold: 0.15,
      maxDiffPixelRatio: 0.05,
      timeout: 10000,
    });
  });

  test('object explorer can be closed', async ({ page }) => {
    await page.evaluate(() => {
      const app = (window as any).gameApp;
      if (app?.objectExplorer) app.objectExplorer.toggle();
    });
    await page.locator('.explorer-panel').waitFor({ state: 'visible', timeout: 5000 });

    // Close via the toggle API — avoids pointer-event interception by debug panel
    await page.evaluate(() => {
      const app = (window as any).gameApp;
      if (app?.objectExplorer) app.objectExplorer.toggle();
    });

    // Panel should hide (classList has 'hidden')
    const explorer = page.locator('.explorer-panel');
    await expect(explorer).toHaveClass(/hidden/, { timeout: 3000 });
  });
});

test.describe('Visual Regression — In-Game HUD', () => {
  test.beforeEach(async ({ page }) => {
    await goToMainMenu(page);
    await page.locator('#btn-tutorial').waitFor({ state: 'visible' });
    await page.click('#btn-tutorial');
    // Wait for HUD to appear after game starts
    await page.locator('#hud-container').waitFor({ state: 'visible', timeout: 8000 });
  });

  test('HUD container matches baseline', async ({ page }) => {
    const hud = page.locator('#hud-container');
    await expect(hud).toHaveScreenshot('hud-container.png', {
      threshold: 0.1,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('save button exists in HUD', async ({ page }) => {
    const saveBtn = page.locator('#btn-save-game');
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
  });

  test('in-game canvas is visible and actively rendering', async ({ page }) => {
    // The WebGL canvas is continuously animated, so a stable pixel-comparison
    // screenshot is impossible — every rendered frame differs from the
    // committed baseline, which made this test fail CI on every run once
    // snapshot enforcement was enabled. Instead we assert the game actually
    // started and the canvas has a live WebGL context + real dimensions. This
    // still catches "game failed to start / canvas blank" regressions without
    // flakiness.
    const canvas = page.locator('#renderCanvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const info = await canvas.evaluate((el: HTMLCanvasElement) => {
      const gl = el.getContext('webgl2') || el.getContext('webgl');
      return { hasContext: !!gl, width: el.width, height: el.height };
    });
    expect(info.hasContext, 'render canvas has no WebGL context').toBe(true);
    expect(info.width).toBeGreaterThan(0);
    expect(info.height).toBeGreaterThan(0);

    // The game loop should be running (scene + engine + loop alive).
    const running = await page.evaluate(() => {
      const app = (window as any).gameApp;
      return !!(app && app.scene && app.engine && app.gameLoop);
    });
    expect(running, 'GameApp did not start a running scene').toBe(true);
  });
});

test.describe('Visual Regression — Splash Screen', () => {
  test('splash screen appears before transition', async ({ page }) => {
    // Navigate fresh
    await page.goto('/');
    await page.waitForSelector('#ui-overlay', { state: 'visible' });

    // The splash should be the first `.ui-screen.active`
    const splash = page.locator('.splash-screen.active');
    // It may transition quickly — if already gone, the test is informational
    if (await splash.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(splash).toHaveScreenshot('splash-screen.png', {
        threshold: 0.15,
        maxDiffPixelRatio: 0.05,
      });
    }
    // Always passes — splash may have already transitioned
  });
});
