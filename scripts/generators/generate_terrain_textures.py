#!/usr/bin/env python3
"""
S4WN Terrain Texture Generator ? Uses Gemini via OpenRouter API.
Generates all 8 terrain textures at 1024?1024, seamless tileable,
in the style of Die Siedler IV (The Settlers IV).

Usage: python3 scripts/generators/generate_terrain_textures.py [--dry-run]
  --dry-run  Print prompts only, don't call API

Cost estimate: ~$0.55 total (8 images ? $0.068 each at 1024?1024)
"""

import os, sys, json, base64, time, argparse
import urllib.request

API_KEY = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".env")
    if not os.path.exists(env_path):
        env_path = "/opt/data/.env"
    if os.path.exists(env_path):
        for line in open(env_path):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line and not API_KEY:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k == "OPENROUTER_API_KEY":
                    API_KEY = v
                    break
                elif k == "GEMINI_API_KEY" and not API_KEY:
                    API_KEY = v
                    break

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "assets", "textures"))
MODEL = "google/gemini-2.5-flash-image"  # Reliable, GA

# ?? S4-Authentic Terrain Prompts ??????????????????????????????????????
# Each prompt produces a seamless tileable top-down texture at 1024?1024.
# Style targets: The Settlers IV (Die Siedler IV) ? vibrant, saturated,
# hand-painted feel with clear biome differentiation.

