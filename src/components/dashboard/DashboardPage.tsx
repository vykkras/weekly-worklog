import s from './DashboardPage.module.css';
import { useProjectStore, type Project, type WeekEntry } from '../../store/projectStore';
import { getEntryStatus, daysFromApproved } from '../../utils/entryStatus';
import { useState } from 'react';
import { PEOPLE } from '../../data/people';

function fmt$(n: number | null) {
  if (n === null || n === 0) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Aggregate totals for a subtree of entries
function aggregateEntries(rootIds: string[], allEntries: WeekEntry[], net: 14 | 30 = 30) {
  const collect = (id: string): WeekEntry[] => {
    const e = allEntries.find(x => x.id === id);
    if (!e) return [];
    const children = allEntries.filter(x => x.parentId === id);
    if (children.length === 0) return [e];
    return children.flatMap(c => collect(c.id));
  };
  const leaves = rootIds.flatMap(id => collect(id));
  const money = leaves.reduce((s, e) => s + (e.money ?? 0), 0);
  const invoices = leaves.reduce((s, e) => s + (e.invoiceCount ?? 0), 0);
  const overdue = leaves.filter(e => getEntryStatus(e, net) === 'overdue').length;
  return { money, invoices, overdue, leafCount: leaves.length };
}

// Render entries in tree order with depth indentation
function EntryRows({
  parentId,
  projectId,
  allEntries,
  depth,
  net,
}: {
  parentId: string | null;
  projectId: string;
  allEntries: WeekEntry[];
  depth: number;
  net: 14 | 30;
}) {
  const children = allEntries
    .filter(e => e.projectId === projectId && e.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {children.map(e => {
        const status = getEntryStatus(e, net);
        const days = daysFromApproved(e);
        return (
          <div key={e.id}>
            <div className={s.entryRow} style={{ paddingLeft: 20 + depth * 16 }}>
              <span className={`${s.entryLabel} ${status === 'paid' ? s.labelPaid : status === 'overdue' ? s.labelOverdue : ''}`}>
                {e.label || 'Sin título'}
              </span>
              <span className={s.entryCell}>{e.workDate || '—'}</span>
              <span className={s.entryCell}>
                {days !== null ? `${days}d` : '—'}
              </span>
              <span className={s.entryCell}>{fmt$(e.money)}</span>
              <span className={s.entryCell}>{e.invoiceCount ?? '—'}</span>
              <span className={s.entryStatus}>
                {status === 'paid' && <span className={s.badgePaid}>Pagado</span>}
                {status === 'overdue' && <span className={s.badgeOverdue}>Vencido</span>}
                {status === 'pending' && <span className={s.badgePending}>Pendiente</span>}
              </span>
            </div>
            <EntryRows parentId={e.id} projectId={projectId} allEntries={allEntries} depth={depth + 1} net={net} />
          </div>
        );
      })}
    </>
  );
}

function ProjectAccordion({
  project,
  allEntries,
  onOpen,
}: {
  project: Project;
  allEntries: WeekEntry[];
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const projectEntries = allEntries.filter(e => e.projectId === project.id);
  const rootIds = projectEntries.filter(e => e.parentId === null).map(e => e.id);
  const { money, invoices, overdue } = aggregateEntries(rootIds, allEntries, (project.net ?? 30) as 14 | 30);

  return (
    <div className={`${s.accordion} ${open ? s.accordionOpen : ''}`}>
      <div className={s.accordionHeader} onClick={() => setOpen(o => !o)}>
        <span className={s.accordionToggle}>{open ? '▾' : '▸'}</span>
        <span className={s.accordionName}>{project.name}</span>
        {project.assignedTo && <span className={s.accordionPerson}>{project.assignedTo}</span>}
        <span className={s.accordionMeta}>
          {overdue > 0 && <span className={s.overdueCount}>{overdue} vencido{overdue !== 1 ? 's' : ''}</span>}
          <span>{fmt$(money)}</span>
          {invoices > 0 && <span>{invoices} inv.</span>}
        </span>
        <button
          className={s.accordionOpenBtn}
          onClick={e => { e.stopPropagation(); onOpen(project.id); }}
        >
          Abrir
        </button>
      </div>

      {open && (
        <div className={s.accordionBody}>
          {projectEntries.length === 0 ? (
            <p className={s.accordionEmpty}>Sin carpetas.</p>
          ) : (
            <div>
              <div className={s.entryHead}>
                <span style={{ flex: 1 }}>Carpeta</span>
                <span className={s.entryCell}>Fecha</span>
                <span className={s.entryCell}>Días</span>
                <span className={s.entryCell}>Dinero</span>
                <span className={s.entryCell}>Inv.</span>
                <span className={s.entryStatus}>Estado</span>
              </div>
              <EntryRows parentId={null} projectId={project.id} allEntries={allEntries} depth={0} net={(project.net ?? 30) as 14 | 30} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { projects, entries } = useProjectStore();
  const [filterPerson, setFilterPerson] = useState<string | null>(null);

  const filteredProjects = filterPerson
    ? projects.filter(p => p.assignedTo === filterPerson)
    : projects;

  // Stats from leaf entries of filtered projects
  const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
  const filteredEntries = entries.filter(e => filteredProjectIds.has(e.projectId));
  const childIds = new Set(entries.map(e => e.parentId).filter(Boolean));
  const leafEntries = filteredEntries.filter(e => !childIds.has(e.id));

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
  const overdueCount = leafEntries.filter(e => {
    const net = (projectMap[e.projectId]?.net ?? 30) as 14 | 30;
    return getEntryStatus(e, net) === 'overdue';
  }).length;
  const totalMoney    = leafEntries.reduce((s, e) => s + (e.money ?? 0), 0);
  const totalInvoices = leafEntries.reduce((s, e) => s + (e.invoiceCount ?? 0), 0);

  const personCounts = PEOPLE.map(person => ({
    name: person,
    count: projects.filter(p => p.assignedTo === person).length,
  })).filter(pc => pc.count > 0);

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <h1 className={s.heroTitle}>Dashboard</h1>
        <p className={s.heroSub}>Resumen de trabajos semanales · {projects.length} proyectos</p>
      </div>

      {/* ── Person filter ── */}
      {personCounts.length > 0 && (
        <div className={s.filterBar}>
          <span className={s.filterLabel}>Responsable</span>
          <div className={s.filterChips}>
            <button
              className={`${s.chip} ${filterPerson === null ? s.chipActive : ''}`}
              onClick={() => setFilterPerson(null)}
            >
              Todos
            </button>
            {PEOPLE.filter(p => projects.some(proj => proj.assignedTo === p)).map(person => (
              <button
                key={person}
                className={`${s.chip} ${filterPerson === person ? s.chipActive : ''}`}
                onClick={() => setFilterPerson(filterPerson === person ? null : person)}
              >
                {person}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Per-person project counts ── */}
      {personCounts.length > 0 && (
        <div className={s.personGrid}>
          {personCounts.map(pc => (
            <button
              key={pc.name}
              className={`${s.personCard} ${filterPerson === pc.name ? s.personCardActive : ''}`}
              onClick={() => setFilterPerson(filterPerson === pc.name ? null : pc.name)}
            >
              <p className={s.personName}>{pc.name}</p>
              <p className={s.personCount}>{pc.count} proyecto{pc.count !== 1 ? 's' : ''}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Stats ── */}
      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <p className={s.statValue}>{filteredProjects.length}</p>
          <p className={s.statLabel}>Proyectos</p>
        </div>
        <div className={s.statCard}>
          <p className={s.statValue}>{totalInvoices}</p>
          <p className={s.statLabel}>Total invoices</p>
        </div>
        <div className={s.statCard}>
          <p className={s.statValue} style={{ fontSize: totalMoney > 9999 ? '20px' : undefined }}>
            {totalMoney > 0 ? `$${totalMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </p>
          <p className={s.statLabel}>Total dinero</p>
        </div>
        {overdueCount > 0 && (
          <div className={`${s.statCard} ${s.statCardOverdue}`}>
            <p className={`${s.statValue} ${s.statValueOverdue}`}>{overdueCount}</p>
            <p className={s.statLabel}>Pasados de tiempo</p>
          </div>
        )}
      </div>

      {/* ── Projects accordion ── */}
      <div>
        <p className={s.sectionTitle}>Proyectos</p>
        {filteredProjects.length === 0 ? (
          <p className={s.emptyNote}>
            {projects.length === 0
              ? 'Crea un proyecto en "Proyectos" para empezar.'
              : 'Ningún proyecto asignado a esta persona.'}
          </p>
        ) : (
          <div className={s.accordionList}>
            {filteredProjects.map(p => (
              <ProjectAccordion key={p.id} project={p} allEntries={entries} onOpen={onOpenProject} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
