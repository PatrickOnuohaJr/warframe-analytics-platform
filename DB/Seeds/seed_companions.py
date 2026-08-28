import os
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Pulled directly from WFCD's warframe-items GitHub source (not the
# warframestat.us API -- it has no dedicated companion endpoint), same
# source the D.1 Armory scope confirmed for weapons.
SENTINELS_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Sentinels.json"
PETS_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Pets.json"


def normalize_beast_class(name):
    if "Kavat" in name:
        return "kavat"
    if "Predasite" in name:
        return "predasite"
    if "Vulpaphyla" in name:
        return "vulpaphyla"
    if name == "Helminth Charger":
        return "helminth_charger"
    if "Kubrow" in name:
        return "kubrow"
    return "unknown"


def upsert_companion(payload):
    supabase.schema("wf_base").table("companions").upsert(
        payload,
        on_conflict="name",
    ).execute()


def seed_sentinels():
    print("Fetching Sentinels.json...")
    sentinels = requests.get(SENTINELS_URL).json()

    inserted = 0
    for s in sentinels:
        name = s.get("name")
        if not name:
            continue

        upsert_companion({
            "name": name,
            "companion_class": "sentinel",
            "raw_json": s,
        })
        inserted += 1
        print(f"Seeded Sentinel: {name}")

    print(f"Sentinels seeded: {inserted} (expected 17)")
    return inserted


def seed_beasts():
    print("\nFetching Pets.json...")
    pets = requests.get(PETS_URL).json()

    # Pets.json (66 raw rows) mixes real ownable breeds with DNA-stabilizer
    # crafting components (Cores/Brackets/Gyros/Mutagens/Antigens/
    # Stabilizers) and Khora's exalted Venari/Venari Prime (not
    # independently ownable). All of those are stored under
    # productCategory "Pistols" or "SpecialItems" in WFCD's data -- only
    # the real breeds carry productCategory "KubrowPets". That single
    # field is a cleaner filter than matching against name/type text and
    # naturally excludes both junk categories in one pass.
    #
    # This filter also drops Moa and Hound companions (Lambeo Moa, Nychus
    # Moa, Oloro Moa, Para Moa, Bhaira/Dorma/Hec Hound) -- WFCD tags them
    # productCategory "Pistols" too, same mistag as the crafting
    # components. They're real ownable robotic companions, but the D.1-
    # style scope handed off at the end of Session 013 only researched
    # Kubrow/Kavat/Predasite/Vulpaphyla/Helminth Charger as "beasts" in
    # scope -- flagging this rather than silently expanding scope.
    real_breeds = [
        p for p in pets
        if p.get("type") == "Pets" and p.get("productCategory") == "KubrowPets"
    ]

    inserted = 0
    for p in real_breeds:
        name = p.get("name")
        if not name:
            continue

        upsert_companion({
            "name": name,
            "companion_class": normalize_beast_class(name),
            "raw_json": p,
        })
        inserted += 1
        print(f"Seeded beast: {name} [{normalize_beast_class(name)}]")

    print(f"Beasts seeded: {inserted} (expected 15)")
    return inserted


def seed_companions():
    sentinel_count = seed_sentinels()
    beast_count = seed_beasts()

    print("\nDone.")
    print(f"Total companions seeded: {sentinel_count + beast_count}")


if __name__ == "__main__":
    seed_companions()
