# Dark Tribe System Plan

[Overview]
The Dark Tribe is a unique NPC antagonist faction in Settlers 4. Instead of a traditional economy, they spread "Dark Wasteland" across the map, farming mushrooms and converting them into shadow mana to spawn dark units. The player must use Gardeners to reclaim the land.

[Key Mechanics]
- **Dark Wasteland Spread**: Dark Diggers dynamically corrupt green tiles into dark wasteland.
- **Mushroom Farming**: Dark Gardeners plant spores on the wasteland, which grow into mushrooms. Cultists harvest these mushrooms for the Temple of Darkness.
- **Spawning**: The Temple generates shadow mana, triggering the Breeding Hall to spawn Shadow Soldiers.
- **Reclamation**: The player's Gardeners (equipped with shovels) cast a "greening" spell to revert dark wasteland back to grass.

[Implementation Steps]
1. Add `DarkWasteland` terrain type and associated textures to `TerrainRenderer`.
2. Implement the `DarkDigger` AI that wanders and converts grass tiles.
3. Implement the `DarkGardener` and `Cultist` AI for mushroom growth and harvesting.
4. Implement the `BreedingHall` logic to spawn `ShadowSoldier` units.
5. Create the `GardenerAI` for the player to counter and heal the land.

[Success Criteria]
- A Dark Digger successfully converts a patch of grass into wasteland.
- A player's Gardener successfully re-greens a wasteland tile.