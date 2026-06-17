//! S4WN Worker AI Module
//!
//! Phase 2 — Game Logic: settler/settler AI for automatic task assignment
//! and movement to assigned buildings.
//!
//! ## Design
//!
//! The settler AI system handles:
//! 1. **Auto-assignment**: Idle settlers are automatically assigned to buildings
//!    that need settlers (no settlers yet, but `requires_settler() == true`).
//! 2. **Movement to building**: When a settler is assigned to a building but
//!    not at the building's tile, they pathfind to it using A*.
//! 3. **Work loop**: Once at the building, the settler's state changes to
//!    `Working` and production can proceed.
//!
//! The AI runs each tick as part of the economy update. It processes:
//! - Find idle settlers → assign to nearest building that needs a settler
//! - For assigned-but-not-there settlers → compute path and start moving
//! - Workers that reach their building → transition to Working state

use crate::economy::Economy;
use crate::map::Map;
use crate::pathfinding::Pathfinder;
use crate::units::{UnitKind, UnitState};

/// Worker AI controller — makes settlers autonomous.
#[derive(Debug, Clone)]
pub struct WorkerAI;

impl WorkerAI {
    /// Create a new settler AI controller.
    pub fn new() -> Self {
        WorkerAI
    }

    /// Run the full settler AI update for one tick.
    ///
    /// This:
    /// 1. Auto-assigns idle settlers to buildings that need them.
    /// 2. Moves assigned settlers toward their building (pathfinding).
    /// 3. Transitions settlers to Working state when they arrive.
    pub fn update(&self, economy: &mut Economy, map: &Map, dt: f32) {
        // Phase 1: Auto-assign idle settlers to buildings that need them
        self.auto_assign(economy);

        // Phase 2: Move assigned settlers toward their building
        self.move_settlers(economy, map, dt);

        // Phase 3: Update economy tick (production, construction)
        economy.update();
    }

    /// Auto-assign idle settlers to buildings that need settlers.
    /// Returns the number of new assignments.
    fn auto_assign(&self, economy: &mut Economy) -> usize {
        let mut assigned = 0;

        // Collect building indices that need settlers
        let mut needs_settler: Vec<usize> = Vec::new();
        for (i, building) in economy.buildings.iter().enumerate() {
            if building.kind.requires_settler()
                && building.is_complete()
                && building.assigned_settlers.is_empty()
            {
                needs_settler.push(i);
            }
        }

        // Collect idle settler IDs first (avoid re-finding the same settler)
        let idle_settler_ids: Vec<u32> = economy.units.idle_settlers().map(|u| u.id).collect();

        // For each building that needs a settler, try to find an idle settler
        for (i, &building_idx) in needs_settler.iter().enumerate() {
            if i >= idle_settler_ids.len() {
                break; // No more idle settlers
            }
            let settler_id = idle_settler_ids[i];
            // Assign settler to building
            economy.buildings[building_idx].assign_settler(settler_id);
            // Physical tool pickup: if building requires a tool AND one is available,
            // route settler through nearest Storehouse/Castle first
            let needs_tool = economy.buildings[building_idx]
                .required_tool
                .is_some();
            let tool_available = economy.buildings[building_idx]
                .required_tool
                .map_or(false, |tc| economy.get_tool_count(tc) > 0);

            // Pre-compute storehouse index before mutable borrow
            let settler_pos = economy.units.get(settler_id).map(|u| (u.x, u.y));
            let storehouse_idx = settler_pos
                .and_then(|(ux, uy)| economy.find_nearest_storehouse(ux, uy));

            if needs_tool && tool_available {
                if let Some(unit) = economy.units.get_mut(settler_id) {
                    if let Some(sh_idx) = storehouse_idx {
                        // Route to storehouse first for physical tool pickup
                        unit.assigned_building = Some(sh_idx);
                        unit.pickup_target = Some(building_idx);
                        unit.state = UnitState::Moving;
                    } else {
                        // No storehouse available — assign directly without tool
                        unit.assigned_building = Some(building_idx);
                        unit.state = UnitState::Moving;
                    }
                }
            } else {
                // No tool needed — assign directly
                if let Some(unit) = economy.units.get_mut(settler_id) {
                    unit.assigned_building = Some(building_idx);
                    unit.state = UnitState::Moving;
                }
            }
            assigned += 1;
        }

        assigned
    }

