import os
import re
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SEED_FILE = Path("arcane_seed.sql")


def sql_unquote(value):
    value = value.strip()

    if value.upper() == "NULL":
        return None

    if value.startswith("N'") and value.endswith("'"):
        value = value[2:-1]
    elif value.startswith("'") and value.endswith("'"):
        value = value[1:-1]

    return value.replace("''", "'")


def split_sql_tuple(row):
    values = []
    current = ""
    in_string = False
    i = 0

    while i < len(row):
        char = row[i]

        if char == "'":
            if i + 1 < len(row) and row[i + 1] == "'":
                current += "''"
                i += 2
                continue
            in_string = not in_string

        if char == "," and not in_string:
            values.append(current.strip())
            current = ""
        else:
            current += char

        i += 1

    if current.strip():
        values.append(current.strip())

    return [sql_unquote(v) for v in values]


def extract_rows(sql_text):
    rows = []

    for line in sql_text.splitlines():
        line = line.strip()

        if not line.startswith("("):
            continue

        if not line.endswith(",") and not line.endswith(";"):
            continue

        # Skip section/header rows like:
        # (Plains of Eidolon — Teralyst / Gantulyst / Hydrolyst)
        if line.count(",") < 4:
            continue

        line = line.rstrip(",;").strip()

        if line.startswith("(") and line.endswith(")"):
            line = line[1:-1]

        values = split_sql_tuple(line)

        if len(values) < 6:
            continue

        rows.append(values)

    return rows


def slugify(name):
    return (
        name.lower()
        .replace("&", "and")
        .replace("'", "")
        .replace(".", "")
        .replace(",", "")
        .replace("-", "_")
        .replace(" ", "_")
    )


def normalize_payload(values):
    # Supports both 6-column and 10-column Claude seed rows.
    # Expected common fields:
    # name/category/subcategory/rarity/max_rank/trigger/effect/source/wfm_slug/update

    name = values[0]
    category = values[1] if len(values) > 1 else None
    subcategory = values[2] if len(values) > 2 else None
    rarity = values[3] if len(values) > 3 else None

    max_rank = None
    trigger = None
    effect_r5 = None
    source = None
    wfm_slug = None
    added_update = None

    if len(values) >= 10:
        max_rank = values[4]
        trigger = values[5]
        effect_r5 = values[6]
        source = values[7]
        wfm_slug = values[8]
        added_update = values[9]
    elif len(values) >= 6:
        max_rank = values[4]
        source = values[5]
        wfm_slug = slugify(name)

    try:
        max_rank = int(max_rank) if max_rank is not None else 5
    except ValueError:
        max_rank = 5

    if not wfm_slug:
        wfm_slug = slugify(name)

    return {
        "name": name,
        "arcane_type": category,
        "subcategory": subcategory,
        "rarity": rarity,
        "max_rank": max_rank,
        "trigger": trigger,
        "effect_r5": effect_r5,
        "source": source,
        "wfm_slug": wfm_slug,
        "is_tradeable": True,
        "added_update": added_update,
        "tradable": True,
        "raw_json": {
            "name": name,
            "category": category,
            "subcategory": subcategory,
            "rarity": rarity,
            "max_rank": max_rank,
            "trigger": trigger,
            "effect_r5": effect_r5,
            "source": source,
            "wfm_slug": wfm_slug,
            "added_update": added_update,
            "seed_source": "arcane_seed.sql",
        },
    }

MODERN_ADDENDUM = [
    {
        "name": "Melee Influence",
        "arcane_type": "Melee",
        "subcategory": "Melee Arcane",
        "rarity": "Legendary",
        "max_rank": 5,
        "trigger": "Electric Status",
        "effect_r5": "Spread status effects to nearby enemies",
        "source": "Whispers in the Walls",
        "wfm_slug": "melee_influence",
        "is_tradeable": True,
        "added_update": "Whispers in the Walls",
        "tradable": True,
        "raw_json": {
            "seed_source": "manual_addendum"
        },
    }
]
def seed_arcanes():
    if not SEED_FILE.exists():
        print(f"Missing seed file: {SEED_FILE}")
        return

    sql_text = SEED_FILE.read_text(encoding="utf-8")
    rows = extract_rows(sql_text)

    seeded = 0
    skipped = 0

    print(f"Extracted {len(rows)} candidate rows.")

    for values in rows:
        try:
            name = values[0]

            if not name or "—" in name:
                skipped += 1
                continue

            payload = normalize_payload(values)

            supabase.schema("wf_base").table("arcanes").upsert(
                payload,
                on_conflict="name",
            ).execute()

            print(f"Seeded: {payload['name']} [{payload['arcane_type']}]")
            seeded += 1

        except Exception as e:
            print(f"Failed row: {values[:3]}...")
            print(f"Reason: {e}")
            skipped += 1
    for payload in MODERN_ADDENDUM:
        try:
            supabase.schema("wf_base").table("arcanes").upsert(
                payload,
                on_conflict="name",
            ).execute()

            print(f"Added modern arcane: {payload['name']}")
            seeded += 1

        except Exception as e:
            print(f"Failed modern addendum: {payload['name']} -> {e}")

    print("\nDone.")
    print(f"Seeded/updated: {seeded}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    seed_arcanes()