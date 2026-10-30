import { COLOR } from '../../constants/theme';
import { OULL, SLOT_COUNT } from '../../utils/requiemEngine';
import ParazonSlots from './ParazonSlots';
import RequiemIcon from './RequiemIcon';
import Button from '../ui/Button';

const ULT_COLOR = { save: COLOR.info, optional: COLOR.gold, ready: COLOR.success };

function Stat({ label, value }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}` }}>
      <p className="text-[9px] uppercase tracking-widest" style={{ color: COLOR.agedInk }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: COLOR.ink }}>{value}</p>
    </div>
  );
}

// The main answer: what to equip next, why, and one-tap buttons to record how
// it went (so the next recommendation appears without opening the form).
export default function Recommendation({ analysis, forcing, onForcing, onQuickRecord, onFormFill }) {
  const { status, plan, slots, reasons, ultimatum, candidateCount, tally } = analysis;
  const best = plan.best;
  const line = best.config.join(' → ');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: COLOR.agedInk }}>
          {status === 'solved' ? 'Guaranteed win' : 'Try next'}
        </p>
        <p className="text-xl sm:text-2xl font-bold tracking-wide" style={{ color: status === 'solved' ? COLOR.success : COLOR.gold }}>
          {line.toUpperCase()}
        </p>
        <p className="text-xs mt-1" style={{ color: COLOR.mutedInk }}>
          {best.guaranteed
            ? 'Guaranteed: every sequence still possible is beaten by this setup.'
            : `Exploratory: ${Math.round(best.successProbability * 100)}% to finish now, built to narrow the field fastest.`}
          {!best.exact && ' (Estimated for the later steps.)'}
        </p>
      </div>

      <ParazonSlots slots={slots} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Possible sequences" value={candidateCount} />
        <Stat label="Winning setups" value={`${plan.guaranteedConfigCount} sure · ${plan.possibleWinningConfigCount} possible`} />
        <Stat label="Est. stabs left" value={best.expectedAttempts.toFixed(1)} />
        <Stat label="Worst case" value={`${best.worstCaseAttempts} stab${best.worstCaseAttempts === 1 ? '' : 's'}`} />
      </div>

      <ul className="space-y-1 text-sm" style={{ color: COLOR.ink }}>
        {reasons.map(r => <li key={r}>{r}</li>)}
      </ul>

      <div
        className="rounded-xl p-3"
        style={{ background: `${ULT_COLOR[ultimatum.advice]}12`, border: `1px solid ${ULT_COLOR[ultimatum.advice]}66` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ULT_COLOR[ultimatum.advice] }}>
          {ultimatum.title}
        </p>
        <p className="text-sm mt-1" style={{ color: COLOR.ink }}>{ultimatum.message}</p>
        <label className="flex items-center gap-2 text-xs mt-2" style={{ color: COLOR.mutedInk }}>
          <input type="checkbox" checked={forcing} onChange={e => onForcing(e.target.checked)} />
          I am using an Ultimatum for this stab
        </label>
        <p className="text-[11px] mt-1" style={{ color: COLOR.agedInk }}>
          {tally.available} Ultimatum{tally.available === 1 ? '' : 's'} left · {tally.consumed} used · {tally.natural} natural · {tally.total} stab{tally.total === 1 ? '' : 's'} so far
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLOR.agedInk }}>
          After you try it, tap what happened
        </p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: SLOT_COUNT }, (_, i) => {
            // Oull cannot fail, and a failure here must be a possible outcome.
            const possible = best.outcomes[i].count > 0 && best.config[i] !== OULL;
            return (
              <Button
                key={i} size="sm" variant="danger" disabled={!possible}
                title={possible ? undefined : 'This result is not possible for this setup'}
                onClick={() => onQuickRecord(best.config, i)}
              >
                Failed at {i + 1}
              </Button>
            );
          })}
          <Button size="sm" variant="success" disabled={best.successProbability === 0} onClick={() => onQuickRecord(best.config, null)}>
            Won
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onFormFill(best.config)}>Different stab…</Button>
        </div>
      </div>

      {plan.alternatives.length > 0 && (
        <details>
          <summary className="text-xs cursor-pointer" style={{ color: COLOR.mutedInk }}>Other good options</summary>
          <ul className="mt-2 space-y-1.5">
            {plan.alternatives.map(alt => (
              <li key={alt.config.join()} className="flex items-center gap-2 text-xs" style={{ color: COLOR.mutedInk }}>
                {alt.config.map((m, i) => <RequiemIcon key={i} mod={m} size={22} />)}
                <span>{alt.config.join(' → ')} · {Math.round(alt.successProbability * 100)}% now · ~{alt.expectedAttempts.toFixed(1)} stabs</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
