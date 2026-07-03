/**
 * S4WN Object Explorer Component & 3D Preview Renderer
 */

const _BUILDING_MODEL_FILE = {
    'Headquarters': 'headquarters.json', 'Woodcutter': 'lumberjack.json',
    'Forester': 'forester.json', 'Sawmill': 'sawmill.json',
    'Stonecutter': 'stonecutter.json', 'Farm': 'farm.json',
    'Mill': 'mill.json', 'Bakery': 'bakery.json',
    'Fishery': 'fishery.json', 'Waterworks': 'waterworks.json',
    'Ranch': 'ranch.json', 'CoalMine': 'coalmine.json',
    'IronMine': 'ironmine.json', 'GoldMine': 'goldmine.json',
    'SulfurMine': 'sulfurmine.json', 'IronSmelter': 'ironsmelter.json',
    'GoldSmelter': 'goldsmelter.json', 'Toolsmith': 'toolsmith.json',
    'Weaponsmith': 'weaponsmith.json', 'Barracks': 'barracks.json',
    'GuardTower': 'guardtower.json', 'Castle': 'fortress.json',
    'Temple': 'temple.json', 'Sanctuary': 'sanctuary.json',
    'Vineyard': 'vineyard.json', 'Apiary': 'apiary.json',
    'Storage': 'storage.json', 'Marketplace': 'marketplace.json',
    'Shipyard': 'shipyard.json', 'Residence': 'residence.json',
    'AgaveFarm': 'agavefarm.json', 'Amphitheater': 'amphitheater.json',
    'Armory': 'armory.json', 'Blacksmith': 'blacksmith.json',
    'Boat': 'boat.json', 'Brickworks': 'brickworks.json'
};

const _BUILDING_SPRITE = {
    'Headquarters': 'headquarters.png', 'Farm': 'farm.png',
    'Woodcutter': 'lumberjack.png', 'Sawmill': 'sawmill.png',
    'Storage': 'warehouse.png'
};

const _TERRAIN_SPRITE = {
    'Grass': 'terrain_grass.png', 'Forest': 'terrain_forest.png',
    'Mountain': 'terrain_mountain.png', 'Water': 'terrain_water.png',
    'DeepWater': 'terrain_deepwater.png', 'Desert': 'terrain_desert.png',
    'Snow': 'terrain_snow.png', 'Swamp': 'terrain_swamp.png'
};

let _objDetailCache = {};

export function _buildDetailCache() {
    const C = window.S4WN_CONFIG;
    if (!C) return;
    ['buildings','resources','units','terrain','nations'].forEach(function(cat) {
        const items = C[cat];
        if (!items) return;
        items.forEach(function(item) {
            const key = cat + ':' + item.id;
            const rustName = (window.BUILDING_RUST_NAME && window.BUILDING_RUST_NAME[item.id]) || item.id;
            _objDetailCache[key] = {
                category: cat, id: item.id,
                name: item.name || item.id, name_de: item.name_de || '',
                icon: item.icon || '', description: item.description || '',
                modelFile: cat === 'buildings' ? (_BUILDING_MODEL_FILE[rustName] || null) : null,
                spriteFile: cat === 'buildings' ? (_BUILDING_SPRITE[item.id] || null)
                          : cat === 'terrain' ? (item.spriteFile || _TERRAIN_SPRITE[item.name] || null) : null
            };
        });
    });
}

