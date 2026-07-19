# S4WN Implementation Plan Audit — July 2026

## Summary

| Plan | Status | Tests Passing | Notes |
|------|--------|---------------|-------|
| economy_logistics_plan.md | ⚠️ PARTIAL | 627 | Logistics exists but missing carrier priority + stacking limits |
| transport_and_specialists_plan.md | ❌ NOT DONE | - | No terrain costs, collision, flocking, or specialist logic |
| territory_expansion_plan.md | ✅ DONE | - | TerritoryManager + BorderPost fully implemented |
| military_combat_plan.md | ⚠️ PARTIAL | - | Basic combat works, missing special units + health bars |
| nations_and_factions_plan.md | ⚠️ PARTIAL | - | Registry exists, missing nation-specific UI/BGM |
| magic_divine_plan.md | ❌ NOT DONE | - | No Manabar, priests, or spells |
| dark_tribe_plan.md | ❌ NOT DONE | - | Dark Tribe faction not implemented |
| tutorial_system_plan.md | ⚠️ PARTIAL | - | Manager exists, tutorial steps incomplete |
| in_game_menu_plan.md | ✅ DONE | - | Full vertical menu with all tabs |
| in_game_menu_decorations_plan.md | ❌ NOT DONE | - | No ornate textures or medal icons |
| debug_explorer_plan.md | ⚠️ PARTIAL | - | Explorer exists, missing 3D viewport + error overlay |
| animation_and_asset_detail_plan.md | ⚠️ PARTIAL | - | Building nodes missing, state machine basic |
| building_animation_system.md | ⚠️ PARTIAL | - | Construction anim exists, missing ProductionAnimator |
| construction_pipeline_plan.md | ✅ DONE | - | Full digger/carrier/builder pipeline |
| nation_pack_system_plan.md | ⚠️ PARTIAL | - | Registry works, no actual nation.json files on disk |
| unit_behavior_system.md | ⚠️ PARTIAL | - | Missing steering, platoon formation, collision |
| rendering_audit.md | ⚠️ PARTIAL | - | Core features work, missing clouds/atmosphere/fog |

---

## Detailed Status by Plan

### 1. Economy & Logistics System
**File:** `plans/economy_logistics_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| ResourceItem entity | ✅ | `Logistics.ts` - `ResourceItem` interface |
| Demand/Supply matching | ✅ | `Logistics.ts` - `registerDemand()`, `matchDemand()` |
| Carrier AI assignment | ⚠️ | WorkerAI has logistics but no dedicated carrier role |
| Resource stacks (8 per tile) | ❌ | Not enforced |
| StorageYard stacking limits | ✅ | Dynamic capacity based on yard count |
| Donkey trade routes | ✅ | `TradeRouteManager` implemented |

**TODO:**
- Enable carrier priority for construction deliveries
- Enforce 8-stack limit at StorageYards
- Add carrier unit type distinction

---

### 2. Transport & Specialists
**File:** `plans/transport_and_specialists_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Terrain traversal costs | ❌ | `Map.speedMultiplier()` exists but NOT used by Pathfinder |
| Dynamic collision avoidance | ❌ | Not implemented |
| Flocking/separation | ❌ | Not implemented |
| Box-selection specialists | ❌ | Not implemented |
| Pioneer border digging | ❌ | Pioneer unit exists but no border digging logic |
| Geologist mountain survey | ❌ | Not implemented |
| Gardener land healing | ❌ | Not implemented (Dark Tribe dependency) |
| Thief stealth infiltration | ❌ | Not implemented |

---

