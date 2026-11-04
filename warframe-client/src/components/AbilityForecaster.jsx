import { useMemo, useState } from 'react';
import { COLOR } from '../constants/theme';
import { formatNumber } from '../utils/formatNumber';
import { FORECAST_STATS, FORECAST_STAT_LABELS, sumChanges, forecastAbility } from '../utils/abilityForecast';

// "What if" panel for ability stats. The player lists hypothetical changes
// (e.g. +60% Strength from Molt Augmented, +75% from five Tauforged Crimson
// shards) and sees what each ability's numbers become. All the math lives in
// utils/abilityForecast.js; this component only collects the list and shows
// the result. Nothing here is saved -- it is a scratchpad.
//
// `abilities`: [{ slot, name, parameters, context }] for abilities that have
// canonical data. `buildStats`: { duration, efficiency, range, strength, armor }.

// One-click sources that are confirmed on the wiki (wiki.warframe.com).
// Molt Augmented: +0.24% Strength per kill, max +60% at rank 5.
// Tauforged Crimson Archon Shard: +15% Ability Strength / +15% Ability Duration each.
// Grimoire (Dante's Tome secondary) Invocation mods, from this project's own mod
// data (wf_base.mods, max rank): the Alternate Fire gives +4% per enemy hit,
// stacking up to 15 times, so +60% once fully stacked for 20s. Vome = Strength,
// Ris = Duration, Netra = Efficiency. Needs the Alt-Fire orb hitting enemies.
const PRESETS = [
  { label: 'Molt Augmented (max)', stat: 'strength', percent: 60 },
  { label: 'Grimoire Vome Invocation (15 stacks)', stat: 'strength', percent: 60 },
  { label: 'Grimoire Ris Invocation (15 stacks)', stat: 'duration', percent: 60 },
  { label: 'Grimoire Netra Invocation (15 stacks)', stat: 'efficiency', percent: 60 },
  { label: 'Tauforged Crimson shard', stat: 'strength', percent: 15 },
  { label: 'Tauforged Crimson shard', stat: 'duration', percent: 15 },
];

let nextId = 1;
const newChange = (label = '', stat = 'strength', percent = 0) => ({ id: nextId++, label, stat, percent });

const inputStyle = { background: COLOR.surface1, border: `1px solid ${COLOR.border}`, color: COLOR.ink };

// Value text: percent-unit numbers get a %, others stay plain (seconds,
// metres and energy have no reliable unit string in the data).
function fmt(value, unit) {
  if (value == null) return '—';
  return unit === 'percent' ? `${formatNumber(value)}%` : formatNumber(value);
}

