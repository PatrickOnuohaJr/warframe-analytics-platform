import { COLOR } from '../../constants/theme';
import { OULL, succeeded } from '../../utils/requiemEngine';
import RequiemIcon from './RequiemIcon';
import Button from '../ui/Button';

// Recorded stabs, oldest first. Each slot shows its true state: passed (green),
// failed (red) or untested (neutral), always with a text label.
function slotState(attempt, i) {
  if (succeeded(attempt) || i < attempt.failedSlot) return { label: 'Passed', color: COLOR.success, mark: '✓' };
  if (i === attempt.failedSlot) return { label: 'Failed', color: COLOR.danger, mark: '✕' };
  return { label: 'Untested', color: COLOR.agedInk, mark: '–' };
}

export default function StabHistory({ attempts, conflictIds, onEdit, onDelete }) {
  if (attempts.length === 0) {
    return <p className="text-sm" style={{ color: COLOR.mutedInk }}>No stabs recorded yet.</p>;
  }
  return (
    <ol className="space-y-2">
      {attempts.map((a, idx) => (
        <li
          key={a.id}
          className="rounded-xl p-2.5"
          style={{
            background: COLOR.surface2,
            border: `1px solid ${conflictIds.has(a.id) ? COLOR.danger : COLOR.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: COLOR.agedInk }}>
              Stab {idx + 1}{a.usedUltimatum ? ' · Ultimatum' : ' · Natural'}
              {succeeded(a) && <span style={{ color: COLOR.success }}> · Won</span>}
              {conflictIds.has(a.id) && <span style={{ color: COLOR.danger }}> · Possible mistake</span>}
            </span>
            <span className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => onEdit(a)}>Edit</Button>
              <Button size="sm" variant="danger" onClick={() => onDelete(a)}>Delete</Button>
            </span>
          </div>
          <div className="flex gap-2">
            {a.equipped.map((mod, i) => {
              const st = slotState(a, i);
              return (
                <div
                  key={i}
                  className="flex-1 min-w-0 flex items-center gap-1.5 rounded-lg px-1.5 py-1"
                  style={{ border: `1px solid ${st.color}66` }}
                >
                  <RequiemIcon mod={mod} size={28} />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold truncate" style={{ color: COLOR.ink }}>{mod}</span>
                    <span className="block text-[9px] uppercase tracking-wider" style={{ color: st.color }}>
                      {st.mark} {mod === OULL && st.label === 'Passed' ? 'Wildcard' : st.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}
