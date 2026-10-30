import { COLOR } from '../../constants/theme';
import { REQUIEMS, SLOT_COUNT } from '../../utils/requiemEngine';
import RequiemIcon from './RequiemIcon';

const CELL = {
  confirmed: { mark: '✓', label: 'Confirmed', color: COLOR.success },
  ruledOut: { mark: '✕', label: 'Ruled out', color: COLOR.danger },
  possible: { mark: '?', label: 'Possible', color: COLOR.agedInk },
};

// Every Requiem against every position, straight from the remaining sequences.
// A mod that is revealed but whose position is not pinned down shows "?" in the
// positions it could still take; unrevealed mods are never assumed.
export default function EvidenceBoard({ board, known }) {
  return (
    <table className="w-full text-xs" style={{ color: COLOR.ink }}>
      <thead>
        <tr style={{ color: COLOR.agedInk }}>
          <th className="text-left font-normal pb-1">Requiem</th>
          {Array.from({ length: SLOT_COUNT }, (_, i) => (
            <th key={i} className="font-normal pb-1">Pos {i + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {REQUIEMS.map(mod => (
          <tr key={mod}>
            <td className="py-0.5">
              <span className="flex items-center gap-1.5">
                <RequiemIcon mod={mod} size={20} />
                {mod}
                {known.includes(mod) && <span className="text-[9px] uppercase" style={{ color: COLOR.success }}>revealed</span>}
              </span>
            </td>
            {Array.from({ length: SLOT_COUNT }, (_, i) => {
              const c = CELL[board.status(mod, i)];
              return (
                <td key={i} className="text-center font-bold" style={{ color: c.color }} title={c.label}>
                  <span aria-hidden="true">{c.mark}</span>
                  <span className="sr-only">{c.label}</span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
