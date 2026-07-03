/* tslint:disable */
/* eslint-disable */

/**
 * Build cost item — one resource requirement for a building.
 * Used by get_build_cost_by_id to return typed cost data (no JSON.parse needed).
 */
export class BuildCostItem {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Amount of this resource required.
     */
    readonly amount: number;
    /**
     * ResourceType discriminant (maps to ResourceType::from_discriminant).
     */
    readonly resource_discriminant: number;
}

/**
 * Get detailed building info by index.
 * Returns JSON: {"kind":"Farm","x":3,"y":3,"construction":1.0,"complete":true,
 *   "active":true,"settlers":[1],"max_settlers":1,
 *   "build_ticks":20,"production_interval":20,"inputs":[["Wood",2]],
 *   "outputs":[["Planks",1]],"output_buffer":{"Planks":5}}
 * or {"error":"Building not found"}
 * Detailed building info for a single building by index.
 * `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
 * `workers` is a Vec<u32> of settler IDs.
 * `inputs`/`outputs` are flattened [discriminant, amount] pairs (use in steps of 2).
 * `output_buffer` is indexed by ResourceType discriminant (dense Vec<u32>).
 * `producing_tool` is the tool code discriminant (0=Hammer..10=Bow), 255 for none/not-toolsmith.
 */
export class BuildingDetailInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly active: boolean;
    readonly build_ticks: number;
    readonly complete: boolean;
    readonly construction: number;
    readonly destruction_progress: number;
    readonly garrison: number;
    readonly inputs: Uint32Array;
    readonly kind: number;
    readonly max_garrison: number;
    readonly max_workers: number;
    readonly output_buffer: Uint32Array;
    readonly outputs: Uint32Array;
    readonly producing_tool: number;
    readonly production_interval: number;
    readonly workers: Uint32Array;
    readonly x: number;
    readonly y: number;
}

/**
 * Building information struct — replaces JSON string from get_building_summary.
 * `index` is the position in the buildings array (used for garrison/destruction).
 * `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
 * `settlers` is the count of assigned workers. `garrison` is count of garrisoned soldiers.
 */
export class BuildingInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    complete: boolean;
    garrison: number;
    index: number;
    kind: number;
    max_garrison: number;
    owner_id: number;
    settlers: number;
    x: number;
    y: number;
}

/**
 * Building data in save game state.
 */
export class BuildingSaveData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly active: boolean;
    readonly assigned_settlers: Uint32Array;
    readonly construction: number;
    readonly input_buffer: Uint32Array;
    readonly kind: number;
    readonly max_settlers: number;
    readonly output_buffer: Uint32Array;
    readonly production_counter: number;
    readonly x: number;
    readonly y: number;
}

/**
 * Returns the remaining HP, or 0 if the building doesn't exist.
 * Get the max HP of a building at the given index. Returns 0 if not found.
 * Building-at-tile information struct — replaces JSON string from get_building_at_tile.
 * `index` is the position in the buildings array (used for garrison/destruction).
 * `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
 * `construction` is 0.0..1.0 build progress. `active` is whether the building is producing.
 * `destruction_progress` is -1.0 when not being destroyed, otherwise 0.0..1.0.
 */
export class BuildingTileInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    active: boolean;
    construction: number;
    destruction_progress: number;
    index: number;
    kind: number;
    x: number;
    y: number;
}

/**
 * Camera state struct — replaces JSON string from get_camera_state.
 * `center_x`/`center_y` are the camera center in world tile coords.
 * `zoom` is the camera zoom factor.
 * `vp_w`/`vp_h` are the viewport dimensions in pixels.
 */
export class CameraState {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    center_x: number;
    center_y: number;
    vp_h: number;
    vp_w: number;
    zoom: number;
}

/**
 * Destruction info for a building - replaces JSON string from tick_building_destructions.
 * `index` is the position in the buildings array at time of destruction.
 * `x` and `y` are tile coordinates.
 */
export class DestructionInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    index: number;
    x: number;
    y: number;
}

/**
 * Complete game state returned by get_game_state — replaces JSON string with typed struct.
 * JS side reconstructs JSON from typed fields for localStorage save/load compatibility.
 * Map data is stored as typed arrays (terrain/elevation/resource) instead of JSON string
 * to eliminate map.to_json() format!() calls from the production WASM export path.
 */
export class GameStateData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly buildings: BuildingSaveData[];
    readonly game_time: number;
    readonly map_elevation: Float32Array;
    readonly map_height: number;
    readonly map_resource: Int32Array;
    readonly map_terrain: Uint8Array;
    readonly map_width: number;
    readonly resources: Uint32Array;
    readonly units: UnitSaveData[];
}

/**
 * Garrison info for a building — replaces JSON string from get_building_garrison_json.
 * `unit_ids` are the raw unit IDs of garrisoned soldiers.
 * Uses manual getters because wasm-bindgen requires Copy for public fields and Vec is not Copy.
 */
export class GarrisonInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly capacity: number;
    readonly count: number;
    readonly garrisoned: boolean;
    readonly unit_ids: Uint32Array;
}

/**
 * Result struct for load_map_json — replaces JSON string status.
 * `ok` is true on success, `error` contains the error message on failure.
 */
export class LoadMapResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message if loading failed, empty string on success.
     */
    readonly error: string;
    /**
     * True if the map was loaded successfully.
     */
    readonly ok: boolean;
}

