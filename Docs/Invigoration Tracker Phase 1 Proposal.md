# Invigoration activity log + Override counter — Phase 1 proposal (not built)

Written Nov 3, 2026. Awaiting Patrick's approval before any code or migration.

**Correction:** `Docs/Invigoration Engine Design.md` (earlier today) wrongly proposed new weekly tables as if Gu had no tracker. It does. This proposal reuses the existing one; the design doc's storage section is superseded by this file.

## Audit: what exists

- Table `wf_user.helminth_invigorations`: `id`, `week_start` (date), `frame_name` (text), `build_title`, `cultivation_color`, `offense_buff`, `utility_buff`, `created_at`. **No slot column, no status, no link to anything.** Its content could not be read from here (the service role has no select grant), so existing rows are unverified. It is in the change-history trigger list (`20261028_add_change_history.sql`).
- UI: `pages/HomePage.jsx`, "Helminth Invigorations" section. Three cards for the week, an entry form (3 rows: frame, offense buff, utility buff; buff lists match the wiki), a single-card edit modal. Cards currently say "Invigorated", which reads as applied; per Patrick they are **offers**.
- Defects that matter for Phase 1:
  1. **Saving or editing deletes and re-inserts rows** (`submitInvigorations` deletes the whole week; `saveEditedInvig` deletes by `frame_name`). Row ids change every save, so nothing could safely point at an offer. Changing to update-in-place is required.
  2. **A/B/C exists only as display order** (and the fetch has no `order`, so even that is not guaranteed).
  3. `getCurrentMonday()` uses local time; the game's week starts Monday 00:00 **UTC**. Near midnight or in other timezones it can pick the wrong week.
- Nothing tracks applications, skips, Override, or a counter today.

## Minimal schema changes (one migration, for Patrick to run)

1. `alter table wf_user.helminth_invigorations add column slot text check (slot in ('A','B','C'))`. Backfill existing rows per week as A/B/C in `id` order (the order they were entered in the form; flagged as an assumption). Partial unique index on `(week_start, slot)` where `slot is not null`. No status column: **status is derived** from events so it can never disagree with the counter. Original `frame_name` and buff pair are never overwritten by events.
2. New append-only table `wf_user.invigoration_events`:
   - `event_id` (identity), `occurred_at` (default now, editable for late entry), `event_type` in `applied | skipped | override_used | counter_set`
   - `offer_id` (fk to `helminth_invigorations.id`, `on delete restrict`; null for `counter_set`)
   - `recipient_frame_name` (who actually got it), `recipient_role` in `original | override` (`applied` and `skipped` use `original`; `override_used` uses `override`)
   - `override_from_frame` (original recipient replaced, informational), `counter_value` (0-10, for `counter_set` only), `note`
   - `voided_at`, `void_reason` (corrections void an event; rows are never deleted, so history stays intact)
   - Owner-only RLS and grants like the other `wf_user` tables, plus the change-history trigger.
3. Duplicate guards in the database (partial unique indexes, only where `voided_at is null`): one `applied`/`skipped` per `(offer_id, recipient_role)`, and one `override_used` per `offer_id`. A double click or retry cannot add a second application.

## Event handling (pure code, `utils/invigorationLedger.js`, Node-tested)

- **Offer status:** `applied` if a live `applied` event exists for that offer's original recipient, `skipped` if a live `skipped` event, else **`pending`** (the default; no history never means skipped).
- **Counter (derived, never stored):** take the latest live anchor event (`counter_set` gives its value; `override_used` gives 0; none gives 0). Progress = anchor value + number of live `applied` events after it, capped at 10. So only applications raise it; recording an offer, a skip, or an edit does not. The weekly rollover has no effect because nothing is keyed to the week.
- **Ready:** progress 10 shows "Override Ready" and stays until a live `override_used` event exists after it.
- **Override use:** records slot (offer), new recipient and the original recipient. The offer's buff pair is unchanged. It resets progress to 0. The original recipient's application (if any) is a separate `applied` event and still counts.
- **Initial value:** a `counter_set` event you enter by hand (the starting point, since there is no history). Corrections: void the wrong event (counter recomputes) or add a new `counter_set`; both keep the history.
- **No backfill:** the migration creates no events. Past weeks show "no record", not Pending noise.
- **History:** one chronological list (applications, skips, Override uses, counter sets, voids), voided entries struck through with the reason.

## UI (reuses the Home section)

- Cards labelled A/B/C, "Invigorated" replaced by the status chip (Pending default), with Applied / Skipped / Undo buttons (disabled while saving). Entry/edit forms keep their look; editing updates the row by id; saving never deletes.
- A progress bar "6 / 10 applied" with "Set count" (writes `counter_set`).
- At 10: an "Override Ready" banner and a "Record Override" form (pick slot, pick the Warframe that received it).
- A collapsible history list with Void.
- Fix `getCurrentMonday()` to UTC.

## Questions only the game can answer (defaults in brackets)

1. After the counter reaches 10, can you still apply Invigorations, and do they count? [Capped at 10; further applications still logged but do not raise it.]
2. Does the override recipient's own Invigoration count as +1 toward the next 10? [No: the counter goes to 0 on Override.]
3. If an offer's Warframe is edited after an event was logged against it, should that be blocked? [Allowed with a warning; events keep their own recipient names.]

## Tests

Node: status derivation, counter from anchors, only-applied-counts, skip/offer/edit do not count, override reset, ready-until-recorded, same-slot original + override both recorded, duplicate rejection, void recomputes, cap at 10, rollover independence. UI: card status buttons, Override form, history void.
