import { supabase, ROW_ID } from './supabase';
import { useProjectStore } from '../store/projectStore';

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let isPulling = false; // prevents pull → subscribe → push loop

export async function pullFromSupabase() {
  const { data, error } = await supabase
    .from('weekly_worklog_state')
    .select('data')
    .eq('id', ROW_ID)
    .single();

  if (error || !data) return;

  const { projects, entries } = data.data as { projects: any[]; entries: any[] };
  if (Array.isArray(projects) && Array.isArray(entries)) {
    isPulling = true;
    useProjectStore.getState().loadAll(projects, entries);
    isPulling = false;
  }
}

export async function pushToSupabase() {
  const { projects, entries } = useProjectStore.getState();
  await supabase
    .from('weekly_worklog_state')
    .upsert({ id: ROW_ID, data: { projects, entries }, updated_at: new Date().toISOString() });
}

function schedulePush() {
  if (isPulling) return; // don't push data we just pulled
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToSupabase, 1000);
}

export function startSync() {
  // Pull on load
  pullFromSupabase();

  // Re-pull when tab becomes visible (switching from phone → laptop etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullFromSupabase();
  });

  // Real-time: Supabase notifies us when another device pushes a change
  supabase
    .channel('worklog-sync')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'weekly_worklog_state', filter: `id=eq.${ROW_ID}` },
      () => { pullFromSupabase(); }
    )
    .subscribe();

  // Push on every local store change
  useProjectStore.subscribe(() => {
    schedulePush();
  });
}
