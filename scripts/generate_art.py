#!/usr/bin/env python3
"""Generate S4WN art via direct Gemini API key."""
import urllib.request, json, base64, os, sys, time

def get_key():
    with open("/opt/data/.env") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("GEMINI_API_KEY not found")

KEY = get_key()
MODEL = "gemini-2.5-flash-image"
OUT = "/opt/data/projects/s4wn/assets/images"
os.makedirs(OUT, exist_ok=True)

PROMPTS = [
    ("splash.png", (
        "Epic splash screen for a medieval fantasy settlement-building strategy game "
        "called S4WN. Rich painterly oil-painting style. A sprawling medieval village "
        "nestled in a lush green valley at golden hour: timber-framed houses, a stone "
        "castle on a hill, wheat fields, orchards, winding cobblestone paths, a river "
        "with a watermill, distant snow-capped mountains, warm amber sunlight casting "
        "long shadows. Foreground shows a wooden signpost reading \"S4WN\". "
        "CRITICAL LAYOUT: All key subjects (castle, village, signpost, river, watermill) "
        "must be inside the CENTER VERTICAL STRIP of the image so the composition works "
        "when cropped to a narrow 9:16 phone screen. The left and right thirds can "
        "contain scenic filler (trees, distant hills, sky) that can be safely cut off "
        "without losing the focal point. The signpost with \"S4WN\" must be centered "
        "horizontally. Vibrant, immersive, high fantasy but grounded in medieval "
        "European aesthetics. No modern elements. Cinematic composition, 4K ultra HD "
        "quality, highly detailed."
    )),
    ("menu-bg.png", (
        "Main menu background for medieval settlement strategy game S4WN. Twilight "
        "atmosphere: medieval village silhouette against deep purple-orange sunset sky "
        "with emerging stars. Soft glowing lanterns in cottage windows, a castle tower "
        "silhouetted on the horizon, mist rolling over fields. "
        "CRITICAL LAYOUT: The entire image must work at both 16:9 and 9:16 ratios. "
        "The dark empty area for menu text overlay must be a CENTER BAND (not just the "
        "left side) — centered both horizontally and vertically — so menu buttons are "
        "legible in landscape AND portrait. The atmospheric elements (village, castle, "
        "lanterns, stars) should frame this center band from above and below in 16:9, "
        "and from top/bottom edges in 9:16 portrait. Painterly oil-painting style, rich "
        "atmospheric lighting, cinematic. No text or UI elements — pure background art. "
        "Dark edges, atmospheric, medieval European aesthetic."
    )),
    ("logo-1024.png", (
        "Game logo for \"S4WN\" in classic Siedler 4 video game style. Bold rustic "
        "medieval typography: \"S4\" large and prominent, \"WN\" smaller below. Carved "
        "from weathered wood and stone texture. Bronze/gold metallic rim with medieval "
        "ornamental flourishes — oak leaves, wheat sheaves, small castle tower emblem. "
        "Colors: warm gold, aged bronze, dark wood brown, cream parchment. Professional "
        "game logo, iconic. Sharp, clean. Transparent or neutral background."
    )),
    ("favicon-256.png", (
        "Favicon for strategy game S4WN. Medieval castle tower silhouette in warm gold "
        "on a dark forest-green circular background. Clean, crisp, simple shapes. "
        "Instantly recognizable at tiny size. No text. Transparent background."
    )),
]

for filename, prompt in PROMPTS:
    print(f"Generating {filename}...", flush=True)
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]}
    }
    
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}",
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                result = json.load(resp)
            
            # Extract image from response
            for part in result.get("candidates", [{}])[0].get("content", {}).get("parts", []):
                if "inlineData" in part:
                    data = base64.b64decode(part["inlineData"]["data"])
                    path = os.path.join(OUT, filename)
                    with open(path, "wb") as f:
                        f.write(data)
                    size_kb = len(data) / 1024
                    print(f"  ✅ {path} ({size_kb:.0f} KB)")
                    break
            else:
                text = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if "safety" in str(result).lower():
                    print(f"  ⚠️  Safety blocked. Trying again...", file=sys.stderr)
                    time.sleep(2)
                    continue
                print(f"  ⚠️  No image. Response: {text[:200]}", file=sys.stderr)
            break
        except Exception as e:
            err = str(e)
            if "429" in err:
                wait = (attempt + 1) * 10
                print(f"  Rate limited, waiting {wait}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"  ❌ {err}", file=sys.stderr)
                break
    
    time.sleep(3)  # Be nice to the API

print("\nDone. Files in:", OUT)
