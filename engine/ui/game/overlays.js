/**
 * S4WN Game Overlays Component
 * Contains Main Menu, Settings, New Game overlay, Loading screen, Error Handler, and Tutorial Engine.
 */

import {
    decompress_sav_chunk,
    load_map_json,
    set_player_nation_by_id,
    add_starting_resources,
    setup_starter_base,
    get_game_state,
    restore_game_state,
    generate_map
} from '../../pkg/s4wn_engine.js?v=101';

// ── Translation & i18n System ──────────────────────────────────────────────
export const LANG = {
    en: {
        new_game: '🆕 New Game',
        settings: '⚙️ Settings',
        continue_game: '💾 Continue',
        menu_title: 'S4WN — Siedler Community',
        new_game_title: '🆕 Start New Campaign',
        settings_title: '⚙️ Audio & Display Options',
        map_preview: '🗺️ Map Preview',
        pause: 'PAUSED',
        menu_btn: 'Menu',
        build: 'Build',
        drop_zone: 'Drag & Drop .map/.sav/.json here to load',
        loading_resources: 'Loading...',
        tools_zero: 'No tools',
        failed_new_game: 'Failed to start new game: ',
        generating_world: 'Generating world...',
        generating_terrain: 'Generating terrain...',
        building_landscape: 'Building landscape...',
        preparing_resources: 'Preparing resources...',
        ready: 'Ready!',
        failed_restore: 'Failed to restore game: ',
        no_saved_game: 'No saved game found',
        map_saved_game: 'Map: Auto-Save Game',
        none_yet: 'None yet',
        load_map: '📂 Load Custom Map',
        engine_not_ready: 'Engine not ready. Please wait...',
        no_resources: 'No resources',
        error_loading: 'Error loading data',
        settlers_total: 'Total Settlers',
        settlers_working: 'Working',
        settlers_idle: 'Idle',
        map_label: 'Map',
        kb_load_map: 'Load custom map',
        kb_settings: 'Open settings panel',
        kb_pause: 'Toggle game pause',
        kb_speed1: 'Set speed to 1×',
        kb_speed2: 'Set speed to 2×',
        kb_speed4: 'Set speed to 4×',
        kb_build: 'Toggle construction panel',
        kb_escape: 'Close open panel / selection',
        kb_menu: 'Toggle main menu overlay',
        kb_click: 'Select tile / place building',
        kb_drag: 'Pan the camera',
        kb_scroll: 'Zoom camera in/out',
        load_custom_map: '📂 Load custom map...',
        speed_tooltip: 'Game Speed',
        speed_1x: '1× Speed',
        speed_2x: '2× Speed',
        speed_4x: '4× Speed',
        speed_pause: '⏸ Pause',
        detail_low: 'Low',
        detail_med: 'Med',
        detail_high: 'High',
    },
    de: {
        new_game: '🆕 Neues Spiel',
        settings: '⚙️ Einstellungen',
        continue_game: '💾 Fortsetzen',
        menu_title: 'S4WN — Siedler Community',
        new_game_title: '🆕 Neue Kampagne starten',
        settings_title: '⚙️ Audio & Grafik-Optionen',
        map_preview: '🗺️ Kartenvorschau',
        pause: 'PAUSE',
        menu_btn: 'Menü',
        build: 'Bauen',
        drop_zone: 'Zieh eine .map/.sav/.json Datei hierher',
        loading_resources: 'Lade...',
        tools_zero: 'Keine Werkzeuge',
        failed_new_game: 'Fehler beim Spielstart: ',
        generating_world: 'Generiere Welt...',
        generating_terrain: 'Erstelle Terrain...',
        building_landscape: 'Baue Landschaft...',
        preparing_resources: 'Bereite Ressourcen vor...',
        ready: 'Bereit!',
        failed_restore: 'Fortsetzen fehlgeschlagen: ',
        no_saved_game: 'Kein Spielstand gefunden',
        map_saved_game: 'Karte: Auto-Save Spielstand',
        none_yet: 'Noch keine',
        load_map: '📂 Eigene Karte laden',
        engine_not_ready: 'Engine nicht bereit. Bitte warten...',
        no_resources: 'Keine Ressourcen',
        error_loading: 'Fehler beim Laden',
        settlers_total: 'Siedler gesamt',
        settlers_working: 'Arbeitend',
        settlers_idle: 'Untätig',
        map_label: 'Karte',
        kb_load_map: 'Eigene Karte laden',
        kb_settings: 'Einstellungen öffnen',
        kb_pause: 'Pause umschalten',
        kb_speed1: 'Geschwindigkeit 1×',
        kb_speed2: 'Geschwindigkeit 2×',
        kb_speed4: 'Geschwindigkeit 4×',
        kb_build: 'Baumenü öffnen',
        kb_escape: 'Auswahl/Menü schließen',
        kb_menu: 'Hauptmenü öffnen/schließen',
        kb_click: 'Auswählen / Bauplatz wählen',
        kb_drag: 'Kamera bewegen',
        kb_scroll: 'Kamera zoomen',
        load_custom_map: '📂 Eigene Karte laden...',
        speed_tooltip: 'Spielgeschwindigkeit',
        speed_1x: '1× Tempo',
        speed_2x: '2× Tempo',
        speed_4x: '4× Tempo',
        speed_pause: '⏸ Pause',
        detail_low: 'Niedrig',
        detail_med: 'Mittel',
        detail_high: 'Hoch',
    }
};

window.currentLang = window.currentLang || 'en';

export function t(key) {
    const lang = LANG[window.currentLang] || LANG['en'];
    return lang[key] || LANG['en'][key] || key;
}
window.t = t;

export function detectLanguage() {
    const browserLang = (navigator.language || 'en').split('-')[0];
    const supported = ['en', 'de', 'es', 'fr'];
    return supported.includes(browserLang) ? browserLang : 'en';
}

