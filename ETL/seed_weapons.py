import os
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

WFCD_URL = "https://api.warframestat.us/weapons"

NATIVE_INCARNONS = {
    "Felarx",
    "Innodem",
    "Laetum",
    "Phenmor",
    "Praedos",
    "Onos",
    "Ruvox",
    "Thalys",
}

INCARNON_GENESIS = [
    ("Boar Incarnon Genesis", "Primary", 2),
    ("Boltor Incarnon Genesis", "Primary", 2),
    ("Braton Incarnon Genesis", "Primary", 0),
    ("Burston Incarnon Genesis", "Primary", 0),
    ("Dera Incarnon Genesis", "Primary", 4),
    ("Dread Incarnon Genesis", "Primary", 5),
    ("Gorgon Incarnon Genesis", "Primary", 3),
    ("Latron Incarnon Genesis", "Primary", 0),
    ("Miter Incarnon Genesis", "Primary", 6),
    ("Paris Incarnon Genesis", "Primary", 3),
    ("Soma Incarnon Genesis", "Primary", 6),
    ("Strun Incarnon Genesis", "Primary", 1),
    ("Sybaris Incarnon Genesis", "Primary", 5),
    ("Torid Incarnon Genesis", "Primary", 4),

    ("Angstrum Incarnon Genesis", "Secondary", 4),
    ("Atomos Incarnon Genesis", "Secondary", 5),
    ("Bronco Incarnon Genesis", "Secondary", 0),
    ("Cestra Incarnon Genesis", "Secondary", 4),
    ("Despair Incarnon Genesis", "Secondary", 4),
    ("Dual Toxocyst Incarnon Genesis", "Secondary", 11),
    ("Furis Incarnon Genesis", "Secondary", 2),
    ("Gammacor Incarnon Genesis", "Secondary", 2),
    ("Kunai Incarnon Genesis", "Secondary", 2),
    ("Lato Incarnon Genesis", "Secondary", 0),
    ("Lex Incarnon Genesis", "Secondary", 3),
    ("Sicarus Incarnon Genesis", "Secondary", 3),
    ("Vasto Incarnon Genesis", "Secondary", 4),
    ("Zylok Incarnon Genesis", "Secondary", 6),

    ("Ack & Brunt Incarnon Genesis", "Melee", 3),
    ("Anku Incarnon Genesis", "Melee", 3),
    ("Bo Incarnon Genesis", "Melee", 4),
    ("Ceramic Dagger Incarnon Genesis", "Melee", 3),
    ("Dual Ichor Incarnon Genesis", "Melee", 6),
    ("Furax Incarnon Genesis", "Melee", 5),
    ("Hate Incarnon Genesis", "Melee", 8),
    ("Magistar Incarnon Genesis", "Melee", 1),
    ("Nami Solo Incarnon Genesis", "Melee", 6),
    ("Okina Incarnon Genesis", "Melee", 5),
    ("Sibear Incarnon Genesis", "Melee", 6),
    ("Skana Incarnon Genesis", "Melee", 0),
]


def normalize_slot(category):
    if not category:
        return "Unknown"

    category = category.lower()

    if (
        "primary" in category
        or "rifle" in category
        or "shotgun" in category
        or "bow" in category
    ):
        return "Primary"

    if (
        "secondary" in category
        or "pistol" in category
        or "kitgun" in category
    ):
        return "Secondary"

    if (
        "melee" in category
        or "nikana" in category
        or "blade" in category
        or "hammer" in category
    ):
        return "Melee"

    return "Unknown"


def upsert_weapon(payload):
    supabase.schema("wf_base").table("weapons").upsert(
        payload,
        on_conflict="name",
    ).execute()


def delete_old_fake_incarnons():
    print("Cleaning old generated Incarnon rows...")

    supabase.schema("wf_base").table("weapons").delete().or_(
        "is_incarnon.eq.true,name.ilike.% Incarnon"
    ).execute()

    print("Old Incarnon rows cleaned.")


def seed_weapons():
    print("Fetching weapon data...")

    response = requests.get(WFCD_URL)

    if response.status_code != 200:
        print("Failed to fetch weapon data.")
        return

    weapons = response.json()

    inserted = 0
    native_incarnons_marked = 0
    genesis_added = 0
    skipped = 0

    delete_old_fake_incarnons()

    for weapon in weapons:
        try:
            name = weapon.get("name")

            if not name:
                skipped += 1
                continue

            is_native_incarnon = name in NATIVE_INCARNONS

            payload = {
                "name": name,
                "category": weapon.get("category"),
                "weapon_type": weapon.get("type"),
                "mastery_rank": weapon.get("masteryReq"),
                "slot": normalize_slot(
                    weapon.get("category") or weapon.get("type")
                ),
                "tradable": weapon.get("tradable", False),
                "vaulted": weapon.get("vaulted", False),
                "is_incarnon": is_native_incarnon,
                "base_weapon_name": name if is_native_incarnon else None,
                "raw_json": {
                    **weapon,
                    "native_incarnon": is_native_incarnon,
                },
            }

            upsert_weapon(payload)

            inserted += 1

            if is_native_incarnon:
                native_incarnons_marked += 1
                print(f"Seeded Native Incarnon: {name}")
            else:
                print(f"Seeded: {name}")

        except Exception as e:
            print(f"Failed: {weapon.get('name')} -> {e}")
            skipped += 1

    print("\nAdding Incarnon Genesis records...")

    for name, slot, mr in INCARNON_GENESIS:
        try:
            payload = {
                "name": name,
                "category": "Incarnon Genesis",
                "weapon_type": "Incarnon Genesis",
                "mastery_rank": mr,
                "slot": slot,
                "tradable": False,
                "vaulted": False,
                "is_incarnon": True,
                "base_weapon_name": name.replace(" Incarnon Genesis", ""),
                "raw_json": {
                    "name": name,
                    "incarnon_variant": True,
                    "source": "Incarnon Genesis",
                    "slot": slot,
                    "mastery_rank": mr,
                },
            }

            upsert_weapon(payload)
            genesis_added += 1
            print(f"Added Incarnon Genesis: {name}")

        except Exception as e:
            print(f"Failed Incarnon Genesis: {name} -> {e}")
            skipped += 1

    print("\nDone.")
    print(f"Weapons inserted/updated: {inserted}")
    print(f"Native Incarnons marked: {native_incarnons_marked}")
    print(f"Incarnon Genesis records added: {genesis_added}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    seed_weapons()