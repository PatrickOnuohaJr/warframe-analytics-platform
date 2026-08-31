"""Canonical ability data ingestion -- prerequisite/foundation detour for
D.7, not part of it. See DB/Migrations/20260831_add_ability_parameters.sql
for the schema rationale.

Two sources, DE Public Export as highest authority for what it provides,
the Warframe Wiki's raw per-ability wikitext as secondary source for
everything DE doesn't expose:

  - DE's own Public Export (mirrored automatically by
    calamity-inc/warframe-public-export-plus on GitHub -- the same data
    Overframe/Warframe Market build on, higher authority than WFCD, which
    this project uses for everything else but which strips ability
    numbers out entirely when it re-packages the same underlying data).
    Confirmed real field: energyRequiredToActivate. Confirmed this is the
    ONLY numeric ability field Public Export has -- no Duration/Range/
    Strength anywhere in it. Ability names in this export are unresolved
    localization keys (e.g. "/Lotus/Language/Suits/GrendelConsumeAbilityName"),
    so dict.en.json is fetched alongside it to resolve them to plain
    English names ("Nourish") for matching against wf_base.warframe_abilities.
  - The Warframe Wiki, fetched as RAW WIKITEXT (?action=raw, plain HTTP
    GET, no auth) -- never scraped rendered HTML. Confirmed each ability
    page is a named-parameter template (energy=/strength=/range=/duration=/
    misc=), not free prose, fetchable via a stable per-page URL.

Only the maxed (Ability Rank 3) scalar is stored per parameter -- confirmed
via the wiki's own Mastery/Abilities documentation that ability rank
auto-maxes as a Warframe levels to 30 via affinity, and this app already
assumes every tracked build is fully leveled. A '/'-separated progression's
LAST value is always the one taken.

Pilot scope (see ABILITY_SCOPE below): Frost's 4 abilities + Nourish
(Grendel's ability, Frost's current Helminth subsume) -- Freeze/Ice
Wave/Avalanche as the generic-linear-scaling cases, Snow Globe as the
compound-formula irregular case, Nourish as the subsumed-context-differs
irregular case. Expand ABILITY_SCOPE to the full catalog only after the
Frost pilot's architecture is verified end-to-end in the app.
"""

import os
import re
import requests
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DE_EXPORT_URL = "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/senpai/ExportWarframes.json"
DE_DICT_URL = "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/senpai/dict.en.json"
WIKI_RAW_URL_TEMPLATE = "https://wiki.warframe.com/index.php?title={title}&action=raw"

# Pilot scope, per Patrick's explicit direction: prove the architecture on
# Frost before expanding to the full ~468-row warframe_abilities catalog.
# wiki_title is the exact page title used for the raw-wikitext fetch --
# kept explicit rather than derived from the ability name, since a couple
# of real ability pages don't match their display name 1:1 (disambiguation
# pages etc.) elsewhere in the catalog, even though these 5 happen to.
ABILITY_SCOPE = [
    {"ability_name": "Freeze", "wiki_title": "Freeze", "de_frame_key": "/Lotus/Powersuits/Frost/FrostPrime"},
    {"ability_name": "Ice Wave", "wiki_title": "Ice_Wave", "de_frame_key": "/Lotus/Powersuits/Frost/FrostPrime"},
    {"ability_name": "Snow Globe", "wiki_title": "Snow_Globe", "de_frame_key": "/Lotus/Powersuits/Frost/FrostPrime"},
    {"ability_name": "Avalanche", "wiki_title": "Avalanche", "de_frame_key": "/Lotus/Powersuits/Frost/FrostPrime"},
    {"ability_name": "Nourish", "wiki_title": "Nourish", "de_frame_key": "/Lotus/Powersuits/Devourer/GrendelPrime"},
]

