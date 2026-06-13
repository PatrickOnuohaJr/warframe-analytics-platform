# Arcane Data Audit

## Purpose

Track discrepancies, corrections, validations, and completeness status for the Jarvis Arcane dataset.

---

## Current Status

Last Audit Date: 2026-06-01

### Expected Counts

| Type      | Expected |
| --------- | -------: |
| Warframe  |       63 |
| Operator  |       22 |
| Amp       |       13 |
| Tektolyst |        5 |
| Primary   |       15 |
| Secondary |       17 |
| Melee     |       11 |
| Kitgun    |        8 |
| Zaw       |        8 |

Expected Total: 162

---

### Current Counts

| Type      | Current |
| --------- | ------: |
| Warframe  |      54 |
| Operator  |      12 |
| Amp       |      10 |
| Tektolyst |       4 |
| Primary   |       9 |
| Secondary |      17 |
| Melee     |      11 |
| Kitgun    |       4 |
| Zaw       |       8 |

Current Total: 129

Missing Total: 33

---

## Corrections Applied

### 2026-06-01

Reclassified:

* Magus Cadence → Operator
* Virtuos Fury → Amp
* Virtuos Null → Amp

Removed:

* Exodia Contation (typo duplicate)
* Exodia Precision (invalid row)

---

## Remaining Gaps

| Type      | Missing |
| --------- | ------: |
| Warframe  |       9 |
| Operator  |      10 |
| Amp       |       3 |
| Tektolyst |       1 |
| Primary   |       6 |
| Kitgun    |       4 |

Total Remaining: 33

---

## Notes

* ETL pipeline verified.
* seed_arcanes.py verified.
* Supabase ingestion verified.
* Dataset completeness remains the primary issue.
* No frontend issues identified.


Incomplete Arcane Records Identified

- Virtuos Fury
- Virtuos Null

Missing:
- max_rank
- effect_r5
- source
- wfm_slug
- subcategory

Likely incomplete seed data.