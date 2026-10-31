import React from 'react';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  MessageSquare,
  ChevronRight,
  ListTodo,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  variant?: 'chat' | 'list' | 'kanban';
  onClick?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  variant = 'chat',
  onClick,
}) => {
  const { openTaskDrawer, getUserById, chats } = useAppStore();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      openTaskDrawer(task.id);
    }
  };

  const sourceChat = chats.find((c) => c.id === task.sourceChatId);

  // Status visual mapping
  const statusConfig: Record<
    TaskStatus,
    { label: string; bg: string; text: string; icon: React.FC<{ className?: string }> }
  > = {
    todo: {
      label: 'To Do',
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      icon: Clock,
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-indigo-50 dark:bg-indigo-950/60',
      text: 'text-indigo-700 dark:text-indigo-300',
      icon: Clock,
    },
    under_review: {
      label: 'Under Review',
      bg: 'bg-amber-50 dark:bg-amber-950/60',
      text: 'text-amber-700 dark:text-amber-300',
      icon: AlertCircle,
    },
    completed: {
      label: 'Completed',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle2,
    },
    blocked: {
      label: 'Blocked',
      bg: 'bg-rose-50 dark:bg-rose-950/60',
      text: 'text-rose-700 dark:text-rose-300',
      icon: ShieldAlert,
    },
  };

  const priorityConfig: Record<TaskPriority, { label: string; text: string; dot: string }> = {
    urgent: { label: 'Urgent', text: 'text-rose-600 dark:text-rose-400 font-semibold', dot: 'bg-rose-500' },
    high: { label: 'High', text: 'text-amber-600 dark:text-amber-400 font-medium', dot: 'bg-amber-500' },
    medium: { label: 'Medium', text: 'text-blue-600 dark:text-blue-400 font-medium', dot: 'bg-blue-500' },
    low: { label: 'Low', text: 'text-slate-500 dark:text-slate-400 font-normal', dot: 'bg-slate-400' },
  };

  const status = statusConfig[task.status] || statusConfig.todo;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const StatusIcon = status.icon;

  const completedChecklistCount = task.checklist.filter((i) => i.completed).length;
  const isOverdue =
    new Date(task.dueDate).getTime() < Date.now() && task.status !== 'completed';

  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group cursor-pointer transition-all duration-150 rounded-xl border text-left ${
        variant === 'chat'
          ? 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80 p-3 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 max-w-sm w-full my-1'
          : variant === 'kanban'
          ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 p-2.5 sm:p-3 shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-shadow'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-2.5 sm:p-3.5 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-600'
      }`}
    >
      {/* Top Header: Code, Department, Live Status */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-tight shrink-0">
            {task.code}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {task.department}
          </span>
        </div>

        {/* Live Status Badge */}
        <div
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold shrink-0 ${status.bg} ${status.text}`}
        >
          <StatusIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>{status.label}</span>
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 sm:line-clamp-2 leading-snug mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {task.title}
      </h4>

      {/* Description Snippet (only in list or chat) */}
      {variant !== 'kanban' && task.description && (
        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-2 mb-2 leading-normal">
          {task.description}
        </p>
      )}

      {/* Meta Features Strip */}
      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mb-2">
        {/* Priority indicator */}
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${priority.dot}`} />
          <span className={priority.text}>{priority.label}</span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">·</span>

        {/* Due date with overdue highlight */}
        <div
          className={`flex items-center gap-1 font-mono tabular-nums ${
            isOverdue
              ? 'text-rose-600 dark:text-rose-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>{formatDueDate(task.dueDate)}</span>
          {isOverdue && <span className="text-[9px] uppercase font-bold">(Overdue)</span>}
        </div>

        {/* Checklist count if present */}
        {task.checklist.length > 0 && (
          <>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1 font-mono tabular-nums">
              <ListTodo className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>
                {completedChecklistCount}/{task.checklist.length}
              </span>
            </div>
          </>
        )}

        {/* Proof/Approval tags */}
        {task.proofRequired && (
          <div className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-medium text-[9px] sm:text-[10px] bg-purple-50 dark:bg-purple-950/40 px-1 py-0.2 rounded">
            <FileCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>Proof</span>
          </div>
        )}
        {task.requiresApproval && (
          <div className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium text-[9px] sm:text-[10px] bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded">
            <ShieldAlert className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            <span>Approval</span>
          </div>
        )}
      </div>

      {/* Footer: Source Chat Link & Assignee Avatars */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
        {/* Source Chat indicator */}
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
          <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 text-slate-400" />
          <span className="truncate">{sourceChat ? sourceChat.name : 'Direct Chat'}</span>
        </div>

        {/* Assignee Avatars */}
        <div className="flex items-center -space-x-1 shrink-0">
          {task.assigneeIds.map((userId) => {
            const user = getUserById(userId);
            if (!user) return null;
            return (
              <div
                key={userId}
                title={`${user.name} (${user.designation})`}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white ring-1.5 sm:ring-2 ring-white dark:ring-slate-900 ${user.avatarBg}`}
              >
                {user.avatar}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
