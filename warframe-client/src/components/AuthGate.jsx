import { useState, useEffect } from 'react'
import { supabase, wfUser } from '../lib/supabase'
import useSession from '../hooks/useSession'
import { classifyOwnerCheck } from '../utils/ownerCheck'
import { COLOR } from '../constants/theme'
import Button from './ui/Button'
import LoginPage from './LoginPage'

function Centered({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: COLOR.page, color: COLOR.ink }}>
      <div className="w-full max-w-sm text-center">{children}</div>
    </div>
  )
}

// Wraps the whole app: nobody sees Gu without signing in. After sign-in it
// also confirms the account is the app's owner (a row in wf_user.app_owners),
// so a stranger who signs in with their own Google account gets a clear
// "not authorized" screen instead of an app full of failed requests. The
// database's row-level security is the real enforcement; this is the friendly
// front for it.
export default function AuthGate({ children }) {
  const { session, loading } = useSession()
  const [access, setAccess] = useState('checking') // checking | owner | not-owner | not-enforced | error
  const [attempt, setAttempt] = useState(0)

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    wfUser
      .from('app_owners')
      .select('user_id')
      .maybeSingle()
      .then(result => {
        if (!cancelled) setAccess(classifyOwnerCheck(result))
      })
    return () => { cancelled = true }
  }, [userId, attempt])

  if (loading) {
    return (
      <Centered>
        <p className="text-lg font-bold uppercase tracking-[0.3em]" style={{ color: COLOR.gold }}>Loading...</p>
      </Centered>
    )
  }

  if (!session) return <LoginPage />

  if (access === 'checking') {
    return (
      <Centered>
        <p className="text-sm uppercase tracking-[0.3em]" style={{ color: COLOR.mutedInk }}>Checking access...</p>
      </Centered>
    )
  }

  if (access === 'not-owner') {
    return (
      <Centered>
        <h1 className="text-2xl font-bold tracking-[0.2em] uppercase mb-3" style={{ color: COLOR.danger }}>Not authorized</h1>
        <p className="text-sm mb-6" style={{ color: COLOR.mutedInk }}>
          This Google account is signed in but is not allowed to use Cephalon Gu.
        </p>
        <Button variant="ghost" fullWidth onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </Centered>
    )
  }

  if (access === 'error') {
    return (
      <Centered>
        <p className="text-sm mb-6" style={{ color: COLOR.mutedInk }}>Could not verify access. Check your connection and try again.</p>
        <div className="flex gap-2">
          <Button variant="primary" color={COLOR.gold} className="flex-1" onClick={() => { setAccess('checking'); setAttempt(n => n + 1) }}>Retry</Button>
          <Button variant="ghost" className="flex-1" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>
      </Centered>
    )
  }

  return children
}
