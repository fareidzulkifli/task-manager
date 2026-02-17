import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This is safe for both Client and Server, but doesn't handle cookies
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null

// Re-export helpers from their respective environment-safe files
export { createClient } from './supabase/client'
// Note: We don't export createServer from here because this file 
// might be imported by Client Components.
