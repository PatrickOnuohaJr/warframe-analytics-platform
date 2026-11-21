# Equinox and cultivation content import — November 21, 2026

Applied to Supabase through the existing ingestion credential and verified by
readback. No schema changes or user-run SQL required. Application changes were
pushed on `main` in `3e126c9`; frontend deployment is not established. Backups of affected rows are retained locally in
ignored `tmp/equinox/`. Do not commit those personal build snapshots.

## Live audit and result

62 Codex builds audited; five missing doctrines before, zero afterwards.

| Build | Warframe | School | New cultivation art |
|---|---|---|---|
| Viral Rockstar | Temple | Phantom Theater Conservatory | Backbeat Inferno Dao of the Living Encore |
| Father Time | Limbo Prime | Cosmic Antimatter Council | Still Hour Dao of the Riftbound Clockmaker |
| The Celestials | Sirius & Orion | Cosmic Antimatter Council (preserved) | Contending Constellation Dao of the Twin Heavens |
| Ice Queen | Narin | Tidal Abyss Confraternity (preserved) | Winter Gale Dao of the Dancing Iceblade |
| Eternal Sun | Equinox Prime | Cosmic Antimatter Council | Twilight Meridian Dao of the Unsetting Sun |

Original Gu fiction follows both cultivation manuals in `Docs/Lore/`, particularly
the Council's boundary/duality theme, the Confraternity's frost lineage, and the
Conservatory's music-as-force premise. Existing doctrines were not rewritten.
No invented canonical backstories: Father Time is a build title, not literal
history reversal; Viral Rockstar does not imply innate Viral on every ability.
The authored JSON is the full reviewable text.

Equinox already had four ability names and all four augment catalog records.
Imported 26 rank-3 parameter rows: Metamorphosis 6, Rest & Rage 7,
Pacify & Provoke 7, Mend & Maim 6. Existing matching keys were updated in place;
no rows deleted, no inventory ownership or rank changes.

## Sources

- [Official Equinox](https://www.warframe.com/en/game/warframes/equinox): ability identity and form behavior.
- Wiki parameter sources: [Metamorphosis](https://wiki.warframe.com/w/Metamorphosis), [Rest & Rage](https://wiki.warframe.com/w/Rest_%26_Rage), [Pacify & Provoke](https://wiki.warframe.com/w/Pacify_%26_Provoke), [Mend & Maim](https://wiki.warframe.com/w/Mend_%26_Maim).
- [Wiki maximization data](https://wiki.warframe.com/w/Module:Maximization/data): nonlinear Pacify formula and Provoke/augment caps.
- [Ability Efficiency](https://wiki.warframe.com/w/Ability_Efficiency): continuous drain uses Efficiency and Duration; minimum quarter cost.
- Augments: [Duality](https://wiki.warframe.com/w/Duality), [Calm & Frenzy](https://wiki.warframe.com/w/Calm_%26_Frenzy), [Peaceful Provocation](https://wiki.warframe.com/w/Peaceful_Provocation), [Energy Transfer](https://wiki.warframe.com/w/Energy_Transfer).
- Canonical grounding for original lore: official [Temple](https://www.warframe.com/en/game/warframes/temple), [Limbo](https://www.warframe.com/en/game/warframes/limbo), [Narin](https://www.warframe.com/en/game/warframes/narin), [Sirius & Orion](https://www.warframe.com/en/game/warframes/sirius-orion).

## Implementation and verification limits

`DB/Seeds/equinox_data.py` supplies curated parameters to the existing seeder.
URL-encoding ability names fixes the `&` query-string breakage that prevented
the three paired abilities from importing. The export script writes a static
payload plus rerunnable transactional SQL; the importer defaults to read-only,
with `--apply` enabling the exact scoped import and optimistic lore guards.

155 Node and 36 UI tests pass; lint/build pass with the existing chunk-size
warning; Python syntax checks pass. Formula tests cover both forms, Helminth
Rest/Rage, fixed charge conversion, inverse Pacify scaling, channel cost floors,
and all four max-rank augments. Partial-rank augments still follow the application's
existing max-rank-only convention. Pacify's displayed multiplier is for its inner
ring, not every enemy in the outer aura. Provoke/Peaceful Provocation display
available bonuses, not inferred live buff stacks. Stored Mend/Maim charge is not
invented. Passive is recorded in catalog notes; no new passive UI was built.

The new formula keys require the updated frontend; old deployed code will show
unresolved values for those two rows. Source-checking and database readback do
not establish in-game tooltip accuracy or signed-in UI verification. Screenshot
pairs are pending in the visual catalog because local browser access failed.
