import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Department, TaskPriority } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  ShieldAlert,
  FileCheck,
  Users,
  Paperclip,
} from 'lucide-react';

export const TaskFormModal: React.FC = () => {
  const {
    isCreateTaskModalOpen,
    closeCreateTaskModal,
    taskModalInitialData,
    createTask,
    users,
    currentUser,
    activeChat,
  } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<Department>('Academics');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([
    'Verify specifications',
    'Execute implementation',
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [proofRequired, setProofRequired] = useState(false);

  // Prepopulate form when initialData changes
  useEffect(() => {
    if (isCreateTaskModalOpen) {
      if (taskModalInitialData) {
        setTitle(taskModalInitialData.title || '');
        setDescription(taskModalInitialData.description || '');
        setDepartment(
          taskModalInitialData.department ||
            activeChat?.department ||
            currentUser.department
        );
        setPriority(taskModalInitialData.priority || 'medium');
        setRequiresApproval(taskModalInitialData.requiresApproval ?? true);
        setProofRequired(taskModalInitialData.proofRequired ?? false);

        if (taskModalInitialData.assigneeIds && taskModalInitialData.assigneeIds.length > 0) {
          setAssigneeIds(taskModalInitialData.assigneeIds);
        } else if (activeChat) {
          // Default assignees to other chat members
          const otherMembers = activeChat.participantIds.filter((id) => id !== currentUser.id);
          setAssigneeIds(otherMembers.length > 0 ? [otherMembers[0]] : [currentUser.id]);
        } else {
          setAssigneeIds([currentUser.id]);
        }

        if (taskModalInitialData.checklist && taskModalInitialData.checklist.length > 0) {
          setChecklistItems(taskModalInitialData.checklist.map((c) => c.title));
        }
      } else {
        // Defaults
        setTitle('');
        setDescription('');
        setDepartment(currentUser.department);
        setPriority('medium');
        setAssigneeIds([currentUser.id]);
        setChecklistItems(['Verify requirements', 'Deliver final output']);
        setRequiresApproval(false);
        setProofRequired(false);
      }

      // Default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDueDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isCreateTaskModalOpen, taskModalInitialData, activeChat, currentUser]);

  if (!isCreateTaskModalOpen) return null;

  const handleAddChecklistItem = () => {
    if (newChecklistText.trim()) {
      setChecklistItems([...checklistItems, newChecklistText.trim()]);
      setNewChecklistText('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Construct ISO due date
    const isoDueDate = new Date(`${dueDate}T${dueTime}:00Z`).toISOString();

    createTask({
      title: title.trim(),
      description: description.trim(),
      department,
      priority,
      dueDate: isoDueDate,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : [currentUser.id],
      checklistTitles: checklistItems,
      requiresApproval,
      proofRequired,
      sourceChatId: taskModalInitialData?.sourceChatId || activeChat?.id,
      sourceMessageId: taskModalInitialData?.sourceMessageId,
      attachments: taskModalInitialData?.attachments || [],
    });

    closeCreateTaskModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {taskModalInitialData?.sourceMessageId ? 'Create Task from Message' : 'Create New Task'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {taskModalInitialData?.sourceChatId
                ? `Will be posted directly to ${activeChat?.name || 'this conversation'}`
                : 'Sync deliverables and workflow across your team'}
            </p>
          </div>
          <button
            onClick={closeCreateTaskModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Audit fuel vouchers, Deploy Redis cluster..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description &amp; Specifications
            </label>
            <textarea
              rows={3}
              placeholder="Provide background context, criteria, or paste reference specs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none resize-none"
            />
          </div>

          {/* Grid: Department & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="Management">Management</option>
                <option value="Administration">Administration</option>
                <option value="Accounts">Accounts</option>
                <option value="Academics">Academics</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none font-medium"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent (Immediate attention)</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Due Time</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Assignees People Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Assignees (Select 1 or more)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
              {users.map((u) => {
                const isSelected = assigneeIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleAssignee(u.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold">{u.avatar}</span>
                    <span>{u.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Checklist Builder */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Checklist Items
            </label>
            <div className="space-y-1.5 mb-2">
              {checklistItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200"
                >
                  <span className="flex-1 truncate">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(index)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add another sub-deliverable..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Add
              </button>
            </div>
          </div>

          {/* Core Controls: "Requires Approval" & "Proof Required" Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Requires Approval */}
            <div
              onClick={() => setRequiresApproval(!requiresApproval)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                requiresApproval
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Requires Approval
                </span>
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={() => {}}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Assignee's completion moves task to Under Review for creator sign-off.
              </p>
            </div>

            {/* Proof Required */}
            <div
              onClick={() => setProofRequired(!proofRequired)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                proofRequired
                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Proof Required
                </span>
                <input
                  type="checkbox"
                  checked={proofRequired}
                  onChange={() => {}}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Assignee must upload photo documentation and note before completion.
              </p>
            </div>
          </div>

          {/* Copied Attachments Preview if any */}
          {taskModalInitialData?.attachments && taskModalInitialData.attachments.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                Copied Message Attachments ({taskModalInitialData.attachments.length})
              </span>
              {taskModalInitialData.attachments.map((att) => (
                <div key={att.id} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  📎 {att.name} ({att.size || 'Attachment'})
                </div>
              ))}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={closeCreateTaskModal}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
