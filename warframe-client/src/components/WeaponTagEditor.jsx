import { useState } from 'react';
import { COLOR } from '../constants/theme';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';
import { SUGGESTED_CUSTOM_TAGS } from '../utils/weaponTags';

// Edit one weapon's tags. Automatic tags can be switched off (and back on);
// custom tags can be added from your own vocabulary or typed fresh, and
// removed. All saving happens in the parent via the callbacks.
export default function WeaponTagEditor({
  weapon,
  autoEntries,     // automatic tags, before any of your changes
  rows,            // this weapon's wf_user.weapon_tags rows
  vocabulary,      // custom tags already used on any weapon
  onHideAuto,      // (tag, hide: boolean)
  onAddCustom,     // (tag)
  onRemoveCustom,  // (tag)
  onClose,
}) {
  const [text, setText] = useState('');
  const hidden = new Set(rows.filter(r => r.hidden).map(r => r.tag));
  const custom = rows.filter(r => !r.hidden).map(r => r.tag);
  const taken = new Set([...autoEntries.map(e => e.tag), ...custom]);

  // Offer your own vocabulary first, then the starter ideas, minus what's already here.
  const ideas = [...new Set([...vocabulary, ...SUGGESTED_CUSTOM_TAGS])].filter(t => !taken.has(t));

  function add(tag) {
    const clean = tag.trim();
    if (!clean || taken.has(clean)) return;
    onAddCustom(clean);
    setText('');
  }

  const chip = (active, color) => ({
    background: active ? `${color}22` : 'transparent',
    color: active ? color : COLOR.agedInk,
    border: `1px ${active ? 'solid' : 'dashed'} ${active ? color : COLOR.border}`,
    textDecoration: active ? 'none' : 'line-through',
  });

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-lg" accent={COLOR.gold}>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: COLOR.gold }}>
        Tags: {weapon.name}
      </h3>
      <p className="text-xs mb-4" style={{ color: COLOR.mutedInk }}>
        Tap an automatic tag to turn it off or back on. Add your own below.
      </p>

      <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: COLOR.agedInk }}>Automatic</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {autoEntries.length === 0 && <span className="text-xs" style={{ color: COLOR.agedInk }}>None</span>}
        {autoEntries.map(({ tag }) => (
          <button
            key={tag}
            onClick={() => onHideAuto(tag, !hidden.has(tag))}
            className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
            style={chip(!hidden.has(tag), COLOR.gold)}
          >
            {tag}
          </button>
        ))}
      </div>

      <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: COLOR.agedInk }}>Your tags</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {custom.length === 0 && <span className="text-xs" style={{ color: COLOR.agedInk }}>None yet</span>}
        {custom.map(tag => (
          <button
            key={tag}
            onClick={() => onRemoveCustom(tag)}
            title="Remove"
            className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
            style={chip(true, COLOR.info)}
          >
            {tag} ✕
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(text); }}
          maxLength={40}
          placeholder="Type a new tag..."
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
        />
        <Button variant="primary" onClick={() => add(text)} disabled={!text.trim() || taken.has(text.trim())}>
          Add
        </Button>
      </div>

      {ideas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {ideas.map(tag => (
            <button
              key={tag}
              onClick={() => add(tag)}
              className="text-[10px] uppercase tracking-widest px-2 py-1 rounded"
              style={{ background: 'transparent', color: COLOR.mutedInk, border: `1px dashed ${COLOR.border}` }}
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      <Button variant="ghost" onClick={onClose}>Done</Button>
    </ModalShell>
  );
}
