#!/usr/bin/env python3
"""
Config Integrity Validator — validates all game data config files.

Usage:
    python3 scripts/validate_config.py [--config-dir engine/config/]

Exits 0 on success, 1 on any integrity failure.

Checks:
  1. BUILDINGS: required fields, inputs/outputs reference valid resources,
     tools reference valid tool names, categories match categories.json.
     Buildings with status="planned" are validated less strictly.
  2. RESOURCES: required fields, no duplicate IDs, valid categories
  3. NATIONS: unique_buildings reference valid building IDs, modifiers non-negative
  4. UNITS: valid stats (hp > 0, speed > 0), no duplicate IDs
  5. PRODUCTION CHAINS: every resource has at least one producer (planned producers OK),
     no orphan consumers, no direct cycles
  6. CATEGORIES: every building in a category exists, no empty categories
  7. TERRAIN: exactly 8 types, IDs 0-7, valid colors
  8. TRANSLATIONS: every name_de is non-empty and unique within type
"""

import json
import sys
from pathlib import Path
import builtins

# Safe print wrapper for cross-platform console encoding compatibility
def print(*args, **kwargs):
    new_args = []
    for arg in args:
        if isinstance(arg, str):
            s = arg.replace("❌", "[FAIL]")
            s = s.replace("✅", "[OK]")
            s = s.replace("🔍", "[INFO]")
            s = s.replace("\U0001f50d", "[INFO]")
            s = s.replace("⚠️", "[WARN]")
            new_args.append(s)
        else:
            new_args.append(arg)
    builtins.print(*new_args, **kwargs)

def load_config(config_dir):
    config = {}
    for name in ['buildings', 'resources', 'terrain', 'units', 'nations', 'categories']:
        path = Path(config_dir) / f'{name}.json'
        if not path.exists():
            print(f"❌ Missing config file: {path}")
            sys.exit(1)
        with open(path, encoding="utf-8") as f:
            config[name] = json.load(f)
    return config

def is_planned(b):
    return b.get('status') == 'planned'

def validate_buildings(config):
    buildings = config['buildings']
    resources = {r['id'] for r in config['resources']}
    categories = set(config['categories'].keys())
    errors = 0

    valid_tools = {
        None, 'Pickaxe', 'Axe', 'Saw', 'Hammer', 'Fishing Rod',
        'Cleaver', 'Rolling Pin', 'Bucket', 'Scythe', 'Dagger', 'Shovel', 'Bow'
    }

    ids_seen = set()
    for b in buildings:
        bid = b['id']

        if bid in ids_seen:
            print(f"❌ BUILDING: duplicate ID '{bid}'")
            errors += 1
        ids_seen.add(bid)

        # Required fields
        for field in ['id', 'category', 'cost', 'inputs', 'outputs',
                       'interval', 'build_time', 'tool', 'workers', 'icon', 'name_de']:
            if field not in b:
                print(f"❌ BUILDING '{bid}': missing required field '{field}'")
                errors += 1

        # Category exists
        if b['category'] not in categories:
            print(f"❌ BUILDING '{bid}': category '{b['category']}' not in categories.json")
            errors += 1

        # For planned buildings, only basic structure is required
        if is_planned(b):
            if not b['icon']:
                print(f"❌ BUILDING '{bid}' (planned): empty icon")
                errors += 1
            if not b['name_de']:
                print(f"❌ BUILDING '{bid}' (planned): empty name_de")
                errors += 1
            continue

        # Full validation for implemented buildings

        # Input resources exist
        for inp in b['inputs']:
            if inp not in resources:
                print(f"❌ BUILDING '{bid}': input '{inp}' is not a valid resource")
                errors += 1

        # Output resources exist
        for out in b['outputs']:
            if out not in resources:
                print(f"❌ BUILDING '{bid}': output '{out}' is not a valid resource")
                errors += 1

        # Cost resources exist
        for cost_res in b['cost']:
            if cost_res not in resources:
                print(f"❌ BUILDING '{bid}': cost resource '{cost_res}' is not a valid resource")
                errors += 1

        # Tool is valid
        if b['tool'] not in valid_tools:
            print(f"❌ BUILDING '{bid}': tool '{b['tool']}' is not a known tool")
            errors += 1

        # Reasonable ranges
        if not (0 <= b['build_time'] <= 200):
            print(f"❌ BUILDING '{bid}': build_time {b['build_time']} out of range [0, 200]")
            errors += 1
        if not (0 <= b['interval'] <= 120):
            print(f"❌ BUILDING '{bid}': interval {b['interval']} out of range [0, 120]")
            errors += 1
        if not (0 <= b['workers'] <= 10):
            print(f"❌ BUILDING '{bid}': workers {b['workers']} out of range [0, 10]")
            errors += 1
        if not b['icon']:
            print(f"❌ BUILDING '{bid}': empty icon")
            errors += 1
        if not b.get('name_de'):
            print(f"❌ BUILDING '{bid}': empty name_de")
            errors += 1

    # Castle and Storehouse must have build_time=0
    for b in buildings:
        if b['id'] in ('Castle', 'Storehouse') and not is_planned(b) and b['build_time'] != 0:
            print(f"❌ BUILDING '{b['id']}': must have build_time=0 (instant placement)")
            errors += 1

    return errors

