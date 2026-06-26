# Object Explorer Detail Panel — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** When clicking an item in the Object Explorer, show a detail panel to the right displaying texture/sprite, 3D model metadata, and animation info.

**Architecture:** Pure JS/HTML addition to `engine/index.html`. No WASM rebuild needed. The detail panel fetches model JSON files via `fetch()` and renders metadata. Live 3D preview is deferred to Phase 2 (requires separate WebGL context).

**Tech Stack:** Vanilla JS, CSS flexbox, fetch API for model JSON loading.

**Key constraint:** Only 5 building sprites exist (farm, headquarters, lumberjack, sawmill, warehouse). Most buildings have no bitmap texture — they render via 3D geometry with PBR material colors. We show material color swatches + model metadata instead.

---

### Task 1: Add detail panel HTML structure

**Objective:** Add the right-side detail panel DOM element inside `#obj-explorer-card`

**Files:**
- Modify: `engine/index.html:1264-1269` (Object Explorer HTML)

**Step 1: Replace the single-card layout with a two-panel flex layout**

Current HTML:
```html
<div id="obj-explorer">
  <div class="obj-explorer-card" style="position:relative">
    <button class="obj-close" onclick="closeObjectExplorer()" style="position:absolute;top:12px;right:16px;">x</button>
    <h2>Object Explorer</h2>
    <div id="obj-explorer-body"></div>
  </div>
</div>
```

New HTML:
```html
<div id="obj-explorer">
  <div class="obj-explorer-card" style="position:relative">
    <button class="obj-close" onclick="closeObjectExplorer()" style="position:absolute;top:12px;right:16px;">x</button>
    <h2>Object Explorer</h2>
    <div class="obj-explorer-layout">
      <div class="obj-explorer-list" id="obj-explorer-body"></div>
      <div class="obj-explorer-detail" id="obj-explorer-detail">
        <p class="obj-detail-placeholder">Select an item to view details</p>
      </div>
    </div>
  </div>
</div>
```

**Step 2: Commit**
```
git add engine/index.html
git commit -m "feat(obj-explorer): add detail panel HTML structure"
```

---

### Task 2: Add CSS for detail panel layout

**Objective:** Style the two-panel layout and detail panel

**Files:**
- Modify: `engine/index.html` (CSS section, near `#obj-explorer` styles at line ~1108)

**Step 1: Add CSS rules**

Add after the existing `.obj-close:hover` rule:

```css
  /* Object Explorer two-panel layout */
  .obj-explorer-layout {
    display: flex; gap: 16px; flex: 1;
    min-height: 0;
  }
  .obj-explorer-list {
    flex: 1; min-width: 0;
    overflow-y: auto; max-height: 60vh;
  }
  .obj-explorer-detail {
    width: 320px; min-width: 280px;
    background: rgba(10,16,30,0.7);
    border: 1px solid rgba(200,170,100,0.12);
    border-radius: 8px; padding: 16px;
    overflow-y: auto; max-height: 60vh;
    display: flex; flex-direction: column; gap: 12px;
  }
  .obj-detail-placeholder {
    color: #556; font-size: 13px;
    text-align: center; padding: 40px 0;
  }
  /* Detail panel content */
  .obj-detail-header {
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .obj-detail-header .obj-icon { font-size: 32px; }
  .obj-detail-header .obj-name { color: #c8b878; font-size: 16px; font-weight: 500; }
  .obj-detail-section {
    background: rgba(255,255,255,0.03); border-radius: 6px;
    padding: 10px 12px;
  }
  .obj-detail-section h4 {
    margin: 0 0 6px 0; font-size: 11px;
    color: #667; text-transform: uppercase; letter-spacing: 1px;
  }
  .obj-detail-section .obj-field {
    display: flex; justify-content: space-between;
    font-size: 12px; color: #889; padding: 2px 0;
  }
  .obj-detail-section .obj-field span:first-child { color: #667; }
  .obj-detail-section .obj-field span:last-child { color: #aab; font-family: monospace; }
  .obj-color-swatch {
    display: inline-block; width: 16px; height: 16px;
    border-radius: 3px; border: 1px solid rgba(255,255,255,0.15);
    vertical-align: middle; margin-right: 6px;
  }
  .obj-detail-sprite {
    max-width: 100%; max-height: 120px;
    image-rendering: pixelated; border-radius: 4px;
    background: rgba(0,0,0,0.3);
  }
  .obj-detail-sprite-wrap {
    text-align: center; padding: 8px 0;
  }
```

