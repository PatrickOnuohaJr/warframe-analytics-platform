# Warframe ETL Phase 2 Implementation Plan

## Goal
Implement a full ETL pipeline to populate the Warframe SQL Server database (Phase 1 schema) with data from the public Warframe API.

## User Review Required
- **API Source**: Assuming `https://api.warframestat.us/pc` is the target API.
- **Data Mapping**: Mapping JSON fields to SQL columns (e.g., `uniqueName`, `name`, stats).
- **Load Strategy**: Generating SQL INSERT scripts instead of direct DB connection (as requested).

## Proposed Changes

### ETL/Scripts

#### [NEW] [extract.py](file:///C:/Users/jideo/Warframe_Project/ETL/Scripts/extract.py)
- **Purpose**: Fetch data from Warframe API.
- **Endpoints**:
    - `https://api.warframestat.us/pc/warframes` -> `ETL/Raw/warframes.json`
    - `https://api.warframestat.us/pc/weapons` -> `ETL/Raw/weapons.json`
    - `https://api.warframestat.us/pc/mods` -> `ETL/Raw/mods.json` (might need filtering)
    - `https://api.warframestat.us/pc/arcanes` -> `ETL/Raw/arcanes.json` (might need filtering from items)
- **Features**:
    - Retry logic.
    - Logging to console/file.
    - Error handling.

#### [NEW] [transform.py](file:///C:/Users/jideo/Warframe_Project/ETL/Scripts/transform.py)
- **Purpose**: Clean and shape JSON data.
- **Logic**:
    - **Warframes**: Extract Name, UniqueName, Armor, Health, Shields, Energy, SprintSpeed.
    - **Weapons**: Extract Name, UniqueName, Type, MasteryRank, Damage stats (Impact, Puncture, Slash), Crit/Status stats.
    - **Mods**: Extract Name, UniqueName, Type, Polarity, MaxRank.
    - **Arcanes**: Extract Name, UniqueName, Type, MaxRank.
- **Output**: `ETL/Processed/*.json` (structured for SQL).

#### [NEW] [load.py](file:///C:/Users/jideo/Warframe_Project/ETL/Scripts/load.py)
- **Purpose**: Generate SQL INSERT statements.
- **Logic**:
    - Read `ETL/Processed/*.json`.
    - Generate `INSERT INTO [wf_base].[Table] (...) VALUES (...)` statements.
    - Wrap in `BEGIN TRANSACTION` / `COMMIT`.
    - Handle `SET IDENTITY_INSERT` if needed (though schema uses IDENTITY, so we usually let DB handle IDs, but if we want to preserve IDs or upsert, we might need care. Plan: Let DB handle IDs, just insert data).
    - Output: `ETL/Scripts/load_data.sql` (or similar).

#### [NEW] [pipeline.py](file:///C:/Users/jideo/Warframe_Project/ETL/Scripts/pipeline.py)
- **Purpose**: Orchestrate the flow.
- **Logic**:
    - Call `extract.run()`.
    - Call `transform.run()`.
    - Call `load.run()`.
    - Log success/failure.

## Verification Plan
### Automated Tests
- Run `python ETL/Scripts/pipeline.py`.
- Check `ETL/Raw` for files.
- Check `ETL/Processed` for files.
- Check generated SQL file for validity.

### Manual Verification
- Inspect generated SQL for correct syntax and data.
