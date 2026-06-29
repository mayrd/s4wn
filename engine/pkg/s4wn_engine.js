/* @ts-self-types="./s4wn_engine.d.ts" */

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
    static __wrap(ptr) {
        const obj = Object.create(BuildingDetailInfo.prototype);
        obj.__wbg_ptr = ptr;
        BuildingDetailInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BuildingDetailInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_buildingdetailinfo_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get active() {
        const ret = wasm.buildingdetailinfo_active(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get build_ticks() {
        const ret = wasm.buildingdetailinfo_build_ticks(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get complete() {
        const ret = wasm.buildingdetailinfo_complete(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get construction() {
        const ret = wasm.buildingdetailinfo_construction(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get destruction_progress() {
        const ret = wasm.buildingdetailinfo_destruction_progress(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get garrison() {
        const ret = wasm.buildingdetailinfo_garrison(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get inputs() {
        const ret = wasm.buildingdetailinfo_inputs(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get kind() {
        const ret = wasm.buildingdetailinfo_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_garrison() {
        const ret = wasm.buildingdetailinfo_max_garrison(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get max_workers() {
        const ret = wasm.buildingdetailinfo_max_workers(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get output_buffer() {
        const ret = wasm.buildingdetailinfo_output_buffer(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {Uint32Array}
     */
    get outputs() {
        const ret = wasm.buildingdetailinfo_outputs(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get producing_tool() {
        const ret = wasm.buildingdetailinfo_producing_tool(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get production_interval() {
        const ret = wasm.buildingdetailinfo_production_interval(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get workers() {
        const ret = wasm.buildingdetailinfo_workers(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.buildingdetailinfo_x(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.buildingdetailinfo_y(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) BuildingDetailInfo.prototype[Symbol.dispose] = BuildingDetailInfo.prototype.free;

/**
 * Building information struct — replaces JSON string from get_building_summary.
 * `index` is the position in the buildings array (used for garrison/destruction).
 * `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
 * `settlers` is the count of assigned workers. `garrison` is count of garrisoned soldiers.
 */
export class BuildingInfo {
    static __wrap(ptr) {
        const obj = Object.create(BuildingInfo.prototype);
        obj.__wbg_ptr = ptr;
        BuildingInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BuildingInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_buildinginfo_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get complete() {
        const ret = wasm.__wbg_get_buildinginfo_complete(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get garrison() {
        const ret = wasm.__wbg_get_buildinginfo_garrison(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get index() {
        const ret = wasm.__wbg_get_buildinginfo_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get kind() {
        const ret = wasm.__wbg_get_buildinginfo_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_garrison() {
        const ret = wasm.__wbg_get_buildinginfo_max_garrison(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get owner_id() {
        const ret = wasm.__wbg_get_buildinginfo_owner_id(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get settlers() {
        const ret = wasm.__wbg_get_buildinginfo_settlers(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_buildinginfo_x(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_buildinginfo_y(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {boolean} arg0
     */
    set complete(arg0) {
        wasm.__wbg_set_buildinginfo_complete(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set garrison(arg0) {
        wasm.__wbg_set_buildinginfo_garrison(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set index(arg0) {
        wasm.__wbg_set_buildinginfo_index(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set kind(arg0) {
        wasm.__wbg_set_buildinginfo_kind(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set max_garrison(arg0) {
        wasm.__wbg_set_buildinginfo_max_garrison(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set owner_id(arg0) {
        wasm.__wbg_set_buildinginfo_owner_id(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set settlers(arg0) {
        wasm.__wbg_set_buildinginfo_settlers(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_buildinginfo_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_buildinginfo_y(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) BuildingInfo.prototype[Symbol.dispose] = BuildingInfo.prototype.free;

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
    static __wrap(ptr) {
        const obj = Object.create(BuildingTileInfo.prototype);
        obj.__wbg_ptr = ptr;
        BuildingTileInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BuildingTileInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_buildingtileinfo_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get active() {
        const ret = wasm.__wbg_get_buildingtileinfo_active(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get construction() {
        const ret = wasm.__wbg_get_buildingtileinfo_construction(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get destruction_progress() {
        const ret = wasm.__wbg_get_buildingtileinfo_destruction_progress(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get index() {
        const ret = wasm.__wbg_get_buildingtileinfo_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get kind() {
        const ret = wasm.__wbg_get_buildingtileinfo_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_buildingtileinfo_x(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_buildingtileinfo_y(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {boolean} arg0
     */
    set active(arg0) {
        wasm.__wbg_set_buildingtileinfo_active(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set construction(arg0) {
        wasm.__wbg_set_buildingtileinfo_construction(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set destruction_progress(arg0) {
        wasm.__wbg_set_buildingtileinfo_destruction_progress(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set index(arg0) {
        wasm.__wbg_set_buildingtileinfo_index(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set kind(arg0) {
        wasm.__wbg_set_buildingtileinfo_kind(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_buildingtileinfo_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_buildingtileinfo_y(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) BuildingTileInfo.prototype[Symbol.dispose] = BuildingTileInfo.prototype.free;

/**
 * Garrison info for a building — replaces JSON string from get_building_garrison_json.
 * `unit_ids` are the raw unit IDs of garrisoned soldiers.
 * Uses manual getters because wasm-bindgen requires Copy for public fields and Vec is not Copy.
 */
export class GarrisonInfo {
    static __wrap(ptr) {
        const obj = Object.create(GarrisonInfo.prototype);
        obj.__wbg_ptr = ptr;
        GarrisonInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GarrisonInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_garrisoninfo_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get capacity() {
        const ret = wasm.garrisoninfo_capacity(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get count() {
        const ret = wasm.garrisoninfo_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get garrisoned() {
        const ret = wasm.garrisoninfo_garrisoned(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {Uint32Array}
     */
    get unit_ids() {
        const ret = wasm.garrisoninfo_unit_ids(this.__wbg_ptr);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
}
if (Symbol.dispose) GarrisonInfo.prototype[Symbol.dispose] = GarrisonInfo.prototype.free;

/**
 * Nation information returned by `get_player_nation` — replaces JSON string with typed struct.
 * `name_id` is the NationType discriminant (0=Roman..4=DarkTribe).
 * Fields are accessed via JS getters (no JSON.parse needed).
 */
export class NationInfo {
    static __wrap(ptr) {
        const obj = Object.create(NationInfo.prototype);
        obj.__wbg_ptr = ptr;
        NationInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        NationInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nationinfo_free(ptr, 0);
    }
    /**
     * Color as a hex string (e.g., "#C83232").
     * @returns {string}
     */
    get color() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.nationinfo_color(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Human-readable description of the nation's playstyle.
     * @returns {string}
     */
    get description() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.nationinfo_description(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Emoji icon for HUD display.
     * @returns {string}
     */
    get emoji() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.nationinfo_emoji(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * The NationType discriminant (0=Roman..4=DarkTribe).
     * @returns {number}
     */
    get name_id() {
        const ret = wasm.nationinfo_name_id(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) NationInfo.prototype[Symbol.dispose] = NationInfo.prototype.free;

/**
 * Engine stats returned by `get_stats` — replaces JSON string with typed struct.
 * `fps` is the currently displayed FPS. `ticks` is the game tick counter.
 * `game_time` is the elapsed game time in seconds. `zoom` is the camera zoom factor.
 */
export class StatsInfo {
    static __wrap(ptr) {
        const obj = Object.create(StatsInfo.prototype);
        obj.__wbg_ptr = ptr;
        StatsInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        StatsInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_statsinfo_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get fps() {
        const ret = wasm.__wbg_get_statsinfo_fps(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get game_time() {
        const ret = wasm.__wbg_get_statsinfo_game_time(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get ticks() {
        const ret = wasm.__wbg_get_statsinfo_ticks(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get zoom() {
        const ret = wasm.__wbg_get_statsinfo_zoom(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set fps(arg0) {
        wasm.__wbg_set_statsinfo_fps(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set game_time(arg0) {
        wasm.__wbg_set_statsinfo_game_time(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set ticks(arg0) {
        wasm.__wbg_set_statsinfo_ticks(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set zoom(arg0) {
        wasm.__wbg_set_statsinfo_zoom(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) StatsInfo.prototype[Symbol.dispose] = StatsInfo.prototype.free;

/**
 * Tile information returned by `get_tile_at` — replaces JSON string with typed struct.
 * `resource` is -1 when no resource is present on the tile.
 */
export class TileInfo {
    static __wrap(ptr) {
        const obj = Object.create(TileInfo.prototype);
        obj.__wbg_ptr = ptr;
        TileInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TileInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tileinfo_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get elevation() {
        const ret = wasm.__wbg_get_tileinfo_elevation(this.__wbg_ptr);
        return ret;
    }
    /**
     * Resource discriminant, or -1 if none.
     * @returns {number}
     */
    get resource() {
        const ret = wasm.__wbg_get_tileinfo_resource(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get terrain() {
        const ret = wasm.__wbg_get_tileinfo_terrain(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_tileinfo_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_tileinfo_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set elevation(arg0) {
        wasm.__wbg_set_tileinfo_elevation(this.__wbg_ptr, arg0);
    }
    /**
     * Resource discriminant, or -1 if none.
     * @param {number} arg0
     */
    set resource(arg0) {
        wasm.__wbg_set_tileinfo_resource(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set terrain(arg0) {
        wasm.__wbg_set_tileinfo_terrain(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_tileinfo_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_tileinfo_y(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) TileInfo.prototype[Symbol.dispose] = TileInfo.prototype.free;

/**
 * Detailed unit info for a single unit by ID.
 * sentinel 0 for None: assigned_building offset +1 (actual index+1), target raw ID (IDs start at 1).
 * dying_progress is 0.0 when not dying.
 */
export class UnitDetailInfo {
    static __wrap(ptr) {
        const obj = Object.create(UnitDetailInfo.prototype);
        obj.__wbg_ptr = ptr;
        UnitDetailInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        UnitDetailInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_unitdetailinfo_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get assigned_building() {
        const ret = wasm.__wbg_get_unitdetailinfo_assigned_building(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get carried_tool() {
        const ret = wasm.__wbg_get_unitdetailinfo_carried_tool(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get dying_progress() {
        const ret = wasm.__wbg_get_unitdetailinfo_dying_progress(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get hp() {
        const ret = wasm.__wbg_get_unitdetailinfo_hp(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get id() {
        const ret = wasm.__wbg_get_unitdetailinfo_id(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get kind() {
        const ret = wasm.__wbg_get_unitdetailinfo_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_hp() {
        const ret = wasm.__wbg_get_unitdetailinfo_max_hp(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get stance() {
        const ret = wasm.__wbg_get_unitdetailinfo_stance(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get state() {
        const ret = wasm.__wbg_get_unitdetailinfo_state(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get target() {
        const ret = wasm.__wbg_get_unitdetailinfo_target(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_unitdetailinfo_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_unitdetailinfo_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set assigned_building(arg0) {
        wasm.__wbg_set_unitdetailinfo_assigned_building(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set carried_tool(arg0) {
        wasm.__wbg_set_unitdetailinfo_carried_tool(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set dying_progress(arg0) {
        wasm.__wbg_set_unitdetailinfo_dying_progress(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set hp(arg0) {
        wasm.__wbg_set_unitdetailinfo_hp(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set id(arg0) {
        wasm.__wbg_set_unitdetailinfo_id(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set kind(arg0) {
        wasm.__wbg_set_unitdetailinfo_kind(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set max_hp(arg0) {
        wasm.__wbg_set_unitdetailinfo_max_hp(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set stance(arg0) {
        wasm.__wbg_set_unitdetailinfo_stance(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set state(arg0) {
        wasm.__wbg_set_unitdetailinfo_state(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set target(arg0) {
        wasm.__wbg_set_unitdetailinfo_target(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_unitdetailinfo_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_unitdetailinfo_y(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) UnitDetailInfo.prototype[Symbol.dispose] = UnitDetailInfo.prototype.free;

/**
 * Unit information struct — replaces JSON string from get_unit_summary.
 * `kind` is the UnitKind discriminant (use UNIT_NAMES_BY_ID in JS).
 * `state` discriminant: 0=Idle, 1=Moving, 2=Working, 3=Fighting, 4=Patrolling, 5=FormationMove, 6=Dying, 7=Dead.
 * `stance` discriminant: 0=Aggressive, 1=StandGround, 2=Passive.
 * `carried_tool` is the tool code discriminant, or 255 if none.
 */
export class UnitInfo {
    static __wrap(ptr) {
        const obj = Object.create(UnitInfo.prototype);
        obj.__wbg_ptr = ptr;
        UnitInfoFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        UnitInfoFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_unitinfo_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get carried_tool() {
        const ret = wasm.__wbg_get_unitinfo_carried_tool(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get hp() {
        const ret = wasm.__wbg_get_unitinfo_hp(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get id() {
        const ret = wasm.__wbg_get_unitinfo_id(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get kind() {
        const ret = wasm.__wbg_get_unitinfo_kind(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_hp() {
        const ret = wasm.__wbg_get_unitinfo_max_hp(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get stance() {
        const ret = wasm.__wbg_get_unitinfo_stance(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get state() {
        const ret = wasm.__wbg_get_unitinfo_state(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get x() {
        const ret = wasm.__wbg_get_unitinfo_x(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get y() {
        const ret = wasm.__wbg_get_unitinfo_y(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set carried_tool(arg0) {
        wasm.__wbg_set_unitinfo_carried_tool(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set hp(arg0) {
        wasm.__wbg_set_unitinfo_hp(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set id(arg0) {
        wasm.__wbg_set_unitinfo_id(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set kind(arg0) {
        wasm.__wbg_set_unitinfo_kind(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set max_hp(arg0) {
        wasm.__wbg_set_unitinfo_max_hp(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set stance(arg0) {
        wasm.__wbg_set_unitinfo_stance(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set state(arg0) {
        wasm.__wbg_set_unitinfo_state(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set x(arg0) {
        wasm.__wbg_set_unitinfo_x(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set y(arg0) {
        wasm.__wbg_set_unitinfo_y(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) UnitInfo.prototype[Symbol.dispose] = UnitInfo.prototype.free;

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
 * Export the current map as a JSON string (same format as load_map_json expects).
 * Returns the JSON string on success, or an error string if no map is loaded.
 * @returns {string}
 */
export function export_map_json() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.export_map_json();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Order a set of units to move in formation to a target tile.
 * Each unit maintains its relative offset from the group center.
 * unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
 * Returns the number of units successfully ordered to move.
 * @param {Uint32Array} unit_ids
 * @param {number} target_x
 * @param {number} target_y
 * @returns {number}
 */
export function formation_move(unit_ids, target_x, target_y) {
    const ptr0 = passArray32ToWasm0(unit_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.formation_move(ptr0, len0, target_x, target_y);
    return ret >>> 0;
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
 * Get build cost by BuildingType integer discriminant (JSON with integer keys).
 * @param {number} discriminant
 * @returns {string}
 */
export function get_build_cost_by_id(discriminant) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_build_cost_by_id(discriminant);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get building info at a tile position. Returns Some(BuildingTileInfo) or None.
 * @param {number} tile_x
 * @param {number} tile_y
 * @returns {BuildingTileInfo | undefined}
 */
export function get_building_at_tile(tile_x, tile_y) {
    const ret = wasm.get_building_at_tile(tile_x, tile_y);
    return ret === 0 ? undefined : BuildingTileInfo.__wrap(ret);
}

/**
 * Get garrison info for a building at the given index.
 * Returns None if building not found or game not initialized.
 * @param {number} building_index
 * @returns {GarrisonInfo | undefined}
 */
export function get_building_garrison(building_index) {
    const ret = wasm.get_building_garrison(building_index);
    return ret === 0 ? undefined : GarrisonInfo.__wrap(ret);
}

/**
 * Get detailed building info by index.
 * Returns Some(BuildingDetailInfo) or None if index is out of bounds.
 * Eliminates JSON.parse() at showBuildingInfo() call sites.
 * @param {number} idx
 * @returns {BuildingDetailInfo | undefined}
 */
export function get_building_info(idx) {
    const ret = wasm.get_building_info(idx);
    return ret === 0 ? undefined : BuildingDetailInfo.__wrap(ret);
}

/**
 * Returns building data as a typed Vec<BuildingInfo> — no JSON parse needed in JS.
 * Use BUILDING_NAMES_BY_ID[info.kind] for the building name.
 * @returns {BuildingInfo[]}
 */
export function get_building_summary() {
    const ret = wasm.get_building_summary();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
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
 * @returns {number}
 */
export function get_draw_calls() {
    const ret = wasm.get_draw_calls();
    return ret >>> 0;
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
 * Get the player's nation as a typed NationInfo struct.
 * Returns `None` if no nation is set.
 * @returns {NationInfo | undefined}
 */
export function get_player_nation() {
    const ret = wasm.get_player_nation();
    return ret === 0 ? undefined : NationInfo.__wrap(ret);
}

/**
 * Get resource counts as a dense Vec<u32> indexed by ResourceType discriminant.
 * Returns a Vec with max_discriminant+1 elements; invalid/gap indices are 0.
 * JS callers can index directly: counts[disc] — no JSON.parse() needed.
 * Use RESOURCE_NAMES_BY_ID (data.js) for JS-side name lookup.
 * @returns {Uint32Array}
 */
export function get_resource_counts_by_id() {
    const ret = wasm.get_resource_counts_by_id();
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Get engine stats as a typed struct (replaces JSON string, eliminating JSON.parse()).
 * @returns {StatsInfo | undefined}
 */
export function get_stats() {
    const ret = wasm.get_stats();
    return ret === 0 ? undefined : StatsInfo.__wrap(ret);
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {TileInfo | undefined}
 */
export function get_tile_at(x, y) {
    const ret = wasm.get_tile_at(x, y);
    return ret === 0 ? undefined : TileInfo.__wrap(ret);
}

/**
 * Get tool counts as a Vec<u32> indexed by ToolType discriminant (0=Hammer through 10=Bow).
 * Returns 11-element array. JS callers iterate with index, no JSON.parse() needed.
 * Use TOOL_ICONS_BY_ID / TOOL_NAMES_BY_ID (in index.html) for JS-side name/icon lookup.
 * @returns {Uint32Array}
 */
export function get_tool_counts() {
    const ret = wasm.get_tool_counts();
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Get detailed unit info by ID.
 * Returns Option<UnitDetailInfo> — wasm-bindgen converts to JS object or undefined.
 * Uses integer discriminants for state/stance/kind/carried_tool (see JS lookup arrays).
 * assigned_building is building_index + 1 (0 = None). target is raw unit ID (0 = None, IDs start at 1).
 * @param {number} id
 * @returns {UnitDetailInfo | undefined}
 */
export function get_unit_info(id) {
    const ret = wasm.get_unit_info(id);
    return ret === 0 ? undefined : UnitDetailInfo.__wrap(ret);
}

/**
 * Get morale bonus for a unit by ID.
 * Returns JSON: {"morale_bonus":0.15,"morale_percent":"15%"}
 * or {"morale_bonus":0.0,"morale_percent":"0%"} if unit not found.
 * @param {number} unit_id
 * @returns {string}
 */
export function get_unit_morale_json(unit_id) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_unit_morale_json(unit_id);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get the current stance of a unit.
 * Returns: 0=Aggressive, 1=StandGround, 2=Passive. Returns 0 if unit not found.
 * @param {number} unit_id
 * @returns {number}
 */
export function get_unit_stance(unit_id) {
    const ret = wasm.get_unit_stance(unit_id);
    return ret;
}

/**
 * Returns unit data as a typed Vec<UnitInfo> — no JSON parse needed in JS.
 * Use UNIT_NAMES_BY_ID[info.kind] for the unit name.
 * @returns {UnitInfo[]}
 */
export function get_unit_summary() {
    const ret = wasm.get_unit_summary();
    var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Get military units within a world-coordinate rectangle.
 * Returns JSON array of unit IDs for Swordsman and Bowman within [min_x, max_x] x [min_y, max_y].
 * Used for Shift+drag marquee selection in the UI.
 * Returns: [{"id":1,"kind":"Swordsman","x":3.5,"y":4.0,"hp":100,"state":"Idle"},...]
 * @param {number} min_x
 * @param {number} min_y
 * @param {number} max_x
 * @param {number} max_y
 * @returns {string}
 */
export function get_units_in_rect(min_x, min_y, max_x, max_y) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_units_in_rect(min_x, min_y, max_x, max_y);
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
 * Get the current pause state.
 * @returns {boolean}
 */
export function is_paused() {
    const ret = wasm.is_paused();
    return ret !== 0;
}

/**
 * Load a map from JSON string (same format as exported by to_json()).
 * Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":0},...]}
 * t=terrain id (0-7), e=elevation, r=map::Resource discriminant (0-7) or null
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
 * Order selected units to patrol between their current position and a target tile.
 * unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
 * Returns: number of units successfully ordered to patrol.
 * @param {Uint32Array} unit_ids
 * @param {number} target_x
 * @param {number} target_y
 * @returns {number}
 */
export function order_patrol(unit_ids, target_x, target_y) {
    const ptr0 = passArray32ToWasm0(unit_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.order_patrol(ptr0, len0, target_x, target_y);
    return ret >>> 0;
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
 * Receive pending network messages as JSON strings.
 * Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
 * @param {number} multiplier
 */
export function set_game_speed(multiplier) {
    wasm.set_game_speed(multiplier);
}

/**
 * Set the player's nation by discriminant integer for the current game.
 * Returns true if the discriminant was recognized and applied.
 * @param {number} discriminant
 * @returns {boolean}
 */
export function set_player_nation_by_id(discriminant) {
    const ret = wasm.set_player_nation_by_id(discriminant);
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
 * Set the terrain type at a tile position (map editor).
 * terrain_id: 0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow
 * @param {number} x
 * @param {number} y
 * @param {number} terrain_id
 * @returns {boolean}
 */
export function set_tile_terrain(x, y, terrain_id) {
    const ret = wasm.set_tile_terrain(x, y, terrain_id);
    return ret !== 0;
}

/**
 * Set stance for selected units.
 * unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
 * Returns the number of units whose stance was successfully set.
 * @param {Uint32Array} unit_ids
 * @param {number} stance
 * @returns {number}
 */
export function set_units_stance(unit_ids, stance) {
    const ptr0 = passArray32ToWasm0(unit_ids, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.set_units_stance(ptr0, len0, stance);
    return ret >>> 0;
}

/**
 * Called from JS after water normal map is loaded into TEXTURE1.
 */
export function set_water_normal_ready() {
    wasm.set_water_normal_ready();
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
 * Spawn a single particle.
 * Parameters: x, y, z, vx, vy, vz, life, r, g, b, size
 * Spawn a burst of particles. Returns number spawned.
 * Spawn a green "build success" effect at the given tile.
 * @param {number} tile_x
 * @param {number} tile_y
 */
export function spawn_build_effect(tile_x, tile_y) {
    wasm.spawn_build_effect(tile_x, tile_y);
}

/**
 * Start the destruction animation for a building at the given index.
 * `duration_secs` controls how long the scale-down animation plays (e.g. 1.5).
 * Returns true if the building exists and destruction was started.
 * @param {number} building_index
 * @param {number} duration_secs
 * @returns {boolean}
 */
export function start_building_destruction(building_index, duration_secs) {
    const ret = wasm.start_building_destruction(building_index, duration_secs);
    return ret !== 0;
}

/**
 * Tick destruction timers for all buildings by `dt` seconds.
 * Returns JSON array of completed destructions: [{"index":N,"x":N,"y":N}, ...]
 * JS should call this each frame and remove buildings from the model list.
 * @param {number} dt
 * @returns {string}
 */
export function tick_building_destructions(dt) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.tick_building_destructions(dt);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Toggle map editor grid overlay on/off. Returns new state.
 * @returns {boolean}
 */
export function toggle_editor_grid() {
    const ret = wasm.toggle_editor_grid();
    return ret !== 0;
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
 * Try to place a building by BuildingType integer discriminant.
 * Returns JSON: {"ok":true,"idx":0,"kind":5} or {"error":"message"}
 * @param {number} discriminant
 * @param {number} x
 * @param {number} y
 * @returns {string}
 */
export function try_place_building_by_id(discriminant, x, y) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.try_place_building_by_id(discriminant, x, y);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Garrison a unit into a building. Returns true if successful.
 * The unit must be a combat unit and adjacent to the building.
 * @param {number} building_index
 * @param {number} unit_id
 * @returns {boolean}
 */
export function wasm_garrison_unit(building_index, unit_id) {
    const ret = wasm.wasm_garrison_unit(building_index, unit_id);
    return ret !== 0;
}

/**
 * @param {number} building_index
 * @param {number} unit_id
 * @returns {boolean}
 */
export function wasm_ungarrison_unit(building_index, unit_id) {
    const ret = wasm.wasm_ungarrison_unit(building_index, unit_id);
    return ret !== 0;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_boolean_get_fa956cfa2d1bd751: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_c25d447a39f5578f: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_is_undefined_c05833b95a3cf397: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_number_get_394265ed1e1b84ee: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_throw_344f42d3211c4765: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_activeTexture_d12958674e97a118: function(arg0, arg1) {
            arg0.activeTexture(arg1 >>> 0);
        },
        __wbg_attachShader_8971266b4c9bc514: function(arg0, arg1, arg2) {
            arg0.attachShader(arg1, arg2);
        },
        __wbg_bindBuffer_1e00cfb4321ef9a4: function(arg0, arg1, arg2) {
            arg0.bindBuffer(arg1 >>> 0, arg2);
        },
        __wbg_bindFramebuffer_390311eff3896937: function(arg0, arg1, arg2) {
            arg0.bindFramebuffer(arg1 >>> 0, arg2);
        },
        __wbg_bindRenderbuffer_c3d0c4b8cd1c3891: function(arg0, arg1, arg2) {
            arg0.bindRenderbuffer(arg1 >>> 0, arg2);
        },
        __wbg_bindTexture_28eff4bbd8aaab54: function(arg0, arg1, arg2) {
            arg0.bindTexture(arg1 >>> 0, arg2);
        },
        __wbg_bindVertexArray_427eeac0c1764d8a: function(arg0, arg1) {
            arg0.bindVertexArray(arg1);
        },
        __wbg_blendFunc_114dc7056ccfeb8d: function(arg0, arg1, arg2) {
            arg0.blendFunc(arg1 >>> 0, arg2 >>> 0);
        },
        __wbg_bufferData_90ef588bac2be2f5: function(arg0, arg1, arg2, arg3) {
            arg0.bufferData(arg1 >>> 0, arg2, arg3 >>> 0);
        },
        __wbg_buildinginfo_new: function(arg0) {
            const ret = BuildingInfo.__wrap(arg0);
            return ret;
        },
        __wbg_canvas_43a747ae656569f8: function(arg0) {
            const ret = arg0.canvas;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_clearColor_9152d82998e32a1e: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.clearColor(arg1, arg2, arg3, arg4);
        },
        __wbg_clear_dd06a0da4ce8e13f: function(arg0, arg1) {
            arg0.clear(arg1 >>> 0);
        },
        __wbg_compileShader_9bdfd792722cf704: function(arg0, arg1) {
            arg0.compileShader(arg1);
        },
        __wbg_createBuffer_01568a9d930d90dd: function(arg0) {
            const ret = arg0.createBuffer();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createFramebuffer_de0d521f546e7534: function(arg0) {
            const ret = arg0.createFramebuffer();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createProgram_538c9777a4ac084f: function(arg0) {
            const ret = arg0.createProgram();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createRenderbuffer_9d801bf44c314f44: function(arg0) {
            const ret = arg0.createRenderbuffer();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createShader_7d139f2d50f77365: function(arg0, arg1) {
            const ret = arg0.createShader(arg1 >>> 0);
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createTexture_d13f98e0d3d912f4: function(arg0) {
            const ret = arg0.createTexture();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_createVertexArray_baf9eef7ea5a2c7a: function(arg0) {
            const ret = arg0.createVertexArray();
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_deleteProgram_132e191baa9fa84f: function(arg0, arg1) {
            arg0.deleteProgram(arg1);
        },
        __wbg_deleteShader_993edb4beb3c4d53: function(arg0, arg1) {
            arg0.deleteShader(arg1);
        },
        __wbg_disable_1659d1b7d50c31e7: function(arg0, arg1) {
            arg0.disable(arg1 >>> 0);
        },
        __wbg_document_179650d6cb13c263: function(arg0) {
            const ret = arg0.document;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_drawArraysInstanced_51b161548a3f10c4: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.drawArraysInstanced(arg1 >>> 0, arg2, arg3, arg4);
        },
        __wbg_drawArrays_b0c59a6e158122f2: function(arg0, arg1, arg2, arg3) {
            arg0.drawArrays(arg1 >>> 0, arg2, arg3);
        },
        __wbg_drawElementsInstanced_c7f96ea02e6d5326: function(arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.drawElementsInstanced(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
        },
        __wbg_drawElements_44c54d328f546528: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
        },
        __wbg_enableVertexAttribArray_7470ba2dcf2606e3: function(arg0, arg1) {
            arg0.enableVertexAttribArray(arg1 >>> 0);
        },
        __wbg_enable_28bbeed576131d1f: function(arg0, arg1) {
            arg0.enable(arg1 >>> 0);
        },
        __wbg_framebufferRenderbuffer_ba8bd5e008ee87eb: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4);
        },
        __wbg_framebufferTexture2D_3c2abd606fc53f31: function(arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4, arg5);
        },
        __wbg_getContext_ca12bb65aab778a4: function() { return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg0.getContext(getStringFromWasm0(arg1, arg2), arg3);
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments); },
        __wbg_getElementById_1cbd8f06dbe8eb8e: function(arg0, arg1, arg2) {
            const ret = arg0.getElementById(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_getProgramInfoLog_d1ce570463a68779: function(arg0, arg1, arg2) {
            const ret = arg1.getProgramInfoLog(arg2);
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_getProgramParameter_c8d1154fbb3c0890: function(arg0, arg1, arg2) {
            const ret = arg0.getProgramParameter(arg1, arg2 >>> 0);
            return ret;
        },
        __wbg_getShaderInfoLog_5cee2add982c7165: function(arg0, arg1, arg2) {
            const ret = arg1.getShaderInfoLog(arg2);
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_getShaderParameter_3394e75dcb97f380: function(arg0, arg1, arg2) {
            const ret = arg0.getShaderParameter(arg1, arg2 >>> 0);
            return ret;
        },
        __wbg_getUniformLocation_788a34295dd6fabe: function(arg0, arg1, arg2, arg3) {
            const ret = arg0.getUniformLocation(arg1, getStringFromWasm0(arg2, arg3));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_height_6eec812c213259a1: function(arg0) {
            const ret = arg0.height;
            return ret;
        },
        __wbg_innerHeight_92315939e482496d: function() { return handleError(function (arg0) {
            const ret = arg0.innerHeight;
            return ret;
        }, arguments); },
        __wbg_innerWidth_dec7d2ac73df3e63: function() { return handleError(function (arg0) {
            const ret = arg0.innerWidth;
            return ret;
        }, arguments); },
        __wbg_instanceof_HtmlCanvasElement_ed02ed9136056019: function(arg0) {
            let result;
            try {
                result = arg0 instanceof HTMLCanvasElement;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_WebGl2RenderingContext_90225152e4e3c799: function(arg0) {
            let result;
            try {
                result = arg0 instanceof WebGL2RenderingContext;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_05ba1ee4f6781663: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_linkProgram_4e047fb3197a0348: function(arg0, arg1) {
            arg0.linkProgram(arg1);
        },
        __wbg_log_d267660666346fb3: function(arg0) {
            console.log(arg0);
        },
        __wbg_new_da52cf8fe3429cb2: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_now_390768da5ee9e776: function(arg0) {
            const ret = arg0.now();
            return ret;
        },
        __wbg_performance_3ef602e13d6c3b56: function(arg0) {
            const ret = arg0.performance;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_renderbufferStorage_0a8de92542893819: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
        },
        __wbg_set_height_7d9d8f892e6964c6: function(arg0, arg1) {
            arg0.height = arg1 >>> 0;
        },
        __wbg_set_preserve_drawing_buffer_703206eb2ff7c0bf: function(arg0, arg1) {
            arg0.preserveDrawingBuffer = arg1 !== 0;
        },
        __wbg_set_width_8e30d010cd66830d: function(arg0, arg1) {
            arg0.width = arg1 >>> 0;
        },
        __wbg_shaderSource_c3469dc2221dd528: function(arg0, arg1, arg2, arg3) {
            arg0.shaderSource(arg1, getStringFromWasm0(arg2, arg3));
        },
        __wbg_static_accessor_GLOBAL_4ef717fb391d88b7: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_146583524fe1469b: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_f2829a2234d7819e: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_texImage2D_5c8a1060d1f4a267: function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
            arg0.texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9 === 0 ? undefined : getArrayU8FromWasm0(arg9, arg10));
        }, arguments); },
        __wbg_texParameteri_1fc451e0964fc91c: function(arg0, arg1, arg2, arg3) {
            arg0.texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
        },
        __wbg_uniform1f_62692c8fa8e7bf1e: function(arg0, arg1, arg2) {
            arg0.uniform1f(arg1, arg2);
        },
        __wbg_uniform1i_7621f908f78177df: function(arg0, arg1, arg2) {
            arg0.uniform1i(arg1, arg2);
        },
        __wbg_uniform2f_9240db2fb8813967: function(arg0, arg1, arg2, arg3) {
            arg0.uniform2f(arg1, arg2, arg3);
        },
        __wbg_uniform3f_8b107d795db4b07d: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.uniform3f(arg1, arg2, arg3, arg4);
        },
        __wbg_uniform4f_9ff60fc65b0ed726: function(arg0, arg1, arg2, arg3, arg4, arg5) {
            arg0.uniform4f(arg1, arg2, arg3, arg4, arg5);
        },
        __wbg_uniformMatrix4fv_423b958042692150: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.uniformMatrix4fv(arg1, arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
        },
        __wbg_unitinfo_new: function(arg0) {
            const ret = UnitInfo.__wrap(arg0);
            return ret;
        },
        __wbg_useProgram_49495850b446fa56: function(arg0, arg1) {
            arg0.useProgram(arg1);
        },
        __wbg_vertexAttribDivisor_fb31b5ed9bc856da: function(arg0, arg1, arg2) {
            arg0.vertexAttribDivisor(arg1 >>> 0, arg2 >>> 0);
        },
        __wbg_vertexAttribPointer_a8f0af57269c2067: function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            arg0.vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
        },
        __wbg_viewport_affdf15c559df1e2: function(arg0, arg1, arg2, arg3, arg4) {
            arg0.viewport(arg1, arg2, arg3, arg4);
        },
        __wbg_width_6d9315ecc7140ff6: function(arg0) {
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

const BuildingDetailInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_buildingdetailinfo_free(ptr, 1));
const BuildingInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_buildinginfo_free(ptr, 1));
const BuildingTileInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_buildingtileinfo_free(ptr, 1));
const GarrisonInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_garrisoninfo_free(ptr, 1));
const NationInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_nationinfo_free(ptr, 1));
const StatsInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_statsinfo_free(ptr, 1));
const TileInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tileinfo_free(ptr, 1));
const UnitDetailInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_unitdetailinfo_free(ptr, 1));
const UnitInfoFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_unitinfo_free(ptr, 1));

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

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU16FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint16ArrayMemory0().subarray(ptr / 2, ptr / 2 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
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

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
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

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
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
    cachedUint32ArrayMemory0 = null;
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