/**
 * Result of load_model_json — replaces JSON String return (S313).
 *  is true when the model was loaded successfully.
 *  is the model name,  the triangle count.
 *  contains the error message when  is false (empty on success).
 */
export class LoadModelResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message (empty on success).
     */
    readonly error: string;
    /**
     * Integer model type ID (0-61).
     */
    readonly model_id: number;
    /**
     * True if the model was loaded successfully.
     */
    readonly ok: boolean;
    /**
     * Triangle count of the loaded mesh.
     */
    readonly tri_count: number;
}

/**
 * Map export data — typed replacement for JSON string from export_map_json().
 * `terrain` is Terrain discriminant (u8), `elevation` is height value,
 * `resource` is Resource discriminant (i32), -1 = no resource.
 * Tiles are in row-major order (y * width + x).
 */
export class MapExportData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    elevation(): Float32Array;
    height(): number;
    resource(): Int32Array;
    terrain(): Uint8Array;
    width(): number;
}

/**
 * Morale info for a unit — replaces JSON string from get_unit_morale_json.
 * `morale_bonus` is the raw multiplier (0.0 = no bonus).
 * `morale_percent` is the percentage as integer (e.g. 15 for +15%).
 */
export class MoraleInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    morale_bonus: number;
    morale_percent: number;
}

/**
 * Nation information returned by `get_player_nation` — replaces JSON string with typed struct.
 * `name_id` is the NationType discriminant (0=Roman..4=DarkTribe).
 * Fields are accessed via JS getters (no JSON.parse needed).
 */
export class NationInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Color as a hex string (e.g., "#C83232").
     */
    readonly color: string;
    /**
     * Human-readable description of the nation's playstyle.
     */
    readonly description: string;
    /**
     * Emoji icon for HUD display.
     */
    readonly emoji: string;
    /**
     * The NationType discriminant (0=Roman..4=DarkTribe).
     */
    readonly name_id: number;
}

/**
 * Lightweight particle info exposed to JS (avoids JSON serialization).
 */
export class ParticleInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    b: number;
    g: number;
    life: number;
    max_life: number;
    r: number;
    size: number;
    x: number;
    y: number;
    z: number;
}

/**
 * Result of try_place_building_by_id — typed struct replacing JSON string.
 * Returns Ok(PlaceBuildingResult) on success, Err(PlaceBuildingResult) with error message on failure.
 */
export class PlaceBuildingResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message (valid when ok=false).
     */
    readonly error: string;
    /**
     * Building index in the economy vector (valid when ok=true).
     */
    readonly idx: number;
    /**
     * BuildingType discriminant (valid when ok=true).
     */
    readonly kind: number;
    /**
     * Whether the building was successfully placed.
     */
    readonly ok: boolean;
}

/**
 * Result struct for restore_game_state — replaces JSON string status.
 * `ok` is true on success, `error` contains the error message on failure.
 */
export class RestoreStateResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message if restore failed, empty string on success.
     */
    readonly error: string;
    /**
     * True if the game state was restored successfully.
     */
    readonly ok: boolean;
}

/**
 * Starter result struct — replaces JSON string from setup_starter_base.
 * `ok` is true when the base was placed successfully.
 * `error` contains the error message when `ok` is false (empty on success).
 * Fields are accessed via JS getters (no JSON.parse needed).
 */
export class StarterResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message (empty on success).
     */
    readonly error: string;
    /**
     * X coordinate of the placed HQ (Castle).
     */
    readonly hq_x: number;
    /**
     * Y coordinate of the placed HQ (Castle).
     */
    readonly hq_y: number;
    /**
     * True if the starter base was placed successfully.
     */
    readonly ok: boolean;
    /**
     * Number of settlers spawned.
     */
    readonly settlers: number;
}

/**
 * Result of add_starting_resources — replaces JSON String return.
 * `ok` is true when resources were applied successfully.
 * `error` contains the error message when `ok` is false (empty on success).
 */
export class StartingResourcesResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message (empty on success).
     */
    readonly error: string;
    /**
     * True if starting resources were applied successfully.
     */
    readonly ok: boolean;
}

/**
 * Engine stats returned by `get_stats` — replaces JSON string with typed struct.
 * `fps` is the currently displayed FPS. `ticks` is the game tick counter.
 * `game_time` is the elapsed game time in seconds. `zoom` is the camera zoom factor.
 */
export class StatsInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    fps_avg: number;
    fps_max: number;
    fps_min: number;
    fps_sample_count: number;
    fps_visible: boolean;
    fps: number;
    frame_time_ms: number;
    game_time: number;
    ticks: number;
    zoom: number;
}

/**
 * Tile information returned by `get_tile_at` — replaces JSON string with typed struct.
 * `resource` is -1 when no resource is present on the tile.
 */
export class TileInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    elevation: number;
    /**
     * Resource discriminant, or -1 if none.
     */
    resource: number;
    terrain: number;
    x: number;
    y: number;
}

/**
 * Detailed unit info for a single unit by ID.
 * sentinel 0 for None: assigned_building offset +1 (actual index+1), target raw ID (IDs start at 1).
 * dying_progress is 0.0 when not dying.
 */
export class UnitDetailInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    assigned_building: number;
    carried_tool: number;
    dying_progress: number;
    hp: number;
    id: number;
    kind: number;
    max_hp: number;
    stance: number;
    state: number;
    target: number;
    x: number;
    y: number;
}

