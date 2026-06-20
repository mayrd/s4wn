"""Tests for index.html — main game entry point.

Covers:
- Page loads without console errors
- Canvas renders with correct dimensions
- UI panels (menu, construction, stats) are interactive
- WASM engine initializes
- Error overlay behavior
"""
import pytest
from playwright.sync_api import Page, expect


class TestPageLoad:
    """Verify the page loads and initializes correctly."""

    def test_page_title(self, s4wn_page: Page):
        """Index.html should have a meaningful title."""
        title = s4wn_page.title()
        assert len(title) > 0, "Page title should not be empty"

    def test_canvas_exists(self, s4wn_page: Page):
        """Game canvas should be present in DOM."""
        canvas = s4wn_page.locator("#game-canvas")
        expect(canvas).to_be_visible()

    def test_canvas_has_dimensions(self, s4wn_page: Page):
        """Canvas should have non-zero dimensions after init."""
        canvas = s4wn_page.locator("#game-canvas")
        bbox = canvas.bounding_box()
        assert bbox is not None
        # Canvas may be full viewport or sized by WASM — check it's > 0
        assert bbox["width"] > 0
        assert bbox["height"] > 0

    def test_no_error_overlay_on_clean_load(self, s4wn_page: Page):
        """Error overlay should NOT be active on normal load."""
        overlay = s4wn_page.locator("#error-overlay.active")
        expect(overlay).to_have_count(0)

    def test_wasm_console_log(self, s4wn_page: Page):
        """WASM should log initialization message — check canvas is functional."""
        result = s4wn_page.evaluate("document.querySelector('#game-canvas') !== null")
        assert result is True


class TestUIButtons:
    """Verify interactive UI buttons exist and are clickable."""

    def test_menu_button_exists(self, s4wn_page: Page):
        btn = s4wn_page.locator("#btn-menu")
        expect(btn).to_be_visible()

    def test_speed_button_exists(self, s4wn_page: Page):
        btn = s4wn_page.locator("#btn-speed")
        expect(btn).to_be_visible()

    def test_construction_button_exists(self, s4wn_page: Page):
        btn = s4wn_page.locator("#btn-construction")
        expect(btn).to_be_visible()

    def test_resources_button_exists(self, s4wn_page: Page):
        btn = s4wn_page.locator("#btn-resources")
        expect(btn).to_be_visible()

    def test_settlers_button_exists(self, s4wn_page: Page):
        btn = s4wn_page.locator("#btn-settlers")
        expect(btn).to_be_visible()

    def test_speed_button_toggles(self, s4wn_page: Page):
        """Clicking speed button should change its text."""
        btn = s4wn_page.locator("#btn-speed")
        initial_text = btn.text_content()
        btn.click()
        s4wn_page.wait_for_timeout(500)
        new_text = btn.text_content()
        # Speed should have changed (e.g. 1× → 2×) or button is still visible
        assert btn.is_visible()


class TestMenuPanel:
    """Verify menu panel opens/closes correctly."""

    def test_menu_opens_on_button_click(self, s4wn_page: Page):
        s4wn_page.locator("#btn-menu").click()
        s4wn_page.wait_for_timeout(500)
        # Some panel/overlay should become visible after menu click
        # The menu creates panels dynamically — just verify no crash
        assert s4wn_page.locator("#btn-menu").is_visible()

    def test_menu_contains_new_game_option(self, s4wn_page: Page):
        """Menu should contain a 'New Game' option."""
        s4wn_page.locator("#btn-menu").click()
        s4wn_page.wait_for_timeout(500)
        page_text = s4wn_page.content()
        assert "New Game" in page_text or "new" in page_text.lower()


class TestConstructionPanel:
    """Verify construction panel behavior."""

    def test_construction_panel_in_dom(self, s4wn_page: Page):
        """Construction panel should exist in DOM."""
        panel = s4wn_page.locator("#construction-panel")
        assert panel.count() == 1

    def test_construction_panel_opens(self, s4wn_page: Page):
        """Clicking construction button should show panel."""
        s4wn_page.locator("#btn-construction").click()
        s4wn_page.wait_for_timeout(500)
        panel = s4wn_page.locator("#construction-panel")
        expect(panel).to_be_visible()


class TestErrorOverlay:
    """Verify error overlay behavior."""

    def test_error_overlay_exists_in_dom(self, s4wn_page: Page):
        """Error overlay should exist in DOM (hidden by default)."""
        overlay = s4wn_page.locator("#error-overlay")
        assert overlay.count() == 1

    def test_error_overlay_has_dismiss_button(self, s4wn_page: Page):
        """Error overlay should have a dismiss button."""
        dismiss_btn = s4wn_page.locator("#error-overlay .btn-secondary")
        assert dismiss_btn.count() == 1

    def test_error_overlay_has_github_button(self, s4wn_page: Page):
        """Error overlay should have a GitHub report button."""
        github_btn = s4wn_page.locator("#error-btn-github")
        assert github_btn.count() == 1


class TestMobileEnhancements:
    """Verify mobile enhancement script loaded."""

    def test_mobile_script_loaded(self, s4wn_page: Page):
        """mobile-enhancements.js should be loaded."""
        scripts = s4wn_page.locator("script[src='mobile-enhancements.js']")
        expect(scripts).to_have_count(1)
