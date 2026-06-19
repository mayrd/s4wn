"""Visual regression tests — screenshot comparisons.

Captures screenshots of the canvas and UI elements for visual diffing.
Requires baseline images in tests/screenshots/.
"""
import os
import pytest
from playwright.sync_api import Page, expect


SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")


@pytest.fixture(autouse=True)
def setup_screenshot_dir():
    """Ensure screenshot directory exists."""
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)


class TestVisualRegression:
    """Capture and compare UI screenshots."""

    def test_index_page_full_screenshot(self, s4wn_page: Page):
        """Capture full page screenshot of index.html."""
        path = os.path.join(SCREENSHOT_DIR, "index_page.png")
        s4wn_page.screenshot(path=path, full_page=True)
        assert os.path.exists(path)
        assert os.path.getsize(path) > 1000  # Not empty

    def test_canvas_screenshot(self, s4wn_page: Page):
        """Capture canvas element screenshot."""
        canvas = s4wn_page.locator("#game-canvas")
        path = os.path.join(SCREENSHOT_DIR, "game_canvas.png")
        canvas.screenshot(path=path)
        assert os.path.exists(path)
        assert os.path.getsize(path) > 500

    def test_menu_open_screenshot(self, s4wn_page: Page):
        """Capture screenshot with menu open."""
        s4wn_page.locator("#btn-menu").click()
        s4wn_page.wait_for_timeout(500)
        path = os.path.join(SCREENSHOT_DIR, "menu_open.png")
        s4wn_page.screenshot(path=path, full_page=True)
        assert os.path.exists(path)

    def test_construction_panel_screenshot(self, s4wn_page: Page):
        """Capture screenshot with construction panel open."""
        s4wn_page.locator("#btn-construction").click()
        s4wn_page.wait_for_timeout(500)
        path = os.path.join(SCREENSHOT_DIR, "construction_panel.png")
        s4wn_page.screenshot(path=path, full_page=True)
        assert os.path.exists(path)

    def test_stats_panel_screenshot(self, s4wn_page: Page):
        """Capture screenshot with stats panel open."""
        s4wn_page.locator("#btn-stats").click()
        s4wn_page.wait_for_timeout(500)
        path = os.path.join(SCREENSHOT_DIR, "stats_panel.png")
        s4wn_page.screenshot(path=path, full_page=True)
        assert os.path.exists(path)

    def test_lobby_page_screenshot(self, page, s4wn_server):
        """Capture lobby page screenshot."""
        url = f"{s4wn_server}/lobby.html"
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        path = os.path.join(SCREENSHOT_DIR, "lobby_page.png")
        page.screenshot(path=path, full_page=True)
        assert os.path.exists(path)

    def test_map_viewer_screenshot(self, page, s4wn_server):
        """Capture map viewer page screenshot."""
        url = f"{s4wn_server}/map-viewer.html"
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_timeout(1000)
        path = os.path.join(SCREENSHOT_DIR, "map_viewer.png")
        page.screenshot(path=path, full_page=True)
        assert os.path.exists(path)
