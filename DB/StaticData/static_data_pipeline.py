"""Reusable static-data ingestion primitives with an Arcane adapter.

The generic boundary is the immutable snapshot/raw layer. Dataset adapters own
typed normalization and reconciliation; Mods and Weapons can add adapters
without changing the snapshot or raw-entity tables.

This module never writes canonical wf_base tables. The only write endpoint it
knows is the service-only ``wf_base.commit_arcane_ingestion`` RPC, whose SQL is
also restricted to wf_ingest and wf_meta.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


NORMALIZATION_VERSION = "wfcd-arcanes-v1"
RECONCILIATION_VERSION = "arcane-reconciliation-v1"
USER_AGENT = "cephalon-gu-static-data-pipeline/1.0"

ALLOWED_BUCKETS = {
    "MATCH",
    "GU_MISSING",
    "GU_EXTRA",
    "VALUE_MISMATCH",
    "MANUAL_REVIEW",
}


class PipelineError(RuntimeError):
    """Base error for deterministic pipeline failures."""


class ValidationError(PipelineError):
    """Raised when source or canonical input cannot be safely reconciled."""


class ApiError(PipelineError):
    """Raised for a non-success Supabase REST response."""


def canonical_json_bytes(value: Any) -> bytes:
    """Return deterministic UTF-8 JSON bytes for hashes and comparisons."""

    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def sha256_hex(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def normalize_display_name(value: str | None) -> str:
    """Normalize only for candidate discovery, never automatic fuzzy matching."""

    normalized = unicodedata.normalize("NFKC", value or "").casefold()
    return "".join(character for character in normalized if character.isalnum())


def normalize_text(value: str | None) -> str:
    return " ".join((value or "").split()).casefold()


def _require_nonempty_text(record: Mapping[str, Any], field: str, ordinal: int) -> str:
    value = record.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"record {ordinal} has no usable {field}")
    return value.strip()


def _normalize_rank_payload(record: Mapping[str, Any], ordinal: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    level_stats = record.get("levelStats")
    validation_errors: list[dict[str, Any]] = []

    if level_stats is None:
        validation_errors.append(
            {
                "code": "MISSING_LEVEL_STATS",
                "message": "Upstream record has no levelStats array.",
                "source_ordinal": ordinal,
            }
        )
        return [], validation_errors

    if not isinstance(level_stats, list):
        raise ValidationError(f"record {ordinal} levelStats is not an array")

    ranks: list[dict[str, Any]] = []
    for rank, level in enumerate(level_stats):
        if not isinstance(level, dict):
            raise ValidationError(f"record {ordinal} levelStats[{rank}] is not an object")

        stats = level.get("stats", [])
        if not isinstance(stats, list) or any(not isinstance(item, str) for item in stats):
            raise ValidationError(f"record {ordinal} levelStats[{rank}].stats is not a string array")

        if not stats:
            validation_errors.append(
                {
                    "code": "EMPTY_RANK_STATS",
                    "message": f"Rank {rank} has no human-readable stats.",
                    "rank": rank,
                }
            )

        ranks.append({"rank": rank, "stats": stats})

    return ranks, validation_errors


def normalize_arcane(record: Mapping[str, Any], ordinal: int) -> dict[str, Any]:
    """Normalize one WFCD Arcane while retaining all rank text and warnings."""

    unique_name = _require_nonempty_text(record, "uniqueName", ordinal)
    name = _require_nonempty_text(record, "name", ordinal)
    rank_payload, validation_errors = _normalize_rank_payload(record, ordinal)

    introduced = record.get("introduced")
    introduced_update = introduced.get("name") if isinstance(introduced, dict) else None
    equipment_type = record.get("type") if isinstance(record.get("type"), str) else None
    rarity = record.get("rarity") if isinstance(record.get("rarity"), str) else None
    tradable = record.get("tradable") if isinstance(record.get("tradable"), bool) else None

    if equipment_type is None:
        validation_errors.append(
            {"code": "MISSING_EQUIPMENT_TYPE", "message": "Upstream type is missing."}
        )
    if rarity is None:
        validation_errors.append(
            {"code": "MISSING_RARITY", "message": "Upstream rarity is missing."}
        )
    if tradable is None:
        validation_errors.append(
            {"code": "MISSING_TRADABLE", "message": "Upstream tradable flag is missing."}
        )

    normalized = {
        "source_entity_id": unique_name,
        "unique_name": unique_name,
        "name": name,
        "equipment_type": equipment_type,
        "rarity": rarity,
        "max_rank": max(len(rank_payload) - 1, 0),
        "introduced_update": introduced_update,
        "tradable": tradable,
        "rank_payload": rank_payload,
        "normalization_version": NORMALIZATION_VERSION,
        "validation_status": "WARNING" if validation_errors else "VALID",
        "validation_errors": validation_errors,
    }
    normalized["normalized_payload_sha256"] = sha256_hex(canonical_json_bytes(normalized))
    return normalized


def build_staging_records(source_records: Sequence[Mapping[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build generic raw rows and typed Arcane staging rows."""

    if not isinstance(source_records, list):
        raise ValidationError("Arcane source payload must be a JSON array")

    raw_entities: list[dict[str, Any]] = []
    normalized_arcanes: list[dict[str, Any]] = []
    seen_unique_names: set[str] = set()

    for ordinal, source_record in enumerate(source_records):
        if not isinstance(source_record, dict):
            raise ValidationError(f"record {ordinal} is not a JSON object")

        normalized = normalize_arcane(source_record, ordinal)
        unique_name = normalized["unique_name"]
        if unique_name in seen_unique_names:
            raise ValidationError(f"duplicate upstream uniqueName: {unique_name}")
        seen_unique_names.add(unique_name)

        raw_entities.append(
            {
                "entity_type": "arcane",
                "source_entity_id": unique_name,
                "source_name": normalized["name"],
                "source_ordinal": ordinal,
                "source_payload": source_record,
                "source_payload_sha256": sha256_hex(canonical_json_bytes(source_record)),
            }
        )
        normalized_arcanes.append(normalized)

    return raw_entities, normalized_arcanes


