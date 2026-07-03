/**
 * S4WN Splash Screen Component
 * Manages `#splash` particles and fade-out transition sequence.
 */

export function initSplash() {
    const splash = document.getElementById('splash');
    const container = document.getElementById('splash-particles');
    
    if (!container) return;
    
    // Generate floating gold particles behind the title
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'sp-particle';
        // Random horizontal position centered around title area
        p.style.left = (30 + Math.random() * 40) + '%';
        p.style.top = (40 + Math.random() * 20) + '%';
        p.style.animationDelay = (Math.random() * 3) + 's';
        p.style.animationDuration = (2.5 + Math.random() * 2) + 's';
        // Slight size variation
        const sz = 2 + Math.random() * 4;
        p.style.width = sz + 'px';
        p.style.height = sz + 'px';
        container.appendChild(p);
    }

    // Trigger splash fade-out and open main menu
    setTimeout(() => {
        if (splash) {
            splash.classList.add('hidden');
            document.body.classList.remove('splash-active');
            // Remove splash from layout after fade transition (Fixes #72)
            setTimeout(() => { splash.style.display = 'none'; }, 850);
        }
        
        // Open menu so player can start a game
        setTimeout(() => {
            if (typeof window.openMenu === 'function') {
                window.openMenu();
            }
        }, 500);
    }, 2000);
}

window.initSplash = initSplash;
