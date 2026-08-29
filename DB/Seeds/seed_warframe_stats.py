import os
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

WFCD_URL = "https://api.warframestat.us/warframes"


def fetch_existing():
    """warframe_id + name for every row already in the catalog -- this
    script only ever UPDATEs a matched row, never inserts, so Necramechs
    and other WFCD junk (Bonewidow, Voidrig, "Orion & Sirius" -- type
    'Warframe' in WFCD's data but never part of this catalog) can't sneak
    in as new rows just because they showed up in the stats payload."""
    res = supabase.schema("wf_base").table("warframes").select("warframe_id, name").execute()
    return {r["name"]: r["warframe_id"] for r in res.data}


def seed_warframe_stats():
    print("Fetching warframe stats...")

    response = requests.get(WFCD_URL)

    if response.status_code != 200:
        print("Failed to fetch warframe stats.")
        return

    raw = response.json()
    by_name = fetch_existing()

    updated = 0
    skipped_no_stats = 0
    skipped_not_in_catalog = 0

    wfcd_by_name = {
        w["name"]: w
        for w in raw
        if w.get("type") == "Warframe" and w.get("health") is not None
    }

    for name, warframe_id in by_name.items():
        w = wfcd_by_name.get(name)

        if not w:
            print(f"No WFCD stats found for catalog row: {name}")
            skipped_no_stats += 1
            continue

        payload = {
            "health": w.get("health"),
            "shield": w.get("shield"),
            "armor": w.get("armor"),
            "energy": w.get("power"),
            "sprint_speed": w.get("sprintSpeed"),
            "raw_json": w,
        }

        supabase.schema("wf_base").table("warframes").update(payload).eq(
            "warframe_id", warframe_id
        ).execute()

        updated += 1
        print(f"Updated: {name}")

    for name in wfcd_by_name:
        if name not in by_name:
            skipped_not_in_catalog += 1

    print("\nDone.")
    print(f"Updated: {updated}")
    print(f"Catalog rows with no WFCD stats match: {skipped_no_stats}")
    print(f"WFCD Warframe-type entries not in catalog (expected -- Necramechs etc.): {skipped_not_in_catalog}")


if __name__ == "__main__":
    seed_warframe_stats()
