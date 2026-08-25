import json
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("etl_load.log"),
        logging.StreamHandler()
    ]
)

PROCESSED_DIR = Path(__file__).parent.parent / "Processed"
OUTPUT_SQL_FILE = Path(__file__).parent.parent / "load_data.sql"

def load_json(filename):
    filepath = PROCESSED_DIR / filename
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except IOError as e:
        logging.error(f"Failed to load {filepath}: {e}")
        return []

def escape_sql(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, bool):
        return '1' if value else '0'
    # String escaping
    return "'" + str(value).replace("'", "''") + "'"

def generate_insert_warframes(data):
    statements = []
    for item in data:
        cols = ["UniqueName", "Name", "Armor", "Health", "Shields", "Energy", "SprintSpeed", "RawJson"]
        vals = [
            escape_sql(item.get("UniqueName")),
            escape_sql(item.get("Name")),
            escape_sql(item.get("Armor")),
            escape_sql(item.get("Health")),
            escape_sql(item.get("Shields")),
            escape_sql(item.get("Energy")),
            escape_sql(item.get("SprintSpeed")),
            escape_sql(item.get("RawJson"))
        ]
        
        # Idempotent insert
        unique_name = escape_sql(item.get("UniqueName"))
        sql = f"""
        IF NOT EXISTS (SELECT 1 FROM [wf_base].[Warframes] WHERE UniqueName = {unique_name})
        BEGIN
            INSERT INTO [wf_base].[Warframes] ({', '.join(cols)})
            VALUES ({', '.join(vals)});
        END
        """
        statements.append(sql)
    return statements

def generate_insert_weapons(data):
    statements = []
    for item in data:
        cols = ["UniqueName", "Name", "Type", "MasteryRank", "Impact", "Puncture", "Slash", 
                "CritChance", "CritMultiplier", "StatusChance", "FireRate", "MagazineSize", 
                "ReloadTime", "Multishot", "RawJson"]
        vals = [
            escape_sql(item.get("UniqueName")),
            escape_sql(item.get("Name")),
            escape_sql(item.get("Type")),
            escape_sql(item.get("MasteryRank")),
            escape_sql(item.get("Impact")),
            escape_sql(item.get("Puncture")),
            escape_sql(item.get("Slash")),
            escape_sql(item.get("CritChance")),
            escape_sql(item.get("CritMultiplier")),
            escape_sql(item.get("StatusChance")),
            escape_sql(item.get("FireRate")),
            escape_sql(item.get("MagazineSize")),
            escape_sql(item.get("ReloadTime")),
            escape_sql(item.get("Multishot")),
            escape_sql(item.get("RawJson"))
        ]
        
        unique_name = escape_sql(item.get("UniqueName"))
        sql = f"""
        IF NOT EXISTS (SELECT 1 FROM [wf_base].[Weapons] WHERE UniqueName = {unique_name})
        BEGIN
            INSERT INTO [wf_base].[Weapons] ({', '.join(cols)})
            VALUES ({', '.join(vals)});
        END
        """
        statements.append(sql)
    return statements

def generate_insert_mods(data):
    statements = []
    for item in data:
        cols = ["UniqueName", "Name", "ModType", "Polarity", "MaxRank", "RawJson"]
        vals = [
            escape_sql(item.get("UniqueName")),
            escape_sql(item.get("Name")),
            escape_sql(item.get("ModType")),
            escape_sql(item.get("Polarity")),
            escape_sql(item.get("MaxRank")),
            escape_sql(item.get("RawJson"))
        ]
        
        unique_name = escape_sql(item.get("UniqueName"))
        sql = f"""
        IF NOT EXISTS (SELECT 1 FROM [wf_base].[Mods] WHERE UniqueName = {unique_name})
        BEGIN
            INSERT INTO [wf_base].[Mods] ({', '.join(cols)})
            VALUES ({', '.join(vals)});
        END
        """
        statements.append(sql)
    return statements

def generate_insert_arcanes(data):
    statements = []
    for item in data:
        cols = ["UniqueName", "Name", "ItemType", "MaxRank", "RawJson"]
        vals = [
            escape_sql(item.get("UniqueName")),
            escape_sql(item.get("Name")),
            escape_sql(item.get("ItemType")),
            escape_sql(item.get("MaxRank")),
            escape_sql(item.get("RawJson"))
        ]
        
        unique_name = escape_sql(item.get("UniqueName"))
        sql = f"""
        IF NOT EXISTS (SELECT 1 FROM [wf_base].[Arcanes] WHERE UniqueName = {unique_name})
        BEGIN
            INSERT INTO [wf_base].[Arcanes] ({', '.join(cols)})
            VALUES ({', '.join(vals)});
        END
        """
        statements.append(sql)
    return statements

def run_load():
    logging.info("Starting load process (generating SQL)...")
    
    all_statements = []
    all_statements.append("BEGIN TRANSACTION;")
    all_statements.append("-- Auto-generated by ETL/Scripts/load.py")
    
    # 1. Warframes
    warframes = load_json("warframes.json")
    all_statements.extend(generate_insert_warframes(warframes))
    logging.info(f"Generated {len(warframes)} inserts for Warframes.")
    
    # 2. Weapons
    weapons = load_json("weapons.json")
    all_statements.extend(generate_insert_weapons(weapons))
    logging.info(f"Generated {len(weapons)} inserts for Weapons.")
    
    # 3. Mods
    mods = load_json("mods.json")
    all_statements.extend(generate_insert_mods(mods))
    logging.info(f"Generated {len(mods)} inserts for Mods.")
    
    # 4. Arcanes
    arcanes = load_json("arcanes.json")
    all_statements.extend(generate_insert_arcanes(arcanes))
    logging.info(f"Generated {len(arcanes)} inserts for Arcanes.")
    
    all_statements.append("COMMIT TRANSACTION;")
    all_statements.append("PRINT 'Data loaded successfully';")
    
    try:
        with open(OUTPUT_SQL_FILE, 'w', encoding='utf-8') as f:
            f.write("\n".join(all_statements))
        logging.info(f"SQL script saved to {OUTPUT_SQL_FILE}")
    except IOError as e:
        logging.error(f"Failed to write SQL file: {e}")

if __name__ == "__main__":
    run_load()
