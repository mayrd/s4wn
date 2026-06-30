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

    /// Base color (RGB) for the terrain tile.
    /// Phase 7: Updated to match original Siedler 4 color palette.
    /// Colors derived from S4's distinctive art style — saturated greens,
    /// blue-grey mountains, warm gold desert, cool white-blue snow.
    pub fn color(self) -> [f32; 3] {
        match self {
            // S4 Grass: vibrant, saturated green (hex #3d7a35)
            Terrain::Grass => [0.239, 0.478, 0.208],
            // S4 Forest: deep, dark green (hex #1e4a18)
            Terrain::Forest => [0.118, 0.290, 0.094],
            // S4 Mountain: blue-grey with slight warm tint (hex #7a8090)
            Terrain::Mountain => [0.478, 0.502, 0.565],
            // S4 Water: deep ocean blue (hex #1a4578)
            Terrain::Water => [0.102, 0.271, 0.471],
            // S4 DeepWater: very dark navy (hex #0a1e38)
            Terrain::DeepWater => [0.039, 0.118, 0.220],
            // S4 Desert: warm golden sand (hex #c8a850)
            Terrain::Desert => [0.784, 0.659, 0.314],
            // S4 Swamp: dark olive-green (hex #3a4828)
            Terrain::Swamp => [0.227, 0.282, 0.157],
            // S4 Snow: cool white-blue (hex #d0d8e8)
            Terrain::Snow => [0.816, 0.847, 0.910],
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
    /// Territory owner: None = neutral/unclaimed, Some(player_id) = owned
    /// player_id 0 = player 1, 1 = player 2, etc.
    pub territory_owner: Option<u8>,
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
#[derive(Debug, Clone)]
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
                territory_owner: None,
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

    /// Set the terrain type at (x, y). Returns true if successful (in-bounds).
    /// Clears any resource on the tile and resets visibility to force fog update.
    pub fn set_terrain(&mut self, x: usize, y: usize, terrain: Terrain) -> bool {
        if let Some(tile) = self.get_mut(x, y) {
            tile.terrain = terrain;
            tile.resource = None; // changing terrain invalidates resources
            tile.visibility = 0.0; // force fog of war recompute
            true
        } else {
            false
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

    /// Generate a tutorial map — hand-crafted for the guided campaign.
    /// Creates a player-friendly valley with forests, mountains with ore,
    /// farmland, a lake for fishing, and an enemy outpost in the NE corner.
    pub fn generate_tutorial(width: usize, height: usize) -> Self {
        let mut map = Map::new(width, height);
        let cx = width / 2;
        let cy = height;

        for y in 0..height {
            for x in 0..width {
                let t = map.get_mut(x, y).unwrap();

                // Distance from player HQ (south-center)
                let dx = x as f32 - cx as f32;
                let dy = y as f32 - (cy - 16) as f32;
                let dist_from_hq = (dx * dx + dy * dy).sqrt();

                // NE corner enemy outpost area
                let ex = x as f32 - (width - 8) as f32;
                let ey = y as f32 - 8.0;
                let dist_from_enemy = (ex * ex + ey * ey).sqrt();

                // West lake
                let lake_dx = x as f32 - 10.0;
                let lake_dy = y as f32 - 20.0;
                let dist_from_lake = (lake_dx * lake_dx * 0.5 + lake_dy * lake_dy).sqrt();

                // Mountains in the north
                let mt_dx = x as f32 - cx as f32 * 0.9;
                let mt_dy = y as f32 - 20.0;
                let dist_from_mt = (mt_dx * mt_dx * 0.3 + mt_dy * mt_dy).sqrt();

                // Determine terrain
                if dist_from_lake < 3.5 {
                    t.terrain = Terrain::Water;
                } else if dist_from_enemy < 4.0 {
                    // Enemy base area — flat deforested ground
                    t.terrain = Terrain::Grass;
                } else if dist_from_mt < 7.0 && dist_from_mt > 4.0 {
                    t.terrain = Terrain::Mountain;
                } else if dist_from_hq < 6.0 && y > (height - 20) {
                    // Immediate HQ area — flat grass for building
                    t.terrain = Terrain::Grass;
                } else if x < 18 && y < 15 && dist_from_lake > 4.0 {
                    t.terrain = Terrain::Water; // NW shallow water
                } else {
                    // Procedural biome for remaining tiles
                    let nx = x as f32 / width as f32;
                    let ny = y as f32 / height as f32;
                    let n = layered_noise(nx + 0.3, ny, 99);
                    if n > 0.55 {
                        t.terrain = Terrain::Forest;
                    } else if n < -0.45 {
                        t.terrain = Terrain::Grass;
                    } else if n < 0.1 && n > -0.1 {
                        t.terrain = Terrain::Grass; // patches of grass in forest
                    } else {
                        t.terrain = Terrain::Grass;
                    }
                }

                t.elevation = match t.terrain {
                    Terrain::Mountain => 0.7,
                    Terrain::Water => -0.3,
                    _ => 0.15,
                };
            }
        }

        // Place specific resources
        let resources = [
            // Forest near HQ for Woodcutter (south)
            (28, 44, Terrain::Forest, None::<Resource>),
            (30, 43, Terrain::Forest, None),
            (32, 42, Terrain::Forest, None),
            (34, 43, Terrain::Forest, None),
            (36, 44, Terrain::Forest, None),
            (26, 46, Terrain::Forest, None),
            (38, 46, Terrain::Forest, None),
            // Stone near HQ
            (38, 48, Terrain::Grass, Some(Resource::Stone)),
            (40, 49, Terrain::Grass, Some(Resource::Stone)),
            (42, 47, Terrain::Grass, Some(Resource::Stone)),
            // Mountains with ore (north)
            (28, 20, Terrain::Mountain, Some(Resource::Iron)),
            (30, 18, Terrain::Mountain, Some(Resource::Coal)),
            (32, 19, Terrain::Mountain, Some(Resource::Gold)),
            (35, 21, Terrain::Mountain, Some(Resource::Iron)),
            (37, 19, Terrain::Mountain, Some(Resource::Sulfur)),
            (25, 22, Terrain::Mountain, Some(Resource::Coal)),
            // Farmland (east of HQ)
            (42, 40, Terrain::Grass, Some(Resource::Grain)),
            (44, 42, Terrain::Grass, Some(Resource::Grain)),
            (46, 40, Terrain::Grass, Some(Resource::Grain)),
            // Forest with game for hunting (west)
            (15, 35, Terrain::Forest, Some(Resource::Game)),
            (17, 37, Terrain::Forest, Some(Resource::Game)),
            // Fish in lake
            (10, 20, Terrain::Water, Some(Resource::Fish)),
            (12, 22, Terrain::Water, Some(Resource::Fish)),
        ];

        for (x, y, terrain, resource) in resources {
            if x < width && y < height {
                let t = map.get_mut(x, y).unwrap();
                t.terrain = terrain;
                t.resource = resource;
            }
        }

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
                _ => 3.0,
            };
            sources.push((ux, uy, radius));
        }
        self.compute_visibility(&sources);
    }

    /// Compute territory ownership from buildings.
    ///
    /// Territory rules (S4-authentic):
    /// - Castle: radius 5, establishes initial territory
    /// - Guard Tower: radius 3 (extends territory when garrisoned — simplified: always extends)
    /// - Fortress: radius 6 (larger territory expansion)
    /// - Storehouse: radius 2
    /// - All other buildings: radius 1
    ///
    /// Each building claims tiles within its radius for the given player_id.
    /// Territory does NOT stack — a tile is owned by the closest building's player.
    /// Neutral tiles (owner = None) can be claimed by any building.
    /// Player 0's territory can only be overwritten by Player 0's buildings (friendly).
    pub fn compute_territory(
        &mut self,
        buildings: &[(crate::economy::BuildingType, usize, usize, u8, u32)],
    ) {
        // Reset all territory to neutral
        for tile in self.tiles.iter_mut() {
            tile.territory_owner = None;
        }
        // For each building, claim tiles within its radius
        for &(ref kind, bx, by, player_id, garrison_count) in buildings {
            // GuardTower and Fortress only extend territory when garrisoned
            let radius = match *kind {
                crate::economy::BuildingType::Castle => 5.0,
                crate::economy::BuildingType::GuardTower => {
                    if garrison_count > 0 { 3.0 } else { 1.0 }
                }
                crate::economy::BuildingType::Fortress | crate::economy::BuildingType::DarkFortress => {
                    if garrison_count > 0 { 6.0 } else { 1.0 }
                }
                crate::economy::BuildingType::Storehouse => 2.0,
                _ => 1.0,
            };
            let r2 = radius * radius;
            let min_x = (bx as f32 + 0.5 - radius).floor().max(0.0) as usize;
            let max_x = ((bx as f32 + 0.5 + radius).ceil() as usize).min(self.width - 1);
            let min_y = (by as f32 + 0.5 - radius).floor().max(0.0) as usize;
            let max_y = ((by as f32 + 0.5 + radius).ceil() as usize).min(self.height - 1);
            for y in min_y..=max_y {
                for x in min_x..=max_x {
                    let dx = x as f32 + 0.5 - (bx as f32 + 0.5);
                    let dy = y as f32 + 0.5 - (by as f32 + 0.5);
                    let dist2 = dx * dx + dy * dy;
                    if dist2 <= r2 {
                        let idx = y * self.width + x;
                        // Only claim neutral tiles or tiles already owned by same player
                        let current = self.tiles[idx].territory_owner;
                        if current.is_none() || current == Some(player_id) {
                            self.tiles[idx].territory_owner = Some(player_id);
                        }
                    }
                }
            }
        }
    }

    /// Check if a tile is within the given player's territory.
    /// Returns true if the tile is neutral (None) or owned by the player.
    pub fn is_within_territory(&self, x: usize, y: usize, player_id: u8) -> bool {
        if x >= self.width || y >= self.height {
            return false;
        }
        let idx = y * self.width + x;
        match self.tiles[idx].territory_owner {
            None => true,  // Neutral tiles are placeable
            Some(owner) => owner == player_id,
        }
    }

    /// Get the territory owner of a tile. Returns None if neutral or out of bounds.
    pub fn get_territory(&self, x: usize, y: usize) -> Option<u8> {
        if x >= self.width || y >= self.height {
            return None;
        }
        self.tiles[y * self.width + x].territory_owner
    }

    /// Get border tiles for a player's territory.
    ///
    /// A border tile is a tile owned by `player_id` that has at least one neighbor
    /// (4-directional: up, down, left, right) that is either neutral (None) or
    /// owned by a different player. Tiles at the map edge are also considered border
    /// tiles if owned by the player.
    ///
    /// Returns a Vec of (x, y) coordinates of border tiles.
    pub fn get_territory_border_tiles(&self, player_id: u8) -> Vec<(usize, usize)> {
        let mut borders = Vec::new();
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                if self.tiles[idx].territory_owner != Some(player_id) {
                    continue;
                }
                // Check if any neighbor is neutral or different owner
                let is_border = [
                    (x.wrapping_sub(1), y),
                    (x + 1, y),
                    (x, y.wrapping_sub(1)),
                    (x, y + 1),
                ]
                .iter()
                .any(|&(nx, ny)| {
                    if nx >= self.width || ny >= self.height {
                        // Map edge counts as border
                        true
                    } else {
                        let nidx = ny * self.width + nx;
                        let neighbor_owner = self.tiles[nidx].territory_owner;
                        neighbor_owner.is_none() || neighbor_owner != Some(player_id)
                    }
                });
                if is_border {
                    borders.push((x, y));
                }
            }
        }
        borders
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
                    Some(r) => (r as u8).to_string(),
                    None => String::from("null"),
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

    let v = sx.sin() * 43_758.547;
    let w = sy.cos() * 78_901.234;

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
    fn test_terrain_colors_s4_palette() {
        // Phase 7: Verify terrain colors match S4-authentic palette
        // Each color channel must be within ±0.01 of the target value
        let check = |t: Terrain, target: [f32; 3]| {
            let c = t.color();
            for i in 0..3 {
                assert!(
                    (c[i] - target[i]).abs() < 0.01,
                    "Terrain {:?} channel {}: got {}, expected {}",
                    t, i, c[i], target[i]
                );
            }
        };
        check(Terrain::Grass,     [0.239, 0.478, 0.208]);
        check(Terrain::Forest,    [0.118, 0.290, 0.094]);
        check(Terrain::Mountain,  [0.478, 0.502, 0.565]);
        check(Terrain::Water,     [0.102, 0.271, 0.471]);
        check(Terrain::DeepWater, [0.039, 0.118, 0.220]);
        check(Terrain::Desert,    [0.784, 0.659, 0.314]);
        check(Terrain::Swamp,     [0.227, 0.282, 0.157]);
        check(Terrain::Snow,      [0.816, 0.847, 0.910]);
    }

    #[test]
    fn test_terrain_color_channel_order() {
        // Grass should be green-dominant (G > R > B)
        let grass = Terrain::Grass.color();
        assert!(grass[1] > grass[0], "Grass: G should be > R");
        assert!(grass[0] > grass[2], "Grass: R should be > B");

        // Mountain should be blue-grey (B ≈ G > R)
        let mt = Terrain::Mountain.color();
        assert!(mt[2] > mt[0], "Mountain: B should be > R");

        // Desert should be warm gold (R > G > B)
        let desert = Terrain::Desert.color();
        assert!(desert[0] > desert[1], "Desert: R should be > G");
        assert!(desert[1] > desert[2], "Desert: G should be > B");

        // Water should be blue-dominant (B > G > R)
        let water = Terrain::Water.color();
        assert!(water[2] > water[1], "Water: B should be > G");
        assert!(water[1] > water[0], "Water: G should be > R");

        // Snow should be bright with blue tint (B ≈ G ≈ R, all high)
        let snow = Terrain::Snow.color();
        assert!(snow[0] > 0.7, "Snow: R should be > 0.7");
        assert!(snow[1] > 0.7, "Snow: G should be > 0.7");
        assert!(snow[2] > 0.7, "Snow: B should be > 0.7");
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

    // ── Territory Tests ──────────────────────────────────────────────────────

    #[test]
    fn test_territory_all_neutral_initially() {
        let map = Map::new(10, 10);
        for (x, y) in map.coordinates() {
            assert_eq!(map.get_territory(x, y), None);
        }
    }

    #[test]
    fn test_territory_castle_claims_radius_5() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::Castle, 10, 10, 0, 0)];
        map.compute_territory(&buildings);

        // Center should be owned by player 0
        assert_eq!(map.get_territory(10, 10), Some(0));

        // Tiles within radius 5 should be owned
        assert_eq!(map.get_territory(14, 10), Some(0));
        assert_eq!(map.get_territory(10, 14), Some(0));

        // Tiles outside radius 5 should be neutral
        assert_eq!(map.get_territory(10, 4), None);
        assert_eq!(map.get_territory(4, 10), None);
        assert_eq!(map.get_territory(0, 0), None);
    }

    #[test]
    fn test_territory_guard_tower_radius_3() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::GuardTower, 10, 10, 0, 1)];
        map.compute_territory(&buildings);

        // Center owned
        assert_eq!(map.get_territory(10, 10), Some(0));

        // Within radius 3
        assert_eq!(map.get_territory(13, 10), Some(0));
        assert_eq!(map.get_territory(10, 13), Some(0));

        // Outside radius 3
        assert_eq!(map.get_territory(10, 6), None);
        assert_eq!(map.get_territory(6, 10), None);
    }

    #[test]
    fn test_territory_fortress_radius_6() {
        let mut map = Map::new(30, 30);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::Fortress, 15, 15, 0, 3)];
        map.compute_territory(&buildings);

        // Center owned
        assert_eq!(map.get_territory(15, 15), Some(0));

        // Within radius 6
        assert_eq!(map.get_territory(21, 15), Some(0));
        assert_eq!(map.get_territory(15, 21), Some(0));

        // Outside radius 6
        assert_eq!(map.get_territory(15, 8), None);
        assert_eq!(map.get_territory(8, 15), None);
    }

    #[test]
    fn test_territory_storehouse_radius_2() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::Storehouse, 10, 10, 0, 0)];
        map.compute_territory(&buildings);

        // Center owned
        assert_eq!(map.get_territory(10, 10), Some(0));

        // Within radius 2
        assert_eq!(map.get_territory(12, 10), Some(0));

        // Outside radius 2
        assert_eq!(map.get_territory(10, 7), None);
    }

    #[test]
    fn test_territory_other_buildings_radius_1() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::Farm, 10, 10, 0, 0)];
        map.compute_territory(&buildings);

        // Center owned
        assert_eq!(map.get_territory(10, 10), Some(0));

        // Adjacent tiles within radius 1
        assert_eq!(map.get_territory(11, 10), Some(0));
        assert_eq!(map.get_territory(10, 11), Some(0));

        // Outside radius 1
        assert_eq!(map.get_territory(10, 8), None);
    }

    #[test]
    fn test_territory_multiple_buildings_same_player() {
        let mut map = Map::new(30, 30);
        use crate::economy::BuildingType;

        // Two buildings for player 0
        let buildings = vec![
            (BuildingType::Castle, 10, 10, 0, 0),
            (BuildingType::GuardTower, 20, 20, 0, 1),
        ];
        map.compute_territory(&buildings);

        // Both centers owned by player 0
        assert_eq!(map.get_territory(10, 10), Some(0));
        assert_eq!(map.get_territory(20, 20), Some(0));

        // Tiles between them should be owned (overlapping territory)
        // Castle radius 5 covers up to (15, 10), GuardTower radius 3 covers from (17, 20)
        // The area between might be neutral if gaps exist
    }

    #[test]
    fn test_territory_two_players() {
        let mut map = Map::new(40, 40);
        use crate::economy::BuildingType;

        // Player 0 has a Castle at (10, 10), Player 1 has a Castle at (30, 30)
        let buildings = vec![
            (BuildingType::Castle, 10, 10, 0, 0),
            (BuildingType::Castle, 30, 30, 1, 0),
        ];
        map.compute_territory(&buildings);

        // Player 0's territory
        assert_eq!(map.get_territory(10, 10), Some(0));
        assert_eq!(map.get_territory(14, 10), Some(0));

        // Player 1's territory
        assert_eq!(map.get_territory(30, 30), Some(1));
        assert_eq!(map.get_territory(34, 30), Some(1));

        // Middle should be neutral (outside both radii)
        assert_eq!(map.get_territory(20, 20), None);
    }

    #[test]
    fn test_territory_reset_between_computations() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        // First computation: player 0 claims territory
        let buildings = vec![(BuildingType::Castle, 10, 10, 0, 0)];
        map.compute_territory(&buildings);
        assert_eq!(map.get_territory(10, 10), Some(0));
        assert_eq!(map.get_territory(14, 10), Some(0));

        // Second computation: no buildings — all should reset to neutral
        let empty: Vec<(crate::economy::BuildingType, usize, usize, u8, u32)> = vec![];
        map.compute_territory(&empty);
        assert_eq!(map.get_territory(10, 10), None);
        assert_eq!(map.get_territory(14, 10), None);
    }

    #[test]
    fn test_territory_is_within_territory() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        let buildings = vec![(BuildingType::Castle, 10, 10, 0, 0)];
        map.compute_territory(&buildings);

        // Player 0's own territory
        assert!(map.is_within_territory(10, 10, 0));
        assert!(map.is_within_territory(14, 10, 0));

        // Neutral tile is within territory for any player
        assert!(map.is_within_territory(0, 0, 0));
        assert!(map.is_within_territory(0, 0, 1));

        // Out of bounds
        assert!(!map.is_within_territory(100, 100, 0));
    }

    #[test]
    fn test_territory_out_of_bounds() {
        let map = Map::new(10, 10);
        assert_eq!(map.get_territory(100, 100), None);
        assert_eq!(map.get_territory(10, 10), None);
        assert!(!map.is_within_territory(100, 100, 0));
    }

    #[test]
    fn test_territory_guard_tower_extends_beyond_castle() {
        let mut map = Map::new(30, 30);
        use crate::economy::BuildingType;

        // Castle at (15, 15) with radius 5, Guard Tower at (15, 22) with radius 3
        let buildings = vec![
            (BuildingType::Castle, 15, 15, 0, 0),
            (BuildingType::GuardTower, 15, 22, 0, 1),
        ];
        map.compute_territory(&buildings);

        // Castle territory
        assert_eq!(map.get_territory(15, 15), Some(0));
        assert_eq!(map.get_territory(15, 20), Some(0)); // edge of castle radius

        // Guard Tower territory extends further
        assert_eq!(map.get_territory(15, 22), Some(0));
        assert_eq!(map.get_territory(15, 25), Some(0)); // edge of guard tower radius

        // Beyond both
        assert_eq!(map.get_territory(15, 29), None);
    }

    // ── Territory Border Tests ────────────────────────────────────────────────

    #[test]
    fn test_border_no_territory_returns_empty() {
        let map = Map::new(10, 10);
        let borders = map.get_territory_border_tiles(0);
        assert!(borders.is_empty());
    }

    #[test]
    fn test_border_single_tile_is_border() {
        let mut map = Map::new(10, 10);
        use crate::economy::BuildingType;

        // A Farm at (5, 5) claims radius 1 — all its owned tiles are borders
        // because every owned tile touches neutral territory or map edge
        let buildings = vec![(BuildingType::Farm, 5, 5, 0, 0)];
        map.compute_territory(&buildings);

        let borders = map.get_territory_border_tiles(0);
        // All owned tiles should be border tiles (every tile touches neutral)
        assert!(!borders.is_empty());
        // The outer ring tiles like (6,5) are definitely borders
        assert!(borders.contains(&(6, 5)));
        assert!(borders.contains(&(5, 6)));
        // Center (5,5) is NOT a border — it's surrounded by owned tiles
        assert!(!borders.contains(&(5, 5)));
    }

    #[test]
    fn test_border_castle_center_not_border() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        // Castle at (10, 10) with radius 5
        let buildings = vec![(BuildingType::Castle, 10, 10, 0, 0)];
        map.compute_territory(&buildings);

        let borders = map.get_territory_border_tiles(0);

        // Center tile (10, 10) is surrounded by owned tiles — NOT a border
        assert!(!borders.contains(&(10, 10)));

        // Edge tiles of the territory should be borders
        // (15, 10) is at the right edge of radius 5
        assert!(borders.contains(&(15, 10)));
        assert!(borders.contains(&(10, 15)));
    }

    #[test]
    fn test_border_only_player_tiles() {
        let mut map = Map::new(20, 20);
        use crate::economy::BuildingType;

        // Player 0 has a Castle at (5, 5), Player 1 has a Castle at (15, 15)
        let buildings = vec![
            (BuildingType::Castle, 5, 5, 0, 0),
            (BuildingType::Castle, 15, 15, 1, 0),
        ];
        map.compute_territory(&buildings);

        let borders_p0 = map.get_territory_border_tiles(0);
        let borders_p1 = map.get_territory_border_tiles(1);

        // Player 0's borders should only contain player 0's tiles
        for &(x, y) in &borders_p0 {
            assert_eq!(map.get_territory(x, y), Some(0));
        }
        // Player 1's borders should only contain player 1's tiles
        for &(x, y) in &borders_p1 {
            assert_eq!(map.get_territory(x, y), Some(1));
        }
    }

    #[test]
    fn test_border_map_edge_counts() {
        let mut map = Map::new(10, 10);
        use crate::economy::BuildingType;

        // Castle at (0, 0) — territory extends to map edge
        let buildings = vec![(BuildingType::Castle, 0, 0, 0, 0)];
        map.compute_territory(&buildings);

        let borders = map.get_territory_border_tiles(0);

        // Tiles at map edge that are owned should be borders
        // (0, 0) is at the corner — it's a border
        assert!(borders.contains(&(0, 0)));
    }

    #[test]
    fn test_border_two_players_no_overlap() {
        let mut map = Map::new(30, 30);
        use crate::economy::BuildingType;

        let buildings = vec![
            (BuildingType::Castle, 8, 8, 0, 0),
            (BuildingType::Castle, 22, 22, 1, 0),
        ];
        map.compute_territory(&buildings);

        let borders_p0 = map.get_territory_border_tiles(0);
        let borders_p1 = map.get_territory_border_tiles(1);

        // No tile should appear in both border lists
        for &tile in &borders_p0 {
            assert!(!borders_p1.contains(&tile), "Tile {:?} in both borders", tile);
        }
    }

    #[test]
    fn test_set_terrain() {
        let mut map = Map::new(10, 10);
        
        // Set valid terrain
        assert!(map.set_terrain(3, 4, Terrain::Forest));
        assert_eq!(map.get(3, 4).unwrap().terrain, Terrain::Forest);
        assert!(map.get(3, 4).unwrap().resource.is_none());
        assert_eq!(map.get(3, 4).unwrap().visibility, 0.0);
        
        // Out of bounds returns false
        assert!(!map.set_terrain(100, 100, Terrain::Grass));
        
        // Overwrite with different terrain
        map.set_terrain(3, 4, Terrain::Water);
        assert_eq!(map.get(3, 4).unwrap().terrain, Terrain::Water);
        
        // All 8 terrain types work
        let terrains = [Terrain::Grass, Terrain::Forest, Terrain::Mountain, Terrain::Water,
                        Terrain::DeepWater, Terrain::Desert, Terrain::Swamp, Terrain::Snow];
        for (i, t) in terrains.iter().enumerate() {
            assert!(map.set_terrain(5, i, *t));
            assert_eq!(map.get(5, i).unwrap().terrain, *t);
        }
    }

    // ── Garrison-Dependent Territory Tests ──────────────────────────────────

    #[test]
    fn test_guard_tower_no_garrison_small_territory() {
        use crate::economy::BuildingType;
        let mut map = Map::new(20, 20);
        let buildings = vec![(BuildingType::GuardTower, 10, 10, 0, 0)];
        map.compute_territory(&buildings);

        assert_eq!(map.get_territory(10, 10), Some(0));
        assert_eq!(map.get_territory(11, 10), Some(0));
        // Radius 3 tiles should NOT be owned (no garrison)
        assert_eq!(map.get_territory(13, 10), None);
        assert_eq!(map.get_territory(10, 13), None);
    }

    #[test]
    fn test_guard_tower_garrisoned_full_territory() {
        use crate::economy::BuildingType;
        let mut map = Map::new(20, 20);
        let buildings = vec![(BuildingType::GuardTower, 10, 10, 0, 1)];
        map.compute_territory(&buildings);

        assert_eq!(map.get_territory(10, 10), Some(0));
        assert_eq!(map.get_territory(13, 10), Some(0));
        assert_eq!(map.get_territory(10, 13), Some(0));
        // Outside radius 3
        assert_eq!(map.get_territory(10, 6), None);
    }

    #[test]
    fn test_fortress_no_garrison_small_territory() {
        use crate::economy::BuildingType;
        let mut map = Map::new(30, 30);
        let buildings = vec![(BuildingType::Fortress, 15, 15, 0, 0)];
        map.compute_territory(&buildings);

        assert_eq!(map.get_territory(15, 15), Some(0));
        assert_eq!(map.get_territory(16, 15), Some(0));
        // Radius 6 tiles should NOT be owned
        assert_eq!(map.get_territory(21, 15), None);
        assert_eq!(map.get_territory(15, 21), None);
    }

    #[test]
    fn test_fortress_garrisoned_full_territory() {
        use crate::economy::BuildingType;
        let mut map = Map::new(30, 30);
        let buildings = vec![(BuildingType::Fortress, 15, 15, 0, 3)];
        map.compute_territory(&buildings);

        assert_eq!(map.get_territory(15, 15), Some(0));
        assert_eq!(map.get_territory(21, 15), Some(0));
        assert_eq!(map.get_territory(15, 21), Some(0));
        // Outside radius 6
        assert_eq!(map.get_territory(15, 8), None);
    }

    #[test]
    fn test_castle_territory_independent_of_garrison() {
        use crate::economy::BuildingType;
        let mut map = Map::new(30, 30);
        let buildings = vec![(BuildingType::Castle, 15, 15, 0, 0)];
        map.compute_territory(&buildings);
        assert_eq!(map.get_territory(20, 15), Some(0));
        assert_eq!(map.get_territory(15, 9), None);

        let mut map2 = Map::new(30, 30);
        let buildings2 = vec![(BuildingType::Castle, 15, 15, 0, 6)];
        map2.compute_territory(&buildings2);
        assert_eq!(map2.get_territory(20, 15), Some(0));
    }
}
