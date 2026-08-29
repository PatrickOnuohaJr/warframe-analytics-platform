import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import CompanionEquipmentSection from './CompanionEquipmentSection';
import useCompanions from '../hooks/useCompanions';
import useCompanionWeapons from '../hooks/useCompanionWeapons';
import { COLOR } from '../constants/theme';
import { CLAWS_COMPAT_NAMES } from '../utils/modMeta';

// ============================================================================
// CompanionTab.jsx (Companion tab -- Companion / Companion Weapon)
// ============================================================================
// Sibling to ModsLoadoutTab, same auto-save-on-change shape, but simpler:
// no Rivens, no Arcanes, no Incarnon, no Abilities -- a Companion piece is
// just an identity (free text into my_frames.companion/companion_weapon,
// same convention as primary_weapon etc.) plus a mod grid.
//
// Unlike the weapon pieces in ModsLoadoutTab (gated behind an existing
// Armory drag-drop assignment before their sub-tab even appears), Companion
// has no other UI surface that sets my_frames.companion/companion_weapon --
// so both sub-tabs are always visible, and identity is set right here via
// WeaponInput, same as Warframe's identity lives on the Identity tab.
//
// Mod split: wf_base.mods rows with category='Companion' cover BOTH pieces
// (WFCD's "Companion Mod" and "Posture Mod" types both land here) --
// compat_name is what actually distinguishes them. Claws-family compat
// names ('Claws' + the three breed-exclusive pools) are Companion Weapon
// mods; everything else (ROBOTIC/BEAST/Sentinel/breed-name exclusives) is
// Companion-body mods. Posture Mods carry is_aura=true (mechanically
// identical to a Warframe's Aura slot, confirmed against Patrick's live
// 60->70 capacity jump) and compat_name='Claws', so splitting the
// Claws-family pool further by is_aura separates numbered-slot weapon mods
// from the single Posture-slot pool. See DB/Seeds/seed_mods.py:23-40,
// 287-304 and DB/Migrations/20260828_add_companion_schema.sql.
//
// Sentinels have NO dedicated Precept slot (corrected in Session 014 --
// Precept mods like Vacuum/Guardian/Sacrifice just occupy the Companion's
// regular numbered slots), so the Companion piece has no special slot at
// all -- just 8 numbered slots, same capacity math as Primary/Secondary.
// ============================================================================

const EQUIPMENT_TYPES = ['Companion', 'CompanionWeapon'];
const IDENTITY_FIELD = { Companion: 'companion', CompanionWeapon: 'companion_weapon' };
const LABEL = { Companion: 'Companion', CompanionWeapon: 'Companion Weapon' };

function humanize(slug) {
  if (!slug) return '';
  return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function CompanionTab({ frame, color, onSaved }) {
  const { companions } = useCompanions();
  const { companionWeapons } = useCompanionWeapons();
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState(new Map()); // mod_id -> { owned_rank }
  const [slots, setSlots] = useState([]); // raw loadout_slots rows for this frame
  const [meta, setMeta] = useState([]); // raw loadout_meta rows for this frame
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEquipment, setActiveEquipment] = useState('Companion');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [modsRes, invRes, slotsRes, metaRes] = await Promise.all([
        fetchAll(() =>
          wfBase.from('mods')
            .select('mod_id, name, category, polarity, base_drain, max_rank, is_aura, is_exilus, is_stance, compat_name, raw_json')
            .eq('category', 'Companion')
        ),
        wfUser.from('mod_inventory').select('mod_id, owned_rank'),
        wfUser.from('loadout_slots').select('*').eq('my_frame_id', frame.my_frame_id),
        wfUser.from('loadout_meta').select('*').eq('my_frame_id', frame.my_frame_id),
      ]);

      if (cancelled) return;

      if (modsRes.error || invRes.error || slotsRes.error || metaRes.error) {
        console.error('Failed to load Companion data:', modsRes.error || invRes.error || slotsRes.error || metaRes.error);
        setError('Could not load Companion data.');
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

  const ownedCompanionMods = useMemo(
    () => catalog.filter(m => owned.has(m.mod_id) && !CLAWS_COMPAT_NAMES.has(m.compat_name)),
    [catalog, owned]
  );
  const ownedWeaponMods = useMemo(
    () => catalog.filter(m => owned.has(m.mod_id) && CLAWS_COMPAT_NAMES.has(m.compat_name) && !m.is_aura),
    [catalog, owned]
  );
  const ownedPostureMods = useMemo(
    () => catalog.filter(m => owned.has(m.mod_id) && CLAWS_COMPAT_NAMES.has(m.compat_name) && m.is_aura),
    [catalog, owned]
  );

  const slotsByType = useMemo(() => {
    const map = new Map();
    EQUIPMENT_TYPES.forEach(type => map.set(type, new Map()));
    slots.forEach(s => {
      map.get(s.equipment_type)?.set(s.slot_position, { mod_id: s.mod_id, riven_id: s.riven_id, polarity: s.polarity });
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

  async function handleSetSlot(equipmentType, slotPosition, { mod_id, riven_id, polarity }) {
    setSlots(prev => {
      const next = prev.filter(s => !(s.equipment_type === equipmentType && s.slot_position === slotPosition));
      next.push({ my_frame_id: frame.my_frame_id, equipment_type: equipmentType, slot_position: slotPosition, mod_id, riven_id, polarity });
      return next;
    });

    const { error: upsertError } = await wfUser
      .from('loadout_slots')
      .upsert(
        { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, slot_position: slotPosition, mod_id, riven_id, polarity },
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
    return <p style={{ color: COLOR.mutedInk }}>Loading Companion...</p>;
  }

  const identityOptions = {
    // WeaponInput keys its dropdown rows off weapon_id ?? arcane_id --
    // neither exists on a companion row, so alias one in to avoid a
    // duplicate/undefined React key.
    Companion: companions.map(c => ({
      ...c,
      weapon_id: c.companion_id,
      category: 'Companion',
      weapon_type: humanize(c.companion_class),
    })),
    CompanionWeapon: companionWeapons.map(w => ({
      ...w,
      weapon_id: w.companion_weapon_id,
      category: 'CompanionWeapon',
      weapon_type: humanize(w.weapon_class),
    })),
  };

  const activeType = activeEquipment;

  return (
    <div>
      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="flex gap-2 mb-6">
        {EQUIPMENT_TYPES.map(type => (
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
            {frame[IDENTITY_FIELD[type]] || LABEL[type]}
          </button>
        ))}
      </div>

      <CompanionEquipmentSection
        key={activeType}
        equipmentType={activeType}
        displayName={frame[IDENTITY_FIELD[activeType]] || undefined}
        meta={metaByType.get(activeType)}
        slotsByPosition={slotsByType.get(activeType)}
        ownedMods={activeType === 'Companion' ? ownedCompanionMods : ownedWeaponMods}
        postureMods={ownedPostureMods}
        ownedByModId={owned}
        modsById={modsById}
        onSetMeta={patch => handleSetMeta(activeType, patch)}
        onSetSlot={(slotPosition, value) => handleSetSlot(activeType, slotPosition, value)}
        onSetRank={handleSetRank}
        accent={color}
        frame={frame}
        identityOptions={identityOptions[activeType]}
        onSaved={onSaved}
      />
    </div>
  );
}
