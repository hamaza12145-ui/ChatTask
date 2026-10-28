import { create } from 'zustand';
import { api } from '../api/client';

export interface TaskStatusItem {
  id: string;
  name: string;
  category: string;
  color: string;
  order: number;
  is_closed: boolean;
  requires_approval: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  status_id: string;
  priority: string;
  department_id?: string;
  due_date?: string;
  start_date?: string;
  estimated_hours?: number;
  requires_approval: boolean;
  proof_required: boolean;
  proof_notes?: string;
  proof_attachments?: any[];
  labels: string[];
  conversation_id?: string;
  source_message_id?: string;
  status?: TaskStatusItem;
  creator?: { id: string; name: string };
  department?: { id: string; name: string };
  assignees?: Array<{ task_id: string; user_id: string; user?: { id: string; name: string; avatar_url?: string } }>;
  checklist?: Array<{ id: string; title: string; is_completed: boolean }>;
  comments?: Array<{ id: string; content: string; created_at: string; user?: { name: string } }>;
  activities?: Array<{ id: string; action: string; field_name?: string; old_value?: string; new_value?: string; created_at: string; actor?: { name: string } }>;
  extension_requests?: Array<{ id: string; requested_date: string; reason: string; status: string; requester?: { name: string } }>;
}

interface TaskState {
  tasks: TaskItem[];
  statuses: TaskStatusItem[];
  selectedTask: TaskItem | null;
  activeFilter: 'my_tasks' | 'assigned_by_me' | 'watching' | 'department' | 'all';
  viewMode: 'board' | 'list' | 'calendar';
  isCreateModalOpen: boolean;
  createModalInitialData: Partial<TaskItem> | null;
  isLoading: boolean;

  fetchTasks: () => Promise<void>;
  fetchStatuses: () => Promise<void>;
  selectTask: (task: TaskItem | null) => void;
  loadTaskDetails: (taskId: string) => Promise<void>;
  setFilter: (filter: 'my_tasks' | 'assigned_by_me' | 'watching' | 'department' | 'all') => void;
  setViewMode: (viewMode: 'board' | 'list' | 'calendar') => void;
  openCreateModal: (initial?: Partial<TaskItem> | null) => void;
  closeCreateModal: () => void;

  updateStatus: (taskId: string, statusId: string) => Promise<void>;
  submitProof: (taskId: string, notes: string, attachments: any[]) => Promise<void>;
  reviewApproval: (taskId: string, approved: boolean, reason?: string) => Promise<void>;
  reassign: (taskId: string, assigneeIds: string[], reason: string) => Promise<void>;
  requestExtension: (taskId: string, requestedDate: string, reason: string) => Promise<void>;
  reviewExtension: (requestId: string, approved: boolean, note?: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  addChecklistItem: (taskId: string, title: string) => Promise<void>;
  toggleChecklistItem: (itemId: string) => Promise<void>;

  handleLiveTaskUpdate: (updatedTask: TaskItem) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  statuses: [],
  selectedTask: null,
  activeFilter: 'all',
  viewMode: 'board',
  isCreateModalOpen: false,
  createModalInitialData: null,
  isLoading: false,

  fetchStatuses: async () => {
    try {
      const data = await api.get<TaskStatusItem[]>('/tasks/statuses');
      set({ statuses: data });
    } catch (err) {
      console.error('Error fetching task statuses:', err);
    }
  },

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const filter = get().activeFilter;
      const data = await api.get<TaskItem[]>('/tasks', { view: filter });
      set({ tasks: data, isLoading: false });
    } catch (err) {
      console.error('Error fetching tasks:', err);
      set({ isLoading: false });
    }
  },

  selectTask: (task) => set({ selectedTask: task }),

  loadTaskDetails: async (taskId: string) => {
    try {
      const task = await api.get<TaskItem>(`/tasks/${taskId}`);
      set({ selectedTask: task });
    } catch (err) {
      console.error('Error loading task details:', err);
    }
  },

  setFilter: (activeFilter) => {
    set({ activeFilter });
    get().fetchTasks();
  },

  setViewMode: (viewMode) => set({ viewMode }),

  openCreateModal: (initial = null) => {
    set({ isCreateModalOpen: true, createModalInitialData: initial });
  },

  closeCreateModal: () => {
    set({ isCreateModalOpen: false, createModalInitialData: null });
  },

  updateStatus: async (taskId, statusId) => {
    try {
      const updated = await api.patch<TaskItem>(`/tasks/${taskId}/status`, { status_id: statusId });
      get().handleLiveTaskUpdate(updated);
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  },

  submitProof: async (taskId, notes, attachments) => {
    try {
      const updated = await api.post<TaskItem>(`/tasks/${taskId}/proof`, {
        proof_notes: notes,
        proof_attachments: attachments,
      });
      get().handleLiveTaskUpdate(updated);
    } catch (err: any) {
      alert(err.message || 'Proof submission failed');
    }
  },

  reviewApproval: async (taskId, approved, reason) => {
    try {
      const updated = await api.post<TaskItem>(`/tasks/${taskId}/review-approval`, { approved, reason });
      get().handleLiveTaskUpdate(updated);
    } catch (err: any) {
      alert(err.message || 'Review failed');
    }
  },

  reassign: async (taskId, assigneeIds, reason) => {
    try {
      const updated = await api.post<TaskItem>(`/tasks/${taskId}/reassign`, {
        assignee_ids: assigneeIds,
        reason,
      });
      get().handleLiveTaskUpdate(updated);
    } catch (err: any) {
      alert(err.message || 'Reassignment failed');
    }
  },

  requestExtension: async (taskId, requestedDate, reason) => {
    try {
      await api.post(`/tasks/${taskId}/extension-request`, {
        requested_date: requestedDate,
        reason,
      });
      await get().loadTaskDetails(taskId);
    } catch (err: any) {
      alert(err.message || 'Extension request failed');
    }
  },

  reviewExtension: async (requestId, approved, note) => {
    try {
      const updated = await api.post<TaskItem>(`/tasks/extension-requests/${requestId}/review`, {
        approved,
        review_note: note,
      });
      get().handleLiveTaskUpdate(updated);
    } catch (err: any) {
      alert(err.message || 'Review extension failed');
    }
  },

  addComment: async (taskId, content) => {
    try {
      await api.post(`/tasks/${taskId}/comments`, { content });
      await get().loadTaskDetails(taskId);
    } catch (err: any) {
      alert(err.message || 'Comment failed');
    }
  },

  addChecklistItem: async (taskId, title) => {
    try {
      await api.post(`/tasks/${taskId}/checklists`, { title });
      await get().loadTaskDetails(taskId);
    } catch (err: any) {
      alert(err.message || 'Add checklist failed');
    }
  },

  toggleChecklistItem: async (itemId) => {
    try {
      await api.patch(`/tasks/checklists/${itemId}/toggle`);
      const selected = get().selectedTask;
      if (selected) {
        await get().loadTaskDetails(selected.id);
      }
    } catch (err: any) {
      alert(err.message || 'Toggle checklist item failed');
    }
  },

  handleLiveTaskUpdate: (updatedTask) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)),
      selectedTask: state.selectedTask?.id === updatedTask.id ? { ...state.selectedTask, ...updatedTask } : state.selectedTask,
    }));
  },
}));
