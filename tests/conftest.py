"""Shared fixtures for S4WN UI tests."""
import subprocess
import time
import socket
import os
import pytest
from playwright.sync_api import sync_playwright


# Chromium binary path — override via env or use system Playwright browser
CHROMIUM_PATH = os.environ.get(
    "S4WN_CHROMIUM_PATH",
    "/opt/data/.playwright/chromium-1223/chrome-linux/chrome",
)


def is_port_open(host: str, port: int) -> bool:
    try:
        with socket.create_connection((host, port), timeout=1):
            return True
    except (OSError, ConnectionRefusedError):
        return False


@pytest.fixture(scope="session")
def s4wn_server():
    """Start a local HTTP server for S4WN on port 8765."""
    PORT = 8765

    if is_port_open("127.0.0.1", PORT):
        yield f"http://127.0.0.1:{PORT}"
        return

    engine_dir = os.path.join(os.path.dirname(__file__), "..", "engine")
    proc = subprocess.Popen(
        ["python3", "-m", "http.server", str(PORT), "--directory", engine_dir],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    for _ in range(30):
        if is_port_open("127.0.0.1", PORT):
            break
        time.sleep(0.2)
    else:
        proc.kill()
        raise RuntimeError(f"Test server failed to start on port {PORT}")

    yield f"http://127.0.0.1:{PORT}"

    proc.terminate()
    proc.wait(timeout=5)


@pytest.fixture(scope="session")
def playwright_instance():
    """Shared Playwright runtime."""
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance):
    """Launch Chromium with WebGL enabled."""
    browser = playwright_instance.chromium.launch(
        executable_path=CHROMIUM_PATH,
        args=[
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
        ],
    )
    yield browser
    browser.close()


@pytest.fixture
def page(browser, s4wn_server):
    """Create a new page navigated to S4WN index.html."""
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        locale="en-US",
        timezone_id="Europe/Berlin",
    )
    page = context.new_page()
    page.goto(f"{s4wn_server}/index.html", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)  # Allow WASM to init
    yield page
    context.close()


@pytest.fixture
def s4wn_page(page):
    """Alias for page fixture — already on index.html."""
    return page


@pytest.fixture
def lobby_page(browser, s4wn_server):
    """Navigate to lobby.html."""
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{s4wn_server}/lobby.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    yield page
    context.close()


@pytest.fixture
def map_viewer_page(browser, s4wn_server):
    """Navigate to map-viewer.html."""
    context = browser.new_context()
    page = context.new_page()
    page.goto(f"{s4wn_server}/map-viewer.html", wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    yield page
    context.close()
