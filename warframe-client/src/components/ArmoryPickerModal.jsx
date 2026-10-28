import { useMemo, useState } from 'react';
import { COLOR } from '../constants/theme';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';

// Tap-to-assign picker for the Armory. Drag-and-drop is mouse-only, so this
// is the touch path: pick the weapon from a build's slot, or pick the build
// from a weapon card. One searchable list serves both directions.
// items: [{ id, label, sublabel?, color?, note? }]
export default function ArmoryPickerModal({ title, subtitle, items, onPick, onClose }) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => `${i.label} ${i.sublabel ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.gold}>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: COLOR.gold }}>
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>{subtitle}</p>
      )}

      <input
        type="search"
        autoFocus
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

      <div className="space-y-1.5 mb-4">
        {visible.length === 0 && (
          <p className="text-sm" style={{ color: COLOR.mutedInk }}>Nothing matches.</p>
        )}
        {visible.map(item => (
          <button
            key={item.id}
            onClick={() => onPick(item.id)}
            className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
            style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}` }}
          >
            <span className="block text-sm font-bold" style={{ color: item.color ?? COLOR.ink }}>
              {item.label}
            </span>
            {item.sublabel && (
              <span className="block text-xs" style={{ color: COLOR.mutedInk }}>{item.sublabel}</span>
            )}
            {item.note && (
              <span className="block text-[10px] uppercase tracking-widest mt-0.5" style={{ color: COLOR.agedInk }}>
                {item.note}
              </span>
            )}
          </button>
        ))}
      </div>

      <Button variant="ghost" onClick={onClose}>Cancel</Button>
    </ModalShell>
  );
}
