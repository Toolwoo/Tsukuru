// 1) Initialize the client
const SUPABASE_URL = "https://hjpjtufobzttssidfexf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqcGp0dWZvYnp0dHNzaWRmZXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTY0OTQsImV4cCI6MjA3OTM5MjQ5NH0.xAAAGortVAhOIeKoMyWNvJDrc0kr0FjfTzn3V99wFS0";

// Use the correct object name: Supabase
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