    /// Move settlers that are assigned to buildings but not yet there.
    /// Uses A* pathfinding to compute paths.
    fn move_settlers(&self, economy: &mut Economy, map: &Map, dt: f32) {
        // Collect settler data needed for movement (avoid borrow conflicts)
        let mut settler_tasks: Vec<(u32, usize, usize, usize, usize)> = Vec::new();
        // (settler_id, building_x, building_y, unit_tile_x, unit_tile_y)

        for u in economy.units.all() {
            if u.kind != UnitKind::Settler || !u.is_alive() || u.state == UnitState::Working {
                continue;
            }
            let bidx = match u.assigned_building {
                Some(idx) => idx,
                None => continue,
            };
            let building = match economy.buildings.get(bidx) {
                Some(b) => b,
                None => continue,
            };
            let ux = u.x as usize;
            let uy = u.y as usize;
            settler_tasks.push((u.id, building.x, building.y, ux, uy));
        }

        for (settler_id, bx, by, ux, uy) in settler_tasks {
            // Check if settler is already at the building
            if ux == bx && uy == by {
                // Check if this is a tool pickup arrival
                let has_pickup = economy.units.get(settler_id)
                    .map(|u| u.pickup_target.is_some())
                    .unwrap_or(false);
                if has_pickup {
                    // Tool pickup — reroute to real target
                    if let Some(unit) = economy.units.get_mut(settler_id) {
                        if let Some(real_target) = unit.pickup_target {
                            unit.assigned_building = Some(real_target);
                            unit.pickup_target = None;
                            unit.path = None;
                            unit.path_index = 0;
                            // Keep Moving state
                        }
                    }
                    // Withdraw tool from storage
                    let tc_needed = economy.units.get(settler_id)
                        .and_then(|u| {
                            u.assigned_building
                                .and_then(|bidx| economy.buildings.get(bidx))
                                .and_then(|b| b.required_tool)
                        });
                    if let Some(tc) = tc_needed {
                        economy.withdraw_tool(tc);
                        if let Some(unit) = economy.units.get_mut(settler_id) {
                            unit.carried_tool = Some(tc);
                        }
                    }
                } else {
                    if let Some(unit) = economy.units.get_mut(settler_id) {
                        unit.state = UnitState::Working;
                        unit.path = None;
                        unit.path_index = 0;
                    }
                }
                continue;
            }

            // Check if settler already has a valid path to this building
            let has_valid_path = {
                let unit = economy.units.get(settler_id);
                match unit {
                    Some(u) => {
                        u.state == UnitState::Moving
                            && u.path
                                .as_ref()
                                .map(|p| p.goal() == Some((bx, by)))
                                .unwrap_or(false)
                    }
                    None => false,
                }
            };

            if !has_valid_path {
                if let Some(path) = Pathfinder::find_path(map, (ux, uy), (bx, by)) {
                    if let Some(unit) = economy.units.get_mut(settler_id) {
                        // Save assigned_building before move_along (which clears it via unassign())
                        let saved_building = unit.assigned_building;
                        unit.move_along(path);
                        // Restore assigned_building
                        unit.assigned_building = saved_building;
                    }
                }
            }

            // Pre-compute tool pickup info (before mutable borrow to avoid conflicts)
            let pickup_tool_code: Option<u8> = {
                let unit = economy.units.get(settler_id);
                unit.and_then(|u| u.pickup_target)
                    .and_then(|real_target| {
                        economy.buildings.get(real_target)
                            .and_then(|b| b.required_tool)
                    })
            };

            // Tick movement
            if let Some(unit) = economy.units.get_mut(settler_id) {
                if unit.state == UnitState::Moving {
                    let arrived = unit.tick_movement(dt, map);
                    if arrived {
                        let new_ux = unit.x as usize;
                        let new_uy = unit.y as usize;
                        if new_ux == bx && new_uy == by {
                            // Check if this is a tool pickup stopover
                            if unit.pickup_target.is_some() {
                                // Route to actual building (tool pickup handles separately)
                                let real_target = unit.pickup_target.unwrap();
                                unit.assigned_building = Some(real_target);
                                unit.pickup_target = None;
                                unit.path = None;
                                unit.path_index = 0;
                                // Keep Moving state — next tick paths to real target
                            } else {
                                unit.state = UnitState::Working;
                                unit.path = None;
                                unit.path_index = 0;
                            }
                        }
                    }
                }
            }

            // Tool pickup: withdraw from storage + give to settler (separate borrow)
            if let Some(tc) = pickup_tool_code {
                if let Some(unit) = economy.units.get(settler_id) {
                    let new_ux = unit.x as usize;
                    let new_uy = unit.y as usize;
                    if new_ux == bx && new_uy == by && unit.pickup_target.is_none()
                        && unit.assigned_building.is_some()
                    {
                        // Settler was at storehouse this tick and was rerouted
                        economy.withdraw_tool(tc);
                    }
                }
                if let Some(unit) = economy.units.get_mut(settler_id) {
                    unit.carried_tool = Some(tc);
                }
            }
        }
    }
}

