/* tslint:disable */
/* eslint-disable */

/**
 * Get building summary as a JSON string for the HUD.
 * Returns: [{"type":"Farm","x":3,"y":3,"complete":true,"workers":1},...]
 */
export function get_building_summary(): string;

/**
 * Get the full map as a compact Vec<u8> for minimap rendering.
 * Layout: [width_lo, width_hi, height_lo, height_hi, terrain_byte, terrain_byte, ...]
 * Each tile is one byte (terrain type as u8, matching Terrain enum repr).
 */
export function get_map_data(): Uint8Array;

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
 * Get unit summary as a JSON string for the HUD.
 * Returns: [{"id":1,"kind":"Worker","x":3.5,"y":3.5,"hp":50,"state":"Working"},...]
 */
export function get_unit_summary(): string;

/**
 * Initialize the engine on a canvas element.
 * Returns true on success.
 */
export function init(canvas_id: string): boolean;

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

/**
 * Render one frame. Call this from requestAnimationFrame.
 */
export function render(timestamp: number): void;

/**
 * Handle window/canvas resize.
 */
export function resize(): void;

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
    readonly get_building_summary: () => [number, number];
    readonly get_map_data: () => [number, number];
    readonly get_resource_counts: () => [number, number];
    readonly get_stats: () => [number, number];
    readonly get_tile_at: (a: number, b: number) => [number, number];
    readonly get_unit_summary: () => [number, number];
    readonly init: (a: number, b: number) => [number, number, number];
    readonly load_map_json: (a: number, b: number) => [number, number];
    readonly on_mouse_down: (a: number, b: number) => void;
    readonly on_mouse_move: (a: number, b: number) => void;
    readonly on_mouse_up: () => void;
    readonly on_wheel: (a: number) => void;
    readonly render: (a: number) => void;
    readonly resize: () => void;
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
