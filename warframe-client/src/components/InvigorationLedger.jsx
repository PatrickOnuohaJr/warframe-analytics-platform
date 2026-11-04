import { useState, useEffect } from 'react'
import Panel from './ui/Panel'
import Button from './ui/Button'
import { COLOR } from '../constants/theme'
import {
  deriveCounter, offerStatus, overrideFor, offerEvents, describeEvent, COUNTER_CAP, timeLeftInWeek,
} from '../utils/invigorationLedger'

// Invigoration activity UI for the Home page: per-offer status controls and the
// Override panel (counter, calibration, Override use, history). The rules live
// in utils/invigorationLedger.js; the weekly OFFER cards themselves stay in
// HomePage. Offers are what was offered; nothing here changes them.

const STATUS_LOOK = {
  pending: { label: 'Pending', color: '#B8B3AC' },
  applied: { label: 'Applied', color: '#4CAF50' },
  skipped: { label: 'Skipped', color: '#E8B84B' },
}

// "X days Y hours left" until the weekly reset. Re-reads the clock every
// minute so the hour changes on time while the page stays open; shows hours
// only, no minutes or seconds.
export function WeekCountdown() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])
  const { days, hours } = timeLeftInWeek(now)
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
  return (
    <span
      className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5 rounded"
      style={{ border: '1px solid rgba(232,184,75,0.4)', color: '#E8B84B' }}
      data-testid="week-countdown"
      title="Time until the weekly reset (Monday 00:00 UTC)"
    >
      {plural(days, 'day')} {plural(hours, 'hour')} left
    </span>
  )
}