export function setLanguage(lang) {
    if (lang === 'auto') {
        lang = detectLanguage();
    }
    window.currentLang = lang;
    if (window.settings) window.settings.language = lang;
    applyLanguage();
    if (typeof window.saveSettings === 'function') window.saveSettings();
}
window.setLanguage = setLanguage;

export function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) {
            if (el.querySelector('kbd')) {
                // Skip
            } else if (el.hasAttribute('data-i18n-text')) {
                el.textContent = text;
            } else if (el.tagName === 'OPTION' || el.querySelector('kbd')) {
                // Skip
            } else if (el.children.length === 0) {
                el.textContent = text;
            }
        }
    });

    const menuTitle = document.querySelector('#main-menu h2');
    if (menuTitle) menuTitle.textContent = t('menu_title');

    const btnLoad = document.getElementById('btn-load');
    if (btnLoad) btnLoad.textContent = t('load_map');

    const btnContinue = document.getElementById('btn-continue');
    if (btnContinue && btnContinue.style.display !== 'none') {
        const meta = getSavedGameMeta();
        if (meta && meta.gameTime !== null) {
            btnContinue.textContent = `💾 ${t('continue_game').replace('💾 ', '')} (${formatGameTime(meta.gameTime)})`;
        } else {
            btnContinue.textContent = t('continue_game');
        }
    }

    const settingsTitle = document.querySelector('#settings-panel .settings-header h3');
    if (settingsTitle) settingsTitle.textContent = t('settings_title');

    const ngTitle = document.querySelector('#new-game-panel h3');
    if (ngTitle) ngTitle.textContent = t('new_game_title');

    const mpTitle = document.querySelector('#map-preview-panel h3');
    if (mpTitle) mpTitle.textContent = t('map_preview');

    const pauseText = document.querySelector('.pause-text');
    if (pauseText) pauseText.textContent = t('pause');

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const text = t(key);
        if (text) el.setAttribute('title', text);
    });

    document.querySelectorAll('#bottom-left-btns .btn-label[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) el.textContent = text;
    });

    if (typeof window.updateSpeedButton === 'function') window.updateSpeedButton();

    const btLabel = document.querySelector('.bt-label');
    if (btLabel) btLabel.textContent = t('build');

    const controlsBtn = document.querySelector('#controls button');
    if (controlsBtn) controlsBtn.textContent = t('menu_btn');

    const dropMsg = document.querySelector('#drop-zone .msg');
    if (dropMsg) dropMsg.textContent = t('drop_zone');

    const resPlaceholder = document.querySelector('#resource-bar .res-placeholder');
    if (resPlaceholder) resPlaceholder.textContent = t('loading_resources');

    const toolPlaceholder = document.querySelector('#tool-bar .res-placeholder');
    if (toolPlaceholder) toolPlaceholder.textContent = t('tools_zero');

    renderKeyBindings();

    document.querySelectorAll('#ng-map option').forEach(opt => {
        if (opt.value === 'custom') {
            opt.textContent = t('load_custom_map');
        }
    });

    const recentList = document.getElementById('recent-list');
    if (recentList && recentList.querySelector('.recent-empty')) {
        recentList.querySelector('.recent-empty').textContent = t('none_yet');
    }

    if (document.getElementById('resources-panel').classList.contains('open') && typeof window.renderResources === 'function') {
        window.renderResources();
    }
    if (document.getElementById('settlers-panel').classList.contains('open') && typeof window.renderSettlers === 'function') {
        window.renderSettlers();
    }

    const langEl = document.querySelector('#set-language');
    if (langEl) langEl.value = window.currentLang;

    // HTML lang attribute
    document.documentElement.lang = window.currentLang;
}
window.applyLanguage = applyLanguage;

export function tCategory(name) {
    if (window.currentLang === 'de' && window.CATEGORY_NAMES_DE && window.CATEGORY_NAMES_DE[name]) {
        return window.CATEGORY_NAMES_DE[name];
    }
    return name;
}
window.tCategory = tCategory;

export function tTerrain(name) {
    if (window.currentLang === 'de' && window.TERRAIN_NAMES_DE && window.TERRAIN_NAMES_DE[name]) {
        return window.TERRAIN_NAMES_DE[name];
    }
    return name;
}
window.tTerrain = tTerrain;

export function tUnit(name) {
    if (window.currentLang === 'de' && window.UNIT_NAMES_DE && window.UNIT_NAMES_DE[name]) {
        return window.UNIT_NAMES_DE[name];
    }
    return name;
}
window.tUnit = tUnit;

export function tResource(name) {
    if (window.currentLang === 'de' && window.RESOURCE_NAMES_DE && window.RESOURCE_NAMES_DE[name]) {
        return window.RESOURCE_NAMES_DE[name];
    }
    return name;
}
window.tResource = tResource;

export function formatGameTime(ticks) {
    const sec = Math.floor(ticks / 10);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}
window.formatGameTime = formatGameTime;

// ── Settings System ─────────────────────────────────────────────────────────
export const SETTINGS_DEFAULTS = {
    zoomSpeed: 1.0,
    terrainDetail: 1,   // 0=Low, 1=Med, 2=High
    masterVolume: 80,
    musicOn: true,
    sfxOn: true,
    mouseSensitivity: 1.0,
    invertScroll: false,
    language: 'auto',
};

export const SETTINGS_KEY = 's4wn-settings';
window.settings = {};

export function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        window.settings = raw ? {...SETTINGS_DEFAULTS, ...JSON.parse(raw)} : {...SETTINGS_DEFAULTS};
    } catch {
        window.settings = {...SETTINGS_DEFAULTS};
    }
    if (!window.settings.language) window.settings.language = 'auto';
    syncSettingsToUI();
}
window.loadSettings = loadSettings;

