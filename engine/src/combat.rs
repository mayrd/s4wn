//! S4WN Combat Module
//!
//! Phase 2 — Game Logic: military combat system with attack resolution,
//! damage calculation, and soldier AI.
//!
//! ## Design
//!
//! The combat system handles:
//! 1. **Attack resolution**: When a soldier/archer is in range of an enemy,
//!    they attack based on their attack interval and damage stats.
//! 2. **Damage calculation**: Simple subtraction with no armor for now.
//!    Future: armor, terrain bonuses, morale.
//! 3. **Unit AI**: Soldiers automatically seek out nearby enemies and attack.
//!    Archers maintain range; soldiers close in for melee.
//! 4. **Death**: Units with 0 HP are marked Dead and cleaned up.
//!
//! ## Combat Flow
//!
//! Each tick:
//! 1. For each alive soldier/archer with no target, find nearest enemy.
//! 2. If in range → attack (apply damage, start cooldown).
//! 3. If not in range → move toward enemy (pathfinding).
//! 4. Remove dead units periodically.

use crate::economy::Economy;
use crate::map::Map;
use crate::pathfinding::Pathfinder;
use crate::units::{UnitManager, UnitState, UnitStance};

const BUILDING_TARGET_SENTINEL: u32 = 0x8000_0000;

fn is_building_target(target_id: u32) -> bool { target_id >= BUILDING_TARGET_SENTINEL }
fn decode_building_index(target_id: u32) -> usize { (target_id & !BUILDING_TARGET_SENTINEL) as usize }
fn encode_building_target(building_index: usize) -> u32 { BUILDING_TARGET_SENTINEL | (building_index as u32) }

/// Combat controller — manages all military engagements.
#[derive(Debug, Clone)]
pub struct CombatAI;

impl CombatAI {
    /// Create a new combat AI.
    pub fn new() -> Self {
        CombatAI
    }

    /// Run one tick of combat AI for all military units.
    ///
    /// `player_id` is a simple identifier for the owning player.
    /// For now, we treat all non-Worker units as potential combatants
    /// and enemies are any unit not of the same "faction" (simplified:
    /// units with odd IDs are player 1, even IDs are player 2 — for testing).
    ///
    /// NOTE: This does NOT call units.tick() — worker movement is handled by
    /// WorkerAI, and soldier movement is handled by chase_target below.
    /// We only tick attack cooldowns for all units here.
    pub fn update(&self, units: &mut UnitManager, map: &Map, dt: f32) {
        // Tick attack cooldowns for all units
        for unit in units.all_mut() {
            unit.tick_attack();
        }

        // Tick movement for combat units that are moving
        for unit in units.all_mut() {
            if !unit.is_alive() || !unit.kind.can_fight() {
                continue;
            }
            if unit.state == UnitState::Moving {
                let _ = unit.tick_movement(dt, map);
            }
        }

        // Phase 2: Combat AI for soldiers and archers
        let combatant_ids: Vec<u32> = units
            .alive_units()
            .filter(|u| u.kind.can_fight())
            .map(|u| u.id)
            .collect();

        for unit_id in combatant_ids {
            self.update_combatant(units, map, unit_id);
        }
    }