**Step 2: Commit**
```
git add engine/index.html
git commit -m "feat(obj-explorer): add detail panel CSS"
```

---

### Task 3: Add click handler on Object Explorer rows

**Objective:** Make rows clickable, store detail data, show in detail panel

**Files:**
- Modify: `engine/index.html` — `openObjectExplorer()` function (~line 6086)

**Step 1: Add onclick to row generation**

In `openObjectExplorer()`, change the row HTML to include onclick:

```js
// Before (line 6129):
html += "<div class=\"obj-row\">";

// After:
html += "<div class=\"obj-row\" onclick=\"showObjectDetail('" + s[1] + "','" + item.id + "')\" style=\"cursor:pointer\">";
```

**Step 2: Add detail data mapping**

Add a helper object at module scope (before `openObjectExplorer`):

```js
// Object detail data cache for the explorer panel
var _objDetailCache = {};

function _buildDetailCache() {
    var C = window.S4WN_CONFIG;
    if (!C) return;
    ['buildings','resources','units','terrain','nations'].forEach(function(cat) {
        var items = C[cat];
        if (!items) return;
        items.forEach(function(item) {
            var key = cat + ':' + item.id;
            _objDetailCache[key] = {
                category: cat,
                id: item.id,
                name: item.name || item.id,
                name_de: item.name_de || '',
                icon: item.icon || '',
                description: item.description || '',
                // For buildings: map to model filename
                modelFile: cat === 'buildings' ? item.id.toLowerCase().replace(/\s+/g,'_') + '.json' : null
            };
        });
    });
}
```

**Step 3: Call cache build at end of openObjectExplorer**

At the end of `openObjectExplorer()`, add:
```js
    _buildDetailCache();
```

**Step 4: Add showObjectDetail function**

