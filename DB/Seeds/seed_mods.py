import os
import requests
from collections import defaultdict
from urllib.parse import unquote
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
    # Found 2026-08-26 during a Secondary/Primary mod audit: these three
    # share a display name with a real, current rifle mod ("Bane of
    # Corpus/Grineer/Infested", fusionLimit 5) but differ only by
    # capitalizing "Of", which the by-exact-name dedup in build_targets()
    # doesn't catch. Confirmed never-shipped -- no "introduced" release
    # info (unlike the real lowercase-"of" version, which has one), and
    # the wiki/Overframe only document a base tier (fusionLimit 5) and a
    # Primed tier (fusionLimit 10, Legendary) -- no non-Primed 10-rank
    # "Expert" tier exists in the live game.
    "/Lotus/Upgrades/Mods/Rifle/Expert/WeaponFactionDamageCorpusExpert",  # "Bane Of Corpus" -- never released
    "/Lotus/Upgrades/Mods/Rifle/Expert/WeaponFactionDamageGrineerExpert",  # "Bane Of Grineer" -- never released
    "/Lotus/Upgrades/Mods/Rifle/Expert/WeaponFactionDamageInfestedExpert",  # "Bane Of Infested" -- never released
    "/Lotus/Powersuits/Banshee/SonarPvPAugmentCard",  # "Augmented Sonar" -- unused Conclave mod, confirmed not obtainable by Patrick 2026-08-26
    # Found the same day via the same "no introduced, no drops" heuristic --
    # neither has a wiki page under this exact title NOR any hit in the
    # wiki's own full-text search (42 and 178 results respectively, no
    # exact match in either), no trade/drop-tracker presence anywhere.
    # Same never-shipped Conclave-mod-data pattern as Augmented Sonar.
    "/Lotus/Upgrades/Mods/PvPMods/Melee/GroundingMeleeMod",  # "Harrowed Hook" -- never released
    "/Lotus/Upgrades/Mods/PvPMods/Melee/AirborneMeleeAutoTargetBonus",  # "Air Martial" -- never released
}

# Real bug found 2026-08-26: WFCD only sets "isExilus" on Warframe Mods.
# Weapon Mods (Primary/Secondary/Melee) use a different field, "isUtility",
# for the exact same concept -- reading only "isExilus" left every weapon
# Exilus mod (Reflex Draw, Steady Hands, Trick Mag, Pistol Ammo Mutation,
# the Canticle Tome mods, etc.) stored as is_exilus=false. Confirmed by
# cross-checking wiki.warframe.com's Exilus Mods category against every
# weapon-category mod in the DB: zero had is_exilus=true out of 670 rows.
#
# The four "Invocation" Tome mods (Ris/Vome/Netra/Xata) are a further
# WFCD data gap on top of that: they're genuine Exilus mods in-game (per
# wiki.warframe.com) but WFCD's own raw data sets neither isExilus nor
# isUtility for them, so no field-name fix catches them -- keyed by
# uniqueName, same pattern as EXCLUDED_UNIQUE_NAMES above.
EXILUS_OVERRIDE_UNIQUE_NAMES = {
    "/Lotus/Upgrades/Grimoire/RisStrikeMod",  # Ris Invocation
    "/Lotus/Upgrades/Grimoire/VomeStrikeMod",  # Vome Invocation
    "/Lotus/Upgrades/Grimoire/NetraStrikeMod",  # Netra Invocation
    "/Lotus/Upgrades/Grimoire/XataStrikeMod",  # Xata Invocation
}

# Real bug found 2026-08-27: WFCD's own fusionLimit is wrong for at least
# this one mod. Confirmed against wiki.warframe.com/w/Stabilizer (real max
# rank 3, "15% per rank for a maximum of 60% at Rank 3") and against
# Patrick's real Stabilizer (unranked cost 6, maxed at 9 after exactly 3
# endo infusions -- matches base_drain=6 + 3 ranks, not WFCD's stored
# fusionLimit=5). This surfaced because it silently broke live capacity
# math: a maxed real Stabilizer (rank 3, cost 9, halved to 5 on a matching
# Exilus polarity) was being computed as rank 5/cost 11-discounted-to-6
# instead, a 1-point-of-capacity error on every build using it.
MAX_RANK_OVERRIDES = {
    "/Lotus/Upgrades/Mods/Rifle/Intermediate/WeaponRecoilReductionModIntermediate": 3,  # Stabilizer -- WFCD says fusionLimit 5, real is 3
}


def wiki_title(mod):
    url = mod.get("wikiaUrl")
    if not url:
        return None
    segment = url.rstrip("/").split("/")[-1]
    return unquote(segment).replace("_", " ")


