import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import { fetchAll } from '../lib/fetchAll';
import CompanionEquipmentSection from './CompanionEquipmentSection';
import CompanionCopyModal from './CompanionCopyModal';
import CompanionPushModal from './CompanionPushModal';
import Button from './ui/Button';
import useCompanions from '../hooks/useCompanions';
import useCompanionWeapons from '../hooks/useCompanionWeapons';
import { COLOR } from '../constants/theme';
import { CLAWS_COMPAT_NAMES } from '../utils/modMeta';
import { CONFIG_SLOTS } from '../utils/companionCopy';

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
//
// Each piece has three mod configs (A/B/C, loadout_slots.config_slot). The
// identity (which companion) is shared across them; only the mods, slot
// polarities, forma count and catalyst differ. "Copy from..." replaces the
// active config with another build's/config's loadout, skipping mods the
// target companion can't take (see utils/companionCopy.js).
// ============================================================================

const EQUIPMENT_TYPES = ['Companion', 'CompanionWeapon'];
const IDENTITY_FIELD = { Companion: 'companion', CompanionWeapon: 'companion_weapon' };
const LABEL = { Companion: 'Companion', CompanionWeapon: 'Companion Weapon' };

function humanize(slug) {
  if (!slug) return '';
  return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Free-text name for the active config ("Fire rate", "Duplex Bond"). Saves
// when you leave the field; empty clears it.
function ConfigNameField({ value, onSave, accent }) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="flex items-center gap-2 mb-4 text-xs" style={{ color: COLOR.mutedInk }}>
      Name
      <input
        value={draft}
        maxLength={40}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() !== value) onSave(draft.trim()); }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        placeholder="e.g. Fire rate, Duplex Bond"
        className="w-64 rounded-lg px-3 py-1.5 text-sm outline-none"
        style={{ background: COLOR.surface2, border: `1px solid ${draft ? `${accent}55` : COLOR.border}`, color: COLOR.ink }}
      />
    </label>
  );
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
  const [activeConfig, setActiveConfig] = useState('A');
  const [copying, setCopying] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0); // bump to refetch after a copy

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
  }, [frame.my_frame_id, reloadKey]);

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
      if (s.config_slot !== activeConfig) return;
      map.get(s.equipment_type)?.set(s.slot_position, { mod_id: s.mod_id, riven_id: s.riven_id, polarity: s.polarity });
    });
    return map;
  }, [slots, activeConfig]);

  const metaByType = useMemo(() => {
    const map = new Map();
    EQUIPMENT_TYPES.forEach(type => map.set(type, { forma_count: 0, has_catalyst: false, config_name: null }));
    meta.forEach(m => {
      if (m.config_slot !== activeConfig) return;
      map.set(m.equipment_type, { forma_count: m.forma_count, has_catalyst: m.has_catalyst, config_name: m.config_name ?? null });
    });
    return map;
  }, [meta, activeConfig]);

  // Names given to each config of the active piece, for the tab labels.
  const configNames = useMemo(() => {
    const names = {};
    meta.forEach(m => {
      if (m.equipment_type === activeEquipment && m.config_name) names[m.config_slot] = m.config_name;
    });
    return names;
  }, [meta, activeEquipment]);

  async function handleSetSlot(equipmentType, slotPosition, { mod_id, riven_id, polarity }) {
    setSlots(prev => {
      const next = prev.filter(s => !(s.equipment_type === equipmentType && s.slot_position === slotPosition && s.config_slot === activeConfig));
      next.push({ my_frame_id: frame.my_frame_id, equipment_type: equipmentType, config_slot: activeConfig, slot_position: slotPosition, mod_id, riven_id, polarity });
      return next;
    });

    const { error: upsertError } = await wfUser
      .from('loadout_slots')
      .upsert(
        { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, config_slot: activeConfig, slot_position: slotPosition, mod_id, riven_id, polarity },
        { onConflict: 'my_frame_id,equipment_type,slot_position,config_slot' }
      );

    if (upsertError) console.error('Failed to save slot:', upsertError);
  }

  async function handleSetMeta(equipmentType, patch) {
    const current = metaByType.get(equipmentType);
    const next = { ...current, ...patch };

    setMeta(prev => {
      const rest = prev.filter(m => !(m.equipment_type === equipmentType && m.config_slot === activeConfig));
      return [...rest, { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, config_slot: activeConfig, ...next }];
    });

    const { error: upsertError } = await wfUser
      .from('loadout_meta')
      .upsert(
        { my_frame_id: frame.my_frame_id, equipment_type: equipmentType, config_slot: activeConfig, ...next },
        { onConflict: 'my_frame_id,equipment_type,config_slot' }
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

  // The target's class decides which mods may be copied onto it. Resolved
  // from the catalog by name; null (unset or not in the catalog) disables Copy.
  const identityName = frame[IDENTITY_FIELD[activeType]];
  const identityRow = identityOptions[activeType].find(o => o.name === identityName);
  const copyTarget = identityRow
    ? { name: identityRow.name, cls: activeType === 'Companion' ? identityRow.companion_class : identityRow.weapon_class }
    : null;

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

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {CONFIG_SLOTS.map(cfg => (
          <button
            key={cfg}
            onClick={() => setActiveConfig(cfg)}
            className="py-1.5 px-4 rounded-lg text-xs font-bold tracking-widest transition-colors"
            style={{
              background: activeConfig === cfg ? `${color}18` : COLOR.surface2,
              border: `1px solid ${activeConfig === cfg ? `${color}55` : COLOR.border}`,
              color: activeConfig === cfg ? color : COLOR.mutedInk,
            }}
          >
            Config {cfg}{configNames[cfg] ? ` · ${configNames[cfg]}` : ''}
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setCopying(true)} disabled={!copyTarget}>
          Copy from...
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setPushing(true)} disabled={!copyTarget}>
          Copy to other builds...
        </Button>
        {!copyTarget && (
          <span className="text-xs" style={{ color: COLOR.agedInk }}>
            Pick a {LABEL[activeType].toLowerCase()} below to enable copying.
          </span>
        )}
      </div>

      <ConfigNameField
        key={`${activeType}-${activeConfig}-${metaByType.get(activeType).config_name ?? ''}`}
        value={metaByType.get(activeType).config_name ?? ''}
        onSave={name => handleSetMeta(activeType, { config_name: name || null })}
        accent={color}
      />

      <CompanionEquipmentSection
        key={`${activeType}-${activeConfig}`}
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

      {pushing && copyTarget && (
        <CompanionPushModal
          frame={frame}
          equipmentType={activeType}
          config={activeConfig}
          sourceRows={[...slotsByType.get(activeType)].map(([slot_position, v]) => ({ slot_position, mod_id: v.mod_id, polarity: v.polarity }))}
          sourceMeta={metaByType.get(activeType)}
          modsById={modsById}
          classFor={name => {
            const row = identityOptions[activeType].find(o => o.name === name);
            return row ? (activeType === 'Companion' ? row.companion_class : row.weapon_class) : null;
          }}
          onApplied={() => { setPushing(false); setReloadKey(k => k + 1); }}
          onClose={() => setPushing(false)}
        />
      )}

      {copying && copyTarget && (
        <CompanionCopyModal
          frame={frame}
          equipmentType={activeType}
          config={activeConfig}
          target={copyTarget}
          modsById={modsById}
          onApplied={() => { setCopying(false); setReloadKey(k => k + 1); }}
          onClose={() => setCopying(false)}
        />
      )}
    </div>
  );
}
