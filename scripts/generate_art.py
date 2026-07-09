#!/usr/bin/env python3
"""Generate S4WN art assets via OpenRouter → Gemini image gen."""
import urllib.request, json, base64, os, sys

def get_api_key():
    with open("/opt/data/.env") as f:
        for line in f:
            if line.startswith("OPENROUTER_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("OPENROUTER_API_KEY not found in /opt/data/.env")

API_KEY = get_api_key()
OUTPUT_DIR = "/opt/data/projects/s4wn/assets/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPTS = {
    "splash-4k.png": (
        "Epic 4K splash screen (3840x2160) for a medieval fantasy settlement-building "
        "strategy game called S4WN. Rich painterly oil-painting style. A sprawling "
        "medieval village nestled in a lush green valley at golden hour, with timber-framed "
        "houses, a stone castle on a hill, wheat fields, orchards, winding cobblestone paths, "
        "a river with a watermill, distant snow-capped mountains, warm amber sunlight casting "
        "long shadows. Foreground shows a wooden signpost reading 'S4WN'. Vibrant, immersive, "
        "high fantasy but grounded in medieval European aesthetics. No modern elements. "
        "Cinematic composition, highly detailed."
    ),
    "menu-bg-4k.png": (
        "Main menu background (3840x2160) for a medieval settlement strategy game S4WN. "
        "Darker, moodier: twilight atmosphere. A medieval village silhouette against a deep "
        "purple-orange sunset sky with stars. Soft glowing lanterns in cottage windows, "
        "a castle tower silhouetted on the horizon, mist rolling over fields. "
        "Large dark empty area on the left side for menu text overlay. "
        "Painterly oil-painting style, rich atmospheric lighting, cinematic. "
        "No text, no UI elements — pure background art. Dark edges, atmospheric."
    ),
    "logo-1024.png": (
        "Game logo design for 'S4WN' in classic Siedler 4 video game style. "
        "Bold rustic medieval typography: 'S4' large and prominent, 'WN' smaller beneath. "
        "Carved from weathered wood and stone texture. Bronze/gold metallic rim with "
        "medieval ornamental flourishes — oak leaves, wheat sheaves, small castle tower emblem. "
        "Colors: warm gold, aged bronze, dark wood brown, cream parchment. "
        "Professional game studio logo, iconic. Transparent background. Sharp, clean."
    ),
    "favicon-256.png": (
        "A small square icon (256x256) for the strategy game S4WN. A medieval castle tower "
        "silhouette in warm gold on a dark forest-green circular background. "
        "Clean, crisp, simple geometric shapes — instantly recognizable at tiny size. "
        "No text. Professional game favicon style. Isolated on transparent background."
    ),
}

for filename, prompt in PROMPTS.items():
    print(f"Generating {filename}...", flush=True)
    payload = {
        "model": "google/gemini-3.1-flash-image-preview",
        "messages": [{"role": "user", "content": prompt}],
        "modalities": ["image", "text"],
        "max_tokens": 4096,
    }
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost",
            "X-Title": "Hermes Agent",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.load(resp)
    except Exception as e:
        print(f"  FAILED: {e}", file=sys.stderr)
        continue

    images = result.get("choices", [{}])[0].get("message", {}).get("images", [])
    if not images:
        print(f"  No images returned. Response: {json.dumps(result, indent=2)[:500]}", file=sys.stderr)
        continue

    img_data = images[0].get("image_url", {}).get("url", "")
    if img_data.startswith("data:image/"):
        _, b64 = img_data.split(",", 1)
        path = os.path.join(OUTPUT_DIR, filename)
        with open(path, "wb") as f:
            f.write(base64.b64decode(b64))
        print(f"  → {path} ({os.path.getsize(path)} bytes)")
    else:
        print(f"  Unexpected format: {img_data[:100]}", file=sys.stderr)

print("\nDone.")
