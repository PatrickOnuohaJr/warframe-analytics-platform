import { useEffect, useMemo, useRef, useState } from 'react';
import { COLOR } from '../../constants/theme';
import { KUVA_WEAPONS, KUVA_WEAPON_NAMES } from '../../constants/kuvaWeapons';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import {
  emptyCycle, rejectWeapon, unrejectWeapon, takeWeapon, finishLich, setTarget, poolOf, huntOdds, validateCycle,
} from '../../utils/kuvaCycle';
import { loadCycle, saveCycle, isMissingTable } from '../../lib/weaponCycleStore';

const inputStyle = { background: COLOR.surface2, border: `1px solid ${COLOR.border}`, color: COLOR.ink };
const shortName = name => name.replace(/^Kuva /, '');

function oddsText(odds) {
  if (odds.status === 'possible') {
    const n = odds.remaining;
    return `Still in the pool. At most ${n} more finished mission${n === 1 ? '' : 's'} until it shows `
      + `(about 1 in ${n} per Larvling if the game picks evenly, which the wiki does not confirm).`;
  }
  if (odds.status === 'cycled') {
    const n = odds.missionsUntilReset;
    return `Already cycled, so it will not show again until the list resets: ${n} more finished mission${n === 1 ? '' : 's'}, or taking any weapon.`;
  }
  return 'Pick the weapon you are hunting to see how close you are.';
}

