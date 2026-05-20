import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://pmcllnbkzoztwpsxdbgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtY2xsbmJrem96dHdwc3hkYmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzA2OTIsImV4cCI6MjA5MTI0NjY5Mn0.NOt__NLICA5Bf9HYruBGQ8mJLq-YFAOHo_2r7RJQl5U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const ROW_ID = 'dc-weekly';
