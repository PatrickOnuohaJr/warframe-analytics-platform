import requests
import json
import os
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("etl_extract.log"),
        logging.StreamHandler()
    ]
)

BASE_URL = "https://api.warframestat.us"
RAW_DIR = Path(__file__).parent.parent / "Raw"

# Ensure Raw directory exists
RAW_DIR.mkdir(parents=True, exist_ok=True)

def fetch_data(endpoint, retries=3, delay=2):
    """
    Fetches data from the specified API endpoint with retry logic.
    """
    url = f"{BASE_URL}/{endpoint}"
    logging.info(f"Fetching data from {url}...")
    
    for attempt in range(retries):
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            logging.info(f"Successfully fetched {len(data)} items from {endpoint}.")
            return data
        except requests.exceptions.RequestException as e:
            logging.warning(f"Attempt {attempt + 1}/{retries} failed for {endpoint}: {e}")
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                logging.error(f"Failed to fetch data from {endpoint} after {retries} attempts.")
                raise

def save_json(data, filename):
    """
    Saves data to a JSON file in the ETL/Raw directory.
    """
    filepath = RAW_DIR / filename
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4)
        logging.info(f"Saved data to {filepath}")
    except IOError as e:
        logging.error(f"Failed to save data to {filepath}: {e}")
        raise

def run_extraction():
    """
    Main extraction function.
    """
    logging.info("Starting extraction process...")
    
    try:
        # 1. Warframes
        warframes = fetch_data("warframes")
        save_json(warframes, "warframes.json")

        # 2. Weapons
        weapons = fetch_data("weapons")
        save_json(weapons, "weapons.json")

        # 3. Mods
        mods = fetch_data("mods")
        save_json(mods, "mods.json")

        # 4. Arcanes
        # The direct 'arcanes' endpoint returns simplified data without uniqueName.
        # We fetch from 'items' and filter for category 'Arcanes'.
        logging.info("Fetching Arcanes from 'items' endpoint...")
        items = fetch_data("items")
        arcanes = [item for item in items if item.get('category') == 'Arcanes']
        save_json(arcanes, "arcanes.json")

        logging.info("Extraction process completed successfully.")
        
    except Exception as e:
        logging.error(f"Extraction process failed: {e}")
        # We might want to re-raise if this is part of a larger pipeline
        # raise 

if __name__ == "__main__":
    run_extraction()
