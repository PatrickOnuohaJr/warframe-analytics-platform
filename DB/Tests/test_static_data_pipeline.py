from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STATIC_DATA_DIR = PROJECT_ROOT / "DB" / "StaticData"
sys.path.insert(0, str(STATIC_DATA_DIR))

from static_data_pipeline import (  # noqa: E402
    NORMALIZATION_VERSION,
    ValidationError,
    build_arcane_bundle,
    build_staging_records,
    normalize_arcane,
    normalize_display_name,
    reconcile_arcanes,
    sha256_hex,
)


def source_arcane(
    unique_name: str,
    name: str,
    *,
    levels: int = 2,
    equipment_type: str = "Warframe Arcane",
) -> dict:
    record = {
        "uniqueName": unique_name,
        "name": name,
        "rarity": "Rare",
        "type": equipment_type,
        "tradable": True,
        "introduced": {"name": "Update Test"},
    }
    if levels >= 0:
        record["levelStats"] = [
            {"stats": [f"{name} rank {rank}"]}
            for rank in range(levels)
        ]
    return record


def canonical_arcane(arcane_id: int, name: str, **overrides) -> dict:
    record = {
        "arcane_id": arcane_id,
        "name": name,
        "unique_name": None,
        "equipment_type": None,
        "subcategory": "Legacy Source",
        "rarity": "Rare",
        "max_rank": 1,
        "effect_r5": f"{name} rank 1",
        "added_update": "Update Test",
        "tradable": True,
        "is_tradeable": True,
    }
    record.update(overrides)
    return record


class NormalizationTests(unittest.TestCase):
    def test_rank_count_drives_max_rank(self) -> None:
        normalized = normalize_arcane(source_arcane("/Test/One", "Arcane One", levels=6), 0)
        self.assertEqual(normalized["max_rank"], 5)
        self.assertEqual([rank["rank"] for rank in normalized["rank_payload"]], list(range(6)))
        self.assertEqual(normalized["validation_status"], "VALID")

    def test_missing_level_stats_is_preserved_as_warning(self) -> None:
        normalized = normalize_arcane(source_arcane("/Test/Listener", "Listener", levels=-1), 3)
        self.assertEqual(normalized["max_rank"], 0)
        self.assertEqual(normalized["rank_payload"], [])
        self.assertEqual(normalized["validation_status"], "WARNING")
        self.assertEqual(normalized["validation_errors"][0]["code"], "MISSING_LEVEL_STATS")

    def test_duplicate_display_names_remain_distinct(self) -> None:
        source = [
            source_arcane("/Test/Listener1", "Arcane Steadfast", levels=-1),
            source_arcane("/Test/Main", "Arcane Steadfast", levels=6),
        ]
        raw, normalized = build_staging_records(source)
        self.assertEqual(len(raw), 2)
        self.assertEqual(len(normalized), 2)
        self.assertEqual({row["unique_name"] for row in normalized}, {"/Test/Listener1", "/Test/Main"})

    def test_duplicate_unique_name_is_rejected(self) -> None:
        source = [
            source_arcane("/Test/Duplicate", "One"),
            source_arcane("/Test/Duplicate", "Two"),
        ]
        with self.assertRaisesRegex(ValidationError, "duplicate upstream uniqueName"):
            build_staging_records(source)

    def test_name_normalization_is_candidate_only_and_deterministic(self) -> None:
        self.assertEqual(normalize_display_name(" Arcane—Steadfast "), "arcanesteadfast")


class ReconciliationTests(unittest.TestCase):
    def normalize(self, *records: dict) -> list[dict]:
        return build_staging_records(list(records))[1]

    def test_stable_id_precedes_display_name(self) -> None:
        upstream = self.normalize(
            source_arcane("/Test/Stable", "Renamed Arcane"),
            source_arcane("/Test/Other", "Old Name"),
        )
        canonical = [canonical_arcane(1, "Old Name", unique_name="/Test/Stable")]
        items = reconcile_arcanes(canonical, upstream)
        stable_item = next(item for item in items if item["canonical_entity_id"] == "1")
        self.assertEqual(stable_item["match_method"], "UNIQUE_NAME")
        self.assertEqual(stable_item["upstream_unique_name"], "/Test/Stable")

    def test_duplicate_upstream_name_stops_at_manual_review(self) -> None:
        upstream = self.normalize(
            source_arcane("/Test/Listener1", "Arcane Steadfast", levels=-1),
            source_arcane("/Test/Listener2", "Arcane Steadfast", levels=-1),
            source_arcane("/Test/Main", "Arcane Steadfast", levels=6),
        )
        canonical = [canonical_arcane(1, "Arcane Steadfast")]
        items = reconcile_arcanes(canonical, upstream)
        self.assertEqual([item["bucket"] for item in items], ["MANUAL_REVIEW"])
        candidates = items[0]["field_diffs"][0]["candidate_unique_names"]
        self.assertEqual(candidates, ["/Test/Listener1", "/Test/Listener2", "/Test/Main"])

    def test_unmatched_both_sides_are_explicit(self) -> None:
        upstream = self.normalize(source_arcane("/Test/New", "New Arcane"))
        canonical = [canonical_arcane(1, "Legacy Arcane")]
        items = reconcile_arcanes(canonical, upstream)
        self.assertEqual({item["bucket"] for item in items}, {"GU_EXTRA", "GU_MISSING"})

    def test_alias_requires_exact_owner_supplied_unique_name(self) -> None:
        upstream = self.normalize(source_arcane("/Test/Correct", "Correct Spelling"))
        canonical = [canonical_arcane(1, "Legacy Spelling")]
        items = reconcile_arcanes(
            canonical,
            upstream,
            known_aliases={"Legacy Spelling": "/Test/Correct"},
        )
        self.assertEqual(items[0]["match_method"], "KNOWN_ALIAS")
        self.assertNotIn(items[0]["bucket"], {"GU_EXTRA", "GU_MISSING"})

    def test_inputs_are_not_mutated(self) -> None:
        upstream = self.normalize(source_arcane("/Test/One", "Arcane One"))
        canonical = [canonical_arcane(1, "Arcane One")]
        original_upstream = copy.deepcopy(upstream)
        original_canonical = copy.deepcopy(canonical)
        reconcile_arcanes(canonical, upstream)
        self.assertEqual(upstream, original_upstream)
        self.assertEqual(canonical, original_canonical)


class BundleTests(unittest.TestCase):
    def test_bundle_is_deterministic_for_fixed_inputs(self) -> None:
        source = [source_arcane("/Test/One", "Arcane One")]
        source_bytes = b'[{"name":"Arcane One"}]'
        canonical = [canonical_arcane(1, "Arcane One")]
        kwargs = {
            "source_bytes": source_bytes,
            "source_records": source,
            "source_url": "https://example.invalid/Arcanes.json",
            "source_revision": "1" * 40,
            "source_commit_date": "2026-08-31T00:00:00Z",
            "retrieved_at": "2026-08-31T01:00:00Z",
            "game_version": None,
            "canonical_arcanes": canonical,
        }
        first_bundle, first_report = build_arcane_bundle(**kwargs)
        second_bundle, second_report = build_arcane_bundle(**kwargs)
        self.assertEqual(first_bundle, second_bundle)
        self.assertEqual(first_report, second_report)
        self.assertEqual(first_report["payload_sha256"], sha256_hex(source_bytes))
        self.assertNotIn("canonical_updates", first_bundle)


if __name__ == "__main__":
    unittest.main()

