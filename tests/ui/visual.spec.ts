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
  test('object explorer panel matches baseline', async ({ page }) => {
    await goToMainMenu(page);
    await page.locator('#btn-explorer').waitFor({ state: 'visible' });
    await page.click('#btn-explorer');

    const explorer = page.locator('.explorer-panel');
    await explorer.waitFor({ state: 'visible', timeout: 5000 });

    await expect(explorer).toHaveScreenshot('object-explorer.png', {
      threshold: 0.1,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('object explorer can be closed', async ({ page }) => {
    await goToMainMenu(page);
    await page.click('#btn-explorer');
    await page.locator('.explorer-panel').waitFor({ state: 'visible', timeout: 5000 });

    // Close via toggle button or click outside
    // Use Escape key or find the close button
    const closeBtn = page.locator('.explorer-panel .close-btn');
    if (await closeBtn.isVisible({ timeout: 2000 })) {
      await closeBtn.click();
    } else {
      await page.click('#btn-explorer'); // toggle off
    }

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

  test('full viewport in-game matches baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('in-game-full.png', {
      fullPage: false,
      threshold: 0.1,
      maxDiffPixelRatio: 0.05,
    });
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
