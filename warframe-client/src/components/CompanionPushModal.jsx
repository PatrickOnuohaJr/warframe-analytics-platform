import { useEffect, useMemo, useState } from 'react';
import { wfUser } from '../lib/supabase';
import { applyCopy } from '../lib/companionCopyApply';
import { planCopy, CONFIG_SLOTS } from '../utils/companionCopy';
import { COLOR } from '../constants/theme';
import ArmoryPickerModal from './ArmoryPickerModal';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';

const IDENTITY_FIELD = { Companion: 'companion', CompanionWeapon: 'companion_weapon' };

// "Copy to other builds": push this config (e.g. the "Fire rate" one) onto a
// chosen config of many builds at once. Each target is checked against its OWN
// companion, so mods it can't take are skipped and reported per build. Searching
// by companion name and "Select all shown" is the quick way to hit everyone
// running the same companion.
export default function CompanionPushModal({
  frame,
  equipmentType,
  config,
  sourceRows,
  sourceMeta,
  modsById,
  classFor,
  onApplied,
  onClose,
}) {
  const [targetConfig, setTargetConfig] = useState(config);
  const [builds, setBuilds] = useState(null); // [{ id, label, sublabel, companion, cls }]
  const [chosenIds, setChosenIds] = useState(null); // set once the list step is confirmed
  const [existing, setExisting] = useState(new Map()); // frameId -> mods already in the target config
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    wfUser
      .from('my_frames')
      .select('my_frame_id, display_name, warframe_name, build_title, companion, companion_weapon')
      .then(({ data, error: e }) => {
        if (cancelled) return;
        if (e) { console.error('Failed to load builds:', e); setError('Could not load builds.'); return; }
        const list = (data || [])
          .filter(f => f[IDENTITY_FIELD[equipmentType]])
          .map(f => ({
            id: f.my_frame_id,
            label: `${f.display_name || f.warframe_name}${f.build_title ? ` · ${f.build_title}` : ''}`,
            sublabel: f[IDENTITY_FIELD[equipmentType]],
            companion: f[IDENTITY_FIELD[equipmentType]],
            cls: classFor(f[IDENTITY_FIELD[equipmentType]]),
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setBuilds(list);
      });
    return () => { cancelled = true; };
    // classFor is rebuilt each render of the parent; the list only needs loading once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipmentType]);

  // Builds that would actually be written: never the source config onto itself.
  const targets = useMemo(() => {
    if (!builds || !chosenIds) return [];
    return builds.filter(b => chosenIds.includes(b.id) && !(b.id === frame.my_frame_id && targetConfig === config));
  }, [builds, chosenIds, frame.my_frame_id, targetConfig, config]);

  // Per-build plan against that build's own companion.
  const plans = useMemo(
    () => targets.map(t => ({
      target: t,
      plan: t.cls ? planCopy(sourceRows, modsById, equipmentType, { name: t.companion, cls: t.cls }) : null,
    })),
    [targets, sourceRows, modsById, equipmentType]
  );

  // When the confirm step opens, look up what the target configs hold now.
  useEffect(() => {
    if (!chosenIds || targets.length === 0) return;
    let cancelled = false;
    wfUser
      .from('loadout_slots')
      .select('my_frame_id, mod_id')
      .eq('equipment_type', equipmentType)
      .eq('config_slot', targetConfig)
      .in('my_frame_id', targets.map(t => t.id))
      .then(({ data }) => {
        if (cancelled) return;
        const counts = new Map();
        (data || []).forEach(r => { if (r.mod_id) counts.set(r.my_frame_id, (counts.get(r.my_frame_id) || 0) + 1); });
        setExisting(counts);
      });
    return () => { cancelled = true; };
  }, [chosenIds, targets, equipmentType, targetConfig]);

  async function apply() {
    setSaving(true);
    setError(null);
    const failed = [];
    for (const { target, plan } of plans) {
      if (!plan) continue;
      const failure = await applyCopy({
        frameId: target.id,
        equipmentType,
        config: targetConfig,
        copy: plan.copy,
        meta: sourceMeta,
      });
      if (failure) { console.error('Push failed for', target.label, failure); failed.push(target.label); }
    }
    setSaving(false);
    if (failed.length > 0) {
      setError(`Failed for: ${failed.join(', ')}. The rest were copied.`);
      return;
    }
    onApplied();
  }

  if (error && !builds) {
    return (
      <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.danger}>
        <p className="text-sm mb-4" style={{ color: COLOR.danger }}>{error}</p>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </ModalShell>
    );
  }

  if (!builds) {
    return (
      <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.gold}>
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>Loading builds...</p>
      </ModalShell>
    );
  }

  const sourceName = sourceMeta.config_name || `Config ${config}`;

  if (!chosenIds) {
    return (
      <ArmoryPickerModal
        title={`Copy "${sourceName}" to other builds`}
        subtitle="Tick the builds to receive it. Search a companion's name, then Select all shown, to hit everyone running it."
        header={(
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: COLOR.agedInk }}>Into config</span>
            {CONFIG_SLOTS.map(c => (
              <button
                key={c}
                onClick={() => setTargetConfig(c)}
                className="px-3 py-1 rounded-lg text-xs font-bold"
                style={{
                  background: targetConfig === c ? `${COLOR.gold}22` : COLOR.surface2,
                  border: `1px solid ${targetConfig === c ? COLOR.gold : COLOR.border}`,
                  color: targetConfig === c ? COLOR.gold : COLOR.mutedInk,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        items={builds.map(b => ({
          id: b.id,
          label: b.label,
          sublabel: b.sublabel,
          note: b.id === frame.my_frame_id && targetConfig === config ? 'This is the source config' : undefined,
        }))}
        onPickMany={ids => setChosenIds(ids)}
        confirmLabel="Review copy"
        onClose={onClose}
      />
    );
  }

  const writable = plans.filter(p => p.plan);
  const noClass = plans.filter(p => !p.plan);
  const overwriting = writable.filter(p => existing.get(p.target.id) > 0);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl" accent={COLOR.gold}>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: COLOR.gold }}>
        Copy "{sourceName}" into Config {targetConfig}
      </h3>
      <p className="text-sm mb-2" style={{ color: COLOR.ink }}>
        {writable.length} build{writable.length === 1 ? '' : 's'} will get it, including its name, forma count and catalyst.
      </p>

      {overwriting.length > 0 && (
        <p className="text-xs mb-3" style={{ color: COLOR.danger }}>
          {overwriting.length} already have mods in Config {targetConfig}; those will be replaced:{' '}
          {overwriting.map(p => p.target.label).join(', ')}.
        </p>
      )}

      <div className="max-h-[40vh] overflow-y-auto space-y-1.5 mb-3">
        {writable.map(({ target, plan }) => (
          <div key={target.id} className="rounded-lg px-3 py-2 text-sm" style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}` }}>
            <span style={{ color: COLOR.ink }}>{target.label}</span>
            <span style={{ color: COLOR.mutedInk }}> · {target.companion} · {plan.copy.filter(r => r.mod_id).length} mods</span>
            {plan.skipped.length > 0 && (
              <p className="text-xs" style={{ color: COLOR.danger }}>
                Can't take: {plan.skipped.map(s => s.name).join(', ')}
              </p>
            )}
          </div>
        ))}
        {noClass.map(({ target }) => (
          <p key={target.id} className="text-xs" style={{ color: COLOR.danger }}>
            {target.label}: "{target.companion}" isn't in the catalog, so it was left out.
          </p>
        ))}
      </div>

      {error && <p className="text-sm mb-3" style={{ color: COLOR.danger }}>{error}</p>}

      <div className="flex gap-2">
        <Button onClick={apply} disabled={saving || writable.length === 0}>
          {saving ? 'Copying...' : `Copy to ${writable.length} build${writable.length === 1 ? '' : 's'}`}
        </Button>
        <Button variant="ghost" onClick={() => setChosenIds(null)} disabled={saving}>Back</Button>
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
      </div>
    </ModalShell>
  );
}