    /// Update a single combat unit's AI.
    fn update_combatant(&self, units: &mut UnitManager, map: &Map, unit_id: u32) {
        let unit = match units.get(unit_id) {
            Some(u) if u.is_alive() && u.kind.can_fight() => u,
            _ => return,
        };

        // If unit is already fighting and target is alive, continue attacking
        if unit.state == UnitState::Fighting {
            if let Some(target_id) = unit.target {
                if let Some(target) = units.get(target_id) {
                    if target.is_alive() {
                        // Check if in range
                        let dist = unit.distance_to(target);
                        let range = unit.kind.attack_range() * unit.attack_range_mult;
                        if dist <= range {
                            // In range → try to attack
                            self.try_attack(units, unit_id);
                            return;
                        } else {
                            // Target moved out of range
                            // StandGround: do NOT chase; drop target and hold position
                            if unit.stance == UnitStance::StandGround {
                                if let Some(u) = units.get_mut(unit_id) {
                                    u.target = None;
                                    u.state = if u.patrol_point.is_some() {
                                        UnitState::Patrolling
                                    } else {
                                        UnitState::Idle
                                    };
                                }
                                return;
                            }
                            // Aggressive or Passive (defending): chase
                            self.chase_target(units, map, unit_id);
                            return;
                        }
                    }
                }
            }
            // Target dead or gone → clear target, return to patrol or idle
            if let Some(u) = units.get_mut(unit_id) {
                u.target = None;
                if u.state == UnitState::Fighting {
                    if u.patrol_point.is_some() {
                        u.state = UnitState::Patrolling;
                    } else {
                        u.state = UnitState::Idle;
                    }
                }
            }
        }

        // Passive stance: skip enemy-seeking entirely (only fight back when attacked)
        {
            let u = units.get(unit_id).unwrap();
            if u.stance == UnitStance::Passive && u.state != UnitState::Fighting {
                return;
            }
        }

        // If patrolling and has a patrol point, check if reached destination
        let (is_patrolling, patrol_target) = {
            let u = units.get(unit_id).unwrap();
            (
                u.state == UnitState::Patrolling,
                u.patrol_point,
            )
        };

        if is_patrolling {
            let at_patrol_point = {
                let u = units.get(unit_id).unwrap();
                if u.state != UnitState::Moving {
                    // Check if at patrol point
                    if let Some((px, py)) = patrol_target {
                        let dx = (u.x - (px as f32 + 0.5)).abs();
                        let dy = (u.y - (py as f32 + 0.5)).abs();
                        dx < 0.5 && dy < 0.5
                    } else {
                        true // no patrol point → idle
                    }
                } else {
                    false
                }
            };

            if at_patrol_point {
                // At patrol point: scan for nearby enemies (larger radius)
                let enemy_id = self.find_nearest_enemy(units, unit_id);
                if let Some(enemy_id) = enemy_id {
                    let in_range = {
                        let u = units.get(unit_id).unwrap();
                        let e = units.get(enemy_id).unwrap();
                        let dist = u.distance_to(e);
                        let range = u.kind.attack_range() * u.attack_range_mult;
                        dist <= range
                    };
                    if in_range {
                        if let Some(u) = units.get_mut(unit_id) {
                            u.target = Some(enemy_id);
                            u.state = UnitState::Fighting;
                        }
                        self.try_attack(units, unit_id);
                        return;
                    } else {
                        // Enemy found but out of range → chase
                        self.chase_target(units, map, unit_id);
                        return;
                    }
                }
                // No enemy found at patrol point → stay idle
                return;
            }
        }

        // If idle but has a patrol point, return to it
        let needs_return = {
            let u = units.get(unit_id).unwrap();
            u.state == UnitState::Idle && u.patrol_point.is_some()
        };
        if needs_return {
            let (px, py) = {
                let u = units.get(unit_id).unwrap();
                u.patrol_point.unwrap()
            };
            let (ux, uy) = {
                let u = units.get(unit_id).unwrap();
                (u.x as usize, u.y as usize)
            };
            if let Some(u) = units.get_mut(unit_id) {
                u.state = UnitState::Patrolling;
            }
            if let Some(path) = Pathfinder::find_path(map, (ux, uy), (px, py)) {
                if let Some(u) = units.get_mut(unit_id) {
                    u.move_along(path);
                }
            }
            return;
        }

        // Unit is idle → find nearest enemy
        let enemy_id = self.find_nearest_enemy(units, unit_id);

        if let Some(enemy_id) = enemy_id {
            let (_dist, can_attack, is_stand_ground) = {
                let unit = units.get(unit_id).unwrap();
                let enemy = units.get(enemy_id).unwrap();
                let dist = unit.distance_to(enemy);
                let range = unit.kind.attack_range() * unit.attack_range_mult;
                (dist, dist <= range, unit.stance == UnitStance::StandGround)
            };

            if can_attack {
                // In range → start fighting
                if let Some(u) = units.get_mut(unit_id) {
                    u.target = Some(enemy_id);
                    u.state = UnitState::Fighting;
                }
                self.try_attack(units, unit_id);
            } else if is_stand_ground {
                // StandGround: enemy in detection range but out of attack range → do NOT chase
                // Just note the enemy exists but hold position
            } else {
                // Out of range → chase (Aggressive)
                // Set target first so chase_target can find the destination
                if let Some(u) = units.get_mut(unit_id) {
                    u.target = Some(enemy_id);
                }
                self.chase_target(units, map, unit_id);
            }
        }
    }

