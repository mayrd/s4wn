//! S4WN Map Module
//!
//! Defines the tile-based world map for the Settlers IV web-native engine.
//! Supports multiple terrain types, elevation, and procedural generation
//! with coherent biomes (grasslands, forests, mountains, water).

/// Terrain types matching Siedler 4's visual palette
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Terrain {
    /// Fertile grassland — buildable, green
    Grass = 0,
    /// Darker grass with trees — impassable for most units
    Forest = 1,
    /// Rocky terrain — unbuildable, brown/grey
    Mountain = 2,
    /// Shallow water — impassable unless bridged
    Water = 3,
    /// Deep water — completely impassable
    DeepWater = 4,
    /// Sandy terrain — buildable, slower movement
    Desert = 5,
    /// Swampy ground — unbuildable, slow movement
    Swamp = 6,
    /// Snow-capped — high elevation
    Snow = 7,
}

impl Terrain {
    /// Whether buildings can be placed on this terrain
    pub fn is_buildable(self) -> bool {
        matches!(self, Terrain::Grass | Terrain::Desert | Terrain::Forest)
    }

    /// Whether units can walk on this terrain
    pub fn is_passable(self) -> bool {
        !matches!(
            self,
            Terrain::Water | Terrain::DeepWater | Terrain::Mountain
        )
    }

    /// Movement speed multiplier (0.0 = impassable, 1.0 = normal)
    pub fn speed_multiplier(self) -> f32 {
        match self {
            Terrain::Grass => 1.0,
            Terrain::Forest => 0.6,
            Terrain::Mountain => 0.0,
            Terrain::Water => 0.0,
            Terrain::DeepWater => 0.0,
            Terrain::Desert => 0.8,
            Terrain::Swamp => 0.4,
            Terrain::Snow => 0.7,
        }
    }

    /// Base color (RGB) for the terrain tile
    pub fn color(self) -> [f32; 3] {
        match self {
            Terrain::Grass => [0.25, 0.60, 0.25],
            Terrain::Forest => [0.15, 0.45, 0.15],
            Terrain::Mountain => [0.55, 0.50, 0.45],
            Terrain::Water => [0.15, 0.35, 0.70],
            Terrain::DeepWater => [0.08, 0.20, 0.50],
            Terrain::Desert => [0.85, 0.75, 0.40],
            Terrain::Swamp => [0.30, 0.40, 0.25],
            Terrain::Snow => [0.90, 0.92, 0.95],
        }
    }
}

/// A single tile on the game map
#[derive(Debug, Clone)]
pub struct Tile {
    pub terrain: Terrain,
    /// Elevation in tile units (0.0 = sea level)
    pub elevation: f32,
    /// Optional resource deposit on this tile
    pub resource: Option<Resource>,
    /// Fog of war visibility: 0.0 = hidden (unexplored), 1.0 = fully visible
    pub visibility: f32,
}

/// Natural resources that can be harvested
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Resource {
    Iron,
    Coal,
    Gold,
    Stone,
    Sulfur,
    Fish,  // only on coast tiles
    Game,  // only in forest tiles
    Grain, // only on grass
}

/// The game world map — a 2D grid of tiles
#[derive(Clone)]
pub struct Map {
    pub width: usize,
    pub height: usize,
    tiles: Vec<Tile>,
}

impl Map {
    /// Create a new map filled with grass at sea level
    pub fn new(width: usize, height: usize) -> Self {
        let tiles = vec![
            Tile {
                terrain: Terrain::Grass,
                elevation: 0.0,
                resource: None,
                visibility: 0.0,
            };
            width * height
        ];
        Map {
            width,
            height,
            tiles,
        }
    }

    /// Number of tiles in the map (width × height). Public for consistency checks.
    pub fn tiles_len(&self) -> usize {
        self.tiles.len()
    }

    /// Get tile at (x, y). Returns None if out of bounds.
    pub fn get(&self, x: usize, y: usize) -> Option<&Tile> {
        if x < self.width && y < self.height {
            Some(&self.tiles[y * self.width + x])
        } else {
            None
        }
    }

