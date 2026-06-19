# S4WN UI Tests

Browser-based UI tests for Siedler 4 Web-Native using Playwright.

## Setup

```bash
cd /tmp/s4wn
python3 -m venv .venv
source .venv/bin/activate
pip install playwright pytest
```

## Running Tests

```bash
# All tests
./tests/run_tests.sh

# Single test file
./tests/run_tests.sh test_index_page.py

# With browser visible (headed mode)
./tests/run_tests.sh --headed test_index_page.py

# Direct pytest
python3 -m pytest tests/ -v
```

## Test Structure

| File | What it tests |
|------|--------------|
| `test_index_page.py` | Main game page: load, canvas, UI buttons, panels, error overlay |
| `test_lobby_page.py` | Multiplayer lobby: title screen, connect, chat, room creation |
| `test_map_viewer.py` | Map viewer: canvas, file input, minimap, camera controls |
| `test_wasm_bridge.py` | WASM↔JS API: function exposure, return types |
| `test_visual_regression.py` | Screenshot capture for visual diffing |
| `test_performance.py` | Load time, WASM init, animation frames |

## How It Works

- Tests start a local HTTP server on port 8765 serving `engine/` directory
- Playwright launches Chromium with WebGL enabled
- WASM loads and initializes in real browser context
- All UI interactions (clicks, input, drag) are simulated

## Adding Tests

```python
def test_new_feature(s4wn_page: Page):
    s4wn_page.locator("#my-button").click()
    expect(s4wn_page.locator("#result")).to_have_text("Expected")
```
