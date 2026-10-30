import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLOR } from '../constants/theme';
import Panel from '../components/ui/Panel';
import Button from '../components/ui/Button';
import KnownRequiems from '../components/requiem/KnownRequiems';
import StabForm from '../components/requiem/StabForm';
import StabHistory from '../components/requiem/StabHistory';
import Recommendation from '../components/requiem/Recommendation';
import EvidenceBoard from '../components/requiem/EvidenceBoard';
import { analyzeSession } from '../utils/requiemAdvice';
import { filterCandidates, succeeded, validateAttempt } from '../utils/requiemEngine';
import {
  loadActive, createSession, updateSession, syncAttempts, nextAttemptNumber, newId,
  isMissingTable, validateSessionFields,
} from '../lib/requiemStore';

const BLANK = {
  adversaryType: 'kuva_lich', adversaryName: '', known: [], hasOull: false, ultimatumCount: 0, status: 'active',
};

const inputStyle = { background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink };

function Heading({ children }) {
  return <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: COLOR.gold }}>{children}</h3>;
}

// Requiem Solver: finds a Kuva Lich's / Sister's three-Requiem sequence with as
// few stabs (and Ultimatums) as possible. Everything the screen shows is
// recomputed from the saved facts (revealed mods + stabs) by utils/requiem*.js.
export default function RequiemSolverPage() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(BLANK);
  const [attempts, setAttempts] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [saver, setSaver] = useState(true);
  const [mode, setMode] = useState('expected');
  const [forcing, setForcing] = useState(false);
  const [form, setForm] = useState(null); // null | { initial?, prefill? }
  const [save, setSave] = useState({ state: 'idle', message: '' });

  // Refs so the serialized save queue always sees the latest values.
  const sessionRef = useRef(BLANK);
  const attemptsRef = useRef([]);
  const idRef = useRef(null);
  const creatingRef = useRef(null);
  const queueRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    loadActive().then(({ session: s, attempts: a, error }) => {
      if (cancelled) return;
      if (error) {
        setSave(isMissingTable(error)
          ? { state: 'offline', message: 'Progress is not being saved yet: run the Requiem Solver migration in Supabase.' }
          : { state: 'error', message: 'Could not load your saved adversary.' });
        if (!isMissingTable(error)) console.error('Requiem load failed:', error);
      } else if (s) {
        idRef.current = s.id;
        sessionRef.current = s;
        attemptsRef.current = a;
        setSession(s);
        setAttempts(a);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // --- Saving ---------------------------------------------------------------

  const reportError = useCallback(error => {
    if (isMissingTable(error)) {
      setSave({ state: 'offline', message: 'Progress is not being saved yet: run the Requiem Solver migration in Supabase.' });
    } else {
      console.error('Requiem save failed:', error);
      setSave({ state: 'error', message: 'Could not save. Your changes are still on screen.' });
    }
  }, []);

  const ensureId = useCallback(async () => {
    if (idRef.current) return idRef.current;
    if (!creatingRef.current) creatingRef.current = createSession(sessionRef.current);
    const { id, error } = await creatingRef.current;
    if (error) { creatingRef.current = null; throw error; }
    idRef.current = id;
    return id;
  }, []);

  // Runs saves one at a time, in order, so quick taps can never overlap.
  const enqueue = useCallback(task => {
    setSave({ state: 'saving', message: '' });
    queueRef.current = queueRef.current
      .then(task)
      .then(() => setSave(s => (s.state === 'saving' ? { state: 'saved', message: '' } : s)))
      .catch(reportError);
  }, [reportError]);

  const commitSession = useCallback(next => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  const persistSession = useCallback(() => {
    const snapshot = sessionRef.current;
    if (validateSessionFields(snapshot).length > 0) return;
    enqueue(async () => {
      const id = await ensureId();
      const error = await updateSession(id, snapshot);
      if (error) throw error;
    });
  }, [enqueue, ensureId]);

  const changeSession = useCallback(patch => {
    commitSession({ ...sessionRef.current, ...patch });
    persistSession();
  }, [commitSession, persistSession]);

  const replaceAttempts = useCallback((next, { remember = true } = {}) => {
    const previous = attemptsRef.current;
    if (remember) setUndoStack(stack => [...stack.slice(-49), previous]);
    attemptsRef.current = next;
    setAttempts(next);
    enqueue(async () => {
      const id = await ensureId();
      const error = await syncAttempts(id, previous, next);
      if (error) throw error;
    });
  }, [enqueue, ensureId]);

  // --- Actions --------------------------------------------------------------

  function recordStab(equipped, failedSlot, usedUltimatum, existing) {
    const attempt = { ...existing, id: existing?.id ?? newId(), equipped, failedSlot, usedUltimatum };
    if (validateAttempt(attempt).length > 0) return;
    if (existing) {
      replaceAttempts(attemptsRef.current.map(a => (a.id === existing.id ? attempt : a)));
    } else {
      replaceAttempts([...attemptsRef.current, { ...attempt, number: nextAttemptNumber(attemptsRef.current) }]);
    }
    setForm(null);
    setForcing(false);
  }

  function deleteStab(attempt) {
    replaceAttempts(attemptsRef.current.filter(a => a.id !== attempt.id));
  }

  function undo() {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    replaceAttempts(previous, { remember: false });
  }

  function startNewAdversary(finished) {
    if (!finished && attempts.length > 0 && !window.confirm('Leave this adversary without finishing it? Its stabs stay saved.')) return;
    const closing = { ...sessionRef.current, status: finished ? 'completed' : 'abandoned' };
    if (idRef.current) {
      const id = idRef.current;
      enqueue(async () => {
        const error = await updateSession(id, closing);
        if (error) throw error;
      });
    }
    idRef.current = null;
    creatingRef.current = null;
    sessionRef.current = BLANK;
    attemptsRef.current = [];
    setSession(BLANK);
    setAttempts([]);
    setUndoStack([]);
    setForm(null);
    setForcing(false);
  }

  // --- Derived --------------------------------------------------------------

  const analysis = useMemo(
    () => analyzeSession({
      known: session.known, attempts, hasOull: session.hasOull,
      ultimatumCount: session.ultimatumCount, mode, saver, forcing,
    }),
    [session.known, session.hasOull, session.ultimatumCount, attempts, mode, saver, forcing]
  );

  const conflictIds = useMemo(() => new Set((analysis.conflict?.culprits ?? []).flat()), [analysis]);
  const formCandidates = useMemo(
    () => filterCandidates(session.known, attempts.filter(a => a.id !== form?.initial?.id)),
    [session.known, attempts, form]
  );
  const won = attempts.some(succeeded);

  if (loading) {
    return <p className="text-sm text-center py-10" style={{ color: COLOR.mutedInk }}>Loading your adversary…</p>;
  }

  const saveColor = { saved: COLOR.success, saving: COLOR.mutedInk, offline: COLOR.gold, error: COLOR.danger, idle: COLOR.agedInk }[save.state];
  const saveText = save.message || { saved: 'Saved', saving: 'Saving…', idle: '' }[save.state];

  return (
    <div className="max-w-6xl mx-auto px-4 pb-10">
      <div className="flex items-end justify-between flex-wrap gap-2 mb-4">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-[0.2em]" style={{ color: COLOR.gold }}>Requiem Solver</h2>
          <p className="text-xs" style={{ color: COLOR.mutedInk }}>
            Kuva Liches and Sisters of Parvos. Tell it what you know and what you tried; it tells you what to equip.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" className="text-xs" style={{ color: saveColor }}>{saveText}</span>
          <Button size="sm" variant="ghost" onClick={undo} disabled={undoStack.length === 0}>Undo</Button>
          <Button size="sm" variant="ghost" onClick={() => startNewAdversary(false)}>New adversary</Button>
        </div>
      </div>

      {won && (
        <Panel accent={COLOR.success} className="mb-4">
          <p className="text-sm font-bold" style={{ color: COLOR.success }}>Sequence cracked. This adversary is done.</p>
          <p className="text-xs mt-1 mb-3" style={{ color: COLOR.mutedInk }}>
            Not right? Edit or delete the winning stab below. Otherwise finish up and start the next one.
          </p>
          <Button size="sm" variant="success" onClick={() => startNewAdversary(true)}>Finish and start new</Button>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Right column first in the source so the answer is on top on phones. */}
        <div className="space-y-4 lg:order-2">
          <Panel accent={COLOR.gold}>
            <Heading>Recommendation</Heading>
            {analysis.status === 'conflict' ? (
              <div className="space-y-2">
                <p className="text-sm font-bold" style={{ color: COLOR.danger }}>Evidence conflict: no sequence fits everything you entered.</p>
                {analysis.conflict.culprits.length > 0 ? (
                  <p className="text-sm" style={{ color: COLOR.ink }}>
                    Likely typo: {analysis.conflict.culprits.map(set => set.map(id => `Stab ${attempts.findIndex(a => a.id === id) + 1}`).join(' + ')).join(', or ')}.
                    {' '}Those stabs are highlighted in red. Edit or delete one and the solver continues.
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: COLOR.ink }}>
                    Even with every stab removed this does not work, so check the Requiems marked as revealed.
                  </p>
                )}
              </div>
            ) : (
              <Recommendation
                analysis={analysis}
                forcing={forcing}
                onForcing={setForcing}
                onQuickRecord={(config, failedSlot) => recordStab(config, failedSlot, forcing)}
                onFormFill={config => setForm({ prefill: config })}
              />
            )}
          </Panel>

          {analysis.board && (
            <Panel>
              <Heading>What the evidence says</Heading>
              <EvidenceBoard board={analysis.board} known={session.known} />
              {analysis.facts.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs" style={{ color: COLOR.mutedInk }}>
                  {analysis.facts.map(f => <li key={f}>{f}</li>)}
                </ul>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-4 lg:order-1">
          <Panel>
            <Heading>Active adversary</Heading>
            <div className="flex flex-wrap gap-2 mb-3">
              {[['kuva_lich', 'Kuva Lich'], ['sister', 'Sister of Parvos']].map(([value, label]) => (
                <button
                  key={value} type="button" aria-pressed={session.adversaryType === value}
                  onClick={() => changeSession({ adversaryType: value })}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: session.adversaryType === value ? `${COLOR.gold}22` : COLOR.surface2,
                    border: `1px solid ${session.adversaryType === value ? COLOR.gold : COLOR.border}`,
                    color: session.adversaryType === value ? COLOR.gold : COLOR.mutedInk,
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button" disabled
                title="Technocyte Coda uses different mechanics (Antivirus and Potency) and will get its own solver."
                className="px-3 py-1.5 rounded-lg text-xs font-bold opacity-40"
                style={{ background: COLOR.surface2, border: `1px dashed ${COLOR.border}`, color: COLOR.mutedInk }}
              >
                Technocyte Coda · later
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block">
                <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.agedInk }}>Name (optional)</span>
                <input
                  value={session.adversaryName} maxLength={60}
                  onChange={e => commitSession({ ...sessionRef.current, adversaryName: e.target.value })}
                  onBlur={persistSession}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
                />
              </label>
              <label className="block">
                <span className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: COLOR.agedInk }}>Ultimatums owned</span>
                <input
                  type="number" min="0" max="99" value={session.ultimatumCount}
                  onChange={e => changeSession({ ultimatumCount: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm mb-2" style={{ color: COLOR.ink }}>
              <input type="checkbox" checked={session.hasOull} onChange={e => changeSession({ hasOull: e.target.checked })} />
              I have an Oull to use
            </label>
            <label className="flex items-center gap-2 text-sm mb-2" style={{ color: COLOR.ink }}>
              <input type="checkbox" checked={saver} onChange={e => setSaver(e.target.checked)} />
              Ultimatum Saver (hold Ultimatums until a stab is worth it)
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: COLOR.ink }}>
              Plan for
              <select value={mode} onChange={e => setMode(e.target.value)} className="rounded-lg px-2 py-1 text-sm outline-none" style={inputStyle}>
                <option value="expected">fewest stabs on average</option>
                <option value="worst">fewest stabs in the worst case</option>
              </select>
            </label>
          </Panel>

          <Panel>
            <Heading>Known Requiems</Heading>
            <KnownRequiems known={session.known} onChange={known => changeSession({ known })} />
          </Panel>

          <Panel>
            <Heading>Stab history</Heading>
            <StabHistory
              attempts={attempts} conflictIds={conflictIds}
              onEdit={a => setForm({ initial: a })} onDelete={deleteStab}
            />
            <div className="mt-3">
              {form ? (
                <div className="rounded-xl p-3" style={{ background: COLOR.surface1, border: `1px solid ${COLOR.border}` }}>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: COLOR.agedInk }}>
                    {form.initial ? 'Edit stab' : 'Record a stab'}
                  </p>
                  <StabForm
                    key={form.initial?.id ?? (form.prefill ? form.prefill.join() : 'new')}
                    initial={form.initial ?? (form.prefill ? { equipped: form.prefill, failedSlot: undefined, usedUltimatum: forcing } : null)}
                    otherAttempts={attempts.filter(a => a.id !== form.initial?.id)}
                    candidates={formCandidates}
                    defaultUltimatum={forcing}
                    onSubmit={a => recordStab(a.equipped, a.failedSlot, a.usedUltimatum, form.initial)}
                    onCancel={() => setForm(null)}
                  />
                </div>
              ) : (
                <Button size="sm" onClick={() => setForm({})}>Record a stab</Button>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
