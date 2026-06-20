/* @ts-self-types="./s4wn_engine.d.ts" */

/**
 * Add a model instance to the render list for this frame.
 * Called from JS each frame for every building/unit to render.
 * @param {string} model_id
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 * @param {number} rotation_y
 * @returns {boolean}
 */
export function add_model_instance(model_id, x, y, scale, rotation_y) {
    const ptr0 = passStringToWasm0(model_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.add_model_instance(ptr0, len0, x, y, scale, rotation_y);
    return ret !== 0;
}

/**
 * Apply starting resources based on difficulty level.
 * Should be called AFTER load_map_json() to seed the new game state.
 * difficulty: "easy" (2× resources), "medium" (1×), "hard" (0.5×)
 * Returns "ok" on success or an error message.
 * @param {string} difficulty
 * @returns {string}
 */
export function add_starting_resources(difficulty) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(difficulty, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.add_starting_resources(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Clear all model instances (called at start of each frame).
 */
export function clear_model_instances() {
    wasm.clear_model_instances();
}

/**
 * Clear all particles.
 */
export function clear_particles() {
    wasm.clear_particles();
}

/**
 * Compute a model-view-projection matrix for a model instance.
 * Takes JSON input: {x, y, scale, rotation_y, view: [16], projection: [16]}
 * Returns JSON array of 16 floats (column-major MVP matrix).
 * @param {string} input_json
 * @returns {string}
 */
export function compute_mvp_json(input_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(input_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.compute_mvp_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Decompress a .sav savegame chunk: ARA-decrypt then LZ+Huffman decompress.
 * Used by the JS .sav loader to extract game data from savegame chunks.
 * Returns the decompressed data, or an empty Vec on failure.
 * @param {Uint8Array} data
 * @param {number} expected_length
 * @returns {Uint8Array}
 */
export function decompress_sav_chunk(data, expected_length) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decompress_sav_chunk(ptr0, len0, expected_length);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Generate a procedural map and return it as a JSON string.
 * map_type: "demo" (currently only one type supported; future: "island", "continents", etc.)
 * width/height: map dimensions (clamped to 16..1024)
 * Returns JSON in the format expected by load_map_json().
 * @param {string} map_type
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
export function generate_map(map_type, width, height) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(map_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.generate_map(ptr0, len0, width, height);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get build cost for a building type. Returns JSON: {"Wood":3} or {"error":"..."}
 * @param {string} kind_name
 * @returns {string}
 */
export function get_build_cost(kind_name) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(kind_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.get_build_cost(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get detailed building info by index.
 * Returns JSON: {"kind":"Farm","x":3,"y":3,"construction":1.0,"complete":true,
 *   "active":true,"settlers":[1],"max_settlers":1,
 *   "build_ticks":20,"production_interval":20,"inputs":[["Wood",2]],
 *   "outputs":[["Planks",1]],"output_buffer":{"Planks":5}}
 * or {"error":"Building not found"}
 * @param {number} idx
 * @returns {string}
 */
export function get_building_info(idx) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_building_info(idx);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get building summary as a JSON string for the HUD.
 * Returns: [{"type":"Farm","x":3,"y":3,"complete":true,"settlers":1},...]
 * @returns {string}
 */
export function get_building_summary() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_building_summary();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get camera state for minimap viewport calculation.
 * Returns JSON: {"center_x":10.5,"center_y":12.3,"zoom":1.0,"vp_w":1280,"vp_h":720}
 * @returns {string}
 */
export function get_camera_state() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_camera_state();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get the current game speed multiplier.
 * @returns {number}
 */
export function get_game_speed() {
    const ret = wasm.get_game_speed();
    return ret;
}

/**
 * Get the complete game state as a JSON string for save/load.
 * Returns JSON with: map_json, resources, buildings, units, game_time, player_name, difficulty, map_type
 * @returns {string}
 */
export function get_game_state() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_game_state();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get the full map as a compact Vec<u8> for minimap rendering.
 * Layout: [width_lo, width_hi, height_lo, height_hi, terrain_byte, terrain_byte, ...]
 * Each tile is one byte (terrain type as u8, matching Terrain enum repr).
 * @returns {Uint8Array}
 */
export function get_map_data() {
    const ret = wasm.get_map_data();
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Get unique building names for a nation as JSON array.
 * @param {string} nation_name
 * @returns {string}
 */
export function get_nation_buildings(nation_name) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(nation_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.get_nation_buildings(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get particles as JSON for JS-side rendering fallback.
 * @returns {string}
 */
export function get_particles_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_particles_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get the player's nation as a JSON string {name, color, emoji, description}
 * Returns empty string if no nation is set.
 * @returns {string}
 */
export function get_player_nation() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_player_nation();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get resource counts as a JSON string for the HUD.
 * Returns: {"Wood":100,"Stone":50,"Iron":0,"Coal":0,"Gold":0,"Grain":0,"Planks":0,...}
 * @returns {string}
 */
export function get_resource_counts() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_resource_counts();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get engine stats as a JSON string (FPS, tick count, game time).
 * @returns {string}
 */
export function get_stats() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_stats();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get territory border tiles for the local player as a JSON string.
 * Returns: [{"x":5,"y":10}, ...] — tiles at the edge of player 0's territory.
 * @returns {string}
 */
export function get_territory_border_tiles_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_territory_border_tiles_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export function get_tile_at(x, y) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_tile_at(x, y);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get tool counts as a JSON string for the HUD.
 * Returns: {"Hammer":3,"Pickaxe":0,"Axe":2,...} — all 11 tool types.
 * @returns {string}
 */
export function get_tool_counts() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_tool_counts();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get detailed unit info by ID.
 * Returns JSON: {"id":1,"kind":"Settler","x":5.5,"y":3.0,"hp":50,"max_hp":50,
 *   "state":"Working","assigned_building":2,"target":null}
 * or {"error":"Unit not found"}
 * @param {number} id
 * @returns {string}
 */
export function get_unit_info(id) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_unit_info(id);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get unit summary as a JSON string for the HUD.
 * Returns: [{"id":1,"kind":"Settler","x":3.5,"y":3.5,"hp":50,"state":"Working"},...]
 * @returns {string}
 */
export function get_unit_summary() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_unit_summary();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Initialize the engine on a canvas element.
 * Returns true on success.
 * @param {string} canvas_id
 * @returns {boolean}
 */
export function init(canvas_id) {
    const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.init(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
}

/**
 * Check if a building type is available for a given nation.
 * Returns "true" or "false".
 * @param {string} building_name
 * @param {string} nation_name
 * @returns {string}
 */
export function is_building_available_for_nation(building_name, nation_name) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(building_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(nation_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.is_building_available_for_nation(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Get the current pause state.
 * @returns {boolean}
 */
export function is_paused() {
    const ret = wasm.is_paused();
    return ret !== 0;
}

/**
 * Get a list of all building types as JSON.
 * Returns: ["Castle","Farm","Sawmill",...]
 * @returns {string}
 */
export function list_building_types() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.list_building_types();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * List all available nation types as a JSON array.
 * @returns {string}
 */
export function list_nations() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.list_nations();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Load a map from JSON string (same format as exported by to_json()).
 * Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":null},...]}
 * Also accepts verbose format: {"width":64,"height":64,"tiles":[{"terrain":"Grass","elevation":0.0,"resource":"Iron"},...]}
 * Returns "ok" on success or an error message.
 * @param {string} json
 * @returns {string}
 */
export function load_map_json(json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.load_map_json(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Load a model from a JSON mesh string, validate it, and upload to GPU buffers.
 * Returns "ok:{name}:{indices}tri" if successful, or "error:{message}" on failure.
 * @param {string} name
 * @param {string} json_str
 * @returns {string}
 */
export function load_model_json(name, json_str) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(json_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.load_model_json(ptr0, len0, ptr1, len1);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Get the number of loaded model instances for this frame.
 * @returns {number}
 */
export function model_instance_count() {
    const ret = wasm.model_instance_count();
    return ret;
}

/**
 * Handle mouse down for panning
 * @param {number} x
 * @param {number} y
 */
export function on_mouse_down(x, y) {
    wasm.on_mouse_down(x, y);
}

/**
 * Handle mouse move for panning
 * @param {number} x
 * @param {number} y
 */
export function on_mouse_move(x, y) {
    wasm.on_mouse_move(x, y);
}

/**
 * Handle mouse up (stop panning)
 */
export function on_mouse_up() {
    wasm.on_mouse_up();
}

/**
 * Handle scroll wheel for zooming
 * @param {number} delta_y
 */
export function on_wheel(delta_y) {
    wasm.on_wheel(delta_y);
}

/**
 * Parse an OBJ model string and return vertex count, triangle count, and AABB as JSON.
 * @param {string} obj_str
 * @returns {string}
 */
export function parse_obj_info(obj_str) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(obj_str, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.parse_obj_info(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Get the number of alive particles.
 * @returns {number}
 */
export function particle_count() {
    const ret = wasm.particle_count();
    return ret;
}

/**
 * Populate model_instances from current game state (buildings).
 * Maps building types to model IDs. Called from JS each frame before render().
 * @returns {number}
 */
export function populate_model_instances_from_game() {
    const ret = wasm.populate_model_instances_from_game();
    return ret;
}

/**
 * Get number of combat hits since last call (drains each frame).
 * Used by JS to trigger combat sound effects.
 * @returns {number}
 */
export function recent_combat_count() {
    const ret = wasm.recent_combat_count();
    return ret;
}

/**
 * Get number of unit deaths since last call (drains each frame).
 * Used by JS to trigger death sound effects.
 * @returns {number}
 */
export function recent_death_count() {
    const ret = wasm.recent_death_count();
    return ret;
}

/**
 * @param {number} timestamp
 */
export function render(timestamp) {
    wasm.render(timestamp);
}

/**
 * Handle window/canvas resize.
 */
export function resize() {
    wasm.resize();
}

/**
 * Restore game state from a JSON save string (produced by get_game_state).
 * Returns "ok" on success or an error message.
 * @param {string} json
 * @returns {string}
 */
export function restore_game_state(json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.restore_game_state(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Phase 5: Set orbital camera azimuth (horizontal orbit), degrees [0–360).
 * @param {number} degrees
 */
export function set_azimuth(degrees) {
    wasm.set_azimuth(degrees);
}

/**
 * Phase 5: Set orbital camera distance from focus, tile units [2–100].
 * @param {number} dist
 */
export function set_distance(dist) {
    wasm.set_distance(dist);
}

/**
 * Phase 5: Set orbital camera elevation (vertical angle), degrees [10–80].
 * @param {number} degrees
 */
export function set_elevation(degrees) {
    wasm.set_elevation(degrees);
}

/**
 * Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
 * @param {number} multiplier
 */
export function set_game_speed(multiplier) {
    wasm.set_game_speed(multiplier);
}

/**
 * Set the game pause state.
 * @param {boolean} paused
 */
export function set_paused(paused) {
    wasm.set_paused(paused);
}

/**
 * Set the player's nation for the current game.
 * Returns true if the nation name was recognized and applied.
 * @param {string} nation_name
 * @returns {boolean}
 */
export function set_player_nation(nation_name) {
    const ptr0 = passStringToWasm0(nation_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.set_player_nation(ptr0, len0);
    return ret !== 0;
}

/**
 * Called from JS after terrain textures are fully loaded into the shared WebGL context.
 * JS creates the TEXTURE_2D_ARRAY with 8 layers (1024×1024), then calls this.
 */
export function set_textures_ready() {
    wasm.set_textures_ready();
}

/**
 * Place a free Castle near map center and spawn starter settlers.
 * Called after load_map_json() + add_starting_resources() to set up the initial base.
 * settler_count: number of idle settlers to spawn (clamped to 1..8).
 * Returns JSON: {"ok":true,"hq_x":N,"hq_y":N,"settlers":N} or {"error":"..."}
 * @param {number} settler_count
 * @returns {string}
 */
export function setup_starter_base(settler_count) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.setup_starter_base(settler_count);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Spawn a green "build success" effect at the given tile.
 * @param {number} tile_x
 * @param {number} tile_y
 */
export function spawn_build_effect(tile_x, tile_y) {
    wasm.spawn_build_effect(tile_x, tile_y);
}

/**
 * Spawn a red/orange "combat hit" effect at the given tile.
 * @param {number} tile_x
 * @param {number} tile_y
 */
export function spawn_combat_effect(tile_x, tile_y) {
    wasm.spawn_combat_effect(tile_x, tile_y);
}

/**
 * Spawn a floating leaf particle (forest ambient).
 * @param {number} tile_x
 * @param {number} tile_y
 */
export function spawn_leaf_effect(tile_x, tile_y) {
    wasm.spawn_leaf_effect(tile_x, tile_y);
}

/**
 * Spawn a single particle.
 * Parameters: x, y, z, vx, vy, vz, life, r, g, b, size
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} vx
 * @param {number} vy
 * @param {number} vz
 * @param {number} life
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} size
 * @returns {boolean}
 */
export function spawn_particle(x, y, z, vx, vy, vz, life, r, g, b, size) {
    const ret = wasm.spawn_particle(x, y, z, vx, vy, vz, life, r, g, b, size);
    return ret !== 0;
}

/**
 * Spawn a burst of particles. Returns number spawned.
 * @param {number} x
 * @param {number} y
 * @param {number} count
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} speed
 * @param {number} life
 * @param {number} size
 * @returns {number}
 */
export function spawn_particle_burst(x, y, count, r, g, b, speed, life, size) {
    const ret = wasm.spawn_particle_burst(x, y, count, r, g, b, speed, life, size);
    return ret >>> 0;
}

/**
 * Spawn chimney smoke puffs at a building location.
 * @param {number} tile_x
 * @param {number} tile_y
 */
export function spawn_smoke_effect(tile_x, tile_y) {
    wasm.spawn_smoke_effect(tile_x, tile_y);
}

/**
 * Toggle the game pause state. Returns the new state.
 * @returns {boolean}
 */
export function toggle_pause() {
    const ret = wasm.toggle_pause();
    return ret !== 0;
}

/**
 * Try to place a building on the map.
 * Takes building type name (e.g. "Farm"), tile x, tile y.
 * Returns JSON: {"ok":true,"idx":0} or {"error":"message"}
 * @param {string} kind_name
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export function try_place_building(kind_name, x, y) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(kind_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.try_place_building(ptr0, len0, x, y);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Connect to a game server via WebSocket.
 * Returns true if connection was initiated.
 * @param {string} _url
 * @returns {boolean}
 */
export function ws_connect(_url) {
    const ptr0 = passStringToWasm0(_url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ws_connect(ptr0, len0);
    return ret !== 0;
}

/**
 * Receive pending network messages as JSON strings.
 * Returns a JSON array of messages.
 * @returns {string}
 */
export function ws_receive() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.ws_receive();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Send a network message (JSON string) to the server.
 * @param {string} _json
 */
export function ws_send(_json) {
    const ptr0 = passStringToWasm0(_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.ws_send(ptr0, len0);
}

/**
 * Get the current network connection state as a string.
 * @returns {string}
 */
export function ws_state() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.ws_state();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_boolean_get_edaed31a367ce1bd: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_8a447059637473e2: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_undefined_721f8decd50c87a3: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_throw_ea4887a5f8f9a9db: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_attachShader_3477e67517b09b6b: function(arg0, arg1, arg2) {
            arg0.attachShader(arg1, arg2);
        },
        __wbg_bindBuffer_d3111de6861cb875: function(arg0, arg1, arg2) {
            arg0.bindBuffer(arg1 >>> 0, arg2);
        },
        __wbg_bindVertexArray_c391bd47303d75cd: function(arg0, arg1) {
            arg0.bindVertexArray(arg1);
        },
        __wbg_blendFunc_b15af02643e188f1: function(arg0, arg1, arg2) {
            arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
        },
        __wbg_bufferData_99bbbc63f02251c4: function(arg0, arg1, arg2, arg3) {
            arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
        },
        __wbg_canvas_97f6270746a06ca5: function(arg0) {
            const ret = arg0.canvas;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_clearColor_0ae8a95dc1112d5f: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.clearColor(arg1, arg2, arg3, arg4);
        },
        __wbg_clear_dadcb3e2929388b0: function(arg0, arg1) {
            arg0.clear(arg1 >>> 0);
        },
        __wbg_clientHeight_af66ce6b5259204b: function(arg0) {
            const ret = arg0.clientHeight;
            return ret;
        },
        __wbg_clientWidth_128226e900ef22eb: function(arg0) {
            const ret = arg0.clientWidth;
            return ret;
        },
        __wbg_compileShader_f5625b583b2c9fd6: function(arg0, arg1) {
            arg0.compileShader(arg1);
        },
        __wbg_createBuffer_9f602b2dbcbf409c: function(arg0) {
            const ret = arg0.createBuffer();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createProgram_4c8164d471c10346: function(arg0) {
            const ret = arg0.createProgram();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createShader_9c5cd42709d915ff: function(arg0, arg1) {
            const ret = arg0.createShader(arg1 >>> 0);
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createVertexArray_8685feb21901c932: function(arg0) {
            const ret = arg0.createVertexArray();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_deleteProgram_eff668280dcb01ca: function(arg0, arg1) {
            arg0.deleteProgram(arg1);
        },
        __wbg_deleteShader_3339454254c7147c: function(arg0, arg1) {
            arg0.deleteShader(arg1);
        },
        __wbg_disable_cb1b3e6c1cee5202: function(arg0, arg1) {
            arg0.disable(arg1 >>> 0);
        },
        __wbg_document_2634180a4c694068: function(arg0) {
            const ret = arg0.document;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_drawArrays_42dbb4b0349c8f34: function(arg0, arg1, arg2, arg3) {
            arg0.drawArrays(arg1 >>> 0, arg2, arg3);
        },
        __wbg_drawElementsInstanced_fdc96cf6adbebc12: function(arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
        },
        __wbg_drawElements_16a22ed8fb2810e3: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
        },
        __wbg_enableVertexAttribArray_4f0f3da1ae1fd116: function(arg0, arg1) {
            arg0.enableVertexAttribArray(arg1 >>> 0);
        },
        __wbg_enable_d1f42f78be33a553: function(arg0, arg1) {
            arg0.enable(arg1 >>> 0);
        },
        __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_getContext_486aab500e1c34c9: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_getElementById_c7aba6b93b34bf01: function(arg0, arg1, arg2) {
            const ret = arg0.getElementById(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_getProgramInfoLog_cd84be80942f345b: function(arg0, arg1, arg2) {
            const ret = arg1.getProgramInfoLog(arg2);
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_getProgramParameter_039391d5ba319f50: function(arg0, arg1, arg2) {
            const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
            return ret;
        },
        __wbg_getShaderInfoLog_495bddda98172699: function(arg0, arg1, arg2) {
            const ret = arg1.getShaderInfoLog(arg2);
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_getShaderParameter_4eb65cfb174ceb22: function(arg0, arg1, arg2) {
            const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
            return ret;
        },
        __wbg_getUniformLocation_ab63f569a4e41744: function(arg0, arg1, arg2, arg3) {
            const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_height_a04613570d793df2: function(arg0) {
            const ret = arg0.height;
            return ret;
        },
        __wbg_instanceof_HtmlCanvasElement_8ce29a370a2b10a4: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLCanvasElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_WebGl2RenderingContext_b30fc72a0130431a: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WebGL2RenderingContext;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_0d356b88a2f77c42: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_linkProgram_e23a348b0f6e0c4f: function(arg0, arg1) {
            arg0.linkProgram(arg1);
        },
        __wbg_log_6b5af08dd293697f: function(arg0) {
            console.log(arg0);
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_now_0f628e0e435c541b: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_parentElement_1fc80201e783ef83: function(arg0) {
            const ret = arg0.parentElement;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_performance_4c23a97261596fec: function(arg0) {
            const ret = arg0.performance;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_set_height_ad5056ea051acd78: function(arg0, arg1) {
            arg0.height = arg1 >>> 0;
        },
        __wbg_set_width_031bdecd763c5855: function(arg0, arg1) {
            arg0.width = arg1 >>> 0;
        },
        __wbg_shaderSource_66dce75b25a1a407: function(arg0, arg1, arg2, arg3) {
            arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
        },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_THIS_2fee5048bcca5938: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_ce44e66a4935da8c: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_44f6e0cb5e67cdad: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_168f178805d978fe: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_uniform1f_3acd3f3eb50b5e11: function(arg0, arg1, arg2) {
            arg0.uniform1f(arg1, arg2);
        },
        __wbg_uniform1i_e4f13604354c28ae: function(arg0, arg1, arg2) {
            arg0.uniform1i(arg1, arg2);
        },
        __wbg_uniform2f_f91d5964cfc18268: function(arg0, arg1, arg2, arg3) {
            arg0.uniform2f(arg1, arg2, arg3);
        },
        __wbg_uniform3f_d1e4c9b540574821: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.uniform3f(arg1, arg2, arg3, arg4);
        },
        __wbg_uniform4f_a5008773cfb47d1a: function(arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
        },
        __wbg_uniformMatrix4fv_61b1a000cfdc35cc: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
        },
        __wbg_useProgram_ab2ee2a13a1fd909: function(arg0, arg1) {
            arg0.useProgram(arg1);
        },
        __wbg_vertexAttribDivisor_f17a8585267be92f: function(arg0, arg1, arg2) {
            arg0.vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
        },
        __wbg_vertexAttribPointer_4e5d289c5d224210: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
        },
        __wbg_viewport_a0ca330f9b85397e: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.viewport(arg1, arg2, arg3, arg4);
        },
        __wbg_width_c8740d5bdf596189: function(arg0) {
            const ret = arg0.width;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(F32)) -> NamedExternref("Float32Array")`.
            const ret = getArrayF32FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U16)) -> NamedExternref("Uint16Array")`.
            const ret = getArrayU16FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./s4wn_engine_bg.js": import0,
    };
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
    if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
        cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint16ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('s4wn_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
