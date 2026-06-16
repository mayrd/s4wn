//! S4WN Pathfinding Module
//!
//! Phase 2 — Game Logic: A* pathfinding on the tile grid.
//!
//! ## Design
//!
//! Pathfinding operates on the tile grid. Each tile has a movement cost
//! based on terrain type. Impassable tiles (water, mountains) are excluded.
//!
//! Uses A* with a binary heap for the open set. The heuristic is octile
//! distance (appropriate for 4-directional movement with diagonal cost).
//!
//! ## Usage
//!
//! ```ignore
//! let map = Map::generate_demo(64, 64);
//! let path = Pathfinder::find_path(&map, (0, 0), (10, 10));
//! ```

use crate::map::Map;

/// A computed path from start to goal.
#[derive(Debug, Clone)]
pub struct Path {
    /// Ordered list of tile coordinates from start to goal.
    tiles: Vec<(usize, usize)>,
    /// Total movement cost of the path.
    pub cost: f32,
}

impl Path {
    /// Create a new path from a list of tiles.
    pub fn new(tiles: Vec<(usize, usize)>) -> Self {
        Path { tiles, cost: 0.0 }
    }

    /// Create a path with a known cost.
    pub fn with_cost(tiles: Vec<(usize, usize)>, cost: f32) -> Self {
        Path { tiles, cost }
    }

    /// Get the tiles in the path.
    pub fn tiles(&self) -> &[(usize, usize)] {
        &self.tiles
    }

    /// Whether the path is empty.
    pub fn is_empty(&self) -> bool {
        self.tiles.is_empty()
    }

    /// Number of tiles in the path.
    pub fn len(&self) -> usize {
        self.tiles.len()
    }

    /// Get the start tile.
    pub fn start(&self) -> Option<(usize, usize)> {
        self.tiles.first().copied()
    }

    /// Get the goal tile.
    pub fn goal(&self) -> Option<(usize, usize)> {
        self.tiles.last().copied()
    }
}

/// A* pathfinder on the tile grid.
pub struct Pathfinder;

impl Pathfinder {
    /// Find a path from `start` to `goal` on the given map.
    /// Returns `Some(Path)` if a path exists, `None` otherwise.
    pub fn find_path(map: &Map, start: (usize, usize), goal: (usize, usize)) -> Option<Path> {
        // Validate start and goal
        if map
            .get(start.0, start.1)
            .map_or(true, |t| !t.terrain.is_passable())
        {
            return None;
        }
        if map
            .get(goal.0, goal.1)
            .map_or(true, |t| !t.terrain.is_passable())
        {
            return None;
        }

        // Same tile → trivial path
        if start == goal {
            return Some(Path::new(vec![start]));
        }

        let w = map.width;
        let h = map.height;

        // Use flat arrays for performance
        let node_count = w * h;
        let mut g_score = vec![f32::INFINITY; node_count];
        let mut f_score = vec![f32::INFINITY; node_count];
        let mut came_from = vec![None; node_count]; // stores parent index
        let mut closed = vec![false; node_count];

        let start_idx = start.1 * w + start.0;
        let goal_idx = goal.1 * w + goal.0;

        g_score[start_idx] = 0.0;
        f_score[start_idx] = Self::heuristic(start, goal);

        // Simple priority queue using a Vec (min-heap would be faster for large maps,
        // but for Settlers-sized maps this is fine)
        let mut open_set: Vec<usize> = vec![start_idx];

        while let Some(current_idx) = Self::pop_lowest_f(&open_set, &f_score, &closed) {
            if current_idx == goal_idx {
                // Reconstruct path
                let path = Self::reconstruct_path(&came_from, current_idx, w);
                let cost = g_score[goal_idx];
                return Some(Path::with_cost(path, cost));
            }

            closed[current_idx] = true;
            open_set.retain(|&x| x != current_idx);

            let cx = current_idx % w;
            let cy = current_idx / w;

            // 4-directional neighbors
            const DIRS: [(i32, i32); 4] = [(0, -1), (1, 0), (0, 1), (-1, 0)];

            for &(dx, dy) in &DIRS {
                let nx = cx as i32 + dx;
                let ny = cy as i32 + dy;

                if nx < 0 || ny < 0 || nx as usize >= w || ny as usize >= h {
                    continue;
                }

                let nx = nx as usize;
                let ny = ny as usize;
                let neighbor_idx = ny * w + nx;

                if closed[neighbor_idx] {
                    continue;
                }

                // Check passability
                let tile = match map.get(nx, ny) {
                    Some(t) => t,
                    None => continue,
                };

                if !tile.terrain.is_passable() {
                    continue;
                }

                // Movement cost: base 1.0 * speed_multiplier (lower = faster)
                // We use 1.0 / speed as cost so faster terrain = lower cost
                let speed = tile.terrain.speed_multiplier();
                let move_cost = if speed > 0.0 {
                    1.0 / speed
                } else {
                    f32::INFINITY
                };

                let tentative_g = g_score[current_idx] + move_cost;

                if tentative_g < g_score[neighbor_idx] {
                    came_from[neighbor_idx] = Some(current_idx);
                    g_score[neighbor_idx] = tentative_g;
                    f_score[neighbor_idx] = tentative_g + Self::heuristic((nx, ny), goal);

                    if !open_set.contains(&neighbor_idx) {
                        open_set.push(neighbor_idx);
                    }
                }
            }
        }

        None // no path found
    }

    /// Octile distance heuristic (admissible for 4-directional movement).
    fn heuristic(a: (usize, usize), b: (usize, usize)) -> f32 {
        let dx = (a.0 as f32 - b.0 as f32).abs();
        let dy = (a.1 as f32 - b.1 as f32).abs();
        // For 4-directional: Manhattan distance
        dx + dy
    }