    /// Find the nearest enemy unit for the given unit.
    /// Simple faction system: units with odd IDs are faction 1, even are faction 2.
    fn find_nearest_enemy(&self, units: &UnitManager, unit_id: u32) -> Option<u32> {
        let unit = units.get(unit_id)?;
        let my_faction = unit.id % 2; // 0 = faction 2, 1 = faction 1

        let mut nearest: Option<u32> = None;
        let mut nearest_dist = f32::INFINITY;

        for enemy in units.alive_units() {
            if enemy.id == unit_id {
                continue;
            }
            if enemy.id % 2 == my_faction {
                continue; // same faction
            }
            let dist = unit.distance_to(enemy);
            if dist < nearest_dist {
                nearest_dist = dist;
                nearest = Some(enemy.id);
            }
        }

        nearest
    }

    /// Try to attack the current target.
    fn try_attack(&self, units: &mut UnitManager, attacker_id: u32) {
        let (target_id, target_kind, damage, cooldown) = {
            let attacker = match units.get(attacker_id) {
                Some(u) => u,
                None => return,
            };
            if !attacker.can_attack() {
                return;
            }
            let target_id = match attacker.target {
                Some(id) => id,
                None => return,
            };
            let target_kind = units.get(target_id).map(|t| t.kind);
            (
                target_id,
                target_kind,
                (attacker.effective_attack_damage() as f32 * attacker.attack_mult).max(1.0) as u32,
                attacker.kind.attack_interval(),
            )
        };

        // Apply damage (defense multiplier reduces incoming damage)
        let effective_damage = {
            let target = match units.get(target_id) {
                Some(t) => t,
                None => return,
            };
            let defense = {
                let base_def = target.defense_mult;
                let aura_def = if target.defense_aura_buff {
                    crate::units::SQUAD_LEADER_AURA_DEFENSE_BONUS
                } else {
                    0.0
                };
                // Morale bonus also adds to defense (same multiplier as attack)
                let morale_def = target.morale_bonus;
                base_def + aura_def + morale_def
            };
            (damage as f32 / defense.max(0.1)).max(1.0) as u32
        };
        let died = units.apply_damage_and_record_death(target_id, effective_damage);

        // Increment combat hits counter
        units.recent_combat_hits += 1;

        // Set cooldown on attacker
        if let Some(attacker) = units.get_mut(attacker_id) {
            attacker.attack_cooldown = cooldown;
        }

        if died {
            // Grant experience to the attacker for the kill
            if let Some(tk) = target_kind {
                let xp = tk.experience_on_kill();
                if let Some(attacker) = units.get_mut(attacker_id) {
                    attacker.add_experience(xp);
                }
            }
            // Remove attacker's target
            if let Some(attacker) = units.get_mut(attacker_id) {
                attacker.target = None;
                attacker.state = UnitState::Idle;
            }
        }
    }

    /// Chase the current target by pathfinding toward them.
    fn chase_target(&self, units: &mut UnitManager, map: &Map, unit_id: u32) {
        let (target_x, target_y) = {
            let unit = match units.get(unit_id) {
                Some(u) => u,
                None => return,
            };
            let target_id = match unit.target {
                Some(id) => id,
                None => return,
            };
            let target = match units.get(target_id) {
                Some(t) => t,
                None => return,
            };
            (target.x as usize, target.y as usize)
        };

        let (unit_x, unit_y) = {
            let unit = units.get(unit_id).unwrap();
            (unit.x as usize, unit.y as usize)
        };

        // Only recompute path if we don't have one or target moved significantly
        let needs_repath = {
            let unit = units.get(unit_id).unwrap();
            unit.path
                .as_ref()
                .map(|p| p.goal() != Some((target_x, target_y)))
                .unwrap_or(true)
        };

        if needs_repath {
            if let Some(path) = Pathfinder::find_path(map, (unit_x, unit_y), (target_x, target_y)) {
                if let Some(unit) = units.get_mut(unit_id) {
                    unit.move_along(path);
                }
            }
        }
    }

