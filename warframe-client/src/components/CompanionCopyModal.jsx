import { useEffect, useMemo, useState } from 'react';
import { wfUser } from '../lib/supabase';
import { applyCopy } from '../lib/companionCopyApply';
import { fetchBuilds } from '../lib/fetchBuilds';
import { COLOR } from '../constants/theme';
import { planCopy } from '../utils/companionCopy';
import ArmoryPickerModal from './ArmoryPickerModal';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';

const IDENTITY_FIELD = { Companion: 'companion', CompanionWeapon: 'companion_weapon' };
const KEY_SEP = '|';

// Two steps: pick a source (any build's config of the same piece, including
// another config of this very build), then confirm. The confirm step shows
// exactly which mods the target can't take, so nothing is dropped silently.
// The copy REPLACES the target config: slots, polarities, forma count and
// catalyst all come across, so the capacity math stays consistent.
export default function CompanionCopyModal({
  frame,
  equipmentType,
  config,
  target,
  modsById,
  onApplied,
  onClose,
}) {
  const [sources, setSources] = useState(null); // [{ key, frameId, cfg, rows, meta, label, sublabel }]
  const [error, setError] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [slotsRes, metaRes, framesRes] = await Promise.all([
        wfUser.from('loadout_slots').select('my_frame_id, config_slot, slot_position, mod_id, polarity').eq('equipment_type', equipmentType),
        wfUser.from('loadout_meta').select('my_frame_id, config_slot, forma_count, has_catalyst, config_name').eq('equipment_type', equipmentType),
        fetchBuilds(),
      ]);
      if (cancelled) return;

      const failure = slotsRes.error || metaRes.error || framesRes.error;
      if (failure) {
        console.error('Failed to load copy sources:', failure);
        setError('Could not load other loadouts.');
        return;
      }

      const framesById = new Map((framesRes.data || []).map(f => [f.my_frame_id, f]));
      const metaByKey = new Map((metaRes.data || []).map(m => [`${m.my_frame_id}${KEY_SEP}${m.config_slot}`, m]));

      const grouped = new Map();
      (slotsRes.data || []).forEach(r => {
        const key = `${r.my_frame_id}${KEY_SEP}${r.config_slot}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(r);
      });

      const list = [];
      grouped.forEach((rows, key) => {
        const [frameIdText, cfg] = key.split(KEY_SEP);
        const frameId = Number(frameIdText);
        const modCount = rows.filter(r => r.mod_id).length;
        if (modCount === 0) return;
        if (frameId === frame.my_frame_id && cfg === config) return; // not onto itself

        const f = framesById.get(frameId);
        if (!f) return;
        list.push({
          key,
          frameId,
          cfg,
          rows,
          meta: metaByKey.get(key) ?? { forma_count: 0, has_catalyst: false, config_name: null },
          label: `${f.display_name || f.warframe_name}${f.build_title ? ` · ${f.build_title}` : ''}`,
          sublabel: `${f[IDENTITY_FIELD[equipmentType]] || 'Unnamed'} · Config ${cfg}${metaByKey.get(key)?.config_name ? ` · ${metaByKey.get(key).config_name}` : ''}`,
          note: `${modCount} mod${modCount === 1 ? '' : 's'}`,
        });
      });
      list.sort((a, b) => a.label.localeCompare(b.label) || a.cfg.localeCompare(b.cfg));
      setSources(list);
    }

    load();
    return () => { cancelled = true; };
  }, [equipmentType, frame.my_frame_id, config]);

  const plan = useMemo(
    () => (chosen ? planCopy(chosen.rows, modsById, equipmentType, target) : null),
    [chosen, modsById, equipmentType, target]
  );

  async function apply() {
    setSaving(true);
    setError(null);

    const failure = await applyCopy({
      frameId: frame.my_frame_id,
      equipmentType,
      config,
      copy: plan.copy,
      meta: chosen.meta,
    });

    setSaving(false);
    if (failure) {
      console.error('Failed to copy loadout:', failure);
      setError('Copy failed. Nothing was lost; the earlier change history can restore it.');
      return;
    }
    onApplied();
  }

  if (!chosen) {
    if (error) {
      return (
        <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.danger}>
          <p className="text-sm mb-4" style={{ color: COLOR.danger }}>{error}</p>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalShell>
      );
    }
    if (!sources) {
      return (
        <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.gold}>
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>Loading loadouts...</p>
        </ModalShell>
      );
    }
    return (
      <ArmoryPickerModal
        title={`Copy into Config ${config}`}
        subtitle={`Pick a ${equipmentType === 'Companion' ? 'companion' : 'companion weapon'} loadout to copy from. It replaces Config ${config} here.`}
        items={sources.map(s => ({ id: s.key, label: s.label, sublabel: s.sublabel, note: s.note }))}
        onPick={key => setChosen(sources.find(s => s.key === key))}
        onClose={onClose}
      />
    );
  }

  const copiedCount = plan.copy.filter(r => r.mod_id).length;

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.gold}>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: COLOR.gold }}>
        Copy into Config {config}
      </h3>
      <p className="text-sm mb-1" style={{ color: COLOR.ink }}>
        From <strong>{chosen.label}</strong> ({chosen.sublabel}) onto{' '}
        <strong>{target.name}</strong>.
      </p>
      <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>
        This replaces everything currently in Config {config}, including its forma count and catalyst.
      </p>

      <p className="text-sm mb-2" style={{ color: COLOR.ink }}>
        {copiedCount} mod{copiedCount === 1 ? '' : 's'} will copy.
      </p>

      {plan.skipped.length > 0 && (
        <div
          className="rounded-lg px-3 py-2 mb-3 text-sm"
          style={{ background: `${COLOR.danger}12`, border: `1px solid ${COLOR.danger}55`, color: COLOR.ink }}
        >
          <p className="font-bold mb-1" style={{ color: COLOR.danger }}>
            {plan.skipped.length} can't go on {target.name} and will be left empty:
          </p>
          <ul className="list-disc pl-5">
            {plan.skipped.map(s => <li key={s.slot_position}>{s.name} (slot {s.slot_position})</li>)}
          </ul>
        </div>
      )}

      {error && <p className="text-sm mb-3" style={{ color: COLOR.danger }}>{error}</p>}

      <div className="flex gap-2">
        <Button onClick={apply} disabled={saving}>{saving ? 'Copying...' : `Copy into Config ${config}`}</Button>
        <Button variant="ghost" onClick={() => setChosen(null)} disabled={saving}>Back</Button>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
      </div>
    </ModalShell>
  );
}