export function saveSettings() {
    window.settings.zoomSpeed = parseFloat(document.getElementById('set-zoom').value);
    window.settings.terrainDetail = parseInt(document.getElementById('set-detail').value);
    window.settings.masterVolume = parseInt(document.getElementById('set-master-vol').value);
    window.settings.musicOn = document.getElementById('set-music').checked;
    window.settings.sfxOn = document.getElementById('set-sfx').checked;
    window.settings.mouseSensitivity = parseFloat(document.getElementById('set-mouse-sens').value);
    window.settings.invertScroll = document.getElementById('set-invert-scroll').checked;
    const langEl = document.getElementById('set-language');
    if (langEl) window.settings.language = langEl.value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(window.settings));
}
window.saveSettings = saveSettings;

export function syncSettingsToUI() {
    document.getElementById('set-zoom').value = window.settings.zoomSpeed;
    document.getElementById('set-detail').value = window.settings.terrainDetail;
    document.getElementById('set-master-vol').value = window.settings.masterVolume;
    document.getElementById('set-music').checked = window.settings.musicOn;
    document.getElementById('set-sfx').checked = window.settings.sfxOn;
    document.getElementById('set-mouse-sens').value = window.settings.mouseSensitivity;
    document.getElementById('set-invert-scroll').checked = window.settings.invertScroll;
    const langEl = document.getElementById('set-language');
    if (langEl) langEl.value = window.settings.language || 'auto';
    updateAllSettingVals();
}
window.syncSettingsToUI = syncSettingsToUI;

export function updateSettingVal(id) {
    const el = document.getElementById(id);
    const valEl = document.getElementById('val-' + id);
    if (!valEl) return;
    switch (id) {
        case 'set-zoom':
            valEl.textContent = parseFloat(el.value).toFixed(1);
            break;
        case 'set-detail':
            valEl.textContent = [t('detail_low'), t('detail_med'), t('detail_high')][parseInt(el.value)] || t('detail_med');
            break;
        case 'set-master-vol':
            valEl.textContent = el.value + '%';
            break;
        case 'set-mouse-sens':
            valEl.textContent = parseFloat(el.value).toFixed(1) + '×';
            break;
    }
    saveSettings();
}
window.updateSettingVal = updateSettingVal;

export function updateAllSettingVals() {
    ['set-zoom', 'set-detail', 'set-master-vol', 'set-mouse-sens'].forEach(updateSettingVal);
}
window.updateAllSettingVals = updateAllSettingVals;

// ── Modal & Overlays ────────────────────────────────────────────────────────
export let showMenu = true;

// Synchronize showMenu with window.showMenu bi-directionally
window.showMenu = showMenu;
Object.defineProperty(window, 'showMenu', {
    get() { return showMenu; },
    set(v) { showMenu = v; },
    configurable: true
});

export function openMenu() {
    showMenu = true;
    try { if (window.Sfx) window.Sfx.playMenuToggle(); } catch(e) {}
    const m = document.getElementById('menu');
    if (m) m.classList.add('active', 'panel-fly-in');
    updateContinueButton();
    renderRecentFiles();
}
window.openMenu = openMenu;

export function closeMenu() {
    const m = document.getElementById('menu');
    if (m) m.classList.remove('active');
    showMenu = false;
}
window.closeMenu = closeMenu;

export function toggleMenu() {
    if (showMenu) {
        closeMenu();
    } else {
        openMenu();
    }
}
window.toggleMenu = toggleMenu;

export function openNewGame() {
    if (window._s4wn_game_active) {
        if (!confirm('A game is currently running. Starting a new game will discard all unsaved progress.\n\nContinue?')) {
            return;
        }
        window._s4wn_game_active = false;
    }
    closeMenu();
    document.getElementById('new-game-panel').classList.add('open');
}
window.openNewGame = openNewGame;

export function closeNewGame() {
    document.getElementById('new-game-panel').classList.remove('open');
}
window.closeNewGame = closeNewGame;

export function showLoading(msg) {
    const ls = document.getElementById('loading-screen');
    if (ls) {
        ls.querySelector('.loading-text').textContent = msg;
        ls.querySelector('.loading-bar-fill').style.width = '0%';
        ls.classList.add('active');
    }
}
window.showLoading = showLoading;

export function updateLoadingProgress(pct, msg) {
    const ls = document.getElementById('loading-screen');
    if (ls) {
        ls.querySelector('.loading-bar-fill').style.width = Math.min(100, pct) + '%';
        if (msg) ls.querySelector('.loading-text').textContent = msg;
    }
}
window.updateLoadingProgress = updateLoadingProgress;

export function hideLoading() {
    const ls = document.getElementById('loading-screen');
    if (ls) ls.classList.remove('active');
}
window.hideLoading = hideLoading;

export function closeAllPanels() {
    const ids = ['tutorial-panel', 'editor-launch-dialog', 'editor-terrain-palette',
        'obj-explorer', 'construction-panel', 'resources-panel', 'settlers-panel',
        'map-preview-panel', 'new-game-panel', 'settings-panel'];
    ids.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('open', 'active'); }
    });
    const de = document.getElementById('debug-extra');
    if (de) de.style.display = 'none';
    window.debugPanelOpen = false;
    const po = document.getElementById('pause-overlay');
    if (po) po.classList.remove('active');
    hideLoading();
}
window.closeAllPanels = closeAllPanels;

