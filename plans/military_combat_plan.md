# Military & Combat System Plan

[Overview]
Combat in Settlers 4 relies on squad formations, positional advantage, and unit stats (HP, attack range, attack power). Capturing territory requires defeating the garrisoned soldiers in an enemy tower or castle.

[Key Mechanics]
- **Unit Types**: Swordsman (melee), Bowman (ranged), Squad Leader (buffs nearby troops), Medic/Healer (restores HP).
- **Ranks**: Units have 3 ranks (levels) determined by the amount of gold bars invested during recruitment.
- **Combat Strength (Kampfkraft)**: A global modifier based on total gold bars in storage and decorative monuments (Zierobjekte), enhancing all allied unit stats.
- **Garrisoning**: Soldiers enter Towers and Castles to defend them. Attackers must reduce the building's HP to force the defenders out, or defeat them sequentially.
- **Ranged Combat**: Bowmen fire projectiles with parabolic trajectories that can be dodged or blocked by terrain elevation.

[Implementation Steps]
1. Expand `UnitManager` to handle HP, Attack Power, and Rank properties.
2. Implement projectile math in `CombatAI` for Bowmen arrows.
3. Build the global "Combat Strength" modifier system into `EconomyManager`.
4. Add state logic for garrisoning towers and transferring territory ownership upon defender defeat.
5. Add UI health bars over units and buildings during combat.

[Success Criteria]
- A squad of 3 Swordsmen successfully attacks and captures a neutral tower.
- Bowmen deal damage from afar with visible arrow arcs.