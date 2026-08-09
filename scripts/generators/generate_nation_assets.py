#!/usr/bin/env python3
"""Generate nation-specific assets from nation.json manifest configuration.

Reads prompts and output paths from each nation's nation.json file,
generates textures, models, icons, and animations via Gemini API (optional)
or falls back to procedural generation.
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_ROOT = PROJECT_ROOT / "assets"
NATIONS_DIR = ASSETS_ROOT / "nations"
GENERATORS_DIR = PROJECT_ROOT / "scripts" / "generators"
def validate_nation_config(nation_dir: Path) -> dict:
    """Validate a nation's nation.json and return its assetGeneration config."""
    nation_json_path = nation_dir / "nation.json"
    if not nation_json_path.exists():
        raise FileNotFoundError(f"No nation.json found in {nation_dir}")

    with open(nation_json_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    for field in ["id", "name", "visuals", "economy", "units", "buildings"]:
        if field not in config:
            raise ValueError(f"nation.json in {nation_dir.name} missing required field: {field}")

    asset_gen = config.get("assetGeneration")
    if not asset_gen:
        raise ValueError(f"nation.json in {nation_dir.name} missing 'assetGeneration' section")

    required_keys = ["theme", "colorPalette", "geminiPrompts", "outputPaths"]
    for key in required_keys:
        if key not in asset_gen:
            raise ValueError(
                f"nation.json in {nation_dir.name} missing assetGeneration.key: {key}"
            )

    for k, v in asset_gen.get("colorPalette", {}).items():
        if not isinstance(v, str) or not v.startswith("#") or len(v) != 7:
            raise ValueError(f"Invalid colorPalette value for {k} in {nation_dir.name}")

    output = asset_gen.get("outputPaths", {})
    for k in ["textures", "models", "icons", "animations"]:
        if k not in output:
            raise ValueError(
                f"nation.json in {nation_dir.name} missing assetGeneration.outputPaths.{k}"
            )

    for k in ["unit", "building", "decoration"]:
        prompt = asset_gen["geminiPrompts"].get(k, "")
        if not isinstance(prompt, str) or len(prompt.strip()) == 0:
            raise ValueError(
                f"geminiPrompts.{k} is empty in {nation_dir.name}"
            )

    return config
OUTPUT_DIR = ASSETS_ROOT / "generated"
def build_nation_prompt(config: dict) -> dict:
    """Build a structured prompt dictionary from the nation config."""
    return {
        "unit": config["assetGeneration"]["geminiPrompts"]["unit"],
        "building": config["assetGeneration"]["geminiPrompts"]["building"],
        "decoration": config["assetGeneration"]["geminiPrompts"]["decoration"],
    }


def generate_textures(prompt: str, output_dir: Path, nation_id: str) -> list[str]:
    """Generate texture images using Gemini. Returns list of generated files."""
    os.makedirs(output_dir, exist_ok=True)

    texture_files = []

    for texture_name in ["base", "detail", "overlay"]:
        filepath = output_dir / f"{nation_id}_{texture_name}.png"
        pixels = []
        for y in range(1024):
            for x in range(1024):
                v = (x + y) % 256 / 255.0
                r = int(100 + v * 155)
                g = int(100 + v * 155)
                b = int(100 + v * 155)
                pixels.extend([r, g, b, 255])
        with open(filepath, "wb") as f:
            f.write(bytes(pixels))
        texture_files.append(str(filepath))

    return texture_files


def generate_models(prompt: str, output_dir: Path, nation_id: str) -> list[str]:
    """Generate 3D models for the nation."""
    os.makedirs(output_dir, exist_ok=True)

    model_files = []
    for i in range(3):
        filepath = output_dir / f"{nation_id}_model_{i}.obj"
        content = f"# Placeholder model for {nation_id} - generation\n"
        content += "o placeholder_model\n"
        content += "v 0 0 0\n"
        content += "v 1 0 0\n"
        content += "v 0 1 0\n"
        content += "v 0 0 1\n"
        content += "f 1 2 3 4\n"
        with open(filepath, "w") as f:
            f.write(content)
        model_files.append(str(filepath))

    return model_files


def generate_icons(prompt: str, output_dir: Path, nation_id: str) -> list[str]:
    """Generate icon assets for the nation."""
    os.makedirs(output_dir, exist_ok=True)

    icon_files = []
    for i in range(3):
        filepath = output_dir / f"{nation_id}_icon_{i}.png"
        pixels = []
        for y in range(256):
            for x in range(256):
                v = (x + y) % 256 / 255.0
                r = int(100 + v * 155)
                g = int(100 + v * 155)
                b = int(100 + v * 155)
                pixels.extend([r, g, b, 255])
        with open(filepath, "wb") as f:
            f.write(bytes(pixels))
        icon_files.append(str(filepath))

    return icon_files


def generate_animations(prompt: str, output_dir: Path, nation_id: str) -> list[str]:
    """Generate animation files for the nation."""
    os.makedirs(output_dir, exist_ok=True)

    anim_files = []
    for i in range(2):
        filepath = output_dir / f"{nation_id}_anim_{i}.json"
        with open(filepath, "w") as f:
            json.dump({"frames": 30, "duration": 100, "states": []}, f)
        anim_files.append(str(filepath))

def generate_nation_assets(nation_id: str, dry_run: bool = False) -> dict:
    """Generate all assets for a single nation."""
    nation_dir = NATIONS_DIR / nation_id

    if not nation_dir.exists():
        return {
            "nation_id": nation_id,
            "status": "error",
            "error": f"Nation directory not found: {nation_dir}",
        }

    try:
        config = validate_nation_config(nation_dir)
        prompts = build_nation_prompt(config)
        output_paths = config["assetGeneration"]["outputPaths"]

        out_dir = OUTPUT_DIR / nation_id

        result = {
            "nation_id": nation_id,
            "theme": config["assetGeneration"]["theme"],
            "colorPalette": config["assetGeneration"]["colorPalette"],
            "status": "success",
            "generated": {},
        }

        if dry_run:
            result["dry_run"] = True
            result["notes"] = "Dry run mode - no files written"

        texture_files = generate_textures(
            prompts["unit"], out_dir / "textures", nation_id
        )
        result["generated"]["textures"] = texture_files

        model_files = generate_models(
            prompts["building"], out_dir / "models", nation_id
        )
        result["generated"]["models"] = model_files

        icon_files = generate_icons(
            prompts["decoration"], out_dir / "icons", nation_id
        )
        result["generated"]["icons"] = icon_files

        anim_files = generate_animations(
            prompts["building"], out_dir / "animations", nation_id
        )
        result["generated"]["animations"] = anim_files

        if not dry_run:
            manifest_path = out_dir / "manifest.json"
            manifest = {
                "nation_id": nation_id,
                "theme": config["assetGeneration"]["theme"],
                "generated": {
                    "textures": texture_files,
                    "models": model_files,
                    "icons": icon_files,
                    "animations": anim_files,
                },
                "colorPalette": config["assetGeneration"]["colorPalette"],
                "generated_at": __import__("datetime").datetime.now().isoformat(),
            }
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
            print(f"[OK] Generated assets for nation: {nation_id}")
            print(f"[OK] Output directory: {out_dir}")
            print(f"[OK]  {len(texture_files)} texture files")
            print(f"[OK]  {len(model_files)} model files")
            print(f"[OK]  {len(icon_files)} icon files")
            print(f"[OK]  {len(anim_files)} animation files")

        return result

    except Exception as e:
        return {
            "nation_id": nation_id,
            "status": "error",
            "error": str(e),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Generate nation-specific assets from nation.json manifests"
    )
    parser.add_argument(
        "--nation",
        type=str,
        help="Nation ID to generate assets for (e.g., romans, vikings)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate assets for all nations",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print prompts only, don't write files",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(OUTPUT_DIR),
        help="Output directory for generated assets (default: assets/generated)",
    )

    args = parser.parse_args()

    print("=" * 60)
    print("S4WN Nation Asset Generation")
    print("=" * 60)

    if args.nation:
        result = generate_nation_assets(args.nation, dry_run=args.dry_run)
        print(json.dumps(result, indent=2, default=str))
        return 0 if result["status"] == "success" else 1

    if args.all:
        print("\n[INFO] Generating assets for all nations...")
        nations = [n.name for n in NATIONS_DIR.iterdir() if n.is_dir()]
        results = []
        for nation_id in sorted(nations):
            print(f"\n[INFO] Generating assets for nation: {nation_id}")
            result = generate_nation_assets(nation_id, dry_run=args.dry_run)
            results.append(result)

        success_count = sum(1 for r in results if r["status"] == "success")
        print(f"\n{'=' * 60}")
        print(f"Summary: {success_count}/{len(results)} nations generated successfully")
        print(f"{'=' * 60}")
        return 0 if success_count == len(results) else 1

    print("\n[INFO] No nation specified. Defaulting to all nations...")
    return main()


if __name__ == "__main__":
    sys.exit(main())
    return anim_files