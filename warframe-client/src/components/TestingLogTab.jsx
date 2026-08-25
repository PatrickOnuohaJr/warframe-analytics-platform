import { useState, useEffect } from 'react';
import { wfUser } from '../lib/supabase';
import Panel from './ui/Panel';
import Button from './ui/Button';

// ============================================================================
// TestingLogTab.jsx
// ============================================================================
// WHAT THIS FILE IS:
// The D.6 "Testing Methodology Log" tab, rendered inside BuildDetailOverlay
// when activeTab === 'testing'. Split out into its own component (rather
// than inlined directly in BuildDetailOverlay like the Identity tab fields
// are) because this tab has real state/logic of its own — a form AND a
// list AND its own Supabase calls — and BuildDetailOverlay is already a
// big file. Keeping this separate means BuildDetailOverlay only needs to
// import <TestingLogTab frame={frame} /> and render it, without absorbing
// all of this logic inline.
//
// WHAT IT DOES:
// - Shows a form to log a new field test: what you changed, what you
//   expected, what you observed, which archetype/benchmark you were
//   testing against, and the verdict (Pass/Fail/Inconclusive)
// - Shows a running list of past tests logged for THIS specific build,
//   newest first
// - Lets you delete a test entry if you logged something by mistake
//
// WHAT IT DOES NOT DO (yet, on purpose):
// - No mod-related test logging — Mods DB doesn't exist yet, see the SQL
//   migration's scope note for why
// - No automatic archetype detection — that's A3's job later. This tab
//   is where the HUMAN (you) declares what archetype you're testing
//   against; A3 will eventually read the results of tests logged here
// ============================================================================

const GOLD = '#FBBF24';
const PANEL_BG = '#4A443B';
const BORDER = '#6F6A62';
const MUTED = '#B8B3AC';

// These match the A3 candidate archetype list from the master roadmap,
// verbatim. If you ever rename an archetype in one place, rename it here
// too — see the migration SQL's comment on why this matters.
const BENCHMARK_PRESETS = [
  'Health Tank',
  'Shield Tank',
  'Overguard Tank',
  'Ability Nuke',
  'Weapon Platform',
  'Melee Platform',
  'CC/Control',
  'Support',
  'Status Engine',
  'Hybrid',
];

const VARIABLE_TYPES = ['Arcane', 'Shard', 'Weapon'];
const VERDICTS = ['Pass', 'Fail', 'Inconclusive'];

const VERDICT_COLORS = {
  Pass: '#4ADE80',
  Fail: '#F87171',
  Inconclusive: MUTED,
};