    /// Run building combat: idle military units seek and attack enemy buildings.
    /// Call this AFTER update() for full unit-vs-unit + unit-vs-building behavior.
    pub fn attack_buildings(&self, economy: &mut Economy, map: &Map, dt: f32) {
        // Collect idle combat unit IDs first (drop units borrow before accessing buildings)
        let idle_ids: Vec<u32> = {
            let units = &economy.units;
            units.alive_units()
                .filter(|u| u.kind.can_fight() && u.state == UnitState::Idle
                    && u.target.is_none() && u.stance != UnitStance::Passive)
                .map(|u| u.id)
                .collect()
        };

        for &unit_id in &idle_ids {
            // Tick movement if needed
            {
                let units = &mut economy.units;
                if let Some(u) = units.get_mut(unit_id) {
                    if u.state == UnitState::Moving {
                        let _ = u.tick_movement(dt, map);
                    }
                }
            }

            let b_idx = self.find_nearest_enemy_building(economy, unit_id);
            if let Some(idx) = b_idx {
                self.engage_building(economy, map, unit_id, idx);
            }
        }
    }

    fn find_nearest_enemy_building(&self, economy: &Economy, unit_id: u32) -> Option<usize> {
        let unit = economy.units.get(unit_id)?;
        let my_faction = unit.id % 2;
        let mut nearest: Option<usize> = None;
        let mut nearest_dist = f32::INFINITY;
        for (idx, building) in economy.buildings.iter().enumerate() {
            if !building.active || building.hp == 0 { continue; }
            if building.owner_id as u32 % 2 == my_faction { continue; }
            let bx = building.x as f32 + 0.5;
            let by = building.y as f32 + 0.5;
            let dist = ((unit.x - bx).powi(2) + (unit.y - by).powi(2)).sqrt();
            if dist < nearest_dist { nearest_dist = dist; nearest = Some(idx); }
        }
        nearest
    }

    fn engage_building(&self, economy: &mut Economy, map: &Map, unit_id: u32, building_idx: usize) {
        let units = &mut economy.units;
        let (ux, uy, stance, range) = {
            let u = match units.get(unit_id) { Some(u) => u, None => return };
            (u.x, u.y, u.stance, u.kind.attack_range() * u.attack_range_mult)
        };
        let (bx, by) = match economy.buildings.get(building_idx) {
            Some(b) if b.active && b.hp > 0 => (b.x as f32 + 0.5, b.y as f32 + 0.5),
            _ => return,
        };
        let dist = ((ux - bx).powi(2) + (uy - by).powi(2)).sqrt();
        if dist <= range {
            if let Some(u) = units.get_mut(unit_id) {
                u.target = Some(encode_building_target(building_idx));
                u.state = UnitState::Fighting;
            }
            self.try_attack_building(economy, unit_id);
        } else if stance != UnitStance::StandGround {
            if let Some(path) = Pathfinder::find_path(map, (ux as usize, uy as usize), (bx as usize, by as usize)) {
                if let Some(u) = units.get_mut(unit_id) {
                    u.target = Some(encode_building_target(building_idx));
                    u.move_along(path);
                }
            }
        }
    }

