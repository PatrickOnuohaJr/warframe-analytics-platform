import os
import re
import pandas as pd
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SECRET_KEY")
EXCEL_PATH = r"C:\Users\jideo\Warframe_Project\Stress Test F1.xlsx"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_shard(raw):
    if not raw or str(raw).strip().lower() in ("nan", ""):
        return None, False, None
    s = str(raw).strip().upper()
    tauforged = s.startswith("TF")
    if tauforged:
        s = s[2:]
    color_map = {
        "R": "crimson",
        "Y": "amber",
        "B": "azure",
        "P": "topaz",
        "O": "emerald",
        "G": "emerald",
    }
    color_char = s[0] if s else None
    color = color_map.get(color_char)
    tier_match = re.search(r"\d", s)
    tier = int(tier_match.group()) if tier_match else None
    return color, tauforged, tier

def split_arcanes(arcane_str):
    if not arcane_str or str(arcane_str).strip().lower() == "nan":
        return None, None
    parts = str(arcane_str).strip().split()
    if len(parts) >= 2:
        return parts[0], parts[1]
    return parts[0], None

def migrate():
    df = pd.read_excel(EXCEL_PATH, sheet_name="Archon Shards", header=0)
    df = df[df["Warframe"].notna()].head(57)

    print(f"Loaded {len(df)} rows from Archon Shards sheet")

    for _, row in df.iterrows():
        frame_name = str(row["Warframe"]).strip()
        if not frame_name or frame_name.lower() == "nan":
            continue

        # Upsert into wf_base.warframes
        is_prime = "prime" in frame_name.lower()
        wf_result = supabase.schema("wf_base").table("warframes").upsert(
            {"name": frame_name, "is_prime": is_prime},
            on_conflict="name"
        ).execute()
        warframe_id = wf_result.data[0]["warframe_id"]

        # Parse arcanes
        arcane_raw = str(row.get("Warframe Arcane", "")).strip()
        arcane_1, arcane_2 = split_arcanes(arcane_raw)

        # Parse KPM flags
        kpm_85 = str(row.get("85-100 KPM", "")).strip().lower() not in ("nan", "", "0", "0.0")
        kpm_120 = str(row.get("120KPM Lvl Cap", "")).strip().lower() not in ("nan", "", "0", "0.0", "n")

        # Upsert into wf_user.my_frames
        tier = str(row.get("Tier", "")).strip()
        tier = tier if tier in ("S", "A", "B", "C") else None

        frame_result = supabase.schema("wf_user").table("my_frames").upsert(
            {
                "warframe_id": warframe_id,
                "build_title": str(row.get("Title", "")).strip() or None,
                "tier": tier,
                "primary_weapon": str(row.get("Primary", "")).strip() or None,
                "secondary_weapon": str(row.get("Secondary", "")).strip() or None,
                "melee_weapon": str(row.get("Melee", "")).strip() or None,
                "arcane_1": arcane_1,
                "arcane_2": arcane_2,
                "kpm_85_100": kpm_85,
                "kpm_120_cap": kpm_120,
            },
            on_conflict="warframe_id"
        ).execute()
        my_frame_id = frame_result.data[0]["my_frame_id"]

        # Parse and insert shard slots
        shards = {}
        for i in range(1, 6):
            col = f"Archon Shard {i}"
            color, tauforged, tier_num = parse_shard(row.get(col))
            shards[f"shard_{i}_color"] = color
            shards[f"shard_{i}_tauforged"] = tauforged
            shards[f"shard_{i}_tier"] = tier_num

        supabase.schema("wf_user").table("archon_shard_slots").upsert(
            {"my_frame_id": my_frame_id, **shards},
            on_conflict="my_frame_id"
        ).execute()

        # Insert build status
        supabase.schema("wf_user").table("build_status").upsert(
            {
                "my_frame_id": my_frame_id,
                "needs_revisit": False,
                "build_finished": False,
                "shards_slotted": False,
                "ready_to_test": False,
            },
            on_conflict="my_frame_id"
        ).execute()

        print(f"  Migrated: {frame_name}")

    # KPM Tracker
    print("\nMigrating KPM sessions...")
    kpm_df = pd.read_excel(EXCEL_PATH, sheet_name="KPM Tracker", header=0)
    kpm_df = kpm_df[kpm_df["Warframe"].notna()].head(55)

    checkpoints = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
    col_map = {5: "5 Minutes", 10: "10 Minutes", 15: "15 Minutes", 20: "20 Minutes",
               25: "25 Minutes", 30: "30 Minutes", 35: "35 Minutes", 40: "40 Minutes",
               45: "45 Minutes", 50: "50 Minutes", 55: "55 Minutes", 60: "60 Minutes"}

    for _, row in kpm_df.iterrows():
        frame_name = str(row["Warframe"]).strip()
        if not frame_name or frame_name.lower() in ("nan", "hayden tenno"):
            continue

        has_data = any(
            str(row.get(col_map[c], "")).strip().lower() not in ("nan", "")
            for c in checkpoints
        )
        if not has_data:
            continue

        wf_result = supabase.schema("wf_base").table("warframes").select("warframe_id").eq("name", frame_name).execute()
        if not wf_result.data:
            print(f"  Skipping KPM for {frame_name} — not in warframes table")
            continue
        warframe_id = wf_result.data[0]["warframe_id"]

        frame_result = supabase.schema("wf_user").table("my_frames").select("my_frame_id").eq("warframe_id", warframe_id).execute()
        if not frame_result.data:
            print(f"  Skipping KPM for {frame_name} — not in my_frames table")
            continue
        my_frame_id = frame_result.data[0]["my_frame_id"]

        session = {"my_frame_id": my_frame_id, "session_date": None, "notes": "migrated from Excel"}
        for c in checkpoints:
            val = row.get(col_map[c])
            try:
                session[f"t{c:02d}"] = int(float(val)) if str(val).strip().lower() not in ("nan", "") else None
            except (ValueError, TypeError):
                session[f"t{c:02d}"] = None

        supabase.schema("wf_user").table("kpm_sessions").insert(session).execute()
        print(f"  KPM migrated: {frame_name}")

    print("\nMigration complete.")

if __name__ == "__main__":
    migrate()