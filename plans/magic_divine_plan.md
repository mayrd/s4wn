# Magic & Divine System Plan

[Overview]
Each nation has a unique sacrificial good (Wine, Mead, Tequila, Sunflower Oil) that is offered at a Small Temple to generate Mana. Mana is used at the Large Temple to promote recruits into Priests, who can cast powerful faction-specific spells.

[Key Mechanics]
- **Mana Generation**: Small Temples consume alcohol/oil and fill a global Mana Bar.
- **Priest Production**: Large Temples consume recruits and mana to spawn Priest units.
- **Spellcasting**: Priests consume mana from the global pool to cast spells (e.g., converting resources, melting snow, boosting combat strength).
- **Faction Spells**: 
  - Romans: Convert resources, heal.
  - Vikings: Freeze enemies, reveal map.
  - Mayans: Turn enemies to stone, grow desert.
  - Trojans: Create decoy units, heavy damage.

[Implementation Steps]
1. Add a `ManaBar` UI element to the HUD.
2. Implement production logic in `SmallTemple` to output Mana points globally instead of physical goods.
3. Update `LargeTemple` to spawn `Priest` units when enough Mana is available.
4. Add a spellcasting menu and targeting cursor for Priests.
5. Implement the first 4 generic spells in a new `SpellSystem`.

[Success Criteria]
- A player successfully sacrifices Wine to fill the Manabar.
- A Priest is spawned and casts a spell on a target tile.