# Warframe Analytics Platform

A full end-to-end data engineering and backend analytics platform built for extracting, transforming, storing, and serving Warframe game data.  
This project demonstrates production-style engineering: ETL pipelines, SQL Server modeling, an API layer, and complete documentation.

---

## 🚀 Overview

This system fetches live Warframe metadata (frames, weapons, mods, arcanes), processes it into structured analytical tables, loads it into SQL Server, and exposes the data through a fully documented FastAPI REST API.

---

## 🧱 Architecture

External Warframe API
│
▼
ETL Pipeline (Python)
├── Extract (raw JSON)
├── Transform (clean/shape)
└── Load (SQL scripts)
│
▼
SQL Server Database
│
▼
FastAPI REST API Layer
(warframes, weapons, mods, arcanes, builds)


---

## 🗂️ Project Structure

Warframe_Analytics_Platform/
│
├── API/
│ ├── app/
│ │ ├── main.py
│ │ ├── db.py
│ │ ├── config.py
│ │ ├── models/
│ │ └── routers/
│ └── requirements.txt
│
├── ETL/
│ ├── Scripts/
│ │ ├── extract.py
│ │ ├── transform.py
│ │ ├── load.py
│ │ └── pipeline.py
│ ├── Raw/
│ └── Processed/
│
├── DB/
│ ├── phase1_schema.sql
│ └── load_data.sql
│
├── Docs/
│ ├── implementation_plan.md
│ ├── api_implementation_plan.md
│ └── api_walkthrough.md
│
└── .gitignore



---

## ⚙️ Features

### 🔹 ETL Pipeline
- Automated Warframe API ingestion  
- Cleans and shapes:
  - warframes  
  - weapons  
  - mods  
  - arcanes  
- Generates SQL insert scripts  
- Creates raw + processed staging files  
- Logging for each ETL step  

### 🔹 SQL Server Database
- Normalized schema for all base game data  
- Designed for analytical queries  
- Connected via SQLAlchemy + ODBC  

### 🔹 FastAPI Backend
- REST endpoints:
  - `/warframes`
  - `/weapons`
  - `/mods`
  - `/arcanes`
  - `/builds/frames`
  - `/builds/loadouts`
- Auto-generated Swagger docs  
- Pydantic response models  
- Dependency-injected DB session  

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/PatrickOnuohaJr/warframe-analytics-platform.git
cd warframe-analytics-platform
```

### Run the ETL Pipeline
python ETL/Scripts/pipeline.py


This will:

Extract → ETL/Raw/

Transform → ETL/Processed/

Generate SQL inserts → DB/load_data.sql

Load the SQL into SQL Server manually via SSMS.


### Run the API
Install dependencies:
cd API
pip install -r requirements.txt

### Configure your DB (.env or config.py)
DB_SERVER=THEBLACKPRIME
DB_NAME=Warframe
DB_USER=
DB_PASSWORD=
DB_DRIVER=ODBC Driver 17 for SQL Server

### Start API server:
uvicorn app.main:app --reload

### Open documentation:
💻 http://127.0.0.1:8000/docs

🔍 Example API Endpoints
Resource          	Endpoint
All Warframes	      GET /warframes
Warframe by ID	    GET /warframes/Ash
Weapons	            GET /weapons
Mods	              GET /mods
Arcanes	            GET /arcanes
User Builds	        GET /builds/frames


🧪 Example Warframe Response
{
  "warframeId": 0,
  "uniqueName": "/Lotus/Powersuits/Ninja/Ninja",
  "name": "Ash",
  "armor": 150,
  "health": 455,
  "shields": 270,
  "energy": 100,
  "sprintSpeed": 1.15
}


🧩 Skills Demonstrated
Data Engineering
API ingestion
ETL automation
JSON normalization
SQL Server schema design
Data modeling

### Backend Engineering
FastAPI
SQLAlchemy ORM
REST API architecture
Dependency injection
Environment-based config

### Software Engineering
Version control (Git/GitHub)
Modular folder structure
Documentation (Markdown)
Logging & debugging

🗺️ Roadmap
Add user authentication
Upload custom builds
Deploy on cloud (Railway/Azure)
Build Power BI dashboards
Schedule automated ETL refreshes

📄 License:
This project is for educational and portfolio purposes.


Credits:
Developed by Patrick Onuoha Jr.




























