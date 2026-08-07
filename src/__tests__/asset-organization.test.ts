/**
 * Tests to verify proper asset organization:
 * - Generic assets in ui/, terrain/, decorations/, textures/
 * - Nation-specific assets in nations/ folders
 */

import { existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');
const ASSETS = join(ROOT, 'assets');

describe('Asset Organization Tests', () => {
  
  describe('Generic UI Assets', () => {
    const uiRequiredAssets = [
      'splash.png', 'logo-1024.png', 'favicon-256.png',
      'favicon-16x16.png', 'favicon-32x32.png', 'icon-192x192.png',
      'icon-512x512.png', 'apple-touch-icon.png', 'manifest.json'
    ];

    it('should have all required UI assets in assets/ui/', () => {
      const uiPath = join(ASSETS, 'ui');
      expect(existsSync(uiPath)).toBe(true);
      uiRequiredAssets.forEach(asset => {
        expect(existsSync(join(uiPath, asset))).toBe(true,
          `Missing UI asset: ${asset} in assets/ui/`);
      });
    });
  });

  describe('Terrain Assets', () => {
    const terrainRequiredAssets = [
      'terrain_grass.png', 'terrain_forest.png', 'terrain_desert.png',
      'terrain_mountain.png', 'terrain_snow.png', 'terrain_water.png',
      'terrain_swamp.png'
    ];

    it('should have all terrain assets in assets/terrain/', () => {
      const terrainPath = join(ASSETS, 'terrain');
      expect(existsSync(terrainPath)).toBe(true);
      terrainRequiredAssets.forEach(asset => {
        expect(existsSync(join(terrainPath, asset))).toBe(true,
          `Missing terrain asset: ${asset}`);
      });
    });
  });

  describe('Decoration Assets', () => {
        const decorationRequiredAssets = [
      'bush.obj', 'cactus.obj', 'rock.obj', 'flag.obj'
    ];

    it('should have decoration OBJ/MTL files in assets/decorations/', () => {
      const decorationsPath = join(ASSETS, 'decorations');
      expect(existsSync(decorationsPath)).toBe(true);
      decorationRequiredAssets.forEach(asset => {
        expect(existsSync(join(decorationsPath, asset))).toBe(true,
          `Missing decoration: ${asset}`);
        const mtlPath = join(decorationsPath, asset.replace('.obj', '.mtl'));
        expect(existsSync(mtlPath)).toBe(true,
          `Missing MTL: ${asset.replace('.obj', '.mtl')}`);
      });
    });
  });

  describe('Shared Textures', () => {
    const sharedTextures = [
      'building_stone.png', 'building_thatch.png', 'building_timber.png',
      'icon_weapons.png', 'icon_food.png', 'icon_wood.png', 'icon_gold.png',
      'ui_panel.png', 'ui_button.png'
    ];

    it('should have shared textures in assets/textures/', () => {
      const texturesPath = join(ASSETS, 'textures');
      expect(existsSync(texturesPath)).toBe(true);
      sharedTextures.forEach(asset => {
        expect(existsSync(join(texturesPath, asset))).toBe(true,
          `Missing texture: ${asset}`);
      });
    });
  });

  describe('Nation Manifest Files', () => {
    const nations = ['romans', 'vikings', 'mayans', 'trojans', 'dark'];

    it('should have nation.json manifest files for each nation', () => {
      nations.forEach(nation => {
        const manifestPath = join(ASSETS, 'nations', nation, 'nation.json');
        expect(existsSync(manifestPath)).toBe(true,
          `Missing nation.json for nation: ${nation}`);
      });
    });
  });

  describe('Nation Folder Structure', () => {
    const nations = ['romans', 'vikings', 'mayans', 'trojans', 'dark'];
    const expectedNestedFolders = [
      'icons', 'icons/resources', 'icons/buildings', 'icons/ui',
      'models/buildings', 'models/units', 'textures/buildings', 'textures/shared',
      'textures/units'
    ];

    it('should have proper folder structure for each nation', () => {
      nations.forEach(nation => {
        const nationPath = join(ASSETS, 'nations', nation);
        expect(existsSync(nationPath)).toBe(true);
        
        expectedNestedFolders.forEach(folder => {
          const folderPath = join(nationPath, folder);
          expect(existsSync(folderPath)).toBe(true,
            `Missing nested folder: ${folder} for nation: ${nation}`);
        });
      });
    });
  });
});