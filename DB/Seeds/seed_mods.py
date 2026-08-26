import os
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

WFCD_URL = "https://api.warframestat.us/mods"

# Scope matches every other boundary in this app: Warframe + the 3 weapon
# slots only. Shotgun Mod folds into Primary (same as weapon slot
# normalization in seed_weapons.py); Stance Mod folds into Melee (it's a
# melee-exclusive slot). Everything else (Companion, Focus, Plexus,
# Arch-Gun/Melee, Necramech, K-Drive, Railjack, Archwing, Parazon, etc.)
# is out of scope and skipped.
TYPE_TO_CATEGORY = {
    "Warframe Mod": "Warframe",
    "Primary Mod": "Primary",
    "Shotgun Mod": "Primary",
    "Secondary Mod": "Secondary",
    "Melee Mod": "Melee",
    "Stance Mod": "Melee",
}

# WFCD's dataset includes mods DE coded but never actually shipped
# (confirmed by these having no "introduced" release info and zero drop
# sources, unlike every real mod) plus faction-damage mods DE discontinued
# and replaced with a newer tier (Bane 2016 -> Expel 2018 -> Cleanse 2020,
# only Cleanse is currently obtainable). Confirmed against Patrick's live
# in-game codex on 2026-08-26 -- keyed by uniqueName since that's stable
# even if WFCD ever renames the display name.
EXCLUDED_UNIQUE_NAMES = {
    "/Lotus/Upgrades/Mods/Warframe/Expert/AvatarAbilityEfficiencyModExpert",  # Primed Streamline -- never released
    "/Lotus/Upgrades/Mods/Warframe/Expert/AvatarShieldRechargeRateModExpert",  # Primed Fast Deflection -- never released
    "/Lotus/Upgrades/Mods/Shotgun/Expert/WeaponCritChanceModExpert",  # Primed Blunderbuss -- never released
    "/Lotus/Upgrades/Mods/Rifle/Expert/SniperReloadDamageModExpert",  # Primed Charged Chamber -- never released
    "/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageCorpus",  # Primed Bane Of Corpus -- discontinued, see Primed Cleanse Corpus
    "/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageGrineer",  # Primed Bane Of Grineer -- discontinued, see Primed Cleanse Grineer
    "/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageInfested",  # Primed Bane Of Infested -- discontinued, see Primed Cleanse Infested
    "/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageCorrupted",  # Primed Bane Of Orokin -- discontinued, see Primed Cleanse Orokin
    "/Lotus/Upgrades/Mods/Rifle/Expert/PrimedWeaponFactionDamageMurmurs",  # Primed Bane Of The Murmur -- discontinued, see Primed Cleanse The Murmur
    "/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageCorpusExpert",  # Primed Expel Corpus -- discontinued, see Primed Cleanse Corpus
    "/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageGrineerExpert",  # Primed Expel Grineer -- discontinued, see Primed Cleanse Grineer
    "/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageInfestedExpert",  # Primed Expel Infested -- discontinued, see Primed Cleanse Infested
    "/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageCorruptedExpert",  # Primed Expel Orokin -- discontinued, see Primed Cleanse Orokin
    "/Lotus/Upgrades/Mods/Pistol/Expert/WeaponPistolFactionDamageMurmursExpert",  # Primed Expel The Murmur -- discontinued, see Primed Cleanse The Murmur
}


def upsert_mod(payload):
    supabase.schema("wf_base").table("mods").upsert(
        payload,
        on_conflict="name",
    ).execute()


def seed_mods():
    print("Fetching mod data...")

    response = requests.get(WFCD_URL)

    if response.status_code != 200:
        print("Failed to fetch mod data.")
        return

    mods = response.json()

    seeded = 0
    skipped = 0
    out_of_scope = 0
    excluded = 0

    for mod in mods:
        try:
            name = mod.get("name")
            mod_type = mod.get("type")

            if not name:
                skipped += 1
                continue

            if mod.get("uniqueName") in EXCLUDED_UNIQUE_NAMES:
                excluded += 1
                continue

            category = TYPE_TO_CATEGORY.get(mod_type)

            if category is None:
                out_of_scope += 1
                continue

            payload = {
                "name": name,
                "category": category,
                "polarity": mod.get("polarity"),
                "base_drain": mod.get("baseDrain"),
                "max_rank": mod.get("fusionLimit"),
                "rarity": mod.get("rarity"),
                "is_aura": mod.get("compatName") == "AURA",
                "is_exilus": bool(mod.get("isExilus")),
                "raw_json": mod,
            }

            upsert_mod(payload)

            print(f"Seeded: {name} [{category}]")
            seeded += 1

        except Exception as e:
            print(f"Failed: {mod.get('name')} -> {e}")
            skipped += 1

    print("\nDone.")
    print(f"Seeded/updated: {seeded}")
    print(f"Out of scope (skipped): {out_of_scope}")
    print(f"Excluded (never released / discontinued): {excluded}")
    print(f"Failed: {skipped}")


if __name__ == "__main__":
    seed_mods()
