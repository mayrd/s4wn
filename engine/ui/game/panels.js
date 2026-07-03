/**
 * S4WN Game Dashboard Panels Component
 * Contains Construction Panel, Resources Panel, and Settlers Panel.
 */

import {
    get_building_summary,
    get_player_nation,
    get_resource_counts_by_id,
    get_unit_summary
} from '../../pkg/s4wn_engine.js?v=101';

export function handlePanelSwipe(direction) {
    if (window.innerWidth >= 768) return; // Only on mobile
    const conPanel = document.getElementById('construction-panel');
    const resPanel = document.getElementById('resources-panel');
    const setPanel = document.getElementById('settlers-panel');
    
    if (direction === 'left') {
        if (conPanel && conPanel.classList.contains('open')) toggleConstructionPanel();
        if (resPanel && resPanel.classList.contains('open')) toggleResourcesPanel();
        if (setPanel && !setPanel.classList.contains('open')) toggleSettlersPanel();
    } else {
        if (resPanel && resPanel.classList.contains('open')) toggleResourcesPanel();
        if (setPanel && setPanel.classList.contains('open')) toggleSettlersPanel();
        if (conPanel && !conPanel.classList.contains('open')) toggleConstructionPanel();
    }
}

let swipeHintsShown = false;
export function hideSwipeHints() {
    if (swipeHintsShown) return;
    swipeHintsShown = true;
    document.querySelectorAll('.swipe-hint').forEach(el => el.classList.add('hidden'));
}

export function toggleConstructionPanel() {
    const panel = document.getElementById('construction-panel');
    const btn = document.getElementById('btn-construction');
    const resPanel = document.getElementById('resources-panel');
    const setPanel = document.getElementById('settlers-panel');
    
    if (resPanel && resPanel.classList.contains('open')) {
        resPanel.classList.remove('open', 'panel-fly-in');
        document.getElementById('btn-resources').classList.remove('active');
    }
    if (setPanel && setPanel.classList.contains('open')) {
        setPanel.classList.remove('open', 'panel-fly-in');
        document.getElementById('btn-settlers').classList.remove('active');
    }
    if (panel.classList.contains('open')) {
        panel.classList.remove('open', 'panel-fly-in');
        btn.classList.remove('active');
    } else {
        populateConstructionPanel();
        panel.classList.add('open', 'panel-fly-in');
        btn.classList.add('active');
        try { if (window.Sfx) window.Sfx.playPanelOpen(); } catch(e) {}
    }
}

