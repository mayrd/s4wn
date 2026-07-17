# In-Game Menu Decoration Enhancement Plan

## Overview
Enhance the in-game menu to have more ornate Siedler 4 style decorations including decorative frames, ornamental borders, parchment backgrounds, and nation-themed styling.

## 1. New UI Textures to Generate

### Menu Background (`ui_menu_bg.png`)
- Ornate parchment/scroll background with medieval decorative elements
- 256×256 seamless texture for the main menu panel background
- Warm amber/parchment tones with subtle aging marks and edge wear

### Decorative Border Frame (`ui_frame.png`)
- Ornamental golden border frame with medieval flourishes
- 256×256 texture that can be used as a frame overlay for panels
- Intricate gold filigree in corners and edges

### Tab Ornament (`ui_tab_ornament.png`)
- Small decorative tab header with medieval styling
- 200×32 pixels with carved gold borders
- Used for category tabs in the build bar

### Category Medal Icons (`ui_medals.png`)
- 64×64 medal badges for each building category
- Gold-rimmed medallions with category-specific icons:
  - Basic (🪓): Woodcutter/Forester/Sawmill/Stonecutter
  - Food (🌾): Farm/Mill/Bakery/Slaughterhouse/Fisherman
  - Mining (⛏️): Coal/Iron/Gold/Sulfur mines
  - Military (🛡️): Barracks/Guard Tower/Fortress/Weapons
  - Logistics (🏠): Residences/Storage/Market
  - Specialists (🧙): Geologist/Pioneer/Thief

### Progress Bar Textures (`ui_progress.png`)
- Medieval style progress bar background and fill textures
- 200×20 pixels for construction/health progress indicators

### Ornamental Separator (`ui_separator.png`)
- Decorative horizontal separator with medieval motifs
- 400×16 pixels with carved gold patterns

## 2. CSS Enhancements

### Enhanced Build Bar Styling
- Add decorative texture overlays for header backgrounds
- Use medal icons for category tabs instead of emoji
- Add subtle parchment texture to content areas
- Enhanced hover states with glow effects

### Ornamental Panel Borders
- CSS-based corner ornaments using ui_corner.png
- Gold divider lines between sections
- Parchment background texture for content areas

### Tab Visual Improvements
- Replace emoji icons with texture-backed medal icons
- Add hover glow effects using gold accent colors
- Better visual hierarchy with decorative headers

## 3. Implementation Steps

1. Add decoration prompts to `asset_prompts.md`
2. Implement texture generation in `scripts/generate_ui_textures.js`
3. Update CSS in `src/ui/styles.css` with new decorative elements
4. Update InGameMenu.ts to use medal icons for categories
5. Run tests to verify changes
6. Regenerate visual baselines

## 4. Acceptance Criteria

- [ ] Menu has ornate parchment/scroll aesthetic matching S4 style
- [ ] Building categories display with medal/badge icons
- [ ] Decorative borders and separators enhance visual appeal
- [ ] All existing functionality preserved
- [ ] Tests pass (unit and visual regression)