impl Default for WorkerAI {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::economy::{BuildingType, ResourceType};

    #[test]
    fn test_worker_ai_new() {
        let ai = WorkerAI::new();
        // Just verify it creates without panicking
        let _ = ai;
    }

    #[test]
    fn test_worker_ai_auto_assign() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        // Place a farm (requires settler)
        let farm_idx = economy.place_building(BuildingType::Farm, 2, 2);

        // Complete construction
        for _ in 0..20 {
            economy.update();
        }

        // Spawn a settler (but don't assign yet)
        let settler_id = economy.units.spawn(UnitKind::Settler, 0.5, 0.5);

        // Worker should be idle
        assert!(economy.units.get(settler_id).unwrap().is_idle());

        // Run AI — should auto-assign settler to farm
        let ai = WorkerAI::new();
        let _map = Map::new(10, 10);
        ai.auto_assign(&mut economy);

        // Worker should now be assigned to the farm
        let settler = economy.units.get(settler_id).unwrap();
        assert_eq!(settler.assigned_building, Some(farm_idx));
        // Worker is not at the farm yet, so state should still be Idle
        // (move_settlers handles the transition to Working)
    }

    #[test]
    fn test_worker_ai_auto_assign_no_idle_settlers() {
        let mut economy = Economy::new();
        economy.place_building(BuildingType::Farm, 2, 2);

        // No settlers → no assignments
        let ai = WorkerAI::new();
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 0);
    }

    #[test]
    fn test_worker_ai_auto_assign_building_already_has_settler() {
        let mut economy = Economy::with_starting_resources(&[(ResourceType::Wood, 100)]);

        let farm_idx = economy.place_building(BuildingType::Farm, 2, 2);
        for _ in 0..20 {
            economy.update();
        }

        // Spawn and assign first settler
        economy.spawn_settler_for(farm_idx);
        // Spawn a second idle settler
        economy.units.spawn(UnitKind::Settler, 0.5, 0.5);

        // Farm already has a settler → AI should not assign the second one to it
        let ai = WorkerAI::new();
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 0);
    }

    #[test]
    fn test_worker_ai_move_to_building() {
        let mut economy = Economy::with_starting_resources(&[(ResourceType::Wood, 100)]);

        // Place building at (2, 0) — close to settler at (0.5, 0.5)
        let farm_idx = economy.place_building(BuildingType::Farm, 2, 0);
        for _ in 0..20 {
            economy.update();
        }

        // Spawn a settler at (0, 0) and assign to farm at (2, 0)
        let settler_id = economy.units.spawn(UnitKind::Settler, 0.5, 0.5);
        economy.buildings[farm_idx].assign_settler(settler_id);
        economy.units.get_mut(settler_id).unwrap().assigned_building = Some(farm_idx);

        let map = Map::new(10, 10);
        let ai = WorkerAI::new();

        // Run many ticks to let the settler move
        let mut settler_moved = false;
        for _ in 0..2000 {
            ai.move_settlers(&mut economy, &map, 0.016);
            let settler = economy.units.get(settler_id).unwrap();
            // Check if settler moved or arrived
            if settler.x > 0.6 || settler.y > 0.6 || settler.state == UnitState::Working {
                settler_moved = true;
                break;
            }
        }

        assert!(
            settler_moved,
            "Worker should have moved toward building or arrived"
        );
    }

    #[test]
    fn test_worker_ai_full_update() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        let _farm_idx = economy.place_building(BuildingType::Farm, 3, 3);
        economy.units.spawn(UnitKind::Settler, 0.5, 0.5);

        let map = Map::new(10, 10);
        let ai = WorkerAI::new();

        // Run AI for many ticks (building needs 20 ticks to complete)
        for _ in 0..1000 {
            ai.update(&mut economy, &map, 0.016);
        }

        // Worker should be assigned to a building after construction completes
        let settler = economy.units.get(1).unwrap();
        assert!(
            settler.assigned_building.is_some(),
            "Worker should be assigned to a building, state={:?}",
            settler.state
        );
    }

    #[test]
    fn test_worker_ai_multiple_settlers_multiple_buildings() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 200),
            (ResourceType::Stone, 100),
        ]);

        let _farm1 = economy.place_building(BuildingType::Farm, 2, 2);
        let _farm2 = economy.place_building(BuildingType::Farm, 7, 7);

        // Complete construction
        for _ in 0..20 {
            economy.update();
        }

        // Spawn 2 idle settlers
        economy.units.spawn(UnitKind::Settler, 0.5, 0.5);
        economy.units.spawn(UnitKind::Settler, 9.5, 9.5);

        let _map = Map::new(10, 10);
        let ai = WorkerAI::new();

        // Auto-assign should assign both settlers
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 2, "Should assign 2 settlers to 2 farms");

        // Both settlers should be assigned
        let w1 = economy.units.get(1).unwrap();
        let w2 = economy.units.get(2).unwrap();
        assert!(w1.assigned_building.is_some());
        assert!(w2.assigned_building.is_some());
        // They should be assigned to different buildings
        assert_ne!(w1.assigned_building, w2.assigned_building);
    }

    #[test]
    fn test_worker_ai_auto_assign_tool_pickup() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        // Add a pickaxe to tool storage
        economy.add_tool(1, 1); // Pickaxe

        // Place a stonecutter (requires pickaxe)
        let stonecutter_idx = economy.place_building(BuildingType::Stonecutter, 2, 2);

        // Complete construction
        for _ in 0..31 {
            economy.update();
        }
        assert!(economy.buildings[stonecutter_idx].is_complete());

        // Spawn an idle settler
        economy.units.spawn(UnitKind::Settler, 0.5, 0.5);

        // Run auto_assign
        let ai = WorkerAI::new();
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 1, "Should assign settler to stonecutter");

        // Physical pickup: settler is routed to Storehouse/Castle first
        // (no Storehouse in test — so settler goes directly to building without tool)
        let settler = economy.units.get(1).unwrap();
        assert!(settler.assigned_building.is_some(), "Settler should be assigned somewhere");
        // Tool is NOT yet withdrawn — physical pickup requires routing through Storehouse
        assert_eq!(economy.get_tool_count(1), 1, "Pickaxe still in storage (no Storehouse)");
        assert_eq!(settler.carried_tool, None, "Settler hasn't picked up tool yet");
    }

    #[test]
    fn test_worker_ai_auto_assign_tool_pickup_no_tool_available() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        // Place a stonecutter (requires pickaxe) — but no tools in storage
        let stonecutter_idx = economy.place_building(BuildingType::Stonecutter, 2, 2);
        for _ in 0..31 {
            economy.update();
        }
        assert!(economy.buildings[stonecutter_idx].is_complete());

        // Spawn an idle settler
        economy.units.spawn(UnitKind::Settler, 0.5, 0.5);

        // Run auto_assign
        let ai = WorkerAI::new();
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 1, "Should still assign settler even without tool");

        // Check settler does NOT carry a tool (none available)
        let settler = economy.units.get(1).unwrap();
        assert_eq!(settler.assigned_building, Some(stonecutter_idx));
        assert_eq!(settler.carried_tool, None, "Settler should not carry a tool");
    }
}