    /// Get mutable tile at (x, y). Returns None if out of bounds.
    pub fn get_mut(&mut self, x: usize, y: usize) -> Option<&mut Tile> {
        if x < self.width && y < self.height {
            Some(&mut self.tiles[y * self.width + x])
        } else {
            None
        }
    }

    /// Generate a demo map using simple noise + rules for Settlers-style biomes.
    ///
    /// Strategy:
    /// 1. Generate a heightmap using layered sine waves (pseudo-Perlin)
    /// 2. Map height ranges to terrain types
    /// 3. Apply biome rules (coastal water, mountain peaks, forest patches)
    /// 4. Place resources probabilistically based on terrain
    pub fn generate_demo(width: usize, height: usize) -> Self {
        let mut map = Map::new(width, height);
        let seed = 42u64;

        // Phase 1: Generate elevation heightmap
        for y in 0..height {
            for x in 0..width {
                let nx = x as f32 / width as f32;
                let ny = y as f32 / height as f32;

                // Simple layered noise
                let h = layered_noise(nx, ny, seed);

                map.get_mut(x, y).unwrap().elevation = h;
            }
        }

        // Phase 2: Assign terrain based on elevation
        for y in 0..height {
            for x in 0..width {
                let elev = map.get(x, y).unwrap().elevation;

                let terrain = if elev < -0.15 {
                    Terrain::DeepWater
                } else if elev < 0.0 {
                    Terrain::Water
                } else if elev < 0.05 {
                    // Coastal strip — mix of grass and desert
                    let nx = x as f32 / width as f32;
                    let ny = y as f32 / height as f32;
                    if simplex(nx * 5.0, ny * 5.0, seed) > 0.3 {
                        Terrain::Desert
                    } else {
                        Terrain::Grass
                    }
                } else if elev < 0.4 {
                    // Main habitable zone — grass with forest patches
                    let nx = x as f32 / width as f32;
                    let ny = y as f32 / height as f32;
                    let detail = simplex(nx * 8.0, ny * 8.0, seed + 1);
                    if detail > 0.55 {
                        Terrain::Forest
                    } else if detail < -0.55 {
                        Terrain::Swamp
                    } else {
                        Terrain::Grass
                    }
                } else if elev < 0.65 {
                    Terrain::Mountain
                } else {
                    Terrain::Snow
                };

                map.get_mut(x, y).unwrap().terrain = terrain;
            }
        }

        // Phase 3: Place resources
        map.place_resources(seed + 100);

        map
    }

    /// Place resources on appropriate terrain tiles
    fn place_resources(&mut self, seed: u64) {
        for y in 0..self.height {
            for x in 0..self.width {
                let tile = self.get(x, y).unwrap();
                let nx = x as f32 / self.width as f32;
                let ny = y as f32 / self.height as f32;
                let rng = simplex(nx * 13.7, ny * 13.7, seed);

                // Only ~8-12% of tiles get resources
                if rng > 0.35 && rng < 0.47 {
                    let resource = match tile.terrain {
                        Terrain::Grass => {
                            if rng > 0.43 {
                                Resource::Grain
                            } else if rng > 0.40 {
                                Resource::Stone
                            } else {
                                Resource::Coal
                            }
                        }
                        Terrain::Forest => {
                            if rng > 0.43 {
                                Resource::Game
                            } else {
                                Resource::Iron
                            }
                        }
                        Terrain::Mountain => {
                            if rng > 0.43 {
                                Resource::Gold
                            } else if rng > 0.40 {
                                Resource::Stone
                            } else {
                                Resource::Iron
                            }
                        }
                        Terrain::Desert => Resource::Sulfur,
                        Terrain::Swamp => Resource::Coal,
                        Terrain::Snow => Resource::Stone,
                        _ => continue, // water gets fish near coasts
                    };
                    self.get_mut(x, y).unwrap().resource = Some(resource);
                }
            }
        }

        // Place fish near coastal water
        for y in 0..self.height {
            for x in 0..self.width {
                if self.get(x, y).unwrap().terrain != Terrain::Water {
                    continue;
                }
                // Check if adjacent to land
                let has_land_neighbor = neighbors(x as i32, y as i32, self.width, self.height)
                    .iter()
                    .any(|&(nx, ny)| {
                        self.get(nx, ny)
                            .map(|t| t.terrain.is_buildable())
                            .unwrap_or(false)
                    });

                if has_land_neighbor {
                    let nx = x as f32 / self.width as f32;
                    let ny = y as f32 / self.height as f32;
                    if simplex(nx * 20.0, ny * 20.0, seed + 5) > 0.5 {
                        self.get_mut(x, y).unwrap().resource = Some(Resource::Fish);
                    }
                }
            }
        }
    }