export async function startNewGame() {
    const name = document.getElementById('ng-name').value || 'Player 1';
    const mapType = document.getElementById('ng-map').value;
    const difficulty = document.getElementById('ng-difficulty').value;
    const nation = document.getElementById('ng-nation').value;

    if (mapType === 'custom') {
        closeNewGame();
        if (typeof window.triggerLoad === 'function') window.triggerLoad();
        return;
    }
    console.log(`New Game: ${name}, map=${mapType}, difficulty=${difficulty}, nation=${nation}`);
    closeAllPanels();
    closeNewGame();
    closeMenu();

    if (window.resetToolPickupTracking) window.resetToolPickupTracking();

    if (!window.engineReady || !load_map_json) {
        alert(t('engine_not_ready'));
        return;
    }

    showLoading(t('generating_world'));

    try {
        updateLoadingProgress(20, t('generating_terrain'));

        const mapSize = difficulty === 'easy' ? 48 : 64;
        const mapData = generate_map(mapType, mapSize, mapSize);
        const mapJson = typeof window.mapExportDataToJson === 'function' ? window.mapExportDataToJson(mapData) : '';

        updateLoadingProgress(60, t('building_landscape'));

        const result = load_map_json(mapJson);
        if (!result.ok) {
            throw new Error('Map load failed: ' + result.error);
        }

        updateLoadingProgress(80, t('preparing_resources'));

        const resResult = add_starting_resources(difficulty);
        if (!resResult.ok) {
            console.warn('Starting resources warning:', resResult.error);
        }

        const workerCount = difficulty === 'easy' ? 4 : (difficulty === 'hard' ? 2 : 3);
        const baseResult = setup_starter_base(workerCount);
        if (!baseResult.ok) {
            console.error('Starter base setup failed:', baseResult.error);
        } else {
            console.log(`HQ placed at (${baseResult.hq_x},${baseResult.hq_y}), ${baseResult.settlers} workers`);
        }

        if (typeof set_player_nation_by_id === 'function') {
            const nationSet = set_player_nation_by_id(parseInt(nation, 10) || 0);
            console.log(`Nation set: ${nation} → ${nationSet}`);
        }

        updateLoadingProgress(100, t('ready'));

        window._s4wn_player_name = name;
        window._s4wn_difficulty = difficulty;
        window._s4wn_game_active = true;
        
        const mapName = mapType.charAt(0).toUpperCase() + mapType.slice(1);
        const hudMap = document.getElementById('hud-map');
        if (hudMap) hudMap.textContent = `${t('map_label')}: ${mapName}`;
        window.lastResourceUpdate = 0;
        window.lastPopUpdate = 0;

        startAutoSave();

        setTimeout(() => saveGame(), 1000);

        setTimeout(() => {
            hideLoading();
        }, 400);

    } catch (err) {
        console.error('New Game failed:', err);
        hideLoading();
        alert(t('failed_new_game') + err.message);
    }
}
window.startNewGame = startNewGame;

export function openSettings() {
    document.getElementById('settings-panel').classList.add('open');
    document.getElementById('settings-backdrop').classList.add('active');
    renderKeyBindings();
}
window.openSettings = openSettings;

export function closeSettings() {
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('settings-backdrop').classList.remove('active');
}
window.closeSettings = closeSettings;

export function resetSettings() {
    window.settings = {...SETTINGS_DEFAULTS};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(window.settings));
    if (!window.settings.language) window.settings.language = 'auto';
    syncSettingsToUI();
}
window.resetSettings = resetSettings;

// ── Keyboard Bindings Display ─────────────────────────────────────────────
export const KEY_BINDINGS = [
    { key: 'L', key_i18n: 'kb_load_map' },
    { key: 'S', key_i18n: 'kb_settings' },
    { key: 'P', key_i18n: 'kb_pause' },
    { key: '1', key_i18n: 'kb_speed1' },
    { key: '2', key_i18n: 'kb_speed2' },
    { key: '3', key_i18n: 'kb_speed4' },
    { key: 'B', key_i18n: 'kb_build' },
    { key: 'Esc', key_i18n: 'kb_escape' },
    { key: 'M', key_i18n: 'kb_menu' },
    { key: 'Click', key_i18n: 'kb_click' },
    { key: 'Drag', key_i18n: 'kb_drag' },
    { key: 'Scroll', key_i18n: 'kb_scroll' },
];

export function renderKeyBindings() {
    const el = document.getElementById('key-bindings-list');
    if (!el) return;
    el.innerHTML = KEY_BINDINGS.map(b => {
        const desc = t(b.key_i18n);
        return `<div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0;">
            <span style="color:#c8b878;font-family:'SF Mono',monospace;background:rgba(200,170,100,0.08);padding:1px 6px;border-radius:3px;min-width:48px;text-align:center;">${b.key}</span>
            <span style="flex:1;">${desc}</span>
        </div>`;
    }).join('');
}

// ── Save / Load Game State ──────────────────────────────────────────────────
export const SAVE_KEY = 's4wn-autosave';
export const SAVE_META_KEY = 's4wn-autosave-meta';

export const UNIT_STATE_NAMES = ['Idle','Moving','Working','Fighting','Patrolling','FormationMove','Dying','Dead'];
export const UNIT_STANCE_NAMES = ['Aggressive','StandGround','HoldFire','Retreat'];

