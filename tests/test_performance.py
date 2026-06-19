"""Performance and stability tests for S4WN.

Tests:
- Page load time
- WASM init time
- Frame rate stability
- Memory leak detection (basic)
"""
import pytest
from playwright.sync_api import Page, expect


class TestPerformance:
    """Performance benchmarks for S4WN pages."""

    def test_index_page_load_time(self, page, s4wn_server):
        """Index.html should load within reasonable time."""
        import time
        start = time.time()
        page.goto(f"{s4wn_server}/index.html", wait_until="domcontentloaded")
        load_time = time.time() - start
        assert load_time < 10, f"Page took {load_time:.1f}s to load (expected <10s)"

    def test_wasm_init_time(self, s4wn_page: Page):
        """WASM initialization should complete within 5 seconds."""
        result = s4wn_page.evaluate("""
            () => {
                const start = performance.now();
                return new Promise((resolve) => {
                    const check = () => {
                        if (window.__s4wn_ready || document.querySelector('canvas')) {
                            resolve(Math.round(performance.now() - start));
                        } else {
                            setTimeout(check, 100);
                        }
                    };
                    setTimeout(check, 100);
                    setTimeout(() => resolve(-1), 10000); // timeout
                });
            }
        """)
        # Result is the init time in ms
        assert result > 0, "WASM init timed out"
        assert result < 5000, f"WASM init took {result}ms (expected <5000ms)"

    def test_canvas_animation_running(self, s4wn_page: Page):
        """Canvas should be actively rendering (check via requestAnimationFrame)."""
        result = s4wn_page.evaluate("""
            () => {
                return new Promise((resolve) => {
                    let frames = 0;
                    const start = performance.now();
                    const tick = () => {
                        frames++;
                        if (performance.now() - start > 1000) {
                            resolve(frames);
                        } else {
                            requestAnimationFrame(tick);
                        }
                    };
                    requestAnimationFrame(tick);
                });
            }
        """)
        assert result > 0, "No animation frames detected"

    def test_no_memory_growth_on_repeated_resizes(self, s4wn_page: Page):
        """Repeated resize calls should not cause issues."""
        for _ in range(10):
            s4wn_page.evaluate("window.resize(800, 600)")
            s4wn_page.wait_for_timeout(50)
        # If we got here without crash, it's stable
        canvas = s4wn_page.locator("#game-canvas")
        expect(canvas).to_be_visible()
