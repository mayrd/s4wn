//! S4WN Worker AI Module
//!
//! Phase 2 — Game Logic: settler/worker AI for automatic task assignment
//! and movement to assigned buildings.
//!
//! ## Design
//!
//! The worker AI system handles:
//! 1. **Auto-assignment**: Idle workers are automatically assigned to buildings
//!    that need workers (no workers yet, but `requires_worker() == true`).
//! 2. **Movement to building**: When a worker is assigned to a building but
//!    not at the building's tile, they pathfind to it using A*.
//! 3. **Work loop**: Once at the building, the worker's state changes to
//!    `Working` and production can proceed.
//!
//! The AI runs each tick as part of the economy update. It processes:
//! - Find idle workers → assign to nearest building that needs a worker
//! - For assigned-but-not-there workers → compute path and start moving
//! - Workers that reach their building → transition to Working state

use crate::economy::Economy;
use crate::map::Map;
use crate::pathfinding::Pathfinder;
use crate::units::{UnitKind, UnitState};

/// Worker AI controller — makes workers autonomous.
#[derive(Debug, Clone)]
pub struct WorkerAI;

impl WorkerAI {
    /// Create a new worker AI controller.
    pub fn new() -> Self {
        WorkerAI
    }

    /// Run the full worker AI update for one tick.
    ///
    /// This:
    /// 1. Auto-assigns idle workers to buildings that need them.
    /// 2. Moves assigned workers toward their building (pathfinding).
    /// 3. Transitions workers to Working state when they arrive.
    pub fn update(&self, economy: &mut Economy, map: &Map, dt: f32) {
        // Phase 1: Auto-assign idle workers to buildings that need them
        self.auto_assign(economy);

        // Phase 2: Move assigned workers toward their building
        self.move_workers(economy, map, dt);

        // Phase 3: Update economy tick (production, construction)
        economy.update();
    }

    /// Auto-assign idle workers to buildings that need workers.
    /// Returns the number of new assignments.
    fn auto_assign(&self, economy: &mut Economy) -> usize {
        let mut assigned = 0;

        // Collect building indices that need workers
        let mut needs_worker: Vec<usize> = Vec::new();
        for (i, building) in economy.buildings.iter().enumerate() {
            if building.kind.requires_worker()
                && building.is_complete()
                && building.assigned_workers.is_empty()
            {
                needs_worker.push(i);
            }
        }

        // Collect idle worker IDs first (avoid re-finding the same worker)
        let idle_worker_ids: Vec<u32> = economy
            .units
            .idle_workers()
            .map(|u| u.id)
            .collect();

        // For each building that needs a worker, try to find an idle worker
        for (i, &building_idx) in needs_worker.iter().enumerate() {
            if i >= idle_worker_ids.len() {
                break; // No more idle workers
            }
            let worker_id = idle_worker_ids[i];
            // Assign worker to building
            economy.buildings[building_idx].assign_worker(worker_id);
            if let Some(unit) = economy.units.get_mut(worker_id) {
                unit.assigned_building = Some(building_idx);
                // Set state to Moving so move_workers handles pathfinding
                unit.state = UnitState::Moving;
            }
            assigned += 1;
        }

        assigned
    }

