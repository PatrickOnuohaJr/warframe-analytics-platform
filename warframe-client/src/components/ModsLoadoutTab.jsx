import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import LoadoutEquipmentSection from './LoadoutEquipmentSection';
import { COLOR } from '../constants/theme';

// ============================================================================
// ModsLoadoutTab.jsx (Mods Inventory & DB -- loadout builder slice)
// ============================================================================
// Rendered inside BuildDetailOverlay when activeTab === 'mods'. Per build:
// 4 equipment pieces (Warframe/Primary/Secondary/Melee), each with an
// 8-slot grid + aura (Warframe only) + exilus, forma count, catalyst/
// reactor toggle, and live capacity/drain math (utils/modCapacity.js).
// Informational only -- nothing here blocks an over-budget loadout.
//
// loadout_slots only gets a row once a slot is actually touched (mod or
// polarity set), not pre-seeded for all 60 frames x 4 pieces x 10 slots --
// untouched slots are rendered from a default { mod_id: null, polarity:
// null } and only written on first change.
// ============================================================================

const EQUIPMENT_TYPES = ['Warframe', 'Primary', 'Secondary', 'Melee'];

export default function ModsLoadoutTab({ frame, color }) {
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState(new Map()); // mod_id -> { owned_rank }
  const [slots, setSlots] = useState([]); // raw loadout_slots rows for this frame
  const [meta, setMeta] = useState([]); // raw loadout_meta rows for this frame
  const [masteryRank, setMasteryRankState] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [modsRes, invRes, slotsRes, metaRes, profileRes] = await Promise.all([
        // Paged -- the mod catalog is past PostgREST's 1000-row default
        // cap, which silently truncates (see lib/fetchAll.js).
        fetchAll(() =>
          wfBase.from('mods').select('mod_id, name, category, polarity, base_drain, max_rank, is_aura, is_exilus, raw_json')
        ),
        wfUser.from('mod_inventory').select('mod_id, owned_rank'),
        wfUser.from('loadout_slots').select('*').eq('my_frame_id', frame.my_frame_id),
        wfUser.from('loadout_meta').select('*').eq('my_frame_id', frame.my_frame_id),
        wfUser.from('player_profile').select('mastery_rank').eq('profile_id', 1).single(),
      ]);

      if (cancelled) return;

      if (modsRes.error || invRes.error || slotsRes.error || metaRes.error) {
        console.error('Failed to load loadout data:', modsRes.error || invRes.error || slotsRes.error || metaRes.error);
        setError('Could not load loadout data.');
        setLoading(false);
        return;
      }

      // player_profile may not exist yet if the migration hasn't been run
      // -- degrade to Mastery Rank 0 rather than failing the whole tab.
      if (profileRes.error) {
        console.warn('player_profile not available yet, defaulting Mastery Rank to 0:', profileRes.error);
      }

      setCatalog(modsRes.data || []);
      setOwned(new Map((invRes.data || []).map(r => [r.mod_id, r])));
      setSlots(slotsRes.data || []);
      setMeta(metaRes.data || []);
      setMasteryRankState(profileRes.data?.mastery_rank ?? 0);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [frame.my_frame_id]);

  const modsById = useMemo(() => new Map(catalog.map(m => [m.mod_id, m])), [catalog]);

  const ownedByCategory = useMemo(() => {
    const map = new Map();
    EQUIPMENT_TYPES.forEach(type => map.set(type, []));
    catalog.forEach(m => {
      if (!owned.has(m.mod_id) || m.is_aura) return;
      if (map.has(m.category)) map.get(m.category).push(m);
    });
    return map;
  }, [catalog, owned]);

  const ownedAuraMods = useMemo(
    () => catalog.filter(m => owned.has(m.mod_id) && m.is_aura),
    [catalog, owned]
  );

  const slotsByType = useMemo(() => {
    const map = new Map();
    EQUIPMENT_TYPES.forEach(type => map.set(type, new Map()));
    slots.forEach(s => {
      map.get(s.equipment_type)?.set(s.slot_position, { mod_id: s.mod_id, polarity: s.polarity });
    });
    return map;
  }, [slots]);

  const metaByType = useMemo(() => {
    const map = new Map();
    EQUIPMENT_TYPES.forEach(type => map.set(type, { forma_count: 0, has_catalyst: false }));
    meta.forEach(m => {
      map.set(m.equipment_type, { forma_count: m.forma_count, has_catalyst: m.has_catalyst });
    });
    return map;
  }, [meta]);

  async function handleSetSlot(equipmentType, slotPosition, { mod_id, polarity }) {
    setSlots(prev => {
      const next = prev.filter(s => !(s.equipment_type === equipmentType && s.slot_position === slotPosition));
      next.push({ my_frame_id: frame.my_frame_id, equipment_type: equipmentType, slot_position: slotPosition, mod_id, polarity });
      return next;
    });

    const { error: upsertError } = await wfUser
      .from('loadout_slots')
      .upsert(
        { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, slot_position: slotPosition, mod_id, polarity },
        { onConflict: 'my_frame_id,equipment_type,slot_position' }
      );

    if (upsertError) console.error('Failed to save slot:', upsertError);
  }

  async function handleSetMeta(equipmentType, patch) {
    const current = metaByType.get(equipmentType);
    const next = { ...current, ...patch };

    setMeta(prev => {
      const rest = prev.filter(m => m.equipment_type !== equipmentType);
      return [...rest, { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, ...next }];
    });

    const { error: upsertError } = await wfUser
      .from('loadout_meta')
      .upsert(
        { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, ...next },
        { onConflict: 'my_frame_id,equipment_type' }
      );

    if (upsertError) console.error('Failed to save loadout meta:', upsertError);
  }

  // A mod's rank belongs to the mod itself (mod_inventory), not to the
  // slot -- ranking one up here raises it everywhere it's equipped, same
  // as fusing the physical card in-game does.
  function handleSetRank(modId, nextRank) {
    const current = owned.get(modId);
    if (!current || current.owned_rank === nextRank) return;

    setOwned(prev => {
      const next = new Map(prev);
      next.set(modId, { ...current, owned_rank: nextRank });
      return next;
    });

    wfUser
      .from('mod_inventory')
      .update({ owned_rank: nextRank })
      .eq('mod_id', modId)
      .then(({ error: updateError }) => {
        if (updateError) console.error('Failed to update mod rank:', updateError);
      });
  }

  async function handleSetMasteryRank(value) {
    const clamped = Math.max(0, Math.min(999, value));
    setMasteryRankState(clamped);

    const { error: upsertError } = await wfUser
      .from('player_profile')
      .upsert({ profile_id: 1, mastery_rank: clamped }, { onConflict: 'profile_id' });

    if (upsertError) console.error('Failed to save Mastery Rank:', upsertError);
  }

  if (loading) {
    return <p style={{ color: COLOR.mutedInk }}>Loading Loadout...</p>;
  }

  return (
    <div>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs uppercase tracking-widest" style={{ color: COLOR.mutedInk }}>
          Mastery Rank
        </label>
        <input
          type="number"
          min="0"
          max="999"
          value={masteryRank}
          onChange={e => handleSetMasteryRank(Number(e.target.value) || 0)}
          className="w-20 rounded-lg border px-2 py-1 text-sm outline-none"
          style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
        />
        <span className="text-xs" style={{ color: COLOR.mutedInk }}>
          (applies everywhere -- one value for your account, not per-build)
        </span>
      </div>

      {EQUIPMENT_TYPES.map(type => (
        <LoadoutEquipmentSection
          key={type}
          equipmentType={type}
          meta={metaByType.get(type)}
          slotsByPosition={slotsByType.get(type)}
          ownedMods={ownedByCategory.get(type)}
          auraMods={ownedAuraMods}
          ownedByModId={owned}
          modsById={modsById}
          masteryRank={masteryRank}
          onSetMeta={patch => handleSetMeta(type, patch)}
          onSetSlot={(slotPosition, value) => handleSetSlot(type, slotPosition, value)}
          onSetRank={handleSetRank}
          accent={color}
        />
      ))}
    </div>
  );
}
