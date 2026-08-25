import { useState, useEffect, useMemo } from 'react';
import { wfBase } from '../lib/supabase';
import Panel from './ui/Panel';
import { COLOR } from '../constants/theme';

// ============================================================================
// WeaponStatSearchTab.jsx
// ============================================================================
// The second half of the Arsenal Search Suite (Weapon Stat Threshold Search):
// "find weapons with at least X crit chance / range / fire rate / etc."
// across the FULL wf_base.weapons catalog (665 weapons), not just weapons
// currently equipped on a build.
//
// No new table was needed for this — wf_base.weapons.raw_json already
// carries the full WFCD payload with every stat below, seeded live from
// the game data. This just reads it. Stats are category-dependent (gun
// stats and melee stats don't overlap), so the filter set swaps with the
// selected category.
//
// Every filter is a MIN threshold ("at least this much"), riven-search
// style. A slider left at its floor is a no-op — nothing gets excluded by
// a filter the user hasn't touched. Range bounds per stat are computed
// live from whatever weapons actually exist in the selected category, not
// hardcoded, so they stay correct as new weapons get seeded.
// ============================================================================

const GUN_STATS = [
  { key: 'criticalChance', label: 'Crit Chance', unit: '%', scale: 100, precision: 1 },
  { key: 'criticalMultiplier', label: 'Crit Multiplier', unit: 'x', scale: 1, precision: 1 },
  { key: 'procChance', label: 'Status Chance', unit: '%', scale: 100, precision: 1 },
  { key: 'fireRate', label: 'Fire Rate', unit: '/s', scale: 1, precision: 1 },
  { key: 'multishot', label: 'Multishot', unit: '', scale: 1, precision: 1 },
  { key: 'magazineSize', label: 'Magazine Size', unit: '', scale: 1, precision: 0 },
];

const MELEE_STATS = [
  { key: 'criticalChance', label: 'Crit Chance', unit: '%', scale: 100, precision: 1 },
  { key: 'criticalMultiplier', label: 'Crit Multiplier', unit: 'x', scale: 1, precision: 1 },
  { key: 'procChance', label: 'Status Chance', unit: '%', scale: 100, precision: 1 },
  { key: 'range', label: 'Range', unit: 'm', scale: 1, precision: 1 },
  // WFCD reuses the same `fireRate` field for melee attack speed (attacks/sec) —
  // no separate field exists, this isn't a typo carried over from GUN_STATS.
  { key: 'fireRate', label: 'Attack Speed', unit: '/s', scale: 1, precision: 2 },
  { key: 'comboDuration', label: 'Combo Duration', unit: 's', scale: 1, precision: 0 },
  { key: 'heavyAttackDamage', label: 'Heavy Attack Damage', unit: '', scale: 1, precision: 0 },
];

const CATEGORIES = [
  { value: 'Primary', stats: GUN_STATS },
  { value: 'Secondary', stats: GUN_STATS },
  { value: 'Melee', stats: MELEE_STATS },
];

function toDisplay(raw, stat) {
  return raw * stat.scale;
}

function step(stat) {
  return stat.precision === 0 ? 1 : Math.pow(10, -stat.precision);
}

function fmt(value, stat) {
  return Number(value).toFixed(stat.precision);
}