/**
 * Unit information struct — replaces JSON string from get_unit_summary.
 * `kind` is the UnitKind discriminant (use UNIT_NAMES_BY_ID in JS).
 * `state` discriminant: 0=Idle, 1=Moving, 2=Working, 3=Fighting, 4=Patrolling, 5=FormationMove, 6=Dying, 7=Dead.
 * `stance` discriminant: 0=Aggressive, 1=StandGround, 2=Passive.
 * `carried_tool` is the tool code discriminant, or 255 if none.
 */
export class UnitInfo {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    carried_tool: number;
    hp: number;
    id: number;
    kind: number;
    max_hp: number;
    stance: number;
    state: number;
    x: number;
    y: number;
}

/**
 * Unit data in save game state.
 */
export class UnitSaveData {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly assigned_building: number;
    readonly hp: number;
    readonly id: number;
    readonly kind: number;
    readonly max_hp: number;
    readonly stance: number;
    readonly state: number;
    readonly target: number;
    readonly x: number;
    readonly y: number;
}

/**
 * Add a model instance to the render list for this frame.
 * Called from JS each frame for every building/unit to render.
 */
export function add_model_instance(model_type_id: number, x: number, y: number, scale: number, rotation_y: number): boolean;

/**
 * Apply starting resources based on difficulty level.
 * Should be called AFTER load_map_json() to seed the new game state.
 * difficulty: "easy" (2× resources), "medium" (1×), "hard" (0.5×)
 * Returns "ok" on success or an error message.
 */
export function add_starting_resources(difficulty: string): StartingResourcesResult | undefined;

/**
 * Decompress a .sav savegame chunk: ARA-decrypt then LZ+Huffman decompress.
 * Used by the JS .sav loader to extract game data from savegame chunks.
 * Returns the decompressed data, or an empty Vec on failure.
 */
export function decompress_sav_chunk(data: Uint8Array, expected_length: number): Uint8Array;

/**
 * Export the current map as typed data (same format as load_map_json expects).
 * Returns None if no map is loaded. JS reconstructs JSON for file download.
 */
export function export_map_json(): MapExportData | undefined;

/**
 * Order a set of units to move in formation to a target tile.
 * Each unit maintains its relative offset from the group center.
 * unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
 * Returns the number of units successfully ordered to move.
 */
export function formation_move(unit_ids: Uint32Array, target_x: number, target_y: number): number;

/**
 * Generate a procedural map and return it as typed MapExportData.
 * map_type: "demo" (currently only one type supported; future: "island", "continents", etc.)
 * width/height: map dimensions (clamped to 16..1024)
 * Returns MapExportData with typed arrays — eliminates JSON String construction in generate path.
 * JS callers reconstruct JSON for load_map_json() from typed arrays.
 */
export function generate_map(map_type: string, width: number, height: number): MapExportData;

/**
 * Get build cost by BuildingType integer discriminant as typed Vec<BuildCostItem>.
 * Returns empty vec for invalid discriminants or buildings with no cost.
 * JS callers iterate: cost[i].resource_discriminant, cost[i].amount — no JSON.parse needed.
 */
export function get_build_cost_by_id(discriminant: number): BuildCostItem[];

/**
 * Get building info at a tile position. Returns Some(BuildingTileInfo) or None.
 */
export function get_building_at_tile(tile_x: number, tile_y: number): BuildingTileInfo | undefined;

/**
 * Get garrison info for a building at the given index.
 * Returns None if building not found or game not initialized.
 */
export function get_building_garrison(building_index: number): GarrisonInfo | undefined;

/**
 * Get detailed building info by index.
 * Returns Some(BuildingDetailInfo) or None if index is out of bounds.
 * Eliminates JSON.parse() at showBuildingInfo() call sites.
 */
export function get_building_info(idx: number): BuildingDetailInfo | undefined;

/**
 * Returns building data as a typed Vec<BuildingInfo> — no JSON parse needed in JS.
 * Use BUILDING_NAMES_BY_ID[info.kind] for the building name.
 */
export function get_building_summary(): BuildingInfo[];

/**
 * Get camera state as a typed struct (replaces JSON string, eliminating JSON.parse()).
 * Returns None if engine not initialized.
 */
export function get_camera_state(): CameraState | undefined;

export function get_draw_calls(): number;

/**
 * Get the complete game state as a typed struct for save/load.
 * JS side reconstructs JSON from typed fields for localStorage compatibility.
 * Map data is exported as typed arrays (terrain/elevation/resource) in row-major order
 * instead of JSON string, eliminating map.to_json() format!() overhead.
 */
export function get_game_state(): GameStateData;

/**
 * Get the full map as a compact Vec<u8> for minimap rendering.
 * Layout: [width_lo, width_hi, height_lo, height_hi, terrain_byte, terrain_byte, ...]
 * Each tile is one byte (terrain type as u8, matching Terrain enum repr).
 */
export function get_map_data(): Uint8Array;

/**
 * Get alive particles as typed structs for JS-side rendering.
 * Returns an empty Vec if the app is not initialized.
 */
export function get_particles(): ParticleInfo[];

/**
 * Get the player's nation as a typed NationInfo struct.
 * Returns `None` if no nation is set.
 */
export function get_player_nation(): NationInfo | undefined;

/**
 * Get resource counts as a dense Vec<u32> indexed by ResourceType discriminant.
 * Returns a Vec with max_discriminant+1 elements; invalid/gap indices are 0.
 * JS callers can index directly: counts[disc] — no JSON.parse() needed.
 * Use RESOURCE_NAMES_BY_ID (data.js) for JS-side name lookup.
 */
