import { useState, useRef } from 'react';
import s from './ProjectsPage.module.css';
import { useProjectStore } from '../../store/projectStore';

interface NewProjectForm { name: string; description: string; assignedTo: string; net: 14 | 30; }

export default function ProjectsPage({ onOpen }: { onOpen: (id: string) => void }) {
  const { projects, people, addProject, deleteProject, addPerson } = useProjectStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<NewProjectForm>({ name: '', description: '', assignedTo: '', net: 30 });
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const newPersonRef = useRef<HTMLInputElement>(null);

  const activePeople = people.filter(p => projects.some(proj => proj.assignedTo === p));
  const visibleProjects = filterPerson
    ? projects.filter(p => p.assignedTo === filterPerson)
    : projects;

  function handleCreate() {
    if (!form.name.trim()) return;
    const id = addProject(form.name.trim(), form.description.trim(), form.assignedTo, form.net);
    setForm({ name: '', description: '', assignedTo: '', net: 30 });
    setModal(false);
    setAddingPerson(false);
    setNewPersonName('');
    onOpen(id);
  }

  function confirmNewPerson() {
    const name = newPersonName.trim();
    if (!name) { setAddingPerson(false); return; }
    addPerson(name);
    setForm(f => ({ ...f, assignedTo: name }));
    setAddingPerson(false);
    setNewPersonName('');
  }

  function handleAssignedChange(value: string) {
    if (value === '__new__') {
      setAddingPerson(true);
      setNewPersonName('');
      setTimeout(() => newPersonRef.current?.focus(), 50);
    } else {
      setForm(f => ({ ...f, assignedTo: value }));
      setAddingPerson(false);
    }
  }

  function closeModal() {
    setModal(false);
    setAddingPerson(false);
    setNewPersonName('');
  }

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <h1 className={s.pageTitle}>Proyectos</h1>
        <button className={s.newBtn} onClick={() => setModal(true)}>+ Nuevo proyecto</button>
      </div>

      {activePeople.length > 0 && (
        <div className={s.filterBar}>
          <button
            className={`${s.chip} ${filterPerson === null ? s.chipActive : ''}`}
            onClick={() => setFilterPerson(null)}
          >
            Todos
          </button>
          {activePeople.map(person => (
            <button
              key={person}
              className={`${s.chip} ${filterPerson === person ? s.chipActive : ''}`}
              onClick={() => setFilterPerson(filterPerson === person ? null : person)}
            >
              {person}
            </button>
          ))}
        </div>
      )}

      {visibleProjects.length === 0 ? (
        <p className={s.emptyNote}>
          {projects.length === 0
            ? 'No hay proyectos. Crea el primero con el botón "Nuevo proyecto".'
            : 'Ningún proyecto asignado a esta persona.'}
        </p>
      ) : (
        <div className={s.grid}>
          {visibleProjects.map(p => (
            <div key={p.id} className={s.card} onClick={() => onOpen(p.id)}>
              <p className={s.cardName}>{p.name}</p>
              {p.description && <p className={s.cardDesc}>{p.description}</p>}
              <div className={s.cardMeta}>
                {p.assignedTo && <span className={s.cardAssigned}>{p.assignedTo}</span>}
                <span className={s.cardNet}>Net {p.net ?? 30}</span>
                <span>{p.contacts.length} contacto{p.contacts.length !== 1 ? 's' : ''}</span>
              </div>
              <div className={s.cardActions} onClick={e => e.stopPropagation()}>
                <button className={s.openBtn} onClick={() => onOpen(p.id)}>Abrir</button>
                <button
                  className={s.deleteBtn}
                  title="Eliminar"
                  onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) deleteProject(p.id); }}
                >×</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className={s.modalOverlay} onClick={closeModal}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <p className={s.modalTitle}>Nuevo proyecto</p>

            <div className={s.field}>
              <label className={s.label}>Nombre</label>
              <input
                className={s.input}
                placeholder="Nombre del proyecto"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>Descripción (opcional)</label>
              <input
                className={s.input}
                placeholder="Descripción breve"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className={s.field}>
              <label className={s.label}>Asignado a</label>
              <select
                className={s.input}
                value={addingPerson ? '__new__' : form.assignedTo}
                onChange={e => handleAssignedChange(e.target.value)}
              >
                <option value="">— Sin asignar —</option>
                {people.map(p => <option key={p} value={p}>{p}</option>)}
                <option value="__new__">+ Agregar nombre nuevo...</option>
              </select>
              {addingPerson && (
                <div className={s.newPersonRow}>
                  <input
                    ref={newPersonRef}
                    className={s.input}
                    placeholder="Nombre de la persona"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') confirmNewPerson();
                      if (e.key === 'Escape') { setAddingPerson(false); setNewPersonName(''); }
                    }}
                  />
                  <button className={s.confirmPersonBtn} onClick={confirmNewPerson} disabled={!newPersonName.trim()}>
                    Agregar
                  </button>
                </div>
              )}
              {form.assignedTo && !addingPerson && (
                <p className={s.assignedHint}>Asignado a: <strong>{form.assignedTo}</strong></p>
              )}
            </div>

            <div className={s.field}>
              <label className={s.label}>Período de pago</label>
              <div className={s.netToggle}>
                <button type="button" className={`${s.netBtn} ${form.net === 14 ? s.netBtnActive : ''}`} onClick={() => setForm(f => ({ ...f, net: 14 }))}>Net 14</button>
                <button type="button" className={`${s.netBtn} ${form.net === 30 ? s.netBtnActive : ''}`} onClick={() => setForm(f => ({ ...f, net: 30 }))}>Net 30</button>
              </div>
            </div>

            <div className={s.modalActions}>
              <button className={s.cancelBtn} onClick={closeModal}>Cancelar</button>
              <button className={s.saveBtn} onClick={handleCreate}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
