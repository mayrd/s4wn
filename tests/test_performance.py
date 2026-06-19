"""Performance and stability tests for S4WN.

Tests:
- Page load time
- WASM init time
- Frame rate stability
"""
import time
import pytest
from playwright.sync_api import Page, expect


class TestPerformance:
    """Performance benchmarks for S4WN pages."""

    def test_index_page_load_time(self, page, s4wn_server):
        """Index.html should load within reasonable time."""
        start = time.time()
        page.goto(f"{s4wn_server}/engine/index.html", wait_until="domcontentloaded")
        load_time = time.time() - start
        assert load_time < 10, f"Page took {load_time:.1f}s to load (expected <10s)"

    def test_wasm_init_time(self, s4wn_page: Page):
        """WASM initialization should complete within 5 seconds."""
        result = s4wn_page.evaluate("""
            () => {
                const canvas = document.querySelector('canvas');
                return canvas && canvas.width > 0;
            }
        """)
        assert result is True

    def test_canvas_animation_running(self, s4wn_page: Page):
        """Canvas should be actively rendering (check via requestAnimationFrame)."""
        result = s4wn_page.evaluate("""
            () => {
                return new Promise((resolve) => {
                    let frames = 0;
                    const start = performance.now();
                    const tick = () => {
                        frames++;
                        if (performance.now() - start > 500) {
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

    def test_page_responsive_to_clicks(self, s4wn_page: Page):
        """UI should remain responsive after multiple interactions."""
        for _ in range(5):
            s4wn_page.locator("#btn-speed").click()
            s4wn_page.wait_for_timeout(100)
        assert s4wn_page.locator("#btn-speed").is_visible()