def build_targets(raw_mods):
    """
    Real bug found 2026-08-26: WFCD sometimes lists the exact same real
    mod more than once under different internal item codes (uniqueName)
    -- almost always an old pre-rework version alongside the current one
    (e.g. Ammo Drum at fusionLimit 5 AND fusionLimit 10), both sharing
    the same display name AND the same wiki page. It also sometimes
    reuses one display name for two genuinely different, separately-
    obtainable mods -- "Equilibrium" covers both the real mod (fusion
    limit 10, up to +110%) and the early-game "Flawed Equilibrium"
    (fusion limit 3, up to +32%), which the wiki correctly treats as
    separate pages even though WFCD's `name` field doesn't.

    Naive upsert-by-name (the original approach) silently let whichever
    entry got processed last in the API response overwrite the other,
    which is how Patrick ended up with Equilibrium permanently capped at
    rank 3 with the wrong description.

    Disambiguate by wiki page: entries that share both name AND wiki
    page are the same real mod -- keep only the current (highest
    fusionLimit) one. Entries that share name but NOT wiki page are
    genuinely different mods -- keep all of them, renamed from their own
    wiki page title so they stop colliding.

    Returns a list of (original_name, display_name, mod_dict).
    """
    scoped = [
        m for m in raw_mods
        if m.get("type") in TYPE_TO_CATEGORY
        and m.get("name")
        and m.get("uniqueName") not in EXCLUDED_UNIQUE_NAMES
    ]

    by_name = defaultdict(list)
    for m in scoped:
        by_name[m["name"]].append(m)

    targets = []

    for name, entries in by_name.items():
        if len(entries) == 1:
            targets.append((name, name, entries[0]))
            continue

        by_wiki = defaultdict(list)
        for e in entries:
            by_wiki[wiki_title(e) or name].append(e)

        # Only rename when the split is real (more than one distinct
        # wiki page in this group) -- a group that collapses to a single
        # wiki page keeps the original WFCD name untouched.
        genuinely_split = len(by_wiki) > 1

        for wiki_name, group in by_wiki.items():
            winner = max(group, key=lambda m: (m.get("fusionLimit") or 0))
            display_name = wiki_name if genuinely_split else name
            targets.append((name, display_name, winner))

    return targets


def fetch_existing():
    """mod_id, name, and uniqueName (from raw_json) for every row already
    seeded, paginated past PostgREST's 1000-row default cap."""
    existing = []
    offset = 0

    while True:
        res = (
            supabase.schema("wf_base")
            .table("mods")
            .select("mod_id, name, raw_json")
            .range(offset, offset + 999)
            .execute()
        )
        rows = res.data or []
        existing.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000

    return existing


def seed_mods():
    print("Fetching mod data...")

    response = requests.get(WFCD_URL)

    if response.status_code != 200:
        print("Failed to fetch mod data.")
        return

    raw_mods = response.json()
    targets = build_targets(raw_mods)

    existing_rows = fetch_existing()
    existing_by_name = {r["name"]: r for r in existing_rows}
    existing_by_unique_name = {}
    for r in existing_rows:
        uid = (r.get("raw_json") or {}).get("uniqueName")
        if uid:
            existing_by_unique_name[uid] = r

    # Group targets back by their original collision name so, for a
    # genuine multi-mod split, we know which target should reuse the
    # pre-existing row (matched by uniqueName) vs which are brand new.
    by_original_name = defaultdict(list)
    for original_name, display_name, mod in targets:
        by_original_name[original_name].append((display_name, mod))

    updated = 0
    inserted = 0
    skipped = 0

    for original_name, group in by_original_name.items():
        # Match each target to its OWN pre-existing row by uniqueName --
        # not just a single shared row looked up by the pre-split WFCD
        # name. A genuinely-split collision group (e.g. WFCD name "Ammo
        # Drum" splitting into DB rows "Ammo Drum" and "Flawed Ammo
        # Drum") has one existing row per member, each stored under its
        # own display name -- keying only by original_name could only
        # ever find one of them, leaving every other member to be
        # re-inserted (and fail on the unique constraint) on every run.
        reuse = {}
        for i, (_, mod) in enumerate(group):
            existing_row = existing_by_unique_name.get(mod.get("uniqueName"))
            if existing_row:
                reuse[i] = existing_row

        # Fallback for a tier WFCD has since dropped entirely (seen live:
        # Vitality/Redirection/Steel Fiber had a 3rd "Intermediate" tier
        # in old seeded data that's gone from the current API): if no
        # target matched any existing row above, but a row still sits in
        # the DB under the original collision name, fold it onto the
        # highest-fusionLimit target (the regular, non-"Flawed" mod)
        # instead of leaving it stranded, since that's what a player
        # almost always means, rather than an arbitrary pick.
        if not reuse:
            orphan = existing_by_name.get(original_name)
            if orphan:
                winner_index = max(range(len(group)), key=lambda i: group[i][1].get("fusionLimit") or 0)
                reuse[winner_index] = orphan

        for i, (display_name, mod) in enumerate(group):
            existing_row = reuse.get(i)
            try:
                category = TYPE_TO_CATEGORY.get(mod.get("type"))
                if category is None:
                    skipped += 1
                    continue

                payload = {
                    "name": display_name,
                    "category": category,
                    "polarity": mod.get("polarity"),
                    "base_drain": mod.get("baseDrain"),
                    "max_rank": MAX_RANK_OVERRIDES.get(mod.get("uniqueName"), mod.get("fusionLimit")),
                    "rarity": mod.get("rarity"),
                    "is_aura": mod.get("compatName") == "AURA",
                    "is_stance": mod.get("type") == "Stance Mod",
                    "is_exilus": bool(mod.get("isExilus"))
                    or bool(mod.get("isUtility"))
                    or mod.get("uniqueName") in EXILUS_OVERRIDE_UNIQUE_NAMES,
                    "is_conclave": "/PvPMods/" in (mod.get("uniqueName") or ""),
                    "raw_json": mod,
                }

                if existing_row:
                    supabase.schema("wf_base").table("mods").update(payload).eq(
                        "mod_id", existing_row["mod_id"]
                    ).execute()
                    print(f"Updated: {display_name} [{category}]")
                    updated += 1
                else:
                    supabase.schema("wf_base").table("mods").insert(payload).execute()
                    print(f"Inserted: {display_name} [{category}]")
                    inserted += 1

            except Exception as e:
                print(f"Failed: {display_name} -> {e}")
                skipped += 1

    print("\nDone.")
    print(f"Updated (existing rows corrected): {updated}")
    print(f"Inserted (newly recognized distinct mods): {inserted}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    seed_mods()
