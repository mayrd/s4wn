# S4WN UI Texture Prompts

All UI textures for S4WN were generated via **Gemini 3.1 Flash Image** with green-screen removal for transparency.
Generated: 2026-07-23

## Usage

```bash
# Regenerate any texture:
python3 /opt/data/projects/s4wn/assets/textures/generate_ui_textures.py
```

The script calls the Gemini API with each prompt, then removes the green background to produce transparent PNGs at the correct dimensions.

---

## ui_panel.png (256×256)

Repeatable panel background – Roman natural stone texture.

```
Create a seamless tiling texture of aged Roman natural stone. Colors should be warm grey-brown (#8c8a87 range) with subtle veining and slight moss/weathering. The stone should look like cut travertine or tuff, typical of Roman construction. NO visible seams at tile edges. The ENTIRE background must be solid bright green (#00FF00, RGB 0,255,0) - fill all empty space with this exact green. 256x256 pixels.
```

## ui_button.png (200×60)

Normal button – Roman stone with metal rim.

```
A Roman-style UI button. The center is aged parchment/warm stone (#c5a059 to #e0d0b0 gradient). Border is a decorative Roman-style gold/brass frame with subtle bevel. The button should have slight 3D depth (raised look). Clean rectangular shape with very slightly rounded corners. NO text. The ENTIRE background outside the button must be solid bright green (#00FF00). 200x60 pixels.
```

## ui_button_hover.png (200×60)

Hover state – brighter/warmer.

```
Same as ui_button.png but with a brighter, warmer tone. The parchment center shifts toward amber/gold (#ffab40). The brass border glows slightly brighter. This is the hover/active state of a Roman-style UI button. NO text. Background must be solid bright green (#00FF00). 200x60 pixels.
```

## ui_button_pressed.png (200×60)

Pressed state – darker/inset.

```
Same as ui_button.png but pressed/inset state. The entire button looks pushed in: darker center (#a08050 range), inner shadow instead of outer bevel, slightly smaller visually. This is the pressed/depressed state of a Roman-style UI button. NO text. Background must be solid bright green (#00FF00). 200x60 pixels.
```

## ui_corner.png (64×64)

Corner decoration – Roman acanthus or scroll motif.

```
A decorative corner ornament for a Roman-style UI frame. One quarter of a circular acanthus leaf or scroll motif in gold/brass tones with dark brown background. Design should fit in the corner (top-left quadrant of the 64x64 square). SVG-vector look, clean lines. Background must be solid bright green (#00FF00). 64x64 pixels.
```

## ui_header.png (400×40)

Header bar – dark Roman wood/stone with gold trim.

```
A horizontal header bar for UI panels. Dark aged wood or dark Roman stone background with a thin gold/brass decorative line at the bottom. The bar should have a subtle 3D raised effect. Colors: dark brown (#5d4037 to #3e2723 range) with gold accent (#c5a059). 400 pixels wide, 40 pixels tall. Background must be solid bright green (#00FF00).
```

## ui_divider.png (400×8)

Thin divider line – Roman gold trim.

```
A thin horizontal divider line. Gold/brass Roman-style decorative strip, like a thin metal inlay. Single horizontal line with subtle bevel. 400 pixels wide, 8 pixels tall. Background must be solid bright green (#00FF00).
```

## ui_frame.png (256×256)

Frame border – Roman stone pillar.

```
A decorative frame border for UI panels. The four sides should look like carved Roman stone pillars or borders in warm grey stone with gold highlights. The center of the 256x256 square should be transparent (bright green for removal). Only the 8-12 pixel border should have content. Think of a picture frame made of stone. Background must be solid bright green (#00FF00). 256x256 pixels.
```

## ui_menu_bg.png (256×256)

Menu background – dark textured stone.

```
A dark aged stone/wood texture for menu backgrounds. Dark brown-black tones with very subtle texture - like weathered Roman stone or aged oak. Dim and atmospheric to make foreground content pop. Subtle grain, NOT solid color. Should tile seamlessly. Background must be solid bright green (#00FF00). 256x256 pixels.
```

## ui_progress_bg.png (200×20)

Progress bar background – dark slot.

```
A horizontal progress bar slot/groove. Dark recessed groove in Roman stone. The bar area should look like a carved channel in stone, darker at the bottom (shadow), slightly lighter on top edge (highlight). 200 pixels wide, 20 pixels tall. Background must be solid bright green (#00FF00).
```

## ui_progress_fill.png (200×16)

Progress bar fill – gold/amber glow.

```
A progress bar fill segment in golden Roman tones. Warm gold (#ffab40 to #c5a059) with slight gradient (lighter at top, darker at bottom) for 3D effect. Subtle inner glow. 200 pixels wide, 16 pixels tall. This overlays on top of ui_progress_bg.png. Background must be solid bright green (#00FF00).
```

## ui_separator_decor.png (400×16)

Decorative separator – Roman wave/meander pattern.

```
A decorative horizontal separator - Roman meander (Greek key) or wave pattern in gold/brass on dark stone background. The pattern should repeat seamlessly. 400 pixels wide, 16 pixels tall. Background must be solid bright green (#00FF00).
```

## ui_tab_ornament.png (200×32)

Tab ornament – Roman-style tab top.

```
A decorative tab/button top ornament for Roman-style UI tabs. Like the top of a Roman column or an ornamented tab shape. Warm gold tones with dark accents. Should look like it belongs at the top of a tabbed panel. 200 pixels wide, 32 pixels tall. Background must be solid bright green (#00FF00).
```