export function get_resource_counts_by_id(): Uint32Array;

/**
 * Get engine stats as a typed struct (replaces JSON string, eliminating JSON.parse()).
 */
export function get_stats(): StatsInfo | undefined;

export function get_tile_at(x: number, y: number): TileInfo | undefined;

/**
 * Get tool counts as a Vec<u32> indexed by ToolType discriminant (0=Hammer through 10=Bow).
 * Returns 11-element array. JS callers iterate with index, no JSON.parse() needed.
 * Use TOOL_ICONS_BY_ID / TOOL_NAMES_BY_ID (in index.html) for JS-side name/icon lookup.
 */
export function get_tool_counts(): Uint32Array;

/**
 * Get detailed unit info by ID.
 * Returns Option<UnitDetailInfo> — wasm-bindgen converts to JS object or undefined.
 * Uses integer discriminants for state/stance/kind/carried_tool (see JS lookup arrays).
 * assigned_building is building_index + 1 (0 = None). target is raw unit ID (0 = None, IDs start at 1).
 */
export function get_unit_info(id: number): UnitDetailInfo | undefined;

/**
 * Get morale info for a unit by ID.
 * Returns None if unit not found or game not initialized.
 */
export function get_unit_morale(unit_id: number): MoraleInfo | undefined;

/**
 * Get the current stance of a unit.
 * Returns: 0=Aggressive, 1=StandGround, 2=Passive. Returns 0 if unit not found.
 */
export function get_unit_stance(unit_id: number): number;

/**
 * Returns unit data as a typed Vec<UnitInfo> — no JSON parse needed in JS.
 * Use UNIT_NAMES_BY_ID[info.kind] for the unit name.
 */
export function get_unit_summary(): UnitInfo[];

/**
 * Get military units within a world-coordinate rectangle.
 * Returns typed Vec<UnitInfo> for Swordsman and Bowman within [min_x, max_x] x [min_y, max_y].
 * Used for Shift+drag marquee selection in the UI.
 * Fields are integer discriminants — use JS-side lookup tables for names.
 */
export function get_units_in_rect(min_x: number, min_y: number, max_x: number, max_y: number): UnitInfo[];

/**
 * Initialize the engine on a canvas element.
 * Returns true on success.
 */
export function init(canvas_id: string): boolean;

/**
 * Get the current pause state.
 */
export function is_paused(): boolean;

/**
 * Load a map from JSON string (same format as exported by to_json()).
 * Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":0},...]}
 * t=terrain id (0-7), e=elevation, r=map::Resource discriminant (0-7) or null
 * Returns a LoadMapResult with ok=true on success or ok=false with error message.
 */
export function load_map_json(json: string): LoadMapResult;

/**
 * Load a model from a JSON mesh string, validate it, and upload to GPU buffers.
 * Returns "ok:{name}:{indices}tri" if successful, or "error:{message}" on failure.
 */
export function load_model_json(model_id: number, json_str: string): LoadModelResult;

/**
 * Handle mouse down for panning
 */
export function on_mouse_down(x: number, y: number): void;

/**
 * Handle mouse move for panning
 */
export function on_mouse_move(x: number, y: number): void;

/**
 * Handle mouse up (stop panning)
 */
export function on_mouse_up(): void;

/**
 * Called from JS when the WebGL context is lost (canvas webglcontextlost event).
 * Sets a flag that suspends all rendering until context restoration.
 */
export function on_webgl_context_lost(): void;

/**
 * Called from JS when the WebGL context is restored (canvas webglcontextrestored event).
 * Recreates all WebGL resources (shaders, buffers, programs, FBOs) from scratch
 * while preserving game state (map, economy, units, particles).
 */
export function on_webgl_context_restored(): void;

/**
 * Handle scroll wheel for zooming
 */
export function on_wheel(delta_y: number): void;

/**
 * Order selected units to patrol between their current position and a target tile.
 * unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
 * Returns: number of units successfully ordered to patrol.
 */
export function order_patrol(unit_ids: Uint32Array, target_x: number, target_y: number): number;

/**
 * Get number of combat hits since last call (drains each frame).
 * Used by JS to trigger combat sound effects.
 */
export function recent_combat_count(): number;

/**
 * Get number of building construction completions since last call (drains each frame).
 * Used by JS to trigger construction complete sound effects.
 */
export function recent_construction_complete_count(): number;

/**
 * Get number of unit deaths since last call (drains each frame).
 * Used by JS to trigger death sound effects.
 */
export function recent_death_count(): number;

/**
 * Get number of resource production events since last call (drains each frame).
 * Used by JS to trigger resource pickup sound effects.
 */
export function recent_resource_pickup_count(): number;

export function render(timestamp: number): void;

/**
 * Reset FPS benchmarking stats (min/max/avg). Called when starting a new benchmark session.
 */
export function reset_fps_stats(): void;

/**
 * Handle window/canvas resize.
 */
export function resize(): void;

/**
 * Restore game state from a JSON save string (produced by get_game_state).
 * Returns a RestoreStateResult with ok=true on success or ok=false with error message.
 */
export function restore_game_state(json: string): RestoreStateResult;

/**
 * Rotate camera azimuth by a delta angle in degrees.
 * Positive = clockwise rotation around the focus point.
 * Used by minimap rotation arrow buttons.
 */
