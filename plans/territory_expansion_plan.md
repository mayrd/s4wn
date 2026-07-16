# Territory Expansion System Plan

[Overview]
Territory in S4 is organic and dynamic. It is represented by border stones that visually enclose the player's land. Land is captured by building military structures (Towers, Castles) or manually expanded using Pioneer units.

[Key Mechanics]
- **Territory Ownership**: A grid mapping tile coordinates to a specific `NationType` or `Neutral`.
- **Towers / Castles**: When constructed and garrisoned by a soldier, they exert a radial capture effect, instantly flipping neutral or enemy tiles to the player's nation. As per `BASE.md`, Small Towers, Big Towers, and Castles require specific planks/stones and support 1, 3, and 6 garrisoned soldiers respectively.
- **Pioneers**: Idle settlers equipped with shovels can be commanded to dig at the borders, moving the border stones outward tile-by-tile, bypassing the need for military towers.
- **Border Stones**: Small 3D assets that dynamically place themselves on the perimeter of owned territory and blend between adjacent tiles.

[Implementation Steps]
1. Refine `TerritoryOverlay` to smoothly interpolate borders instead of blocky tiles.
2. Implement the radial capture logic in `TerritoryManager` when a Tower is fully garrisoned.
3. Add `PioneerAI` to allow selected pioneers to pathfind to the nearest border and execute a "dig" action, converting one neutral tile to owned.
4. Implement automatic dynamic placement of border stone 3D meshes along the computed perimeter.

[Success Criteria]
- Building a Small Tower expands territory radially by 10 tiles.
- A pioneer commanded to expand territory successfully moves the border outward tile by tile.