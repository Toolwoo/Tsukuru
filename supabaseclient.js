import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hjpjtufobzttssidfexf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGp0dWZvYnp0dHNzaWRmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTY0OTQsImV4cCI6MjA3OTM5MjQ5NH0.xAAAGortVAhOIeKoMyWNvJDrc0kr0FjfTzn3V99wFS0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
