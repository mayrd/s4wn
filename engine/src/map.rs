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
}