    /// Iterator over all tile coordinates
    pub fn coordinates(&self) -> impl Iterator<Item = (usize, usize)> {
        let w = self.width;
        let h = self.height;
        (0..h).flat_map(move |y| (0..w).map(move |x| (x, y)))
    }

    /// Get the visibility value at a tile (0.0 = hidden, 1.0 = visible).
    pub fn get_visibility(&self, x: usize, y: usize) -> f32 {
        if x < self.width && y < self.height {
            self.tiles[y * self.width + x].visibility
        } else {
            0.0
        }
    }

    /// Compute fog-of-war visibility from a list of sight sources.
    /// Each source is (x, y, radius). Buildings and units provide sight.
    /// Visibility decays linearly from 1.0 at center to 0.0 at radius edge.
    /// Already-visible tiles remain visible (visibility is cumulative/or'd).
    pub fn compute_visibility(&mut self, sources: &[(f32, f32, f32)]) {
        // Reset all visibility to 0
        for tile in self.tiles.iter_mut() {
            tile.visibility = 0.0;
        }
        // For each source, mark tiles within radius as visible
        for &(sx, sy, radius) in sources {
            let r2 = radius * radius;
            let min_x = (sx - radius).floor().max(0.0) as usize;
            let max_x = ((sx + radius).ceil() as usize).min(self.width - 1);
            let min_y = (sy - radius).floor().max(0.0) as usize;
            let max_y = ((sy + radius).ceil() as usize).min(self.height - 1);
            for y in min_y..=max_y {
                for x in min_x..=max_x {
                    let dx = x as f32 + 0.5 - sx;
                    let dy = y as f32 + 0.5 - sy;
                    let dist2 = dx * dx + dy * dy;
                    if dist2 <= r2 {
                        let dist = dist2.sqrt();
                        let v = 1.0 - (dist / radius).clamp(0.0, 1.0);
                        let idx = y * self.width + x;
                        // Take max visibility from any source
                        if v > self.tiles[idx].visibility {
                            self.tiles[idx].visibility = v;
                        }
                    }
                }
            }
        }
    }

    /// Compute visibility from buildings and units.
    /// Buildings: Castle=5, GuardTower=7, Fortress=10, Storehouse=3, others=2
    /// Units: Settler=3, Swordsman=4, Bowman=4
    pub fn compute_visibility_from_entities(
        &mut self,
        buildings: &[(crate::economy::BuildingType, usize, usize)],
        units: &[(crate::units::UnitKind, f32, f32)],
    ) {
        let mut sources: Vec<(f32, f32, f32)> = Vec::new();
        for &(ref kind, bx, by) in buildings {
            let radius = match *kind {
                crate::economy::BuildingType::Castle => 5.0,
                crate::economy::BuildingType::GuardTower => 7.0,
                crate::economy::BuildingType::Fortress => 10.0,
                crate::economy::BuildingType::Storehouse => 3.0,
                _ => 2.0,
            };
            sources.push((bx as f32 + 0.5, by as f32 + 0.5, radius));
        }
        for &(ref kind, ux, uy) in units {
            let radius = match *kind {
                crate::units::UnitKind::Settler => 3.0,
                crate::units::UnitKind::Swordsman => 4.0,
                crate::units::UnitKind::Bowman => 4.0,
            };
            sources.push((ux, uy, radius));
        }
        self.compute_visibility(&sources);
    }

