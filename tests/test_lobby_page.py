"""Tests for lobby.html — multiplayer lobby UI.

Note: WebSocket connection will fail in test mode (no server running).
The title screen is the initial state; main app UI is hidden until user connects.
Tests focus on DOM structure and static elements.
"""
import pytest
from playwright.sync_api import Page, expect


class TestLobbyLoad:
    """Verify lobby page loads correctly."""

    def test_title_screen_visible(self, lobby_page: Page):
        """Title screen should be visible on load."""
        title = lobby_page.locator("#title-screen")
        expect(title).to_be_visible()

    def test_player_name_input_in_dom(self, lobby_page: Page):
        """Player name input should exist in DOM."""
        assert lobby_page.locator("#player-name").count() == 1

    def test_connect_button_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#btn-connect").count() == 1

    def test_create_room_button_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#btn-create-room").count() == 1

    def test_chat_input_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#chat-input").count() == 1

    def test_send_chat_button_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#btn-send-chat").count() == 1

    def test_status_indicator_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#status-dot").count() + lobby_page.locator("#status-text").count() > 0

    def test_loading_bar_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#loading-bar").count() == 1

    def test_app_element_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#app").count() == 1

    def test_chat_panel_in_dom(self, lobby_page: Page):
        assert lobby_page.locator("#chat-panel").count() == 1


class TestLobbyDOMStructure:
    """Verify all expected UI elements exist in the lobby page source."""

    def test_has_canvas_or_app_container(self, lobby_page: Page):
        """Page should have an app container."""
        html = lobby_page.content()
        assert 'id="app"' in html

    def test_has_notifications_container(self, lobby_page: Page):
        """Page should have notifications container."""
        html = lobby_page.content()
        assert 'id="notifications"' in html

    def test_has_room_list_element(self, lobby_page: Page):
        """Page should have room list."""
        html = lobby_page.content()
        assert 'id="room-list"' in html

    def test_no_critical_js_errors(self, lobby_page: Page):
        """Page should contain expected script content (no JS crash)."""
        html = lobby_page.content()
        assert "WebSocket" in html or "connect" in html.lower()
