import s from './DashboardPage.module.css';
import { useProjectStore, type WeekEntry } from '../../store/projectStore';
import { getEntryStatus, daysFromWorkDate } from '../../utils/entryStatus';
import { useState } from 'react';

function fmt$(n: number | null) {
  if (n === null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pathLabel(entry: WeekEntry, all: WeekEntry[]): string {
  if (!entry.parentId) return entry.label;
  const parent = all.find(e => e.id === entry.parentId);
  if (!parent) return entry.label;
  return `${pathLabel(parent, all)} / ${entry.label}`;
}

function EntriesTable({
  entries,
  allEntries,
  projectMap,
  onOpenProject,
  rowClass,
}: {
  entries: WeekEntry[];
  allEntries: WeekEntry[];
  projectMap: Record<string, { name: string }>;
  onOpenProject: (id: string) => void;
  rowClass?: string;
}) {
  return (
    <div className={s.tableWrap}><div className={s.table}>
      <div className={s.tableHead}>
        <span>Proyecto</span>
        <span>Carpeta</span>
        <span>Fecha</span>
        <span>Días</span>
        <span>Dinero</span>
        <span>Invoices</span>
      </div>
      {entries.map(entry => {
        const proj = projectMap[entry.projectId];
        const days = daysFromWorkDate(entry);
        return (
          <div
            key={entry.id}
            className={`${s.tableRow} ${rowClass ?? ''}`}
            onClick={() => onOpenProject(entry.projectId)}
          >
            <span className={s.cellProject}>{proj?.name ?? '—'}</span>
            <span className={s.cellFolder}>{pathLabel(entry, allEntries)}</span>
            <span className={s.cell}>{entry.workDate || '—'}</span>
            <span className={s.cell}>{days !== null ? `${days}d` : '—'}</span>
            <span className={s.cell}>{fmt$(entry.money)}</span>
            <span className={s.cell}>{entry.invoiceCount ?? '—'}</span>
          </div>
        );
      })}
    </div></div>
  );
}

export default function DashboardPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { projects, entries } = useProjectStore();
  const [filterProjectId, setFilterProjectId] = useState<string | null>(null);

  const filteredEntries = filterProjectId
    ? entries.filter(e => e.projectId === filterProjectId)
    : entries;

  const childIds = new Set(entries.map(e => e.parentId).filter(Boolean));
  const leafEntries = filteredEntries.filter(e => !childIds.has(e.id));

  const overdueEntries  = leafEntries.filter(e => getEntryStatus(e) === 'overdue');

  const totalMoney    = leafEntries.reduce((s, e) => s + (e.money ?? 0), 0);
  const totalInvoices = leafEntries.reduce((s, e) => s + (e.invoiceCount ?? 0), 0);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <h1 className={s.heroTitle}>Dashboard</h1>
        <p className={s.heroSub}>Resumen de trabajos semanales · {projects.length} proyectos</p>
      </div>

      {/* ── Filter ── */}
      {projects.length > 0 && (
        <div className={s.filterBar}>
          <span className={s.filterLabel}>Proyecto</span>
          <div className={s.filterChips}>
            <button
              className={`${s.chip} ${filterProjectId === null ? s.chipActive : ''}`}
              onClick={() => setFilterProjectId(null)}
            >
              Todos
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                className={`${s.chip} ${filterProjectId === p.id ? s.chipActive : ''}`}
                onClick={() => setFilterProjectId(filterProjectId === p.id ? null : p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <p className={s.statValue}>{filteredEntries.length}</p>
          <p className={s.statLabel}>Carpetas / semanas</p>
        </div>
        <div className={s.statCard}>
          <p className={s.statValue}>{totalInvoices}</p>
          <p className={s.statLabel}>Total invoices</p>
        </div>
        <div className={s.statCard}>
          <p className={s.statValue} style={{ fontSize: totalMoney > 9999 ? '20px' : undefined }}>{fmt$(totalMoney)}</p>
          <p className={s.statLabel}>Total dinero</p>
        </div>
        {overdueEntries.length > 0 && (
          <div className={`${s.statCard} ${s.statCardOverdue}`}>
            <p className={`${s.statValue} ${s.statValueOverdue}`}>{overdueEntries.length}</p>
            <p className={s.statLabel}>Pasados de tiempo</p>
          </div>
        )}
      </div>

      {/* ── Overdue section ── */}
      {overdueEntries.length > 0 && (
        <div>
          <p className={`${s.sectionTitle} ${s.sectionTitleOverdue}`}>
            Pasados de tiempo (+30 días sin pagar)
          </p>
          <EntriesTable
            entries={overdueEntries}
            allEntries={entries}
            projectMap={projectMap}
            onOpenProject={onOpenProject}
            rowClass={s.tableRowOverdue}
          />
        </div>
      )}

      {/* ── All entries table ── */}
      <div>
        <p className={s.sectionTitle}>Todos los registros</p>
        {filteredEntries.length === 0 ? (
          <p className={s.emptyNote}>
            {projects.length === 0
              ? 'Crea un proyecto en "Proyectos" para empezar.'
              : 'No hay entradas aún. Abre un proyecto y crea carpetas de semana.'}
          </p>
        ) : (
          <EntriesTable
            entries={filteredEntries}
            allEntries={entries}
            projectMap={projectMap}
            onOpenProject={onOpenProject}
          />
        )}
      </div>
    </div>
  );
}
