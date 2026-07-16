# Transport, Pathfinding & Specialist Settlers Plan

[Overview]
While carriers and production workers operate completely autonomously, Settlers 4 features specific "Specialist" units that are directly controlled by the user. Additionally, the underlying transport and pathfinding engine must handle thousands of units navigating the organic terrain simultaneously without clipping or severe performance degradation.

[Key Mechanics]

**1. Transport & Pathfinding Engine**
- **NavMesh / Grid Costs**: Pathfinding (A*) must account for terrain types. Swamps have high traversal costs (slower movement), mountains are impassable (except for geologists/miners), and water requires ships.
- **Dynamic Collision**: Units must smoothly route around dynamically placed buildings and other large clusters of units.
- **Flocking/Separation**: Carriers moving on similar vectors should slightly repel each other to avoid a "single file" conga line effect, maintaining the look of an organic crowd.

**2. User-Controlled Specialists**
- **Selection System**: Users can click or drag a bounding box over specialists to select them. A UI overlay (green ring) indicates selection.
- **Pioneers**: 
  - *Action*: When directed to a tile near the border, they march there and begin a "digging" animation loop, pushing the border stones outward tile-by-tile.
- **Geologists**: 
  - *Action*: Commanded to mountainsides. They pathfind there, play a "tapping/investigating" animation, and periodically spawn a small 3D resource sign flagging mineral deposits (coal, iron, gold, stone, sulfur) based on the underlying map data, matching the deposits listed in `BASE.md`.
- **Gardeners**: 
  - *Action*: Commanded near Dark Wasteland. They pathfind to the edge and cast a "greening" animation, slowly reverting the corrupted tiles back into buildable grass.
- **Thieves**:
  - *Action*: Infiltrate enemy territory without being attacked (invisible to enemies until they steal), grab an item from an enemy stack, and return it to allied territory.

[Implementation Steps]
1. Enhance the existing A* `Pathfinder` in `Map.ts` to include terrain traversal weight costs.
2. Implement a box-selection pointer event system in `InputManager` to allow selecting groups of `UnitKind.Specialist` units.
3. Add a unified `CommandQueue` to the `Unit` class. When a user right-clicks the terrain, selected units push a `MoveCommand` or `ActionCommand` to their queue.
4. Implement specific state machine routines for Pioneers (ExpandTerritory), Geologists (SurveyMountain), and Gardeners (HealLand).
5. Ensure 3D asset pipeline provides the specific tools/props (shovels, hammers, signs) and animations for these tasks.

[Success Criteria]
- A user can box-select 5 Pioneers and right-click a neutral border; all 5 walk there and begin digging, visibly expanding the player's territory.
- Pathfinding for these 5 units looks natural, with them spreading out slightly upon arrival rather than stacking on a single pixel.