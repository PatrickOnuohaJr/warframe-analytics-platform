# Cephalon Gu — Arcane Ingestion Dry Run

Dry-run and staging commit completed 2026-08-31 against the live 161-row
`wf_base.arcanes` table. The only live writes were to immutable ingestion and
reconciliation storage; canonical Arcane data was not changed.

## Exact source

- Repository: `WFCD/warframe-items`
- File: `data/json/Arcanes.json`
- Commit: `f7c69c0786611df81214cabf588160d7af9cc80c`
- Commit time: `2026-08-29T23:48:27Z`
- Payload size: 303,243 bytes
- Payload SHA-256: `c29815afb6ed6d308227931aa62541e4172fa01c1be72fa2749063e5871996a0`
- Raw records: 172
- Normalized records: 172

The snapshot URL is commit-pinned rather than `master`, so the retained hash and
revision identify the exact bytes used by this run.

## Validation

- `VALID`: 164 records
- `WARNING`: 8 records
- `INVALID`: 0 records

Warnings were retained rather than repaired:

- Four Arcane Steadfast internal listener records have no `levelStats`.
- Arcane Defense, Arcane Detoxifier, Arcane Liquid, and Arcane Survival have no
  upstream rarity.

All five Arcane Steadfast records remain separate by `uniqueName`; the normalizer
does not collapse them by display name.

## Reconciliation

The run produced 174 review items:

| Bucket | Count | Meaning |
|---|---:|---|
| `VALUE_MISMATCH` | 154 | One-to-one identity candidate with one or more reviewable field differences. All currently lack a promoted stable ID/equipment type. |
| `GU_MISSING` | 13 | Upstream entity has no canonical stable-ID, exact-name, or approved-alias match. |
| `GU_EXTRA` | 6 | Canonical entity has no upstream stable-ID, exact-name, or approved-alias match. |
| `MANUAL_REVIEW` | 1 | Arcane Steadfast maps to five upstream internal records. |
| `MATCH` | 0 | Expected before stable-ID/equipment provenance backfill. |

`GU_MISSING`:

- Arcane Defense
- Arcane Detoxifier
- Arcane Ice Storm
- Arcane Liquid
- Arcane Protection
- Arcane Sculptor
- Arcane Shield
- Arcane Survival
- Arcane Temperance
- Arcane Truculence
- Melee Assimilation
- Primary Compression
- Secondary Cryogenic

`GU_EXTRA`:

- Arcane Trunculence (`arcane_id = 420`)
- Zid-An Haras (`245`)
- Zid-An Osbok (`248`)
- Zid-An Sek-Eel (`246`)
- Zid-An Uskos (`247`)
- Zid-An-Asheir (`399`)

This corrects the pilot evidence's `GU_EXTRA = 0` summary. The earlier machine
evidence placed these unmatched canonical rows in its broad `matches` array with
null upstream fields; the new reconciliation requires every canonical and
upstream identity to be explicitly consumed or placed in an unmatched/review
bucket.

Arcane Trunculence and Arcane Truculence remain separate unmatched items. Their
similarity is not enough to create an alias automatically.

## Safety results

- Canonical write operations: 0
- Offline tests: 11 passed
- Static DML guard: passed; neither the loader nor atomic RPC migration contains
  `INSERT`, `UPDATE`, or `DELETE` against `wf_base.arcanes` or
  `wf_base.arcane_ranks`.
- `wf_ingest` and `wf_meta` remain absent from PostgREST's exposed schema list.

## Live staging commit

Patrick ran the following in Supabase SQL Editor, separately and in order:

1. `DB/Migrations/20260831_add_arcane_ingestion_rpc.sql`
2. `DB/Tests/20260831_arcane_ingestion_rpc_test.sql`

Both succeeded. The second file ended with `ROLLBACK`, so its fixtures were not
retained. The loader then committed the exact bundle described above:

- Snapshot ID: `278b814e-b64d-4bc9-bf09-77847c7f898e`
- Reconciliation run ID: `f40d0d19-c224-47f8-9ef2-c225f42e91d0`
- Raw records retained: 172
- Normalized records retained: 172
- Reconciliation items retained: 174
- Canonical write operations reported by the loader: 0

An immediate replay returned `reused = true`, the same snapshot ID, the same
reconciliation run ID, and the same record counts. This verifies live
idempotence for an identical source/version bundle.

Independent post-commit reads confirmed:

- `wf_base.arcanes`: 161 rows
- Arcane rows with any newly populated promotion/provenance field or
  `is_active = false`: 0
- `wf_base.arcane_ranks`: 0 rows

Canonical promotion therefore remains unperformed and review-gated.
