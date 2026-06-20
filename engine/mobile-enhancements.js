// S4WN Mobile Enhancements (Session 94)
// Orientation-change handler + construction panel accordion

let lastOrientation = screen.orientation ? screen.orientation.type : '';
function handleOrientationChange() {
    clearTimeout(window._orientationDebounce);
    window._orientationDebounce = setTimeout(function() {
        var newOrientation = screen.orientation ? screen.orientation.type : '';
        if (newOrientation !== lastOrientation) {
            lastOrientation = newOrientation;
            if (typeof resizeCanvas === 'function') resizeCanvas();
            if (typeof setupConstructionAccordion === 'function') {
                setTimeout(setupConstructionAccordion, 150);
            }
        }
    }, 200);
}
if (screen.orientation) {
    screen.orientation.addEventListener('change', handleOrientationChange);
}
var portraitQuery = window.matchMedia('(orientation: portrait)');
var landscapeQuery = window.matchMedia('(orientation: landscape)');
if (portraitQuery.addEventListener) {
    portraitQuery.addEventListener('change', handleOrientationChange);
    landscapeQuery.addEventListener('change', handleOrientationChange);
} else {
    portraitQuery.addListener(handleOrientationChange);
    landscapeQuery.addListener(handleOrientationChange);
}

function setupConstructionAccordion() {
    var headers = document.querySelectorAll('#construction-panel .con-cat-header');
    var isMobile = window.innerWidth < 768;
    headers.forEach(function(header, idx) {
        if (!header.querySelector('.accordion-arrow')) {
            var arrow = document.createElement('span');
            arrow.className = 'accordion-arrow';
            arrow.textContent = '▼';
            arrow.style.cssText = 'float:right;font-size:10px;transition:transform 0.3s;color:#789;';
            header.appendChild(arrow);
        }
        var body = header.nextElementSibling;
        if (!body || !body.classList.contains('con-cat-body')) return;
        var arrow = header.querySelector('.accordion-arrow');
        if (isMobile) {
            header.style.cursor = 'pointer';
            if (idx > 0) {
                body.style.maxHeight = '0';
                body.style.overflow = 'hidden';
                if (arrow) arrow.style.transform = 'rotate(-90deg)';
            }
            if (!header._hasAccordion) {
                header._hasAccordion = true;
                header.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var b = this.nextElementSibling;
                    var a = this.querySelector('.accordion-arrow');
                    var collapsed = b.style.maxHeight === '0px';
                    b.style.maxHeight = collapsed ? '800px' : '0';
                    if (a) a.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
                });
            }
        } else {
            body.style.maxHeight = '800px';
            body.style.overflow = '';
            if (arrow) arrow.style.transform = 'rotate(0deg)';
            header.style.cursor = '';
        }
    });
}

var _origToggle = window.toggleConstructionPanel;
if (_origToggle) {
    window.toggleConstructionPanel = function() {
        _origToggle();
        setTimeout(setupConstructionAccordion, 20);
    };
}
console.log('S4WN mobile enhancements loaded (Session 94)');

// -- Sound Effects Tests (#118) -----------------------------------------
// Tests for the procedural Web Audio API sound effects system.
// Run: console.log(SfxTest.run())
(function() {
    window.SfxTest = {
        tests: [],
        assert(desc, condition) {
            this.tests.push({ desc: desc, ok: !!condition });
            if (!condition) console.warn('SfxTest FAIL:', desc);
        },
        run() {
            this.tests = [];
            var S = window.Sfx;
            this.assert('Sfx object exists on window', typeof S === 'object' && S !== null);
            this.assert('playUIClick is a function', typeof S.playUIClick === 'function');
            this.assert('playBuild is a function', typeof S.playBuild === 'function');
            this.assert('playCombat is a function', typeof S.playCombat === 'function');
            this.assert('playDeath is a function', typeof S.playDeath === 'function');
            this.assert('playError is a function', typeof S.playError === 'function');
            this.assert('playMenuToggle is a function', typeof S.playMenuToggle === 'function');
            this.assert('test is a function', typeof S.test === 'function');

            try { S.playUIClick(); this.assert('playUIClick runs without throwing', true); }
            catch(e) { this.assert('playUIClick runs without throwing: ' + e.message, false); }
            try { S.playBuild(); this.assert('playBuild runs without throwing', true); }
            catch(e) { this.assert('playBuild runs without throwing: ' + e.message, false); }
            try { S.playCombat(); this.assert('playCombat runs without throwing', true); }
            catch(e) { this.assert('playCombat runs without throwing: ' + e.message, false); }
            try { S.playDeath(); this.assert('playDeath runs without throwing', true); }
            catch(e) { this.assert('playDeath runs without throwing: ' + e.message, false); }
            try { S.playError(); this.assert('playError runs without throwing', true); }
            catch(e) { this.assert('playError runs without throwing: ' + e.message, false); }
            try { S.playMenuToggle(); this.assert('playMenuToggle runs without throwing', true); }
            catch(e) { this.assert('playMenuToggle runs without throwing: ' + e.message, false); }

            try {
                var r = JSON.parse(S.test());
                this.assert('test() returns ctxAvailable', 'ctxAvailable' in r);
                this.assert('test() returns state', 'state' in r);
            } catch(e) {
                this.assert('test() returns valid JSON: ' + e.message, false);
            }

            var passed = this.tests.filter(function(t) { return t.ok; }).length;
            var total = this.tests.length;
            console.log('SfxTest: ' + passed + '/' + total + ' passed');
            return JSON.stringify({ passed: passed, total: total, results: this.tests }, null, 2);
        }
    };
})();