    /// Move workers that are assigned to buildings but not yet there.
    /// Uses A* pathfinding to compute paths.
    fn move_workers(&self, economy: &mut Economy, map: &Map, dt: f32) {
        // Collect worker data needed for movement (avoid borrow conflicts)
        let mut worker_tasks: Vec<(u32, usize, usize, usize, usize)> = Vec::new();
        // (worker_id, building_x, building_y, unit_tile_x, unit_tile_y)

        for u in economy.units.all() {
            if u.kind != UnitKind::Worker || !u.is_alive() || u.state == UnitState::Working {
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
            worker_tasks.push((u.id, building.x, building.y, ux, uy));
        }

        for (worker_id, bx, by, ux, uy) in worker_tasks {
            // Check if worker is already at the building
            if ux == bx && uy == by {
                if let Some(unit) = economy.units.get_mut(worker_id) {
                    unit.state = UnitState::Working;
                    unit.path = None;
                    unit.path_index = 0;
                }
                continue;
            }

            // Check if worker already has a valid path to this building
            let has_valid_path = {
                let unit = economy.units.get(worker_id);
                match unit {
                    Some(u) => {
                        u.state == UnitState::Moving
                            && u.path.as_ref()
                                .map(|p| p.goal() == Some((bx, by)))
                                .unwrap_or(false)
                    }
                    None => false,
                }
            };

            if !has_valid_path {
                if let Some(path) = Pathfinder::find_path(map, (ux, uy), (bx, by)) {
                    if let Some(unit) = economy.units.get_mut(worker_id) {
                        // Save assigned_building before move_along (which clears it via unassign())
                        let saved_building = unit.assigned_building;
                        unit.move_along(path);
                        // Restore assigned_building
                        unit.assigned_building = saved_building;
                    }
                }
            }

            // Tick movement
            if let Some(unit) = economy.units.get_mut(worker_id) {
                if unit.state == UnitState::Moving {
                    let arrived = unit.tick_movement(dt, map);
                    if arrived {
                        let new_ux = unit.x as usize;
                        let new_uy = unit.y as usize;
                        if new_ux == bx && new_uy == by {
                            unit.state = UnitState::Working;
                            unit.path = None;
                            unit.path_index = 0;
                        }
                    }
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

        // Place a farm (requires worker)
        let farm_idx = economy.place_building(BuildingType::Farm, 2, 2);

        // Complete construction
        for _ in 0..20 {
            economy.update();
        }

        // Spawn a worker (but don't assign yet)
        let worker_id = economy.units.spawn(UnitKind::Worker, 0.5, 0.5);

        // Worker should be idle
        assert!(economy.units.get(worker_id).unwrap().is_idle());

        // Run AI — should auto-assign worker to farm
        let ai = WorkerAI::new();
        let map = Map::new(10, 10);
        ai.auto_assign(&mut economy);

        // Worker should now be assigned to the farm
        let worker = economy.units.get(worker_id).unwrap();
        assert_eq!(worker.assigned_building, Some(farm_idx));
        // Worker is not at the farm yet, so state should still be Idle
        // (move_workers handles the transition to Working)
    }

    #[test]
    fn test_worker_ai_auto_assign_no_idle_workers() {
        let mut economy = Economy::new();
        economy.place_building(BuildingType::Farm, 2, 2);

        // No workers → no assignments
        let ai = WorkerAI::new();
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 0);
    }

    #[test]
    fn test_worker_ai_auto_assign_building_already_has_worker() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
        ]);

        let farm_idx = economy.place_building(BuildingType::Farm, 2, 2);
        for _ in 0..20 {
            economy.update();
        }

        // Spawn and assign first worker
        economy.spawn_worker_for(farm_idx);
        // Spawn a second idle worker
        economy.units.spawn(UnitKind::Worker, 0.5, 0.5);

        // Farm already has a worker → AI should not assign the second one to it
        let ai = WorkerAI::new();
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 0);
    }

    #[test]
    fn test_worker_ai_move_to_building() {
        let mut economy = Economy::with_starting_resources(&[(ResourceType::Wood, 100)]);

        // Place building at (2, 0) — close to worker at (0.5, 0.5)
        let farm_idx = economy.place_building(BuildingType::Farm, 2, 0);
        for _ in 0..20 {
            economy.update();
        }

        // Spawn a worker at (0, 0) and assign to farm at (2, 0)
        let worker_id = economy.units.spawn(UnitKind::Worker, 0.5, 0.5);
        economy.buildings[farm_idx].assign_worker(worker_id);
        economy.units.get_mut(worker_id).unwrap().assigned_building = Some(farm_idx);

        let map = Map::new(10, 10);
        let ai = WorkerAI::new();

        // Run many ticks to let the worker move
        let mut worker_moved = false;
        for _ in 0..2000 {
            ai.move_workers(&mut economy, &map, 0.016);
            let worker = economy.units.get(worker_id).unwrap();
            // Check if worker moved or arrived
            if worker.x > 0.6 || worker.y > 0.6 || worker.state == UnitState::Working {
                worker_moved = true;
                break;
            }
        }

        assert!(
            worker_moved,
            "Worker should have moved toward building or arrived"
        );
    }

    #[test]
    fn test_worker_ai_full_update() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 100),
            (ResourceType::Stone, 50),
        ]);

        let farm_idx = economy.place_building(BuildingType::Farm, 3, 3);
        economy.units.spawn(UnitKind::Worker, 0.5, 0.5);

        let map = Map::new(10, 10);
        let ai = WorkerAI::new();

        // Run AI for many ticks (building needs 20 ticks to complete)
        for _ in 0..1000 {
            ai.update(&mut economy, &map, 0.016);
        }

        // Worker should be assigned to a building after construction completes
        let worker = economy.units.get(1).unwrap();
        assert!(
            worker.assigned_building.is_some(),
            "Worker should be assigned to a building, state={:?}",
            worker.state
        );
    }

    #[test]
    fn test_worker_ai_multiple_workers_multiple_buildings() {
        let mut economy = Economy::with_starting_resources(&[
            (ResourceType::Wood, 200),
            (ResourceType::Stone, 100),
        ]);

        let farm1 = economy.place_building(BuildingType::Farm, 2, 2);
        let farm2 = economy.place_building(BuildingType::Farm, 7, 7);

        // Complete construction
        for _ in 0..20 {
            economy.update();
        }

        // Spawn 2 idle workers
        economy.units.spawn(UnitKind::Worker, 0.5, 0.5);
        economy.units.spawn(UnitKind::Worker, 9.5, 9.5);

        let map = Map::new(10, 10);
        let ai = WorkerAI::new();

        // Auto-assign should assign both workers
        let assigned = ai.auto_assign(&mut economy);
        assert_eq!(assigned, 2, "Should assign 2 workers to 2 farms");

        // Both workers should be assigned
        let w1 = economy.units.get(1).unwrap();
        let w2 = economy.units.get(2).unwrap();
        assert!(w1.assigned_building.is_some());
        assert!(w2.assigned_building.is_some());
        // They should be assigned to different buildings
        assert_ne!(w1.assigned_building, w2.assigned_building);
    }
}