def _rank_display_text(arcane: Mapping[str, Any]) -> str:
    rank_payload = arcane.get("rank_payload") or []
    if not rank_payload:
        return ""
    final_rank = rank_payload[-1]
    return "\n".join(final_rank.get("stats") or [])


def _field_diff(field: str, canonical_value: Any, upstream_value: Any, **context: Any) -> dict[str, Any]:
    result = {
        "field": field,
        "canonical": canonical_value,
        "upstream": upstream_value,
    }
    result.update(context)
    return result


def compare_arcane_fields(canonical: Mapping[str, Any], upstream: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Return reviewable differences without treating legacy dimensions as equal."""

    differences: list[dict[str, Any]] = []

    if canonical.get("unique_name") != upstream.get("unique_name"):
        differences.append(
            _field_diff(
                "unique_name",
                canonical.get("unique_name"),
                upstream.get("unique_name"),
                reason="MISSING_OR_DIFFERENT_STABLE_ID",
            )
        )

    if canonical.get("name") != upstream.get("name"):
        differences.append(_field_diff("name", canonical.get("name"), upstream.get("name")))

    if canonical.get("equipment_type") != upstream.get("equipment_type"):
        differences.append(
            _field_diff(
                "equipment_type",
                canonical.get("equipment_type"),
                upstream.get("equipment_type"),
                legacy_subcategory=canonical.get("subcategory"),
                reason="EQUIPMENT_COMPATIBILITY_IS_SEPARATE_FROM_LEGACY_SUBCATEGORY",
            )
        )

    canonical_max_rank = canonical.get("max_rank")
    if canonical_max_rank != upstream.get("max_rank"):
        differences.append(
            _field_diff("max_rank", canonical_max_rank, upstream.get("max_rank"))
        )

    canonical_introduced = canonical.get("introduced_update") or canonical.get("added_update")
    upstream_introduced = upstream.get("introduced_update")
    if canonical_introduced != upstream_introduced:
        differences.append(
            _field_diff("introduced_update", canonical_introduced, upstream_introduced)
        )

    canonical_tradable = canonical.get("tradable")
    if canonical_tradable is None:
        canonical_tradable = canonical.get("is_tradeable")
    if canonical_tradable != upstream.get("tradable"):
        differences.append(
            _field_diff("tradable", canonical_tradable, upstream.get("tradable"))
        )

    canonical_effect = canonical.get("effect_r5") or ""
    upstream_effect = _rank_display_text(upstream)
    if normalize_text(canonical_effect) != normalize_text(upstream_effect):
        differences.append(
            _field_diff(
                "effect_text",
                canonical_effect or None,
                upstream_effect or None,
                comparison="HEURISTIC_TEXT_ONLY",
            )
        )

    return differences


def _item(
    *,
    bucket: str,
    match_method: str,
    field_diffs: list[dict[str, Any]],
    upstream: Mapping[str, Any] | None = None,
    canonical: Mapping[str, Any] | None = None,
    match_confidence: float | None = None,
) -> dict[str, Any]:
    if bucket not in ALLOWED_BUCKETS:
        raise ValidationError(f"unsupported reconciliation bucket: {bucket}")
    return {
        "upstream_source_entity_id": upstream.get("source_entity_id") if upstream else None,
        "upstream_unique_name": upstream.get("unique_name") if upstream else None,
        "upstream_name": upstream.get("name") if upstream else None,
        "canonical_entity_id": str(canonical.get("arcane_id")) if canonical else None,
        "canonical_name": canonical.get("name") if canonical else None,
        "bucket": bucket,
        "field_diffs": field_diffs,
        "match_method": match_method,
        "match_confidence": match_confidence,
    }


def reconcile_arcanes(
    canonical_arcanes: Sequence[Mapping[str, Any]],
    normalized_arcanes: Sequence[Mapping[str, Any]],
    known_aliases: Mapping[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Reconcile stable ID -> exact normalized name -> approved alias -> review.

    ``known_aliases`` maps a canonical display name to one exact upstream
    ``unique_name``. It is intentionally empty by default; fuzzy similarity can
    never create an automatic match.
    """

    canonical_copy = copy.deepcopy(list(canonical_arcanes))
    upstream_copy = copy.deepcopy(list(normalized_arcanes))
    aliases = dict(known_aliases or {})

    upstream_by_id = {row["unique_name"]: row for row in upstream_copy}
    if len(upstream_by_id) != len(upstream_copy):
        raise ValidationError("normalized upstream unique_name values are not unique")

    upstream_by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in upstream_copy:
        normalized_name = normalize_display_name(row.get("name"))
        if not normalized_name:
            raise ValidationError(f"upstream row {row.get('unique_name')} has no normalized name")
        upstream_by_name[normalized_name].append(row)

    consumed_upstream_ids: set[str] = set()
    items: list[dict[str, Any]] = []

    for canonical in sorted(canonical_copy, key=lambda row: (row.get("name") or "", row.get("arcane_id") or 0)):
        candidate: dict[str, Any] | None = None
        match_method: str | None = None
        confidence: float | None = None

        canonical_unique_name = canonical.get("unique_name")
        if canonical_unique_name and canonical_unique_name in upstream_by_id:
            candidate = upstream_by_id[canonical_unique_name]
            match_method = "UNIQUE_NAME"
            confidence = 1.0
        else:
            name_candidates = upstream_by_name.get(normalize_display_name(canonical.get("name")), [])
            if len(name_candidates) > 1:
                candidate_ids = sorted(row["unique_name"] for row in name_candidates)
                consumed_upstream_ids.update(candidate_ids)
                items.append(
                    _item(
                        bucket="MANUAL_REVIEW",
                        match_method="MANUAL_REVIEW",
                        canonical=canonical,
                        field_diffs=[
                            {
                                "field": "identity",
                                "reason": "DUPLICATE_NORMALIZED_UPSTREAM_NAME",
                                "candidate_unique_names": candidate_ids,
                            }
                        ],
                    )
                )
                continue
            if len(name_candidates) == 1:
                candidate = name_candidates[0]
                match_method = "EXACT_NORMALIZED_NAME"
                confidence = 0.98

        if candidate is None and canonical.get("name") in aliases:
            alias_unique_name = aliases[canonical["name"]]
            candidate = upstream_by_id.get(alias_unique_name)
            if candidate is None:
                raise ValidationError(
                    f"approved alias for {canonical['name']} targets missing upstream ID {alias_unique_name}"
                )
            match_method = "KNOWN_ALIAS"
            confidence = 0.95

        if candidate is None:
            items.append(
                _item(
                    bucket="GU_EXTRA",
                    match_method="UNMATCHED",
                    canonical=canonical,
                    match_confidence=0.0,
                    field_diffs=[
                        {
                            "field": "upstream_entity",
                            "canonical": canonical.get("name"),
                            "upstream": None,
                            "reason": "NO_STABLE_ID_NAME_OR_APPROVED_ALIAS_MATCH",
                        }
                    ],
                )
            )
            continue

        candidate_id = candidate["unique_name"]
        if candidate_id in consumed_upstream_ids:
            items.append(
                _item(
                    bucket="MANUAL_REVIEW",
                    match_method="MANUAL_REVIEW",
                    upstream=candidate,
                    canonical=canonical,
                    field_diffs=[
                        {
                            "field": "identity",
                            "reason": "UPSTREAM_ENTITY_MATCHED_MORE_THAN_ONCE",
                        }
                    ],
                )
            )
            continue

        consumed_upstream_ids.add(candidate_id)
        field_diffs = compare_arcane_fields(canonical, candidate)
        items.append(
            _item(
                bucket="VALUE_MISMATCH" if field_diffs else "MATCH",
                match_method=match_method or "MANUAL_REVIEW",
                upstream=candidate,
                canonical=canonical,
                match_confidence=confidence,
                field_diffs=field_diffs,
            )
        )

    for upstream in sorted(upstream_copy, key=lambda row: (row.get("name") or "", row["unique_name"])):
        if upstream["unique_name"] in consumed_upstream_ids:
            continue
        items.append(
            _item(
                bucket="GU_MISSING",
                match_method="UNMATCHED",
                upstream=upstream,
                match_confidence=0.0,
                field_diffs=[
                    {
                        "field": "canonical_entity",
                        "canonical": None,
                        "upstream": upstream.get("name"),
                        "reason": "NO_CANONICAL_STABLE_ID_NAME_OR_APPROVED_ALIAS_MATCH",
                    }
                ],
            )
        )

    bucket_order = {
        "MANUAL_REVIEW": 0,
        "GU_MISSING": 1,
        "GU_EXTRA": 2,
        "VALUE_MISMATCH": 3,
        "MATCH": 4,
    }
    items.sort(
        key=lambda row: (
            bucket_order[row["bucket"]],
            row.get("canonical_name") or row.get("upstream_name") or "",
            row.get("canonical_entity_id") or "",
            row.get("upstream_unique_name") or "",
        )
    )
    return items


def summarize_pipeline(
    raw_entities: Sequence[Mapping[str, Any]],
    normalized_arcanes: Sequence[Mapping[str, Any]],
    reconciliation_items: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    buckets = Counter(item["bucket"] for item in reconciliation_items)
    validation = Counter(item["validation_status"] for item in normalized_arcanes)
    duplicate_names = {
        name: sorted(row["unique_name"] for row in normalized_arcanes if row["name"] == name)
        for name, count in Counter(row["name"] for row in normalized_arcanes).items()
        if count > 1
    }
    validation_warnings = [
        {
            "name": row["name"],
            "unique_name": row["unique_name"],
            "codes": [error["code"] for error in row["validation_errors"]],
        }
        for row in normalized_arcanes
        if row["validation_status"] != "VALID"
    ]
    review_queues = {
        bucket: [
            {
                "canonical_entity_id": item.get("canonical_entity_id"),
                "canonical_name": item.get("canonical_name"),
                "upstream_unique_name": item.get("upstream_unique_name"),
                "upstream_name": item.get("upstream_name"),
                "field_diffs": item.get("field_diffs"),
            }
            for item in reconciliation_items
            if item["bucket"] == bucket
        ]
        for bucket in ("MANUAL_REVIEW", "GU_MISSING", "GU_EXTRA")
    }
    return {
        "raw_records": len(raw_entities),
        "normalized_records": len(normalized_arcanes),
        "validation_statuses": dict(sorted(validation.items())),
        "validation_warnings": validation_warnings,
        "reconciliation_items": len(reconciliation_items),
        "buckets": dict(sorted(buckets.items())),
        "duplicate_upstream_names": duplicate_names,
        "review_queues": review_queues,
    }


def build_arcane_bundle(
    *,
    source_bytes: bytes,
    source_records: list[dict[str, Any]],
    source_url: str,
    source_revision: str,
    source_commit_date: str | None,
    retrieved_at: str,
    game_version: str | None,
    canonical_arcanes: Sequence[Mapping[str, Any]],
    known_aliases: Mapping[str, str] | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    raw_entities, normalized_arcanes = build_staging_records(source_records)
    reconciliation_items = reconcile_arcanes(
        canonical_arcanes,
        normalized_arcanes,
        known_aliases=known_aliases,
    )
    summary = summarize_pipeline(raw_entities, normalized_arcanes, reconciliation_items)

    bundle = {
        "snapshot": {
            "dataset": "arcanes",
            "source_name": "WFCD/warframe-items",
            "source_url": source_url,
            "source_revision": source_revision,
            "source_release": None,
            "game_version": game_version,
            "retrieved_at": retrieved_at,
            "payload_sha256": sha256_hex(source_bytes),
            "raw_payload": source_records,
            "record_count": len(source_records),
            "ingest_status": "VALIDATED",
            "metadata": {
                "source_commit_date": source_commit_date,
                "payload_bytes": len(source_bytes),
                "normalization_version": NORMALIZATION_VERSION,
                "algorithm_version": RECONCILIATION_VERSION,
                "upstream_repository": "https://github.com/WFCD/warframe-items",
            },
        },
        "raw_entities": raw_entities,
        "normalized_arcanes": normalized_arcanes,
        "reconciliation": {
            "canonical_row_count": len(canonical_arcanes),
            "normalization_version": NORMALIZATION_VERSION,
            "algorithm_version": RECONCILIATION_VERSION,
            "created_by": "DB/StaticData/ingest_arcanes.py",
            "items": reconciliation_items,
        },
    }
    report = {
        "source_url": source_url,
        "source_revision": source_revision,
        "source_commit_date": source_commit_date,
        "payload_sha256": bundle["snapshot"]["payload_sha256"],
        "payload_bytes": len(source_bytes),
        "canonical_rows": len(canonical_arcanes),
        **summary,
    }
    return bundle, report


def load_json_source(path: Path) -> tuple[bytes, list[dict[str, Any]]]:
    source_bytes = path.read_bytes()
    try:
        parsed = json.loads(source_bytes.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValidationError(f"invalid UTF-8 JSON source {path}: {error}") from error
    if not isinstance(parsed, list):
        raise ValidationError("Arcane source root must be an array")
    if any(not isinstance(record, dict) for record in parsed):
        raise ValidationError("every Arcane source record must be an object")
    return source_bytes, parsed


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip('"').strip("'")
    return values


@dataclass(frozen=True)
class SupabaseRestClient:
    base_url: str
    api_key: str

    def _request(
        self,
        method: str,
        path: str,
        *,
        schema: str,
        body: Any | None = None,
        prefer: str | None = None,
    ) -> tuple[Any, Mapping[str, str]]:
        url = f"{self.base_url.rstrip('/')}/rest/v1/{path.lstrip('/')}"
        headers = {
            "apikey": self.api_key,
            "Accept": "application/json",
            "Accept-Profile": schema,
            "User-Agent": USER_AGENT,
        }
        data = None
        if body is not None:
            data = canonical_json_bytes(body)
            headers["Content-Type"] = "application/json"
            headers["Content-Profile"] = schema
        if prefer:
            headers["Prefer"] = prefer

        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                response_bytes = response.read()
                response_json = json.loads(response_bytes) if response_bytes else None
                return response_json, dict(response.headers.items())
        except urllib.error.HTTPError as error:
            error_body = error.read().decode("utf-8", errors="replace")
            raise ApiError(f"Supabase {method} {path} failed ({error.code}): {error_body}") from error
        except urllib.error.URLError as error:
            raise ApiError(f"Supabase {method} {path} failed: {error.reason}") from error

    def fetch_canonical_arcanes(self) -> list[dict[str, Any]]:
        query = urllib.parse.urlencode(
            {"select": "*", "order": "arcane_id.asc", "limit": "1000"},
            safe="*,.",
        )
        result, _ = self._request("GET", f"arcanes?{query}", schema="wf_base")
        if not isinstance(result, list):
            raise ApiError("wf_base.arcanes did not return an array")
        return result

    def commit_arcane_ingestion(self, bundle: Mapping[str, Any]) -> dict[str, Any]:
        result, _ = self._request(
            "POST",
            "rpc/commit_arcane_ingestion",
            schema="wf_base",
            body={"bundle": bundle},
        )
        if not isinstance(result, dict):
            raise ApiError("commit_arcane_ingestion did not return an object")
        return result


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
