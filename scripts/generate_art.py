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
    ("splash-4k.png", (
        "Generate a 4K (3840x2160) splash screen for a medieval fantasy settlement-building "
        "strategy game called S4WN. Rich painterly oil-painting style. A sprawling medieval "
        "village in a lush green valley at golden hour: timber-framed houses, stone castle on "
        "a hill, wheat fields, orchards, cobblestone paths, a river with watermill, distant "
        "snow-capped mountains, warm amber sunlight. Foreground: wooden signpost reading 'S4WN'. "
        "Vibrant, immersive, medieval European aesthetic. No modern elements. Cinematic."
    )),
    ("menu-bg-4k.png", (
        "Generate a 4K (3840x2160) main menu background for medieval strategy game S4WN. "
        "Twilight atmosphere: medieval village silhouette against deep purple-orange sunset sky "
        "with emerging stars. Glowing lanterns in cottage windows, castle tower silhouette on "
        "horizon, mist over fields. Large dark empty area on the LEFT side for menu text overlay. "
        "Painterly oil-painting style, rich atmospheric lighting, cinematic. Dark edges. "
        "No text or UI elements — pure background art."
    )),
    ("logo-1024.png", (
        "Generate a game logo for 'S4WN' in classic Siedler 4 video game style. "
        "Bold rustic medieval typography: 'S4' large and prominent, 'WN' smaller below. "
        "Weathered wood and stone texture. Bronze/gold metallic rim, oak leaves, wheat sheaves, "
        "small castle tower emblem. Colors: warm gold, aged bronze, dark wood brown, cream. "
        "Professional game logo. Sharp, clean. Transparent or neutral background."
    )),
    ("favicon-256.png", (
        "Generate a 256x256 favicon for strategy game S4WN. Medieval castle tower silhouette "
        "in warm gold on a dark forest-green circular background. Clean, crisp, simple shapes. "
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
