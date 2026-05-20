import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Contact {
  id: string;
  name: string;
  phone: string;
}

export interface WorkCode {
  id: string;
  code: string;
  quantity: number;
  paid: boolean;
}

export interface WeekEntry {
  id: string;
  label: string;
  parentId: string | null;
  projectId: string;
  sortOrder: number;
  workCodes: WorkCode[];
  invoiceCount: number | null;
  money: number | null;
  submittedBy: string;
  notes: string;
  workDate: string;
  approvedDate: string;
  fechaRecibido: string;
  savedAt: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  assignedTo: string;
  net: 14 | 30;
  contacts: Contact[];
  createdAt: string;
}

interface ProjectStore {
  projects: Project[];
  entries: WeekEntry[];

  // Projects
  addProject: (name: string, description: string, assignedTo: string, net?: 14 | 30) => string;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'description' | 'assignedTo' | 'net'>>) => void;
  deleteProject: (id: string) => void;
  addContact: (projectId: string) => void;
  updateContact: (projectId: string, contactId: string, updates: Partial<Omit<Contact, 'id'>>) => void;
  removeContact: (projectId: string, contactId: string) => void;

  // Week entries / folders
  addEntry: (projectId: string, parentId: string | null, label: string) => string;
  updateEntry: (id: string, updates: Partial<Omit<WeekEntry, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteEntry: (id: string) => void;

  // Supabase sync
  loadAll: (projects: Project[], entries: WeekEntry[]) => void;

  // Work codes within an entry
  addWorkCode: (entryId: string) => void;
  updateWorkCode: (entryId: string, codeId: string, updates: Partial<Omit<WorkCode, 'id'>>) => void;
  removeWorkCode: (entryId: string, codeId: string) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set) => ({
      projects: [],
      entries: [],

      addProject(name, description, assignedTo, net = 30) {
        const id = crypto.randomUUID();
        set(s => ({
          projects: [...s.projects, { id, name, description, assignedTo, net, contacts: [], createdAt: new Date().toISOString() }],
        }));
        return id;
      },

      updateProject(id, updates) {
        set(s => ({
          projects: s.projects.map(p => p.id === id ? { ...p, ...updates } : p),
        }));
      },

      deleteProject(id) {
        set(s => ({
          projects: s.projects.filter(p => p.id !== id),
          entries: s.entries.filter(e => e.projectId !== id),
        }));
      },

      addContact(projectId) {
        const contact: Contact = { id: crypto.randomUUID(), name: '', phone: '' };
        set(s => ({
          projects: s.projects.map(p =>
            p.id === projectId ? { ...p, contacts: [...p.contacts, contact] } : p
          ),
        }));
      },

      updateContact(projectId, contactId, updates) {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === projectId
              ? { ...p, contacts: p.contacts.map(c => c.id === contactId ? { ...c, ...updates } : c) }
              : p
          ),
        }));
      },

      removeContact(projectId, contactId) {
        set(s => ({
          projects: s.projects.map(p =>
            p.id === projectId
              ? { ...p, contacts: p.contacts.filter(c => c.id !== contactId) }
              : p
          ),
        }));
      },

      addEntry(projectId, parentId, label) {
        const id = crypto.randomUUID();
        set(s => {
          const siblings = s.entries.filter(e => e.projectId === projectId && e.parentId === parentId);
          const newEntry: WeekEntry = {
            id,
            label,
            parentId,
            projectId,
            sortOrder: siblings.length,
            workCodes: [],
            invoiceCount: null,
            money: null,
            submittedBy: '',
            approvedDate: '',
            notes: '',
            workDate: '',
            fechaRecibido: '',
            savedAt: null,
            createdAt: new Date().toISOString(),
          };
          return { entries: [...s.entries, newEntry] };
        });
        return id;
      },

      updateEntry(id, updates) {
        set(s => ({
          entries: s.entries.map(e => e.id === id ? { ...e, ...updates } : e),
        }));
      },

      deleteEntry(id) {
        set(s => {
          // Collect all descendant IDs recursively
          const toDelete = new Set<string>();
          const queue = [id];
          while (queue.length) {
            const cur = queue.shift()!;
            toDelete.add(cur);
            s.entries.filter(e => e.parentId === cur).forEach(e => queue.push(e.id));
          }
          return { entries: s.entries.filter(e => !toDelete.has(e.id)) };
        });
      },

      addWorkCode(entryId) {
        const wc: WorkCode = { id: crypto.randomUUID(), code: '', quantity: 0, paid: false };
        set(s => ({
          entries: s.entries.map(e => {
            if (e.id !== entryId) return e;
            const workCodes = [...e.workCodes, wc];
            return { ...e, workCodes, money: workCodes.reduce((sum, w) => sum + w.quantity, 0) };
          }),
        }));
      },

      updateWorkCode(entryId, codeId, updates) {
        set(s => ({
          entries: s.entries.map(e => {
            if (e.id !== entryId) return e;
            const workCodes = e.workCodes.map(w => w.id === codeId ? { ...w, ...updates } : w);
            return { ...e, workCodes, money: workCodes.reduce((sum, w) => sum + w.quantity, 0) };
          }),
        }));
      },

      removeWorkCode(entryId, codeId) {
        set(s => ({
          entries: s.entries.map(e => {
            if (e.id !== entryId) return e;
            const workCodes = e.workCodes.filter(w => w.id !== codeId);
            return { ...e, workCodes, money: workCodes.reduce((sum, w) => sum + w.quantity, 0) };
          }),
        }));
      },

      loadAll(projects, entries) {
        set(() => ({ projects, entries }));
      },
    }),
    { name: 'dc-weekly-v7' }
  )
);
