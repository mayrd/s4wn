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
});