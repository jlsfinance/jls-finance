import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://inxfnmihzjsbtcrvbhie.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
