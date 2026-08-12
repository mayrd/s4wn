#!/usr/bin/env python3
"""Generate all S4WN UI textures via Gemini API with green-screen removal."""

import json, urllib.request, base64, re, os, sys, time
from io import BytesIO
import numpy as np
from PIL import Image

# Read API key
with open('/opt/data/.env', 'r') as f:
    lines = f.readlines()
API_KEY = None
for line in lines:
    line = line.strip()
    if line.startswith('GEMINI_API_KEY=') and not line.startswith('#'):
        API_KEY = line.split('=', 1)[1].strip().split()[0]
        break

if not API_KEY or 'your_gemini_key_here' in API_KEY:
    print("ERROR: No valid GEMINI_API_KEY found")
    sys.exit(1)

print(f"Using Gemini API key: {API_KEY[:10]}...")

TEXTURES_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL = "gemini-3.1-flash-image-preview"

def call_gemini(prompt, retries=3):
    """Call Gemini API and return raw image bytes, or None on failure."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["text", "image"]}
    }
    
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'),
                                         headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=180) as resp:
                result = json.load(resp)
            
            for candidate in result.get('candidates', []):
                for part in candidate.get('content', {}).get('parts', []):
                    if 'inlineData' in part:
                        return base64.b64decode(part['inlineData']['data'])
            print(f"  No image in response (attempt {attempt+1})")
            time.sleep(2)
        except Exception as e:
            print(f"  API error (attempt {attempt+1}): {e}")
            time.sleep(3)
    return None

def remove_green_screen(img_bytes, target_size=None):
    """Remove bright green background from image and resize to target."""
    img = Image.open(BytesIO(img_bytes)).convert('RGBA')
    data = np.array(img)
    
    # Remove bright green: high G, low R and B
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    green_mask = (g > 200) & (r < 80) & (b < 80)
    data[:,:,3][green_mask] = 0
    
    result = Image.fromarray(data, 'RGBA')
    if target_size:
        result = result.resize(target_size, Image.LANCZOS)
    return result

TEXTURES = [
    {
        "file": "ui_panel.png",
        "size": (256, 256),
        "prompt": """Create a seamless tiling texture of aged Roman natural stone. Colors should be warm grey-brown (#8c8a87 range) with subtle veining and slight moss/weathering. The stone should look like cut Roman travertine or tuff stone blocks with visible mortar lines between them. NO visible seams at tile edges. The ENTIRE background must be solid bright green (#00FF00, RGB 0,255,0) - fill all empty space with this exact green. 256x256 pixels."""
    },
    {
        "file": "ui_button.png",
        "size": (200, 60),
        "prompt": """A Roman-style UI button. The center is aged parchment/warm stone (#c5a059 to #e0d0b0 gradient). Border is a decorative Roman-style gold/brass frame with subtle bevel and ornamental corners. The button should have slight 3D depth (raised look), like a carved stone button on a Roman control panel. Clean rectangular shape with slightly rounded corners. NO text. The ENTIRE background outside the button must be solid bright green (#00FF00). 200x60 pixels."""
    },
    {
        "file": "ui_button_hover.png",
        "size": (200, 60),
        "prompt": """Same Roman-style UI button but brighter and warmer. The center shifts toward warm amber/gold (#ffab40). The brass border glows with a subtle golden aura. This is the hover/active state. Slightly brighter than the normal button, like torchlight highlighting it. NO text. Background must be solid bright green (#00FF00). 200x60 pixels."""
    },
    {
        "file": "ui_button_pressed.png",
        "size": (200, 60),
        "prompt": """Same Roman-style UI button but pressed/inset state. The entire button looks pushed into the stone: darker center (#a08050 range), inner shadow instead of outer bevel, slightly compressed visually. The brass border is darker and recessed. This is the pressed/depressed state. NO text. Background must be solid bright green (#00FF00). 200x60 pixels."""
    },
    {
        "file": "ui_corner.png",
        "size": (64, 64),
        "prompt": """A decorative corner ornament for a Roman-style UI frame. One quarter of a circular acanthus leaf motif in gold/brass tones on dark stone background. The design occupies the top-left quadrant of the 64x64 square. SVG-vector look, clean crisp lines. Ornate Roman style. Background must be solid bright green (#00FF00). 64x64 pixels."""
    },
    {
        "file": "ui_header.png",
        "size": (400, 40),
        "prompt": """A horizontal header bar for Roman-style UI panels. Dark aged wood or dark Roman stone background with a thin gold/brass decorative line at the bottom. The bar has a subtle 3D raised effect on top edge. Colors: dark brown (#5d4037 to #3e2723) with gold accent (#c5a059). Clean horizontal bar, 400 wide 40 tall. Background must be solid bright green (#00FF00)."""
    },
    {
        "file": "ui_divider.png",
        "size": (400, 8),
        "prompt": """A thin horizontal divider line in Roman style. Gold/brass decorative strip, like a thin metal inlay with subtle bevel. Looks like a carved line in stone with gold inlay. 400 pixels wide, 8 pixels tall. Background must be solid bright green (#00FF00)."""
    },
    {
        "file": "ui_menu_bg.png",
        "size": (256, 256),
        "prompt": """A dark aged stone texture for game menu backgrounds. Dark brown-black tones with very subtle texture - like weathered Roman basalt or aged oak paneling. Dim and atmospheric. Subtle grain pattern that tiles seamlessly. NOT solid color - visible but subtle texture. Background must be solid bright green (#00FF00). 256x256 pixels tiling."""
    },
    {
        "file": "ui_frame.png",
        "size": (256, 256),
        "prompt": """A decorative frame border for a Roman-style UI panel. The four sides look like carved Roman stone columns/pillars in warm grey stone (#8c8a87) with gold highlighting on inner edges. The center 240x240 of the 256x256 image should be empty (solid bright green for removal). Only the 8 pixel thick border has content. Ornate Roman architectural border. Background must be solid bright green (#00FF00). 256x256 pixels."""
    },
    {
        "file": "ui_progress_bg.png",
        "size": (200, 20),
        "prompt": """A horizontal progress bar slot/groove in Roman stone. A dark recessed groove carved into warm grey stone. Darker at the bottom (shadow), slightly lighter on the top edge (highlight). The groove should look like a channel carved into a stone panel. 200 pixels wide, 20 pixels tall. Background must be solid bright green (#00FF00)."""
    },
    {
        "file": "ui_progress_fill.png",
        "size": (200, 16),
        "prompt": """A progress bar fill segment in golden Roman tones. Warm gold (#ffab40 to #c5a059 gradient) with slight 3D effect (lighter at top, darker at bottom). Subtle inner glow like molten gold or amber. 200 pixels wide, 16 pixels tall. Background must be solid bright green (#00FF00)."""
    },
    {
        "file": "ui_separator_decor.png",
        "size": (400, 16),
        "prompt": """A decorative horizontal separator - Roman meander/Greek key pattern in gold/brass on dark stone background. The pattern repeats seamlessly horizontally. Traditional classical meander/key motif. 400 pixels wide, 16 pixels tall. Background must be solid bright green (#00FF00)."""
    },
    {
        "file": "ui_tab_ornament.png",
        "size": (200, 32),
        "prompt": """A decorative tab ornament for Roman-style UI tabs. Like an ornamented tab header - the top of a Roman column or an architectural tab shape. Warm gold tones with dark accents. Should look like it belongs at the top of a tabbed panel in a Roman palace interface. 200 pixels wide, 32 pixels tall. Background must be solid bright green (#00FF00)."""
    },
]

print(f"\nGenerating {len(TEXTURES)} textures via Gemini...\n")

for tex in TEXTURES:
    path = os.path.join(TEXTURES_DIR, tex["file"])
    print(f"[{tex['file']}] {tex['size'][0]}x{tex['size'][1]}...")
    
    img_bytes = call_gemini(tex["prompt"])
    if img_bytes:
        result = remove_green_screen(img_bytes, tex["size"])
        result.save(path, 'PNG', optimize=True)
        print(f"  ✓ Saved ({os.path.getsize(path)/1024:.1f}KB)")
    else:
        print(f"  ✗ FAILED after retries")
    
    time.sleep(1.5)  # Rate limit

print("\nDone! Generated", sum(1 for t in TEXTURES if os.path.exists(os.path.join(TEXTURES_DIR, t["file"]))), "textures")