### 3. Territory Expansion
**File:** `plans/territory_expansion_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Territory ownership grid | ✅ | `Map.ts` - territory field on tiles |
| Towers radial capture | ✅ | `TerritoryManager` - TOWER_RADIUS = 10 |
| Castle radial capture | ✅ | `TerritoryManager` - CASTLE_RADIUS = 15 |
| Pioneer expansion | ✅ | `TerritoryManager` - PIONEER_RADIUS = 5 |
| Border posts | ✅ | `BorderPost.ts` + `BorderPostManager` |

---

### 4. Military Combat
**File:** `plans/military_combat_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Unit HP/stats | ✅ | `Unit.ts` - `UNIT_STATS`, `takeDamage()`, ranks |
| Ranks (3 levels) | ✅ | `Unit.addExperience()` with XP thresholds |
| Squad leader buffs | ❌ | Not implemented |
| Combat Strength (Kampfkraft) | ❌ | Not implemented |
| Garrison system | ✅ | `Unit.garrison()` / `isGarrisoned()` |
| Projectile arcs | ✅ | Bowman `projectileTargetX/Y` for arrow arcs |
| Unit death | ✅ | `dyingTimer` + destruction animator |
| UI health bars | ❌ | Not implemented |
| Specialist units | ❌ | Medic, Axe Warrior, Blowgunner, Catapult not implemented |

---

### 5. Nations & Factions
**File:** `plans/nations_and_factions_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Nation colors | ✅ | TerritoryOverlay uses NATION_INFO colors |
| Nation architecture variants | ⚠️ | Fallback exists, no actual nation-specific models |
| Nation-specific UI | ❌ | No HUD/BGM changes per nation |
| Livestock chains (Sheep/Pig/Goat/Geese) | ⚠️ | Defined in manifests, not enforced in Economy |
| Divine goods (Wine/Mead/Tequila/Oil) | ⚠️ | Defined in manifests, no production logic |
| Munitions (Gunpowder/Explosive Arrows) | ❌ | Mayan/Trojan munitions not implemented |
| Special military units | ❌ | See military plan |

---

### 6. Magic & Divine System
**File:** `plans/magic_divine_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Manabar UI | ❌ | Not implemented |
| SmallTemple mana generation | ❌ | Not implemented |
| LargeTemple priest production | ❌ | Not implemented |
| Spellcasting system | ❌ | Not implemented |
| Faction spells | ❌ | Not implemented |

---

### 7. Dark Tribe System
**File:** `plans/dark_tribe_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| DarkWasteland terrain | ❌ | Terrain type not added |
| Dark Digger AI | ❌ | Not implemented |
| Mushroom farming | ❌ | Not implemented |
| Cultist harvester | ❌ | Not implemented |
| Breeding Hall spawning | ❌ | Not implemented |
| Temple of Darkness | ❌ | Not implemented |
| Gardener reclamation | ❌ | Not implemented |

---

### 8. Tutorial System
**File:** `plans/tutorial_system_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| TutorialManager class | ✅ | Implemented with 7-step sequence |
| TutorialDialog UI | ✅ | Implemented |
| Step 1: Camera Basics | ❌ | Not implemented |
| Step 2: Wood Economy | ⚠️ | Partially (construction speed hook exists) |
| Step 3: Food Economy | ❌ | Not implemented |
| Step 4: Territorial Expansion | ❌ | Not implemented |
| Step 5: Mining & Metallurgy | ❌ | Not implemented |
| Step 6: Military Recruitment | ❌ | Not implemented |
| Step 7: Combat & Victory | ❌ | Not implemented |
| HUD restriction hooks | ❌ | Not implemented |

---

### 9. In-Game Menu (Decorations)
**File:** `plans/in_game_menu_decorations_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Menu background parchment | ❌ | Not implemented |
| Decorative border frame | ❌ | Not implemented |
| Tab ornament | ❌ | Not implemented |
| Medal icons | ❌ | Not implemented |
| Progress bar textures | ❌ | Not implemented |
| Ornamental separator | ❌ | Not implemented |
| Enhanced CSS styling | ❌ | Not implemented |

---

### 10. Debug & Object Explorer
**File:** `plans/debug_explorer_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Global error boundary | ⚠️ | `ErrorHandler.ts` exists, may need enhancement |
| Contextual logging | ⚠️ | `Logger.ts` exists |
| UI error overlay | ❌ | Not implemented |
| Assert module | ❌ | Not implemented |
| Console debug API | ❌ | `window.S4` not implemented |
| 3D model viewport | ❌ | ObjectExplorer lacks 3D preview |
| Asset hierarchy graph | ❌ | Not implemented |
| Missing asset warnings | ❌ | Not implemented |

