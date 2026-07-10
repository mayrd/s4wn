import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the base URL. 
    // Note: The server must be running (e.g., via npm run preview)
    await page.goto('/');
    // Wait for the splash screen/main menu to be visible to ensure the UI is loaded
    await page.waitForSelector('#ui-overlay', { state: 'visible' });
  });

  test('Main Menu should match baseline', async ({ page }) => {
    // We target the main menu container. 
    // Based on subagent analysis, the UI is inside #ui-overlay.
    // We'll take a screenshot of the whole overlay to capture the menu.
    const menu = page.locator('#ui-overlay');
    await expect(menu).toHaveScreenshot('main-menu.png');
  });

  test('HUD should match baseline', async ({ page }) => {
    // To test HUD, we need to trigger a game start.
    await page.click('text=Start Tutorial');
    
    // Wait for HUD to appear (assuming it has a specific class or ID)
    // Based on HUD.ts, the container has class 'hud-container'
    const hud = page.locator('.hud-container');
    await hud.waitFor({ state: 'visible', timeout: 5000 });
    
    await expect(hud).toHaveScreenshot('hud.png');
  });

  test('Object Explorer should match baseline', async ({ page }) => {
    // Open the Object Explorer from the Main Menu
    await page.click('text=Object Explorer');
    
    // Wait for the explorer panel to be visible
    // Based on ObjectExplorer.ts, it has class 'explorer-panel'
    const explorer = page.locator('.explorer-panel');
    await explorer.waitFor({ state: 'visible', timeout: 5000 });
    
    await expect(explorer).toHaveScreenshot('object-explorer.png');
  });
});
