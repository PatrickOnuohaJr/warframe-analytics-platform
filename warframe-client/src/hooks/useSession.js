import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Current Supabase auth session. `loading` is true until the stored session
// (or the OAuth redirect's code exchange) has been resolved, so callers don't
// flash the login screen at an already-signed-in user.
export default function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  return { session, loading }
}