# Formula-key overrides, keyed by (ability_name, parameter_key) -- matches
# the exact parameter_key auto_slugify() below produces from the real wiki
# label text (verified by hand against each ability's actual raw wikitext,
# never guessed). A row with a formula_key here gets NO base_value written
# for that field at all when the formula itself doesn't need one (Nourish's
# subsumed energy multiplier is computed entirely from build stats, not
# from a stored base_value) -- see utils/abilityFormulas.js for the actual
# math and its citation.
FORMULA_OVERRIDES = {
    ("Snow Globe", "base_health"): "snow_globe_health",
    # armor_multiplier is a formula-input constant (the "5x" the compound
    # formula multiplies Frost's Armor by) -- it lives under the wiki's
    # strength= field alongside base_health, but it does not itself scale
    # with Ability Strength independently. Verified live 2026-08-31: without
    # this override it was being generically scaled (5 * 2.58 = 12.9) and
    # displayed as if that were a real stat, while the base_health formula
    # correctly used the raw 5 all along -- this only fixes the display,
    # not the math snow_globe_health itself already had right.
    ("Snow Globe", "armor_multiplier"): "raw_passthrough",
}

# Context-specific overrides for Helminth-subsumed casting, keyed by
# (ability_name, parameter_key). Verified 2026-08-31 against Nourish's own
# "| helminth =" wiki prose (not auto-parsed -- that section is free text,
# read by hand): subsumed cast provides no healing at all, applies 1 Viral
# stack instead of 10, and uses a different energy-multiplier formula
# entirely (see FORMULA_OVERRIDES/abilityFormulas.js) rather than a smaller
# version of the home-cast linear table.
SUBSUMED_VARIANT_OVERRIDES = {
    ("Nourish", "self_heal_on_cast"): {"base_value": None, "note": "Subsumed Nourish does not provide healing at all."},
    ("Nourish", "viral_status_stacks"): {"base_value": 1, "note": "10 base stacks at home, reduced to 1 when subsumed."},
    ("Nourish", "energy_multiplier"): {"formula_key": "nourish_subsumed_energy_multiplier", "base_value": None},
}


def auto_slugify(label):
    """snake_case machine key from a cleaned wiki label -- 'self heal on
    cast' -> 'self_heal_on_cast'. Deliberately literal, no synonym
    guessing, so it's predictable enough to hand-write matching
    FORMULA_OVERRIDES/SUBSUMED_VARIANT_OVERRIDES keys against."""
    key = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    return key