// Which Kuva weapons you have cycled past. Tap a weapon after you FINISH a
// mission without taking it. Aborting does not remove it from the pool, so tap
// nothing then. Saved to Supabase; works in memory if the table is missing.
export default function KuvaCycleTracker() {
  const [cycle, setCycle] = useState(emptyCycle());
  const [undoStack, setUndoStack] = useState([]);
  const [notice, setNotice] = useState('');
  const [save, setSave] = useState({ state: 'idle', message: '' });
  const [loaded, setLoaded] = useState(false);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let live = true;
    loadCycle().then(({ state, error }) => {
      if (!live) return;
      if (error) {
        setSave(isMissingTable(error)
          ? { state: 'offline', message: 'Not saved: run the weapon cycle migration to keep this between visits.' }
          : { state: 'error', message: `Could not load the saved cycle (${error.message}).` });
      } else if (state && validateCycle(state).length === 0) {
        setCycle(state);
      }
      setLoaded(true);
    });
    return () => { live = false; };
  }, []);

  // Apply a change, remember the old state for Undo, and save in order.
  function commit(next, message = '') {
    setUndoStack(stack => [...stack.slice(-19), cycle]);
    setNotice(message);
    setCycle(next);
    persist(next);
  }

  function persist(next) {
    if (save.state === 'offline') return;
    setSave({ state: 'saving', message: '' });
    queue.current = queue.current.then(async () => {
      const error = await saveCycle(next);
      if (!error) setSave({ state: 'saved', message: '' });
      else if (isMissingTable(error)) setSave({ state: 'offline', message: 'Not saved: run the weapon cycle migration to keep this between visits.' });
      else setSave({ state: 'error', message: `Save failed (${error.message}).` });
    });
  }

  function toggle(name) {
    if (cycle.rejected.includes(name)) {
      commit(unrejectWeapon(cycle, name));
      return;
    }
    const { state, reset } = rejectWeapon(cycle, name);
    commit(state, reset ? `All ${KUVA_WEAPON_NAMES.length} weapons have cycled, so the list started over.` : '');
  }

  function take(name) {
    if (!name) return;
    const hunted = cycle.target === name;
    commit(
      takeWeapon(cycle, name),
      `${name} is now your Lich. The cycled list reset${hunted ? ', and you got the weapon you were hunting' : ''}.`,
    );
  }

  function undo() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack(stack => stack.slice(0, -1));
    setNotice('');
    setCycle(previous);
    persist(previous);
  }

  const pool = useMemo(() => poolOf(cycle), [cycle]);
  const odds = useMemo(() => huntOdds(cycle), [cycle]);
  const saveColor = { saved: COLOR.success, saving: COLOR.mutedInk, offline: COLOR.gold, error: COLOR.danger, idle: COLOR.agedInk }[save.state];
  const saveText = save.message || { saved: 'Saved', saving: 'Saving…', idle: '' }[save.state];

  return (
    <Panel>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: COLOR.gold }}>Kuva Weapon Cycle</h3>
        <div className="flex items-center gap-2">
          <span role="status" className="text-xs" style={{ color: saveColor }}>{saveText}</span>
          <Button size="sm" variant="ghost" onClick={undo} disabled={undoStack.length === 0}>Undo cycle change</Button>
        </div>
      </div>

      <p className="text-xs mb-3" style={{ color: COLOR.mutedInk }}>
        Finished a mission and ignored the Larvling? Tap its weapon: it will not show again until the others have cycled.
        Aborted or extracted early? Tap nothing, the weapon stays in the pool. Took the weapon? Pick it at the bottom: that resets the list and makes it your current Lich.
      </p>

      {!loaded ? (
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>Loading your cycle…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="text-sm flex items-center gap-2" style={{ color: COLOR.ink }}>
              Hunting
              <select
                value={cycle.target ?? ''}
                onChange={e => commit(setTarget(cycle, e.target.value))}
                className="rounded-lg px-2 py-1 text-sm"
                style={inputStyle}
              >
                <option value="">Nothing in particular</option>
                {KUVA_WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
              </select>
            </label>
            <p className="text-sm font-bold" style={{ color: COLOR.ink }}>
              {cycle.rejected.length} of {KUVA_WEAPON_NAMES.length} cycled · {pool.length} still possible
            </p>
          </div>

          {cycle.currentLich && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 mb-3" style={{ background: COLOR.surface1, border: `1px solid ${COLOR.success}66` }}>
              <p className="text-sm" style={{ color: COLOR.ink }}>
                Current Lich: <span className="font-bold" style={{ color: COLOR.success }}>{cycle.currentLich}</span>.
                {' '}It holds your slot until you convert or vanquish it.
              </p>
              <Button size="sm" variant="ghost" onClick={() => commit(finishLich(cycle), 'Lich finished: your slot is free and the cycled list reset.')}>
                Converted or vanquished
              </Button>
            </div>
          )}

          <p className="text-xs mb-3" style={{ color: odds.status === 'cycled' ? COLOR.gold : COLOR.mutedInk }}>{oddsText(odds)}</p>
          {notice && <p role="alert" className="text-xs mb-3" style={{ color: COLOR.success }}>{notice}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 2xl:grid-cols-3 gap-2 mb-3">
            {KUVA_WEAPONS.map(({ name, category }) => {
              const cycled = cycle.rejected.includes(name);
              const hunted = cycle.target === name;
              const current = cycle.currentLich === name;
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={cycled}
                  aria-label={name}
                  onClick={() => toggle(name)}
                  className="rounded-xl px-2 py-2 text-left transition-colors"
                  style={{
                    background: cycled ? COLOR.surface1 : COLOR.surface2,
                    border: `1px solid ${hunted ? COLOR.gold : current ? COLOR.success : COLOR.border}`,
                    boxShadow: hunted ? `0 0 0 1px ${COLOR.gold}` : undefined,
                    opacity: cycled ? 0.55 : 1,
                  }}
                >
                  <span className="block text-sm font-bold" style={{ color: hunted ? COLOR.gold : COLOR.ink, textDecoration: cycled ? 'line-through' : 'none' }}>
                    {shortName(name)}
                  </span>
                  <span className="block text-[9px] uppercase tracking-wider" style={{ color: cycled ? COLOR.agedInk : hunted ? COLOR.gold : current ? COLOR.success : COLOR.mutedInk }}>
                    {current ? 'Current Lich' : cycled ? 'Cycled' : hunted ? 'Hunting' : category}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="text-sm flex items-center gap-2" style={{ color: COLOR.ink }}>
            I took
            <select
              value=""
              onChange={e => take(e.target.value)}
              className="rounded-lg px-2 py-1 text-sm"
              style={inputStyle}
            >
              <option value="">Pick the weapon you took…</option>
              {KUVA_WEAPONS.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
            </select>
            <span className="text-xs" style={{ color: COLOR.mutedInk }}>(resets the cycled list)</span>
          </label>
        </>
      )}
    </Panel>
  );
}
