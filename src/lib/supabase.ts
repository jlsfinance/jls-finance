import { createClient } from '@supabase/supabase-js'

// WARNING: 
// 1. Create a new project at https://supabase.com/
// 2. Go to Project Settings > API and find your Project URL and anon public key
// 3. Replace the placeholder values below with your actual credentials
// 4. For production, these should be in environment variables (.env.local) and not hardcoded.
const supabaseUrl = 'YOUR_SUPABASE_URL' // e.g., 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'

// This is a check to ensure you've updated the credentials.
if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn("Supabase URL or Anon Key is not set. Please update them in src/lib/supabase.ts. The application will not work correctly until these are set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
