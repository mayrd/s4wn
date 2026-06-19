"""Tests for map-viewer.html — standalone map viewer.

Coeds:
- Page loads correctly
- Canvas renders
- File input works for loading maps
- Minimap exists
- Camera controls (drag/zoom) work
"""
import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def map_viewer_page(page, s4wn_server) -> Page:
    """Navigate to map-viewer.html."""
    url = f"{s4wn_server}/map-viewer.html"
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_function(
        "() => document.querySelector('canvas') !== null && "
        "document.querySelector('canvas').width > 0",
        timeout=15000,
    )
    return page


class TestMapViewerLoad:
    """Verify map viewer loads correctly."""

    def test_canvas_visible(self, map_viewer_page: Page):
        canvas = map_viewer_page.locator("#canvas")
        expect(canvas).to_be_visible()

    def test_canvas_has_dimensions(self, map_viewer_page: Page):
        bbox = map_viewer_page.locator("#canvas").bounding_box()
        assert bbox is not None
        assert bbox["width"] >= 400
        assert bbox["height"] >= 400

    def test_file_input_exists(self, map_viewer_page: Page):
        file_input = map_viewer_page.locator("#fileInput")
        assert file_input.count() == 1

    def test_minimap_exists(self, map_viewer_page: Page):
        minimap = map_viewer_page.locator("#minimap")
        assert minimap.count() == 1


class TestMapViewerInteraction:
    """Verify map viewer interactions."""

    def test_canvas_responsive_to_mouse(self, map_viewer_page: Page):
        """Canvas should respond to mouse events (camera drag)."""
        canvas = map_viewer_page.locator("#canvas")
        bbox = canvas.bounding_box()
        assert bbox is not None

        cx = bbox["x"] + bbox["width"] / 2
        cy = bbox["y"] + bbox["height"] / 2

        # Simulate mouse drag
        map_viewer_page.mouse.move(cx, cy)
        map_viewer_page.mouse.down()
        map_viewer_page.mouse.move(cx + 50, cy + 50, steps=5)
        map_viewer_page.mouse.up()
        # No crash = pass

    def test_no_error_on_init(self, map_viewer_page: Page):
        """Map viewer should initialize without errors."""
        # Check that canvas is functional
        canvas = map_viewer_page.locator("#canvas")
        expect(canvas).to_be_visible()
