# Nations & Factions System Plan

[Overview]
Settlers 4 features four distinct playable nations (Romans, Vikings, Mayans, Trojans) and one NPC antagonist faction (Dark Tribe). While core systems like wood and stone gathering are shared, each nation has unique aesthetics, specialized production chains, and exclusive military units that require strict enforcement in the game logic and UI. All distinct names, buildings, and logic variants must perfectly reflect the constraints in `BASE.md`.

[Key Mechanics]

**1. Nation Visuals & Identity**
- **Colors**: Romans (Red), Vikings (Blue), Mayans (Green), Trojans (Gold), Dark Tribe (Purple).
- **Architecture**: Each nation requires its own complete set of 3D glTF building models matching their historical/thematic aesthetic.
- **UI & Audio**: The HUD and background music change based on the active player's nation.

**2. Unique Production Chains**
- **Livestock (Meat)**: 
  - Romans breed Sheep.
  - Vikings breed Pigs.
  - Mayans breed Goats.
  - Trojans breed Geese.
- **Divine/Sacrificial Goods (Mana)**:
  - Romans grow Grapes -> Wine.
  - Vikings cultivate Honey -> Mead.
  - Mayans farm Agave -> Tequila.
  - Trojans grow Sunflowers -> Sunflower Oil.
- **Munitions**:
  - Mayans use Gunpowder (Sulfur + Coal).
  - Trojans use Explosive Arrows (Sulfur + Iron).

**3. Special Military Units & Skills**
- **Romans (Medic)**: A support unit that passively heals nearby infantry during combat.
- **Vikings (Axe Warrior)**: A high-damage shock troop acting as elite melee.
- **Mayans (Blowgunner)**: A ranged unit that fires paralytic darts, temporarily freezing enemy movement.
- **Trojans (Backpack Catapult)**: High-range light artillery that deals immense damage but is highly vulnerable in close combat.

[Implementation Steps]
1. Refine the `NationType` enum and `GameConfig` to strongly type these nation rules.
2. Update the `BuildingPlacement` UI to dynamically filter the construction tabs. If `playerNation === NationType.Vikings`, the "Pig Ranch" is visible, but the "Sheep Ranch" is hidden.
3. Enhance `EconomyManager` to validate resource inputs/outputs based on the nation (e.g., ensuring a Roman slaughterhouse only accepts sheep).
4. Implement the special combat behaviors in `CombatAI` (healing for medics, freezing for blowguns).
5. Ensure `TerritoryOverlay` uses the correct nation color when painting captured land.

[Success Criteria]
- A player playing as the Vikings can only build a Pig Ranch and Mead Brewery; attempting to place a Vineyard via code throws an invalid action error.
- Selecting Mayans changes the player's territory border tint to green.