    /// Serialize the map to a JSON string for export/sharing.
    /// Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":null},...]}
    /// t = terrain type (u8), e = elevation (f32), r = resource (string or null)
    pub fn to_json(&self) -> String {
        let mut tiles = Vec::with_capacity(self.width * self.height);
        for y in 0..self.height {
            for x in 0..self.width {
                let tile = self.get(x, y).unwrap();
                let terrain = tile.terrain as u8;
                let elev = tile.elevation;
                let resource = match tile.resource {
                    Some(Resource::Iron) => "\"Iron\"",
                    Some(Resource::Coal) => "\"Coal\"",
                    Some(Resource::Gold) => "\"Gold\"",
                    Some(Resource::Stone) => "\"Stone\"",
                    Some(Resource::Sulfur) => "\"Sulfur\"",
                    Some(Resource::Fish) => "\"Fish\"",
                    Some(Resource::Game) => "\"Game\"",
                    Some(Resource::Grain) => "\"Grain\"",
                    None => "null",
                };
                tiles.push(format!(
                    "{{\"t\":{},\"e\":{:.3},\"r\":{}}}",
                    terrain, elev, resource
                ));
            }
        }
        format!(
            "{{\"width\":{},\"height\":{},\"tiles\":[{}]}}",
            self.width,
            self.height,
            tiles.join(",")
        )
    }
}

/// Get valid neighbor coordinates (4-directional)
fn neighbors(x: i32, y: i32, w: usize, h: usize) -> Vec<(usize, usize)> {
    [(0, -1), (1, 0), (0, 1), (-1, 0)]
        .iter()
        .filter_map(|(dx, dy)| {
            let nx = x + dx;
            let ny = y + dy;
            if nx >= 0 && ny >= 0 && (nx as usize) < w && (ny as usize) < h {
                Some((nx as usize, ny as usize))
            } else {
                None
            }
        })
        .collect()
}

// ── Simple noise functions ──────────────────────────────────────────────────

/// Layered sine-wave noise (pseudo-value noise)
fn layered_noise(nx: f32, ny: f32, seed: u64) -> f32 {
    let s = seed as f32 * 0.001;
    let mut value = 0.0;
    let mut amplitude = 1.0;
    let mut frequency = 1.0;
    let mut max_value = 0.0;

    for i in 0..4 {
        let v = simplex(
            nx * frequency + s * (i + 1) as f32,
            ny * frequency + s * (i + 2) as f32,
            seed,
        );
        value += v * amplitude;
        max_value += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
    }

    value / max_value
}

