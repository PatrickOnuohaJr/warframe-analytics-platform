import { useState } from 'react';
import { COLOR } from '../../constants/theme';
import { OULL } from '../../utils/requiemEngine';
import RequiemIcon from './RequiemIcon';
import Button from '../ui/Button';

// Badge text is always spelled out so the state is never colour-only.
const BADGE = {
  confirmed: { label: 'Confirmed position', color: COLOR.success },
  untested: { label: 'Untested position', color: COLOR.mutedInk },
  ruledOut: { label: 'Position ruled out', color: COLOR.danger },
  oull: { label: 'Oull wildcard', color: COLOR.gold },
};

function Slot({ info }) {
  const badge = BADGE[info.status];
  const isOull = info.mod === OULL;
  return (
    <div
      className="flex-1 min-w-0 rounded-xl p-3 text-center"
      style={{ background: COLOR.surface2, border: `1px solid ${badge.color}88` }}
    >
      <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: COLOR.agedInk }}>
        Slot {info.slot + 1}
      </p>
      <div className="flex justify-center mb-2"><RequiemIcon mod={info.mod} size={56} /></div>
      <p className="text-base font-bold" style={{ color: COLOR.ink }}>{info.mod}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: badge.color }}>
        {info.status === 'confirmed' ? '✓ ' : info.status === 'ruledOut' ? '✕ ' : ''}{badge.label}
      </p>
      {isOull && (
        <p className="text-[11px] mt-1 leading-snug" style={{ color: COLOR.mutedInk }}>
          {info.covers
            ? `Covers ${info.covers} (deduced)`
            : `Covers an unknown Requiem (${info.coverOptions.length} possible)`}
        </p>
      )}
    </div>
  );
}

// The three Parazon slots for the recommended setup, with a one-click copy.
export default function ParazonSlots({ slots }) {
  const [copied, setCopied] = useState(false);
  const text = slots.map(s => s.mod).join(' → ');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the sequence is still shown in plain text above.
    }
  }

  return (
    <div>
      <div className="flex gap-2 sm:gap-3">
        {slots.map(info => <Slot key={info.slot} info={info} />)}
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <Button size="sm" variant="ghost" onClick={copy}>{copied ? 'Copied' : 'Copy sequence'}</Button>
        <span className="text-xs" style={{ color: COLOR.mutedInk }}>{text}</span>
      </div>
    </div>
  );
}
