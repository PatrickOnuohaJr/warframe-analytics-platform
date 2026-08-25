# Warframe Jarvis (Cephalon Gu)

A personal Warframe companion app — tracks arsenal, arcanes, Archon Shards, Helminth invigorations, and cultivation lore, built on a React frontend backed directly by Supabase/Postgres.

---

## 🚀 Overview

The live app is a React + Vite client that reads and writes directly to a Supabase (Postgres) database — no intermediate API layer. Data (frame/weapon/mod/arcane base stats) was originally sourced via a Python ETL pipeline and has since been migrated and is maintained through one-off seed scripts in `DB/Seeds/`.

---

## 🧱 Architecture

```
React + Vite client (warframe-client/)
        │
        ▼
Supabase JS client (@supabase/supabase-js)
        │
        ▼
Supabase / Postgres  (wf_base = game data, wf_user = personal collection/progress)
```

Occasional data loads/migrations run through standalone scripts in `DB/Seeds/` (Python, talk to Supabase directly).

---

## 🗂️ Project Structure

```
Warframe_Project/
│
├── warframe-client/        React + Vite + Tailwind frontend (the live app)
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── lib/            Supabase client
│       └── constants/
│
├── DB/
│   ├── Migrations/         Dated SQL migrations against the live Supabase DB
│   ├── Cultivation/        Cultivation doctrine seed SQL (run in Supabase SQL editor)
│   ├── Seeds/              Python scripts that seed/migrate data into Supabase
│   └── Guides/
│
├── Docs/                   Session logs, lore, accomplishments
│
└── Legacy/                 Archived first-pass stack (pre-Claude Code era) — see below
```

---

## 📦 Legacy Stack (Archived)

Before switching to React + Supabase, this project started as a FastAPI + SQL Server + Python ETL pipeline — kept in `Legacy/` for portfolio/reference purposes, not actively maintained or run:

```
Legacy/
├── API/            FastAPI app (SQLAlchemy + pyodbc, SQL Server backend)
├── ETL/            Extract/transform/load pipeline targeting SQL Server
├── DB/Schemas/     Original SQL Server schema + load scripts
├── run_api.ps1
└── run_etl.ps1
```

This demonstrates the original data engineering work (API ingestion, ETL automation, SQL Server schema design, FastAPI + SQLAlchemy backend) — see `Docs/Accomplishments/` for how it's presented.

---

## 🛠️ Running the App

```bash
cd warframe-client
npm install
npm run dev
```

Requires a `.env` in `warframe-client/` with:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## 🧩 Skills Demonstrated

**Frontend:** React 19, Vite, Tailwind CSS v4, Supabase JS client, custom hooks
**Data:** Postgres/Supabase schema design (`wf_base`/`wf_user` split), SQL migrations, Python seed/migration scripting
**Legacy (archived):** FastAPI, SQLAlchemy ORM, SQL Server, ETL pipeline design

---

## 📄 License

For educational and portfolio purposes.

**Credits:** Developed by Patrick Onuoha Jr.
