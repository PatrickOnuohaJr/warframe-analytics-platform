import { useState, useMemo } from 'react';
import { wfUser } from '../lib/supabase';
import ModalShell from './ui/ModalShell';
import { COLOR } from '../constants/theme';

// Search-and-add picker for Armory ownership. Mirrors AddFrameModal's
// pattern (search the catalog, click a result to commit) rather than
// inventing a new interaction for the same job.
export default function AddWeaponToInventoryModal({ catalog, ownedIds, onClose, onAdded }) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog
      .filter(w => !ownedIds.has(w.weapon_id))
      .filter(w => !q || w.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [catalog, ownedIds, search]);

  async function handleAdd(weapon) {
    setSaving(true);
    setError(null);

    const { error: insertError } = await wfUser
      .from('weapon_inventory')
      .insert({ weapon_id: weapon.weapon_id });

    setSaving(false);

    if (insertError) {
      console.error('Failed to add weapon to inventory:', insertError);
      setError('Failed to add weapon.');
      return;
    }

    onAdded(weapon);
  }

  return (
    <ModalShell onClose={onClose} accent={COLOR.gold} maxWidth="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold" style={{ color: COLOR.gold }}>Add Weapon to Armory</h2>
        <button onClick={onClose} className="text-xl leading-none" style={{ color: COLOR.mutedInk }}>×</button>
      </div>

      <input
        type="text"
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search weapon catalog..."
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-4"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

      <div className="max-h-96 overflow-y-auto space-y-1">
        {results.length === 0 && (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>No matching weapons.</p>
        )}

        {results.map(w => (
          <button
            key={w.weapon_id}
            disabled={saving}
            onClick={() => handleAdd(w)}
            className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/20 disabled:opacity-50"
          >
            <span style={{ color: COLOR.ink }}>{w.name}</span>
            <span className="text-xs" style={{ color: COLOR.mutedInk }}>{w.category} · MR {w.mastery_rank ?? 0}</span>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}
