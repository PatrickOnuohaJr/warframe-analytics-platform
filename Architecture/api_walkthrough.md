# Warframe API Walkthrough

This document describes how to run the Warframe REST API.

## Prerequisites
- Python 3.x
- SQL Server instance with the Warframe database (Phase 1 & 2 completed)
- ODBC Driver 17 for SQL Server

## Installation

1. Navigate to the `API` directory:
   ```bash
   cd API
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

1. Open `API/app/config.py` or create a `.env` file in the `API` directory.
2. Update the database credentials:
   ```python
   DB_SERVER = "localhost"
   DB_NAME = "Warframe"
   DB_USER = "sa"
   DB_PASSWORD = "your_password"
   ```

## Running the Server

Start the API server using `uvicorn`:

```bash
# From the API directory
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Documentation

Interactive Swagger UI documentation is available at:
`http://localhost:8000/docs`

## Example Requests

### Warframes
- **List all**: `GET /warframes`
- **Get one**: `GET /warframes/{id}`

### Weapons
- **List all**: `GET /weapons`
- **Filter by type**: `GET /weapons?type=Primary`
- **Get one**: `GET /weapons/{id}`

### Mods
- **List all**: `GET /mods`
- **Get one**: `GET /mods/{id}`

### Arcanes
- **List all**: `GET /arcanes`
- **Get one**: `GET /arcanes/{id}`

### User Builds
- **My Frames**: `GET /builds/frames`
- **Loadouts**: `GET /builds/loadouts`