export function rotate_camera_azimuth(delta_deg: number): void;

/**
 * Set camera center to world coordinates (immediate).
 * Used by minimap click-to-center feature.
 */
export function set_camera_center(x: number, y: number): void;

/**
 * Receive pending network messages as JSON strings.
 * Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
 */
export function set_game_speed(multiplier: number): void;

/**
 * Set the player's nation by discriminant integer for the current game.
 * Returns true if the discriminant was recognized and applied.
 */
export function set_player_nation_by_id(discriminant: number): boolean;

/**
 * Toggle show full map (bypass fog of war).
 * Used by debug panel checkbox.
 */
export function set_show_full_map(on: boolean): void;

/**
 * Called from JS after terrain textures are fully loaded into the shared WebGL context.
 * JS creates the TEXTURE_2D_ARRAY with 8 layers (1024×1024), then calls this.
 */
export function set_textures_ready(): void;

/**
 * Set the terrain type at a tile position (map editor).
 * terrain_id: 0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow
 */
export function set_tile_terrain(x: number, y: number, terrain_id: number): boolean;

/**
 * Set stance for selected units.
 * unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
 * Returns the number of units whose stance was successfully set.
 */
export function set_units_stance(unit_ids: Uint32Array, stance: number): number;

/**
 * Called from JS after water normal map is loaded into TEXTURE1.
 */
export function set_water_normal_ready(): void;

/**
 * Place a free Castle near map center and spawn starter settlers.
 * Called after load_map_json() + add_starting_resources() to set up the initial base.
 * settler_count: number of idle settlers to spawn (clamped to 1..8).
 * Returns typed StarterResult struct (replaces JSON string, eliminating JSON.parse()).
 */
export function setup_starter_base(settler_count: number): StarterResult | undefined;

/**
 * Spawn a single particle.
 * Parameters: x, y, z, vx, vy, vz, life, r, g, b, size
 * Spawn a burst of particles. Returns number spawned.
 * Spawn a green "build success" effect at the given tile.
 */
export function spawn_build_effect(tile_x: number, tile_y: number): void;

/**
 * Start the destruction animation for a building at the given index.
 * `duration_secs` controls how long the scale-down animation plays (e.g. 1.5).
 * Returns true if the building exists and destruction was started.
 */
export function start_building_destruction(building_index: number, duration_secs: number): boolean;

/**
 * Tick destruction timers for all buildings by `dt` seconds.
 * Returns typed Vec<DestructionInfo> - no JSON.parse() needed in JS.
 * JS should call this each frame and remove buildings from the model list.
 */
export function tick_building_destructions(dt: number): DestructionInfo[];

/**
 * Toggle map editor grid overlay on/off. Returns new state.
 */
export function toggle_editor_grid(): boolean;

/**
 * Toggle FPS counter visibility. Returns new visibility state (true = visible).
 */
export function toggle_fps_visible(): boolean;

/**
 * Toggle the game pause state. Returns the new state.
 */
export function toggle_pause(): boolean;

/**
 * Try to place a building by BuildingType integer discriminant.
 * Returns typed PlaceBuildingResult struct (ok, idx, kind) on success or error message on failure.
 */
export function try_place_building_by_id(discriminant: number, x: number, y: number): PlaceBuildingResult;

/**
 * Garrison a unit into a building. Returns true if successful.
 * The unit must be a combat unit and adjacent to the building.
 */
export function wasm_garrison_unit(building_index: number, unit_id: number): boolean;