export function saveGame() {
    if (!window.engineReady || !get_game_state) return false;
    try {
        const state = get_game_state();
        if (!state || state.game_time <= 0) {
            console.warn('saveGame: failed to get game state');
            return false;
        }

        const resources = {};
        const resArr = state.resources;
        for (let i = 0; i < resArr.length; i++) {
            if (resArr[i] > 0) resources[i] = resArr[i];
        }

        const buildings = state.buildings.map(b => {
            const inBuf = {};
            const inArr = b.input_buffer;
            for (let i = 0; i < inArr.length; i++) {
                if (inArr[i] > 0) inBuf[i] = inArr[i];
            }
            const outBuf = {};
            const outArr = b.output_buffer;
            for (let i = 0; i < outArr.length; i++) {
                if (outArr[i] > 0) outBuf[i] = outArr[i];
            }
            return {
                kind: b.kind,
                x: b.x,
                y: b.y,
                construction: b.construction,
                active: b.active,
                production_counter: b.production_counter,
                assigned_settlers: Array.from(b.assigned_settlers),
                max_settlers: b.max_settlers,
                input_buffer: inBuf,
                output_buffer: outBuf,
            };
        });

        const units = state.units.map(u => ({
            id: u.id,
            kind: u.kind,
            x: u.x,
            y: u.y,
            hp: u.hp,
            max_hp: u.max_hp,
            state: UNIT_STATE_NAMES[u.state] || 'Idle',
            assigned_building: u.assigned_building === -1 ? null : u.assigned_building,
            target: u.target_x !== -1 ? { x: u.target_x, y: u.target_y } : null,
            stance: UNIT_STANCE_NAMES[u.stance] || 'Aggressive',
            morale: u.morale,
            patrol_start: u.patrol_start_x !== -1 ? { x: u.patrol_start_x, y: u.patrol_start_y } : null,
            patrol_end: u.patrol_end_x !== -1 ? { x: u.patrol_end_x, y: u.patrol_end_y } : null,
        }));

        const stateObj = {
            game_time: state.game_time,
            resources: resources,
            buildings: buildings,
            units: units,
        };
        const stateJson = JSON.stringify(stateObj);

        localStorage.setItem(SAVE_KEY, stateJson);
        const meta = {
            savedAt: new Date().toISOString(),
            gameTime: state.game_time,
        };
        localStorage.setItem(SAVE_META_KEY, JSON.stringify(meta));
        console.log('Game saved (auto-save) at', meta.savedAt);
        return true;
    } catch (err) {
        console.error('saveGame failed:', err);
        return false;
    }
}
window.saveGame = saveGame;

export function hasSavedGame() {
    return !!localStorage.getItem(SAVE_KEY);
}
window.hasSavedGame = hasSavedGame;

export function getSavedGameMeta() {
    try {
        const raw = localStorage.getItem(SAVE_META_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
window.getSavedGameMeta = getSavedGameMeta;

export function loadSavedGame() {
    if (!window.engineReady || !restore_game_state) {
        alert('Engine not ready. Please wait...');
        return;
    }
    const stateJson = localStorage.getItem(SAVE_KEY);
    if (!stateJson) {
        alert(t('no_saved_game'));
        return;
    }
    try {
        const result = restore_game_state(stateJson);
        if (result.ok) {
            closeMenu();
            window.lastResourceUpdate = 0;
            window.lastPopUpdate = 0;
            const hudMap = document.getElementById('hud-map');
            if (hudMap) hudMap.textContent = t('map_saved_game');
            startAutoSave();
            console.log('Game restored from auto-save');
        } else {
            alert(t('failed_restore') + result.error);
        }
    } catch (err) {
        console.error('loadSavedGame failed:', err);
        alert('Failed to load saved game: ' + err.message);
    }
}
window.loadSavedGame = loadSavedGame;

export let autoSaveTimer = null;

export function startAutoSave() {
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
        if (!showMenu && window.engineReady && (typeof window.is_paused === 'function' ? !window.is_paused() : true)) {
            saveGame();
        }
    }, 5 * 60 * 1000);
}
window.startAutoSave = startAutoSave;

export function updateContinueButton() {
    const btn = document.getElementById('btn-continue');
    if (!btn) return;
    if (hasSavedGame()) {
        btn.style.display = 'block';
        const meta = getSavedGameMeta();
        if (meta && meta.gameTime !== null) {
            btn.textContent = `💾 ${t('continue_game').replace('💾 ', '')} (${formatGameTime(meta.gameTime)})`;
        } else {
            btn.textContent = t('continue_game');
        }
    } else {
        btn.style.display = 'none';
    }
}
window.updateContinueButton = updateContinueButton;

export const RECENT_KEY = 's4wn-recent-files';
export const RECENT_MAX = 5;

export function getRecentFiles() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    } catch { return []; }
}
window.getRecentFiles = getRecentFiles;

export function saveRecentFiles(files) {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(files.slice(0, RECENT_MAX)));
    } catch { }
}
window.saveRecentFiles = saveRecentFiles;

export function addToRecentFiles(file) {
    const recent = getRecentFiles();
    const filtered = recent.filter(f => f.name !== file.name);
    filtered.unshift({
        name: file.name,
        size: file.size,
        type: file.name.endsWith('.sav') ? 'sav' : (file.name.endsWith('.map') ? 'map' : 'json'),
        loadedAt: new Date().toISOString()
    });
    saveRecentFiles(filtered);
    renderRecentFiles();
}
window.addToRecentFiles = addToRecentFiles;

export function renderRecentFiles() {
    const list = document.getElementById('recent-list');
    const recent = getRecentFiles();
    if (!list) return;

    if (recent.length === 0) {
        list.innerHTML = '<span class="recent-empty">None yet</span>';
        return;
    }

    const typeIcons = { map: '🗺️', sav: '💾', json: '📄' };
    list.innerHTML = recent.map(f => {
        const icon = typeIcons[f.type] || '📄';
        const sizeStr = f.size > 1024 * 1024
            ? (f.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (f.size / 1024).toFixed(0) + ' KB';
        const date = new Date(f.loadedAt);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `<div class="recent-item" data-file="${f.name}">
            <span class="recent-item-icon">${icon}</span>
            <span class="recent-item-name" title="${f.name}">${f.name}</span>
            <span class="recent-item-meta">${sizeStr} · ${dateStr}</span>
        </div>`;
    }).join('');

    list.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', () => {
            const fileName = item.dataset.file;
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.setAttribute('data-expected', fileName);
                fileInput.click();
            }
        });
    });
}
window.renderRecentFiles = renderRecentFiles;

// ── Drop Zone & Load File Management ───────────────────────────────────────
export function triggerLoad() {
    const fi = document.getElementById('fileInput');
    if (fi) {
        fi.removeAttribute('data-expected');
        fi.click();
    }
}
window.triggerLoad = triggerLoad;

