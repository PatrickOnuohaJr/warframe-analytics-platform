import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import useFrames from '../hooks/useFrames';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import ArmoryFrameRoster from '../components/ArmoryFrameRoster';
import AddWeaponToInventoryModal from '../components/AddWeaponToInventoryModal';
import { getWeaponTags } from '../utils/weaponTags';
import { COLOR } from '../constants/theme';

// ============================================================================
// ArmoryPage.jsx (D.1 — Armory)
// ============================================================================
// Real weapon-ownership tracking, separate from what's equipped on a build.
// wf_user.weapon_inventory (row = owned) is the source of truth for "do I
// own this"; my_frames' weapon-name columns are the source of truth for
// "where is it equipped" — this page cross-references both, live.
//
// Three features live here:
// - 3-Weapon Rule: a primary or melee weapon equipped on more than 3
//   warframes gets flagged. Secondary is exempt (Patrick's rule, not a
//   Warframe game mechanic — see project memory).
// - Auto-derived personality tags (utils/weaponTags.js), filterable.
// - Drag/drop reassignment: drag an owned weapon onto ArmoryFrameRoster's
//   slot boxes to set that build's weapon, category-gated so a melee
//   weapon can't be dropped on a primary slot.
// ============================================================================

const CATEGORY_FILTERS = ['All', 'Primary', 'Secondary', 'Melee'];

const SLOT_COLUMN = {
  Primary: 'primary_weapon',
  Secondary: 'secondary_weapon',
  Melee: 'melee_weapon',
};