export default function WeaponStatSearchTab() {
  const [weapons, setWeapons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('Primary');
  const [thresholds, setThresholds] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function loadWeapons() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await wfBase
        .from('weapons')
        .select('weapon_id, name, category, weapon_type, mastery_rank, raw_json')
        .in('category', ['Primary', 'Secondary', 'Melee'])
        .order('name', { ascending: true });

      if (cancelled) return;

      if (fetchError) {
        console.error('Failed to load weapons for stat search:', fetchError);
        setError('Could not load the weapon catalog.');
        setLoading(false);
        return;
      }

      setWeapons((data || []).filter(w => w.weapon_type !== 'Incarnon Genesis'));
      setLoading(false);
    }

    loadWeapons();
    return () => { cancelled = true; };
  }, []);

  const activeStats = CATEGORIES.find(c => c.value === category).stats;

  const categoryWeapons = useMemo(
    () => weapons.filter(w => w.category === category),
    [weapons, category]
  );

  // Live min/max per stat, computed from whatever's actually in this
  // category right now — never hardcoded, so it can't drift from real data.
  const statBounds = useMemo(() => {
    const bounds = {};
    for (const stat of activeStats) {
      const values = categoryWeapons
        .map(w => w.raw_json?.[stat.key])
        .filter(v => typeof v === 'number' && !Number.isNaN(v));

      if (values.length === 0) {
        bounds[stat.key] = { min: 0, max: 0 };
        continue;
      }

      bounds[stat.key] = {
        min: toDisplay(Math.min(...values), stat),
        max: toDisplay(Math.max(...values), stat),
      };
    }
    return bounds;
  }, [categoryWeapons, activeStats]);

  // Reset thresholds to each stat's floor (no-op filter) whenever category
  // changes, since the stat set and bounds are entirely different.
  useEffect(() => {
    const initial = {};
    for (const stat of activeStats) {
      initial[stat.key] = statBounds[stat.key]?.min ?? 0;
    }
    setThresholds(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, weapons]);

  const results = useMemo(() => {
    return categoryWeapons.filter(w => {
      return activeStats.every(stat => {
        const threshold = thresholds[stat.key];
        const bound = statBounds[stat.key];
        if (threshold === undefined || bound === undefined || threshold <= bound.min) return true;

        const raw = w.raw_json?.[stat.key];
        if (typeof raw !== 'number') return false;

        return toDisplay(raw, stat) >= threshold;
      });
    });
  }, [categoryWeapons, activeStats, thresholds, statBounds]);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className="rounded-xl px-4 py-2 text-[10px] uppercase font-bold tracking-[0.25em] transition-colors"
            style={{
              background: category === c.value ? `${COLOR.gold}18` : COLOR.surface1,
              border: `1px solid ${category === c.value ? `${COLOR.gold}55` : COLOR.border}`,
              color: category === c.value ? COLOR.gold : COLOR.mutedInk,
            }}
          >
            {c.value}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: COLOR.mutedInk }}>Loading weapon catalog...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <Panel className="mb-6">
            <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: COLOR.mutedInk }}>
              Minimum thresholds — {category}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {activeStats.map(stat => {
                const bound = statBounds[stat.key] ?? { min: 0, max: 0 };
                const value = thresholds[stat.key] ?? bound.min;
                const isFlat = bound.max <= bound.min;

                return (
                  <div key={stat.key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs" style={{ color: COLOR.mutedInk }}>
                        {stat.label}
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={bound.min}
                          max={bound.max}
                          step={step(stat)}
                          value={fmt(value, stat)}
                          onChange={e => {
                            const next = Number(e.target.value);
                            if (Number.isNaN(next)) return;
                            setThresholds(prev => ({ ...prev, [stat.key]: next }));
                          }}
                          className="w-20 rounded-md px-2 py-1 text-xs text-right outline-none"
                          style={{ background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink }}
                        />
                        <span className="text-xs" style={{ color: COLOR.mutedInk }}>{stat.unit}</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min={bound.min}
                      max={bound.max}
                      step={step(stat)}
                      value={value}
                      disabled={isFlat}
                      onChange={e => setThresholds(prev => ({ ...prev, [stat.key]: Number(e.target.value) }))}
                      className="w-full accent-[#FBBF24] disabled:opacity-30"
                    />

                    <div className="flex justify-between text-[10px] mt-0.5" style={{ color: COLOR.agedInk }}>
                      <span>{fmt(bound.min, stat)}{stat.unit}</span>
                      <span>{fmt(bound.max, stat)}{stat.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: COLOR.mutedInk }}>
            {results.length} of {categoryWeapons.length} {category.toLowerCase()} weapons match
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map(w => (
              <Panel key={w.weapon_id} accent={COLOR.gold}>
                <p className="font-bold mb-1" style={{ color: COLOR.ink }}>{w.name}</p>
                <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>
                  {w.weapon_type} · MR {w.mastery_rank ?? 0}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: COLOR.mutedInk }}>
                  {activeStats.map(stat => {
                    const raw = w.raw_json?.[stat.key];
                    if (typeof raw !== 'number') return null;
                    return (
                      <span key={stat.key}>
                        {stat.label}: <span style={{ color: COLOR.ink }}>{fmt(toDisplay(raw, stat), stat)}{stat.unit}</span>
                      </span>
                    );
                  })}
                </div>
              </Panel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