def clean_label(text):
    """Strips WFCD/wiki template markup (e.g. '{{D|Viral}}' -> 'Viral')
    and collapses whitespace, for display labels only -- never used for
    numeric extraction."""
    text = re.sub(r"\{\{[^|}]*\|([^}]*)\}\}", r"\1", text)
    text = re.sub(r"\{\{[^}]*\}\}", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_value_and_unit(segment):
    """Extracts a leading numeric value plus an optional unit suffix
    (%, x, m, s) from the LAST slash-separated rank in a stat segment,
    e.g. '350' -> (350.0, 'flat'), '2 x' -> (2.0, 'multiplier'),
    '10 s' -> (10.0, 'seconds'), '+75%' -> (75.0, 'percent')."""
    # Strip thousand-separator commas before matching -- confirmed real:
    # Snow Globe's health_cap is written "1,000,000 (health cap)".
    segment = segment.replace(",", "")
    match = re.match(r"\s*[+-]?(\d+\.?\d*)\s*(%|x|m|s)?", segment, re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    suffix = (match.group(2) or "").lower()
    unit = {"%": "percent", "x": "multiplier", "m": "meters", "s": "seconds"}.get(suffix, "flat")
    return value, unit


def parse_stat_fragment(text):
    """Parses one '(label)'-terminated stat fragment, e.g.
    '150 / 225 / 275 / 350 (Cold main damage)' -> (350.0, 'Cold main
    damage', 'flat'). Takes the LAST value in a '/'-separated progression
    (Ability Rank 3, per this app's 'every build is maxed' convention).
    Deliberately dumb/literal -- does not attempt to detect compound
    formulas from prose. Returns None (never a guess) if the fragment
    doesn't match this shape at all."""
    text = text.strip()
    match = re.match(r"^(?P<value_blob>.*?)\((?P<label>[^)]+)\)\s*$", text)
    if not match:
        return None

    value_blob = match.group("value_blob").strip()
    label = clean_label(match.group("label"))
    segments = [s.strip() for s in value_blob.split("/")]
    last_segment = segments[-1] if segments else value_blob

    parsed = parse_value_and_unit(last_segment)
    if not parsed:
        return None

    value, unit = parsed
    return value, label, unit


def parse_field_fragments(raw_field_value):
    """Splits a raw template field value (e.g. strength=) on <br>/<br/>
    into its individual stat fragments and parses each one. Fragments
    that don't parse are returned with value=None, never dropped silently
    -- an unparseable fragment still needs to surface as 'unknown', not
    disappear."""
    if not raw_field_value:
        return []

    pieces = re.split(r"<br\s*/?>", raw_field_value)
    results = []
    for piece in pieces:
        piece = piece.strip()
        if not piece:
            continue
        parsed = parse_stat_fragment(piece)
        if parsed:
            value, label, unit = parsed
            results.append({"raw": piece, "value": value, "label": label, "unit": unit})
        else:
            results.append({"raw": piece, "value": None, "label": None, "unit": None})
    return results


def extract_template_field(raw_wikitext, field_name):
    """Pulls one named field's raw value out of the ability's
    {{AbilityXX.X | field = ... }} template -- each field is confirmed to
    live on its own line in every real ability page fetched this session."""
    match = re.search(rf"^\|\s*{re.escape(field_name)}\s*=\s*(.*)$", raw_wikitext, re.MULTILINE)
    return match.group(1).strip() if match else None


def fetch_de_export():
    print("Fetching DE Public Export (energy costs, highest authority)...")
    warframes = requests.get(DE_EXPORT_URL, timeout=30).json()
    names = requests.get(DE_DICT_URL, timeout=30).json()
    return warframes, names


def de_energy_costs_for_frame(warframes, names, frame_key):
    """Returns {resolved_ability_name: energyRequiredToActivate} for one
    Warframe's DE export entry, resolving each ability's localization key
    through dict.en.json (DE's export never resolves these itself)."""
    frame = warframes.get(frame_key)
    if not frame:
        print(f"  DE export: no entry found for {frame_key}")
        return {}

    result = {}
    for ability in frame.get("abilities", []):
        name_key = ability.get("name")
        resolved_name = names.get(name_key)
        energy = ability.get("energyRequiredToActivate")
        if resolved_name and energy is not None:
            result[resolved_name] = energy
    return result


def fetch_wiki_wikitext(wiki_title):
    url = WIKI_RAW_URL_TEMPLATE.format(title=wiki_title)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def build_parameters(ability_name, raw_wikitext, de_energy):
    """Returns a list of parameter dicts ready to upsert, applying
    FORMULA_OVERRIDES/SUBSUMED_VARIANT_OVERRIDES before writing. Any field
    that fails to parse is included with base_value=None and printed as
    UNPARSEABLE -- never a best-guess substitute."""
    params = []
    sort_order = 0

    # Energy cost: DE Public Export is highest authority. Fall back to the
    # wiki's own `energy=` field (tagged source='wiki') only if DE has no
    # entry for this ability at all -- confirmed real fallback case: the
    # DE export's ability array only covers a Warframe's OWN kit, so a
    # cross-frame Helminth lookup (Nourish via Frost) still resolves fine
    # here since we look it up by the ability's HOME frame's DE entry, but
    # a future ability with no DE entry at all needs this fallback.
    sort_order += 1
    if de_energy is not None:
        params.append({
            "parameter_key": "energy_cost", "label": "Energy Cost", "sort_order": sort_order,
            "base_value": de_energy, "unit": "flat", "scales_with": "efficiency", "formula_key": None,
            "context": "base", "source": "de_public_export", "source_ref": "energyRequiredToActivate",
            "verified_note": None,
        })
    else:
        wiki_energy = extract_template_field(raw_wikitext, "energy")
        parsed_energy = parse_value_and_unit(wiki_energy) if wiki_energy else None
        value = parsed_energy[0] if parsed_energy else None
        if value is None:
            print(f"  UNPARSEABLE: {ability_name} / energy_cost -> {wiki_energy!r} (no DE entry either)")
        params.append({
            "parameter_key": "energy_cost", "label": "Energy Cost", "sort_order": sort_order,
            "base_value": value, "unit": "flat", "scales_with": "efficiency", "formula_key": None,
            "context": "base", "source": "wiki", "source_ref": f"energy={wiki_energy}",
            "verified_note": "No DE Public Export entry found; fell back to wiki.",
        })

    field_scaling = {
        "strength": "strength",
        "range": "range",
        "duration": "duration",
        "misc": "none",
    }

    for field_name, scales_with in field_scaling.items():
        raw_value = extract_template_field(raw_wikitext, field_name)
        fragments = parse_field_fragments(raw_value)

        for frag in fragments:
            sort_order += 1
            if frag["label"] is None:
                print(f"  UNPARSEABLE: {ability_name} / {field_name} -> {frag['raw']!r}")
                params.append({
                    "parameter_key": f"{field_name}_unparsed_{sort_order}", "label": frag["raw"],
                    "sort_order": sort_order, "base_value": None, "unit": None, "scales_with": None,
                    "formula_key": None, "context": "base", "source": "wiki", "source_ref": frag["raw"],
                    "verified_note": "Did not match the expected value/label pattern.",
                })
                continue

            parameter_key = auto_slugify(frag["label"])
            formula_key = FORMULA_OVERRIDES.get((ability_name, parameter_key))
            params.append({
                "parameter_key": parameter_key, "label": frag["label"], "sort_order": sort_order,
                "base_value": frag["value"], "unit": frag["unit"],
                "scales_with": scales_with if not formula_key else None,
                "formula_key": formula_key, "context": "base", "source": "wiki",
                "source_ref": frag["raw"], "verified_note": None,
            })

    # Apply subsumed-context overrides as additional rows (context='subsumed'),
    # never mutating the base-context row -- Duration and any other
    # parameter with no override here simply has no 'subsumed' row, and
    # falls back to 'base' at compute time.
    for (a_name, p_key), override in SUBSUMED_VARIANT_OVERRIDES.items():
        if a_name != ability_name:
            continue
        base_row = next((p for p in params if p["parameter_key"] == p_key), None)
        if not base_row:
            print(f"  WARNING: SUBSUMED_VARIANT_OVERRIDES references unknown parameter_key "
                  f"'{p_key}' for {ability_name} -- check it matches the real auto-slugified label.")
            continue
        subsumed_row = dict(base_row)
        subsumed_row["context"] = "subsumed"
        subsumed_row["base_value"] = override.get("base_value", base_row["base_value"])
        subsumed_row["formula_key"] = override.get("formula_key", base_row["formula_key"])
        subsumed_row["source"] = "manual"
        subsumed_row["verified_note"] = override.get("note")
        params.append(subsumed_row)

    return params


def upsert_ability(entry, raw_wikitext, de_energy):
    ability_name = entry["ability_name"]
    params = build_parameters(ability_name, raw_wikitext, de_energy)

    catalog_res = (
        supabase.schema("wf_base").table("ability_catalog")
        .upsert(
            {
                "ability_name": ability_name,
                "wiki_title": entry["wiki_title"],
                "last_ingested_at": "now()",
                "raw_json": {"wikitext": raw_wikitext},
            },
            on_conflict="ability_name",
        )
        .execute()
    )
    catalog_id = catalog_res.data[0]["ability_catalog_id"]

    # Clear this ability's existing parameter rows first -- simplest way
    # to guarantee a stale/removed parameter from a prior run never lingers,
    # since parameter_key/context can legitimately change between ingests.
    supabase.schema("wf_base").table("ability_parameters").delete().eq("ability_catalog_id", catalog_id).execute()

    for p in params:
        p["ability_catalog_id"] = catalog_id

    if params:
        supabase.schema("wf_base").table("ability_parameters").insert(params).execute()

    unparsed = sum(1 for p in params if p["base_value"] is None and not p["formula_key"])
    print(f"  Wrote {ability_name}: {len(params)} parameters ({unparsed} unresolved, not guessed)")


def main():
    warframes, names = fetch_de_export()

    de_energy_by_frame = {}
    for entry in ABILITY_SCOPE:
        frame_key = entry["de_frame_key"]
        if frame_key not in de_energy_by_frame:
            de_energy_by_frame[frame_key] = de_energy_costs_for_frame(warframes, names, frame_key)

    updated = 0
    failed = 0
    for entry in ABILITY_SCOPE:
        ability_name = entry["ability_name"]
        try:
            print(f"Ingesting {ability_name}...")
            raw_wikitext = fetch_wiki_wikitext(entry["wiki_title"])
            de_energy = de_energy_by_frame[entry["de_frame_key"]].get(ability_name)
            upsert_ability(entry, raw_wikitext, de_energy)
            updated += 1
        except Exception as e:
            print(f"  FAILED: {ability_name} -> {e}")
            failed += 1

    print(f"\nDone. {updated} abilities ingested, {failed} failed.")


if __name__ == "__main__":
    main()
