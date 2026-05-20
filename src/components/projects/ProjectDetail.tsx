import { useState, useRef, useEffect } from 'react';
import s from './ProjectDetail.module.css';
import { useProjectStore, type Project, type WeekEntry } from '../../store/projectStore';
import { getEntryStatus, daysFromWorkDate } from '../../utils/entryStatus';

// ── Month helpers ─────────────────────────────────────────────────────────────

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function generateMonthOptions() {
  const now = new Date();
  const opts: { label: string; sortKey: number }[] = [];
  for (let i = -6; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    opts.push({
      label: `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`,
      sortKey: d.getFullYear() * 12 + d.getMonth(),
    });
  }
  return opts;
}

function monthSortKey(label: string): number {
  const parts = label.split(' ');
  const idx = MONTHS_ES.indexOf(parts[0]);
  const year = parseInt(parts[1]);
  if (idx === -1 || isNaN(year)) return 0;
  return year * 12 + idx;
}

// ── Tree helpers ──────────────────────────────────────────────────────────────

function TreeNode({
  entry,
  allEntries,
  depth,
  activeId,
  onSelect,
  onAddChild,
  onDelete,
}: {
  entry: WeekEntry;
  allEntries: WeekEntry[];
  depth: number;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const children = allEntries.filter(e => e.parentId === entry.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const isActive = entry.id === activeId;
  const status = getEntryStatus(entry);

  return (
    <div className={s.treeNode}>
      <button
        className={`${s.treeItem} ${isActive ? s.treeItemActive : ''}`}
        style={{ paddingLeft: 12 + depth * 14 }}
        onClick={() => onSelect(entry.id)}
      >
        <span className={s.treeToggle}>
          {children.length > 0 ? (open ? '▾' : '▸') : ''}
        </span>
        <span
          className={`${s.treeLabel} ${status === 'paid' ? s.treeLabelPaid : status === 'overdue' ? s.treeLabelOverdue : ''}`}
          onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        >
          {entry.label || 'Sin título'}
        </span>
        <button className={s.treeAddBtn} onClick={e => { e.stopPropagation(); onAddChild(entry.id); }} title="Agregar sub-carpeta">+</button>
        <button className={s.treeDeleteBtn} onClick={e => { e.stopPropagation(); onDelete(entry.id); }} title="Eliminar">×</button>
      </button>
      {open && children.length > 0 && (
        <div className={s.treeChildren}>
          {children.map(child => (
            <TreeNode
              key={child.id}
              entry={child}
              allEntries={allEntries}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entry editor ──────────────────────────────────────────────────────────────

function EntryEditor({ entry }: { entry: WeekEntry }) {
  const { updateEntry, deleteEntry, addWorkCode, updateWorkCode, removeWorkCode } = useProjectStore();
  const status = getEntryStatus(entry);
  const days = daysFromWorkDate(entry);

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
          placeholder="Nombre de carpeta"
        />
        <div className={s.editorHeaderActions}>
          {status === 'overdue' && (
            <span className={s.overdueTag}>Vencido · {days}d</span>
          )}
          {status === 'pending' && days !== null && (
            <span className={s.pendingTag}>{days}d desde fecha</span>
          )}
          {status === 'paid' && (
            <span className={s.paidTag}>Pagado</span>
          )}
          <button
            className={s.saveEntryBtn}
            onClick={() => updateEntry(entry.id, { savedAt: new Date().toISOString() })}
          >
            {entry.savedAt ? 'Re-guardar' : 'Guardar'}
          </button>
          <button
            className={s.deleteEntryBtn}
            onClick={() => { if (confirm(`¿Eliminar "${entry.label || 'esta carpeta'}" y su contenido?`)) deleteEntry(entry.id); }}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* ── Main fields ── */}
      <div className={s.fieldsRow}>
        <div className={s.field}>
          <label className={s.label}>Fecha</label>
          <input
            type="date"
            className={s.input}
            value={entry.workDate}
            onChange={e => field('workDate', e.target.value)}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Fecha recibido</label>
          <input
            type="date"
            className={s.input}
            value={entry.fechaRecibido}
            onChange={e => field('fechaRecibido', e.target.value)}
          />
        </div>
        <div className={s.field}>
          <label className={s.label}>Nº de invoices</label>
          <input
            type="number"
            className={s.input}
            value={entry.invoiceCount ?? ''}
            onChange={e => field('invoiceCount', e.target.value === '' ? null : Number(e.target.value))}
            placeholder="—"
            min={0}
          />
        </div>
      </div>

      <div className={s.field}>
        <label className={s.label}>Notas</label>
        <textarea
          className={s.textarea}
          value={entry.notes}
          onChange={e => field('notes', e.target.value)}
          placeholder="Notas adicionales..."
        />
      </div>

      {/* ── Work codes ── */}
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
                <input
                  className={s.workInput}
                  value={wc.code}
                  onChange={e => updateWorkCode(entry.id, wc.id, { code: e.target.value })}
                  placeholder="Código"
                />
                <input
                  type="number"
                  className={s.workInputNum}
                  value={wc.quantity === 0 && wc.code === '' ? '' : wc.quantity}
                  onChange={e => updateWorkCode(entry.id, wc.id, { quantity: Number(e.target.value) || 0 })}
                  placeholder="0"
                  min={0}
                  step="0.01"
                />
                <button
                  className={`${s.paidBtn} ${wc.paid ? s.paidBtnActive : ''}`}
                  onClick={() => updateWorkCode(entry.id, wc.id, { paid: !wc.paid })}
                >
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

// ── Contacts (inline edit) ────────────────────────────────────────────────────

function ContactsPanel({ project }: { project: Project }) {
  const { addContact, updateContact, removeContact } = useProjectStore();

  return (
    <div className={s.contacts}>
      {project.contacts.map(c => (
        <div key={c.id} className={s.contactItem}>
          <input
            className={s.contactInput}
            value={c.name}
            onChange={e => updateContact(project.id, c.id, { name: e.target.value })}
            placeholder="Nombre"
          />
          <input
            className={s.contactInput}
            value={c.phone}
            onChange={e => updateContact(project.id, c.id, { phone: e.target.value })}
            placeholder="Teléfono"
            style={{ maxWidth: 110 }}
          />
          <button className={s.removeContactBtn} onClick={() => removeContact(project.id, c.id)}>×</button>
        </div>
      ))}
      <button className={s.addContactBtn} onClick={() => addContact(project.id)}>+ Contacto</button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectDetail({ project }: { project: Project }) {
  const { entries, addEntry, deleteEntry, updateProject } = useProjectStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'tree' | 'editor'>('tree');
  const [addingUnder, setAddingUnder] = useState<string | null | 'root'>('root-sentinel');
  const [newLabel, setNewLabel] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);

  function selectEntry(id: string) {
    setActiveId(id);
    setMobilePanel('editor');
  }

  const monthOptions = generateMonthOptions();
  const projectEntries = entries.filter(e => e.projectId === project.id);
  const rootEntries = projectEntries
    .filter(e => e.parentId === null)
    .sort((a, b) => monthSortKey(a.label) - monthSortKey(b.label));
  const activeEntry = activeId ? projectEntries.find(e => e.id === activeId) ?? null : null;

  useEffect(() => {
    if (addingUnder !== 'root-sentinel') addInputRef.current?.focus();
  }, [addingUnder]);

  // When active entry is deleted, clear selection
  useEffect(() => {
    if (activeId && !projectEntries.find(e => e.id === activeId)) setActiveId(null);
  });

  function confirmAdd(parentId: string | null) {
    if (!newLabel.trim()) { setAddingUnder('root-sentinel'); return; }
    const id = addEntry(project.id, parentId, newLabel.trim());
    setNewLabel('');
    setAddingUnder('root-sentinel');
    setActiveId(id);
    setMobilePanel('editor');
  }

  function handleDeleteEntry(id: string) {
    if (!confirm('¿Eliminar esta carpeta y todo su contenido?')) return;
    if (activeId === id) setActiveId(null);
    deleteEntry(id);
  }

  function startAdd(parentId: string) {
    setNewLabel('');
    setAddingUnder(parentId);
  }

  const showAddInput = addingUnder !== 'root-sentinel';
  const addUnderParent = addingUnder as string | null;

  function handleMonthSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const label = e.target.value;
    e.target.value = '';
    if (!label) return;
    const existing = rootEntries.find(r => r.label === label);
    if (existing) {
      selectEntry(existing.id);
    } else {
      const id = addEntry(project.id, null, label);
      setActiveId(id);
      setMobilePanel('editor');
    }
  }

  return (
    <div className={s.page}>
      {/* ── Tree panel ── */}
      <div className={`${s.treePanel} ${mobilePanel === 'editor' ? s.treePanelHidden : ''}`}>
        <div className={s.treePanelHeader}>
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
          <ContactsPanel project={project} />
        </div>

        <div className={s.treeScroll}>
          {rootEntries.map(entry => (
            <TreeNode
              key={entry.id}
              entry={entry}
              allEntries={projectEntries}
              depth={0}
              activeId={activeId}
              onSelect={selectEntry}
              onAddChild={startAdd}
              onDelete={handleDeleteEntry}
            />
          ))}

          {showAddInput && (
            <div className={s.inlineAddRow}>
              <input
                ref={addInputRef}
                className={s.inlineAddInput}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Nombre de sub-carpeta"
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmAdd(addUnderParent);
                  if (e.key === 'Escape') setAddingUnder('root-sentinel');
                }}
                onBlur={() => confirmAdd(addUnderParent)}
              />
              <button className={s.inlineConfirmBtn} onClick={() => confirmAdd(addUnderParent)}>OK</button>
            </div>
          )}

          <select className={s.monthSelect} onChange={handleMonthSelect} defaultValue="">
            <option value="" disabled>+ Agregar mes</option>
            {monthOptions.map(o => (
              <option key={o.label} value={o.label}>
                {o.label}{rootEntries.some(r => r.label === o.label) ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Editor panel ── */}
      {activeEntry ? (
        <div className={`${s.editorWrapper} ${mobilePanel === 'tree' ? s.editorHidden : ''}`}>
          <button className={s.backBtn} onClick={() => setMobilePanel('tree')}>← Carpetas</button>
          <EntryEditor key={activeEntry.id} entry={activeEntry} />
        </div>
      ) : (
        <div className={`${s.editorEmpty} ${mobilePanel === 'tree' ? s.editorHidden : ''}`}>
          Selecciona o crea una carpeta para editar su contenido.
        </div>
      )}
    </div>
  );
}