export function wasm_ungarrison_unit(building_index: number, unit_id: number): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_buildcostitem_free: (a: number, b: number) => void;
    readonly __wbg_buildingdetailinfo_free: (a: number, b: number) => void;
    readonly __wbg_buildinginfo_free: (a: number, b: number) => void;
    readonly __wbg_buildingsavedata_free: (a: number, b: number) => void;
    readonly __wbg_buildingtileinfo_free: (a: number, b: number) => void;
    readonly __wbg_camerastate_free: (a: number, b: number) => void;
    readonly __wbg_destructioninfo_free: (a: number, b: number) => void;
    readonly __wbg_gamestatedata_free: (a: number, b: number) => void;
    readonly __wbg_garrisoninfo_free: (a: number, b: number) => void;
    readonly __wbg_get_buildinginfo_complete: (a: number) => number;
    readonly __wbg_get_buildinginfo_garrison: (a: number) => number;
    readonly __wbg_get_buildinginfo_index: (a: number) => number;
    readonly __wbg_get_buildinginfo_kind: (a: number) => number;
    readonly __wbg_get_buildinginfo_max_garrison: (a: number) => number;
    readonly __wbg_get_buildinginfo_owner_id: (a: number) => number;
    readonly __wbg_get_buildinginfo_settlers: (a: number) => number;
    readonly __wbg_get_buildinginfo_x: (a: number) => number;
    readonly __wbg_get_buildinginfo_y: (a: number) => number;
    readonly __wbg_get_buildingtileinfo_active: (a: number) => number;
    readonly __wbg_get_buildingtileinfo_construction: (a: number) => number;
    readonly __wbg_get_buildingtileinfo_destruction_progress: (a: number) => number;
    readonly __wbg_get_buildingtileinfo_kind: (a: number) => number;
    readonly __wbg_get_camerastate_center_x: (a: number) => number;
    readonly __wbg_get_camerastate_center_y: (a: number) => number;
    readonly __wbg_get_camerastate_zoom: (a: number) => number;
    readonly __wbg_get_moraleinfo_morale_percent: (a: number) => number;
    readonly __wbg_get_particleinfo_b: (a: number) => number;
    readonly __wbg_get_particleinfo_life: (a: number) => number;
    readonly __wbg_get_particleinfo_max_life: (a: number) => number;
    readonly __wbg_get_particleinfo_size: (a: number) => number;
    readonly __wbg_get_statsinfo_fps_max: (a: number) => number;
    readonly __wbg_get_statsinfo_fps_sample_count: (a: number) => number;
    readonly __wbg_get_statsinfo_fps_visible: (a: number) => number;
    readonly __wbg_get_tileinfo_resource: (a: number) => number;
    readonly __wbg_get_tileinfo_terrain: (a: number) => number;
    readonly __wbg_get_tileinfo_x: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_carried_tool: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_kind: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_stance: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_state: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_target: (a: number) => number;
    readonly __wbg_get_unitinfo_carried_tool: (a: number) => number;
    readonly __wbg_get_unitinfo_stance: (a: number) => number;
    readonly __wbg_get_unitinfo_state: (a: number) => number;
    readonly __wbg_loadmapresult_free: (a: number, b: number) => void;
    readonly __wbg_loadmodelresult_free: (a: number, b: number) => void;
    readonly __wbg_mapexportdata_free: (a: number, b: number) => void;
    readonly __wbg_moraleinfo_free: (a: number, b: number) => void;
    readonly __wbg_nationinfo_free: (a: number, b: number) => void;
    readonly __wbg_particleinfo_free: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_complete: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_garrison: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_index: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_kind: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_max_garrison: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_owner_id: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_settlers: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_x: (a: number, b: number) => void;
    readonly __wbg_set_buildinginfo_y: (a: number, b: number) => void;
    readonly __wbg_set_buildingtileinfo_active: (a: number, b: number) => void;
    readonly __wbg_set_buildingtileinfo_construction: (a: number, b: number) => void;
    readonly __wbg_set_buildingtileinfo_destruction_progress: (a: number, b: number) => void;
    readonly __wbg_set_buildingtileinfo_kind: (a: number, b: number) => void;
    readonly __wbg_set_camerastate_center_x: (a: number, b: number) => void;
    readonly __wbg_set_camerastate_center_y: (a: number, b: number) => void;
    readonly __wbg_set_camerastate_zoom: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_b: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_life: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_max_life: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_size: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_fps_max: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_fps_sample_count: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_fps_visible: (a: number, b: number) => void;
    readonly __wbg_set_tileinfo_terrain: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_carried_tool: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_kind: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_stance: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_state: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_target: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_carried_tool: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_stance: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_state: (a: number, b: number) => void;
    readonly __wbg_starterresult_free: (a: number, b: number) => void;
    readonly __wbg_statsinfo_free: (a: number, b: number) => void;
    readonly __wbg_unitsavedata_free: (a: number, b: number) => void;
    readonly add_model_instance: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly add_starting_resources: (a: number, b: number) => number;
    readonly buildcostitem_amount: (a: number) => number;
    readonly buildcostitem_resource_discriminant: (a: number) => number;
    readonly buildingdetailinfo_active: (a: number) => number;
    readonly buildingdetailinfo_build_ticks: (a: number) => number;
    readonly buildingdetailinfo_complete: (a: number) => number;
    readonly buildingdetailinfo_construction: (a: number) => number;
    readonly buildingdetailinfo_destruction_progress: (a: number) => number;
    readonly buildingdetailinfo_garrison: (a: number) => number;
    readonly buildingdetailinfo_inputs: (a: number) => [number, number];
    readonly buildingdetailinfo_kind: (a: number) => number;
    readonly buildingdetailinfo_max_garrison: (a: number) => number;
    readonly buildingdetailinfo_max_workers: (a: number) => number;
    readonly buildingdetailinfo_output_buffer: (a: number) => [number, number];
    readonly buildingdetailinfo_outputs: (a: number) => [number, number];
    readonly buildingdetailinfo_producing_tool: (a: number) => number;
    readonly buildingdetailinfo_production_interval: (a: number) => number;
    readonly buildingdetailinfo_workers: (a: number) => [number, number];
    readonly buildingdetailinfo_x: (a: number) => number;
    readonly buildingdetailinfo_y: (a: number) => number;
    readonly buildingsavedata_active: (a: number) => number;
    readonly buildingsavedata_assigned_settlers: (a: number) => [number, number];
    readonly buildingsavedata_construction: (a: number) => number;
    readonly buildingsavedata_input_buffer: (a: number) => [number, number];
    readonly buildingsavedata_kind: (a: number) => number;
    readonly buildingsavedata_max_settlers: (a: number) => number;
    readonly buildingsavedata_output_buffer: (a: number) => [number, number];
    readonly buildingsavedata_production_counter: (a: number) => number;
    readonly buildingsavedata_x: (a: number) => number;
    readonly buildingsavedata_y: (a: number) => number;
    readonly decompress_sav_chunk: (a: number, b: number, c: number) => [number, number];
    readonly export_map_json: () => number;
    readonly formation_move: (a: number, b: number, c: number, d: number) => number;
    readonly gamestatedata_buildings: (a: number) => [number, number];
    readonly gamestatedata_game_time: (a: number) => number;
    readonly gamestatedata_map_elevation: (a: number) => [number, number];
    readonly gamestatedata_map_height: (a: number) => number;
    readonly gamestatedata_map_resource: (a: number) => [number, number];
    readonly gamestatedata_map_terrain: (a: number) => [number, number];
    readonly gamestatedata_map_width: (a: number) => number;
    readonly gamestatedata_resources: (a: number) => [number, number];
    readonly gamestatedata_units: (a: number) => [number, number];
    readonly garrisoninfo_capacity: (a: number) => number;
    readonly garrisoninfo_count: (a: number) => number;
    readonly garrisoninfo_garrisoned: (a: number) => number;
    readonly garrisoninfo_unit_ids: (a: number) => [number, number];
    readonly generate_map: (a: number, b: number, c: number, d: number) => number;
    readonly get_build_cost_by_id: (a: number) => [number, number];
    readonly get_building_at_tile: (a: number, b: number) => number;
    readonly get_building_garrison: (a: number) => number;
    readonly get_building_info: (a: number) => number;
    readonly get_building_summary: () => [number, number];
    readonly get_camera_state: () => number;
    readonly get_draw_calls: () => number;
    readonly get_game_state: () => number;
    readonly get_map_data: () => [number, number];
    readonly get_particles: () => [number, number];
    readonly get_player_nation: () => number;
    readonly get_resource_counts_by_id: () => [number, number];
    readonly get_stats: () => number;
    readonly get_tile_at: (a: number, b: number) => number;
    readonly get_tool_counts: () => [number, number];
    readonly get_unit_info: (a: number) => number;
    readonly get_unit_morale: (a: number) => number;
    readonly get_unit_stance: (a: number) => number;
    readonly get_unit_summary: () => [number, number];
    readonly get_units_in_rect: (a: number, b: number, c: number, d: number) => [number, number];
    readonly init: (a: number, b: number) => [number, number, number];
    readonly is_paused: () => number;
    readonly load_map_json: (a: number, b: number) => number;
    readonly load_model_json: (a: number, b: number, c: number) => number;
    readonly loadmapresult_error: (a: number) => [number, number];
    readonly loadmapresult_ok: (a: number) => number;
    readonly loadmodelresult_error: (a: number) => [number, number];
    readonly loadmodelresult_model_id: (a: number) => number;
    readonly loadmodelresult_ok: (a: number) => number;
    readonly loadmodelresult_tri_count: (a: number) => number;
    readonly mapexportdata_elevation: (a: number) => [number, number];
    readonly mapexportdata_height: (a: number) => number;
    readonly mapexportdata_resource: (a: number) => [number, number];
    readonly mapexportdata_terrain: (a: number) => [number, number];
    readonly mapexportdata_width: (a: number) => number;
    readonly nationinfo_color: (a: number) => [number, number];
    readonly nationinfo_description: (a: number) => [number, number];
    readonly nationinfo_emoji: (a: number) => [number, number];
    readonly nationinfo_name_id: (a: number) => number;
    readonly on_mouse_down: (a: number, b: number) => void;
    readonly on_mouse_move: (a: number, b: number) => void;
    readonly on_mouse_up: () => void;
    readonly on_webgl_context_lost: () => void;
    readonly on_webgl_context_restored: () => void;
    readonly on_wheel: (a: number) => void;
    readonly order_patrol: (a: number, b: number, c: number, d: number) => number;
    readonly recent_combat_count: () => number;
    readonly recent_construction_complete_count: () => number;
    readonly recent_death_count: () => number;
    readonly recent_resource_pickup_count: () => number;
    readonly render: (a: number) => void;
    readonly reset_fps_stats: () => void;
    readonly resize: () => void;
    readonly restore_game_state: (a: number, b: number) => number;
    readonly rotate_camera_azimuth: (a: number) => void;
    readonly set_camera_center: (a: number, b: number) => void;
    readonly set_game_speed: (a: number) => void;
    readonly set_player_nation_by_id: (a: number) => number;
    readonly set_show_full_map: (a: number) => void;
    readonly set_textures_ready: () => void;
    readonly set_tile_terrain: (a: number, b: number, c: number) => number;
    readonly set_units_stance: (a: number, b: number, c: number) => number;
    readonly set_water_normal_ready: () => void;
    readonly setup_starter_base: (a: number) => number;
    readonly spawn_build_effect: (a: number, b: number) => void;
    readonly start_building_destruction: (a: number, b: number) => number;
    readonly starterresult_error: (a: number) => [number, number];
    readonly starterresult_hq_x: (a: number) => number;
    readonly starterresult_hq_y: (a: number) => number;
    readonly starterresult_ok: (a: number) => number;
    readonly starterresult_settlers: (a: number) => number;
    readonly tick_building_destructions: (a: number) => [number, number];
    readonly toggle_editor_grid: () => number;
    readonly toggle_fps_visible: () => number;
    readonly toggle_pause: () => number;
    readonly try_place_building_by_id: (a: number, b: number, c: number) => number;
    readonly unitsavedata_assigned_building: (a: number) => number;
    readonly unitsavedata_hp: (a: number) => number;
    readonly unitsavedata_id: (a: number) => number;
    readonly unitsavedata_kind: (a: number) => number;
    readonly unitsavedata_max_hp: (a: number) => number;
    readonly unitsavedata_stance: (a: number) => number;
    readonly unitsavedata_state: (a: number) => number;
    readonly unitsavedata_target: (a: number) => number;
    readonly unitsavedata_x: (a: number) => number;
    readonly unitsavedata_y: (a: number) => number;
    readonly wasm_garrison_unit: (a: number, b: number) => number;
    readonly wasm_ungarrison_unit: (a: number, b: number) => number;
    readonly __wbg_set_buildingtileinfo_index: (a: number, b: number) => void;
    readonly __wbg_set_destructioninfo_index: (a: number, b: number) => void;
    readonly __wbg_set_moraleinfo_morale_bonus: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_x: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_fps: (a: number, b: number) => void;
    readonly __wbg_set_tileinfo_x: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_id: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_id: (a: number, b: number) => void;
    readonly __wbg_get_tileinfo_elevation: (a: number) => number;
    readonly __wbg_get_particleinfo_r: (a: number) => number;
    readonly __wbg_get_particleinfo_g: (a: number) => number;
    readonly __wbg_get_buildingtileinfo_index: (a: number) => number;
    readonly __wbg_get_statsinfo_zoom: (a: number) => number;
    readonly __wbg_get_statsinfo_game_time: (a: number) => number;
    readonly __wbg_get_statsinfo_frame_time_ms: (a: number) => number;
    readonly __wbg_get_statsinfo_fps_avg: (a: number) => number;
    readonly __wbg_get_statsinfo_fps: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_y: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_x: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_id: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_dying_progress: (a: number) => number;
    readonly __wbg_get_particleinfo_z: (a: number) => number;
    readonly __wbg_get_particleinfo_y: (a: number) => number;
    readonly __wbg_get_unitinfo_y: (a: number) => number;
    readonly __wbg_get_unitinfo_x: (a: number) => number;
    readonly __wbg_get_unitinfo_id: (a: number) => number;
    readonly __wbg_get_destructioninfo_index: (a: number) => number;
    readonly __wbg_set_unitinfo_hp: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_max_hp: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_ticks: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_y: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_fps_min: (a: number, b: number) => void;
    readonly __wbg_set_destructioninfo_y: (a: number, b: number) => void;
    readonly __wbg_set_destructioninfo_x: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_game_time: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_x: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_zoom: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_fps_avg: (a: number, b: number) => void;
    readonly __wbg_set_statsinfo_frame_time_ms: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_y: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_x: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_max_hp: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_hp: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_dying_progress: (a: number, b: number) => void;
    readonly __wbg_set_unitdetailinfo_assigned_building: (a: number, b: number) => void;
    readonly __wbg_set_moraleinfo_morale_percent: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_z: (a: number, b: number) => void;
    readonly __wbg_set_camerastate_vp_w: (a: number, b: number) => void;
    readonly __wbg_set_camerastate_vp_h: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_y: (a: number, b: number) => void;
    readonly __wbg_set_buildingtileinfo_y: (a: number, b: number) => void;
    readonly __wbg_set_buildingtileinfo_x: (a: number, b: number) => void;
    readonly __wbg_set_unitinfo_kind: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_g: (a: number, b: number) => void;
    readonly __wbg_set_particleinfo_r: (a: number, b: number) => void;
    readonly __wbg_set_tileinfo_y: (a: number, b: number) => void;
    readonly __wbg_set_tileinfo_resource: (a: number, b: number) => void;
    readonly __wbg_set_tileinfo_elevation: (a: number, b: number) => void;
    readonly __wbg_get_buildingtileinfo_y: (a: number) => number;
    readonly __wbg_get_buildingtileinfo_x: (a: number) => number;
    readonly __wbg_get_camerastate_vp_w: (a: number) => number;
    readonly __wbg_get_camerastate_vp_h: (a: number) => number;
    readonly __wbg_get_unitinfo_max_hp: (a: number) => number;
    readonly __wbg_get_unitinfo_kind: (a: number) => number;
    readonly __wbg_get_unitinfo_hp: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_max_hp: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_hp: (a: number) => number;
    readonly __wbg_get_destructioninfo_y: (a: number) => number;
    readonly __wbg_get_destructioninfo_x: (a: number) => number;
    readonly __wbg_tileinfo_free: (a: number, b: number) => void;
    readonly __wbg_unitdetailinfo_free: (a: number, b: number) => void;
    readonly __wbg_get_particleinfo_x: (a: number) => number;
    readonly __wbg_get_tileinfo_y: (a: number) => number;
    readonly __wbg_get_moraleinfo_morale_bonus: (a: number) => number;
    readonly __wbg_get_statsinfo_ticks: (a: number) => number;
    readonly __wbg_get_statsinfo_fps_min: (a: number) => number;
    readonly __wbg_get_unitdetailinfo_assigned_building: (a: number) => number;
    readonly __wbg_startingresourcesresult_free: (a: number, b: number) => void;
    readonly __wbg_unitinfo_free: (a: number, b: number) => void;
    readonly __wbg_restorestateresult_free: (a: number, b: number) => void;
    readonly __wbg_placebuildingresult_free: (a: number, b: number) => void;
    readonly startingresourcesresult_ok: (a: number) => number;
    readonly restorestateresult_error: (a: number) => [number, number];
    readonly restorestateresult_ok: (a: number) => number;
    readonly startingresourcesresult_error: (a: number) => [number, number];
    readonly placebuildingresult_kind: (a: number) => number;
    readonly placebuildingresult_ok: (a: number) => number;
    readonly placebuildingresult_idx: (a: number) => number;
    readonly placebuildingresult_error: (a: number) => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
