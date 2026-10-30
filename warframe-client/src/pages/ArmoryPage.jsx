import { useState, useEffect, useMemo } from 'react';
import { wfBase, wfUser } from '../lib/supabase';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import ArmoryFrameRoster from '../components/ArmoryFrameRoster';
import ArmoryPickerModal from '../components/ArmoryPickerModal';
import AddWeaponToInventoryModal from '../components/AddWeaponToInventoryModal';
import WeaponTagEditor from '../components/WeaponTagEditor';
import ValenceCalculator from '../components/ValenceCalculator';
import { getWeaponTagEntries, applyCustomTags, TAG_GROUPS } from '../utils/weaponTags';
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

export default function ArmoryPage({ frames, refetchFrames }) {
  const [catalog, setCatalog] = useState([]);
  const [ownedIds, setOwnedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  // Selected tags combine with AND: Beam + High Fire Rate = beams that are also fast.
  const [selectedTags, setSelectedTags] = useState([]);
  // 'owned' = your Armory; 'all' = the whole weapon catalog, owned or not.
  const [scope, setScope] = useState('owned');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showValence, setShowValence] = useState(false);
  const [weaponQuery, setWeaponQuery] = useState('');
  const [draggedWeapon, setDraggedWeapon] = useState(null);
  // Set while a weapon is dragged OUT of a build's slot (not from the shelf):
  // { frameId, column, name, category }. Dropping it on the shelf removes it.
  const [dragSource, setDragSource] = useState(null);
  // Undo history for weapon assignments, newest last. Each entry holds the
  // slots it changed and what they held before. Lives only until the page
  // reloads; wf_user.change_history keeps the long-term record.
  const [undoStack, setUndoStack] = useState([]);
  // Tap-to-assign picker: { weapon } = choose a build for this weapon;
  // { frame, slot } = choose a weapon for this build's slot.
  const [picker, setPicker] = useState(null);
  // Your saved tag changes (wf_user.weapon_tags), and which weapon's editor is open.
  const [tagRows, setTagRows] = useState([]);
  const [tagEditWeapon, setTagEditWeapon] = useState(null);

  async function loadTagRows() {
    const { data, error: tagError } = await wfUser.from('weapon_tags').select('weapon_id, tag, hidden');
    // Missing table (migration not run yet) just means no custom tags.
    if (tagError) console.error('Failed to load weapon tags:', tagError);
    setTagRows(data || []);
  }

  async function loadInventory() {

    const { data: invRows, error: invError } = await wfUser
      .from('weapon_inventory')
      .select('inventory_id, weapon_id');

    setError(null);

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
    await loadTagRows();
    setLoading(false);
  }

  useEffect(() => {
    // Database synchronization: state updates occur after the awaited response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory();
    // Runs once on mount; loadInventory is redefined each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ownedWeapons = useMemo(
    () => catalog.filter(w => ownedIds.has(w.weapon_id)),
    [catalog, ownedIds]
  );

  function getAllocations(weapon) {
    const column = SLOT_COLUMN[weapon.category];
    if (!column) return [];
    return frames.filter(f => f[column] === weapon.name);
  }

  const tagRowsByWeapon = useMemo(() => {
    const map = new Map();
    tagRows.forEach(r => map.set(r.weapon_id, [...(map.get(r.weapon_id) || []), r]));
    return map;
  }, [tagRows]);

  // Automatic tags with your saved changes layered on top.
  function tagEntriesFor(weapon) {
    return applyCustomTags(getWeaponTagEntries(weapon), tagRowsByWeapon.get(weapon.weapon_id) || []);
  }

  // Custom tags already used anywhere, offered again when tagging another weapon.
  const customVocabulary = useMemo(
    () => [...new Set(tagRows.filter(r => !r.hidden).map(r => r.tag))].sort(),
    [tagRows]
  );

  async function saveTagRow(weapon, tag, hidden) {
    const { error: e } = await wfUser
      .from('weapon_tags')
      .upsert({ weapon_id: weapon.weapon_id, tag, hidden }, { onConflict: 'weapon_id,tag' });
    if (e) { console.error('Failed to save tag:', e); window.alert('Could not save that tag. Has the weapon_tags migration been run?'); return; }
    await loadTagRows();
  }

  async function deleteTagRow(weapon, tag) {
    const { error: e } = await wfUser.from('weapon_tags').delete().eq('weapon_id', weapon.weapon_id).eq('tag', tag);
    if (e) { console.error('Failed to remove tag:', e); return; }
    await loadTagRows();
  }

  // Weapons in view before tag filtering: the chosen scope + category.
  const scopedWeapons = useMemo(() => {
    const pool = scope === 'owned'
      ? ownedWeapons
      : catalog.filter(w => w.weapon_type !== 'Zaw Component');
    const q = weaponQuery.trim().toLowerCase();
    return pool.filter(w =>
      (categoryFilter === 'All' || w.category === categoryFilter) &&
      (!q || `${w.name} ${w.weapon_type ?? ''}`.toLowerCase().includes(q))
    );
  }, [scope, ownedWeapons, catalog, categoryFilter, weaponQuery]);

  // Chips for every tag present in view, grouped, most-used first.
  const tagGroups = useMemo(() => {
    const counts = new Map();
    scopedWeapons.forEach(w => {
      tagEntriesFor(w).forEach(({ tag, group }) => {
        const cur = counts.get(tag);
        if (cur) cur.count += 1;
        else counts.set(tag, { tag, group, count: 1 });
      });
    });
    return TAG_GROUPS.map(group => ({
      group,
      tags: [...counts.values()]
        .filter(t => t.group === group)
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    })).filter(g => g.tags.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedWeapons, tagRowsByWeapon]);

  const visibleWeapons = useMemo(() => {
    return scopedWeapons.filter(w => {
      const tags = tagEntriesFor(w).map(e => e.tag);
      return selectedTags.every(t => tags.includes(t));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedWeapons, selectedTags, tagRowsByWeapon]);

  function toggleTag(tag) {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  }

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

  function priorValue(frameId, column) {
    return frames.find(f => f.my_frame_id === frameId)?.[column] ?? null;
  }

  function pushUndo(label, changes) {
    setUndoStack(prev => [...prev.slice(-19), { label, changes }]);
  }

  async function handleUndo() {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    setUndoStack(prev => prev.slice(0, -1));

    const results = await Promise.all(last.changes.map(c =>
      wfUser.from('my_frames').update({ [c.column]: c.value }).eq('my_frame_id', c.frameId)
    ));
    const failed = results.find(r => r.error);
    if (failed) console.error('Undo failed:', failed.error);
    refetchFrames();
  }

  async function handleDropWeapon(myFrameId, column, weaponName) {
    // A weapon dragged out of another build's slot MOVES: that slot is
    // emptied, or takes this slot's old weapon if there was one (a swap).
    // Dragging from the shelf, or onto its own slot, just assigns.
    const source = dragSource && dragSource.frameId !== myFrameId ? dragSource : null;
    const previous = priorValue(myFrameId, column);

    const { error: updateError } = await wfUser
      .from('my_frames')
      .update({ [column]: weaponName })
      .eq('my_frame_id', myFrameId);

    setDraggedWeapon(null);
    setDragSource(null);
    setPicker(null);

    if (updateError) {
      console.error('Failed to assign weapon:', updateError);
      return;
    }

    const changes = [{ frameId: myFrameId, column, value: previous }];
    if (source && source.column === column) changes.push({ frameId: source.frameId, column: source.column, value: source.name });
    pushUndo(source ? `move ${weaponName}` : `assign ${weaponName}`, changes);

    if (source && source.column === column) {
      const { error: sourceError } = await wfUser
        .from('my_frames')
        .update({ [source.column]: previous })
        .eq('my_frame_id', source.frameId);
      if (sourceError) console.error('Failed to update the source slot:', sourceError);
    }

    refetchFrames();
  }

  // Empties one build's slot (the x button, or dragging it onto the shelf).
  async function handleClearSlot(myFrameId, column) {
    setDraggedWeapon(null);
    setDragSource(null);
    const before = priorValue(myFrameId, column);
    const { error: updateError } = await wfUser
      .from('my_frames')
      .update({ [column]: null })
      .eq('my_frame_id', myFrameId);

    if (updateError) {
      console.error('Failed to clear weapon slot:', updateError);
      return;
    }
    pushUndo(`remove ${before ?? 'weapon'}`, [{ frameId: myFrameId, column, value: before }]);
    refetchFrames();
  }

  // One weapon onto many builds in a single update. The 3-Weapon Rule only
  // binds primaries and melees, so warn (don't block) if this would push one
  // past three builds.
  async function handleBulkAssign(weapon, frameIds) {
    const column = SLOT_COLUMN[weapon.category];
    const already = new Set(getAllocations(weapon).map(f => f.my_frame_id));
    const total = new Set([...already, ...frameIds]).size;
    const ruleApplies = weapon.category === 'Primary' || weapon.category === 'Melee';
    if (ruleApplies && total > 3 && !window.confirm(
      `That puts ${weapon.name} on ${total} builds, past the 3-Weapon Rule. Assign anyway?`
    )) return;

    const before = frameIds.map(id => ({ frameId: id, column, value: priorValue(id, column) }));
    const { error: updateError } = await wfUser
      .from('my_frames')
      .update({ [column]: weapon.name })
      .in('my_frame_id', frameIds);

    setPicker(null);
    if (updateError) {
      console.error('Failed to bulk-assign weapon:', updateError);
      return;
    }
    pushUndo(`assign ${weapon.name} to ${frameIds.length} builds`, before);
    refetchFrames();
  }

  // Items for the open picker, plus what a pick does.
  function pickerConfig() {
    if (!picker) return null;

    if (picker.weapon) {
      const w = picker.weapon;
      const column = SLOT_COLUMN[w.category];
      return {
        title: `Assign ${w.name}`,
        subtitle: `Tick every build that should carry this ${w.category.toLowerCase()} weapon, then confirm.`,
        items: frames.map(f => ({
          id: f.my_frame_id,
          label: f.display_name || f.warframe_name,
          sublabel: [f.build_title, f.cultivation_school].filter(Boolean).join(' · '),
          note: f[column] === w.name ? 'Already equipped' : `Now: ${f[column] || 'empty'}`,
        })),
        onPick: id => handleDropWeapon(id, column, w.name),
        // Ticking several builds assigns them all at once (Epitaph Prime on 14 builds).
        onPickMany: ids => handleBulkAssign(w, ids),
        confirmLabel: 'Assign to builds',
      };
    }

    const { frame, slot } = picker;
    return {
      title: `${frame.display_name || frame.warframe_name}: ${slot.label}`,
      subtitle: `Pick an owned ${slot.label.toLowerCase()} weapon for this build.`,
      items: ownedWeapons
        .filter(w => w.category === slot.label)
        .map(w => ({
          id: w.name,
          label: w.name,
          sublabel: `${w.weapon_type} · MR ${w.mastery_rank ?? 0}`,
          note: frame[slot.column] === w.name ? 'Currently equipped' : undefined,
        })),
      onPick: name => handleDropWeapon(frame.my_frame_id, slot.column, name),
    };
  }

  if (loading) {
    return <p style={{ color: COLOR.mutedInk }}>Loading Armory...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="text-[22px] font-bold uppercase tracking-[0.08em] mb-1.5" style={{ color: COLOR.gold }}>
          Armory
        </h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={undoStack.length === 0}
            onClick={handleUndo}
            title={undoStack.length ? `Undo: ${undoStack[undoStack.length - 1].label}` : 'Nothing to undo'}
          >
            {undoStack.length ? `Undo ${undoStack[undoStack.length - 1].label}` : 'Undo'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowValence(true)}>Valence</Button>
        </div>
      </div>
      <p className="text-xs mb-6" style={{ color: COLOR.mutedInk }}>
        Weapons you own, where they're allocated, and the 3-Weapon Rule at a glance. Drag a weapon onto a frame's slot to assign it.
      </p>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Builds are the main surface (5/8) on the left; the weapon shelf (3/8) sits
          on the right and stays in view while the builds scroll, so a weapon can
          be dragged onto any build without scrolling back. */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-6">
        <div
          className="lg:order-2 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto rounded-xl"
          onDragOver={e => { if (dragSource) e.preventDefault(); }}
          onDrop={e => {
            if (!dragSource) return;
            e.preventDefault();
            handleClearSlot(dragSource.frameId, dragSource.column);
          }}
          style={dragSource ? { outline: `2px dashed ${COLOR.gold}`, outlineOffset: 4 } : undefined}
        >
          {dragSource && (
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: COLOR.gold }}>
              Drop here to remove {dragSource.name} from that build
            </p>
          )}

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

          <div className="flex gap-2 mb-4">
            {[['owned', 'My Armory'], ['all', 'All Weapons']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setScope(key)}
                className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded"
                style={{
                  background: scope === key ? `${COLOR.gold}22` : 'transparent',
                  color: scope === key ? COLOR.gold : COLOR.mutedInk,
                  border: `1px solid ${scope === key ? COLOR.gold : COLOR.border}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={weaponQuery}
            onChange={e => setWeaponQuery(e.target.value)}
            placeholder="Search weapons by name or type..."
            className="w-full rounded-lg px-3 py-2 text-sm mb-4 outline-none"
            style={{ background: COLOR.surface1, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
          />

          {tagGroups.map(({ group, tags }) => (
            <div key={group} className="mb-3">
              <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: COLOR.agedInk }}>
                {group}
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map(({ tag, count }) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
                      style={{
                        background: active ? `${COLOR.gold}22` : 'transparent',
                        color: active ? COLOR.gold : COLOR.mutedInk,
                        border: `1px solid ${active ? COLOR.gold : COLOR.border}`,
                      }}
                    >
                      {tag} <span style={{ opacity: 0.6 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs mb-4"
              style={{ color: COLOR.gold }}
            >
              Clear {selectedTags.length} tag filter{selectedTags.length === 1 ? '' : 's'}
            </button>
          )}

          {scope === 'owned' && ownedWeapons.length === 0 && (
            <p style={{ color: COLOR.mutedInk }}>No weapons in your Armory yet. Add one to get started.</p>
          )}

          {visibleWeapons.length === 0 && (scope === 'all' || ownedWeapons.length > 0) && (
            <p style={{ color: COLOR.mutedInk }}>No weapons match this filter.</p>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {visibleWeapons.map(weapon => {
              const allocations = getAllocations(weapon);
              const ruleApplies = weapon.category === 'Primary' || weapon.category === 'Melee';
              const ruleBroken = ruleApplies && allocations.length > 3;
              const tags = tagEntriesFor(weapon).map(e => e.tag);

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
                      <p className="font-bold" style={{ color: COLOR.ink }}>
                        {weapon.name}
                        {ownedIds.has(weapon.weapon_id) && (
                          <span
                            className="ml-2 align-middle text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.5)', color: COLOR.success }}
                          >
                            Owned
                          </span>
                        )}
                      </p>
                      <p className="text-xs" style={{ color: COLOR.mutedInk }}>
                        {weapon.category} · {weapon.weapon_type} · MR {weapon.mastery_rank ?? 0}
                      </p>
                    </div>
                    {ownedIds.has(weapon.weapon_id) ? (
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => setPicker({ weapon })}
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: COLOR.gold }}
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => handleRemove(weapon)}
                          className="text-xs"
                          style={{ color: '#F87171' }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest shrink-0" style={{ color: COLOR.agedInk }}>
                        Not owned
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{
                            background: selectedTags.includes(tag) ? `${COLOR.gold}44` : `${COLOR.gold}14`,
                            color: COLOR.gold,
                            border: `1px solid ${selectedTags.includes(tag) ? COLOR.gold : 'transparent'}`,
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    <button
                      onClick={() => setTagEditWeapon(weapon)}
                      className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{ color: COLOR.mutedInk, border: `1px dashed ${COLOR.border}` }}
                    >
                      ✎ Edit tags
                    </button>
                  </div>

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

        <div className="lg:order-1">
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: COLOR.mutedInk }}>
            Builds — drop a weapon on a slot
          </p>
          <ArmoryFrameRoster
            frames={frames}
            draggedWeapon={draggedWeapon}
            onDropWeapon={handleDropWeapon}
            onPickSlot={(frame, slot) => setPicker({ frame, slot })}
            onClearSlot={(frame, slot) => handleClearSlot(frame.my_frame_id, slot.column)}
            onDragSlot={src => { setDragSource(src); setDraggedWeapon({ name: src.name, category: src.category }); }}
            onDragSlotEnd={() => { setDragSource(null); setDraggedWeapon(null); }}
          />
        </div>
      </div>

      {showValence && <ValenceCalculator onClose={() => setShowValence(false)} />}

      {tagEditWeapon && (
        <WeaponTagEditor
          weapon={tagEditWeapon}
          autoEntries={getWeaponTagEntries(tagEditWeapon)}
          rows={tagRowsByWeapon.get(tagEditWeapon.weapon_id) || []}
          vocabulary={customVocabulary}
          onHideAuto={(tag, hide) => (hide ? saveTagRow(tagEditWeapon, tag, true) : deleteTagRow(tagEditWeapon, tag))}
          onAddCustom={tag => saveTagRow(tagEditWeapon, tag, false)}
          onRemoveCustom={tag => deleteTagRow(tagEditWeapon, tag)}
          onClose={() => setTagEditWeapon(null)}
        />
      )}

      {picker && (() => {
        const cfg = pickerConfig();
        return <ArmoryPickerModal {...cfg} onClose={() => setPicker(null)} />;
      })()}

      {showAddModal && (
        <AddWeaponToInventoryModal
          catalog={catalog}
          ownedIds={ownedIds}
          initialCategory={categoryFilter}
          onClose={() => setShowAddModal(false)}
          onAdded={weapons => {
            setOwnedIds(prev => {
              const next = new Set(prev);
              weapons.forEach(w => next.add(w.weapon_id));
              return next;
            });
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