export function populateConstructionPanel() {
    const container = document.getElementById('construction-categories');
    if (!container) return;
    const C = window.S4WN_CONFIG;
    if (!C || !C.buildings) return;

    let nationName = null;
    if (typeof get_player_nation === 'function') {
        try {
            const nObj = get_player_nation();
            nationName = (nObj && window.NATION_NAMES_BY_ID) ? window.NATION_NAMES_BY_ID[nObj.name_id] : null;
        } catch(e) {}
    }

    const cats = {};
    for (const b of C.buildings) {
        if (nationName && b.nations && !b.nations.includes(nationName)) continue;
        const cat = b.category;
        if (!cats[cat]) cats[cat] = [];
        cats[cat].push(b);
    }

    const CAT_ORDER = ['Basic Economy', 'Food Production', 'Mining & Smelting', 'Military & Tools', 'Logistics', 'Divine & Special', 'Zierobjekte'];
    const sorted = Object.entries(cats).sort(([a], [b]) => {
        const ai = CAT_ORDER.indexOf(a), bi = CAT_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    let bldgCounts = {};
    try {
        if (typeof get_building_summary === 'function') {
            get_building_summary().forEach(b => {
                bldgCounts[b.kind] = (bldgCounts[b.kind] || 0) + 1;
            });
        }
    } catch(e) {}

    let html = '';
    const currentLang = window.currentLang || 'en';
    const tCategory = window.tCategory || ((name) => name);

    for (const [cat, buildings] of sorted) {
        if (buildings.length === 0) continue;
        html += '<div class="con-category">';
        html += '<div class="con-cat-header">' + tCategory(cat) + '</div>';
        html += '<div class="con-cat-body">';
        for (const b of buildings) {
            const icon = '🏗️';
            const costParts = [];
            if (b.planks) costParts.push('🪵' + b.planks);
            if (b.stone) costParts.push('🪨' + b.stone);
            if (b.gold) costParts.push('✨' + b.gold);
            const cost = costParts.join(' ') || 'Free';
            const displayName = currentLang === 'de' ? b.name_de : b.name;
            const garrisonCap = b.garrison_capacity || 0;
            const garrisonInfo = garrisonCap > 0 ? ' G:' + garrisonCap : '';
            const built = bldgCounts[b.id] || 0;
            const countStr = built > 0 ? ' (' + built + ')' : '';
            const desc = (currentLang === 'de' && b.description_de) ? b.description_de : (b.description || '');
            const tooltip = [displayName, cost ? cost + garrisonInfo : '', built ? built + ' built' : '', desc].filter(Boolean).join(' — ');
            html += '<div class="con-bldg" onclick="selectBuilding(\'' + b.id + '\')" title="' + tooltip.replace(/"/g, '&quot;') + '">';
            html += '<span class="con-icon">' + icon + '</span>';
            html += '<span class="con-name">' + displayName + countStr + '</span>';
            html += '<span class="con-cost">' + cost + garrisonInfo + '</span>';
            html += '</div>';
        }
        html += '</div></div>';
    }
    container.innerHTML = html || '<div style="color:#888;text-align:center;padding:10px">No buildings available</div>';
}

export function selectBuilding(name) {
    try { if (window.Sfx) window.Sfx.playUIClick(); } catch(e) {}
    const disc = window.BUILDING_DISCRIMINANT_BY_CONFIG_ID ? window.BUILDING_DISCRIMINANT_BY_CONFIG_ID[name] : undefined;
    if (disc === undefined) return;
    
    if (window.placementButtons) {
        window.placementButtons.forEach(b => b.classList.remove('active'));
    }
    window.placementMode = disc;
    if (window.canvas) {
        window.canvas.classList.add('placing');
    }
    
    const buildingName = window.buildingName || ((id) => name);
    if (window.placementStatus) {
        window.placementStatus.textContent = `Place ${buildingName(disc)} — click tile · Right-click/B to cancel`;
        window.placementStatus.classList.add('visible');
    }
    
    if (window.placementButtons) {
        window.placementButtons.forEach(b => {
            if (b._buildingName === name) b.classList.add('active');
        });
    }
    
    const conPanel = document.getElementById('construction-panel');
    if (conPanel) conPanel.classList.remove('open');
    const conBtn = document.getElementById('btn-construction');
    if (conBtn) conBtn.classList.remove('active');
}

export function toggleResourcesPanel() {
    const panel = document.getElementById('resources-panel');
    const btn = document.getElementById('btn-resources');
    const settPanel = document.getElementById('settlers-panel');
    const conPanel = document.getElementById('construction-panel');
    
    if (conPanel && conPanel.classList.contains('open')) {
        conPanel.classList.remove('open', 'panel-fly-in');
        document.getElementById('btn-construction').classList.remove('active');
    }
    if (settPanel && settPanel.classList.contains('open')) {
        settPanel.classList.remove('open', 'panel-fly-in');
        document.getElementById('btn-settlers').classList.remove('active');
    }
    if (panel.classList.contains('open')) {
        panel.classList.remove('open', 'panel-fly-in');
        btn.classList.remove('active');
    } else {
        renderResources();
        panel.classList.add('open', 'panel-fly-in');
        btn.classList.add('active');
        try { if (window.Sfx) window.Sfx.playPanelOpen(); } catch(e) {}
    }
}

export function toggleSettlersPanel() {
    const panel = document.getElementById('settlers-panel');
    const btn = document.getElementById('btn-settlers');
    const resPanel = document.getElementById('resources-panel');
    const conPanel = document.getElementById('construction-panel');
    
    if (conPanel && conPanel.classList.contains('open')) {
        conPanel.classList.remove('open', 'panel-fly-in');
        document.getElementById('btn-construction').classList.remove('active');
    }
    if (resPanel && resPanel.classList.contains('open')) {
        resPanel.classList.remove('open', 'panel-fly-in');
        document.getElementById('btn-resources').classList.remove('active');
    }
    if (panel.classList.contains('open')) {
        panel.classList.remove('open', 'panel-fly-in');
        btn.classList.remove('active');
    } else {
        renderSettlers();
        panel.classList.add('open', 'panel-fly-in');
        btn.classList.add('active');
        try { if (window.Sfx) window.Sfx.playPanelOpen(); } catch(e) {}
    }
}

export function renderResources() {
    const body = document.getElementById('resources-body');
    if (!body) return;
    const C = window.S4WN_CONFIG;
    const currentLang = window.currentLang || 'en';
    const t = window.t || ((key) => key);
    const tCategory = window.tCategory || ((name) => name);
    
    try {
        const countsById = get_resource_counts_by_id();
        let html = '';
        const catMap = {};
        for (const r of (C.resources || [])) {
            const cat = r.category || 'Other';
            if (!catMap[cat]) catMap[cat] = [];
            catMap[cat].push(r);
        }
        for (const [cat, resources] of Object.entries(catMap)) {
            html += `<div class="set-section">${tCategory(cat)}</div>`;
            for (const r of resources) {
                const disc = window.RESOURCE_DISCRIMINANT_BY_CONFIG_ID ? window.RESOURCE_DISCRIMINANT_BY_CONFIG_ID[r.id] : undefined;
                const count = disc !== undefined ? (countsById[disc] ?? 0) : 0;
                const icon = disc !== undefined ? (window.RESOURCE_ICONS_BY_ID ? window.RESOURCE_ICONS_BY_ID[disc] : '📦') : (window.RESOURCE_ICONS ? window.RESOURCE_ICONS[r.id] : '📦');
                const label = currentLang === 'de' ? r.name_de : r.name;
                const desc = (currentLang === 'de' && r.description_de) ? r.description_de : (r.description || '');
                const tooltip = desc ? `${label}: ${desc}` : label;
                html += `<div class="res-row" title="${tooltip}"><span class="res-label"><span class="res-icon">${icon}</span> ${label}</span><span class="res-val">${count}</span></div>`;
            }
        }
        if (!html) html = `<div class="res-row"><span class="res-label">${t('no_resources')}</span></div>`;
        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = `<div class="res-row"><span class="res-label">${t('error_loading')}</span></div>`;
    }
}

export function renderSettlers() {
    const body = document.getElementById('settlers-body');
    if (!body) return;
    const C = window.S4WN_CONFIG;
    const currentLang = window.currentLang || 'en';
    const t = window.t || ((key) => key);
    const tCategory = window.tCategory || ((name) => name);
    
    try {
        const units = get_unit_summary();
        const counts = {};
        let total = 0, working = 0, idle = 0;
        for (const u of units) {
            const kind = u.kind || 0;
            counts[kind] = (counts[kind] || 0) + 1;
            total++;
            if (u.state === 'Working') working++;
            else if (u.state === 'Idle') idle++;
        }

        let html = '';
        html += `<div class="set-row"><span class="set-label">${t('settlers_total')}</span><span class="set-val">${total}</span></div>`;
        html += `<div class="set-row"><span class="set-label">${t('settlers_working')}</span><span class="set-val">${working}</span></div>`;
        html += `<div class="set-row"><span class="set-label">${t('settlers_idle')}</span><span class="set-val">${idle}</span></div>`;

        if (C.units) {
            const cats = {};
            for (const u of C.units) {
                const cat = u.class || 'Other';
                if (!cats[cat]) cats[cat] = [];
                cats[cat].push(u);
            }
            for (const [cat, settlers] of Object.entries(cats)) {
                html += `<div class="set-section">${tCategory(cat)}</div>`;
                for (const s of settlers) {
                    const count = counts[s.id] || 0;
                    const label = currentLang === 'de' ? s.name_de : s.name;
                    const desc = (currentLang === 'de' && s.description_de) ? s.description_de : (s.description || '');
                    const tooltip = desc ? `${label}: ${desc}` : label;
                    html += `<div class="set-row" title="${tooltip}"><span class="set-label">👤 ${label}</span><span class="set-val">${count}</span></div>`;
                }
            }
        }

        body.innerHTML = html;
    } catch(e) {
        body.innerHTML = `<div class="set-row"><span class="set-label">${t('error_loading')}</span></div>`;
    }
}

// Swipe hint management
setTimeout(hideSwipeHints, 8000);

// Bind to window
window.handlePanelSwipe = handlePanelSwipe;
window.hideSwipeHints = hideSwipeHints;
window.toggleConstructionPanel = toggleConstructionPanel;
window.populateConstructionPanel = populateConstructionPanel;
window.selectBuilding = selectBuilding;
window.toggleResourcesPanel = toggleResourcesPanel;
window.toggleSettlersPanel = toggleSettlersPanel;
window.renderResources = renderResources;
window.renderSettlers = renderSettlers;
