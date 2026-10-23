import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// PKCE is the recommended OAuth flow for browser apps: the sign-in redirect
// carries a one-time code that this client exchanges, instead of putting
// tokens in the URL. The session is persisted and refreshed automatically.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce' },
})

export const wfUser = supabase.schema('wf_user')
export const wfBase = supabase.schema('wf_base')