def validate_resources(config):
    resources = config['resources']
    errors = 0
    ids_seen = set()
    names_de_seen = set()

    for r in resources:
        rid = r['id']
        if rid in ids_seen:
            print(f"❌ RESOURCE: duplicate ID '{rid}'")
            errors += 1
        ids_seen.add(rid)

        for field in ['id', 'category', 'icon', 'name_de']:
            if field not in r:
                print(f"❌ RESOURCE '{rid}': missing field '{field}'")
                errors += 1

        if r['category'] not in ('raw', 'processed'):
            print(f"❌ RESOURCE '{rid}': invalid category '{r['category']}'")
            errors += 1
        if not r['icon']:
            print(f"❌ RESOURCE '{rid}': empty icon")
            errors += 1
        if r.get('name_de') in names_de_seen:
            print(f"❌ RESOURCE '{rid}': duplicate German name '{r['name_de']}'")
            errors += 1
        names_de_seen.add(r.get('name_de', ''))

    return errors

def validate_nations(config):
    nations = config['nations']
    building_ids = {b['id'] for b in config['buildings']}
    errors = 0
    ids_seen = set()

    for n in nations:
        nid = n['id']
        if nid in ids_seen:
            print(f"❌ NATION: duplicate ID '{nid}'")
            errors += 1
        ids_seen.add(nid)

        for field in ['id', 'name_de', 'color', 'emoji', 'description',
                       'production', 'cost', 'units', 'special', 'unique_buildings']:
            if field not in n:
                print(f"❌ NATION '{nid}': missing field '{field}'")
                errors += 1

        if not n.get('color', '').startswith('#'):
            print(f"❌ NATION '{nid}': invalid color '{n.get('color')}'")
            errors += 1

        for ub in n.get('unique_buildings', []):
            if ub not in building_ids:
                print(f"❌ NATION '{nid}': unique building '{ub}' not in buildings.json")
                errors += 1

        for key, val in n.get('production', {}).items():
            if val < 0:
                print(f"❌ NATION '{nid}': production.{key} is negative ({val})")
                errors += 1
        for key, val in n.get('cost', {}).items():
            if val < 0:
                print(f"❌ NATION '{nid}': cost.{key} is negative ({val})")
                errors += 1
        for key, val in n.get('units', {}).items():
            if val < 0:
                print(f"❌ NATION '{nid}': units.{key} is negative ({val})")
                errors += 1

    if len(nations) != 5:
        print(f"❌ NATIONS: expected 5 nations, got {len(nations)}")
        errors += 1

    expected = {'Roman', 'Viking', 'Maya', 'Trojan', 'Dark Tribe'}
    actual = {n['id'] for n in nations}
    if actual != expected:
        print(f"❌ NATIONS: expected {expected}, got {actual}")
        errors += 1

    return errors

def validate_units(config):
    units = config['units']
    errors = 0
    ids_seen = set()

    for u in units:
        uid = u['id']
        if uid in ids_seen:
            print(f"❌ UNIT: duplicate ID '{uid}'")
            errors += 1
        ids_seen.add(uid)

        for field in ['id', 'hp', 'speed', 'attack', 'defense', 'range', 'icon', 'name_de']:
            if field not in u:
                print(f"❌ UNIT '{uid}': missing field '{field}'")
                errors += 1

        if u.get('hp', 0) <= 0:
            print(f"❌ UNIT '{uid}': hp must be > 0 (got {u.get('hp')})")
            errors += 1
        if u.get('speed', 0) <= 0:
            print(f"❌ UNIT '{uid}': speed must be > 0 (got {u.get('speed')})")
            errors += 1
        if not u.get('icon'):
            print(f"❌ UNIT '{uid}': empty icon")
            errors += 1
        if not u.get('name_de'):
            print(f"❌ UNIT '{uid}': empty name_de")
            errors += 1

    expected = {'Settler', 'Swordsman', 'Bowman'}
    actual = {u['id'] for u in units}
    if actual != expected:
        print(f"❌ UNITS: expected {expected}, got {actual}")
        errors += 1

    return errors

def validate_production_chains(config):
    buildings = config['buildings']
    resources = {r['id'] for r in config['resources']}
    errors = 0

    producers = {}
    consumers = {}

    for b in buildings:
        if is_planned(b):
            continue  # Skip planned buildings
        for out in b['outputs']:
            producers.setdefault(out, []).append(b['id'])
        for inp in b['inputs']:
            consumers.setdefault(inp, []).append(b['id'])

    # Every resource must have a producer (planned producers count as covered)
    planned_producers = set()
    for b in buildings:
        if is_planned(b):
            for out in b['outputs']:
                planned_producers.add(out)

    for r in config['resources']:
        if r['id'] not in producers and r['id'] not in planned_producers:
            print(f"❌ PRODUCTION: resource '{r['id']}' has NO producer (and no planned producer)")
            errors += 1

    # No resource consumes itself in the same building
    for b in buildings:
        if is_planned(b):
            continue
        for inp in b['inputs']:
            if inp in b['outputs']:
                print(f"❌ PRODUCTION: building '{b['id']}' consumes and produces '{inp}' — direct cycle")
                errors += 1

    # Processed resources that are consumed must also be produced
    for r in config['resources']:
        if r['category'] == 'processed' and r['id'] in consumers:
            if r['id'] not in producers and r['id'] not in planned_producers:
                print(f"❌ PRODUCTION: processed resource '{r['id']}' is consumed but never produced")
                errors += 1

    return errors

