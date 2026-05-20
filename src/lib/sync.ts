import { supabase, ROW_ID } from './supabase';
import { useProjectStore } from '../store/projectStore';
import { create } from 'zustand';

// ── Sync status store (for UI indicator) ─────────────────────────────────────

interface SyncState {
  status: 'idle' | 'syncing' | 'ok' | 'error';
  error: string | null;
  lastSync: string | null;
  setStatus: (s: SyncState['status'], error?: string | null) => void;
  setLastSync: () => void;
}

export const useSyncStore = create<SyncState>()(set => ({
  status: 'idle',
  error: null,
  lastSync: null,
  setStatus: (status, error = null) => set({ status, error }),
  setLastSync: () => set({ lastSync: new Date().toLocaleTimeString('es-ES'), status: 'ok', error: null }),
}));

// ── Core sync logic ───────────────────────────────────────────────────────────

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let isPulling = false;

export async function pullFromSupabase() {
  const { setStatus, setLastSync } = useSyncStore.getState();
  setStatus('syncing');

  const { data, error } = await supabase
    .from('weekly_worklog_state')
    .select('data')
    .eq('id', ROW_ID)
    .single();

  console.log('[sync] pull result:', { data, error });

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[sync] pull error:', error);
      setStatus('error', error.message);
    } else {
      console.log('[sync] no row yet (PGRST116)');
      setStatus('ok');
    }
    return;
  }

  console.log('[sync] raw data from Supabase:', data.data);

  const { projects, entries } = data.data as { projects: any[]; entries: any[] };
  console.log('[sync] projects count:', projects?.length, 'entries count:', entries?.length);

  if (Array.isArray(projects) && Array.isArray(entries)) {
    isPulling = true;
    useProjectStore.getState().loadAll(projects, entries);
    isPulling = false;
    console.log('[sync] loadAll done, store now has:', useProjectStore.getState().projects.length, 'projects');
    setLastSync();
  }
}

export async function pushToSupabase() {
  const { setStatus, setLastSync } = useSyncStore.getState();
  setStatus('syncing');

  const { projects, entries } = useProjectStore.getState();
  console.log('[sync] pushing to Supabase:', projects.length, 'projects,', entries.length, 'entries');

  const { error } = await supabase
    .from('weekly_worklog_state')
    .upsert({ id: ROW_ID, data: { projects, entries }, updated_at: new Date().toISOString() });

  if (error) {
    console.error('[sync] push error:', error);
    setStatus('error', error.message);
  } else {
    console.log('[sync] push ok');
    setLastSync();
  }
}

function schedulePush() {
  if (isPulling) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToSupabase, 1000);
}

export function startSync() {
  pullFromSupabase();

  // Re-pull when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pullFromSupabase();
  });

  // Realtime: get notified when another device pushes
  supabase
    .channel('worklog-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'weekly_worklog_state' },
      () => { pullFromSupabase(); }
    )
    .subscribe();

  // Auto-push on every local change
  useProjectStore.subscribe(() => {
    schedulePush();
  });
}