```js
function showObjectDetail(category, itemId) {
    var key = category + ':' + itemId;
    var data = _objDetailCache[key];
    var panel = document.getElementById('obj-explorer-detail');
    if (!panel || !data) return;

    // Highlight selected row
    document.querySelectorAll('.obj-row.selected').forEach(function(r) {
        r.classList.remove('selected');
    });
    // Find and highlight the clicked row
    var rows = document.querySelectorAll('.obj-row');
    rows.forEach(function(r) {
        var idSpan = r.querySelector('.obj-id');
        if (idSpan && idSpan.textContent === itemId) {
            r.classList.add('selected');
        }
    });

    var html = '';

    // Header
    html += '<div class="obj-detail-header">';
    html += '<span class="obj-icon">' + (data.icon || '📦') + '</span>';
    html += '<span class="obj-name">' + data.name + '</span>';
    html += '</div>';

    // Basic info section
    html += '<div class="obj-detail-section">';
    html += '<h4>Info</h4>';
    html += '<div class="obj-field"><span>ID</span><span>' + data.id + '</span></div>';
    html += '<div class="obj-field"><span>Category</span><span>' + data.category + '</span></div>';
    if (data.name_de) {
        html += '<div class="obj-field"><span>Name (DE)</span><span>' + data.name_de + '</span></div>';
    }
    if (data.description) {
        html += '<div class="obj-field"><span>Description</span><span style="font-size:11px;text-align:right;max-width:180px">' + data.description + '</span></div>';
    }
    html += '</div>';

    // Sprite image if available
    var spritePath = 'assets/buildings/' + data.id.toLowerCase().replace(/\s+/g, '_') + '.png';
    html += '<div class="obj-detail-section">';
    html += '<h4>Sprite</h4>';
    html += '<div class="obj-detail-sprite-wrap">';
    html += '<img class="obj-detail-sprite" src="' + spritePath + '" alt="' + data.name + '" onerror="this.parentNode.innerHTML=\\'<span style=color:#556;font-size:11px>No sprite available</span>\\'" onload="this.style.display=\\'block\\'" style="display:none">';
    html += '</div>';
    html += '</div>';

    // 3D model section (async load)
    html += '<div class="obj-detail-section" id="obj-model-section">';
    html += '<h4>3D Model</h4>';
    html += '<p style="color:#556;font-size:11px">Loading model data...</p>';
    html += '</div>';

    // Animation section
    html += '<div class="obj-detail-section">';
    html += '<h4>Animation</h4>';
    html += '<div class="obj-field"><span>Construction</span><span style="color:#8a8">✓</span></div>';
    html += '<div class="obj-field"><span>Destruction</span><span style="color:#8a8">✓</span></div>';
    html += '<div class="obj-field"><span>Idle</span><span style="color:#8a8">✓</span></div>';
    html += '</div>';

    panel.innerHTML = html;

    // Async load model JSON
    if (data.modelFile) {
        var modelUrl = 'assets/models/json/' + data.modelFile;
        fetch(modelUrl)
            .then(function(r) { return r.json(); })
            .then(function(model) {
                var modelSection = document.getElementById('obj-model-section');
                if (!modelSection) return;
                var indexCount = (model.indices || []).length;
                var faceCount = indexCount / 3;
                var mat = model.material || {};
                var diffuse = mat.diffuse || [0.5,0.5,0.5];
                var rgb = 'rgb(' + Math.round(diffuse[0]*255) + ',' + Math.round(diffuse[1]*255) + ',' + Math.round(diffuse[2]*255) + ')';
                var aabb = model.aabb || [0,0,0,1,1,1];
                var sx = (aabb[3] - aabb[0]).toFixed(2);
                var sy = (aabb[4] - aabb[1]).toFixed(2);
                var sz = (aabb[5] - aabb[2]).toFixed(2);

                var mhtml = '<h4>3D Model</h4>';
                mhtml += '<div class="obj-field"><span>Vertices</span><span>' + (model.vertices||[]).length + '</span></div>';
                mhtml += '<div class="obj-field"><span>Faces</span><span>' + faceCount + '</span></div>';
                mhtml += '<div class="obj-field"><span>Size (W×H×D)</span><span>' + sx + ' × ' + sy + ' × ' + sz + '</span></div>';
                mhtml += '<div class="obj-field"><span>Material</span><span><span class="obj-color-swatch" style="background:' + rgb + '"></span>' + rgb + '</span></div>';
                mhtml += '<div class="obj-field"><span>Roughness</span><span>' + (mat.roughness||0).toFixed(2) + '</span></div>';
                mhtml += '<div class="obj-field"><span>Metallic</span><span>' + (mat.metallic||0).toFixed(2) + '</span></div>';
                modelSection.innerHTML = mhtml;
            })
            .catch(function() {
                var modelSection = document.getElementById('obj-model-section');
                if (modelSection) {
                    modelSection.innerHTML = '<h4>3D Model</h4><p style="color:#556;font-size:11px">Model data not available</p>';
                }
            });
    }
}
```

**Step 4: Export to window**

Add to the window export block (~line 6688):
```js
window.showObjectDetail = showObjectDetail;
```

**Step 5: Commit**
```
git add engine/index.html
git commit -m "feat(obj-explorer): add click handler and detail panel rendering"
```

---

### Task 4: Add row selection highlight CSS

**Objective:** Visual feedback for selected row

**Files:**
- Modify: `engine/index.html` (CSS)

**Step 1: Add `.obj-row.selected` style**

After `.obj-row:hover`:
```css
  .obj-row.selected {
    background: rgba(200,170,100,0.15) !important;
    border-left: 3px solid #c8b878;
  }
```

**Step 2: Commit**
```
git add engine/index.html
git commit -m "feat(obj-explorer): add row selection highlight"
```

---

### Task 5: Mobile responsive — stack panels vertically

**Objective:** On mobile (<768px), detail panel appears below the list instead of beside it

**Files:**
- Modify: `engine/index.html` (CSS inside `@media (max-width: 767px)`)

**Step 1: Add mobile override**

Inside the `@media (max-width: 767px)` block (~line 1153):
```css
    /* Object Explorer: stack vertically */
    .obj-explorer-layout { flex-direction: column; }
    .obj-explorer-detail { width: 100%; min-width: 0; max-height: 30vh; }
    .obj-explorer-list { max-height: 30vh; }
```

