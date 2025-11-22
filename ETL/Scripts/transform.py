import json
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("etl_transform.log"),
        logging.StreamHandler()
    ]
)

RAW_DIR = Path(__file__).parent.parent / "Raw"
PROCESSED_DIR = Path(__file__).parent.parent / "Processed"

# Ensure Processed directory exists
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

def load_json(filename):
    filepath = RAW_DIR / filename
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except IOError as e:
        logging.error(f"Failed to load {filepath}: {e}")
        return []

def save_json(data, filename):
    filepath = PROCESSED_DIR / filename
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        logging.info(f"Saved processed data to {filepath}")
    except IOError as e:
        logging.error(f"Failed to save {filepath}: {e}")

def transform_warframes(raw_data):
    logging.info("Transforming Warframes...")
    processed = []
    for item in raw_data:
        if item.get('category') != 'Warframes' and item.get('type') != 'Warframe':
            continue
        
        # Skip if it's a skin or helmet (usually indicated by type or lack of stats)
        if 'health' not in item:
            continue

        processed.append({
            "UniqueName": item.get('uniqueName'),
            "Name": item.get('name'),
            "Armor": item.get('armor'),
            "Health": item.get('health'),
            "Shields": item.get('shield'),
            "Energy": item.get('power'),
            "SprintSpeed": item.get('sprint'),
            "RawJson": json.dumps(item)
        })
    return processed

def transform_weapons(raw_data):
    logging.info("Transforming Weapons...")
    processed = []
    for item in raw_data:
        # Basic filter for weapons
        if item.get('category') not in ['Primary', 'Secondary', 'Melee']:
            continue

        # Extract damage stats
        # API structure varies. Sometimes 'damagePerShot' is a list of numbers (old) or dict (new).
        # Often 'totalDamage' is available.
        # We'll try to get specific damage types if available in 'damageTypes' or keys in 'damagePerShot'
        
        impact = 0.0
        puncture = 0.0
        slash = 0.0
        
        # Attempt to parse damage
        # This is a simplification; real parsing might need to handle 'damagePerShot' array vs dict
        # For now, we'll look for common keys if they exist at top level or inside damage object
        # Many items have 'damage' dict directly
        
        damage_dict = item.get('damage', {})
        if not isinstance(damage_dict, dict):
             # Sometimes it's 'damagePerShot'
             damage_dict = item.get('damagePerShot', {})
             # If it's a list, it's usually [impact, puncture, slash, ...] but order varies. 
             # Safest is to look for named keys if possible.
        
        if isinstance(damage_dict, dict):
            impact = float(damage_dict.get('impact', 0.0))
            puncture = float(damage_dict.get('puncture', 0.0))
            slash = float(damage_dict.get('slash', 0.0))

        processed.append({
            "UniqueName": item.get('uniqueName'),
            "Name": item.get('name'),
            "Type": item.get('category'), # Primary, Secondary, Melee
            "MasteryRank": item.get('masteryReq'),
            "Impact": impact,
            "Puncture": puncture,
            "Slash": slash,
            "CritChance": item.get('critChance'),
            "CritMultiplier": item.get('critMult'),
            "StatusChance": item.get('procChance'),
            "FireRate": item.get('fireRate'),
            "MagazineSize": item.get('magazineSize'),
            "ReloadTime": item.get('reloadTime'),
            "Multishot": item.get('multishot'),
            "RawJson": json.dumps(item)
        })
    return processed

def transform_mods(raw_data):
    logging.info("Transforming Mods...")
    processed = []
    for item in raw_data:
        if item.get('category') != 'Mods':
            continue
            
        processed.append({
            "UniqueName": item.get('uniqueName'),
            "Name": item.get('name'),
            "ModType": item.get('type'), # e.g. 'Warframe Mod', 'Rifle Mod'
            "Polarity": item.get('polarity'),
            "MaxRank": item.get('fusionLimit'),
            "RawJson": json.dumps(item)
        })
    return processed

def transform_arcanes(raw_data):
    logging.info("Transforming Arcanes...")
    processed = []
    for item in raw_data:
        # Arcanes usually have category 'Arcanes'
        if item.get('category') != 'Arcanes':
            continue

        # Max rank is usually length of levelStats - 1, or explicitly 'rank' (but rank is usually current rank)
        # 'levelStats' is array of stats per rank.
        max_rank = 0
        if 'levelStats' in item:
            max_rank = len(item['levelStats']) - 1
        
        processed.append({
            "UniqueName": item.get('uniqueName'),
            "Name": item.get('name'),
            "ItemType": item.get('type'), # e.g. 'Arcane'
            "MaxRank": max_rank,
            "RawJson": json.dumps(item)
        })
    return processed

def run_transformation():
    logging.info("Starting transformation process...")
    
    # 1. Warframes
    raw_warframes = load_json("warframes.json")
    proc_warframes = transform_warframes(raw_warframes)
    save_json(proc_warframes, "warframes.json")
    
    # 2. Weapons
    raw_weapons = load_json("weapons.json")
    proc_weapons = transform_weapons(raw_weapons)
    save_json(proc_weapons, "weapons.json")
    
    # 3. Mods
    raw_mods = load_json("mods.json")
    proc_mods = transform_mods(raw_mods)
    save_json(proc_mods, "mods.json")
    
    # 4. Arcanes
    raw_arcanes = load_json("arcanes.json")
    proc_arcanes = transform_arcanes(raw_arcanes)
    save_json(proc_arcanes, "arcanes.json")
    
    logging.info("Transformation process completed.")

if __name__ == "__main__":
    run_transformation()
