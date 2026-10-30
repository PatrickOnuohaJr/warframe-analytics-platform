import { COLOR } from '../../constants/theme';
import { REQUIEMS, SLOT_COUNT } from '../../utils/requiemEngine';
import RequiemIcon from './RequiemIcon';
import { requiemColor } from '../../constants/requiemLook';

// The eight Requiems as toggles. Pick the ones the Lich has revealed (0-3).
// Anything not picked stays unknown; the solver never assumes its identity.
export default function KnownRequiems({ known, onChange }) {
  function toggle(mod) {
    if (known.includes(mod)) onChange(known.filter(m => m !== mod));
    else if (known.length < SLOT_COUNT) onChange([...known, mod]);
  }
  const full = known.length >= SLOT_COUNT;

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {REQUIEMS.map(mod => {
          const on = known.includes(mod);
          const locked = full && !on;
          return (
            <button
              key={mod}
              type="button"
              aria-pressed={on}
              disabled={locked}
              onClick={() => toggle(mod)}
              className="rounded-xl p-2 flex flex-col items-center gap-1 transition-colors disabled:opacity-40"
              style={{
                background: on ? `${requiemColor(mod)}22` : COLOR.surface2,
                border: `1px solid ${on ? requiemColor(mod) : COLOR.border}`,
              }}
            >
              <RequiemIcon mod={mod} size={40} />
              <span className="text-xs font-bold" style={{ color: on ? COLOR.ink : COLOR.mutedInk }}>{mod}</span>
              <span className="text-[9px] uppercase tracking-wider" style={{ color: on ? COLOR.success : COLOR.agedInk }}>
                {on ? 'Revealed' : 'Unknown'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs mt-2" style={{ color: COLOR.mutedInk }}>
        {known.length} of {SLOT_COUNT} revealed. Only tick a Requiem the game has shown you.
      </p>
    </div>
  );
}
