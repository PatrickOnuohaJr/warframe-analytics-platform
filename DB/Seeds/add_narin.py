"""One-off: add Narin (Update 44, released 2026-09-23) to the catalog.

WFCD / warframestat.us had no Narin entry yet, so values come from the
Warframe Wiki (Narin page). Stats follow the catalog convention of Rank 0
base values (Excalibur is stored as health 270 / energy 100). Idempotent:
re-running upserts on name / (warframe_id, ability_slot).
"""
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SECRET_KEY"))

ABILITIES = ["Neote", "Naraemagi", "Hakchum", "Nurinarim"]

row = {
    "name": "Narin",
    "is_prime": False,
    "health": 270,
    "shield": 550,
    "armor": 165,
    "energy": 200,
    "sprint_speed": 1.1,
    "raw_json": {
        "name": "Narin", "type": "Warframe", "health": 270, "shield": 550,
        "armor": 165, "power": 200, "sprintSpeed": 1.1, "isPrime": False,
        "aura": "naramon", "releaseDate": "2026-09-23",
        "wikiaUrl": "https://wiki.warframe.com/w/Narin",
        "passiveDescription": "Each stack of Cold Status Effect on enemies increase chance to spawn Sangodae pickup by 1%, granting Extra Cold Damage on Primary and Secondary weapons for 10s. Narin also gains Cold Damage for her abilities.",
        "abilities": [{"name": n} for n in ABILITIES],
        "source": "wiki.warframe.com (manual; not yet in WFCD)",
    },
}
wf = sb.schema("wf_base").table("warframes").upsert(row, on_conflict="name").execute()
wid = wf.data[0]["warframe_id"]
print("warframe_id", wid)

existing = {r["ability_slot"] for r in sb.schema("wf_base").table("warframe_abilities")
            .select("ability_slot").eq("warframe_id", wid).execute().data}
for slot, name in enumerate(ABILITIES, start=1):
    if slot in existing:
        continue
    sb.schema("wf_base").table("warframe_abilities").insert(
        {"warframe_id": wid, "ability_slot": slot, "ability_name": name, "is_signature": False}
    ).execute()
    print("added", slot, name)
