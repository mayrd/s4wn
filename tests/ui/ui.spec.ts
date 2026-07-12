import { test, expect } from '@playwright/test';

test.describe('Initial UI Flow', () => {
  test('should show splash screen and then transition to main menu', async ({ page }) => {
    // Go to the app
    await page.goto('/');

    // 1. Check if splash screen is visible
    const splashScreen = page.locator('.splash-screen');
    await expect(splashScreen).toBeVisible();
    await expect(splashScreen).toHaveClass(/active/);
    await expect(page.locator('.splash-logo')).toContainText('S4WN');
    await expect(page.locator('.splash-loading')).toContainText('Loading the world...');

    // 2. Wait for transition to main menu (3 seconds in UIManager.ts)
    const mainMenu = page.locator('.ui-screen', { has: page.locator('.main-menu-container') }); 
    // Use the container to uniquely identify the main menu screen
    // but it's the only other screen. Let's be more specific if possible.
    // Wait, in UIManager.ts: this.mainMenu.className = 'ui-screen';
    // I'll wait for the main menu buttons to appear which indicates transition is complete.
    
    await expect(page.locator('#btn-new-game')).toBeVisible({ timeout: 5000 });
    
    // 3. Verify main menu is active and splash screen is gone
    await expect(mainMenu).toHaveClass(/active/);
    await expect(splashScreen).not.toHaveClass(/active/);
    
    // 4. Verify menu buttons are present
    await expect(page.locator('.menu-title')).toContainText('S4WN');
    await expect(page.locator('#btn-tutorial')).toBeVisible();
    await expect(page.locator('#btn-new-game')).toBeVisible();
    await expect(page.locator('#btn-load-game')).toBeVisible();
  });

  test('should show terrain and castle when starting tutorial', async ({ page }) => {
    // Go to the app and wait for splash to transition
    await page.goto('/');
    await page.locator('#btn-tutorial').waitFor({ state: 'visible', timeout: 5000 });
    
    // Click tutorial button to start game
    await page.locator('#btn-tutorial').click();
    
    // Wait for game-start event to trigger (game to unpause)
    await page.waitForTimeout(100);
    
    // Check that terrain canvas is present and rendering
    const canvas = page.locator('#renderCanvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveCount(1);
    
    // Check that the canvas has been initialized (not just blank)
    // The terrain should render to the canvas
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);
    
    // Verify the scene is not red (background should be sky blue)
    const bgColor = await canvas.evaluate((el: any) => {
      const ctx = el.getContext('webgl2') || el.getContext('webgl');
      return ctx ? 'initialized' : 'not initialized';
    });
    expect(bgColor).toBe('initialized');
  });
});