TERRAIN_PROMPTS = {
    "Grass": (
        "A seamless tileable top-down grass texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Vibrant saturated green (#3d7a35 base), with patches of lighter meadow green, "
        "subtle wildflowers (tiny yellow/white dots), and darker grass tufts for depth. "
        "The grass should look hand-painted with visible brush strokes, slightly uneven terrain, "
        "small clover clusters. No trees, no rocks ? pure grassland. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "Warm sunlight lighting from upper-left. "
        "ONLY output the image, no text whatsoever."
    ),
    "Forest": (
        "A seamless tileable top-down forest floor texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Dark rich forest soil (#2d4a1e base) covered with fallen leaves in autumn browns "
        "and deep greens. Dappled sunlight filtering through unseen canopy above, creating "
        "light patches on the ground. Small ferns, moss patches, twigs, and pine needles. "
        "Dense leafy undergrowth at edges. The ground should feel rich, organic, shadowy. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
    "Mountain": (
        "A seamless tileable top-down mountain/rock texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Blue-grey granite (#7a8090 base) with stratified rock layers, visible cracks and "
        "fissures, mineral veins (quartz-like white streaks). Jagged rocky surface with "
        "sharp edges and crevices catching shadows. Darker grey in crevices, lighter on "
        "exposed faces. No vegetation, no snow ? pure bare mountain rock. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
    "Water": (
        "A seamless tileable top-down shallow water texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Clear turquoise-blue water (#3a8fbf base) with visible gentle ripple patterns, "
        "light caustics on sandy bottom visible through the water, small wave crests catching "
        "sunlight. Coastal shelf visible ? lighter near 'shore' edges, deeper blue in center. "
        "Smooth flowing water with subtle current lines. No foam, no rocks ? pure water surface. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
    "DeepWater": (
        "A seamless tileable top-down deep ocean water texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Deep navy-blue water (#1a3a6e base) with dark mysterious depths, subtle light rays "
        "penetrating from above, deep current swirls visible. Much darker than shallow water, "
        "no bottom visible. Gentle wave patterns on surface catching dim light. "
        "The water should feel deep, cold, slightly ominous. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
    "Desert": (
        "A seamless tileable top-down desert sand texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Warm golden sand (#c8a850 base) with wind-rippled dune patterns, subtle shadow lines "
        "on dune crests, scattered small pebbles, and occasional darker sand patches. "
        "Fine granular texture visible. Heat shimmer suggested by subtle color variation. "
        "No vegetation, no rocks ? pure sandy desert. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
    "Snow": (
        "A seamless tileable top-down snow texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Pristine white snow (#d0d8e8 base) with wind-drifted patterns, soft undulating "
        "contours, subtle blue shadows in depressions, tiny ice crystal sparkles catching "
        "sunlight. Fresh powder snow look with slight granular texture. "
        "Cold blue-white ambient lighting. No footprints, no rocks ? pure snowfield. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
    "Swamp": (
        "A seamless tileable top-down swamp texture for an isometric strategy game "
        "in the style of The Settlers IV (Die Siedler IV). "
        "Murky green-brown water (#4a5e2a base) with patches of algae, floating lily pads, "
        "dark muddy banks, twisted exposed roots, patches of still dark water reflecting dim "
        "light. Foggy, humid atmosphere suggested by muted colors. Small patches of moss "
        "and cattails at edges. The ground should feel wet, spongy, decayed. "
        "Seamless tiling edges. 1024x1024. Photorealistic but stylized for a game. "
        "ONLY output the image, no text whatsoever."
    ),
}

def generate_texture(name, prompt, dry_run=False):
    """Generate a single terrain texture via OpenRouter Gemini API."""
    out_path = os.path.join(OUTPUT_DIR, f"terrain_{name.lower()}.png")
    
    if dry_run:
        print(f"\n{'='*60}")
        print(f"TERRAIN: {name}")
        print(f"OUTPUT:  {out_path}")
        print(f"PROMPT:  {prompt[:120]}...")
        return True

    print(f"\nGenerating {name}... ", end="", flush=True)
    
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["image", "text"],
        "max_tokens": 4096,
    }
    
    req = urllib.request.Request(
        OPENROUTER_URL,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/mayrd/s4wn",
            "X-Title": "S4WN Terrain Generator",
        },
    )
    
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
    except Exception as e:
        print(f"API ERROR: {e}")
        return False
    
    # Extract image
    images = result.get("choices", [{}])[0].get("message", {}).get("images", [])
    if not images:
        print(f"NO IMAGE in response. Keys: {list(result.keys())}")
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        if content:
            print(f"  Model replied with text (no image): {content[:200]}")
        return False
    
    img_url = images[0].get("image_url", {}).get("url", "")
    if not img_url or not img_url.startswith("data:"):
        print(f"BAD image URL: {str(img_url)[:80]}")
        return False
    
    b64_data = img_url.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_data)
    
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(img_bytes))
        im = im.convert("RGBA")
        im.save(out_path, "PNG")
        print(f"OK ({im.size[0]}x{im.size[1]} PNG, {os.path.getsize(out_path)} bytes)")
    except ImportError:
        if out_path.endswith(".png"):
            out_path = out_path.replace(".png", ".jpg")
        with open(out_path, "wb") as f:
            f.write(img_bytes)
        print(f"OK (JPEG saved as {out_path}, {len(img_bytes)} bytes)")
    
    return True

def main():
    parser = argparse.ArgumentParser(description="S4WN Terrain Texture Generator")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts only")
    parser.add_argument("--terrain", type=str, help="Generate only specific terrain (e.g. 'Grass')")
    args = parser.parse_args()
    
    if not API_KEY and not args.dry_run:
        print("ERROR: No API key found. Set OPENROUTER_API_KEY or GEMINI_API_KEY.")
        sys.exit(1)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    terrains = TERRAIN_PROMPTS
    if args.terrain:
        terrains = {args.terrain: TERRAIN_PROMPTS[args.terrain]}
    
    success = 0
    failed = []
    for name, prompt in terrains.items():
        if generate_texture(name, prompt, dry_run=args.dry_run):
            success += 1
        else:
            failed.append(name)
        if not args.dry_run:
            time.sleep(2)  # Rate limit buffer
    
    print(f"\n{'='*60}")
    print(f"Generated: {success}/{len(terrains)}")
    if failed:
        print(f"Failed: {', '.join(failed)}")
    
    if not args.dry_run and success > 0:
        print(f"\nOutput directory: {OUTPUT_DIR}")
        print("Next steps:")
        print("  1. Run: python3 scripts/generate.py terrain-atlas")

if __name__ == "__main__":
    main()
