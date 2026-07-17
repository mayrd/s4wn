# In-Game Menu Implementation Plan: Single Integrated Vertical Left-Side Menu

## Overview
The goal is to provide a single, comprehensive, and integrated in-game menu system anchored on the left side of the screen. This system replaces the split horizontal bottom bar and separate floating statistics panel with a unified full-height vertical panel. The menu is fully collapsible via a top-left toggle and optimized for portrait/mobile use.

## 1. Unified Left-Side Architecture

The left-side vertical panel (width: `280px` or full width on portrait mode) is organized into several distinct tab categories depending on the active game mode:

### A. General Single Player Mode Tabs:
1. **🏗️ Construction**: Quick access to commonly built infrastructure (Woodcutter, Forester, Sawmill, Stonecutter, Farm, Bakery, Barracks, GuardTower).
2. **👥 Units**: Recruitment and management of core civilian and military settlers (Workers, Swordsmen, Archers).
3. **🧙 Specialists**: Command center for recruiting specialists (Geologists, Pioneers, Thieves).
4. **📊 Statistics**: Real-time kingdom ledger showing game duration, tick counter, active buildings, total settlers, worker ratios, and military strength.
5. **⚙️ Game Menu**: Practical in-game actions including save game, pause/resume, and exit.
6. **🛠️ Settings**: Audio toggles (master volume, mute/unmute) and Graphics options (wireframe, resolution, performance caps).
7. **🐞 Debug Menu**: Advanced debugging toggles (Grid, Splat, Territory, Supply chains) and Babylon Inspector controls.

### B. Map Editor Mode Tools:
When active in the Map Editor mode, the left-side menu transforms to house all creative tools, eliminating floating palettes:
- **⛰️ Elevation Brush**: Raise, lower, smooth, or flatten terrain elevation.
- **🎨 Texture Splatting Brush**: Paint textures (grass, desert, mountain, swamp, water) onto tiles.
- **🌲 Object Spawner**: Place trees, rocks, decoration items, and starting points.
- **💾 Map Actions**: Export sample maps, test paths, and clear map data.

### C. Multiplayer Mode Integrations:
When connecting to a Multiplayer session, the left-side menu integrates a communication hub:
- **💬 Chat Option**: Inline chat client directly within the left menu panel.
  - **Player List**: See connected players and latency.
  - **Message Window**: Scrollable historical log of text chats.
  - **Message Input**: Keyboard input box with quick shout options.
  - **Channels**: Toggle between global chat, alliance chat, or private whispers.

### D. Campaign & Tutorial/Mission Integration:
During Campaign and Tutorial missions, the left-side menu provides narrative context and mission guidance:
- **📖 Campaign Tab**: Mission briefing, objective tracking, and campaign progression.
  - **Story Log**: Chronological storyline events and journal entries.
  - **Objectives**: Current primary and secondary goals with completion indicators.
  - **Rewards**: Preview of unlockables, achievements, and resource bonuses.
- **🎓 Tutorial Tab**: Step-by-step mission guidance.
  - **Hints System**: Contextual tooltips based on current tutorial step.
  - **Skip/Reset Options**: Allow players to skip tutorial or reset current step.
  - **Knowledge Base**: Quick links to mechanics explained in the BASE.md reference.

## 2. Integrated Collapsible Layout

### Floating Toggle Button
- Stays fixed at `top: 10px; left: 10px;` (z-index: 1000).
- Dynamically swaps icon from `◀` (to collapse menu) to `▶` (to expand menu).
- Shifts HUD panel dynamically (`left: 290px` when menu is open, `left: 60px` when collapsed) to guarantee zero overlapping.

### Responsive Design
- On screens under `768px` or portrait orientations, the menu spans `100vw` (full screen) when expanded.
- Overlay components like HUD are cleanly hidden when the menu is open on portrait devices to optimize touch target interaction.

## 3. UI Implementation Details

### HTML / Component Structure
- `InGameMenu` manages the unified state and renders the main container `#anno-build-bar` with the new categories.
- Left-side menu items are organized vertically, with construction options arranged in a beautiful, responsive 2-column grid.
- Tab selection uses high-contrast buttons styled in the S4 wood/parchment aesthetic.

### Settings Control Options
- **Audio Control**: Sliders and mute buttons that connect directly to `SoundManager`.
- **Graphics Control**: Checkboxes/toggles for scene settings, rendering quality, or wireframe.

## Acceptance Criteria
- [x] Unified left-side vertical menu covers Construction, Units, Specialists, Stats, Actions, Settings, and Debugging.
- [x] Menu is fully collapsible via top-left toggle button with smooth CSS translation.
- [x] HUD positions shift seamlessly or hide in mobile portrait mode to prevent overlap.
- [x] Settings tab correctly integrates audio/graphics settings.
- [x] Map Editor integration specifies elevation, texture, and spawner tools fully housed on the left menu.
- [x] Multiplayer integration outlines chat panels, input logs, and player list directly within the left-side menu.
- [x] Campaign & Tutorial integration provides Story Log, Objectives tracking, and Knowledge Base within the left menu.
- [x] All menu modes (General, Map Editor, Multiplayer, Campaign/Tutorial) integrate cleanly without overlap.