    fn try_attack_building(&self, economy: &mut Economy, attacker_id: u32) {
        let (building_idx, damage, cooldown) = {
            let units = &economy.units;
            let attacker = match units.get(attacker_id) { Some(u) => u, None => return };
            if !attacker.can_attack() { return; }
            let target_id = match attacker.target { Some(id) if is_building_target(id) => id, _ => return };
            (decode_building_index(target_id),
             (attacker.effective_attack_damage() as f32 * attacker.attack_mult).max(1.0) as u32,
             attacker.kind.attack_interval())
        };
        let building_destroyed = if building_idx < economy.buildings.len() {
            let building = &mut economy.buildings[building_idx];
            if building.hp > 0 && building.active {
                building.take_damage(damage) == 0
            } else {
                if let Some(attacker) = economy.units.get_mut(attacker_id) { attacker.target = None; attacker.state = UnitState::Idle; }
                return;
            }
        } else {
            if let Some(attacker) = economy.units.get_mut(attacker_id) { attacker.target = None; attacker.state = UnitState::Idle; }
            return;
        };
        if let Some(attacker) = economy.units.get_mut(attacker_id) { attacker.attack_cooldown = cooldown; }
        if building_destroyed {
            if let Some(attacker) = economy.units.get_mut(attacker_id) { attacker.target = None; attacker.state = UnitState::Idle; }
        }
    }
}

impl Default for CombatAI {
    fn default() -> Self {
        Self::new()
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::economy::BuildingType;
    use crate::units::UnitKind;

    #[test]
    fn test_combat_ai_new() {
        let ai = CombatAI::new();
        let _ = ai;
    }

    #[test]
    fn test_combat_find_nearest_enemy() {
        let mut mgr = UnitManager::new();
        // Unit 1 (odd = faction 1)
        mgr.spawn(UnitKind::Swordsman, 0.0, 0.0);
        // Unit 2 (even = faction 2)
        mgr.spawn(UnitKind::Swordsman, 5.0, 0.0);
        // Unit 3 (odd = faction 1, same as unit 1)
        mgr.spawn(UnitKind::Swordsman, 10.0, 0.0);

        let ai = CombatAI::new();
        let enemy = ai.find_nearest_enemy(&mgr, 1);
        assert_eq!(
            enemy,
            Some(2),
            "Unit 1 should target unit 2 (enemy faction)"
        );

        // Unit 2 should target unit 1 (nearest enemy)
        let enemy2 = ai.find_nearest_enemy(&mgr, 2);
        assert_eq!(enemy2, Some(1), "Unit 2 should target unit 1 (nearest)");
    }

    #[test]
    fn test_combat_attack_deals_damage() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 1.0, 0.0); // adjacent

        // Set up combat state
        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // Soldier does 15 damage per hit
        let target = mgr.get(id2).unwrap();
        assert_eq!(
            target.hp, 85,
            "Soldier should take 15 damage, hp={}",
            target.hp
        );

