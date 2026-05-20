import { supabase, ROW_ID } from './supabase';
import { useProjectStore } from '../store/projectStore';
import { create } from 'zustand';

// ── Sync status store (for UI indicator) ─────────────────────────────────────

interface SyncState {
  status: 'idle' | 'syncing' | 'ok' | 'error';
  error: string | null;
  lastSync: string | null;
  setStatus: (s: SyncState['status'], error?: string) => void;
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

  if (error) {
    // PGRST116 = row not found — normal on first use
    if (error.code !== 'PGRST116') {
      console.error('[sync] pull error:', error);
      setStatus('error', error.message);
    } else {
      setStatus('ok');
    }
    return;
  }

  const { projects, entries } = data.data as { projects: any[]; entries: any[] };
  if (Array.isArray(projects) && Array.isArray(entries)) {
    isPulling = true;
    useProjectStore.getState().loadAll(projects, entries);
    isPulling = false;
    setLastSync();
  }
}

export async function pushToSupabase() {
  const { setStatus, setLastSync } = useSyncStore.getState();
  setStatus('syncing');

  const { projects, entries } = useProjectStore.getState();
  const { error } = await supabase
    .from('weekly_worklog_state')
    .upsert({ id: ROW_ID, data: { projects, entries }, updated_at: new Date().toISOString() });

  if (error) {
    console.error('[sync] push error:', error);
    setStatus('error', error.message);
  } else {
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
