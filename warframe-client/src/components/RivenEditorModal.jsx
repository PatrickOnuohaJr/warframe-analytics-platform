import { useState } from 'react';
import ModalShell from './ui/ModalShell';
import Button from './ui/Button';
import PolaritySymbol, { POLARITIES } from './PolaritySymbol';
import { COLOR } from '../constants/theme';
import { RIVEN_MAX_RANK } from '../utils/modCapacity';
import { statsForCategory, isPositiveOnly, formatRivenStat, parseRivenStat } from '../utils/rivenStats';

const EMPTY_STAT = { tag: '', sign: '+', value: '' };

function parseInitialStats(riven, category) {
  const raw = [riven?.stat_1, riven?.stat_2, riven?.stat_3, riven?.stat_4];
  return raw.map(text => {
    const parsed = parseRivenStat(text, category);
    return parsed ? { tag: parsed.tag, sign: parsed.sign, value: parsed.value } : { ...EMPTY_STAT };
  });
}

// Create/edit a single Riven, scoped to whichever weapon opened it -- the
// weapon binding is fixed once created (a real Riven can't be re-rolled
// onto a different weapon), everything else (name, polarity, rank, up to 4
// stats) is editable. Reused for both flows: `riven` is null when
// creating, the existing row when editing.
//
// Stats are real Riven stat rules (wiki.warframe.com/w/Riven_Mods,
// confirmed 2026-08-27), not free text: valid combos are 2 positives, 3
// positives, 2 positives + 1 negative, or 3 positives + 1 negative -- a
// negative never appears alone or as one of the first two stats, and only
// one negative total is ever possible. Slots 1-2 are always positive;
// slots 3-4 can go negative unless the chosen stat is itself
// positive-only (e.g. elemental damage, Punch Through), and only one of
// slots 3/4 can be negative at a time.
export default function RivenEditorModal({ weaponName, category, riven, accent, onSave, onDelete, onClose }) {
  const [name, setName] = useState(riven?.riven_name ?? '');
  const [polarity, setPolarity] = useState(riven?.polarity ?? null);
  const [rank, setRank] = useState(riven?.owned_rank ?? 0);
  const [stats, setStats] = useState(() => parseInitialStats(riven, category));
  const [saving, setSaving] = useState(false);

  const statOptions = statsForCategory(category);
  const negativeSlotIndex = stats.findIndex(s => s.sign === '-' && s.tag);

  function updateStat(index, patch) {
    setStats(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function setStatTag(index, tag) {
    // Switching to a positive-only stat forces the sign back to +,
    // regardless of what it was.
    const forcedPositive = isPositiveOnly(tag);
    updateStat(index, { tag, sign: forcedPositive ? '+' : stats[index].sign });
  }

  function toggleSign(index) {
    const stat = stats[index];
    if (isPositiveOnly(stat.tag)) return;
    updateStat(index, { sign: stat.sign === '+' ? '-' : '+' });
  }

  async function handleSave() {
    setSaving(true);

    const lines = stats.map(s => (s.tag && s.value !== '' ? formatRivenStat(s.tag, s.sign, s.value, category) : null));

    const payload = {
      ...(riven ? { riven_id: riven.riven_id } : {}),
      weapon_name: weaponName,
      riven_name: name.trim() || null,
      polarity,
      owned_rank: rank,
      stat_1: lines[0],
      stat_2: lines[1],
      stat_3: lines[2],
      stat_4: lines[3],
    };

    const saved = await onSave(payload);
    setSaving(false);
    if (saved) onClose(saved);
  }

  async function handleDelete() {
    if (!riven) return;
    const confirmed = window.confirm(`Delete this Riven for ${weaponName}? This can't be undone.`);
    if (!confirmed) return;

    setSaving(true);
    await onDelete(riven.riven_id);
    setSaving(false);
    onClose(null);
  }

  return (
    <ModalShell onClose={() => onClose(null)} accent={accent ?? COLOR.gold} maxWidth="max-w-md" zIndex={80}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold" style={{ color: accent ?? COLOR.gold }}>
          {riven ? 'Edit Riven' : 'New Riven'}
        </h2>
        <button onClick={() => onClose(null)} className="text-xl leading-none" style={{ color: COLOR.mutedInk }}>×</button>
      </div>

      <p className="text-xs uppercase tracking-widest mb-4" style={{ color: COLOR.mutedInk }}>
        {weaponName}
      </p>

      <label className="block text-xs mb-1" style={{ color: COLOR.mutedInk }}>Name (optional)</label>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="e.g. Argonak Vittena"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
        style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
      />

      <label className="block text-xs mb-1" style={{ color: COLOR.mutedInk }}>Polarity</label>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {POLARITIES.map(p => (
          <button
            key={p}
            onClick={() => setPolarity(polarity === p ? null : p)}
            title={p}
            className="rounded-md p-1.5 transition-colors"
            style={{
              background: polarity === p ? `${COLOR.gold}22` : 'transparent',
              border: `1px solid ${polarity === p ? COLOR.gold : COLOR.border}`,
            }}
          >
            <PolaritySymbol polarity={p} size={16} color={polarity === p ? COLOR.gold : COLOR.mutedInk} />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-1">
        <label className="text-xs" style={{ color: COLOR.mutedInk }}>Rank</label>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: COLOR.gold }}>{rank} / {RIVEN_MAX_RANK}</span>
          <button
            onClick={() => setRank(RIVEN_MAX_RANK)}
            disabled={rank === RIVEN_MAX_RANK}
            className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded disabled:opacity-30"
            style={{ background: `${COLOR.gold}18`, border: `1px solid ${COLOR.gold}55`, color: COLOR.gold }}
          >
            Max
          </button>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max={RIVEN_MAX_RANK}
        step="1"
        value={rank}
        onChange={e => setRank(Number(e.target.value))}
        className="w-full mb-3"
        style={{ accentColor: COLOR.gold }}
      />

      <label className="block text-xs mb-1" style={{ color: COLOR.mutedInk }}>
        Stats (2-4 -- a negative is only possible as the 3rd or 4th)
      </label>
      <div className="space-y-2 mb-4">
        {stats.map((stat, i) => {
          const canBeNegative = i >= 2 && stat.tag && !isPositiveOnly(stat.tag);
          // Only one negative total -- once one slot is negative, the
          // other negative-eligible slot is locked to positive.
          const signLocked = !canBeNegative || (negativeSlotIndex !== -1 && negativeSlotIndex !== i);

          return (
            <div key={i} className="flex items-center gap-2">
              <button
                onClick={() => toggleSign(i)}
                disabled={signLocked}
                title={signLocked ? 'This stat can only be positive' : 'Toggle positive/negative'}
                className="w-8 h-8 shrink-0 rounded-lg border font-bold text-sm disabled:opacity-30"
                style={{
                  background: stat.sign === '-' ? `${COLOR.danger}18` : `${COLOR.success}18`,
                  border: `1px solid ${stat.sign === '-' ? COLOR.danger : COLOR.success}55`,
                  color: stat.sign === '-' ? COLOR.danger : COLOR.success,
                }}
              >
                {stat.sign}
              </button>
              <select
                value={stat.tag}
                onChange={e => setStatTag(i, e.target.value)}
                className="flex-[2] rounded-lg border px-2 py-2 text-sm outline-none"
                style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
              >
                <option value="">Stat {i + 1}...</option>
                {statOptions.map(s => (
                  <option key={s.tag} value={s.tag}>{s.label}</option>
                ))}
              </select>
              <input
                type="number"
                value={stat.value}
                onChange={e => updateStat(i, { value: e.target.value })}
                placeholder={statOptions.find(s => s.tag === stat.tag)?.unit === '%' ? '%' : 'value'}
                disabled={!stat.tag}
                className="flex-1 rounded-lg border px-2 py-2 text-sm outline-none disabled:opacity-40"
                style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" color={COLOR.gold} disabled={saving} onClick={handleSave} className="flex-1">
          {saving ? 'Saving...' : 'Save Riven'}
        </Button>
        {riven && (
          <Button variant="danger" disabled={saving} onClick={handleDelete}>
            Delete
          </Button>
        )}
      </div>
    </ModalShell>
  );
}
