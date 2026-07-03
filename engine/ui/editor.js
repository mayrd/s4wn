/**
 * S4WN Map Editor Component
 */

import {
    generate_map,
    load_map_json,
    export_map_json
} from '../pkg/s4wn_engine.js?v=101';

export const TERRAIN_TYPES = [
    {id:0, name:"Grass", icon:"Grs"},
    {id:1, name:"Forest", icon:"Frs"},
    {id:2, name:"Mountain", icon:"Mtn"},
    {id:3, name:"Water", icon:"Wtr"},
    {id:4, name:"Deep Water", icon:"DpW"},
    {id:5, name:"Desert", icon:"Dsr"},
    {id:6, name:"Swamp", icon:"Swp"},
    {id:7, name:"Snow", icon:"Sno"}
];

window._editorTerrain = window._editorTerrain || 0;

export function populateTerrainPalette() {
    var grid = document.getElementById("editor-terrain-grid");
    if (!grid) return;
    var html = "";
    for (var i = 0; i < TERRAIN_TYPES.length; i++) {
        var t = TERRAIN_TYPES[i];
        var sel = window._editorTerrain === t.id ? " selected" : "";
        html += "<div class=\"editor-terrain-item" + sel + "\" data-terrain=\"" + t.id + "\" onclick=\"selectEditorTerrain(" + t.id + ")\">";
        html += "<span class=\"editor-terrain-icon\">" + t.icon + "</span>";
        html += "<span class=\"editor-terrain-name\">" + t.name + "</span>";
        html += "</div>";
    }
    grid.innerHTML = html;
}

export function selectEditorTerrain(id) {
    window._editorTerrain = id;
    populateTerrainPalette();
}

// Reconstruct JSON string from typed MapExportData (used by generate_map + editor)
export function mapExportDataToJson(data) {
    var w = data.width(), h = data.height();
    var terrain = data.terrain(), elevation = data.elevation(), resource = data.resource();
    var tiles = [];
    var n = w * h;
    for (var i = 0; i < n; i++) {
        var r = resource[i];
        tiles.push('{"t":' + terrain[i] +
            ',"e":' + elevation[i].toFixed(3) +
            ',"r":' + (r === -1 ? "null" : r) + '}');
    }
    return '{"width":' + w + ',"height":' + h + ',"tiles":[' + tiles.join(",") + ']}';
}

export function exportMapJson() {
    try {
        if (typeof export_map_json !== "function") {
            alert("export_map_json not available — WASM may not be loaded");
            return;
        }
        var data = export_map_json();
        if (!data) {
            alert("error: no map loaded");
            return;
        }
        var w = data.width(), h = data.height();
        var terrain = data.terrain(), elevation = data.elevation(), resource = data.resource();
        var tiles = [];
        var n = w * h;
        for (var i = 0; i < n; i++) {
            var r = resource[i];
            tiles.push('{"t":' + terrain[i] +
                ',"e":' + elevation[i].toFixed(3) +
                ',"r":' + (r === -1 ? "null" : r) + '}');
        }
        var json = '{"width":' + w + ',"height":' + h + ',"tiles":[' + tiles.join(",") + ']}';
        var blob = new Blob([json], {type: "application/json"});
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "s4wn_map.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        alert("Export failed: " + e.message);
    }
}

export function openEditor() {
    if (typeof window.closeMenu === "function") window.closeMenu();
    var dlg = document.getElementById("editor-launch-dialog");
    if (dlg) {
        var fi = document.getElementById("eld-file-input");
        if (fi) fi.value = '';
        dlg.classList.add("open");
    }
}

export function closeEditorLaunch() {
    var dlg = document.getElementById("editor-launch-dialog");
    if (dlg) dlg.classList.remove("open");
}

export function startEditorNewMap() {
    var w = parseInt(document.getElementById("eld-new-w")?.value) || 64;
    var h = parseInt(document.getElementById("eld-new-h")?.value) || 64;
    w = Math.max(16, Math.min(256, w));
    h = Math.max(16, Math.min(256, h));
    if (!window.engineReady || !generate_map || !load_map_json) {
        alert(window.t ? window.t('engine_not_ready') : 'Engine not ready');
        return;
    }
    closeEditorLaunch();
    if (typeof window.showLoading === "function") window.showLoading("Generating " + w + "×" + h + " map...");
    try {
        var mapData = generate_map("grassland", w, h);
        var mapJson = mapExportDataToJson(mapData);
        var result = load_map_json(mapJson);
        if (!result.ok) {
            alert('Map load failed: ' + result.error);
            if (typeof window.hideLoading === "function") window.hideLoading();
            return;
        }
    } catch(e) {
        alert('Error: ' + e.message);
        if (typeof window.hideLoading === "function") window.hideLoading();
        return;
    }
    if (typeof window.hideLoading === "function") window.hideLoading();
    openEditorPalette();
}

export function startEditorFromFile() {
    var fi = document.getElementById("eld-file-input");
    if (!fi || !fi.files || !fi.files[0]) {
        alert('Please select a file first.');
        return;
    }
    if (!window.engineReady || !load_map_json) {
        alert(window.t ? window.t('engine_not_ready') : 'Engine not ready');
        return;
    }
    closeEditorLaunch();
    var file = fi.files[0];
    window._s4wn_load_for_editor = true;
    if (typeof window.loadFile === "function") window.loadFile(file);
}

export function toggleEditorMode() {
    var palette = document.getElementById("editor-terrain-palette");
    var active = false;
    try {
        if (typeof window.toggle_editor_grid === "function") {
            active = window.toggle_editor_grid();
        }
    } catch(e) {}
    if (palette) {
        if (active) {
            populateTerrainPalette();
            palette.classList.add("open");
        } else {
            palette.classList.remove("open");
        }
    }
}

export function openEditorPalette() {
    var palette = document.getElementById("editor-terrain-palette");
    if (palette) {
        populateTerrainPalette();
        palette.classList.add("open");
    }
    try { if (typeof window.toggle_editor_grid === "function") window.toggle_editor_grid(); } catch(e) {}
}

// Bind to window
window.populateTerrainPalette = populateTerrainPalette;
window.selectEditorTerrain = selectEditorTerrain;
window.exportMapJson = exportMapJson;
window.openEditor = openEditor;
window.closeEditorLaunch = closeEditorLaunch;
window.startEditorNewMap = startEditorNewMap;
window.startEditorFromFile = startEditorFromFile;
window.toggleEditorMode = toggleEditorMode;
window.openEditorPalette = openEditorPalette;
