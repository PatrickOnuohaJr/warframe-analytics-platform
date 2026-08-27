import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import LoadoutEquipmentSection from './LoadoutEquipmentSection';
import useArcanes from '../hooks/useArcanes';
import { COLOR } from '../constants/theme';

// ============================================================================
// ModsLoadoutTab.jsx (Loadout tab -- Warframe/Primary/Secondary/Melee)
// ============================================================================
// Rendered inside BuildDetailOverlay when activeTab === 'loadout'. One
// equipment piece at a time (sub-tab bar below), each panel combining:
// weapon/Arcane pickers + Incarnon + unique-trait line (weapon pieces) or
// Arcane 1/2 + Abilities/Helminth (Warframe piece), and always the 8-slot
// mod grid + aura (Warframe only) + exilus, forma count, catalyst/reactor
// toggle, and live capacity/drain math (utils/modCapacity.js). Mod grid is
// informational only -- nothing here blocks an over-budget loadout.
//
// Everything auto-saves on change (mods directly here, weapon/Arcane/
// Abilities fields via LoadoutEquipmentSection/AbilitiesEditor) -- no
// separate edit modal or Save button, per Patrick's "click it and edit it
// right there" direction. This tab used to be Mods-only; Arsenal (weapon+
// Arcane editing) and Abilities (base kit + Helminth) were separate tabs
// that opened separate modals -- both folded in here so editing one piece
// of a build doesn't mean bouncing between three UI surfaces.
//
// No Mastery Rank input here on purpose: its only mod-capacity effect is
// a minimum floor while an item is still leveling up from rank 0, which
// doesn't apply once a piece is at max rank -- every build tracked here
// is. Verified against Patrick's real Frost Prime (see modCapacity.js).
//
// loadout_slots only gets a row once a slot is actually touched (mod or
// polarity set), not pre-seeded for all 60 frames x 4 pieces x 10 slots --
// untouched slots are rendered from a default { mod_id: null, polarity:
// null } and only written on first change.
// ============================================================================

const EQUIPMENT_TYPES = ['Warframe', 'Primary', 'Secondary', 'Melee'];

// Maps each weapon equipment type to the column on my_frames holding the
// actual weapon name -- a frame with that slot unequipped has no sub-tab
// to mod at all, since there's nothing there to put mods on.
const WEAPON_FIELD = { Primary: 'primary_weapon', Secondary: 'secondary_weapon', Melee: 'melee_weapon' };

export default function ModsLoadoutTab({ frame, frames, weapons, color, onSaved }) {
  const { arcanes } = useArcanes();
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState(new Map()); // mod_id -> { owned_rank }
  const [slots, setSlots] = useState([]); // raw loadout_slots rows for this frame
  const [meta, setMeta] = useState([]); // raw loadout_meta rows for this frame
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEquipment, setActiveEquipment] = useState('Warframe');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [modsRes, invRes, slotsRes, metaRes] = await Promise.all([
        // Paged -- the mod catalog is past PostgREST's 1000-row default
        // cap, which silently truncates (see lib/fetchAll.js).
        fetchAll(() =>
          wfBase.from('mods').select('mod_id, name, category, polarity, base_drain, max_rank, is_aura, is_exilus, raw_json')
        ),
        wfUser.from('mod_inventory').select('mod_id, owned_rank'),
        wfUser.from('loadout_slots').select('*').eq('my_frame_id', frame.my_frame_id),
        wfUser.from('loadout_meta').select('*').eq('my_frame_id', frame.my_frame_id),
      ]);

      if (cancelled) return;

      if (modsRes.error || invRes.error || slotsRes.error || metaRes.error) {
        console.error('Failed to load loadout data:', modsRes.error || invRes.error || slotsRes.error || metaRes.error);
        setError('Could not load loadout data.');
        setLoading(false);
        return;
      }

      setCatalog(modsRes.data || []);
      setOwned(new Map((invRes.data || []).map(r => [r.mod_id, r])));
      setSlots(slotsRes.data || []);
      setMeta(metaRes.data || []);
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

  if (loading) {
    return <p style={{ color: COLOR.mutedInk }}>Loading Loadout...</p>;
  }

  const visibleTypes = EQUIPMENT_TYPES.filter(type => type === 'Warframe' || frame[WEAPON_FIELD[type]]);
  const activeType = visibleTypes.includes(activeEquipment) ? activeEquipment : 'Warframe';

  return (
    <div>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="flex gap-2 mb-6">
        {visibleTypes.map(type => (
          <button
            key={type}
            onClick={() => setActiveEquipment(type)}
            className="py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: activeType === type ? `${color}18` : COLOR.surface2,
              border: `1px solid ${activeType === type ? `${color}55` : COLOR.border}`,
              color: activeType === type ? color : COLOR.mutedInk,
            }}
          >
            {type === 'Warframe' ? 'Warframe' : frame[WEAPON_FIELD[type]]}
          </button>
        ))}
      </div>

      <LoadoutEquipmentSection
        key={activeType}
        equipmentType={activeType}
        displayName={activeType === 'Warframe' ? undefined : frame[WEAPON_FIELD[activeType]]}
        meta={metaByType.get(activeType)}
        slotsByPosition={slotsByType.get(activeType)}
        ownedMods={ownedByCategory.get(activeType)}
        auraMods={ownedAuraMods}
        ownedByModId={owned}
        modsById={modsById}
        onSetMeta={patch => handleSetMeta(activeType, patch)}
        onSetSlot={(slotPosition, value) => handleSetSlot(activeType, slotPosition, value)}
        onSetRank={handleSetRank}
        accent={color}
        frame={frame}
        frames={frames}
        weapons={weapons}
        arcanes={arcanes}
        onSaved={onSaved}
      />
    </div>
  );
}
