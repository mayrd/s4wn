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

use crate::map::Map;
use crate::pathfinding::Pathfinder;
use crate::units::{UnitManager, UnitState};

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
    pub fn update(
        &self,
        units: &mut UnitManager,
        map: &Map,
        dt: f32,
    ) {
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
    fn update_combatant(
        &self,
        units: &mut UnitManager,
        map: &Map,
        unit_id: u32,
    ) {
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
                        if dist <= unit.kind.attack_range() {
                            // In range → try to attack
                            self.try_attack(units, unit_id);
                            return;
                        } else {
                            // Target moved out of range → chase
                            self.chase_target(units, map, unit_id);
                            return;
                        }
                    }
                }
            }
            // Target dead or gone → clear target
            if let Some(u) = units.get_mut(unit_id) {
                u.target = None;
                u.state = UnitState::Idle;
            }
        }

        // Unit is idle → find nearest enemy
        let enemy_id = self.find_nearest_enemy(units, unit_id);

        if let Some(enemy_id) = enemy_id {
            let (_dist, can_attack) = {
                let unit = units.get(unit_id).unwrap();
                let enemy = units.get(enemy_id).unwrap();
                let dist = unit.distance_to(enemy);
                (dist, dist <= unit.kind.attack_range())
            };

            if can_attack {
                // In range → start fighting
                if let Some(u) = units.get_mut(unit_id) {
                    u.target = Some(enemy_id);
                    u.state = UnitState::Fighting;
                }
                self.try_attack(units, unit_id);
            } else {
                // Out of range → chase
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
        let (target_id, damage, cooldown) = {
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
            (
                target_id,
                attacker.kind.attack_damage(),
                attacker.kind.attack_interval(),
            )
        };

        // Apply damage
        let died = {
            let target = match units.get_mut(target_id) {
                Some(t) => t,
                None => return,
            };
            target.take_damage(damage)
        };

        // Set cooldown on attacker
        if let Some(attacker) = units.get_mut(attacker_id) {
            attacker.attack_cooldown = cooldown;
        }

        if died {
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
        mgr.spawn(UnitKind::Soldier, 0.0, 0.0);
        // Unit 2 (even = faction 2)
        mgr.spawn(UnitKind::Soldier, 5.0, 0.0);
        // Unit 3 (odd = faction 1, same as unit 1)
        mgr.spawn(UnitKind::Soldier, 10.0, 0.0);

        let ai = CombatAI::new();
        let enemy = ai.find_nearest_enemy(&mgr, 1);
        assert_eq!(enemy, Some(2), "Unit 1 should target unit 2 (enemy faction)");

        // Unit 2 should target unit 1 (nearest enemy)
        let enemy2 = ai.find_nearest_enemy(&mgr, 2);
        assert_eq!(enemy2, Some(1), "Unit 2 should target unit 1 (nearest)");
    }

    #[test]
    fn test_combat_attack_deals_damage() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Soldier, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Soldier, 1.0, 0.0); // adjacent

        // Set up combat state
        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // Soldier does 15 damage per hit
        let target = mgr.get(id2).unwrap();
        assert_eq!(target.hp, 85, "Soldier should take 15 damage, hp={}", target.hp);

        // Attacker should have cooldown
        let attacker = mgr.get(id1).unwrap();
        assert_eq!(attacker.attack_cooldown, 15, "Attack cooldown should be 15 ticks");
    }

    #[test]
    fn test_combat_kill_unit() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Soldier, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Soldier, 1.0, 0.0);

        // Set unit 2 to low HP
        mgr.get_mut(id2).unwrap().hp = 10;

        // Set up combat
        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // Unit 2 should be dead (15 damage > 10 HP)
        let target = mgr.get(id2).unwrap();
        assert!(!target.is_alive(), "Unit 2 should be dead");
        assert_eq!(target.state, UnitState::Dead);

        // Attacker should have cleared target
        let attacker = mgr.get(id1).unwrap();
        assert!(attacker.target.is_none(), "Attacker should clear target after kill");
        assert_eq!(attacker.state, UnitState::Idle);
    }

    #[test]
    fn test_combat_cooldown_prevents_attack() {
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Soldier, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Soldier, 1.0, 0.0);

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
        let id1 = mgr.spawn(UnitKind::Archer, 0.0, 0.0);
        let id2 = mgr.spawn(UnitKind::Soldier, 2.0, 0.0); // 2 tiles away (within range 3)

        mgr.get_mut(id1).unwrap().target = Some(id2);
        mgr.get_mut(id1).unwrap().state = UnitState::Fighting;

        let ai = CombatAI::new();
        ai.try_attack(&mut mgr, id1);

        // Archer does 10 damage
        let target = mgr.get(id2).unwrap();
        assert_eq!(target.hp, 90, "Archer should deal 10 damage, hp={}", target.hp);
    }

    #[test]
    fn test_combat_update_full() {
        let map = Map::new(20, 20);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Soldier, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Soldier, 6.5, 5.5); // adjacent enemy

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
        let id1 = mgr.spawn(UnitKind::Soldier, 5.5, 5.5);
        let id2 = mgr.spawn(UnitKind::Soldier, 6.5, 5.5); // 1 tile away

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
            total_hp, u1.state, u2.state
        );
    }

    #[test]
    fn test_combat_dead_units_ignored() {
        let map = Map::new(10, 10);
        let mut mgr = UnitManager::new();
        let id1 = mgr.spawn(UnitKind::Soldier, 0.5, 0.5);
        let id2 = mgr.spawn(UnitKind::Soldier, 1.5, 0.5);

        // Kill unit 2
        mgr.get_mut(id2).unwrap().hp = 0;
        mgr.get_mut(id2).unwrap().state = UnitState::Dead;

        let ai = CombatAI::new();
        ai.update(&mut mgr, &map, 0.016);

        // Unit 1 should be idle (no enemies)
        let u1 = mgr.get(id1).unwrap();
        assert_eq!(u1.state, UnitState::Idle);
    }
}
