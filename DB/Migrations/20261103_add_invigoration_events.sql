-- Invigoration activity log + Override counter (Phase 1).
--
-- helminth_invigorations rows are weekly OFFERS (three per week). This file:
--   1. gives each offer a persistent slot A/B/C (non-destructive; no rows are
--      deleted or rewritten except filling the new slot column),
--   2. adds an append-only event log of what actually happened: applied,
--      skipped, Override selected, and manual counter settings.
--
-- Nothing is inferred: no event is created from any existing offer, so every
-- old offer simply has no events (the app reads that as Pending / no record).
-- The Override counter is NOT stored; the app derives it from the live events.
--
-- Safe to re-run. Owner-only like the rest of the database. If Supabase warns
-- that a query "creates a table without RLS", pick "Run and enable RLS" -- the
-- script enables it itself.

-- 1. Persistent slot per offer ------------------------------------------------
alter table wf_user.helminth_invigorations
  add column if not exists slot text check (slot in ('A', 'B', 'C'));

-- Backfill: within each week, the offers in the order they were entered (id)
-- become A, B, C. Only rows with no slot yet are touched.
with ranked as (
  select id, row_number() over (partition by week_start order by id) as n
  from wf_user.helminth_invigorations
  where slot is null
)
update wf_user.helminth_invigorations h
set slot = case r.n when 1 then 'A' when 2 then 'B' when 3 then 'C' end
from ranked r
where h.id = r.id and r.n <= 3;

create unique index if not exists helminth_invigorations_week_slot_uq
  on wf_user.helminth_invigorations (week_start, slot)
  where slot is not null;

-- 2. Append-only event log ----------------------------------------------------
-- event_id is the timeline: events are ordered by it, never by occurred_at
-- (occurred_at is just the time the user says it happened and can be edited).
--
-- applied          an Invigoration was actually applied to recipient_frame_name.
--                  recipient_role 'original' = the offer's own Warframe,
--                  'override' = the Warframe chosen by the Override.
-- skipped          the offer's original recipient was not Invigorated.
-- override_selected the Override was used on this offer: it names the new
--                  recipient and resets progress. It is NOT an application;
--                  the actual application is a separate 'applied' event.
-- counter_set      the player calibrated the counter to counter_value (0-10).
--
-- The snap_* columns copy the offer as it was when the event was recorded, so
-- editing an offer later can never change history.
create table if not exists wf_user.invigoration_events (
  event_id             bigint generated always as identity primary key,
  occurred_at          timestamptz not null default now(),
  recorded_at          timestamptz not null default now(),
  event_type           text not null check (event_type in ('applied', 'skipped', 'override_selected', 'counter_set')),
  offer_id             integer references wf_user.helminth_invigorations(id) on delete restrict,
  recipient_role       text check (recipient_role in ('original', 'override')),
  recipient_frame_name text,
  counter_value        integer check (counter_value between 0 and 10),
  snap_week_start      date,
  snap_slot            text check (snap_slot in ('A', 'B', 'C')),
  snap_frame_name      text,
  snap_offense_buff    text,
  snap_utility_buff    text,
  note                 text check (note is null or length(note) <= 300),
  voided_at            timestamptz,
  void_reason          text check (void_reason is null or length(void_reason) <= 300),
  -- Shape per event type, so a malformed row cannot be stored.
  constraint invigoration_event_shape check (
    (event_type = 'counter_set'
       and counter_value is not null and offer_id is null)
    or (event_type in ('applied', 'skipped', 'override_selected')
       and offer_id is not null and recipient_role is not null
       and recipient_frame_name is not null and counter_value is null
       and snap_slot is not null and snap_week_start is not null)
  ),
  constraint invigoration_event_role check (
    event_type not in ('skipped') or recipient_role = 'original'
  ),
  constraint invigoration_override_role check (
    event_type <> 'override_selected' or recipient_role = 'override'
  )
);

-- Duplicate guards (live events only). A double click or retry cannot add a
-- second application: one applied-or-skipped per offer and role, and one
-- Override selection per offer.
create unique index if not exists invigoration_events_one_outcome_uq
  on wf_user.invigoration_events (offer_id, recipient_role)
  where event_type in ('applied', 'skipped') and voided_at is null;

create unique index if not exists invigoration_events_one_override_uq
  on wf_user.invigoration_events (offer_id)
  where event_type = 'override_selected' and voided_at is null;

alter table wf_user.invigoration_events enable row level security;

drop policy if exists "owner all invigoration_events" on wf_user.invigoration_events;
create policy "owner all invigoration_events" on wf_user.invigoration_events
  for all to authenticated
  using (wf_user.is_owner())
  with check (wf_user.is_owner());

-- No delete grant: history is only ever voided, never removed.
revoke all on wf_user.invigoration_events from anon, public;
grant select, insert, update on wf_user.invigoration_events to authenticated;
grant select on wf_user.invigoration_events to service_role;
grant usage, select on sequence wf_user.invigoration_events_event_id_seq to authenticated;