export function cancelMapPreview() {
    const mpp = document.getElementById('map-preview-panel');
    if (mpp) mpp.classList.remove('open');
    window.pendingMapData = null;
    window.pendingMapFile = null;
}
window.cancelMapPreview = cancelMapPreview;

export function confirmMapLoad() {
    if (!window.pendingMapData || !window.engineReady || !load_map_json) return;
    try {
        if (window._s4wn_load_for_editor) {
            window._s4wn_load_for_editor = false;
            const mpp = document.getElementById('map-preview-panel');
            if (mpp) mpp.classList.remove('open');
            const result = load_map_json(window.pendingMapData.json);
            if (!result.ok) { alert('Map load failed: ' + result.error); return; }
            if (typeof window.openEditorPalette === 'function') window.openEditorPalette();
        } else {
            const mpp = document.getElementById('map-preview-panel');
            if (mpp) mpp.classList.remove('open');
            closeMenu();
            closeAllPanels();
            const result = load_map_json(window.pendingMapData.json);
            if (result.ok) {
                if (window.pendingMapData.is_savegame && window.pendingMapData.buildings && window.pendingMapData.buildings.length > 0) {
                    const stateObj = {
                        game_time: window.pendingMapData.tickCounter || 0,
                        resources: window.pendingMapData.resources || {},
                        buildings: window.pendingMapData.buildings,
                        units: window.pendingMapData.units || [],
                    };
                    const restoreResult = restore_game_state(JSON.stringify(stateObj));
                    if (!restoreResult.ok) {
                        console.warn('SAV state restore warnings:', restoreResult.error);
                    } else {
                        console.log('SAV entities restored:', window.pendingMapData.buildings.length, 'buildings,', (window.pendingMapData.units || []).length, 'units');
                    }
                } else if (!window.pendingMapData.is_savegame) {
                    if (typeof window.resetToolPickupTracking === 'function') window.resetToolPickupTracking();
                    const difficulty = 'normal';
                    add_starting_resources(difficulty);
                    setup_starter_base(3);
                }
                
                window._s4wn_game_active = true;
                const hudMap = document.getElementById('hud-map');
                if (hudMap) hudMap.textContent = `Map: ${window.pendingMapData.filename}`;
                window.lastResourceUpdate = 0;
                window.lastPopUpdate = 0;
                
                startAutoSave();
                if (window.pendingMapFile) {
                    addToRecentFiles(window.pendingMapFile);
                }
            } else {
                alert('Map load failed: ' + result.error);
            }
        }
    } catch (e) {
        alert('Load Error: ' + e.message);
    }
}
window.confirmMapLoad = confirmMapLoad;

// ── Error Handler ────────────────────────────────────────────────────────────
export const ErrorHandler = {
    _lastError: null,
    _origConsoleError: console.error,

    _buildGitHubUrl(title, body) {
        const params = new URLSearchParams({ title, body, labels: 'bug' });
        return `https://github.com/mayrd/s4wn/issues/new?${params.toString()}`;
    },

    _truncateBody(body) {
        const MAX_URL_BODY = 1200;
        if (body.length <= MAX_URL_BODY) return body;
        return body.substring(0, MAX_URL_BODY - 30) + '\n\n... (truncated for URL length)';
    },

    _parseStack(stack) {
        if (!stack) return { file: 'unknown', line: '?', column: '?', raw: '' };
        const lines = stack.split('\n');
        for (const line of lines) {
            const match = line.match(/^(?:.*?@|at\s+.*?)\(?([^)]+?):(\d+):(\d+)\)?$/);
            if (match) return { file: match[1], line: match[2], column: match[3], raw: stack };
            const match2 = line.match(/at\s+(https?:\/\/[^:]+):(\d+):(\d+)/);
            if (match2) return { file: match2[1], line: match2[2], column: match2[3], raw: stack };
        }
        return { file: 'unknown', line: '?', column: '?', raw: stack };
    },

    _formatError(err) {
        const name = err.name || 'Error';
        const message = err.message || String(err);
        const stack = err.stack || '';
        const loc = this._parseStack(stack);
        return { name, message, stack, loc };
    },

    show(err, context = '') {
        const info = this._formatError(err);
        this._lastError = { ...info, context, timestamp: new Date().toISOString() };

        if (this._origConsoleError) {
            this._origConsoleError('[S4WN Error] ' + info.name + ': ' + info.message);
            if (info.loc.file !== 'unknown') {
                this._origConsoleError('  at ' + info.loc.file + ':' + info.loc.line + ':' + info.loc.column);
            }
            if (info.stack) {
                this._origConsoleError('Stack trace:\n' + info.stack);
            }
        }

        const title = `[Bug] ${info.name}: ${info.message.substring(0, 80)}`;
        const body = this._truncateBody(this._buildIssueBody(info));
        const ghUrl = this._buildGitHubUrl(title, body);
        console.log('%c🐛 Create GitHub issue:', 'color:#ff6b6b;font-weight:bold;font-size:14px');
        console.log('%c' + ghUrl, 'color:#58a6ff;text-decoration:underline;word-break:break-all');

        const overlay = document.getElementById('error-overlay');
        const titleEl = document.getElementById('error-dialog-title');
        const msgEl = document.getElementById('error-dialog-message');
        const locEl = document.getElementById('error-dialog-location');

        if (overlay && titleEl && msgEl && locEl) {
            titleEl.textContent = info.name;
            msgEl.textContent = (context ? `[${context}] ` : '') + info.message;
            locEl.innerHTML = info.loc.file !== 'unknown'
                ? `📍 <span>${info.loc.file}</span> :${info.loc.line}:${info.loc.column}`
                : '📍 Location unknown';
            overlay.classList.add('active');
        }
    },

    _buildIssueBody(info) {
        const context = info.context ? `**Context:** ${info.context}\n\n` : '';
        const stack = info.stack ? '```\n' + info.stack + '\n```' : 'No stack trace available';
        return `## Bug Report\n\n${context}**Error:** ${info.name}: ${info.message}\n\n**Location:** \`${info.loc.file}:${info.loc.line}:${info.loc.column}\`\n\n**Timestamp:** ${info.timestamp}\n\n**Stack Trace:**\n${stack}\n\n**Browser:** ${navigator.userAgent}\n\n**URL:** ${window.location.href}\n`;
    },

    openGitHubIssue() {
        if (!this._lastError) return;
        const title = `[Bug] ${this._lastError.name}: ${this._lastError.message.substring(0, 80)}`;
        const body = this._truncateBody(this._buildIssueBody(this._lastError));
        const url = this._buildGitHubUrl(title, body);
        window.open(url, '_blank');
    },

    async copyError() {
        if (!this._lastError) return;
        const text = this._buildIssueBody(this._lastError);
        try {
            await navigator.clipboard.writeText(text);
            const btn = document.getElementById('error-btn-copy');
            if (btn) {
                btn.textContent = '✅ Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '📋 Copy Error Details';
                    btn.classList.remove('copied');
                }, 2000);
            }
        } catch (e) {
            console.error('Failed to copy:', e);
        }
    },

    dismiss() {
        const el = document.getElementById('error-overlay');
        if (el) el.classList.remove('active');
    },
};
window.ErrorHandler = ErrorHandler;

