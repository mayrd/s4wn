/* tslint:disable */
/* eslint-disable */

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
 * Get detailed building info by index.
 * Returns JSON: {"kind":"Farm","x":3,"y":3,"construction":1.0,"complete":true,
 *   "active":true,"settlers":[1],"max_settlers":1,
 *   "build_ticks":20,"production_interval":20,"inputs":[["Wood",2]],
 *   "outputs":[["Boards",1]],"output_buffer":{"Boards":5}}
 * or {"error":"Building not found"}
 */
export function get_building_info(idx: number): string;

/**
 * Get building summary as a JSON string for the HUD.
 * Returns: [{"type":"Farm","x":3,"y":3,"complete":true,"settlers":1},...]
 */
export function get_building_summary(): string;

/**
 * Get the current game speed multiplier.
 */
export function get_game_speed(): number;

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
 * Get the player's nation as a JSON string {name, color, emoji, description}
 * Returns empty string if no nation is set.
 */
export function get_player_nation(): string;

/**
 * Get resource counts as a JSON string for the HUD.
 * Returns: {"Wood":100,"Stone":50,"Iron":0,"Coal":0,"Gold":0,"Grain":0,"Boards":0,...}
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
 * Get unit summary as a JSON string for the HUD.
 * Returns: [{"id":1,"kind":"Settler","x":3.5,"y":3.5,"hp":50,"state":"Working"},...]
 */
export function get_unit_summary(): string;

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
 * Get a list of all building types as JSON.
 * Returns: ["Castle","Farm","Sawmill",...]
 */
export function list_building_types(): string;

/**
 * List all available nation types as a JSON array.
 */
export function list_nations(): string;

/**
 * Load a map from JSON string (same format as exported by to_json()).
 * Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":null},...]}
 * Also accepts verbose format: {"width":64,"height":64,"tiles":[{"terrain":"Grass","elevation":0.0,"resource":"Iron"},...]}
 * Returns "ok" on success or an error message.
 */
export function load_map_json(json: string): string;

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
 * Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
 */
export function set_game_speed(multiplier: number): void;

/**
 * Set the game pause state.
 */
export function set_paused(paused: boolean): void;

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
 * Place a free Castle near map center and spawn starter settlers.
 * Called after load_map_json() + add_starting_resources() to set up the initial base.
 * settler_count: number of idle settlers to spawn (clamped to 1..8).
 * Returns JSON: {"ok":true,"hq_x":N,"hq_y":N,"settlers":N} or {"error":"..."}
 */
export function setup_starter_base(settler_count: number): string;

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
 * Connect to a game server via WebSocket.
 * Returns true if connection was initiated.
 */
export function ws_connect(_url: string): boolean;

/**
 * Receive pending network messages as JSON strings.
 * Returns a JSON array of messages.
 */
export function ws_receive(): string;

/**
 * Send a network message (JSON string) to the server.
 */
export function ws_send(_json: string): void;

/**
 * Get the current network connection state as a string.
 */
export function ws_state(): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly add_starting_resources: (a: number, b: number) => [number, number];
    readonly decompress_sav_chunk: (a: number, b: number, c: number) => [number, number];
    readonly generate_map: (a: number, b: number, c: number, d: number) => [number, number];
    readonly get_build_cost: (a: number, b: number) => [number, number];
    readonly get_building_info: (a: number) => [number, number];
    readonly get_building_summary: () => [number, number];
    readonly get_game_speed: () => number;
    readonly get_game_state: () => [number, number];
    readonly get_map_data: () => [number, number];
    readonly get_nation_buildings: (a: number, b: number) => [number, number];
    readonly get_player_nation: () => [number, number];
    readonly get_resource_counts: () => [number, number];
    readonly get_stats: () => [number, number];
    readonly get_tile_at: (a: number, b: number) => [number, number];
    readonly get_tool_counts: () => [number, number];
    readonly get_unit_info: (a: number) => [number, number];
    readonly get_unit_summary: () => [number, number];
    readonly init: (a: number, b: number) => [number, number, number];
    readonly is_paused: () => number;
    readonly list_building_types: () => [number, number];
    readonly list_nations: () => [number, number];
    readonly load_map_json: (a: number, b: number) => [number, number];
    readonly on_mouse_down: (a: number, b: number) => void;
    readonly on_mouse_move: (a: number, b: number) => void;
    readonly on_mouse_up: () => void;
    readonly on_wheel: (a: number) => void;
    readonly render: (a: number) => void;
    readonly resize: () => void;
    readonly restore_game_state: (a: number, b: number) => [number, number];
    readonly set_game_speed: (a: number) => void;
    readonly set_paused: (a: number) => void;
    readonly set_player_nation: (a: number, b: number) => number;
    readonly set_textures_ready: () => void;
    readonly setup_starter_base: (a: number) => [number, number];
    readonly toggle_pause: () => number;
    readonly try_place_building: (a: number, b: number, c: number, d: number) => [number, number];
    readonly ws_connect: (a: number, b: number) => number;
    readonly ws_receive: () => [number, number];
    readonly ws_send: (a: number, b: number) => void;
    readonly ws_state: () => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
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
