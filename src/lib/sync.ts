import { supabase, ROW_ID } from './supabase';
import { useProjectStore } from '../store/projectStore';

let pushTimer: ReturnType<typeof setTimeout> | null = null;

export async function pullFromSupabase() {
  const { data, error } = await supabase
    .from('weekly_worklog_state')
    .select('data')
    .eq('id', ROW_ID)
    .single();

  if (error || !data) return;

  const { projects, entries } = data.data as { projects: any[]; entries: any[] };
  if (Array.isArray(projects) && Array.isArray(entries)) {
    useProjectStore.getState().loadAll(projects, entries);
  }
}

export async function pushToSupabase() {
  const { projects, entries } = useProjectStore.getState();
  await supabase
    .from('weekly_worklog_state')
    .upsert({ id: ROW_ID, data: { projects, entries }, updated_at: new Date().toISOString() });
}

// Debounced push — called after every store change
export function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToSupabase, 1000);
}

// Subscribe to store changes and auto-push
export function startSync() {
  pullFromSupabase();

  useProjectStore.subscribe(() => {
    schedulePush();
  });
}
