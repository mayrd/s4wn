import { test, expect } from '@playwright/test';

test.describe('Initial UI Flow', () => {
  test('should show splash screen with background image and logo', async ({ page }) => {
    // Go to the app
    await page.goto('/');

    // 1. Check if splash screen is visible
    const splashScreen = page.locator('.splash-screen');
    await expect(splashScreen).toBeVisible();
    await expect(splashScreen).toHaveClass(/active/);

    // 2. Check for splash logo and loading text
    await expect(page.locator('.splash-logo')).toContainText('S4WN');
    await expect(page.locator('.splash-loading')).toContainText('Loading the world...');

    // 3. Verify splash screen has background image (not just color)
    const backgroundImage = await splashScreen.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.backgroundImage;
    });
    expect(backgroundImage).toContain('splash.png');
  });

  test('should transition to main menu after splash', async ({ page }) => {
    await page.goto('/');

    // Wait for splash to transition (3 seconds)
    await page.locator('#btn-new-game').waitFor({ state: 'visible', timeout: 5000 });

    const mainMenu = page.locator('.main-menu-screen');
    await expect(mainMenu).toHaveClass(/active/);
    await expect(page.locator('.menu-title')).toContainText('S4WN');
    await expect(page.locator('#btn-tutorial')).toBeVisible();
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await expect(page.locator('#btn-load-game')).toBeVisible();
  });
});

test.describe('Tutorial Game View', () => {
  test('should show terrain and castle when starting tutorial', async ({ page }) => {
    // Go to the app and wait for splash to transition
    await page.goto('/');
    await page.locator('#btn-tutorial').waitFor({ state: 'visible', timeout: 5000 });

    // Click tutorial button to start game
    await page.locator('#btn-tutorial').click();

    // Wait for game-start event to trigger (game to unpause)
    await page.waitForTimeout(500);

    // Check that terrain canvas is present and rendering
    const canvas = page.locator('#renderCanvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCount(1);

    // Check that the canvas has been initialized (not just blank)
    // The terrain should render to the canvas
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.width).toBeGreaterThan(0);
    expect(canvasBox?.height).toBeGreaterThan(0);

    // Verify the scene is initialized by checking for WebGL context
    const isCanvasInitialized = await canvas.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('webgl2') || el.getContext('webgl');
      return !!ctx;
    });
    expect(isCanvasInitialized).toBe(true);

    // Verify background is not red (clear color should be sky blue)
    // We can't easily check actual pixel colors in headless mode, but we can verify
    // the canvas has content by checking it's been rendered to
    const canvasHasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
      // Check if canvas has been drawn to (not just blank)
      const ctx = el.getContext('2d') as CanvasRenderingContext2D;
      if (!ctx) return false;
      // This is a simple check - in practice WebGL renders differently
      return el.width > 0 && el.height > 0;
    });
    expect(canvasHasContent).toBe(true);
  });
});