---

### 11. Animation & Asset Detail
**File:** `plans/animation_and_asset_detail_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Building sockets/nodes | ❌ | Not implemented |
| Worker state machine | ⚠️ | Basic (Idle/Moving/Working) |
| Multi-step production cycle | ❌ | Not implemented |
| Building input/output zones | ❌ | Not implemented |
| Resource stacking meshes | ❌ | Not implemented |

---

### 12. Building Animation System
**File:** `plans/building_animation_system.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Construction scaffolding | ✅ | `ConstructionAnimator.ts` with 4 phases |
| Production animations | ❌ | `ProductionAnimator.ts` not implemented |
| Building animation descriptors | ❌ | Not implemented |

---

### 13. Construction Pipeline
**File:** `plans/construction_pipeline_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| ConstructionManager | ✅ | Fully implemented |
| Digger phase | ✅ | Terrain leveling with pathfinding |
| Materials phase | ✅ | Carrier delivery requests |
| Building phase | ✅ | Builder pathfinding + progress |
| Phase state machine | ✅ | Implemented |
| Tool consumption (Shovel/Hammer) | ❌ | Not enforced |
| Construction progress UI | ❌ | Tooltips/progress bars not implemented |

---

### 14. Nation Pack System
**File:** `plans/nation_pack_system_plan.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| NationManifest interfaces | ✅ | `NationRegistry.ts` - all interfaces defined |
| NationLoader discovery | ✅ | Implemented with fallbacks |
| Nation-specific folders | ❌ | No `assets/nations/{id}/` directories on disk |
| Hot-reload without restart | ❌ | Not implemented |
| Nation-specific models | ❌ | Not implemented |
| Nation-specific textures | ❌ | Not implemented |

---

### 15. Unit Behavior System
**File:** `plans/unit_behavior_system.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Unit states | ✅ | UnitState enum (Idle, Moving, Working) |
| Pathfinding (A*) | ✅ | `Pathfinder.ts` implemented |
| Periodic path recalculation | ❌ | Per-tick, not optimized periodic |
| Group movement/platoons | ❌ | Not implemented |
| Unit collision avoidance | ❌ | Not implemented |

---

### 16. Rendering Audit
**File:** `plans/rendering_audit.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| Terrain rendering | ✅ | Splat-mapping, LOD placeholders |
| Water reflections | ✅ | MirrorTexture, normal maps |
| Shadow pipeline | ⚠️ | Disabled due to runtime error |
| Cloud layer | ❌ | Not implemented |
| Sun/Moon discs | ❌ | Not implemented |
| Atmospheric effects | ❌ | Not implemented |
| Fog of war | ❌ | Not implemented |
| Particle system | ✅ | 15 effect types implemented |

---

### 17. Asset Prompts
**File:** `plans/asset_prompts.md`

| Feature | Status | Implementation |
|---------|--------|----------------|
| UI icons (6) | ❌ | Prompts documented, no images generated |
| Resource icons (4) | ❌ | Prompts documented, no images generated |
| Unit icons (2) | ❌ | Prompts documented, no images generated |

---

## Priority TODO List

1. **Critical Missing Features:**
   - [ ] Terrain costs in Pathfinder (swamps slow, mountains impassable)
   - [ ] Dark Tribe faction implementation
   - [ ] Specialist units (Medic, Axe Warrior, Blowgunner, Catapult)
   - [ ] Storage Yard 8-stack logistics pattern

2. **High Priority:**
   - [ ] Magic/Divine system (Manabar, Priests, Spells)
   - [ ] Unit collision avoidance / flocking
   - [ ] ProductionAnimator for building animations
   - [ ] Nation-specific models/textures

3. **Medium Priority:**
   - [ ] Tutorial step implementations
   - [ ] Decorative UI textures
   - [ ] UI error overlay
   - [ ] Object Explorer 3D viewport

4. **Low Priority:**
   - [ ] Cloud/sun-moon rendering
   - [ ] Atmospheric scattering
   - [ ] Asset icons generation via Gemini