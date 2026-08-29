import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import Panel from './ui/Panel';
import { computeResilience } from '../utils/survivability';
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
// v1, informational only, same as the Loadout tab's capacity math --
// nothing here blocks anything. Deliberately narrow scope: see
// utils/survivability.js's header comment for exactly what is and isn't
// counted, and the caveat block rendered below for the human-readable
// version of the same list.
// ============================================================================

const NUMBERED_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SPECIAL_SLOTS = ['aura', 'exilus'];

function getShardBonusTexts(frame) {
  const slots = frame.shard_slots;
  if (!slots) return [];
  return [1, 2, 3, 4, 5].map(i => slots[`shard_${i}_bonus`]).filter(Boolean);
}

export default function SurvivabilityTab({ frame, color }) {
  const [baseStats, setBaseStats] = useState(null);
  const [equippedMods, setEquippedMods] = useState([]); // [{ mod, rank }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

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
