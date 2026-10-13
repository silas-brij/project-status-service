import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// When the env vars are missing the app renders a setup screen instead of
// using this client, so the placeholders below are never actually called.
export const supabase = createClient(url || 'http://localhost:54321', key || 'missing-anon-key')
