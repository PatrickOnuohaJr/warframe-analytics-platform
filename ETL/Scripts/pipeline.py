import logging
import sys
import os
from pathlib import Path

# Add current directory to path so we can import sibling scripts
sys.path.append(str(Path(__file__).parent))

import extract
import transform
import load

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("etl_pipeline.log"),
        logging.StreamHandler()
    ]
)

def run_pipeline():
    logging.info("========================================")
    logging.info("   Starting Warframe ETL Pipeline")
    logging.info("========================================")

    try:
        # Step 1: Extract
        logging.info(">>> Step 1: Extraction")
        extract.run_extraction()
        
        # Step 2: Transform
        logging.info(">>> Step 2: Transformation")
        transform.run_transformation()
        
        # Step 3: Load
        logging.info(">>> Step 3: Loading (SQL Generation)")
        load.run_load()
        
        logging.info("========================================")
        logging.info("   ETL Pipeline Completed Successfully")
        logging.info("========================================")
        
    except Exception as e:
        logging.error(f"ETL Pipeline Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_pipeline()
