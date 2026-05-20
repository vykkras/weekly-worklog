import { useState } from 'react';
import s from './App.module.css';
import { useProjectStore } from './store/projectStore';
import { useSyncStore, pullFromSupabase } from './lib/sync';
import DashboardPage from './components/dashboard/DashboardPage';
import ProjectsPage from './components/projects/ProjectsPage';
import ProjectDetail from './components/projects/ProjectDetail';

type View = { page: 'dashboard' } | { page: 'projects' } | { page: 'project'; projectId: string };

export default function App() {
  const [view, setView] = useState<View>({ page: 'dashboard' });
  const { projects } = useProjectStore();
  const { status, error, lastSync } = useSyncStore();

  const activeProject = view.page === 'project'
    ? projects.find(p => p.id === view.projectId) ?? null
    : null;

  function renderContent() {
    switch (view.page) {
      case 'dashboard': return <DashboardPage onOpenProject={id => setView({ page: 'project', projectId: id })} />;
      case 'projects':  return <ProjectsPage onOpen={id => setView({ page: 'project', projectId: id })} />;
      case 'project':   return activeProject
        ? <ProjectDetail project={activeProject} />
        : <div style={{ padding: 40, color: '#94a3b8' }}>Proyecto no encontrado.</div>;
    }
  }

  return (
    <div className={s.shell}>

      <header className={s.header}>
        <button className={s.headerBrand} onClick={() => setView({ page: 'dashboard' })}>
          <div>
            <p className={s.headerName}>DC CABLE</p>
            <p className={s.headerSub}>Weekly Worklog</p>
          </div>
        </button>

        {activeProject && (
          <div className={s.headerCrumb}>
            <span className={s.headerCrumbSep}>/</span>
            <span className={s.headerCrumbPage}>{activeProject.name}</span>
          </div>
        )}

        <div className={s.syncBar}>
          {status === 'error' && (
            <span className={s.syncError} title={error ?? ''}>Error sync</span>
          )}
          {status === 'syncing' && <span className={s.syncSpinner}>↻</span>}
          {status === 'ok' && lastSync && (
            <span className={s.syncOk}>{lastSync}</span>
          )}
          <button className={s.syncBtn} onClick={pullFromSupabase} title="Sincronizar ahora">↻</button>
        </div>
      </header>

      <div className={s.body}>
        <nav className={s.sidebar}>
          <div className={s.sidebarSection}>
            <button
              className={`${s.sidebarItem} ${view.page === 'dashboard' ? s.sidebarItemActive : ''}`}
              onClick={() => setView({ page: 'dashboard' })}
            >
              <span className={s.sidebarLabel}>Dashboard</span>
            </button>
            <button
              className={`${s.sidebarItem} ${view.page === 'projects' ? s.sidebarItemActive : ''}`}
              onClick={() => setView({ page: 'projects' })}
            >
              <span className={s.sidebarLabel}>Proyectos</span>
            </button>
          </div>

          {projects.length > 0 && (
            <>
              <div className={s.sidebarDivider} />
              <div className={s.sidebarSection}>
                {projects.map(p => (
                  <button
                    key={p.id}
                    className={`${s.sidebarItem} ${view.page === 'project' && view.projectId === p.id ? s.sidebarItemActive : ''}`}
                    onClick={() => setView({ page: 'project', projectId: p.id })}
                  >
                    <span className={s.sidebarLabel}>{p.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        <main className={s.content}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
