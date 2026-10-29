import { useMemo, useState } from 'react';
import { COLOR } from '../constants/theme';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';
import { fuse, fusionPath, fusionsNeeded, minStartFor, toTenths, fromTenths } from '../utils/valence';

const MAX_ROWS = 10;
const fmt = tenths => `${fromTenths(tenths).toFixed(1)}%`;

function NumberField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.agedInk }}>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        max="60"
        step="0.1"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />
    </label>
  );
}

// Forecasting calculator for Coda Valence Fusion (Coda weapons are cheap to farm with Live Heart Cells, so the framing is "what to aim for", not "what is worth buying"; Kuva and Tenet are not covered). Pure maths
// in utils/valence.js; this is only the form and the readout.
export default function ValenceCalculator({ onClose }) {
  const [baseText, setBaseText] = useState('');
  const [donorText, setDonorText] = useState('');

  const base = baseText === '' ? null : toTenths(baseText);
  const donor = donorText === '' ? null : toTenths(donorText);
  const baseOk = base !== null && base > 0 && base <= 600;
  const donorOk = donor !== null && donor > 0 && donor <= 600;

  const path = useMemo(() => (baseOk ? fusionPath(base) : []), [base, baseOk]);
  const needed = baseOk ? fusionsNeeded(base) : null;

  // What the considered donor does: raises the base only if it is stronger.
  const whatIf = useMemo(() => {
    if (!baseOk || !donorOk) return null;
    const after = fuse(base, donor);
    const without = fuse(base);
    const start = Math.max(base, donor);
    return { after, without, gain: after - without, left: fusionsNeeded(after), stronger: donor > base, start };
  }, [base, donor, baseOk, donorOk]);

  const hunt = useMemo(
    () => Array.from({ length: MAX_ROWS }, (_, i) => ({ n: i + 1, min: minStartFor(i + 1) })),
    []
  );

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl" accent={COLOR.gold}>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: COLOR.gold }}>
        Coda Valence forecast
      </h3>
      <p className="text-xs mb-4" style={{ color: COLOR.mutedInk }}>
        Each fusion gives 1.1 &times; the higher of the two bonuses, capped at 60% (58% or more rounds up to 60%).
        A weak donor still gives the full +10%; its own roll only matters if it beats your best copy.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <NumberField label="Your best copy (%)" value={baseText} onChange={setBaseText} placeholder="e.g. 25.3" />
        <NumberField label="Donor you're eyeing (%)" value={donorText} onChange={setDonorText} placeholder="optional, e.g. 35" />
      </div>

      {baseOk && (
        <div className="mb-4">
          <p className="text-sm mb-2" style={{ color: COLOR.ink }}>
            {base >= 600
              ? 'Already at 60%.'
              : <>From <strong>{fmt(base)}</strong>: <strong>{needed}</strong> fusion{needed === 1 ? '' : 's'} to 60% (one donor each, any roll).</>}
          </p>
          {path.length > 0 && (
            <p className="text-xs leading-relaxed" style={{ color: COLOR.mutedInk }}>
              {fmt(base)} {path.map(p => ` → ${fmt(p.tenths)}`).join('')}
            </p>
          )}
        </div>
      )}

      {whatIf && (
        <div
          className="rounded-lg px-3 py-2 mb-4 text-sm"
          style={{ background: `${COLOR.gold}12`, border: `1px solid ${COLOR.gold}44`, color: COLOR.ink }}
        >
          {whatIf.stronger ? (
            <>
              A {fmt(donor)} donor beats your {fmt(base)}: one fusion gives <strong>{fmt(whatIf.after)}</strong> instead
              of {fmt(whatIf.without)} (+{fmt(whatIf.gain)}), leaving{' '}
              <strong>{whatIf.left === 0 ? 'nothing' : `${whatIf.left} more fusion${whatIf.left === 1 ? '' : 's'}`}</strong> to 60%.
            </>
          ) : (
            <>
              A {fmt(donor)} donor is no better than your {fmt(base)}: it gives <strong>{fmt(whatIf.after)}</strong>,
              exactly what any weak donor would, so it only matters as one more fusion.
            </>
          )}
        </div>
      )}

      <h4 className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLOR.agedInk }}>
        What to hunt for
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4 text-sm">
        {hunt.map(row => {
          const reached = baseOk && base >= row.min;
          return (
            <div key={row.n} className="flex justify-between" style={{ color: reached ? COLOR.gold : COLOR.ink }}>
              <span style={{ color: COLOR.mutedInk }}>{row.n} fusion{row.n === 1 ? '' : 's'}</span>
              <span>{fmt(row.min)} or more</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs mb-4" style={{ color: COLOR.mutedInk }}>
        A copy at or above the listed bonus reaches 60% in that many fusions or fewer. Percentages are floored
        to 0.1%, so the game's display can differ by a tenth.
      </p>

      <Button variant="ghost" onClick={onClose}>Close</Button>
    </ModalShell>
  );
}