// Status chip + Applied / Skipped / Undo for one offer card. `log` is the
// useInvigorationLog result. Clicks do not bubble (the card itself opens the
// edit modal).
export function OfferStatus({ offer, log, onError }) {
  const [saving, setSaving] = useState(false)
  const status = offerStatus(log.events, offer.id)
  const look = STATUS_LOOK[status]
  const overrideEvent = overrideFor(log.events, offer.id)
  const overrideApplied = offerEvents(log.events, offer.id)
    .find(e => e.event_type === 'applied' && e.recipient_role === 'override')

  async function act(draft) {
    setSaving(true)
    const problem = await log.record(draft, offer)
    setSaving(false)
    if (problem) onError(problem)
  }

  async function undo() {
    const live = offerEvents(log.events, offer.id).find(
      e => e.recipient_role === 'original' && (e.event_type === 'applied' || e.event_type === 'skipped')
    )
    if (!live) return
    setSaving(true)
    const problem = await log.voidEvent(live.event_id, 'Undone from the offer card')
    setSaving(false)
    if (problem) onError(problem)
  }

  if (!log.loaded || log.missing) return null

  return (
    <div className="mt-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded"
          style={{ border: `1px solid ${look.color}66`, color: look.color }}
          data-testid={`offer-status-${offer.slot}`}
        >
          {look.label}
        </span>
        {overrideEvent && (
          <span className="text-[9px] uppercase tracking-widest" style={{ color: '#9B59B6' }}>
            Override: {overrideEvent.recipient_frame_name}{overrideApplied ? ' (applied)' : ''}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {status === 'pending' ? (
          <>
            <Button variant="success" size="sm" disabled={saving} onClick={() => act({ type: 'applied' })}>Applied</Button>
            <Button variant="ghost" size="sm" disabled={saving} onClick={() => act({ type: 'skipped' })}>Skipped</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" disabled={saving} onClick={undo}>Undo</Button>
        )}
        {overrideEvent && !overrideApplied && (
          <Button variant="info" size="sm" disabled={saving} onClick={() => act({ type: 'applied', role: 'override', recipient: overrideEvent.recipient_frame_name })}>
            Override applied
          </Button>
        )}
      </div>
    </div>
  )
}

// Progress bar, calibration, Override form and history.
export function OverridePanel({ offers, frames, log, onError }) {
  const [setValue, setSetValue] = useState('')
  const [overrideSlot, setOverrideSlot] = useState('')
  const [overrideRecipient, setOverrideRecipient] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!log.loaded) return null

  if (log.missing) {
    return (
      <Panel className="mt-4">
        <p className="text-sm" style={{ color: COLOR.mutedInk }}>
          The Invigoration log is not set up yet. Run <code>DB/Migrations/20261103_add_invigoration_events.sql</code> in
          Supabase to track applications and the Override counter.
        </p>
      </Panel>
    )
  }

  const { progress, ready } = deriveCounter(log.events)
  const sortedHistory = log.events.slice().sort((a, b) => b.event_id - a.event_id)

  async function run(draft, offer) {
    setSaving(true)
    const problem = await log.record(draft, offer)
    setSaving(false)
    if (problem) onError(problem)
    return !problem
  }

  async function calibrate() {
    if (await run({ type: 'counter_set', counterValue: setValue })) setSetValue('')
  }

  async function useOverride() {
    const offer = offers.find(o => o.slot === overrideSlot)
    if (!offer) return onError('Pick the slot the Override was used on.')
    if (await run({ type: 'override_selected', recipient: overrideRecipient }, offer)) {
      setOverrideSlot('')
      setOverrideRecipient('')
    }
  }

  async function voidOne(e) {
    const reason = window.prompt('Why are you voiding this entry? (optional)', '')
    if (reason === null) return
    setSaving(true)
    const problem = await log.voidEvent(e.event_id, reason)
    setSaving(false)
    if (problem) onError(problem)
  }

  const inputStyle = { background: '#4A443B', border: '1px solid #6F6A62', color: '#E8E4DC' }

  return (
    <Panel className="mt-4 space-y-4" accent="#9B59B6" data-testid="override-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: '#9B59B6' }}>Override progress</p>
        <p className="text-sm font-bold tabular-nums" style={{ color: COLOR.ink }} data-testid="override-progress">
          {progress} / {COUNTER_CAP} applied
        </p>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#2F2A23' }}>
        <div className="h-full" style={{ width: `${(progress / COUNTER_CAP) * 100}%`, background: ready ? '#4CAF50' : '#9B59B6' }} />
      </div>

      <p className="text-xs" style={{ color: COLOR.mutedInk }}>
        Only Invigorations you mark Applied move this. Offers, skips and edits do not, and it does not reset when the week changes.
      </p>

      {ready && (
        <div className="rounded-lg p-3 space-y-2" style={{ border: '1px solid #4CAF50', background: 'rgba(76,175,80,0.08)' }}>
          <p className="text-sm font-bold" style={{ color: '#4CAF50' }}>Override Ready</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select aria-label="Override slot" value={overrideSlot} onChange={e => setOverrideSlot(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
              <option value="">Slot overridden</option>
              {offers.filter(o => o.slot && !overrideFor(log.events, o.id)).map(o => (
                <option key={o.id} value={o.slot}>Slot {o.slot} ({o.frame_name})</option>
              ))}
            </select>
            <select aria-label="Override recipient" value={overrideRecipient} onChange={e => setOverrideRecipient(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
              <option value="">New recipient</option>
              {[...frames].sort((a, b) => a.warframe_name.localeCompare(b.warframe_name)).map(f => (
                <option key={f.my_frame_id} value={f.warframe_name}>{f.warframe_name}</option>
              ))}
            </select>
            <Button variant="success" disabled={saving || !overrideSlot || !overrideRecipient} onClick={useOverride}>Record Override</Button>
          </div>
          <p className="text-[11px]" style={{ color: COLOR.mutedInk }}>
            The slot keeps its buff pair; only who receives it changes. Recording this resets progress to 0. Then mark the
            new recipient Applied on that slot's card.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-[10px] uppercase tracking-widest" style={{ color: COLOR.mutedInk }} htmlFor="override-set">
          Match the game
        </label>
        <input id="override-set" type="number" min="0" max={COUNTER_CAP} value={setValue} onChange={e => setSetValue(e.target.value)}
          placeholder="0-10" className="w-20 rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
        <Button variant="ghost" size="sm" disabled={saving || setValue === ''} onClick={calibrate}>Set count</Button>
      </div>

      <div>
        <button type="button" className="text-[10px] uppercase tracking-widest underline" style={{ color: COLOR.mutedInk }}
          onClick={() => setShowHistory(v => !v)}>
          {showHistory ? 'Hide history' : `History (${log.events.length})`}
        </button>
        {showHistory && (
          <ul className="mt-2 space-y-1" data-testid="invigoration-history">
            {sortedHistory.length === 0 && <li className="text-xs" style={{ color: COLOR.mutedInk }}>Nothing recorded yet.</li>}
            {sortedHistory.map(e => (
              <li key={e.event_id} className="flex items-start justify-between gap-3 text-xs"
                style={{ color: e.voided_at ? '#6F6A62' : COLOR.ink, textDecoration: e.voided_at ? 'line-through' : 'none' }}>
                <span>
                  {new Date(e.occurred_at).toLocaleDateString()} · {describeEvent(e)}
                  {e.voided_at && e.void_reason ? ` (voided: ${e.void_reason})` : ''}
                </span>
                {!e.voided_at && (
                  <button type="button" className="underline shrink-0" style={{ color: COLOR.mutedInk }} onClick={() => voidOne(e)}>Void</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