def validate_categories(config):
    categories = config['categories']
    building_ids = {b['id'] for b in config['buildings']}
    errors = 0

    for cat_name, cat_buildings in categories.items():
        if not cat_buildings:
            print(f"❌ CATEGORY: '{cat_name}' is empty")
            errors += 1

    for cat_name, cat_buildings in categories.items():
        for b_name in cat_buildings:
            if b_name not in building_ids:
                print(f"❌ CATEGORY: '{cat_name}' references unknown building '{b_name}'")
                errors += 1

    # Every building must be in at least one category
    categorized = set()
    for cat_buildings in categories.values():
        categorized.update(cat_buildings)
    for b in building_ids:
        if b not in categorized:
            print(f"❌ CATEGORY: building '{b}' is not in any category")
            errors += 1

    return errors

def validate_terrain(config):
    terrain = config['terrain']
    errors = 0
    ids_seen = set()

    for t in terrain:
        tid = t['id']
        if tid in ids_seen:
            print(f"❌ TERRAIN: duplicate ID {tid}")
            errors += 1
        ids_seen.add(tid)

        if not (0 <= tid <= 7):
            print(f"❌ TERRAIN: ID {tid} out of S4 range [0, 7]")
            errors += 1

        for field in ['id', 'name', 'color', 'buildable', 'passable', 'name_de']:
            if field not in t:
                print(f"❌ TERRAIN {tid}: missing field '{field}'")
                errors += 1

        if not t.get('color', '').startswith('#'):
            print(f"❌ TERRAIN {tid}: invalid color '{t.get('color')}'")
            errors += 1

    if len(terrain) != 8:
        print(f"❌ TERRAIN: expected 8 types, got {len(terrain)}")
        errors += 1
    if ids_seen != {0, 1, 2, 3, 4, 5, 6, 7}:
        print(f"❌ TERRAIN: missing IDs — expected 0-7, got {sorted(ids_seen)}")
        errors += 1

    return errors

def validate_translations(config):
    errors = 0

    # Buildings — all have unique German names
    names = {}
    for b in config['buildings']:
        name_de = b.get('name_de', '')
        if not name_de:
            print(f"❌ I18N: building '{b['id']}' has empty name_de")
            errors += 1
        if name_de in names:
            print(f"❌ I18N: duplicate German building name '{name_de}' ({b['id']} and {names[name_de]})")
            errors += 1
        names[name_de] = b['id']

    # Resources
    res_names = {}
    for r in config['resources']:
        name_de = r.get('name_de', '')
        if not name_de:
            print(f"❌ I18N: resource '{r['id']}' has empty name_de")
            errors += 1
        if name_de in res_names:
            print(f"❌ I18N: duplicate German resource name '{name_de}'")
            errors += 1
        res_names[name_de] = r['id']

    # Terrain
    for t in config['terrain']:
        if not t.get('name_de'):
            print(f"❌ I18N: terrain {t['id']} has empty name_de")
            errors += 1

    # Units
    for u in config['units']:
        if not u.get('name_de'):
            print(f"❌ I18N: unit '{u['id']}' has empty name_de")
            errors += 1

    # Nations
    for n in config['nations']:
        if not n.get('name_de'):
            print(f"❌ I18N: nation '{n['id']}' has empty name_de")
            errors += 1

    return errors


def main():
    config_dir = sys.argv[1] if len(sys.argv) > 1 else 'engine/config'
    print(f"🔍 Validating config in: {config_dir}")
    print()

    config = load_config(config_dir)

    total_errors = 0
    checks = [
        ("Buildings", validate_buildings),
        ("Resources", validate_resources),
        ("Nations", validate_nations),
        ("Units", validate_units),
        ("Production Chains", validate_production_chains),
        ("Categories", validate_categories),
        ("Terrain", validate_terrain),
        ("Translations (i18n)", validate_translations),
    ]

    for name, fn in checks:
        errors = fn(config)
        status = "✅" if errors == 0 else f"❌ ({errors} errors)"
        print(f"  {status} {name}")
        total_errors += errors

    implemented = sum(1 for b in config['buildings'] if not is_planned(b))
    planned = sum(1 for b in config['buildings'] if is_planned(b))
    print()
    if total_errors == 0:
        print(f"✅ All integrity checks passed!")
        print(f"   {implemented} buildings ({planned} planned), {len(config['resources'])} resources, "
              f"{len(config['terrain'])} terrain, {len(config['units'])} units, "
              f"{len(config['nations'])} nations")
        return 0
    else:
        print(f"❌ {total_errors} integrity errors found")
        return 1

if __name__ == '__main__':
    sys.exit(main())
