import { useState, useEffect } from 'react';
import { wfUser, wfBase } from '../lib/supabase';
import Button from './ui/Button';
import { COLOR } from '../constants/theme';
import { getShardBonusTexts } from '../utils/survivability';
import { buildLoadoutSnapshot, JADE_LIGHT_RESULTS, JADE_LIGHT_ENVIRONMENTS } from '../utils/jadeLightSnapshot';

// ============================================================================
// JadeLightTests.jsx
// ============================================================================
// The VERIFIED survivability record for a build: did it survive standing
// under a full Jade Light (~8s) while mobbed, with no evading?
//   Tier 0 = survived with no intervention, Tier 1 = survived but needed
//   active upkeep, Did not survive = failed. Tier 2 and below are
//   intentionally undefined (see DB/Migrations/20261021_add_jade_light_tests.sql).
// Every row here is a real test result. Gu's computed numbers are predictions
// and never get written here.
//
// Logging a result also freezes the build's current Warframe mods, shards,
// arcanes and subsumed ability into loadout_snapshot.
// ============================================================================

const RESULT_COLORS = {
  'Tier 0': COLOR.success,
  'Tier 1': COLOR.gold,
  'Did not survive': COLOR.danger,
};

const WARFRAME_SLOTS = ['1', '2', '3', '4', '5', '6', '7', '8', 'aura', 'exilus'];

// Reads the Warframe piece's currently-equipped mods (names + owned rank).
async function fetchEquippedWarframeMods(myFrameId) {
  const { data: slots, error } = await wfUser
    .from('loadout_slots')
    .select('slot_position, mod_id')
    .eq('my_frame_id', myFrameId)
    .eq('equipment_type', 'Warframe');
  if (error) throw error;

  const filled = (slots || []).filter(s => s.mod_id && WARFRAME_SLOTS.includes(s.slot_position));
  if (filled.length === 0) return [];

  const ids = filled.map(s => s.mod_id);
  const [modsRes, invRes] = await Promise.all([
    wfBase.from('mods').select('mod_id, name').in('mod_id', ids),
    wfUser.from('mod_inventory').select('mod_id, owned_rank').in('mod_id', ids),
  ]);
  if (modsRes.error) throw modsRes.error;
  if (invRes.error) throw invRes.error;

  const names = new Map((modsRes.data || []).map(m => [m.mod_id, m.name]));
  const ranks = new Map((invRes.data || []).map(r => [r.mod_id, r.owned_rank]));
  return filled
    .filter(s => names.has(s.mod_id))
    .map(s => ({ slot: s.slot_position, name: names.get(s.mod_id), rank: ranks.get(s.mod_id) ?? 0 }));
}

// onChanged: called after a result is logged/deleted so the codex card and
// modal header (which read the newest result) refresh.
export default function JadeLightTests({ frame, onChanged }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ result: 'Tier 0', environment: JADE_LIGHT_ENVIRONMENTS[0], tested_on: '', notes: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!frame?.my_frame_id) return;
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await wfUser
        .from('jade_light_tests')
        .select('*')
        .eq('my_frame_id', frame.my_frame_id)
        .order('tested_on', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (fetchError) {
        console.error('Failed to load Jade Light tests:', fetchError);
        setError('Could not load Jade Light results.');
      } else {
        setTests(data || []);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [frame?.my_frame_id]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const equippedMods = await fetchEquippedWarframeMods(frame.my_frame_id);
      const snapshot = buildLoadoutSnapshot({ frame, equippedMods, shardBonusTexts: getShardBonusTexts(frame) });
      const { data, error: insertError } = await wfUser
        .from('jade_light_tests')
        .insert({
          my_frame_id: frame.my_frame_id,
          result: form.result,
          environment: form.environment || null,
          tested_on: form.tested_on || null,
          loadout_snapshot: snapshot,
          notes: form.notes.trim() || null,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setTests(prev => [data, ...prev]);
      setForm(prev => ({ ...prev, notes: '' }));
      if (onChanged) onChanged();
    } catch (e) {
      console.error('Failed to save Jade Light result:', e);
      setError('Failed to save Jade Light result.');
    }
    setSaving(false);
  }

  async function handleDelete(testId) {
    if (!window.confirm('Delete this Jade Light result? This cannot be undone.')) return;
    const { error: deleteError } = await wfUser.from('jade_light_tests').delete().eq('test_id', testId);
    if (deleteError) {
      console.error('Failed to delete Jade Light result:', deleteError);
      setError('Failed to delete Jade Light result.');
      return;
    }
    setTests(prev => prev.filter(t => t.test_id !== testId));
    if (onChanged) onChanged();
  }

  const inputStyle = { backgroundColor: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink };
  // Newest verified result, shown as the build's current standing.
  const latest = tests[0] ?? null;

  return (
    <div className="max-w-2xl">
      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLOR.mutedInk }}>
        Jade Light — Verified Survivability
      </p>
      <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>
        Standing under a full Jade Light while mobbed, no evading. Only real test results go here; Gu's
        calculated numbers are predictions.
      </p>

      <p className="text-sm mb-4" style={{ color: latest ? RESULT_COLORS[latest.result] : COLOR.mutedInk }}>
        {latest ? `Verified: ${latest.result}` : 'Untested — no verified result yet'}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: COLOR.mutedInk }}>Result</label>
          <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
            {JADE_LIGHT_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: COLOR.mutedInk }}>Environment</label>
          <select value={form.environment} onChange={e => setForm(p => ({ ...p, environment: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
            <option value="">Unknown</option>
            {JADE_LIGHT_ENVIRONMENTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-1" style={{ color: COLOR.mutedInk }}>Date tested</label>
          <input type="date" value={form.tested_on} onChange={e => setForm(p => ({ ...p, tested_on: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
      </div>
      <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
        placeholder="Notes (optional) — e.g. what upkeep Tier 1 needed"
        rows={2} className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3" style={inputStyle} />
      <Button variant="primary" color={COLOR.gold} disabled={saving || loading} onClick={handleSubmit}>
        {saving ? 'Saving...' : 'Log Jade Light Result'}
      </Button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {!loading && tests.length > 0 && (
        <ul className="mt-4 space-y-2">
          {tests.map(t => (
            <li key={t.test_id} className="rounded-lg px-3 py-2 text-sm"
              style={{ background: COLOR.surface1, border: `1px solid ${COLOR.border}` }}>
              <div className="flex items-center justify-between">
                <span style={{ color: RESULT_COLORS[t.result], fontWeight: 700 }}>{t.result}</span>
                <span className="text-xs" style={{ color: COLOR.mutedInk }}>
                  {t.environment ?? 'Environment unknown'} · {t.tested_on ?? 'Date unknown'}
                </span>
              </div>
              {t.loadout_snapshot && !t.loadout_snapshot.mods_recorded && (
                <p className="text-xs mt-1" style={{ color: COLOR.mutedInk }}>
                  Snapshot has no Warframe mods recorded — mods were not entered for this build when logged.
                </p>
              )}
              {t.notes && <p className="text-xs mt-1" style={{ color: COLOR.ink }}>{t.notes}</p>}
              <button onClick={() => handleDelete(t.test_id)} className="text-xs mt-1 underline" style={{ color: COLOR.mutedInk }}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
