# Warframe API Phase 3 Implementation Plan

## Goal
Create a REST API using FastAPI to expose the Warframe SQL Server database. The API will provide read access to base game data (Warframes, Weapons, Mods, Arcanes) and user builds.

## User Review Required
- **Database Connection**: Using `SQLAlchemy` with `pyodbc` driver for SQL Server.
- **Configuration**: Database credentials will be stored in `API/app/config.py` (using environment variables or placeholders).
- **Structure**:
    - `API/app/main.py`: Entry point.
    - `API/app/routers/`: Endpoint logic.
    - `API/app/models/`: Pydantic schemas for response validation.
    - `API/app/db.py`: Database session management.

## Proposed Changes

### Directory Structure
```
API/
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py
    ├── config.py
    ├── db.py
    ├── models/
    │   ├── __init__.py
    │   ├── base.py      # Base Pydantic models
    │   ├── warframe.py
    │   ├── weapon.py
    │   ├── mod.py
    │   └── arcane.py
    └── routers/
        ├── __init__.py
        ├── warframes.py
        ├── weapons.py
        ├── mods.py
        ├── arcanes.py
        └── builds.py
```

### Implementation Details

#### [NEW] [API/requirements.txt](file:///C:/Users/jideo/Warframe_Project/API/requirements.txt)
- `fastapi`
- `uvicorn`
- `sqlalchemy`
- `pyodbc`
- `pydantic`
- `python-dotenv`

#### [NEW] [API/app/config.py](file:///C:/Users/jideo/Warframe_Project/API/app/config.py)
- Defines `Settings` class using `pydantic-settings` (or simple class) to hold DB credentials.
- Placeholders for `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

#### [NEW] [API/app/db.py](file:///C:/Users/jideo/Warframe_Project/API/app/db.py)
- Sets up `create_engine` using `mssql+pyodbc`.
- Provides `get_db` dependency for FastAPI routes.

#### [NEW] [API/app/models/*.py](file:///C:/Users/jideo/Warframe_Project/API/app/models/)
- Pydantic models mirroring the SQL tables.
- Example `Warframe` model: `id`, `name`, `uniqueName`, `health`, `armor`, etc.

#### [NEW] [API/app/routers/*.py](file:///C:/Users/jideo/Warframe_Project/API/app/routers/)
- **warframes.py**: `GET /warframes`, `GET /warframes/{id}`
- **weapons.py**: `GET /weapons` (query param `type` optional)
- **mods.py**: `GET /mods`
- **arcanes.py**: `GET /arcanes`
- **builds.py**: `GET /builds/frames`, `GET /builds/loadouts`

#### [NEW] [API/app/main.py](file:///C:/Users/jideo/Warframe_Project/API/app/main.py)
- Initializes `FastAPI` app.
- Includes routers.
- Adds basic logging middleware.

## Verification Plan
### Automated Verification
- Run `uvicorn app.main:app --reload` and check for startup errors.
- (Optional) Simple test script to hit endpoints.

### Manual Verification
- Open `http://localhost:8000/docs` (Swagger UI) to test endpoints interactively.