// ── 3D Model Preview Renderer (pure JS WebGL) ──────────────────────────
export function ModelPreviewRenderer(canvas, modelJson) {
    const gl = canvas.getContext('webgl2', {antialias: true, alpha: false});
    if (!gl) { canvas.outerHTML = '<p style="color:#a88;font-size:11px;text-align:center;padding:20px">WebGL2 not available</p>'; return; }
    const model = typeof modelJson === 'string' ? JSON.parse(modelJson) : modelJson;
    const material = model.material || {diffuse: [0.5,0.5,0.5], roughness: 0.7, metallic: 0.05};

    // Shaders
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, '#version 300 es\nprecision highp float;\nuniform mat4 u_mvp;\nuniform mat4 u_model;\nin vec3 a_pos;\nin vec3 a_norm;\nout vec3 v_norm;\nout vec3 v_pos;\nvoid main(){vec4 wp=u_model*vec4(a_pos,1.0);v_pos=wp.xyz;v_norm=mat3(u_model)*a_norm;gl_Position=u_mvp*vec4(a_pos,1.0);}');
    gl.compileShader(vs);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, '#version 300 es\nprecision highp float;\nuniform vec3 u_color;\nuniform float u_rough;\nuniform float u_metal;\nuniform vec3 u_light;\nuniform vec3 u_cam;\nin vec3 v_norm;\nin vec3 v_pos;\nout vec4 frag;\nvoid main(){vec3 N=normalize(v_norm);vec3 L=normalize(u_light-v_pos);vec3 V=normalize(u_cam-v_pos);vec3 H=normalize(L+V);float diff=max(dot(N,L),0.0);float spec=pow(max(dot(N,H),0.0),32.0/(u_rough+0.01));float amb=0.15;vec3 col=u_color*(amb+diff*0.85)+vec3(0.3)*spec*(1.0-u_rough);frag=vec4(col,1.0);}');
    gl.compileShader(fs);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);
    const u_mvp = gl.getUniformLocation(prog, 'u_mvp');
    const u_model = gl.getUniformLocation(prog, 'u_model');
    const u_color = gl.getUniformLocation(prog, 'u_color');
    const u_rough = gl.getUniformLocation(prog, 'u_rough');
    const u_metal = gl.getUniformLocation(prog, 'u_metal');
    const u_light = gl.getUniformLocation(prog, 'u_light');
    const u_cam = gl.getUniformLocation(prog, 'u_cam');

    // Buffers
    const verts = new Float32Array(model.vertices.flat());
    const norms = new Float32Array(model.normals.flat());
    const idx = new Uint16Array(model.indices);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts.length*4 + norms.length*4, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
    gl.bufferSubData(gl.ARRAY_BUFFER, verts.length*4, norms);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, verts.length*4); gl.enableVertexAttribArray(1);
    gl.bindAttribLocation(prog, 0, 'a_pos'); gl.bindAttribLocation(prog, 1, 'a_norm');
    const ibo = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    // Orbit state
    let rotY = 0.8, rotX = 0.5, zoom;
    let autoRotate = true, dragging = false, lastX = 0, lastY = 0;

    canvas.addEventListener('mousedown', function(e) { dragging = true; autoRotate = false; lastX = e.clientX; lastY = e.clientY; e.preventDefault(); });
    canvas.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        rotY += (e.clientX - lastX) * 0.01;
        rotX += (e.clientY - lastY) * 0.01;
        rotX = Math.max(-1.4, Math.min(1.4, rotX));
        lastX = e.clientX; lastY = e.clientY;
    });
    canvas.addEventListener('mouseup', function() { dragging = false; });
    canvas.addEventListener('mouseleave', function() { dragging = false; });
    canvas.addEventListener('wheel', function(e) { zoom *= e.deltaY > 0 ? 1.1 : 0.9; zoom = Math.max(0.5, Math.min(8, zoom)); e.preventDefault(); }, {passive: false});
    
    // Touch
    canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) { dragging = true; autoRotate = false; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
    }, {passive: false});
    canvas.addEventListener('touchmove', function(e) {
        if (!dragging || e.touches.length !== 1) return;
        rotY += (e.touches[0].clientX - lastX) * 0.01;
        rotX += (e.touches[0].clientY - lastY) * 0.01;
        rotX = Math.max(-1.4, Math.min(1.4, rotX));
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        e.preventDefault();
    }, {passive: false});
    canvas.addEventListener('touchend', function() { dragging = false; });

    // Matrices
    function perspective(fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov / 2), d = 1.0 / (near - far);
        return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*d,-1, 0,0,2*near*far*d,0];
    }
    function mul4(a, b) {
        const r = new Array(16);
        for (let i = 0; i < 4; i++)
            for (let j = 0; j < 4; j++)
                r[i*4+j] = a[i*4+0]*b[0*4+j] + a[i*4+1]*b[1*4+j] + a[i*4+2]*b[2*4+j] + a[i*4+3]*b[3*4+j];
        return r;
    }
    function rotYMatrix(a) { const c=Math.cos(a),s=Math.sin(a); return [c,0,s,0, 0,1,0,0, -s,0,c,0, 0,0,0,1]; }
    function rotXMatrix(a) { const c=Math.cos(a),s=Math.sin(a); return [1,0,0,0, 0,c,-s,0, 0,s,c,0, 0,0,0,1]; }
    function translate(x,y,z) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]; }
    function scaleMatrix(x,y,z) { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]; }

    const aabb = model.aabb || [0,0,0,1,1,1];
    const ex = aabb[3]-aabb[0], ey = aabb[4]-aabb[1], ez = aabb[5]-aabb[2];
    const maxExtent = Math.max(ex, ey, ez);
    zoom = Math.max(0.8, Math.min(8.0, maxExtent * 2.2));
    const cx = (aabb[0]+aabb[3])/2, cy = (aabb[1]+aabb[4])/2, cz = (aabb[2]+aabb[5])/2;
    const animStart = performance.now();

    function renderFrame(now) {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (w === 0 || h === 0) { requestAnimationFrame(renderFrame); return; }
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.clearColor(0.06, 0.10, 0.18, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        // Auto-rotate
        if (autoRotate) rotY += 0.005;

        // Construction animation: 0.3→1.0 over 2.5s, loop
        const t = ((now - animStart) % 2500) / 2500;
        const ease = 1.0 - (1.0 - t) * (1.0 - t);
        const animScale = 0.3 + 0.7 * ease;

        const proj = perspective(0.8, w/h, 0.1, 20);
        let view = mul4(translate(0, 0, -zoom), mul4(rotXMatrix(rotX), rotYMatrix(rotY)));
        view = mul4(view, translate(-cx, -cy, -cz));
        const modelMat = scaleMatrix(animScale, animScale, animScale);
        const mvp = mul4(proj, mul4(view, modelMat));

        gl.uniformMatrix4fv(u_mvp, false, mvp);
        gl.uniformMatrix4fv(u_model, false, modelMat);
        gl.uniform3f(u_color, material.diffuse[0], material.diffuse[1], material.diffuse[2]);
        gl.uniform1f(u_rough, material.roughness || 0.7);
        gl.uniform1f(u_metal, material.metallic || 0.05);
        gl.uniform3f(u_light, 3, 5, 4);
        gl.uniform3f(u_cam, 0, 0, zoom);

        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
        requestAnimationFrame(renderFrame);
    }
    requestAnimationFrame(renderFrame);
}

