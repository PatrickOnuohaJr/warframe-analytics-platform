"""Dry-run or commit the WFCD Arcane snapshot without canonical promotion."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from static_data_pipeline import (
    PipelineError,
    SupabaseRestClient,
    build_arcane_bundle,
    load_env_file,
    load_json_source,
    utc_now_iso,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Stage and reconcile an exact WFCD Arcane snapshot. Canonical tables are never written.",
    )
    parser.add_argument("--source-file", type=Path, required=True)
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--source-revision", required=True)
    parser.add_argument("--source-commit-date")
    parser.add_argument("--game-version")
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument("--report-file", type=Path)
    parser.add_argument("--expected-source-count", type=int)
    parser.add_argument(
        "--commit",
        action="store_true",
        help="Call the service-only atomic RPC. Omit for the default dry run.",
    )
    return parser.parse_args()


def write_report(report: dict, report_file: Path | None) -> None:
    rendered = json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True)
    print(rendered)
    if report_file:
        report_file.parent.mkdir(parents=True, exist_ok=True)
        report_file.write_text(rendered + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    if not re.fullmatch(r"[0-9a-f]{40}", args.source_revision):
        raise PipelineError("--source-revision must be an exact 40-character lowercase Git commit SHA")

    env_values = load_env_file(args.env_file)
    base_url = os.environ.get("SUPABASE_URL") or env_values.get("SUPABASE_URL")
    api_key = os.environ.get("SUPABASE_SECRET_KEY") or env_values.get("SUPABASE_SECRET_KEY")
    if not base_url or not api_key:
        raise PipelineError("SUPABASE_URL and SUPABASE_SECRET_KEY are required")

    source_bytes, source_records = load_json_source(args.source_file)
    if args.expected_source_count is not None and len(source_records) != args.expected_source_count:
        raise PipelineError(
            f"source count drifted from expected {args.expected_source_count} to {len(source_records)}"
        )

    client = SupabaseRestClient(base_url=base_url, api_key=api_key)
    canonical_arcanes = client.fetch_canonical_arcanes()
    bundle, report = build_arcane_bundle(
        source_bytes=source_bytes,
        source_records=source_records,
        source_url=args.source_url,
        source_revision=args.source_revision,
        source_commit_date=args.source_commit_date,
        retrieved_at=utc_now_iso(),
        game_version=args.game_version,
        canonical_arcanes=canonical_arcanes,
    )
    report["mode"] = "commit" if args.commit else "dry-run"
    report["canonical_write_operations"] = 0

    if args.commit:
        report["database_result"] = client.commit_arcane_ingestion(bundle)

    write_report(report, args.report_file)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PipelineError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1) from error

