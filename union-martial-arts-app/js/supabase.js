import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://gdajgennlsuvndanpxiz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkYWpnZW5ubHN1dm5kYW5weGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTkyNDQsImV4cCI6MjA5NzYzNTI0NH0.1WS-prurHgq2iiRlhqePB4a8ZkiQwXv7MK0TA7GI3iI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
