# In-Game Menu Implementation Plan: Settlers 4 & Anno 1800 Hybrid

## Overview
The goal is to create a modern, responsive, and touch-friendly in-game menu system that leverages the deep, organized structural advantages of the original *Settlers 4* navigation, while incorporating the intuitive, visually rich, and quick-access construction paradigms seen in *Anno 1800*.

## 1. Core Paradigms

### Settlers 4 Navigation (The Backbone)
- **Categorized Deep Tabs**: Clear separation of concerns (Economy, Military, Specialists, Statistics).
- **Sub-Menus**: Drill-down menus for specific tasks (e.g., Economy -> Food Production, Raw Materials).
- **State Preservation**: Menus remember their last opened state so players don't lose context when quickly checking the map.

### Anno 1800 Style Construction (The Frontend)
- **Visual Build Bar**: A horizontal or contextual lower bar (or radial menu on mobile) for rapid access to commonly used buildings.
- **Drag-and-Drop / Ghost Placement**: Smooth, grid-based ghosting for building placement with immediate visual feedback (valid/invalid terrain, resources).
- **Quick Menus**: Right-click (or long-press on mobile) context menus for immediate actions without traversing the full tab hierarchy.

## 2. Responsive & Touch-First Design

### Desktop Experience
- Bottom-center build bar with hotkeys for fast access.
- Side panels for deep statistics and Settlers 4 style categorization that can be collapsed.
- Mouse hover tooltips with detailed building costs, upkeep, and production chains.

### Mobile / Touch Experience
- **Radial Context Menus**: Tap and hold on a unit or empty terrain to open a radial menu (removes the need for right-clicks and tiny buttons).
- **Bottom Sheet Navigation**: The deep categorization tabs (Economy, Military) slide up as bottom sheets rather than side panels, making them easily reachable with thumbs.
- **Pinch to Zoom & Two-Finger Pan**: Smooth camera controls that don't conflict with UI touches.
- **Large Hit Targets**: Minimum 44x44px touch targets for all icons and buttons.

## 3. Implementation Steps

1. **Architecture & State Management**
   - Create a `MenuManager` to handle UI state (open panels, current active tool, contextual selection).
   - Define data structures mapping buildings to their Anno-style quick-access categories and Settlers 4 deep-hierarchy categories.

2. **Component Development (UI Framework)**
   - **Quick Action Bar (Bottom)**: Horizontal scrollable list of buildings for the active tier or category.
   - **Contextual Radial Menu**: For mobile/touch interactions on the map.
   - **Deep Hierarchy Panel (Side/Bottom Sheet)**: For full Settlers 4 style navigation.
   - **Building Ghost/Placement Tool**: Refine the 3D ghost mesh logic to integrate with the new menu selections.

3. **Responsive Layouts (CSS/HTML)**
   - Use CSS Grid and Flexbox with media queries.
   - `@media (max-width: 768px)`: Switch from side panels to bottom sheets and enable radial menus over standard right-click context menus.
   - Ensure UI elements scale correctly on high-DPI displays.

4. **Integration & Testing**
   - Wire UI events to the `GameLoop` and `UIManager`.
   - Test placement logic, ensuring the menu gracefully closes or minimizes during active placement mode (like Anno).
   - Write Playwright visual regression tests for both Desktop and Mobile viewport sizes.

## 4. Acceptance Criteria
- [ ] UI provides a quick-access bottom bar for construction (Anno style).
- [ ] UI provides deep, tabbed categorization for complex management (S4 style).
- [ ] UI seamlessly adapts to mobile screens using bottom sheets and radial menus.
- [ ] Touch targets are adequately sized, preventing accidental misclicks on devices.
- [ ] Right-click (desktop) and Long-press (mobile) trigger context-sensitive actions.
- [ ] Building placement allows for seamless transition from menu selection to map interaction.