**Step 2: Commit**
```
git add engine/index.html
git commit -m "feat(obj-explorer): mobile responsive stacked layout"
```

---

### Task 6: Fix model filename mapping

**Objective:** Map building config IDs to actual model JSON filenames (config uses CamelCase, files are lowercase)

**Files:**
- Modify: `engine/index.html` — `_buildDetailCache()` function

**Step 1: Add filename mapping**

The config uses IDs like `Headquarters`, `Woodcutter`, `Sawmill` — but JSON files are `headquarters.json`, `lumberjack.json`, `sawmill.json`. Add a mapping:

```js
var _BUILDING_MODEL_FILE = {
    'Headquarters': 'headquarters.json',
    'Woodcutter': 'lumberjack.json',
    'Forester': 'forester.json',
    'Sawmill': 'sawmill.json',
    'Stonecutter': 'stonecutter.json',
    'Farm': 'farm.json',
    'Mill': 'mill.json',
    'Bakery': 'bakery.json',
    'Fishery': 'fishery.json',
    'Waterworks': 'waterworks.json',
    'Ranch': 'ranch.json',
    'CoalMine': 'coalmine.json',
    'IronMine': 'ironmine.json',
    'GoldMine': 'goldmine.json',
    'SulfurMine': 'sulfurmine.json',
    'IronSmelter': 'ironsmelter.json',
    'GoldSmelter': 'goldsmelter.json',
    'Toolsmith': 'toolsmith.json',
    'Weaponsmith': 'weaponsmith.json',
    'Barracks': 'barracks.json',
    'GuardTower': 'guardtower.json',
    'Castle': 'castle.json',
    'Temple': 'temple.json',
    'Sanctuary': 'sanctuary.json',
    'Vineyard': 'vineyard.json',
    'Apiary': 'apiary.json',
    'Storage': 'storage.json',
    'Marketplace': 'marketplace.json',
    'Shipyard': 'shipyard.json',
    'Residence': 'residence.json',
    'AgaveFarm': 'agavefarm.json',
    'Amphitheater': 'amphitheater.json',
    'Armory': 'armory.json',
    'Blacksmith': 'blacksmith.json',
    'Boat': 'boat.json',
    'Brickworks': 'brickworks.json'
};
```

Use in `_buildDetailCache`:
```js
modelFile: cat === 'buildings' ? (_BUILDING_MODEL_FILE[item.id] || null) : null
```

**Step 2: Also update sprite path lookup**

```js
var _BUILDING_SPRITE = {
    'Headquarters': 'headquarters.png',
    'Farm': 'farm.png',
    'Woodcutter': 'lumberjack.png',
    'Sawmill': 'sawmill.png',
    'Storage': 'warehouse.png'
};
```

Use for sprite path:
```js
var spriteFile = _BUILDING_SPRITE[data.id];
var spritePath = spriteFile ? 'assets/buildings/' + spriteFile : null;
```

**Step 3: Commit**
```
git add engine/index.html
git commit -m "fix(obj-explorer): map building IDs to model filenames and sprites"
```

---

### Verification

After all tasks:
1. Open Object Explorer from main menu
2. Click a building row (e.g., Headquarters) → detail panel shows icon, name, model metadata (65 vertices, 128 faces, gold material), sprite image, animation list
3. Click a resource row → shows resource info without model section
4. Click a unit row → shows unit info
5. Resize to mobile → panels stack vertically

No `cargo test` or WASM rebuild needed — all JS/CSS changes.

---

### Risks / Open Questions

- **Model filename mapping is manual**: Any new building added to config needs an entry in `_BUILDING_MODEL_FILE`. Could auto-derive from `assets/models/json/*.json` listing, but that requires a server-side directory listing or prebuilt index.
- **Sprite availability**: Only 5 sprites exist. Most buildings show "No sprite available" — acceptable for now.
- **Live 3D preview**: Deferred to Phase 2. Would need a separate WebGL canvas, model loading into GPU, and orbit camera controls. Significant engine work.
- **Animation playback**: Deferred to Phase 2. Currently just lists that animations exist (all buildings have construction/destruction/idle).