export function openObjectExplorer() {
    console.log('ObjectExplorer: opening...');
    try { if (typeof window.closeMenu === 'function') window.closeMenu(); } catch(e) { console.warn('ObjectExplorer: closeMenu failed', e); }
    const panel = document.getElementById("obj-explorer");
    const body = document.getElementById("obj-explorer-body");
    if (!panel || !body) {
        console.error('ObjectExplorer: DOM elements missing — panel=' + !!panel + ' body=' + !!body);
        if (typeof window.showToast === 'function') window.showToast('Object Explorer unavailable. Please refresh the page.');
        return;
    }
    const C = window.S4WN_CONFIG;
    if (!C) {
        console.error('ObjectExplorer: S4WN_CONFIG not loaded');
        body.innerHTML = '<p style="color:#c8b878;padding:20px;">Configuration data not loaded. Please refresh the page.</p>';
        panel.classList.add("active");
        return;
    }

    console.log('ObjectExplorer: config loaded, buildings=' + (C.buildings ? C.buildings.length : 0) +
        ', resources=' + (C.resources ? C.resources.length : 0) +
        ', units=' + (C.units ? C.units.length : 0) +
        ', terrain=' + (C.terrain ? C.terrain.length : 0));
    let html = "";
    const sections = [
        ["Buildings", "buildings"],
        ["Resources", "resources"],
        ["Units & Settlers", "units"],
        ["Terrain", "terrain"],
        ["Nations", "nations"]
    ];
    sections.forEach(function(s) {
        const items = C[s[1]];
        if (!items || !items.length) {
            console.warn('ObjectExplorer: section "' + s[0] + '" has no items');
            return;
        }
        html += "<h3>" + s[0] + " (" + items.length + ")</h3>";
        items.forEach(function(item) {
            const icon = item.icon || "";
            const id = item.id || "";
            const name = item.name || "";
            const nameDe = item.name_de || "";
            const desc = item.description || "";
            html += "<div class=\"obj-row\" onclick=\"showObjectDetail('" + s[1] + "','" + item.id + "')\" style=\"cursor:pointer\">";
            html += "<span class=\"obj-icon\">" + icon + "</span>";
            html += "<span class=\"obj-id\">" + id + "</span>";
            html += "<span class=\"obj-name\">" + name + "</span>";
            html += "<span class=\"obj-name-de\">" + nameDe + "</span>";
            html += "<span class=\"obj-desc\">" + desc + "</span>";
            html += "</div>";
        });
    });
    if (!html) {
        console.error('ObjectExplorer: no content generated — all sections empty');
        html = '<p style="color:#8899aa;padding:20px;">No content available.</p>';
    }
    body.innerHTML = html;
    panel.classList.add("active");
    _buildDetailCache();
    console.log('ObjectExplorer: displayed with ' + sections.filter(function(s) { return C[s[1]] && C[s[1]].length; }).length + ' sections');
}