export default function ArmoryPage() {
  const { frames, refetchFrames } = useFrames();

  const [catalog, setCatalog] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedWeapon, setDraggedWeapon] = useState(null);

  async function loadInventory() {
    setLoading(true);
    setError(null);

    const { data: invRows, error: invError } = await wfUser
      .from('weapon_inventory')
      .select('inventory_id, weapon_id');

    if (invError) {
      console.error('Failed to load weapon inventory:', invError);
      setError('Could not load your armory.');
      setLoading(false);
      return;
    }

    const { data: weaponRows, error: weaponsError } = await wfBase
      .from('weapons')
      .select('weapon_id, name, category, weapon_type, mastery_rank, raw_json')
      .in('category', ['Primary', 'Secondary', 'Melee'])
      .order('name', { ascending: true });

    if (weaponsError) {
      console.error('Failed to load weapon catalog:', weaponsError);
      setError('Could not load the weapon catalog.');
      setLoading(false);
      return;
    }

    setCatalog((weaponRows || []).filter(w => w.weapon_type !== 'Incarnon Genesis'));
    setOwnedIds(new Set((invRows || []).map(r => r.weapon_id)));
    setLoading(false);
  }

  useEffect(() => { loadInventory(); }, []);

  const ownedWeapons = useMemo(
    () => catalog.filter(w => ownedIds.has(w.weapon_id)),
    [catalog, ownedIds]
  );

  function getAllocations(weapon) {
    const column = SLOT_COLUMN[weapon.category];
    if (!column) return [];
    return frames.filter(f => f[column] === weapon.name);
  }

  const allTags = useMemo(() => {
    const set = new Set();
    ownedWeapons.forEach(w => getWeaponTags(w).forEach(t => set.add(t)));
    return [...set].sort();
  }, [ownedWeapons]);

  const visibleWeapons = useMemo(() => {
    return ownedWeapons.filter(w => {
      if (categoryFilter !== 'All' && w.category !== categoryFilter) return false;
      if (tagFilter && !getWeaponTags(w).includes(tagFilter)) return false;
      return true;
    });
  }, [ownedWeapons, categoryFilter, tagFilter]);

  async function handleRemove(weapon) {
    const confirmed = window.confirm(`Remove ${weapon.name} from your Armory?`);
    if (!confirmed) return;

    const { error: deleteError } = await wfUser
      .from('weapon_inventory')
      .delete()
      .eq('weapon_id', weapon.weapon_id);

    if (deleteError) {
      console.error('Failed to remove weapon:', deleteError);
      return;
    }

    setOwnedIds(prev => {
      const next = new Set(prev);
      next.delete(weapon.weapon_id);
      return next;
    });
  }

  async function handleDropWeapon(myFrameId, column, weaponName) {
    const { error: updateError } = await wfUser
      .from('my_frames')
      .update({ [column]: weaponName })
      .eq('my_frame_id', myFrameId);

    setDraggedWeapon(null);

    if (updateError) {
      console.error('Failed to assign weapon:', updateError);
      return;
    }

    refetchFrames();
  }

  if (loading) {
    return <p style={{ color: COLOR.mutedInk }}>Loading Armory...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold uppercase tracking-wide mb-2" style={{ color: COLOR.gold }}>
        Armory
      </h1>
      <p className="text-sm mb-6" style={{ color: COLOR.mutedInk }}>
        Weapons you own, where they're allocated, and the 3-Weapon Rule at a glance. Drag a weapon onto a frame's slot to assign it.
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-2">
              {CATEGORY_FILTERS.map(c => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className="rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors"
                  style={{
                    background: categoryFilter === c ? `${COLOR.gold}18` : COLOR.surface1,
                    border: `1px solid ${categoryFilter === c ? `${COLOR.gold}55` : COLOR.border}`,
                    color: categoryFilter === c ? COLOR.gold : COLOR.mutedInk,
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

            <Button variant="primary" color={COLOR.gold} onClick={() => setShowAddModal(true)}>
              + Add Weapon
            </Button>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setTagFilter(null)}
                className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
                style={{
                  background: !tagFilter ? `${COLOR.gold}22` : 'transparent',
                  color: !tagFilter ? COLOR.gold : COLOR.mutedInk,
                  border: `1px solid ${!tagFilter ? COLOR.gold : COLOR.border}`,
                }}
              >
                All Tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                  className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
                  style={{
                    background: tagFilter === tag ? `${COLOR.gold}22` : 'transparent',
                    color: tagFilter === tag ? COLOR.gold : COLOR.mutedInk,
                    border: `1px solid ${tagFilter === tag ? COLOR.gold : COLOR.border}`,
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {ownedWeapons.length === 0 && (
            <p style={{ color: COLOR.mutedInk }}>No weapons in your Armory yet. Add one to get started.</p>
          )}

          {ownedWeapons.length > 0 && visibleWeapons.length === 0 && (
            <p style={{ color: COLOR.mutedInk }}>No owned weapons match this filter.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleWeapons.map(weapon => {
              const allocations = getAllocations(weapon);
              const ruleApplies = weapon.category === 'Primary' || weapon.category === 'Melee';
              const ruleBroken = ruleApplies && allocations.length > 3;
              const tags = getWeaponTags(weapon);

              return (
                <Panel
                  key={weapon.weapon_id}
                  accent={ruleBroken ? '#E63946' : COLOR.gold}
                  draggable
                  onDragStart={() => setDraggedWeapon(weapon)}
                  onDragEnd={() => setDraggedWeapon(null)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold" style={{ color: COLOR.ink }}>{weapon.name}</p>
                      <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                        {weapon.category} · {weapon.weapon_type} · MR {weapon.mastery_rank ?? 0}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(weapon)}
                      className="text-xs"
                      style={{ color: '#F87171' }}
                    >
                      Remove
                    </button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ background: `${COLOR.gold}14`, color: COLOR.gold }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                    {allocations.length === 0
                      ? 'Not currently equipped'
                      : `Equipped on ${allocations.length} build${allocations.length === 1 ? '' : 's'}: ${allocations.map(f => f.display_name || f.warframe_name).join(', ')}`}
                  </p>

                  {ruleBroken && (
                    <p className="text-xs font-bold mt-1" style={{ color: '#E63946' }}>
                      ⚑ 3-Weapon Rule broken — on {allocations.length} warframes
                    </p>
                  )}
                </Panel>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: COLOR.mutedInk }}>
            Frame Roster — drop target
          </p>
          <ArmoryFrameRoster frames={frames} draggedWeapon={draggedWeapon} onDropWeapon={handleDropWeapon} />
        </div>
      </div>

      {showAddModal && (
        <AddWeaponToInventoryModal
          catalog={catalog}
          ownedIds={ownedIds}
          onClose={() => setShowAddModal(false)}
          onAdded={weapon => {
            setOwnedIds(prev => new Set(prev).add(weapon.weapon_id));
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