    /// Pop the node with the lowest f-score from the open set.
    fn pop_lowest_f(open_set: &[usize], f_score: &[f32], closed: &[bool]) -> Option<usize> {
        let mut best_idx = None;
        let mut best_f = f32::INFINITY;

        for &idx in open_set {
            if closed[idx] {
                continue;
            }
            if f_score[idx] < best_f {
                best_f = f_score[idx];
                best_idx = Some(idx);
            }
        }

        best_idx
    }

    /// Reconstruct path from came_from array.
    fn reconstruct_path(
        came_from: &[Option<usize>],
        mut current: usize,
        width: usize,
    ) -> Vec<(usize, usize)> {
        let mut path = vec![(current % width, current / width)];
        while let Some(parent) = came_from[current] {
            current = parent;
            path.push((current % width, current / width));
        }
        path.reverse();
        path
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_new() {
        let p = Path::new(vec![(0, 0), (1, 0), (2, 0)]);
        assert_eq!(p.len(), 3);
        assert!(!p.is_empty());
        assert_eq!(p.start(), Some((0, 0)));
        assert_eq!(p.goal(), Some((2, 0)));
    }

    #[test]
    fn test_path_empty() {
        let p = Path::new(vec![]);
        assert!(p.is_empty());
        assert_eq!(p.start(), None);
    }

    #[test]
    fn test_find_path_same_tile() {
        let map = Map::new(10, 10);
        let path = Pathfinder::find_path(&map, (5, 5), (5, 5));
        assert!(path.is_some());
        let p = path.unwrap();
        assert_eq!(p.len(), 1);
        assert_eq!(p.start(), Some((5, 5)));
    }

    #[test]
    fn test_find_path_straight_line() {
        let map = Map::new(10, 10);
        let path = Pathfinder::find_path(&map, (0, 0), (5, 0));
        assert!(path.is_some());
        let p = path.unwrap();
        assert!(p.len() > 1);
        assert_eq!(p.start(), Some((0, 0)));
        assert_eq!(p.goal(), Some((5, 0)));
        // Path should be roughly 6 tiles long (start + 5 steps)
        assert!(p.len() <= 7, "Path too long: {}", p.len());
    }

    #[test]
    fn test_find_path_with_obstacle() {
        let mut map = Map::new(10, 10);
        // Block direct path with water
        for y in 0..10 {
            map.get_mut(3, y).unwrap().terrain = crate::map::Terrain::Water;
        }
        // But leave a gap
        map.get_mut(3, 5).unwrap().terrain = crate::map::Terrain::Grass;

        let path = Pathfinder::find_path(&map, (0, 5), (6, 5));
        assert!(path.is_some(), "Should find path around obstacle");
        let p = path.unwrap();
        assert_eq!(p.start(), Some((0, 5)));
        assert_eq!(p.goal(), Some((6, 5)));
    }

    #[test]
    fn test_find_path_blocked() {
        let mut map = Map::new(10, 10);
        // Completely block with water
        for y in 0..10 {
            map.get_mut(3, y).unwrap().terrain = crate::map::Terrain::Water;
        }

        let path = Pathfinder::find_path(&map, (0, 5), (6, 5));
        assert!(path.is_none(), "Should not find path through wall");
    }

    #[test]
    fn test_find_path_impassable_start() {
        let mut map = Map::new(10, 10);
        map.get_mut(0, 0).unwrap().terrain = crate::map::Terrain::Water;
        let path = Pathfinder::find_path(&map, (0, 0), (5, 5));
        assert!(path.is_none());
    }

    #[test]
    fn test_find_path_impassable_goal() {
        let mut map = Map::new(10, 10);
        map.get_mut(5, 5).unwrap().terrain = crate::map::Terrain::Water;
        let path = Pathfinder::find_path(&map, (0, 0), (5, 5));
        assert!(path.is_none());
    }

    #[test]
    fn test_find_path_demo_map() {
        let map = Map::generate_demo(32, 32);
        // Try to find a path from top-left to bottom-right
        let path = Pathfinder::find_path(&map, (0, 0), (31, 31));
        // May or may not find a path depending on terrain generation
        if let Some(p) = path {
            assert!(p.len() > 1);
            assert_eq!(p.start(), Some((0, 0)));
            assert_eq!(p.goal(), Some((31, 31)));
            // All tiles in path should be passable
            for &(x, y) in p.tiles() {
                assert!(
                    map.get(x, y).unwrap().terrain.is_passable(),
                    "Path tile ({},{}) is not passable",
                    x,
                    y
                );
            }
        }
    }

    #[test]
    fn test_find_path_cost() {
        let map = Map::new(10, 10);
        let path = Pathfinder::find_path(&map, (0, 0), (5, 0));
        assert!(path.is_some());
        let p = path.unwrap();
        assert!(p.cost > 0.0, "Path cost should be positive");
        // 5 steps on grass (speed=1.0, cost=1.0 each) = ~5.0
        assert!(p.cost <= 6.0, "Path cost should be ~5.0, got {}", p.cost);
    }

    #[test]
    fn test_find_path_terrain_cost() {
        let mut map = Map::new(10, 10);
        // Make a desert detour path
        for x in 1..5 {
            map.get_mut(x, 0).unwrap().terrain = crate::map::Terrain::Desert;
        }

        let path = Pathfinder::find_path(&map, (0, 0), (5, 0));
        assert!(path.is_some());
        // Desert has speed 0.8, so cost per tile = 1.0/0.8 = 1.25
        let p = path.unwrap();
        assert!(
            p.cost > 5.0,
            "Desert path should cost more than 5.0, got {}",
            p.cost
        );
    }
}
