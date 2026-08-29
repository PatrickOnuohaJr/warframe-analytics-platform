import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import Panel from './ui/Panel';
import { computeResilience, pickBenchmarkTier } from '../utils/survivability';
import { COLOR } from '../constants/theme';

// ============================================================================
// SurvivabilityTab.jsx (D.2-D.5 Survivability Suite -- Report Card, v1)
// ============================================================================
// Sibling to Companion/Loadout in BuildDetailOverlay. Computes this build's
// Resilience metric (utils/survivability.js) from three live-fetched
// sources: base Warframe stats (wf_base.warframes, Session 015), the
// Warframe piece's currently equipped mods (loadout_slots + mods +
// mod_inventory, same tables ModsLoadoutTab already owns -- fetched fresh
// here rather than shared, same separate-tab-separate-fetch pattern as
// CompanionTab), and this build's currently-equipped Archon Shards
// (frame.shard_slots, already present on the frame prop via useFrames.js
// -- no extra fetch needed).
//
// D.4 Survivability Profiles (added later in Session 015, per Patrick's
// explicit direction to keep this separate from per-build data): a
// reusable reference catalog (wf_base.survivability_profiles -- Health
// Tank/Shield Tank/Overguard Tank/Hybrid Tank) that this build can be
// manually compared against. Nothing here infers or auto-labels an
// archetype -- that stays A3's job (see this session's scoping
// discussion) -- picking a profile to compare against is an explicit
// per-build choice, stored in wf_user.survivability_goals along with an
// optional manual goal override. Field-tested results already have a
// home (wf_user.build_tests, D.6, shipped) and aren't duplicated here.
//
// v1, informational only, same as the Loadout tab's capacity math --
// nothing here blocks anything. Deliberately narrow scope: see
// utils/survivability.js's header comment for exactly what is and isn't
// counted, and the caveat block rendered below for the human-readable
// version of the same list.
// ============================================================================

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SPECIAL_SLOTS = ['aura', 'exilus'];

const METRIC_LABEL = { effective_health: 'Effective Health', effective_shield: 'Effective Shield' };

function getShardBonusTexts(frame) {
  const slots = frame.shard_slots;
  if (!slots) return [];
  return [1, 2, 3, 4, 5].map(i => slots[`shard_${i}_bonus`]).filter(Boolean);
}

