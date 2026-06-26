/* tslint:disable */
/* eslint-disable */

/**
 * Add a model instance to the render list for this frame.
 * Called from JS each frame for every building/unit to render.
 */
export function add_model_instance(model_id: string, x: number, y: number, scale: number, rotation_y: number): boolean;

/**
 * Apply starting resources based on difficulty level.
 * Should be called AFTER load_map_json() to seed the new game state.
 * difficulty: "easy" (2× resources), "medium" (1×), "hard" (0.5×)
 * Returns "ok" on success or an error message.
 */
export function add_starting_resources(difficulty: string): string;

/**
 * Decompress a .sav savegame chunk: ARA-decrypt then LZ+Huffman decompress.
 * Used by the JS .sav loader to extract game data from savegame chunks.
 * Returns the decompressed data, or an empty Vec on failure.
 */
export function decompress_sav_chunk(data: Uint8Array, expected_length: number): Uint8Array;

/**
 * Export the current map as a JSON string (same format as load_map_json expects).
 * Returns the JSON string on success, or an error string if no map is loaded.
 */
export function export_map_json(): string;

/**
 * Order a set of units to move in formation to a target tile.
 * Each unit maintains its relative offset from the group center.
 * unit_ids_json: JSON array of unit IDs, e.g. [1,2,3]
 * Returns the number of units successfully ordered to move.
 */
export function formation_move(unit_ids_json: string, target_x: number, target_y: number): number;

/**
 * Generate a procedural map and return it as a JSON string.
 * map_type: "demo" (currently only one type supported; future: "island", "continents", etc.)
 * width/height: map dimensions (clamped to 16..1024)
 * Returns JSON in the format expected by load_map_json().
 */
export function generate_map(map_type: string, width: number, height: number): string;

/**
 * Get build cost for a building type. Returns JSON: {"Wood":3} or {"error":"..."}
 */
export function get_build_cost(kind_name: string): string;

/**
 * Returns the remaining HP, or 0 if the building doesn't exist.
 * Get the max HP of a building at the given index. Returns 0 if not found.
 * Get building info at a tile position. Returns JSON or "null" if no building.
 */
export function get_building_at_tile(tile_x: number, tile_y: number): string;

/**
 * Get garrison info for a building at the given index.
 * Returns JSON: {"count":2,"capacity":6,"unit_ids":[1,2],"garrisoned":true}
 * or {"count":0,"capacity":0,"unit_ids":[],"garrisoned":false} if building not found.
 */
export function get_building_garrison_json(building_index: number): string;

/**
 * Get detailed building info by index.
 * Returns JSON: {"kind":"Farm","x":3,"y":3,"construction":1.0,"complete":true,
 *   "active":true,"settlers":[1],"max_settlers":1,
 *   "build_ticks":20,"production_interval":20,"inputs":[["Wood",2]],
 *   "outputs":[["Planks",1]],"output_buffer":{"Planks":5}}
 * or {"error":"Building not found"}
 */
export function get_building_info(idx: number): string;

/**
 * Returns: [{"type":"Farm","x":3,"y":3,"complete":true,"settlers":1,"owner_id":0,"garrison":0,"max_garrison":0},...]
 */
export function get_building_summary(): string;

/**
 * Get camera state for minimap viewport calculation.
 * Returns JSON: {"center_x":10.5,"center_y":12.3,"zoom":1.0,"vp_w":1280,"vp_h":720}
 */
export function get_camera_state(): string;

export function get_draw_calls(): number;

/**
 * Get the complete game state as a JSON string for save/load.
 * Returns JSON with: map_json, resources, buildings, units, game_time, player_name, difficulty, map_type
 */
export function get_game_state(): string;

/**
 * Get the full map as a compact Vec<u8> for minimap rendering.
 * Layout: [width_lo, width_hi, height_lo, height_hi, terrain_byte, terrain_byte, ...]
 * Each tile is one byte (terrain type as u8, matching Terrain enum repr).
 */
export function get_map_data(): Uint8Array;

/**
 * Get unique building names for a nation as JSON array.
 */
export function get_nation_buildings(nation_name: string): string;

/**
 * Get particles as JSON for JS-side rendering fallback.
 */
export function get_particles_json(): string;

/**
 * Get the player's nation as a JSON string {name, color, emoji, description}
 * Returns empty string if no nation is set.
 */
export function get_player_nation(): string;

