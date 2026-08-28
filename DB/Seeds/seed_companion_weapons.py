import os
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SENTINEL_WEAPONS_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/SentinelWeapons.json"

# Unlike Sentinel Weapons, a beast's Claws has no WFCD catalog file --
# checked the repo's full data/json listing, no Claws.json or equivalent
# exists. In-game, Claws is a single innate weapon per breed family, not
# a pick-list of separately owned items, so there's nothing to import.
# Hand-authored here instead, grounded in the real Companion Mod compat
# names pulled from api.warframestat.us/mods: Kubrow, Kavat, and
# Helminth Charger each have their own exclusive Claws mod pool
# ("Kubrow Claws" / "Kavat Claws" / "Helminth Claws" compatName).
# Predasite and Vulpaphyla don't have a breed-exclusive pool yet --
# their Claws mods currently fall under the universal "Claws" compatName
# -- but they still get their own catalog row here since Predasite Claws
# and Vulpaphyla Claws are the real weapon identity in-game either way.
HAND_AUTHORED_CLAWS = [
    {"name": "Kubrow Claws", "companion_class": "kubrow"},
    {"name": "Kavat Claws", "companion_class": "kavat"},
    {"name": "Predasite Claws", "companion_class": "predasite"},
    {"name": "Vulpaphyla Claws", "companion_class": "vulpaphyla"},
    {"name": "Helminth Claws", "companion_class": "helminth_charger"},
]


def upsert_companion_weapon(payload):
    supabase.schema("wf_base").table("companion_weapons").upsert(
        payload,
        on_conflict="name",
    ).execute()


def seed_sentinel_weapons():
    print("Fetching SentinelWeapons.json...")
    weapons = requests.get(SENTINEL_WEAPONS_URL).json()

    inserted = 0
    for w in weapons:
        name = w.get("name")
        if not name:
            continue

        upsert_companion_weapon({
            "name": name,
            "weapon_class": "sentinel_weapon",
            "raw_json": w,
        })
        inserted += 1
        print(f"Seeded Sentinel Weapon: {name}")

    print(f"Sentinel Weapons seeded: {inserted} (expected 24)")
    return inserted


def seed_claws():
    print("\nSeeding hand-authored Claws...")

    inserted = 0
    for c in HAND_AUTHORED_CLAWS:
        upsert_companion_weapon({
            "name": c["name"],
            "weapon_class": "claws",
            "raw_json": {
                "hand_authored": True,
                "companion_class": c["companion_class"],
                "reason": "No WFCD catalog source for beast Claws; every beast in this family shares one innate weapon.",
            },
        })
        inserted += 1
        print(f"Seeded Claws: {c['name']}")

    print(f"Claws seeded: {inserted} (expected 5)")
    return inserted


def seed_companion_weapons():
    sentinel_weapon_count = seed_sentinel_weapons()
    claws_count = seed_claws()

    print("\nDone.")
    print(f"Total companion weapons seeded: {sentinel_weapon_count + claws_count}")


if __name__ == "__main__":
    seed_companion_weapons()
