'use client';
import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../stores/task.store';
import { useAuthStore } from '../stores/auth.store';
import { useChatStore } from '../stores/chat.store';
import { api } from '../api/client';
import { translations } from '../i18n/translations';
import { X, CheckSquare, Calendar, AlertCircle, Plus, ShieldCheck } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, initialData }) => {
  const { statuses, fetchTasks } = useTaskStore();
  const { locale } = useAuthStore();
  const t = translations[locale];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [statusId, setStatusId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [proofRequired, setProofRequired] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [checklists, setChecklists] = useState<string[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setStatusId(statuses[0]?.id || '');
      setPriority(initialData?.priority || 'MEDIUM');
      setDueDate(initialData?.due_date || '');
      setRequiresApproval(initialData?.requires_approval || false);
      setProofRequired(initialData?.proof_required || false);
      setChecklists([]);

      // Fetch organization users for assignee dropdown
      api.get<any[]>('/org/users')
        .then((data) => {
          setUsers(data);
          if (data.length > 0) setAssigneeId(data[0].id);
        })
        .catch(() => {});
    }
  }, [isOpen, initialData, statuses]);

  if (!isOpen) return null;

  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    setChecklists([...checklists, newChecklistText.trim()]);
    setNewChecklistText('');
  };

  const handleRemoveChecklist = (idx: number) => {
    setChecklists(checklists.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        priority,
        status_id: statusId || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        requires_approval: requiresApproval,
        proof_required: proofRequired,
        assignee_ids: assigneeId ? [assigneeId] : [],
        conversation_id: initialData?.conversation_id || null,
        source_message_id: initialData?.source_message_id || null,
        checklist: checklists,
      });

      await fetchTasks();

      // Refresh active chat if created from or inside a conversation
      const activeConv = useChatStore.getState().activeConversation;
      if (activeConv && (activeConv.id === initialData?.conversation_id || !initialData?.conversation_id)) {
        await useChatStore.getState().selectConversation(activeConv);
      }

      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">
              {initialData?.source_message_id ? t.create_task_from_msg : t.create_task}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deploy production release"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Description (Rich Text)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed context, deliverables, and acceptance criteria..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Initial Status
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Due Date & Time
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Workflow Toggles (Section 6.3) */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg space-y-2 border border-gray-200 dark:border-gray-700">
            <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{t.requires_approval}</span>
                <p className="text-[10px] text-gray-500">
                  When marked done, routes to Under Review for creator approval
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer pt-1 border-t border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                checked={proofRequired}
                onChange={(e) => setProofRequired(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{t.proof_required}</span>
                <p className="text-[10px] text-gray-500">
                  Cannot be completed without attaching proof of work / photo
                </p>
              </div>
            </label>
          </div>

          {/* Checklists */}
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Checklist Items
            </label>
            <div className="flex space-x-2 rtl:space-x-reverse mb-2">
              <input
                type="text"
                placeholder={t.add_item}
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklist())}
                className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklist}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium"
              >
                Add
              </button>
            </div>
            {checklists.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-1 px-2 bg-gray-50 dark:bg-gray-800 rounded mb-1 text-[11px]"
              >
                <span>{item}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChecklist(idx)}
                  className="text-red-500 hover:text-red-700 font-bold"
                >
                  âœ•
                </button>
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition font-medium shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : t.create_task}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
