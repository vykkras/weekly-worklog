import { useState, useEffect, useRef } from 'react';
import s from './ProjectDetail.module.css';
import { useProjectStore, type Project, type WeekEntry } from '../../store/projectStore';
import { getEntryStatus, daysFromApproved } from '../../utils/entryStatus';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function generateMonths() {
  const now = new Date();
  const list: { label: string; year: number; month: number }[] = [];
  for (let i = -6; i <= 14; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    list.push({ label: `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() });
  }
  return list;
}

function dateToWeekLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_ES[m - 1]}`;
}

// ── Entry editor ──────────────────────────────────────────────────────────────

function EntryEditor({ entry, onDelete, net }: { entry: WeekEntry; onDelete: () => void; net: 14 | 30 }) {
  const { updateEntry, deleteEntry, addWorkCode, updateWorkCode, removeWorkCode } = useProjectStore();
  const status = getEntryStatus(entry, net);
  const days = daysFromApproved(entry);

  function field<K extends keyof WeekEntry>(key: K, value: WeekEntry[K]) {
    updateEntry(entry.id, { [key]: value } as any);
  }

  return (
    <div className={s.editorPanel}>
      <div className={s.editorHeader}>
        <input
          className={s.editorTitle}
          value={entry.label}
          onChange={e => field('label', e.target.value)}
          placeholder="Nombre de semana"
        />
        <div className={s.editorHeaderActions}>
          {status === 'overdue' && <span className={s.overdueTag}>Vencido · {days}d</span>}
          {status === 'pending' && days !== null && <span className={s.pendingTag}>{days}d desde aprobado</span>}
          {status === 'paid' && <span className={s.paidTag}>Pagado</span>}
          <button className={s.saveEntryBtn} onClick={() => updateEntry(entry.id, { savedAt: new Date().toISOString() })}>
            {entry.savedAt ? 'Re-guardar' : 'Guardar'}
          </button>
          <button
            className={s.deleteEntryBtn}
            onClick={() => { if (confirm(`¿Eliminar "${entry.label || 'esta semana'}"?`)) { deleteEntry(entry.id); onDelete(); } }}
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className={s.fieldsRow}>
        <div className={s.field}>
          <label className={s.label}>Fecha trabajo</label>
          <input type="date" className={s.input} value={entry.workDate} onChange={e => field('workDate', e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Fecha recibido</label>
          <input type="date" className={s.input} value={entry.fechaRecibido} onChange={e => field('fechaRecibido', e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Fecha aprobado</label>
          <input type="date" className={`${s.input} ${entry.approvedDate ? s.inputApproved : ''}`} value={entry.approvedDate} onChange={e => field('approvedDate', e.target.value)} />
        </div>
        <div className={s.field}>
          <label className={s.label}>Nº de invoices</label>
          <input
            type="number" className={s.input}
            value={entry.invoiceCount ?? ''}
            onChange={e => field('invoiceCount', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="—" min={0}
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Notas</label>
        <textarea className={s.textarea} value={entry.notes} onChange={e => field('notes', e.target.value)} placeholder="Notas adicionales..." />
      </div>

      <div className={s.section}>
        <p className={s.sectionTitle}>Códigos de trabajo</p>
        {entry.workCodes.length > 0 && (
          <div className={s.workTable}>
            <div className={s.workHead}>
              <span>Código</span>
              <span style={{ textAlign: 'right' }}>Cantidad ($)</span>
              <span>Estado</span>
              <span />
            </div>
            {entry.workCodes.map(wc => (
              <div key={wc.id} className={`${s.workRow} ${wc.paid ? s.workRowPaid : ''}`}>
                <input className={s.workInput} value={wc.code} onChange={e => updateWorkCode(entry.id, wc.id, { code: e.target.value })} placeholder="Código" />
                <input
                  type="number" className={s.workInputNum}
                  value={wc.quantity === 0 && wc.code === '' ? '' : wc.quantity}
                  onChange={e => updateWorkCode(entry.id, wc.id, { quantity: Number(e.target.value) || 0 })}
                  placeholder="0" min={0} step="0.01"
                />
                <button className={`${s.paidBtn} ${wc.paid ? s.paidBtnActive : ''}`} onClick={() => updateWorkCode(entry.id, wc.id, { paid: !wc.paid })}>
                  Pagado
                </button>
                <button className={s.removeWorkBtn} onClick={() => removeWorkCode(entry.id, wc.id)}>×</button>
              </div>
            ))}
            <div className={s.workCodesFooter}>
              <span className={s.workCodesTotal}>
                Total: ${(entry.money ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
        <button className={s.addWorkBtn} onClick={() => addWorkCode(entry.id)}>+ Agregar código</button>
      </div>
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────

function ContactsPanel({ project }: { project: Project }) {
  const { addContact, updateContact, removeContact } = useProjectStore();
  return (
    <div className={s.contacts}>
      {project.contacts.map(c => (
        <div key={c.id} className={s.contactItem}>
          <input className={s.contactInput} value={c.name} onChange={e => updateContact(project.id, c.id, { name: e.target.value })} placeholder="Nombre" />
          <input className={s.contactInput} value={c.phone} onChange={e => updateContact(project.id, c.id, { phone: e.target.value })} placeholder="Teléfono" style={{ maxWidth: 100 }} />
          <button className={s.removeContactBtn} onClick={() => removeContact(project.id, c.id)}>×</button>
        </div>
      ))}
      <button className={s.addContactBtn} onClick={() => addContact(project.id)}>+ Contacto</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectDetail({ project }: { project: Project }) {
  const { entries, addEntry, updateEntry, deleteEntry, updateProject } = useProjectStore();
  const [activeMonthLabel, setActiveMonthLabel] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [weekDate, setWeekDate] = useState('');
  const [mobileStep, setMobileStep] = useState<'months' | 'weeks' | 'editor'>('months');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);
  const currentMonthRef = useRef<HTMLButtonElement>(null);

  const allMonths = generateMonths();
  const now = new Date();
  const currentMonthLabel = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;

  const projectEntries = entries.filter(e => e.projectId === project.id);
  const monthEntries = projectEntries.filter(e => e.parentId === null);

  const activeMonth = activeMonthLabel
    ? monthEntries.find(e => e.label === activeMonthLabel) ?? null
    : null;

  const weekEntries = activeMonth
    ? projectEntries
        .filter(e => e.parentId === activeMonth.id)
        .sort((a, b) => {
          if (a.workDate && b.workDate) return b.workDate.localeCompare(a.workDate);
          return b.sortOrder - a.sortOrder;
        })
    : [];

  const activeEntry = activeEntryId
    ? projectEntries.find(e => e.id === activeEntryId) ?? null
    : null;

  // Clear active entry if deleted
  useEffect(() => {
    if (activeEntryId && !projectEntries.find(e => e.id === activeEntryId)) {
      setActiveEntryId(null);
    }
  });

  // Scroll current month into view on load
  useEffect(() => {
    currentMonthRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  function selectMonth(label: string) {
    setActiveMonthLabel(label);
    setActiveEntryId(null);
    setMobileStep('weeks');
  }

  function addWeek() {
    if (!weekDate || !activeMonthLabel) return;
    let monthId = activeMonth?.id ?? null;
    if (!monthId) {
      monthId = addEntry(project.id, null, activeMonthLabel);
    }
    const label = dateToWeekLabel(weekDate);
    const id = addEntry(project.id, monthId, label);
    updateEntry(id, { workDate: weekDate });
    setWeekDate('');
    setActiveEntryId(id);
    setMobileStep('editor');
  }

  function handleDeleteWeek(id: string) {
    if (!confirm('¿Eliminar esta semana?')) return;
    if (activeEntryId === id) setActiveEntryId(null);
    deleteEntry(id);
  }

  return (
    <div className={s.page}>

      {/* ── Column 1: Months ── */}
      <div className={`${s.monthsPanel} ${mobileStep !== 'months' ? s.hiddenMobile : ''}`}>
        <div className={s.panelHeader}>
          {editingName ? (
            <input
              className={s.editNameInput}
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => { updateProject(project.id, { name: nameVal || project.name }); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { updateProject(project.id, { name: nameVal || project.name }); setEditingName(false); } }}
              autoFocus
            />
          ) : (
            <div className={s.projectNameRow}>
              <p className={s.projectName} onDoubleClick={() => { setNameVal(project.name); setEditingName(true); }}>
                {project.name}
              </p>
              {project.assignedTo && <span className={s.assignedBadge}>{project.assignedTo}</span>}
            </div>
          )}
          <div className={s.netToggle}>
            <button
              className={`${s.netBtn} ${(project.net ?? 30) === 14 ? s.netBtnActive : ''}`}
              onClick={() => updateProject(project.id, { net: 14 })}
            >Net 14</button>
            <button
              className={`${s.netBtn} ${(project.net ?? 30) === 30 ? s.netBtnActive : ''}`}
              onClick={() => updateProject(project.id, { net: 30 })}
            >Net 30</button>
          </div>
          <ContactsPanel project={project} />
        </div>

        <div className={s.monthList}>
          {allMonths.map(m => {
            const monthEntry = monthEntries.find(e => e.label === m.label);
            const weekCount = monthEntry ? projectEntries.filter(e => e.parentId === monthEntry.id).length : 0;
            const isCurrent = m.label === currentMonthLabel;
            const isActive = activeMonthLabel === m.label;
            return (
              <button
                key={m.label}
                ref={isCurrent ? currentMonthRef : undefined}
                className={`${s.monthItem} ${isActive ? s.monthItemActive : ''} ${isCurrent && !isActive ? s.monthItemCurrent : ''}`}
                onClick={() => selectMonth(m.label)}
              >
                <span className={s.monthLabel}>{m.label}</span>
                {weekCount > 0 && <span className={s.weekCountBadge}>{weekCount}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Column 2: Weeks ── */}
      <div className={`${s.weeksPanel} ${mobileStep === 'months' || mobileStep === 'editor' ? s.hiddenMobile : ''}`}>
        {activeMonthLabel ? (
          <>
            <div className={s.panelHeader}>
              <button className={s.backBtn} onClick={() => setMobileStep('months')}>← Meses</button>
              <p className={s.panelTitle}>{activeMonthLabel}</p>
            </div>

            <div className={s.weekList}>
              {weekEntries.length === 0 && (
                <p className={s.emptyWeeks}>Sin semanas. Agrega una abajo.</p>
              )}
              {weekEntries.map(e => {
                const status = getEntryStatus(e, (project.net ?? 30) as 14 | 30);
                return (
                  <button
                    key={e.id}
                    className={`${s.weekItem} ${e.id === activeEntryId ? s.weekItemActive : ''}`}
                    onClick={() => { setActiveEntryId(e.id); setMobileStep('editor'); }}
                  >
                    <span className={`${s.weekLabel} ${status === 'paid' ? s.weekLabelPaid : status === 'overdue' ? s.weekLabelOverdue : ''}`}>
                      {e.label || 'Sin título'}
                    </span>
                    {status === 'paid' && <span className={s.weekStatusDot} style={{ background: '#16a34a' }} />}
                    {status === 'overdue' && <span className={s.weekStatusDot} style={{ background: '#dc2626' }} />}
                    <button
                      className={s.deleteWeekBtn}
                      onClick={ev => { ev.stopPropagation(); handleDeleteWeek(e.id); }}
                    >×</button>
                  </button>
                );
              })}
            </div>

            <div className={s.addWeekRow}>
              <input
                type="date"
                className={s.dateInput}
                value={weekDate}
                onChange={e => setWeekDate(e.target.value)}
              />
              <button className={s.addWeekBtn} onClick={addWeek} disabled={!weekDate}>
                + Agregar semana
              </button>
            </div>
          </>
        ) : (
          <div className={s.panelEmpty}>Selecciona un mes.</div>
        )}
      </div>

      {/* ── Column 3: Editor ── */}
      {activeEntry ? (
        <div className={`${s.editorWrapper} ${mobileStep !== 'editor' ? s.hiddenMobile : ''}`}>
          <button className={s.backBtn} onClick={() => setMobileStep('weeks')}>← Semanas</button>
          <EntryEditor key={activeEntry.id} entry={activeEntry} onDelete={() => setMobileStep('weeks')} net={(project.net ?? 30) as 14 | 30} />
        </div>
      ) : (
        <div className={`${s.editorEmpty} ${mobileStep !== 'editor' ? s.hiddenMobile : ''}`}>
          Selecciona o crea una semana.
        </div>
      )}
    </div>
  );
}