export function closeObjectExplorer() {
    console.log('ObjectExplorer: closing');
    const panel = document.getElementById("obj-explorer");
    if (panel) panel.classList.remove("active");
}

export function showObjectDetail(category, itemId) {
    const key = category + ':' + itemId;
    const data = _objDetailCache[key];
    const panel = document.getElementById('obj-explorer-detail');
    if (!panel || !data) return;

    // Highlight selected row
    document.querySelectorAll('.obj-row.selected').forEach(function(r) {
        r.classList.remove('selected');
    });
    const rows = document.querySelectorAll('.obj-row');
    rows.forEach(function(r) {
        const idSpan = r.querySelector('.obj-id');
        if (idSpan && idSpan.textContent === itemId) {
            r.classList.add('selected');
        }
    });

    let html = '';
    // Header
    html += '<div class="obj-detail-header">';
    html += '<span class="obj-icon">' + (data.icon || '📦') + '</span>';
    html += '<span class="obj-name">' + data.name + '</span>';
    html += '</div>';
    // Info section
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
    // Sprite / Terrain Tile
    html += '<div class="obj-detail-section">';
    html += '<h4>' + (data.category === 'terrain' ? 'Terrain Tile' : 'Sprite') + '</h4>';
    html += '<div class="obj-detail-sprite-wrap">';
    if (data.spriteFile) {
        const spriteDir = data.category === 'terrain' ? '/assets/textures/' : '/assets/buildings/';
        const animClass = data.category === 'terrain' ? (' obj-terrain-tile obj-terrain-' + data.name.toLowerCase()) : ' obj-detail-sprite';
        html += '<img class="' + animClass + '" src="' + spriteDir + data.spriteFile + '" alt="' + data.name + '" onerror="this.parentNode.innerHTML=\'<span style=color:#556;font-size:11px>No sprite available</span>\'">';
    } else {
        html += '<span style="color:#556;font-size:11px">No sprite available</span>';
    }
    html += '</div>';
    html += '</div>';
    // 3D model (async)
    html += '<div class="obj-detail-section" id="obj-model-section">';
    html += '<h4>3D Model</h4>';
    html += '<p style="color:#556;font-size:11px">Loading model data...</p>';
    html += '<canvas id="obj-model-canvas" class="obj-model-canvas" width="300" height="250"></canvas>';
    html += '</div>';
    // Animation
    html += '<div class="obj-detail-section">';
    html += '<h4>Animation</h4>';
    html += '<div class="obj-field"><span>Construction</span><span style="color:#8a8">✓</span></div>';
    html += '<div class="obj-field"><span>Destruction</span><span style="color:#8a8">✓</span></div>';
    html += '<div class="obj-field"><span>Idle</span><span style="color:#8a8">✓</span></div>';
    html += '</div>';
    // Report issue button
    const issueTitle = encodeURIComponent('[Object Explorer] ' + data.category + ': ' + data.name + ' (' + data.id + ')');
    const issueBody = encodeURIComponent(
        '**Category:** ' + data.category + '\n' +
        '**ID:** ' + data.id + '\n' +
        '**Name:** ' + data.name + '\n' +
        (data.name_de ? '**Name (DE):** ' + data.name_de + '\n' : '') +
        (data.description ? '**Description:** ' + data.description + '\n' : '') +
        (data.modelFile ? '**Model file:** ' + data.modelFile + '\n' : '') +
        '\n**Issue:** \n\n' +
        '**Screenshot:** (paste here)\n'
    );
    const issueUrl = 'https://github.com/mayrd/s4wn/issues/new?title=' + issueTitle + '&body=' + issueBody;
    html += '<div class="obj-detail-section" style="margin-top:auto">';
    html += '<a href="' + issueUrl + '" target="_blank" rel="noopener" class="obj-report-btn">🐛 Report Issue</a>';
    html += '</div>';
    panel.innerHTML = html;
    
    // Async load model JSON
    if (data.modelFile) {
        const modelUrl = '/assets/models/json/' + data.modelFile;
        fetch(modelUrl)
            .then(function(r) { return r.json(); })
            .then(function(model) {
                const ms = document.getElementById('obj-model-section');
                if (!ms) return;
                const fc = (model.indices || []).length / 3;
                const mat = model.material || {};
                const d = mat.diffuse || [0.5,0.5,0.5];
                const rgb = 'rgb(' + Math.round(d[0]*255) + ',' + Math.round(d[1]*255) + ',' + Math.round(d[2]*255) + ')';
                const aabb = model.aabb || [0,0,0,1,1,1];
                const sx = (aabb[3]-aabb[0]).toFixed(2), sy = (aabb[4]-aabb[1]).toFixed(2), sz = (aabb[5]-aabb[2]).toFixed(2);
                let mh = '<h4>3D Model</h4>';
                mh += '<div class="obj-field"><span>Vertices</span><span>' + (model.vertices||[]).length + '</span></div>';
                mh += '<div class="obj-field"><span>Faces</span><span>' + fc + '</span></div>';
                mh += '<div class="obj-field"><span>Size (W×H×D)</span><span>' + sx + ' × ' + sy + ' × ' + sz + '</span></div>';
                mh += '<div class="obj-field"><span>Material</span><span><span class="obj-color-swatch" style="background:' + rgb + '"></span>' + rgb + '</span></div>';
                mh += '<div class="obj-field"><span>Roughness</span><span>' + (mat.roughness||0).toFixed(2) + '</span></div>';
                mh += '<div class="obj-field"><span>Metallic</span><span>' + (mat.metallic||0).toFixed(2) + '</span></div>';
                mh += '<canvas class="obj-model-canvas" id="obj-model-canvas" width="300" height="250"></canvas>';
                ms.innerHTML = mh;
                // Start 3D preview renderer
                const previewCanvas = document.getElementById('obj-model-canvas');
                if (previewCanvas && model.vertices && model.vertices.length > 0) {
                    new ModelPreviewRenderer(previewCanvas, model);
                }
            })
            .catch(function() {
                const ms = document.getElementById('obj-model-section');
                if (ms) ms.innerHTML = '<h4>3D Model</h4><p style="color:#556;font-size:11px">Model data not available</p>';
            });
    } else {
        const ms = document.getElementById('obj-model-section');
        if (ms) ms.innerHTML = '<h4>3D Model</h4><p style="color:#556;font-size:11px">No 3D model for this item type</p>';
    }
}

// Expose on window
window.openObjectExplorer = openObjectExplorer;
window.closeObjectExplorer = closeObjectExplorer;
window.showObjectDetail = showObjectDetail;