/// Fast simplex-like 2D noise using dot products and sine
fn simplex(x: f32, y: f32, seed: u64) -> f32 {
    let s = seed as f32 * 0.1;
    let skew = 0.3660254; // (sqrt(3)-1)/2

    let sx = x + (x + y) * skew + s;
    let sy = y + (x + y) * skew + s;

    let v = sx.sin() * 43758.5453;
    let w = sy.cos() * 78901.2345;

    ((v + w) * 0.5).sin().abs() * 2.0 - 1.0
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_creation() {
        let map = Map::new(10, 10);
        assert_eq!(map.width, 10);
        assert_eq!(map.height, 10);
        assert!(map.get(0, 0).is_some());
        assert!(map.get(10, 10).is_none());
        assert_eq!(map.get(0, 0).unwrap().terrain, Terrain::Grass);
    }

    #[test]
    fn test_map_get_mut() {
        let mut map = Map::new(5, 5);
        map.get_mut(2, 3).unwrap().terrain = Terrain::Water;
        assert_eq!(map.get(2, 3).unwrap().terrain, Terrain::Water);
    }

    #[test]
    fn test_generate_demo() {
        let map = Map::generate_demo(32, 32);
        assert_eq!(map.width, 32);
        assert_eq!(map.height, 32);

        // Should have varied terrain
        let mut terrain_types = std::collections::HashSet::new();
        for (x, y) in map.coordinates() {
            terrain_types.insert(map.get(x, y).unwrap().terrain as u8);
        }
        assert!(
            terrain_types.len() >= 5,
            "Expected at least 5 terrain types, got {}",
            terrain_types.len()
        );
    }

    #[test]
    fn test_terrain_properties() {
        assert!(Terrain::Grass.is_buildable());
        assert!(!Terrain::Water.is_buildable());
        assert!(Terrain::Grass.is_passable());
        assert!(!Terrain::Mountain.is_passable());
        assert!((Terrain::Grass.speed_multiplier() - 1.0).abs() < 0.01);
        assert!((Terrain::Swamp.speed_multiplier() - 0.4).abs() < 0.01);
    }

    #[test]
    fn test_terrain_colors() {
        // All terrains must return valid RGB
        for t in &[
            Terrain::Grass,
            Terrain::Forest,
            Terrain::Mountain,
            Terrain::Water,
            Terrain::DeepWater,
            Terrain::Desert,
            Terrain::Swamp,
            Terrain::Snow,
        ] {
            let c = t.color();
            assert!(c[0] >= 0.0 && c[0] <= 1.0);
            assert!(c[1] >= 0.0 && c[1] <= 1.0);
            assert!(c[2] >= 0.0 && c[2] <= 1.0);
        }
    }

    #[test]
    fn test_neighbors() {
        let n = neighbors(1, 1, 5, 5);
        assert_eq!(n.len(), 4);

        let corner = neighbors(0, 0, 5, 5);
        assert_eq!(corner.len(), 2); // only right and down
    }

    // ── Fog of War Tests ──────────────────────────────────────────────────────

    #[test]
    fn test_fog_initial_visibility_zero() {
        let map = Map::new(10, 10);
        for (x, y) in map.coordinates() {
            assert_eq!(map.get_visibility(x, y), 0.0);
        }
    }

    #[test]
    fn test_fog_single_source_center() {
        let mut map = Map::new(20, 20);
        // Single source at (10, 10) with radius 5
        map.compute_visibility(&[(10.5, 10.5, 5.0)]);

        // Center should be fully visible
        assert!(map.get_visibility(10, 10) > 0.9);

        // Tile within radius should have some visibility
        assert!(map.get_visibility(14, 10) > 0.0);

        // Tile far outside radius should be hidden
        assert_eq!(map.get_visibility(0, 0), 0.0);
    }

    #[test]
    fn test_fog_outside_sight_radius() {
        let mut map = Map::new(30, 30);
        map.compute_visibility(&[(15.5, 15.5, 3.0)]);

        // Tile 5 tiles away should be hidden
        assert_eq!(map.get_visibility(15, 10), 0.0);
        assert_eq!(map.get_visibility(10, 15), 0.0);

        // Tile 2 tiles away should be visible
        assert!(map.get_visibility(15, 13) > 0.0);
    }

    #[test]
    fn test_fog_inside_sight_radius() {
        let mut map = Map::new(20, 20);
        map.compute_visibility(&[(10.5, 10.5, 5.0)]);

        // All tiles well within radius should have visibility > 0
        for y in 7..=13 {
            for x in 7..=13 {
                let dx = x as f32 + 0.5 - 10.5;
                let dy = y as f32 + 0.5 - 10.5;
                let dist = (dx * dx + dy * dy).sqrt();
                if dist < 4.5 {
                    assert!(
                        map.get_visibility(x, y) > 0.0,
                        "Tile ({},{}) at dist {} should be visible",
                        x,
                        y,
                        dist
                    );
                }
            }
        }
    }

    #[test]
    fn test_fog_linear_decay() {
        let mut map = Map::new(30, 30);
        // Source at center, radius 10
        map.compute_visibility(&[(15.5, 15.5, 10.0)]);

        // Visibility should decrease with distance
        let v_center = map.get_visibility(15, 15);
        let v_mid = map.get_visibility(15, 10); // ~5 tiles away
        let v_edge = map.get_visibility(15, 6); // ~9 tiles away

        assert!(v_center > v_mid, "center should be brighter than mid");
        assert!(v_mid > v_edge, "mid should be brighter than edge");
    }

    #[test]
    fn test_fog_guard_tower_larger_radius() {
        let mut map = Map::new(30, 30);
        use crate::economy::BuildingType;
        use crate::units::UnitKind;

        let buildings = vec![
            (BuildingType::Castle, 15, 15),
            (BuildingType::GuardTower, 10, 10),
        ];
        let units: Vec<(UnitKind, f32, f32)> = vec![];

        map.compute_visibility_from_entities(&buildings, &units);

        // Guard Tower at (10,10) has radius 7, Castle at (15,15) has radius 5
        // Tile near Guard Tower should be visible
        assert!(map.get_visibility(10, 10) > 0.0);
        // Tile near Castle should be visible
        assert!(map.get_visibility(15, 15) > 0.0);
        // Tile far from both should be hidden
        assert_eq!(map.get_visibility(0, 0), 0.0);
    }

    #[test]
    fn test_fog_fortress_largest_radius() {
        let mut map = Map::new(40, 40);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::Fortress, 20, 20)];
        let units: Vec<(crate::units::UnitKind, f32, f32)> = vec![];

        map.compute_visibility_from_entities(&buildings, &units);

        // Fortress has radius 10
        assert!(map.get_visibility(20, 20) > 0.9);
        assert!(map.get_visibility(25, 20) > 0.0);
        assert!(map.get_visibility(29, 20) > 0.0); // within radius
        assert_eq!(map.get_visibility(0, 0), 0.0);
    }

    #[test]
    fn test_fog_units_provide_sight() {
        let mut map = Map::new(20, 20);
        use crate::units::UnitKind;

        let buildings: Vec<(crate::economy::BuildingType, usize, usize)> = vec![];
        let units = vec![
            (UnitKind::Settler, 10.5, 10.5),
            (UnitKind::Swordsman, 5.5, 5.5),
        ];

        map.compute_visibility_from_entities(&buildings, &units);

        // Settler has radius 3
        assert!(map.get_visibility(10, 10) > 0.9);
        // Swordsman has radius 4
        assert!(map.get_visibility(5, 5) > 0.9);
        // Far tile should be hidden
        assert_eq!(map.get_visibility(19, 19), 0.0);
    }

    #[test]
    fn test_fog_multiple_sources_combine() {
        let mut map = Map::new(30, 30);
        // Two sources far apart
        map.compute_visibility(&[(5.5, 5.5, 3.0), (25.5, 25.5, 3.0)]);

        // Both centers visible
        assert!(map.get_visibility(5, 5) > 0.0);
        assert!(map.get_visibility(25, 25) > 0.0);
        // Middle should be hidden (too far from both)
        assert_eq!(map.get_visibility(15, 15), 0.0);
    }

    #[test]
    fn test_fog_performance_256x256() {
        let mut map = Map::new(256, 256);
        let sources: Vec<(f32, f32, f32)> = vec![
            (64.5, 64.5, 10.0),
            (128.5, 128.5, 15.0),
            (192.5, 64.5, 8.0),
            (64.5, 192.5, 12.0),
            (192.5, 192.5, 10.0),
        ];

        // This should complete quickly (< 5ms is the target)
        let start = std::time::Instant::now();
        map.compute_visibility(&sources);
        let elapsed = start.elapsed();

        // Verify some tiles are visible
        assert!(map.get_visibility(64, 64) > 0.0);
        assert!(map.get_visibility(128, 128) > 0.0);

        // Should complete in under 100ms even in debug mode
        assert!(
            elapsed.as_millis() < 100,
            "Fog computation took {}ms, expected < 100ms",
            elapsed.as_millis()
        );
    }

    #[test]
    fn test_fog_get_visibility_out_of_bounds() {
        let map = Map::new(10, 10);
        assert_eq!(map.get_visibility(100, 100), 0.0);
        assert_eq!(map.get_visibility(10, 10), 0.0);
    }

    #[test]
    fn test_fog_reset_clears_visibility() {
        let mut map = Map::new(20, 20);
        map.compute_visibility(&[(10.5, 10.5, 5.0)]);
        assert!(map.get_visibility(10, 10) > 0.0);

        // Compute again with no sources — should reset
        map.compute_visibility(&[]);
        assert_eq!(map.get_visibility(10, 10), 0.0);
    }
}