// ── Tutorial Engine ──────────────────────────────────────────────────────────
export const Tutorial = {
    _state: {
        active: false,
        currentIdx: 0,
        objectives: [],
        completed: new Set(),
        _knownBuildings: null,
        _knownUnits: null,
        _victory: false,
        _introShown: false,
    },

    init() {
        if (!window.S4WN_TUTORIAL) return;
        this._state.objectives = window.S4WN_TUTORIAL.objectives || [];
    },

    start() {
        const tObj = window.S4WN_TUTORIAL;
        if (!tObj) { console.warn('Tutorial data not loaded'); return; }
        this._state.active = true;
        this._state.currentIdx = 0;
        this._state.completed = new Set();
        this._state._victory = false;
        this._state._knownBuildings = null;
        this._state._knownUnits = null;
        const panel = document.getElementById('tutorial-panel');
        if (panel) panel.classList.add('open');
        this.showIntro(tObj);
    },

    showIntro(tObj) {
        if (this._state._introShown) return;
        this._state._introShown = true;
        const title = document.getElementById('tut-title');
        if (title) title.textContent = '📖 ' + tObj.title;
        const inst = document.getElementById('tut-instruction');
        if (inst) inst.textContent = tObj.intro.join('\n');
        
        const tip = document.getElementById('tut-tip');
        if (tip) tip.textContent = '';
        const ext = document.getElementById('tut-extra');
        if (ext) ext.style.display = 'none';
        const trg = document.getElementById('tut-target');
        if (trg) trg.style.display = 'none';
        const cmp = document.getElementById('tut-complete');
        if (cmp) cmp.style.display = 'none';
        const prg = document.getElementById('tut-progress');
        if (prg) prg.textContent = `Step 0/${tObj.objectives.length}`;
        
        setTimeout(() => this.nextObjective(), 8000);
    },

    nextObjective() {
        const tObj = window.S4WN_TUTORIAL;
        if (!tObj || this._state._victory) return;
        const idx = this._state.currentIdx;
        if (idx >= tObj.objectives.length) {
            this.checkVictory();
            return;
        }
        const obj = tObj.objectives[idx];
        const title = document.getElementById('tut-title');
        if (title) title.textContent = obj.title;
        const inst = document.getElementById('tut-instruction');
        if (inst) inst.textContent = obj.instruction;
        const tip = document.getElementById('tut-tip');
        if (tip) tip.textContent = obj.tip || '';
        const prg = document.getElementById('tut-progress');
        if (prg) prg.textContent = `Step ${idx + 1}/${tObj.objectives.length}`;
        const cmp = document.getElementById('tut-complete');
        if (cmp) cmp.style.display = 'none';

        const extra = document.getElementById('tut-extra');
        if (extra) {
            if (obj.extra_info) {
                extra.textContent = obj.extra_info.join('\n');
                extra.style.display = 'block';
            } else {
                extra.style.display = 'none';
            }
        }

        const target = document.getElementById('tut-target');
        if (target) {
            if (obj.target) {
                target.textContent = `🎯 Goal: ${obj.target.count} ${obj.target.unit}`;
                target.style.display = 'block';
            } else {
                target.style.display = 'none';
            }
        }
        this._state.currentIdx++;
    },

    completeObjective(obj) {
        if (this._state.completed.has(obj.id)) return;
        this._state.completed.add(obj.id);
        const complete = document.getElementById('tut-complete');
        const msg = document.getElementById('tut-complete-msg');
        if (msg) msg.textContent = obj.complete_msg || 'Done!';
        if (complete) complete.style.display = 'flex';
        setTimeout(() => this.nextObjective(), 5000);
    },

    checkTriggers() {
        if (!this._state.active || this._state._victory) return;
        const tObj = window.S4WN_TUTORIAL;
        if (!tObj) return;

        const currentObj = this._state.currentIdx > 0 ?
            tObj.objectives[this._state.currentIdx - 1] : null;
        if (!currentObj || this._state.completed.has(currentObj.id)) return;

        const trig = currentObj.trigger;
        if (!trig) return;

        let triggered = false;

        if (trig.building || trig.buildings) {
            const buildings = this.snapshotBuildings();
            if (trig.building) {
                const count = buildings.filter(b => b.type === trig.building).length;
                if (count >= (trig.min || 1)) triggered = true;
            }
            if (trig.buildings && trig.minTotal) {
                let total = 0;
                for (const bt of trig.buildings) {
                    total += buildings.filter(b => b.type === bt).length;
                }
                if (total >= trig.minTotal) triggered = true;
            }
        }

        if (trig.unit) {
            const units = this.snapshotUnits();
            const count = units.filter(u => u.type === trig.unit).length;
            if (count >= (trig.min || 1)) triggered = true;
        }

        if (currentObj.target) {
            const units = this.snapshotUnits();
            const count = units.filter(u => u.type === currentObj.target.unit).length;
            if (count >= currentObj.target.count) triggered = true;
        }

        if (trig.message_shown) triggered = true;

        if (triggered) {
            this.completeObjective(currentObj);
        }
    },

    snapshotBuildings() {
        const result = [];
        try {
            if (window.__s4wn_debug?.get_buildings) {
                const json = window.__s4wn_debug.get_buildings();
                if (json) {
                    const data = JSON.parse(json);
                    for (const b of (data.buildings || [])) {
                        result.push({ type: b.type || b.kind || b.id || '', owner: b.owner_id || 0 });
                    }
                }
            }
        } catch(e) {}
        return result;
    },

    snapshotUnits() {
        const result = [];
        try {
            if (window.__s4wn_debug?.get_units) {
                const json = window.__s4wn_debug.get_units();
                if (json) {
                    const data = JSON.parse(json);
                    for (const u of (data.units || [])) {
                        result.push({ type: u.type || u.kind || '', owner: u.owner_id || 0 });
                    }
                }
            }
        } catch(e) {}
        return result;
    },

    checkVictory() {
        if (this._state._victory) return;
        const tObj = window.S4WN_TUTORIAL;
        const v = tObj.victory;
        const title = document.getElementById('tut-title');
        if (title) title.textContent = v.title;
        const inst = document.getElementById('tut-instruction');
        if (inst) inst.textContent = v.message.join('\n');
        
        const tip = document.getElementById('tut-tip');
        if (tip) tip.textContent = '';
        const ext = document.getElementById('tut-extra');
        if (ext) ext.style.display = 'none';
        const trg = document.getElementById('tut-target');
        if (trg) trg.style.display = 'none';
        const cmp = document.getElementById('tut-complete');
        if (cmp) cmp.style.display = 'none';
        const prg = document.getElementById('tut-progress');
        if (prg) prg.textContent = '🏆 Complete!';
        
        this._state._victory = true;
    },

    tick() {
        if (!this._state.active) return;
        this.checkTriggers();
    },

    stop() {
        this._state.active = false;
        const panel = document.getElementById('tutorial-panel');
        if (panel) panel.classList.remove('open');
    },
};
window.Tutorial = Tutorial;

