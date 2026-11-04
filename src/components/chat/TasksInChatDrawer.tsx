import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TaskCard } from '../tasks/TaskCard';
import { TaskStatus } from '../../types';
import { X, PlusCircle, Filter, ListTodo } from 'lucide-react';

export const TasksInChatDrawer: React.FC = () => {
  const {
    activeChat,
    isTasksInChatOpen,
    setIsTasksInChatOpen,
    tasks,
    openCreateTaskModal,
    currentUser,
  } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');

  if (!isTasksInChatOpen || !activeChat) return null;

  // Find all tasks associated with this conversation
  const chatTasks = tasks.filter((t) => {
    // Specifically linked task
    if (
      activeChat.linkedTaskId === t.id ||
      activeChat.id === `task_chat_${t.id}` ||
      t.sourceChatId === activeChat.id
    ) {
      return true;
    }
    // In a department channel, show tasks for that department
    if (activeChat.type === 'channel' && activeChat.department) {
      return activeChat.department.toLowerCase() === t.department?.toLowerCase();
    }
    // In a direct chat, show tasks shared between participants
    if (activeChat.type === 'direct') {
      const isInvolved = (userId: string) =>
        t.assigneeIds.includes(userId) ||
        t.creatorId === userId ||
        (t.reporterIds && t.reporterIds.includes(userId));
      return activeChat.participantIds.some(isInvolved);
    }
    return false;
  });

  const filteredTasks = chatTasks.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tasks in this Chat
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[11px] font-mono tabular-nums text-emerald-800 dark:text-emerald-300">
              {chatTasks.length}
            </span>
          </div>
          <button
            onClick={() => setIsTasksInChatOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Strip */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'todo', label: 'To Do' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'under_review', label: 'Review' },
              { id: 'completed', label: 'Done' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === filter.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
              <ListTodo className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
              <p>No tasks associated with this chat or filter.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} variant="list" />
            ))
          )}
        </div>

        {/* Bottom CTA to add task directly to this chat */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <button
            onClick={() => {
              setIsTasksInChatOpen(false);
              openCreateTaskModal({
                sourceChatId: activeChat.id,
                department: activeChat.department || currentUser.department,
                assigneeIds: activeChat.participantIds.filter((id) => id !== currentUser.id),
              });
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Task in this Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
