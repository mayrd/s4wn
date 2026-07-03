#!/usr/bin/env python3
"""
S4WN Asset Generator Orchestrator.

Cleanly runs all asset sub-generators individually or all at once.
Bridges configurations, minifies shaders, generates procedural meshes,
textures, atlases, sprites, icons, and binary test maps.
"""

import argparse
import sys
import subprocess
import time
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
GENERATORS_DIR = PROJECT_ROOT / "scripts" / "generators"

GENERATORS = {
    "config-js": {
        "script": GENERATORS_DIR / "generate_config_js.py",
        "description": "Compile JSON configs into engine/config/data.js",
        "args": []
    },
    "shaders": {
        "script": GENERATORS_DIR / "minify_shaders.py",
        "description": "Minify GLSL shader strings in engine/src/shaders.rs",
        "args": []
    },
    "test-maps": {
        "script": GENERATORS_DIR / "generate_test_maps.py",
        "description": "Generate binary test .map files under assets/maps/test",
        "args": []
    },
    "terrain-textures": {
        "script": GENERATORS_DIR / "generate_terrain_textures.py",
        "description": "Generate seamless tileable terrain textures using Gemini API",
        "args": []
    },
    "terrain-atlas": {
        "script": GENERATORS_DIR / "generate_terrain_atlas.py",
        "description": "Generate 256x256 terrain tile images and terrain_atlas.png",
        "args": []
    },
    "terrain-models": {
        "script": GENERATORS_DIR / "generate_terrain_models.py",
        "description": "Generate procedural low-poly 3D models (trees, rocks, reeds etc.)",
        "args": []
    },
    "sprites": {
        "script": GENERATORS_DIR / "generate_sprites.py",
        "description": "Generate 2D building, unit, and UI sprites",
        "args": []
    },
    "icons": {
        "script": GENERATORS_DIR / "generate_icons.py",
        "description": "Generate SVG/PNG favicons, touch icons, and loading logo",
        "args": []
    },
}

# The logical execution order for regenerating everything
DEFAULT_ORDER = [
    "config-js",
    "shaders",
    "test-maps",
    "terrain-atlas",
    "terrain-models",
    "sprites",
    "icons"
]


def run_generator(name: str, extra_args: list = None) -> bool:
    """Run a sub-generator script by name as a subprocess."""
    gen = GENERATORS.get(name)
    if not gen:
        print(f"Error: Generator '{name}' does not exist.")
        return False

    script_path = gen["script"]
    if not script_path.exists():
        print(f"Error: Generator script not found: {script_path}")
        return False

    print(f"\n[+] Running generator: {name} ({gen['description']})...")
    print(f"    Script: {script_path.relative_to(PROJECT_ROOT)}")

    cmd = [sys.executable, str(script_path)]
    if gen["args"]:
        cmd.extend(gen["args"])
    if extra_args:
        cmd.extend(extra_args)

    start_time = time.time()
    try:
        result = subprocess.run(cmd, check=True)
        elapsed = time.time() - start_time
        print(f"[OK] {name} completed successfully in {elapsed:.2f}s")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[FAIL] {name} failed with exit code {e.returncode}")
        return False
    except Exception as e:
        print(f"[FAIL] Failed to run {name}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="S4WN Asset Generator Central Orchestrator CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # 'all' subcommand
    all_parser = subparsers.add_parser("all", help="Generate all assets sequentially")
    all_parser.add_argument(
        "--with-textures",
        action="store_true",
        help="Include calling Gemini API for terrain textures (may incur API costs)"
    )
    all_parser.add_argument(
        "--dry-run-textures",
        action="store_true",
        help="Run Gemini API terrain textures generator in dry-run mode (print prompts only)"
    )

    # Individual generators as subcommands
    for name, gen in GENERATORS.items():
        sub_parser = subparsers.add_parser(name, help=gen["description"])
        if name == "terrain-textures":
            sub_parser.add_argument(
                "--dry-run",
                action="store_true",
                help="Print prompts only, don't call the Gemini API"
            )
        elif name == "sprites":
            sub_parser.add_argument(
                "--with-tiles",
                action="store_true",
                help="Also generate simple procedural 64x64 terrain tile files"
            )

    # Custom help if no args
    if len(sys.argv) == 1:
        # Default behavior: Print help and show available generators
        parser.print_help()
        print("\nAvailable sub-generators:")
        for name, gen in GENERATORS.items():
            print(f"  {name:<18} - {gen['description']}")
        print("\nTip: Run 'python scripts/generate.py all' to run all default generators at once.")
        sys.exit(0)

    args = parser.parse_args()

    if args.command == "all":
        print("==================================================")
        print("          S4WN Asset Generation Orchestration      ")
        print("==================================================")
        print(f"Project root: {PROJECT_ROOT}")
        print(f"Order: {', '.join(DEFAULT_ORDER)}")
        if args.with_textures:
            print("Notice: Terrain Textures Gemini API generation is INCLUDED.")
        elif args.dry_run_textures:
            print("Notice: Terrain Textures Gemini API generation is INCLUDED in DRY-RUN mode.")
        else:
            print("Notice: Terrain Textures Gemini API generation is EXCLUDED (default).")
        print("==================================================")

        success = True
        failed_generators = []

        # Run primary default generators
        for name in DEFAULT_ORDER:
            res = run_generator(name)
            if not res:
                success = False
                failed_generators.append(name)

        # Run terrain-textures if explicitly requested
        if args.with_textures:
            res = run_generator("terrain-textures")
            if not res:
                success = False
                failed_generators.append("terrain-textures")
        elif args.dry_run_textures:
            res = run_generator("terrain-textures", extra_args=["--dry-run"])
            if not res:
                success = False
                failed_generators.append("terrain-textures (dry-run)")

        print("\n==================================================")
        if success:
            print("[SUCCESS] ALL REQUESTED ASSET GENERATION SUCCESSFUL!")
        else:
            print(f"[ERROR] SOME GENERATORS FAILED: {', '.join(failed_generators)}")
            sys.exit(1)

    elif args.command in GENERATORS:
        extra_args = []
        if args.command == "terrain-textures" and getattr(args, "dry_run", False):
            extra_args.append("--dry-run")
        elif args.command == "sprites" and getattr(args, "with_tiles", False):
            extra_args.append("--with-tiles")

        res = run_generator(args.command, extra_args=extra_args)
        if not res:
            sys.exit(1)


if __name__ == "__main__":
    main()