export default function SurvivabilityTab({ frame, color }) {
  const [baseStats, setBaseStats] = useState(null);
  const [equippedMods, setEquippedMods] = useState([]); // [{ mod, rank }]
  const [profiles, setProfiles] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [profilesRes, goalRes] = await Promise.all([
        wfBase.from('survivability_profiles').select('*').order('name'),
        wfUser.from('survivability_goals').select('*').eq('my_frame_id', frame.my_frame_id).maybeSingle(),
      ]);

      if (cancelled) return;

      if (profilesRes.error || goalRes.error) {
        console.error('Failed to load Survivability profile data:', profilesRes.error || goalRes.error);
        setError('Could not load Survivability data.');
        setLoading(false);
        return;
      }

      setProfiles(profilesRes.data || []);
      setGoal(goalRes.data || null);

      if (!frame.warframe_id) {
        setBaseStats(null);
        setEquippedMods([]);
        setLoading(false);
        return;
      }

      const [wfRes, slotsRes] = await Promise.all([
        wfBase.from('warframes').select('warframe_id, health, shield, armor, energy, sprint_speed').eq('warframe_id', frame.warframe_id).maybeSingle(),
        wfUser.from('loadout_slots').select('slot_position, mod_id').eq('my_frame_id', frame.my_frame_id).eq('equipment_type', 'Warframe'),
      ]);

      if (cancelled) return;

      if (wfRes.error || slotsRes.error) {
        console.error('Failed to load Survivability data:', wfRes.error || slotsRes.error);
        setError('Could not load Survivability data.');
        setLoading(false);
        return;
      }

      setBaseStats(wfRes.data);

      const relevantSlots = (slotsRes.data || []).filter(
        s => s.mod_id && (NUMBERED_SLOTS.includes(s.slot_position) || SPECIAL_SLOTS.includes(s.slot_position))
      );
      const modIds = relevantSlots.map(s => s.mod_id);

      if (modIds.length === 0) {
        setEquippedMods([]);
        setLoading(false);
        return;
      }

      const [modsRes, invRes] = await Promise.all([
        wfBase.from('mods').select('mod_id, name, raw_json').in('mod_id', modIds),
        wfUser.from('mod_inventory').select('mod_id, owned_rank').in('mod_id', modIds),
      ]);

      if (cancelled) return;

      if (modsRes.error || invRes.error) {
        console.error('Failed to load equipped mods:', modsRes.error || invRes.error);
        setError('Could not load equipped mods.');
        setLoading(false);
        return;
      }

      const modsById = new Map((modsRes.data || []).map(m => [m.mod_id, m]));
      const rankById = new Map((invRes.data || []).map(r => [r.mod_id, r.owned_rank]));

      setEquippedMods(
        relevantSlots
          .map(s => ({ mod: modsById.get(s.mod_id), rank: rankById.get(s.mod_id) ?? 0 }))
          .filter(e => e.mod)
      );
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [frame.my_frame_id, frame.warframe_id]);

  const shardBonusTexts = useMemo(() => getShardBonusTexts(frame), [frame]);

  const result = useMemo(() => {
    if (!baseStats) return null;
    return computeResilience({ baseStats, equippedMods, shardBonusTexts });
  }, [baseStats, equippedMods, shardBonusTexts]);

  async function saveGoal(patch) {
    const next = {
      my_frame_id: frame.my_frame_id,
      target_profile_id: goal?.target_profile_id ?? null,
      target_effective_health: goal?.target_effective_health ?? null,
      target_effective_shield: goal?.target_effective_shield ?? null,
      notes: goal?.notes ?? null,
      ...patch,
    };

    setGoal(next);

    const { data, error: upsertError } = await wfUser
      .from('survivability_goals')
      .upsert(next, { onConflict: 'my_frame_id' })
      .select()
      .single();

    if (upsertError) { console.error('Failed to save Survivability goal:', upsertError); return; }
    setGoal(data);
  }

  const selectedProfile = useMemo(
    () => profiles.find(p => p.profile_id === goal?.target_profile_id) ?? null,
    [profiles, goal]
  );

  const benchmarkTier = useMemo(
    () => (selectedProfile && result ? pickBenchmarkTier(selectedProfile.benchmark_tiers, result) : null),
    [selectedProfile, result]
  );

  if (loading) {
    return <p style={{ color: COLOR.mutedInk }}>Loading Survivability...</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!frame.warframe_id) {
    return (
      <Panel accent={color}>
        <p style={{ color: COLOR.mutedInk }}>Assign a Warframe on the Identity tab first.</p>
      </Panel>
    );
  }

  if (!baseStats || baseStats.health == null) {
    return (
      <Panel accent={color}>
        <p style={{ color: COLOR.mutedInk }}>No base stats on file for this Warframe yet.</p>
      </Panel>
    );
  }

  return (
    <div>
      <Panel accent={color} className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color }}>Resilience</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl p-4" style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}` }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.mutedInk }}>Effective Health</p>
            <p className="text-2xl font-black" style={{ color: COLOR.ink }}>{result.effectiveHealth}</p>
            <p className="text-xs mt-1" style={{ color: COLOR.mutedInk }}>{result.totalHealth} HP @ {result.totalArmor} Armor</p>
          </div>

          <div className="rounded-xl p-4" style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}` }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.mutedInk }}>Effective Shield</p>
            <p className="text-2xl font-black" style={{ color: COLOR.ink }}>{result.effectiveShield}</p>
            <p className="text-xs mt-1" style={{ color: COLOR.mutedInk }}>No armor mitigation</p>
          </div>

          <div className="rounded-xl p-4" style={{ background: `${color}18`, border: `1px solid ${color}55` }}>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color }}>Total Effective Pool</p>
            <p className="text-2xl font-black" style={{ color }}>{result.totalEffectivePool}</p>
            <p className="text-xs mt-1" style={{ color: COLOR.mutedInk }}>Health + Shield, summed</p>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: COLOR.mutedInk }}>
          Effective Health = Health x (Armor + 300) / 300, the real in-game armor mitigation curve. Shields take no armor mitigation.
          Only flat or plain percentage Health/Shield/Armor bonuses are counted -- conditional or proc-based defensive effects
          (Adaptation, Rolling Guard, Quick Thinking, Brief Respite, etc.), Overguard, Energy, and Arcanes are not reflected here.
        </p>
      </Panel>

      <Panel accent={color} className="mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color }}>Compared Against</h3>

        <select
          value={goal?.target_profile_id ?? ''}
          onChange={e => saveGoal({ target_profile_id: e.target.value ? Number(e.target.value) : null })}
          className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm outline-none mb-4"
          style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
        >
          <option value="">No profile selected</option>
          {profiles.map(p => (
            <option key={p.profile_id} value={p.profile_id}>{p.name}</option>
          ))}
        </select>

        {selectedProfile && (
          <div className="space-y-3 mb-4">
            {benchmarkTier ? (
              <span
                className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg"
                style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
              >
                Benchmark: {benchmarkTier}
              </span>
            ) : (
              <p className="text-xs italic" style={{ color: COLOR.mutedInk }}>
                {selectedProfile.benchmark_tiers ? 'Below this profile’s lowest benchmark tier.' : 'No benchmark tiers authored yet for this profile.'}
              </p>
            )}

            {selectedProfile.defensive_layers && (
              <p className="text-sm leading-relaxed" style={{ color: COLOR.ink }}>{selectedProfile.defensive_layers}</p>
            )}

            {selectedProfile.relevant_metrics?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {selectedProfile.relevant_metrics.map(m => (
                  <span
                    key={m}
                    className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
                    style={{ background: COLOR.surface2, color: COLOR.mutedInk, border: `1px solid ${COLOR.border}` }}
                  >
                    {METRIC_LABEL[m] ?? m}
                  </span>
                ))}
              </div>
            )}

            {selectedProfile.dependencies && (
              <p className="text-xs leading-relaxed italic" style={{ color: COLOR.mutedInk }}>{selectedProfile.dependencies}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.mutedInk }}>Goal: Effective Health</p>
            <input
              type="number"
              min="0"
              value={goal?.target_effective_health ?? ''}
              onChange={e => saveGoal({ target_effective_health: e.target.value ? Number(e.target.value) : null })}
              placeholder="No goal set"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
            />
            {goal?.target_effective_health != null && (
              <p className="text-xs mt-1" style={{ color: result.effectiveHealth >= goal.target_effective_health ? COLOR.success : COLOR.mutedInk }}>
                {result.effectiveHealth - goal.target_effective_health >= 0 ? '+' : ''}{result.effectiveHealth - goal.target_effective_health} vs goal
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.mutedInk }}>Goal: Effective Shield</p>
            <input
              type="number"
              min="0"
              value={goal?.target_effective_shield ?? ''}
              onChange={e => saveGoal({ target_effective_shield: e.target.value ? Number(e.target.value) : null })}
              placeholder="No goal set"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
            />
            {goal?.target_effective_shield != null && (
              <p className="text-xs mt-1" style={{ color: result.effectiveShield >= goal.target_effective_shield ? COLOR.success : COLOR.mutedInk }}>
                {result.effectiveShield - goal.target_effective_shield >= 0 ? '+' : ''}{result.effectiveShield - goal.target_effective_shield} vs goal
              </p>
            )}
          </div>
        </div>
      </Panel>

      <Panel accent={color}>
        <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color }}>Base Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4" style={{ color: COLOR.ink }}>
          <p><span style={{ color: COLOR.mutedInk }}>Health</span> {result.baseHealth}</p>
          <p><span style={{ color: COLOR.mutedInk }}>Shield</span> {result.baseShield}</p>
          <p><span style={{ color: COLOR.mutedInk }}>Armor</span> {result.baseArmor}</p>
          <p><span style={{ color: COLOR.mutedInk }}>Energy</span> {baseStats.energy}</p>
        </div>

        {(result.countedMods.length > 0 || result.countedShards.length > 0) && (
          <>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color }}>Counted Toward Resilience</h3>
            <div className="space-y-1 text-sm">
              {result.countedMods.map((m, i) => (
                <p key={`mod-${i}`} style={{ color: COLOR.ink }}>{m.name} <span style={{ color: COLOR.mutedInk }}>({m.text})</span></p>
              ))}
              {result.countedShards.map((s, i) => (
                <p key={`shard-${i}`} style={{ color: COLOR.ink }}>Archon Shard <span style={{ color: COLOR.mutedInk }}>({s.text})</span></p>
              ))}
            </div>
          </>
        )}

        {result.countedMods.length === 0 && result.countedShards.length === 0 && (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>
            No equipped Health/Shield/Armor mods or shards found for this build's Warframe piece.
          </p>
        )}
      </Panel>
    </div>
  );
}