/**
 * Get resource counts as a JSON string for the HUD.
 * Returns: {"Wood":100,"Stone":50,"Iron":0,"Coal":0,"Gold":0,"Grain":0,"Planks":0,...}
 */
export function get_resource_counts(): string;

/**
 * Get engine stats as a JSON string (FPS, tick count, game time).
 */
export function get_stats(): string;

export function get_tile_at(x: number, y: number): string;

/**
 * Get tool counts as a JSON string for the HUD.
 * Returns: {"Hammer":3,"Pickaxe":0,"Axe":2,...} — all 11 tool types.
 */
export function get_tool_counts(): string;

/**
 * Get detailed unit info by ID.
 * Returns JSON: {"id":1,"kind":"Settler","x":5.5,"y":3.0,"hp":50,"max_hp":50,
 *   "state":"Working","assigned_building":2,"target":null}
 * or {"error":"Unit not found"}
 */
export function get_unit_info(id: number): string;

/**
 * Get morale bonus for a unit by ID.
 * Returns JSON: {"morale_bonus":0.15,"morale_percent":"15%"}
 * or {"morale_bonus":0.0,"morale_percent":"0%"} if unit not found.
 */
export function get_unit_morale_json(unit_id: number): string;

/**
 * Get the current stance of a unit.
 * Returns: 0=Aggressive, 1=StandGround, 2=Passive. Returns 0 if unit not found.
 */
export function get_unit_stance(unit_id: number): number;

/**
 * Get unit summary as a JSON string for the HUD.
 * Returns: [{"id":1,"kind":"Settler","x":3.5,"y":3.5,"hp":50,"max_hp":50,"state":"Working"},...]
 */
export function get_unit_summary(): string;

/**
 * Get military units within a world-coordinate rectangle.
 * Returns JSON array of unit IDs for Swordsman and Bowman within [min_x, max_x] x [min_y, max_y].
 * Used for Shift+drag marquee selection in the UI.
 * Returns: [{"id":1,"kind":"Swordsman","x":3.5,"y":4.0,"hp":100,"state":"Idle"},...]
 */
export function get_units_in_rect(min_x: number, min_y: number, max_x: number, max_y: number): string;

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
 * Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":null},...]}
 * Also accepts verbose format: {"width":64,"height":64,"tiles":[{"terrain":"Grass","elevation":0.0,"resource":"Iron"},...]}
 * Returns "ok" on success or an error message.
 */
export function load_map_json(json: string): string;

/**
 * Load a model from a JSON mesh string, validate it, and upload to GPU buffers.
 * Returns "ok:{name}:{indices}tri" if successful, or "error:{message}" on failure.
 */
export function load_model_json(name: string, json_str: string): string;

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
 * Handle scroll wheel for zooming
 */
export function on_wheel(delta_y: number): void;

/**
 * unit_ids_json: JSON array of unit IDs, e.g. "[1,2,3]"
 * unit_ids_json: JSON array of unit IDs, e.g. "[1,2,3]"
 * Returns: number of units successfully ordered to patrol
 */
export function order_patrol(unit_ids_json: string, target_x: number, target_y: number): number;

/**
 * Get number of combat hits since last call (drains each frame).
 * Used by JS to trigger combat sound effects.
 */
export function recent_combat_count(): number;

/**
 * Get number of unit deaths since last call (drains each frame).
 * Used by JS to trigger death sound effects.
 */
export function recent_death_count(): number;

export function render(timestamp: number): void;

/**
 * Handle window/canvas resize.
 */
export function resize(): void;

/**
 * Restore game state from a JSON save string (produced by get_game_state).
 * Returns "ok" on success or an error message.
 */
export function restore_game_state(json: string): string;

/**
 * Receive pending network messages as JSON strings.
 * Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
 */
export function set_game_speed(multiplier: number): void;

/**
 * Set the player's nation for the current game.
 * Returns true if the nation name was recognized and applied.
 */
export function set_player_nation(nation_name: string): boolean;

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
 * unit_ids_json: JSON array of unit IDs, e.g. "[1,2,3]"
 * Returns the number of units whose stance was successfully set.
 */
export function set_units_stance(unit_ids_json: string, stance: number): number;

/**
 * Called from JS after water normal map is loaded into TEXTURE1.
 */
export function set_water_normal_ready(): void;

