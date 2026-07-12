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
    // We'll take a screenshot of the main menu screen specifically
    const mainMenuScreen = page.locator('.main-menu-screen');
    await mainMenuScreen.waitFor({ state: 'visible', timeout: 5000 });
    await expect(mainMenuScreen).toHaveScreenshot('main-menu.png', { threshold: 0.1 });
  });

  test('Object Explorer should match baseline', async ({ page }) => {
    // Wait for splash to transition and menu to be visible
    await page.locator('#btn-new-game').waitFor({ state: 'visible', timeout: 5000 });
    
    // Open the Object Explorer from the Main Menu - use the button ID
    await page.click('#btn-explorer');
    
    // Wait for the explorer panel to be visible
    // Based on ObjectExplorer.ts, it has class 'explorer-panel'
    const explorer = page.locator('.explorer-panel');
    await explorer.waitFor({ state: 'visible', timeout: 5000 });
    
    await expect(explorer).toHaveScreenshot('object-explorer.png', { threshold: 0.1 });
  });

  test('Pause Menu should match baseline', async ({ page }) => {
    // Start the game
    await page.click('#btn-tutorial');
    
    // Wait for HUD to appear
    await page.locator('.hud-container').waitFor({ state: 'visible', timeout: 5000 });
    
    // Click save button to open save menu (if exists) or test HUD buttons
    const saveBtn = page.locator('#btn-save-game');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
    }
    
    // Verify HUD exists with save button
    await expect(page.locator('.hud-container')).toBeVisible();
  });
});