export default function AbilityForecaster({ abilities, buildStats, accent }) {
  const [changes, setChanges] = useState([newChange('', 'strength', 60)]);

  const totals = useMemo(() => sumChanges(changes), [changes]);
  const hasChange = FORECAST_STATS.some(stat => totals[stat] !== 0);

  const forecasts = useMemo(
    () =>
      abilities.map(a => ({
        ...a,
        rows: forecastAbility({ parameters: a.parameters, context: a.context, buildStats, changes }),
      })),
    [abilities, buildStats, changes]
  );

  if (!buildStats) return null;

  const update = (id, patch) => setChanges(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="mt-6 rounded-xl border p-4" style={{ borderColor: `${accent}55`, background: COLOR.surface2 }} data-testid="ability-forecaster">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: accent }}>Forecast</h3>
      <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>
        Add the changes you are thinking about. They stack by adding to your current total, the same way the game does.
      </p>

      <div className="space-y-2">
        {changes.map((change, i) => (
          <div key={change.id} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={`Source ${i + 1} name`}
              value={change.label}
              onChange={e => update(change.id, { label: e.target.value })}
              placeholder="Source (optional)"
              className="flex-1 min-w-[7rem] rounded-lg px-2 py-1.5 text-sm outline-none"
              style={inputStyle}
            />
            <select
              aria-label={`Source ${i + 1} stat`}
              value={change.stat}
              onChange={e => update(change.id, { stat: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-sm outline-none"
              style={inputStyle}
            >
              {FORECAST_STATS.map(stat => (
                <option key={stat} value={stat}>{FORECAST_STAT_LABELS[stat]}</option>
              ))}
            </select>
            <span className="flex items-center gap-1">
              <input
                aria-label={`Source ${i + 1} percent`}
                type="number"
                step="any"
                value={change.percent}
                onChange={e => update(change.id, { percent: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-20 rounded-lg px-2 py-1.5 text-sm outline-none tabular-nums"
                style={inputStyle}
              />
              <span className="text-sm" style={{ color: COLOR.mutedInk }}>%</span>
            </span>
            <button
              type="button"
              aria-label={`Remove source ${i + 1}`}
              onClick={() => setChanges(prev => prev.filter(c => c.id !== change.id))}
              className="px-2 text-lg leading-none rounded hover:bg-black/20"
              style={{ color: COLOR.mutedInk }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={() => setChanges(prev => [...prev, newChange()])}
          className="rounded-lg border px-3 py-1 text-xs font-semibold"
          style={{ borderColor: accent, color: accent }}
        >
          + Add change
        </button>
        {PRESETS.map(p => (
          <button
            key={`${p.label}-${p.stat}`}
            type="button"
            onClick={() => setChanges(prev => [...prev, newChange(p.label, p.stat, p.percent)])}
            className="rounded-lg border px-3 py-1 text-xs"
            style={{ borderColor: COLOR.border, color: COLOR.mutedInk }}
          >
            + {p.label} +{p.percent}% {FORECAST_STAT_LABELS[p.stat]}
          </button>
        ))}
        {changes.length > 0 && (
          <button
            type="button"
            onClick={() => setChanges([])}
            className="rounded-lg px-3 py-1 text-xs underline"
            style={{ color: COLOR.mutedInk }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Build totals before and after, for every stat that has a change. */}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm" data-testid="forecast-totals">
        {FORECAST_STATS.filter(stat => totals[stat] !== 0 && buildStats[stat] != null).map(stat => (
          <span key={stat} style={{ color: COLOR.mutedInk }}>
            {FORECAST_STAT_LABELS[stat]}{' '}
            <span style={{ color: COLOR.ink }}>{formatNumber(buildStats[stat])}%</span>
            {' → '}
            <span className="font-bold" style={{ color: accent }}>{formatNumber(Math.round((buildStats[stat] + totals[stat]) * 100) / 100)}%</span>
          </span>
        ))}
        {!hasChange && <span className="text-xs italic" style={{ color: COLOR.mutedInk }}>No change entered yet.</span>}
      </div>

      {hasChange && (
        <div className="mt-3 space-y-3">
          {forecasts.map(a => {
            // Only the numbers this change actually moves. The rest are
            // hidden so the answer is not buried in unrelated stats.
            const moved = a.rows.filter(r => r.affectedBy.some(stat => totals[stat] !== 0));
            return (
              <div key={`${a.slot}-${a.name}`}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: COLOR.ink }}>
                  {a.slot}. {a.name}
                </p>
                {moved.length === 0 ? (
                  <p className="text-xs italic" style={{ color: COLOR.mutedInk }}>Nothing on this ability changes.</p>
                ) : (
                  moved.map(r => (
                    <div
                      key={r.parameterKey}
                      className="flex flex-wrap items-baseline justify-between gap-x-3 py-1 border-b text-sm"
                      style={{ borderColor: COLOR.border }}
                    >
                      <span style={{ color: COLOR.mutedInk }}>
                        {r.label}
                        <span className="ml-1 text-[10px] uppercase tracking-widest">
                          ({r.affectedBy.map(s => FORECAST_STAT_LABELS[s]).join(' + ')})
                        </span>
                      </span>
                      <span className="tabular-nums" data-testid={`forecast-${a.slot}-${r.parameterKey}`}>
                        <span style={{ color: COLOR.mutedInk }}>{fmt(r.current, r.unit)}</span>
                        {' → '}
                        <span className="font-bold" style={{ color: COLOR.ink }}>{fmt(r.forecast, r.unit)}</span>
                        {r.delta != null && r.delta !== 0 && (
                          <span className="ml-1 text-xs" style={{ color: r.delta > 0 ? COLOR.success : COLOR.danger }}>
                            ({r.delta > 0 ? '+' : ''}{formatNumber(r.delta)})
                          </span>
                        )}
                        {r.capped && (
                          <span className="ml-1 text-xs" style={{ color: COLOR.mutedInk }}>capped at {formatNumber(r.cap)}{r.unit === 'percent' ? '%' : ''}</span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
