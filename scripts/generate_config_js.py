#!/usr/bin/env python3
"""
Generate engine/config/data.js from JSON config files.

Reads:  engine/config/buildings.json, resources.json, terrain.json,
        units.json, nations.json, categories.json
Writes: engine/config/data.js (window.S4WN_CONFIG + lookup maps)

Run after any config JSON edit.
"""

import json
from pathlib import Path

CONFIG_DIR = Path("engine/config")

def main():
    with open(CONFIG_DIR / "buildings.json") as f: buildings = json.load(f)
    with open(CONFIG_DIR / "resources.json") as f: resources = json.load(f)
    with open(CONFIG_DIR / "terrain.json") as f: terrain = json.load(f)
    with open(CONFIG_DIR / "units.json") as f: units = json.load(f)
    with open(CONFIG_DIR / "nations.json") as f: nations = json.load(f)
    with open(CONFIG_DIR / "categories.json") as f: categories = json.load(f)

    js = "window.S4WN_CONFIG = " + json.dumps({
        "buildings": buildings, "resources": resources, "terrain": terrain,
        "units": units, "nations": nations, "categories": categories
    }, indent=2, ensure_ascii=False) + ";\n\n"

    # RESOURCE_NAMES for binary .map parser: indexed by map resource ID (0-7)
    # S4 map deposits: 0=Nothing,1=Iron,2=Coal,3=Gold,4=Stone,5=Sulfur,6=Fish,7=Game,8=Grain
    resource_names_list = [None, 'IronOre', 'Coal', 'Gold', 'Stone', 'Sulfur', 'Fish', 'Meat', 'Grain']

    js += f"""(function() {{
    const C = window.S4WN_CONFIG;
    window.BUILDING_ICONS = {{}};
    C.buildings.forEach(b => {{ window.BUILDING_ICONS[b.id] = b.icon; }});
    window.BUILDING_NAMES_DE = {{}};
    C.buildings.forEach(b => {{ window.BUILDING_NAMES_DE[b.id] = b.name_de; }});
    window.RESOURCE_ICONS = {{}};
    C.resources.forEach(r => {{ window.RESOURCE_ICONS[r.id] = r.icon; }});
    window.RESOURCE_NAMES_DE = {{}};
    C.resources.forEach(r => {{ window.RESOURCE_NAMES_DE[r.id] = r.name_de; }});
    window.RESOURCE_ORDER = C.resources.map(r => r.id);
    window.TERRAIN_BY_ID = C.terrain;
    window.TERRAIN_NAMES_DE = {{}};
    C.terrain.forEach(t => {{ window.TERRAIN_NAMES_DE[t.name] = t.name_de; }});
    window.TERRAIN_NAMES = C.terrain.map(t => t.name.toLowerCase());
    window.UNIT_NAMES_DE = {{}};
    C.units.forEach(u => {{ window.UNIT_NAMES_DE[u.id] = u.name_de; }});
    window.BUILDING_CATEGORIES = C.categories;
    window.UNIT_STATS = {{}};
    C.units.forEach(u => {{ window.UNIT_STATS[u.id] = u; }});
    window.NATION_CONFIG = {{}};
    C.nations.forEach(n => {{ window.NATION_CONFIG[n.id] = n; }});
    window.RESOURCE_NAMES = {json.dumps(resource_names_list)};
    console.log("S4WN config loaded:", C.buildings.length, "buildings,", C.resources.length, "resources,", C.terrain.length, "terrain,", C.units.length, "units,", C.nations.length, "nations");
}})();
"""

    out = CONFIG_DIR / "data.js"
    with open(out, "w") as f:
        f.write(js)
    print(f"Generated {out} ({len(js)} bytes)")

if __name__ == '__main__':
    main()