        // Attacker should have cooldown
        let attacker = mgr.get(id1).unwrap();
        assert_eq!(
            attacker.attack_cooldown, 15,
            "Attack cooldown should be 15 ticks"
        );
    }

    #[test]
    fn test_combat_kill_unit() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 1.0, 0.0);

        // Set unit 2 to low HP
        mgr.get_mut(id2).unwrap().hp = 10;

        // Set up combat
        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // Unit 2 should be dying (15 damage > 10 HP)
        let target = mgr.get(id2).unwrap();
        assert!(!target.is_alive(), "Unit 2 should be dead");
        assert_eq!(target.state, UnitState::Dying);
        assert_eq!(target.dying_timer, 1.0);

        // Tick death animation to transition to Dead
        mgr.tick_dying_units(1.0);
        let target = mgr.get(id2).unwrap();
        assert_eq!(target.state, UnitState::Dead);

        // Attacker should have cleared target
        let attacker = mgr.get(id1).unwrap();
        assert!(
            attacker.target.is_none(),
            "Attacker should clear target after kill"
        );
        assert_eq!(attacker.state, UnitState::Idle);
    }

    #[test]
    fn test_combat_cooldown_prevents_attack() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 1.0, 0.0);

        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;
        mgr.get_mut(id1).unwrap().attack_cooldown = 5;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // No damage because on cooldown
        let target = mgr.get(id2).unwrap();
        assert_eq!(target.hp, 100, "Should not deal damage during cooldown");
    }

    #[test]
    fn test_combat_archer_ranged_attack() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Bowman, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Swordsman, 2.0, 0.0); // 2 tiles away (within range 3)

        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // Archer does 10 damage
        let target = mgr.get(id2).unwrap();
        assert_eq!(
            target.hp, 90,
            "Archer should deal 10 damage, hp={}",
            target.hp
        );
    }

    #[test]
    fn test_combat_update_full() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5); // adjacent enemy

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // After update, one unit should have taken damage
        let u1 = mgr.get(id1).unwrap();
        let u2 = mgr.get(id2).unwrap();

        // One of them should have taken damage (the one that attacked first)
        let total_hp = u1.hp + u2.hp;
        assert!(
            total_hp < 200,
            "At least one unit should have taken damage, total_hp={}",
            total_hp
        );
    }

    #[test]
    fn test_combat_soldiers_chase_enemy() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Place soldiers very close (adjacent tiles)
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5); // 1 tile away

        let ai = CombatAI::new();
        // Run a few ticks - they should find each other and one should attack
        for _ in 0..50 {
            ai.update(&mut mgr, &map, 0.016);
        }

        // At least one unit should have taken damage
        let u1 = mgr.get(id1).unwrap();
        let u2 = mgr.get(id2).unwrap();
        let total_hp = u1.hp + u2.hp;
        assert!(
            total_hp < 200 || u1.state != UnitState::Idle || u2.state != UnitState::Idle,
            "Soldiers should have engaged in combat, total_hp={}, states=({:?}, {:?})",
            total_hp,
            u1.state,
            u2.state
        );
    }

    #[test]
    fn test_combat_dead_units_ignored() {
        let map = Map::new(10, 10);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Swordsman, 0.5, 0.5);
        let id2 = mgr.spawn(UnitKind::Swordsman, 1.5, 0.5);

        // Kill unit 2
        mgr.get_mut(id2).unwrap().hp = 0;
        mgr.get_mut(id2).unwrap().state = UnitState::Dead;

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should be idle (no enemies)
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Idle);
    }

    #[test]
    fn test_patrol_unit_moves_to_patrol_point() {
        let mut mgr = UnitManager::new();
        let map = Map::new(20, 20);
        let id1 = mgr.spawn(UnitKind::Swordsman, 2.5, 2.5);

        // Order patrol to (10, 10)
        mgr.order_patrol(&[id1], 10, 10, &map);

        let u = mgr.get(id1).unwrap();
        assert_eq!(u.state, UnitState::Patrolling);
        assert_eq!(u.patrol_point, Some((10, 10)));
    }

    #[test]
    fn test_patrol_unit_returns_after_killing_enemy() {
        let mut mgr = UnitManager::new();
        let map = Map::new(20, 20);
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5); // adjacent enemy (even id = faction 2)

        // Set up patrol
        mgr.get_mut(id1).unwrap().patrol_point = Some((10, 10));
        mgr.get_mut(id1).unwrap().state = UnitState::Patrolling;

        // Set unit 1 fighting unit 2
        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        // Kill unit 2
        mgr.get_mut(id2).unwrap().hp = 0;
        mgr.get_mut(id2).unwrap().state = UnitState::Dead;

        // Run combat AI
        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should return to patrol state (not idle)
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Patrolling, "Should return to Patrolling after killing enemy");
        assert!(u1.target.is_none());
    }

    #[test]
    fn test_patrol_unit_at_patrol_point_scans_for_enemies() {
        let mut mgr = UnitManager::new();
        let map = Map::new(20, 20);
        // Unit 1 at patrol point (5, 5)
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        // Unit 2 (enemy) within attack range (1 tile away)
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5);

        // Set unit 1 as patrolling at its current position
        mgr.get_mut(id1).unwrap().patrol_point = Some((5, 5));
        mgr.get_mut(id1).unwrap().state = UnitState::Patrolling;

        // Run combat AI
        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should be fighting the enemy
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Fighting);
        assert_eq!(u1.target, Some(id2));
    }

    // ── Unit Stance Tests ──

    #[test]
    fn test_passive_unit_does_not_seek_enemies() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Unit 1 (odd = faction 1) set to Passive
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        mgr.get_mut(id1).unwrap().stance = UnitStance::Passive;
        // Unit 2 (even = faction 2) is nearby but idle
        let _id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5);

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should still be idle (passive, did not seek enemy)
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Idle, "Passive unit should not seek enemies");
        assert!(u1.target.is_none(), "Passive unit should have no target");
        // Unit 2 (aggressive) should be idle too since unit 1 is same faction check bypassed here
        // Actually, unit 2 might attack unit 1 since unit 1 is odd=1 and unit 2 is even=0
        // Unit 2 would attack... but let's verify passive unit 1 stays idle
        let u1_after = mgr.get(id1).unwrap();
        assert!(u1_after.target.is_none() || u1_after.state != UnitState::Fighting,
            "Passive unit should not initiate fighting");
    }

    #[test]
    fn test_passive_unit_defends_when_attacked() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Set up unit 1 (passive) already being attacked by unit 2
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        mgr.get_mut(id1).unwrap().stance = UnitStance::Passive;
        mgr.get_mut(id1).unwrap().target = Some(2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;
        // Unit 2 is right next to unit 1 (adjacent)
        let _id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5);

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should still be fighting (defending itself)
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Fighting,
            "Passive unit should fight back when already engaged");
    }

    #[test]
    fn test_stand_ground_does_not_chase() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Unit 1 (StandGround) within bowman range of unit 2, but out of melee range
        let id1 = mgr.spawn(UnitKind::Bowman, 5.5, 5.5);
        mgr.get_mut(id1).unwrap().stance = UnitStance::StandGround;
        // Unit 2 (enemy) is 4 tiles away — within bowman detection but out of range (3)
        // Actually, let's place them 5 tiles apart so both are out of attack range
        let _id2 = mgr.spawn(UnitKind::Swordsman, 10.5, 5.5);

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should NOT chase — should remain idle (StandGround, not chasing)
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Idle,
            "StandGround bowman should not chase distant enemy");
        assert!(u1.target.is_none(), "StandGround unit should not acquire out-of-range target");
    }

    #[test]
    fn test_stand_ground_drops_target_when_out_of_range() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Unit 1 (StandGround) is fighting at close range
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        mgr.get_mut(id1).unwrap().stance = UnitStance::StandGround;
        mgr.get_mut(id1).unwrap().target = Some(2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;
        // Unit 2 is far away (out of range)
        let _id2 = mgr.spawn(UnitKind::Swordsman, 15.5, 5.5);

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should drop target since StandGround doesn't chase
        let u1 = mgr.get(id1).unwrap();
        assert!(u1.target.is_none(),
            "StandGround should drop target when out of range");
        assert_eq!(u1.state, UnitState::Idle,
            "StandGround should become idle after dropping target");
    }

    #[test]
    fn test_aggressive_unit_chases_enemy() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Unit 1 (Aggressive, default) is far from unit 2
        let id1 = mgr.spawn(UnitKind::Swordsman, 2.5, 2.5);
        // Ensure default stance is Aggressive
        assert_eq!(mgr.get(id1).unwrap().stance, UnitStance::Aggressive);
        // Unit 2 (enemy) far away
        let id2 = mgr.spawn(UnitKind::Swordsman, 15.5, 5.5);

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should be chasing (Moving toward or targeting unit 2)
        let u1 = mgr.get(id1).unwrap();
        // It should at least have acquired unit 2 as target and be moving
        assert!(
            u1.state == UnitState::Moving || u1.target == Some(id2),
            "Aggressive unit should chase or target enemy, got state={:?} target={:?}",
            u1.state, u1.target
        );
    }

    #[test]
    fn test_stand_ground_attacks_enemy_in_range() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        // Unit 1 (StandGround) is adjacent to unit 2
        let id1 = mgr.spawn(UnitKind::Swordsman, 5.5, 5.5);
        mgr.get_mut(id1).unwrap().stance = UnitStance::StandGround;
        // Unit 2 is right next to it (within attack range)
        let id2 = mgr.spawn(UnitKind::Swordsman, 6.5, 5.5);

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should engage because enemy is in attack range
        let u1 = mgr.get(id1).unwrap();
        assert!(u1.state == UnitState::Fighting || u1.target == Some(id2),
            "StandGround unit should attack enemy in range, got state={:?} target={:?}",
            u1.state, u1.target
        );
    }

    // --- Building Combat Tests ---

    #[test]
    fn test_find_nearest_enemy_building() {
        let mut eco = Economy::new();
        eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 0; b.hp = 100; b.active = true; eco.buildings.push(b);
        let mut b2 = crate::economy::Building::new(BuildingType::Storehouse, 8, 5);
        b2.owner_id = 1; b2.hp = 200; b2.active = true; eco.buildings.push(b2);
        assert_eq!(CombatAI::new().find_nearest_enemy_building(&eco, 1), Some(0));
    }

    #[test]
    fn test_find_nearest_enemy_building_ignores_same_faction() {
        let mut eco = Economy::new();
        eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 1; b.hp = 100; b.active = true; eco.buildings.push(b);
        assert_eq!(CombatAI::new().find_nearest_enemy_building(&eco, 1), None);
    }

    #[test]
    fn test_find_nearest_enemy_building_ignores_inactive() {
        let mut eco = Economy::new();
        eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 0; b.active = false; b.hp = 100; eco.buildings.push(b);
        assert_eq!(CombatAI::new().find_nearest_enemy_building(&eco, 1), None);
    }

    #[test]
    fn test_attack_building_deals_damage() {
        let mut eco = Economy::new();
        let id1 = eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 0; b.hp = 100; b.active = true; eco.buildings.push(b);
        eco.units.get_mut(id1).unwrap().target = Some(encode_building_target(0));
        eco.units.get_mut(id1).unwrap().state = UnitState::Fighting;
        CombatAI::new().try_attack_building(&mut eco, id1);
        assert_eq!(eco.buildings[0].hp, 85);
    }

    #[test]
    fn test_attack_building_destroys_when_hp_zero() {
        let mut eco = Economy::new();
        let id1 = eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 0; b.hp = 15; b.active = true; eco.buildings.push(b);
        eco.units.get_mut(id1).unwrap().target = Some(encode_building_target(0));
        eco.units.get_mut(id1).unwrap().state = UnitState::Fighting;
        CombatAI::new().try_attack_building(&mut eco, id1);
        assert_eq!(eco.buildings[0].hp, 0);
        assert!(!eco.buildings[0].active);
    }

    #[test]
    fn test_combat_attack_buildings_seeks_target() {
        let map = Map::new(20, 20);
        let mut eco = Economy::new();
        let id1 = eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 0; b.hp = 100; b.active = true; eco.buildings.push(b);
        CombatAI::new().attack_buildings(&mut eco, &map, 0.016);
        let u1 = eco.units.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Fighting);
        assert!(u1.target.is_some() && is_building_target(u1.target.unwrap()));
    }

    #[test]
    fn test_combat_attack_buildings_ignores_passive() {
        let map = Map::new(20, 20);
        let mut eco = Economy::new();
        let id1 = eco.units.spawn(UnitKind::Swordsman, 5.5, 5.5);
        eco.units.get_mut(id1).unwrap().stance = UnitStance::Passive;
        let mut b = crate::economy::Building::new(BuildingType::Farm, 6, 5);
        b.owner_id = 0; b.hp = 100; b.active = true; eco.buildings.push(b);
        CombatAI::new().attack_buildings(&mut eco, &map, 0.016);
        assert_eq!(eco.units.get(id1).unwrap().state, UnitState::Idle);
    }

    #[test]
    fn test_encode_decode_building_target() {
        let e = encode_building_target(42);
        assert!(is_building_target(e));
        assert_eq!(decode_building_index(e), 42);
    }

    #[test]
    fn test_sentinel_does_not_collide() {
        assert!(encode_building_target(0) > 100_000);
    }
}
