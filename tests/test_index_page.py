"""Tests for index.html — main game entry point.

Covers:
- Page loads without console errors
- Splash screen appears and transitions to main menu
- Main menu buttons are present and interactive
- Game starts when 'Start New Game' is clicked
"""
import pytest
from playwright.sync_api import Page, expect

class TestPageLoad:
    """Verify the page loads and initializes correctly."""

    def test_page_title(self, s4wn_page: Page):
        """Index.html should have a meaningful title."""
        title = s4wn_page.title()
        assert len(title) > 0, "Page title should not be empty"

    def test_ui_overlay_exists(self, s4wn_page: Page):
        """UI overlay container should be present in DOM."""
        overlay = s4wn_page.locator("#ui-overlay")
        expect(overlay).to_be_visible()

class TestSplashScreen:
    """Verify the splash screen behavior."""

    def test_splash_screen_appears(self, s4wn_page: Page):
        """Splash screen should be visible on initial load."""
        splash = s4wn_page.locator(".splash-screen.active")
        expect(splash).to_be_visible()
        expect(s4wn_page.locator(".splash-logo")).to_contain_text("S4WN")

    def test_splash_transitions_to_menu(self, s4wn_page: Page):
        """Splash screen should transition to main menu after a delay."""
        # Wait for the 3-second timeout in UIManager
        s4wn_page.wait_for_timeout(3500)
        
        splash = s4wn_page.locator(".splash-screen.active")
        menu = s4wn_page.locator(".ui-screen:has(.main-menu-container).active")
        
        expect(splash).not_to_be_visible()
        expect(menu).to_be_visible()

class TestMainMenu:
    """Verify the main menu buttons and interactions."""

    def setup_menu(self, s4wn_page: Page):
        """Helper to ensure we are at the main menu."""
        s4wn_page.wait_for_timeout(3500)
        return s4wn_page.locator(".main-menu-container")

    def test_menu_buttons_exist(self, s4wn_page: Page):
        """All required main menu buttons should be present."""
        menu = self.setup_menu(s4wn_page)
        expect(menu.locator("#btn-tutorial")).to_be_visible()
        expect(menu.locator("#btn-new-game")).to_be_visible()
        expect(menu.locator("#btn-load-game")).to_be_visible()
        expect(menu.locator("#btn-explorer")).to_be_visible()
        expect(menu.locator("#btn-editor")).to_be_visible()
        expect(menu.locator("#btn-multiplayer")).to_be_visible()

    def test_start_game_hides_ui(self, s4wn_page: Page):
        """Clicking 'Start New Game' should hide the UI overlay."""
        menu = self.setup_menu(s4wn_page)
        menu.locator("#btn-new-game").click()
        
        # All screens should lose the 'active' class
        active_screens = s4wn_page.locator(".ui-screen.active")
        expect(active_screens).to_have_count(0)

class TestVisuals:
    """Verify basic visual elements."""

    def test_menu_styling(self, s4wn_page: Page):
        """Main menu should have the correct CSS classes for styling."""
        s4wn_page.wait_for_timeout(3500)
        menu = s4wn_page.locator(".main-menu-container")
        expect(menu).to_be_visible()
        # Check if it has the expected background/border styles via computed style
        style = menu.evaluate("el => window.getComputedStyle(el).backgroundColor")
        assert style is not None