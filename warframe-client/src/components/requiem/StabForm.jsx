import { useState } from 'react';
import { COLOR } from '../../constants/theme';
import { REQUIEMS, OULL, SLOT_COUNT, validateAttempt, isRedundantTest, repeatsOf } from '../../utils/requiemEngine';
import Button from '../ui/Button';

const selectStyle = { background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink };

// Enter (or edit) one stab: the three mods that were equipped and where the
// game stopped. The game checks left to right and stops at the first miss, so
// "which position failed" is the whole outcome; slots after it were not tested.
export default function StabForm({ initial, otherAttempts, candidates, defaultUltimatum, onSubmit, onCancel }) {
  const [equipped, setEquipped] = useState(initial?.equipped ?? ['', '', '']);
  const [outcome, setOutcome] = useState(initial?.failedSlot === null ? 'win' : initial?.failedSlot >= 0 ? String(initial.failedSlot) : '');
  const [usedUltimatum, setUsedUltimatum] = useState(initial?.usedUltimatum ?? defaultUltimatum);

  const failedSlot = outcome === '' || outcome === 'win' ? null : Number(outcome);
  const draft = { equipped, failedSlot };
  const complete = equipped.every(Boolean) && outcome !== '';
  const problems = complete ? validateAttempt(draft) : [];
  const repeated = complete && problems.length === 0 ? repeatsOf(otherAttempts, equipped) : [];
  const redundant = complete && problems.length === 0 && failedSlot !== null && isRedundantTest(candidates, equipped);
  const changed = (i, v) => setEquipped(eq => eq.map((m, j) => (j === i ? v : m)));

  function submit(e) {
    e.preventDefault();
    if (!complete || problems.length > 0) return;
    onSubmit({ ...initial, equipped, failedSlot, usedUltimatum });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: SLOT_COUNT }, (_, i) => (
          <label key={i} className="block">
            <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.agedInk }}>Slot {i + 1}</span>
            <select
              value={equipped[i]}
              onChange={e => changed(i, e.target.value)}
              className="w-full rounded-lg px-2 py-2 text-sm outline-none"
              style={selectStyle}
            >
              <option value="">Choose…</option>
              {[...REQUIEMS, OULL].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        ))}
      </div>

      <fieldset>
        <legend className="text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.agedInk }}>
          Where did it stop?
        </legend>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            const disabled = equipped[i] === OULL;
            return (
              <label
                key={i}
                className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                style={{
                  ...selectStyle,
                  opacity: disabled ? 0.4 : 1,
                  borderColor: outcome === String(i) ? COLOR.danger : COLOR.border,
                  color: outcome === String(i) ? COLOR.danger : COLOR.mutedInk,
                }}
              >
                <input
                  type="radio" name="outcome" className="sr-only" disabled={disabled}
                  checked={outcome === String(i)} onChange={() => setOutcome(String(i))}
                />
                Failed at {i + 1}
              </label>
            );
          })}
          <label
            className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
            style={{
              ...selectStyle,
              borderColor: outcome === 'win' ? COLOR.success : COLOR.border,
              color: outcome === 'win' ? COLOR.success : COLOR.mutedInk,
            }}
          >
            <input type="radio" name="outcome" className="sr-only" checked={outcome === 'win'} onChange={() => setOutcome('win')} />
            All three passed
          </label>
        </div>
        <p className="text-[11px] mt-1" style={{ color: COLOR.agedInk }}>
          Slots before the failure passed; slots after it were never tested.
        </p>
      </fieldset>

      <label className="flex items-center gap-2 text-sm" style={{ color: COLOR.ink }}>
        <input type="checkbox" checked={usedUltimatum} onChange={e => setUsedUltimatum(e.target.checked)} />
        This stab used a Requiem Ultimatum
      </label>

      {problems.map(p => <p key={p} className="text-xs" style={{ color: COLOR.danger }}>{p}</p>)}
      {repeated.length > 0 && (
        <p className="text-xs" style={{ color: COLOR.gold }}>
          You already tried exactly this sequence (stab {repeated.map(a => a.number).join(', ')}).
        </p>
      )}
      {redundant && (
        <p className="text-xs" style={{ color: COLOR.gold }}>
          This result was already certain from earlier stabs, so it adds no new information.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={!complete || problems.length > 0}>{initial?.id ? 'Save changes' : 'Record stab'}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
