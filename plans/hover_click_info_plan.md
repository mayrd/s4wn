# Hover & Click Info System Plan

## Overview
Add hover tooltips and click detail panels for buildings and units in the 3D scene.

## Components

### 1. EntityInfoTooltip (`src/ui/EntityInfoTooltip.ts`)
- Floating tooltip that follows the mouse cursor
- Scene picking on pointermove to detect building/unit meshes
- Shows:
  - **Building**: Name, status (idle/producing/paused), production progress %, input stock, output stock
  - **Unit**: Name, status (idle/moving/working/fighting), carrying info, HP bar
- Styled like existing menu-tooltip CSS

### 2. EntityDetailPanel (`src/ui/EntityDetailPanel.ts`)
- Panel shown in the in-game menu area (left bottom)
- Triggered by clicking on a building or unit mesh
- Shows detailed info + actions:
  - **Building**: Full name, status, production progress bar, input/output stock lists, HP
    - Actions: Pause/Resume, Destroy, Remove Garrisoned Soldier (if garrison capacity > 0)
  - **Unit**: Full name, HP bar, state, carrying info, position
    - Actions: (placeholder for future)

### 3. Integration
- `GameApp.ts`: Add scene pointer events for hover and click
- `InGameMenu.ts`: Add detail panel section
- `styles.css`: Add styles for tooltip and detail panel

## Implementation Steps
1. Create `EntityInfoTooltip.ts`
2. Create `EntityDetailPanel.ts`
3. Wire into `GameApp.ts` (scene picking, hover, click)
4. Wire into `InGameMenu.ts` (detail panel tab)
5. Add CSS styles
6. Write unit tests
