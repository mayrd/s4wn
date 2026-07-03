#!/usr/bin/env python3
"""Validate binary .map files for the S4WN engine.

Checks:
- WRLD magic bytes
- Valid version (u32 LE)
- Dimensions match file size
- Terrain IDs in valid range (0-7)
- Resource IDs in valid range (0-8)
- Elevation values in range (0-255)
- Tile count matches width*height

Usage:
  python3 scripts/validate_test_maps.py [directory]
"""
import struct
import sys
import os
import json


TERRAIN_NAMES = {
    0: "Grass", 1: "Forest", 2: "Mountain", 3: "Water",
    4: "DeepWater", 5: "Desert", 6: "Swamp", 7: "Snow",
}

RESOURCE_NAMES = {
    0: None, 1: "Iron", 2: "Coal", 3: "Gold", 4: "Stone",
    5: "Sulfur", 6: "Fish", 7: "Game", 8: "Grain",
}


def validate_map(filepath):
    """Validate a single .map binary file. Returns (ok, errors, summary)."""
    errors = []
    with open(filepath, "rb") as f:
        data = f.read()

    basename = os.path.basename(filepath)
    size = len(data)

    # Header: 4 magic + 4 version + 4 width + 4 height = 16 bytes
    if size < 16:
        errors.append(f"File too small ({size} bytes, minimum 16)")
        return False, errors, {}

    magic = data[0:4]
    if magic != b"WRLD":
        errors.append(f"Bad magic: expected 'WRLD', got {magic!r}")
        return False, errors, {}

    version = struct.unpack_from("<I", data, 4)[0]
    width = struct.unpack_from("<I", data, 8)[0]
    height = struct.unpack_from("<I", data, 12)[0]

    if width == 0 or height == 0:
        errors.append(f"Invalid dimensions: {width}x{height}")
        return False, errors, {}

    if width > 1024 or height > 1024:
        errors.append(f"Map too large: {width}x{height} (max 1024x1024)")

    expected_size = 16 + width * height * 6
    if size != expected_size:
        errors.append(
            f"Size mismatch: {size} bytes for {width}x{height} "
            f"(expected {expected_size})"
        )

    # Parse tiles
    total_tiles = width * height
    terrain_counts = {}
    resource_counts = {}
    elev_min = 255
    elev_max = 0
    unknown_terrain = 0
    unknown_resources = 0

    for i in range(total_tiles):
        offset = 16 + i * 6
        terrain_id = data[offset]
        elev_raw = data[offset + 1]
        flags = data[offset + 2]
        resource_id = data[offset + 3]

        if terrain_id not in TERRAIN_NAMES:
            unknown_terrain += 1
            if unknown_terrain <= 5:  # Only report first 5
                errors.append(
                    f"Tile [{i // width},{i % width}]: unknown terrain ID {terrain_id}"
                )

        if resource_id not in RESOURCE_NAMES:
            unknown_resources += 1
            if unknown_resources <= 5:
                errors.append(
                    f"Tile [{i // width},{i % width}]: unknown resource ID {resource_id}"
                )

        # Track counts
        tname = TERRAIN_NAMES.get(terrain_id, f"UNKNOWN_{terrain_id}")
        terrain_counts[tname] = terrain_counts.get(tname, 0) + 1

        rname = RESOURCE_NAMES.get(resource_id)
        if rname:
            resource_counts[rname] = resource_counts.get(rname, 0) + 1

        # Track elevation
        if elev_raw < elev_min:
            elev_min = elev_raw
        if elev_raw > elev_max:
            elev_max = elev_raw

    summary = {
        "file": basename,
        "size_bytes": size,
        "version": version,
        "width": width,
        "height": height,
        "total_tiles": total_tiles,
        "terrain_counts": terrain_counts,
        "resource_counts": resource_counts,
        "elevation_range": [elev_min, elev_max],
        "unknown_terrain_count": unknown_terrain,
        "unknown_resource_count": unknown_resources,
    }

    ok = len(errors) == 0
    return ok, errors, summary


def main():
    directory = sys.argv[1] if len(sys.argv) > 1 else "assets/maps/test"
    if not os.path.isdir(directory):
        print(f"ERROR: Directory not found: {directory}")
        sys.exit(1)

    map_files = sorted(
        f for f in os.listdir(directory) if f.endswith(".map")
    )
    if not map_files:
        print(f"No .map files found in {directory}")
        sys.exit(1)

    print(f"Validating {len(map_files)} .map file(s) in {directory}...\n")
    all_ok = True

    for mapfile in map_files:
        filepath = os.path.join(directory, mapfile)
        ok, errors, summary = validate_map(filepath)

        status = "[OK] PASS" if ok else "[FAIL] FAIL"
        print(f"  {status}  {mapfile}")
        print(f"         {summary['width']}x{summary['height']}, "
              f"{summary['total_tiles']} tiles, "
              f"{summary['size_bytes']} bytes")
        print(f"         Terrain: {summary['terrain_counts']}")
        print(f"         Resources: {summary['resource_counts']}")
        print(f"         Elevation: {summary['elevation_range'][0]}-{summary['elevation_range'][1]}")

        if errors:
            for err in errors[:10]:  # Show first 10 errors
                print(f"         [WARN]  {err}")
            if len(errors) > 10:
                print(f"         ... and {len(errors) - 10} more errors")
        print()

        if not ok:
            all_ok = False

    if all_ok:
        print(f"All {len(map_files)} .map files validated successfully! [OK]")
    else:
        print("Some .map files have validation errors [FAIL]")
        sys.exit(1)


if __name__ == "__main__":
    main()
