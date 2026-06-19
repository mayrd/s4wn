"""Tests for map-viewer.html — standalone map viewer.

Covers:
- Page loads correctly
- Canvas element exists
- File input exists
- Minimap exists
"""
import pytest
from playwright.sync_api import Page, expect


class TestMapViewerDOM:
    """Verify map viewer UI elements exist."""

    def test_canvas_in_dom(self, map_viewer_page: Page):
        assert map_viewer_page.locator("#canvas").count() == 1

    def test_file_input_in_dom(self, map_viewer_page: Page):
        assert map_viewer_page.locator("#fileInput").count() == 1

    def test_minimap_in_dom(self, map_viewer_page: Page):
        assert map_viewer_page.locator("#minimap").count() == 1

    def test_page_contains_terrain_definitions(self, map_viewer_page: Page):
        """Map viewer should have terrain data loaded."""
        html = map_viewer_page.content()
        assert "TERRAIN_BY_ID" in html or "Grass" in html

    def test_page_contains_isometric_renderer(self, map_viewer_page: Page):
        """Map viewer should have canvas rendering code."""
        html = map_viewer_page.content()
        assert "isometric" in html.lower() or "camera" in html.lower()
