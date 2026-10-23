import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { COLOR } from '../constants/theme'
import Button from './ui/Button'

// Sign-in screen shown to anyone without a session. Google is the only
// method; Supabase handles the redirect and brings the user back here.
export default function LoginPage() {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function signInWithGoogle() {
    setBusy(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser is already navigating to Google; only a failure
    // to even start the flow gets here.
    if (signInError) {
      console.error('Google sign-in failed to start:', signInError.message)
      setError('Could not start Google sign-in.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: COLOR.page, color: COLOR.ink }}>
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-4 mb-3">
          <span className="h-px w-14" style={{ background: `linear-gradient(90deg, transparent, ${COLOR.gold}B3)` }} />
          <span className="w-1.5 h-1.5 rotate-45" style={{ background: COLOR.gold }} />
          <span className="h-px w-14" style={{ background: `linear-gradient(90deg, ${COLOR.gold}B3, transparent)` }} />
        </div>
        <h1 className="text-3xl font-bold tracking-[0.3em] uppercase mb-2" style={{ color: COLOR.gold }}>
          Cephalon Gu
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-8" style={{ color: COLOR.mutedInk }}>
          Personal Cultivation Codex
        </p>

        <Button variant="primary" color={COLOR.gold} fullWidth onClick={signInWithGoogle} disabled={busy}>
          {busy ? 'Redirecting...' : 'Sign in with Google'}
        </Button>

        {error && <p className="text-sm mt-4" style={{ color: COLOR.danger }}>{error}</p>}
      </div>
    </div>
  )
}
