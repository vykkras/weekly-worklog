import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://rqnmaoqzdwnuaiwrutte.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxbm1hb3F6ZHdudWFpd3J1dHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODE1MzAsImV4cCI6MjA4NDU1NzUzMH0.ZE77nGj5-4zCSDwmAh5exlnQ_NcVxGniDVua_qLA0Fs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const ROW_ID = 'dc-weekly';
