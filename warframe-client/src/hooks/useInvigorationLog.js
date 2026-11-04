import { useCallback, useEffect, useRef, useState } from 'react';
import { loadEvents, addEvent, voidEvent, isMissingMigration } from '../lib/invigorationStore';
import { validateEvent } from '../utils/invigorationLedger';

// Loads the Invigoration event log and records/voids events. `record` returns
// an error string (or null on success) so the caller can show it. A lock
// ref blocks a second submit while one is in flight, so a double click can not
// create a duplicate application (the database also refuses duplicates).
export default function useInvigorationLog() {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false); // migration not run yet
  const [loadError, setLoadError] = useState(null);
  const busy = useRef(false);

  const reload = useCallback(async () => {
    const { events: rows, error } = await loadEvents();
    if (error) {
      setMissing(isMissingMigration(error));
      setLoadError(error.message);
    } else {
      setMissing(false);
      setLoadError(null);
      setEvents(rows);
    }
    setLoaded(true);
  }, []);

  // Initial load: state is set only after the awaited fetch, not synchronously.
  useEffect(() => {
    let cancelled = false;
    loadEvents().then(({ events: rows, error }) => {
      if (cancelled) return;
      if (error) {
        setMissing(isMissingMigration(error));
        setLoadError(error.message);
      } else {
        setEvents(rows);
      }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const record = useCallback(async (draft, offer) => {
    if (busy.current) return 'Still saving the previous change.';
    const problem = validateEvent(events, draft, offer);
    if (problem) return problem;
    busy.current = true;
    try {
      const { error } = await addEvent(draft, offer);
      if (error) {
        // 23505 = the database's duplicate guard caught a repeat.
        return error.code === '23505' ? 'That was already recorded.' : error.message;
      }
      await reload();
      return null;
    } finally {
      busy.current = false;
    }
  }, [events, reload]);

  const voidIt = useCallback(async (eventId, reason) => {
    if (busy.current) return 'Still saving the previous change.';
    busy.current = true;
    try {
      const error = await voidEvent(eventId, reason);
      if (error) return error.message;
      await reload();
      return null;
    } finally {
      busy.current = false;
    }
  }, [reload]);

  return { events, loaded, missing, loadError, record, voidEvent: voidIt };
}
