import { useState } from 'react';
import s from './ProjectsPage.module.css';
import { useProjectStore } from '../../store/projectStore';

interface NewProjectForm { name: string; description: string; }

export default function ProjectsPage({ onOpen }: { onOpen: (id: string) => void }) {
  const { projects, addProject, deleteProject } = useProjectStore();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<NewProjectForm>({ name: '', description: '' });

  function handleCreate() {
    if (!form.name.trim()) return;
    const id = addProject(form.name.trim(), form.description.trim());
    setForm({ name: '', description: '' });
    setModal(false);
    onOpen(id);
  }

  return (
    <div className={s.page}>
      <div className={s.topBar}>
        <h1 className={s.pageTitle}>Proyectos</h1>
        <button className={s.newBtn} onClick={() => setModal(true)}>+ Nuevo proyecto</button>
      </div>

      {projects.length === 0 ? (
        <p className={s.emptyNote}>No hay proyectos. Crea el primero con el botón "Nuevo proyecto".</p>
      ) : (
        <div className={s.grid}>
          {projects.map(p => (
            <div key={p.id} className={s.card} onClick={() => onOpen(p.id)}>
              <p className={s.cardName}>{p.name}</p>
              {p.description && <p className={s.cardDesc}>{p.description}</p>}
              <div className={s.cardMeta}>
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
        <div className={s.modalOverlay} onClick={() => setModal(false)}>
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
            <div className={s.modalActions}>
              <button className={s.cancelBtn} onClick={() => setModal(false)}>Cancelar</button>
              <button className={s.saveBtn} onClick={handleCreate}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