export default function TestingLogTab({ frame }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form state for a new test entry. Kept as one object rather than
  // separate useState calls per field, since there are 5 fields and
  // resetting the whole form after submit is a one-liner this way.
  const [form, setForm] = useState({
    variable_type: 'Arcane',
    variable_changed: '',
    expected_outcome: '',
    observed_outcome: '',
    benchmark_archetype: '',
    verdict: 'Pass',
    notes: '',
  });

  // Load existing tests for this build whenever the frame changes
  // (i.e. whenever the user opens a different build's overlay).
  useEffect(() => {
    let cancelled = false;

    async function loadTests() {
      if (!frame?.my_frame_id) return;
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await wfUser
        .from('build_tests')
        .select('*')
        .eq('my_frame_id', frame.my_frame_id)
        .order('tested_at', { ascending: false });

      if (cancelled) return;

      if (fetchError) {
        console.error('Failed to load build tests:', fetchError);
        setError('Could not load testing log.');
        setLoading(false);
        return;
      }

      setTests(data || []);
      setLoading(false);
    }

    loadTests();
    return () => { cancelled = true; };
  }, [frame?.my_frame_id]);

  async function handleSubmit() {
    // Basic guard — don't let an obviously-empty test get logged.
    // Not exhaustive validation, just enough to stop accidental empty
    // submits from cluttering the log.
    if (!form.variable_changed.trim() || !form.expected_outcome.trim() || !form.observed_outcome.trim()) {
      setError('Fill in what changed, what you expected, and what you observed.');
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error: insertError } = await wfUser
      .from('build_tests')
      .insert({
        my_frame_id: frame.my_frame_id,
        variable_type: form.variable_type,
        variable_changed: form.variable_changed.trim(),
        expected_outcome: form.expected_outcome.trim(),
        observed_outcome: form.observed_outcome.trim(),
        benchmark_archetype: form.benchmark_archetype || null,
        verdict: form.verdict,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);

    if (insertError) {
      console.error('Failed to save test:', insertError);
      setError('Failed to save test entry.');
      return;
    }

    // Prepend the new entry to the list instead of re-fetching everything —
    // avoids a round trip, and we already have the full row back from
    // .select().single() above.
    setTests(prev => [data, ...prev]);

    // Reset the form, but keep variable_type and benchmark_archetype as-is —
    // if you're logging several tests in a row against the same build and
    // the same archetype (the common case), re-picking those every time
    // is just friction.
    setForm(prev => ({
      ...prev,
      variable_changed: '',
      expected_outcome: '',
      observed_outcome: '',
      notes: '',
    }));
  }

  async function handleDelete(testId) {
    const confirmed = window.confirm('Delete this test entry? This cannot be undone.');
    if (!confirmed) return;

    const { error: deleteError } = await wfUser
      .from('build_tests')
      .delete()
      .eq('test_id', testId);

    if (deleteError) {
      console.error('Failed to delete test:', deleteError);
      setError('Failed to delete test entry.');
      return;
    }

    setTests(prev => prev.filter(t => t.test_id !== testId));
  }

  const inputStyle = {
    backgroundColor: PANEL_BG,
    border: `1px solid ${BORDER}`,
    color: '#F5F0E8',
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
          Log a New Test
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
              Variable Type
            </label>
            <select
              value={form.variable_type}
              onChange={e => setForm(prev => ({ ...prev, variable_type: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {VARIABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
              Benchmark / Archetype
            </label>
            {/* Datalist gives free-text entry WITH preset suggestions —
                simpler than building a full searchable dropdown like
                WarframeSelector, since this list is short (10 items) and
                doesn't need live DB fetching. */}
            <input
              list="benchmark-presets"
              value={form.benchmark_archetype}
              onChange={e => setForm(prev => ({ ...prev, benchmark_archetype: e.target.value }))}
              placeholder="e.g. Health Tank"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
            <datalist id="benchmark-presets">
              {BENCHMARK_PRESETS.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
            What Changed
          </label>
          <input
            value={form.variable_changed}
            onChange={e => setForm(prev => ({ ...prev, variable_changed: e.target.value }))}
            placeholder="e.g. Swapped Molt Augmented for Molt Vigor"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
              Expected
            </label>
            <textarea
              value={form.expected_outcome}
              onChange={e => setForm(prev => ({ ...prev, expected_outcome: e.target.value }))}
              placeholder="What you thought would happen"
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
              Observed
            </label>
            <textarea
              value={form.observed_outcome}
              onChange={e => setForm(prev => ({ ...prev, observed_outcome: e.target.value }))}
              placeholder="What actually happened"
              rows={3}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
            Verdict
          </label>
          <div className="flex gap-2">
            {VERDICTS.map(v => (
              <button
                key={v}
                onClick={() => setForm(prev => ({ ...prev, verdict: v }))}
                className="rounded-lg px-4 py-2 text-sm uppercase tracking-widest"
                style={{
                  background: form.verdict === v ? `${VERDICT_COLORS[v]}22` : PANEL_BG,
                  border: `1px solid ${form.verdict === v ? VERDICT_COLORS[v] : BORDER}`,
                  color: form.verdict === v ? VERDICT_COLORS[v] : MUTED,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: MUTED }}>
            Notes (optional)
          </label>
          <input
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Mission type, squad size, anything situational"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>

        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

        <Button variant="primary" color={GOLD} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Log Test'}
        </Button>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
          Test History ({tests.length})
        </p>

        {loading && <p className="text-sm" style={{ color: MUTED }}>Loading...</p>}

        {!loading && tests.length === 0 && (
          <p className="text-sm" style={{ color: MUTED }}>No tests logged yet for this build.</p>
        )}

        <div className="space-y-3">
          {tests.map(test => (
            <Panel key={test.test_id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] uppercase font-bold px-2 py-1 rounded"
                    style={{
                      background: `${VERDICT_COLORS[test.verdict]}22`,
                      color: VERDICT_COLORS[test.verdict],
                    }}
                  >
                    {test.verdict}
                  </span>
                  <span className="text-xs" style={{ color: MUTED }}>
                    {test.variable_type}
                    {test.benchmark_archetype ? ` · ${test.benchmark_archetype}` : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(test.test_id)}
                  className="text-xs"
                  style={{ color: '#F87171' }}
                >
                  Delete
                </button>
              </div>

              <p className="text-sm mb-2" style={{ color: '#F5F0E8' }}>
                {test.variable_changed}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span style={{ color: MUTED }}>Expected: </span>
                  <span style={{ color: '#E8E4DC' }}>{test.expected_outcome}</span>
                </div>
                <div>
                  <span style={{ color: MUTED }}>Observed: </span>
                  <span style={{ color: '#E8E4DC' }}>{test.observed_outcome}</span>
                </div>
              </div>

              {test.notes && (
                <p className="text-xs mt-2 italic" style={{ color: MUTED }}>
                  {test.notes}
                </p>
              )}

              <p className="text-[10px] mt-2" style={{ color: MUTED }}>
                {new Date(test.tested_at).toLocaleDateString()}
              </p>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}