/**
 * Place a free Castle near map center and spawn starter settlers.
 * Called after load_map_json() + add_starting_resources() to set up the initial base.
 * settler_count: number of idle settlers to spawn (clamped to 1..8).
 * Returns JSON: {"ok":true,"hq_x":N,"hq_y":N,"settlers":N} or {"error":"..."}
 */
export function setup_starter_base(settler_count: number): string;

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
 * Returns JSON array of completed destructions: [{"index":N,"x":N,"y":N}, ...]
 * JS should call this each frame and remove buildings from the model list.
 */
export function tick_building_destructions(dt: number): string;

/**
 * Toggle map editor grid overlay on/off. Returns new state.
 */
export function toggle_editor_grid(): boolean;

/**
 * Toggle the game pause state. Returns the new state.
 */
export function toggle_pause(): boolean;

/**
 * Try to place a building on the map.
 * Takes building type name (e.g. "Farm"), tile x, tile y.
 * Returns JSON: {"ok":true,"idx":0} or {"error":"message"}
 */
export function try_place_building(kind_name: string, x: number, y: number): string;

/**
 * Garrison a unit into a building. Returns true if successful.
 * The unit must be a combat unit and adjacent to the building.
 */
export function wasm_garrison_unit(building_index: number, unit_id: number): boolean;

export function wasm_ungarrison_unit(building_index: number, unit_id: number): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly add_model_instance: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly add_starting_resources: (a: number, b: number) => [number, number];
    readonly decompress_sav_chunk: (a: number, b: number, c: number) => [number, number];
    readonly export_map_json: () => [number, number];
    readonly formation_move: (a: number, b: number, c: number, d: number) => number;
    readonly generate_map: (a: number, b: number, c: number, d: number) => [number, number];
    readonly get_build_cost: (a: number, b: number) => [number, number];
    readonly get_building_at_tile: (a: number, b: number) => [number, number];
    readonly get_building_garrison_json: (a: number) => [number, number];
    readonly get_building_info: (a: number) => [number, number];
    readonly get_building_summary: () => [number, number];
    readonly get_camera_state: () => [number, number];
    readonly get_draw_calls: () => number;
    readonly get_game_state: () => [number, number];
    readonly get_map_data: () => [number, number];
    readonly get_nation_buildings: (a: number, b: number) => [number, number];
    readonly get_particles_json: () => [number, number];
    readonly get_player_nation: () => [number, number];
    readonly get_resource_counts: () => [number, number];
    readonly get_stats: () => [number, number];
    readonly get_tile_at: (a: number, b: number) => [number, number];
    readonly get_tool_counts: () => [number, number];
    readonly get_unit_info: (a: number) => [number, number];
    readonly get_unit_morale_json: (a: number) => [number, number];
    readonly get_unit_stance: (a: number) => number;
    readonly get_unit_summary: () => [number, number];
    readonly get_units_in_rect: (a: number, b: number, c: number, d: number) => [number, number];
    readonly init: (a: number, b: number) => [number, number, number];
    readonly is_paused: () => number;
    readonly load_map_json: (a: number, b: number) => [number, number];
    readonly load_model_json: (a: number, b: number, c: number, d: number) => [number, number];
    readonly on_mouse_down: (a: number, b: number) => void;
    readonly on_mouse_move: (a: number, b: number) => void;
    readonly on_mouse_up: () => void;
    readonly on_wheel: (a: number) => void;
    readonly order_patrol: (a: number, b: number, c: number, d: number) => number;
    readonly recent_combat_count: () => number;
    readonly recent_death_count: () => number;
    readonly render: (a: number) => void;
    readonly resize: () => void;
    readonly restore_game_state: (a: number, b: number) => [number, number];
    readonly set_game_speed: (a: number) => void;
    readonly set_player_nation: (a: number, b: number) => number;
    readonly set_textures_ready: () => void;
    readonly set_tile_terrain: (a: number, b: number, c: number) => number;
    readonly set_units_stance: (a: number, b: number, c: number) => number;
    readonly set_water_normal_ready: () => void;
    readonly setup_starter_base: (a: number) => [number, number];
    readonly spawn_build_effect: (a: number, b: number) => void;
    readonly start_building_destruction: (a: number, b: number) => number;
    readonly tick_building_destructions: (a: number) => [number, number];
    readonly toggle_editor_grid: () => number;
    readonly toggle_pause: () => number;
    readonly try_place_building: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasm_garrison_unit: (a: number, b: number) => number;
    readonly wasm_ungarrison_unit: (a: number, b: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
