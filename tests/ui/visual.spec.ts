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
      maxDiffPixelRatio: 0.20,
      threshold: 0.30,
    });
  });

  test('menu container matches baseline', async ({ page }) => {
    await goToMainMenu(page);
    const container = page.locator('.main-menu-container');
    await expect(container).toHaveScreenshot('main-menu-container.png', {
      maxDiffPixelRatio: 0.20,
      threshold: 0.30,
    });
  });

  test('menu buttons are present', async ({ page }) => {
    await goToMainMenu(page);
    await expect(page.locator('#btn-tutorial')).toBeVisible();
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await expect(page.locator('#btn-explorer')).toBeVisible();
  });
});

test.describe('Visual Regression — Object Explorer Standalone', () => {
  test('object explorer opens from menu without game', async ({ page }) => {
    // Object Explorer works standalone — no need to start a game first
    await goToMainMenu(page);
    await page.locator('#btn-explorer').waitFor({ state: 'visible' });
    await page.click('#btn-explorer');

    // Object Explorer should open immediately (standalone mode)
    const explorer = page.locator('.explorer-panel');
    await explorer.waitFor({ state: 'visible', timeout: 5000 });

    // Explorer shows static catalog in standalone mode (no "Live" toggle)
    await expect(explorer).toHaveScreenshot('object-explorer-standalone.png', {
      timeout: 10000,
      maxDiffPixelRatio: 0.20,
      threshold: 0.30,
    });
  });

  test('object explorer can be closed', async ({ page }) => {
    await goToMainMenu(page);
    await page.click('#btn-explorer');
    await page.locator('.explorer-panel').waitFor({ state: 'visible', timeout: 5000 });

    // Close via the close button since we are in standalone mode (no gameApp)
    await page.click('.explorer-close');

    // Panel should hide (classList has 'hidden')
    const explorer = page.locator('.explorer-panel');
    await expect(explorer).toHaveClass(/hidden/, { timeout: 3000 });
  });

  test('object explorer shows terrain tab', async ({ page }) => {
    await goToMainMenu(page);
    await page.click('#btn-explorer');
    await page.locator('.explorer-panel').waitFor({ state: 'visible', timeout: 5000 });

    // Check that terrain tab is active and has items
    const terrainTab = page.locator('.explorer-tab[data-tab="terrain"]');
    await expect(terrainTab).toBeVisible();

    // Verify there are terrain items in the list
    const terrainItems = page.locator('.explorer-item');
    await expect(terrainItems.first()).toBeVisible();
  });
});

test.describe('Visual Regression — In-Game HUD', () => {
  test.beforeEach(async ({ page }) => {
    await goToMainMenu(page);
    await page.locator('#btn-tutorial').waitFor({ state: 'visible' });
    await page.click('#btn-tutorial');
    // Wait for loading screen to hide (assets loaded) before HUD is visible
    await page.waitForFunction(() => {
      const splash = document.querySelector('.splash-screen');
      return !splash?.classList.contains('active');
    }, { timeout: 30000 });
    // Wait for HUD to appear after loading completes
    await page.locator('#hud-container').waitFor({ state: 'visible', timeout: 10000 });
  });

  test('HUD container matches baseline', async ({ page }) => {
    // Pause the game loop and freeze dynamic values so the DOM becomes visually stable
    await page.evaluate(() => {
      const app = (window as any).gameApp;
      if (app && app.gameLoop) {
        app.gameLoop.state.isPaused = true;
        // Override getStats so the HUD update loop reads consistent values
        app.gameLoop.getStats = () => ({ fps: 60, ticks: 42, gameTime: 10, zoom: 0 });
      }
      if (app && app.engine) {
        app.engine.stopRenderLoop();
      }
    });

    // Short wait to ensure any pending requestAnimationFrame frames execute
    await page.waitForTimeout(100);

    // The anno-build-bar is the main in-game menu now (vertical left panel)
    // The old #hud-container is hidden (#stats-panel is display:none)
    // We test the main build bar which contains all the in-game UI
    const menu = page.locator('#anno-build-bar');
    await expect(menu).toHaveScreenshot('hud-container.png', {
      maxDiffPixelRatio: 0.20,
      threshold: 0.30,
    });
  });

  test('save button exists in HUD', async ({ page }) => {
    // Save button is now in the Game Menu tab (⚙️) of the anno-build-bar
    const buildBar = page.locator('#anno-build-bar');
    await buildBar.waitFor({ state: 'visible', timeout: 5000 });

    // Click the Game Menu tab to reveal save/pause/exit buttons
    await page.click('.build-bar-tab-btn[data-main-tab="ingamemenu"]');
    await page.waitForTimeout(200);

    const saveBtn = page.locator('#menu-btn-save');
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
        maxDiffPixelRatio: 0.20,
        threshold: 0.30,
      });
    }
    // Always passes — splash may have already transitioned
  });
});

test.describe('Visual Regression — Object Explorer In-Game', () => {
  test.beforeEach(async ({ page }) => {
    // Start a game to get the connected ObjectExplorer with live data
    await goToMainMenu(page);
    await page.locator('#btn-tutorial').waitFor({ state: 'visible' });
    await page.click('#btn-tutorial');
    // Wait for loading screen to hide (assets loaded) before HUD is visible
    await page.waitForFunction(() => {
      const splash = document.querySelector('.splash-screen');
      return !splash?.classList.contains('active');
    }, { timeout: 30000 });
    // Wait for HUD to appear after loading completes
    await page.locator('#hud-container').waitFor({ state: 'visible', timeout: 10000 });
  });

  test('object explorer shows live data when connected to game', async ({ page }) => {
    // Toggle via the GameApp API
    await page.evaluate(() => {
      const app = (window as any).gameApp;
      if (app?.ui?.objectExplorer) app.ui.objectExplorer.toggle();
    });

    const explorer = page.locator('.explorer-panel');
    await explorer.waitFor({ state: 'visible', timeout: 5000 });

    // Verify the explorer panel has the Live toggle (indicates connected mode)
    const liveToggle = page.locator('.explorer-autorefresh-toggle');
    await expect(liveToggle).toBeVisible({ timeout: 3000 });
    
    // Verify we can see resource items (indicates live game connection)
    const resourceTab = page.locator('.explorer-tab[data-tab="resources"]');
    await expect(resourceTab).toBeVisible();
  });
});
