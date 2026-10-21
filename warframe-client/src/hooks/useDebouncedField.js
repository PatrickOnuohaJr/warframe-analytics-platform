import { useEffect, useRef, useState } from 'react'

// Local-first controlled value that persists itself a moment after the
// user stops changing it, instead of needing an explicit Save button.
// Typing/selecting updates the displayed value instantly; onCommit (a
// Supabase write) fires ~delay ms after the last change, debounced so a
// fast typist or a dropdown click-then-correct doesn't fire one write per
// keystroke. Resets its local value whenever `value` itself changes from
// outside (e.g. switching which frame is open).
export default function useDebouncedField(value, onCommit, delay = 600) {
  const [local, setLocal] = useState(value)
  const timer = useRef(null)
  const committing = useRef(onCommit)
  useEffect(() => { committing.current = onCommit }, [onCommit])

  const [previousValue, setPreviousValue] = useState(value)
  if (!Object.is(previousValue, value)) {
    setPreviousValue(value)
    setLocal(value)
  }

  useEffect(() => {
    // A changed external value invalidates an unsaved edit from the old value.
    clearTimeout(timer.current)
  }, [value])

  useEffect(() => () => clearTimeout(timer.current), [])

  function set(next) {
    setLocal(next)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => committing.current(next), delay)
  }

  return [local, set]
}