// Wire up global onerror wrappers to point to ErrorHandler
window.onerror = function (message, source, lineno, colno, error) {
    const err = error || new Error(message);
    if (!error) {
        err.message = message;
        err.stack = `    at ${source}:${lineno}:${colno}`;
    }
    ErrorHandler.show(err, 'window.onerror');
    return true;
};

window.addEventListener('unhandledrejection', function (event) {
    const reason = event.reason;
    if (reason instanceof Error) {
        ErrorHandler.show(reason, 'Unhandled Promise Rejection');
    } else {
        const err = new Error(String(reason));
        err.name = 'UnhandledRejection';
        ErrorHandler.show(err, 'Unhandled Promise Rejection');
    }
});

// Setup console.error wrap
const origConsoleError = console.error;
console.error = function (...args) {
    if (origConsoleError) origConsoleError.apply(console, args);

    let err = null;
    for (const arg of args) {
        if (arg instanceof Error) {
            err = arg;
            break;
        }
    }

    if (!err) {
        const msg = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
        if (msg) {
            err = new Error(msg);
            err.name = 'ConsoleError';
        }
    }

    if (err && ErrorHandler) {
        try {
            const info = ErrorHandler._formatError(err);
            const title = '[Bug] ' + info.name + ': ' + info.message.substring(0, 80);
            const body = ErrorHandler._truncateBody(ErrorHandler._buildIssueBody({ ...info, context: 'console.error', timestamp: new Date().toISOString() }));
            const ghUrl = ErrorHandler._buildGitHubUrl(title, body);

            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#ff6b6b');
            console.log('%c🐛  JavaScript Error — Report on GitHub ↓', 'color:#ff6b6b;font-weight:bold;font-size:14px');
            console.log('%c' + ghUrl, 'color:#58a6ff;text-decoration:underline;word-break:break-word');
            console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color:#ff6b6b');
        } catch(e) {}
    }
};

// Tutorial button & page-load events
document.addEventListener('DOMContentLoaded', () => {
    Tutorial.init();

    const tutBtn = document.getElementById('btn-tutorial');
    if (tutBtn) {
        tutBtn.addEventListener('click', () => {
            closeMenu();
            const mapSelect = document.getElementById('ng-map');
            if (mapSelect) mapSelect.value = 'tutorial';
            const diffSelect = document.getElementById('ng-difficulty');
            if (diffSelect) diffSelect.value = 'easy';
            const nameInput = document.getElementById('ng-name');
            if (nameInput) nameInput.value = 'Young Chieftain';

            startNewGame().then(() => {
                Tutorial.start();
                if (!window._tutorialTick) {
                    window._tutorialTick = setInterval(() => Tutorial.tick(), 1000);
                }
            });
        });
    }

    const _origStartNewGame = window.startNewGame;
    window.startNewGame = async function () {
        await _origStartNewGame.apply(this, arguments);
        const mapType = document.getElementById('ng-map').value;
        if (mapType === 'tutorial') {
            setTimeout(() => Tutorial.start(), 500);
            if (!window._tutorialTick) {
                window._tutorialTick = setInterval(() => Tutorial.tick(), 1000);
            }
        } else {
            Tutorial.stop();
        }
    };
});
