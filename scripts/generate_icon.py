#!/usr/bin/env python3
"""Generate S4WN icon and logo — pays tribute to Siedler 4 History Edition CD cover.
Creates SVG favicon, multi-size PNG favicon, and full-size loading screen logo.
All original artwork — no S4 assets extracted."""

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "ui"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Color palette (Siedler 4 History Edition tribute) ──────────────────────
BG_DARK = (10, 14, 26)
BG_MID = (20, 28, 48)
GOLD = (212, 168, 67)
GOLD_BRIGHT = (240, 208, 120)
GOLD_LIGHT = (255, 225, 150)
GOLD_DARK = (160, 120, 30)
BROWN = (100, 70, 40)
CREAM = (224, 216, 200)
STEEL = (120, 130, 150)
STEEL_DARK = (60, 65, 80)


def draw_shield(draw, cx, cy, w, h, fill, outline=None, outline_width=0):
    """Draw a heraldic shield shape centered at cx,cy."""
    points = [
        (cx - w // 2, cy - h // 2),  # top-left
        (cx + w // 2, cy - h // 2),  # top-right
        (cx + w // 2, cy + h // 4),  # mid-right
        (cx, cy + h // 2),           # bottom point
        (cx - w // 2, cy + h // 4),  # mid-left
    ]
    draw.polygon(points, fill=fill, outline=outline)


def draw_hex_border(draw, cx, cy, r, width, color):
    """Draw a hexagon border."""
    points = []
    for i in range(6):
        angle = math.pi / 6 + i * math.pi / 3
        px = cx + r * math.cos(angle)
        py = cy + r * math.sin(angle)
        points.append((px, py))
    draw.polygon(points, outline=color, width=width)


def draw_settlement(draw, cx, cy, size, color):
    """Draw a simple settlement/house icon — tribute to the original cover art houses."""
    s = size
    # House body
    draw.rectangle([cx - s, cy - s // 2, cx + s, cy + s], fill=color)
    # Roof (triangle)
    roof_points = [(cx - s - 2, cy - s // 2), (cx, cy - s - s // 2), (cx + s + 2, cy - s // 2)]
    draw.polygon(roof_points, fill=color)
    # Door
    draw.rectangle(
        [cx - s // 3, cy, cx + s // 3, cy + s],
        fill=(min(color[0] + 40, 255), min(color[1] + 40, 255), min(color[2] + 40, 255)),
    )
    # Window
    win_s = s // 3
    draw.rectangle(
        [cx + s // 2 - win_s, cy - s // 2 + win_s // 2, cx + s // 2, cy - s // 2 + win_s + win_s // 2],
        fill=GOLD_LIGHT,
    )


def create_svg():
    """Create scalable SVG favicon/logo."""
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="rgb{GOLD_DARK}"/>
      <stop offset="50%" stop-color="rgb{BG_MID}"/>
      <stop offset="100%" stop-color="rgb{BG_DARK}"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgb{GOLD_BRIGHT}"/>
      <stop offset="50%" stop-color="rgb{GOLD}"/>
      <stop offset="100%" stop-color="rgb{GOLD_DARK}"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgb{BG_MID}"/>
      <stop offset="100%" stop-color="rgb{BG_DARK}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background circle -->
  <circle cx="256" cy="256" r="248" fill="url(#bg)" stroke="rgb{GOLD_DARK}" stroke-width="4"/>

  <!-- Hex border -->
  <polygon points="256,40 443,148 443,364 256,472 69,364 69,148"
           fill="none" stroke="url(#goldGrad)" stroke-width="3" opacity="0.6"/>

  <!-- Shield shape -->
  <path d="M256,60 L404,160 L404,330 L256,430 L108,330 L108,160 Z"
        fill="url(#shieldGrad)" stroke="url(#goldGrad)" stroke-width="4"/>

  <!-- Inner hex -->
  <polygon points="256,100 360,160 360,280 256,340 152,280 152,160"
           fill="none" stroke="rgb{GOLD}" stroke-width="1.5" opacity="0.4"/>

  <!-- Settlement icons (small houses) -->
  <!-- Left house -->
  <rect x="165" y="195" width="40" height="35" fill="rgb{BROWN}" rx="2"/>
  <polygon points="160,198 185,165 210,198" fill="rgb{STEEL_DARK}"/>

  <!-- Right house -->
  <rect x="305" y="210" width="36" height="30" fill="rgb{BROWN}" rx="2"/>
  <polygon points="301,213 323,183 345,213" fill="rgb{STEEL_DARK}"/>

  <!-- Center tower -->
  <rect x="236" y="140" width="40" height="55" fill="rgb{STEEL_DARK}" rx="2"/>
  <polygon points="232,144 256,100 280,144" fill="rgb{GOLD_DARK}"/>
  <rect x="250" y="150" width="12" height="12" fill="rgb{GOLD}" rx="1"/>

  <!-- Flag -->
  <line x1="276" y1="100" x2="276" y2="70" stroke="rgb{STEEL}" stroke-width="2"/>
  <polygon points="276,70 305,80 276,90" fill="rgb{GOLD}" opacity="0.8"/>

  <!-- Title "S4WN" -->
  <text x="256" y="310" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="64" font-weight="bold" fill="url(#goldGrad)" filter="url(#glow)"
        letter-spacing="8">S4WN</text>

  <!-- Subtitle -->
  <text x="256" y="345" text-anchor="middle" font-family="Georgia, serif"
        font-size="18" fill="rgb{CREAM}" opacity="0.7" letter-spacing="4">
    SIEDLER 4 WEB-NATIVE
  </text>

  <!-- Bottom year -->
  <text x="256" y="385" text-anchor="middle" font-family="Georgia, serif"
        font-size="14" fill="rgb{STEEL}" opacity="0.5" letter-spacing="2">
    2 0 2 6
  </text>
</svg>'''
    return svg


def create_png(size, has_subtitle=True, is_loading_screen=False):
    """Create a rasterized PNG icon/logo at given size."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle
    margin = size // 32
    r = size // 2 - margin
    cx = cy = size // 2

    # Radial gradient background (approximate with concentric circles)
    for i in range(r, r // 4, -2):
        t = i / r
        r_val = int(BG_DARK[0] + (BG_MID[0] - BG_DARK[0]) * t)
        g_val = int(BG_DARK[1] + (BG_MID[1] - BG_DARK[1]) * t)
        b_val = int(BG_DARK[2] + (BG_MID[2] - BG_DARK[2]) * t)
        draw.ellipse(
            [cx - i, cy - i, cx + i, cy + i],
            fill=(r_val, g_val, b_val, 255),
        )

    # Dark center
    inner_r = r // 4
    for i in range(inner_r, 0, -2):
        t = i / inner_r
        r_val = int(GOLD_DARK[0] * t + BG_DARK[0] * (1 - t))
        g_val = int(GOLD_DARK[1] * t + BG_DARK[1] * (1 - t))
        b_val = int(GOLD_DARK[2] * t + BG_DARK[2] * (1 - t))
        draw.ellipse(
            [cx - i, cy - i, cx + i, cy + i],
            fill=(r_val, g_val, b_val, 255),
        )

    # Hex border
    draw_hex_border(draw, cx, cy, r - 4, 3, GOLD)

    # Shield shape
    shield_w = size // 2
    shield_h = size // 2
    draw_shield(draw, cx, cy, shield_w, shield_h, BG_MID, GOLD, 3)

    # Inner hex
    inner_r2 = size // 5
    draw_hex_border(draw, cx, cy, inner_r2, 1, GOLD)

    # Settlement houses (only on larger sizes)
    if size >= 128:
        # Left house
        hx, hy = cx - shield_w // 4, cy - shield_h // 6
        hs = size // 20
        draw.rectangle([hx - hs, hy, hx + hs, hy + hs * 2], fill=BROWN)
        draw.polygon([(hx - hs - 2, hy), (hx, hy - hs), (hx + hs + 2, hy)], fill=STEEL_DARK)

        # Right house
        hx2, hy2 = cx + shield_w // 4, cy - shield_h // 12
        draw.rectangle([hx2 - hs, hy2, hx2 + hs, hy2 + hs * 2], fill=BROWN)
        draw.polygon([(hx2 - hs - 2, hy2), (hx2, hy2 - hs), (hx2 + hs + 2, hy2)], fill=STEEL_DARK)

        # Center tower
        tw = size // 16
        th = size // 8
        draw.rectangle(
            [cx - tw // 2, cy - shield_h // 3 - th // 2, cx + tw // 2, cy - shield_h // 3 + th // 2],
            fill=STEEL_DARK,
        )
        draw.polygon(
            [
                (cx - tw // 2 - 4, cy - shield_h // 3 - th // 2),
                (cx, cy - shield_h // 3 - th),
                (cx + tw // 2 + 4, cy - shield_h // 3 - th // 2),
            ],
            fill=GOLD_DARK,
        )

    # Try to use a font, fall back to default
    try:
        if is_loading_screen:
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", size // 8)
            font_sub = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", size // 20)
            font_year = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", size // 24)
        else:
            # Scale fonts based on size
            title_size = max(size // 7, 8)
            sub_size = max(size // 16, 4)
            font_title = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", title_size)
            font_sub = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf", sub_size)
            font_year = font_sub
    except Exception:
        font_title = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_year = ImageFont.load_default()

    # Title
    title_y = cy + shield_h // 6 if size >= 128 else cy
    draw.text(
        (cx, title_y),
        "S4WN",
        fill=GOLD_BRIGHT,
        font=font_title,
        anchor="mm",
    )

    # Subtitle
    if has_subtitle and size >= 64:
        draw.text(
            (cx, title_y + size // 12),
            "Siedler 4 Web-Native",
            fill=CREAM,
            font=font_sub,
            anchor="mm",
        )

    # Year
    if size >= 128:
        draw.text(
            (cx, title_y + size // 7),
            "2026",
            fill=STEEL,
            font=font_year,
            anchor="mm",
        )

    return img


def create_favicon():
    """Create multi-size .ico file."""
    sizes = [16, 32, 48, 64]
    imgs = []
    for s in sizes:
        img = create_png(s, has_subtitle=False)
        imgs.append(img)
    ico_path = OUT_DIR / "favicon.ico"
    imgs[0].save(ico_path, format="ICO", sizes=[(s, s) for s in sizes], append_images=imgs[1:])
    print(f"  Created {ico_path}")


def create_svg_favicon():
    """Save SVG favicon."""
    svg_path = OUT_DIR / "favicon.svg"
    svg_content = create_svg()
    svg_path.write_text(svg_content, encoding="utf-8")
    print(f"  Created {svg_path}")


def create_png_icons():
    """Create PNG icons in various sizes."""
    sizes = {
        "favicon-16x16.png": 16,
        "favicon-32x32.png": 32,
        "apple-touch-icon.png": 180,
        "icon-192x192.png": 192,
        "icon-512x512.png": 512,
    }
    for name, size in sizes.items():
        img = create_png(size, has_subtitle=(size >= 128))
        path = OUT_DIR / name
        img.save(path, "PNG")
        print(f"  Created {path} ({size}×{size})")


def create_loading_screen():
    """Create full-size loading screen logo."""
    size = 512
    img = create_png(size, has_subtitle=True, is_loading_screen=True)
    path = OUT_DIR / "logo-loading.png"
    img.save(path, "PNG")
    print(f"  Created {path} ({size}×{size})")


def main():
    print("Generating S4WN icon and logo assets...")
    create_svg_favicon()
    create_favicon()
    create_png_icons()
    create_loading_screen()
    print(f"\nAll assets saved to {OUT_DIR}/")
    print("Done!")


if __name__ == "__main__":
    main()
