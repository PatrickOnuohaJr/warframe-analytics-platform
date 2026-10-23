import { supabase } from '../lib/supabase'
import { COLOR } from '../constants/theme'

// Small text control for the masthead. AuthGate reacts to the session ending
// and returns to the login screen.
export default function SignOutButton() {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="text-[10px] uppercase font-bold tracking-[0.2em]"
      style={{ color: COLOR.mutedInk, background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      Sign out
    </button>
  )
}
