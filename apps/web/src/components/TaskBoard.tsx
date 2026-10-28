'use client';
import React from 'react';
import { useTaskStore, TaskItem, TaskStatusItem } from '../stores/task.store';
import { useAuthStore } from '../stores/auth.store';
import { translations } from '../i18n/translations';
import {
  Plus,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskBoardProps {
  onOpenCreate: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ onOpenCreate }) => {
  const {
    tasks,
    statuses,
    activeFilter,
    viewMode,
    setFilter,
    setViewMode,
    selectTask,
    updateStatus,
  } = useTaskStore();

  const { locale } = useAuthStore();
  const t = translations[locale];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200';
      case 'LOW':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Subheader: Views, Filters & + Task */}
      <div className="h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10 shrink-0">
        {/* Filters */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse overflow-x-auto text-xs">
          {(['all', 'my_tasks', 'assigned_by_me', 'watching'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                activeFilter === key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {key === 'all' ? t.all_tasks : t[key]}
            </button>
          ))}
        </div>

        {/* View Switcher & Action */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex items-center space-x-1 rtl:space-x-reverse text-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md ${viewMode === 'board' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-500'}`}
              title={t.board_view}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm' : 'text-gray-500'}`}
              title={t.list_view}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreate}
            className="flex items-center space-x-1 rtl:space-x-reverse text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md font-semibold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.create_task}</span>
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto p-4 flex space-x-4 rtl:space-x-reverse">
          {statuses.map((colStatus) => {
            const columnTasks = tasks.filter((t) => t.status_id === colStatus.id);
            return (
              <div
                key={colStatus.id}
                className="w-72 md:w-80 shrink-0 bg-gray-100 dark:bg-gray-900 rounded-xl flex flex-col max-h-full border border-gray-200 dark:border-gray-800/80 shadow-sm"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: colStatus.color }}
                    />
                    <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200">
                      {colStatus.name}
                    </h4>
                  </div>
                  <span className="text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Tasks */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => selectTask(task)}
                      className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-emerald-500 cursor-pointer transition shadow-sm"
                    >
                      {/* Priority & Flags */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(
                            task.priority,
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <div className="flex items-center space-x-1 rtl:space-x-reverse text-gray-400">
                          {task.requires_approval && (
                            <span title="Requires Approval">
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                            </span>
                          )}
                          {task.proof_required && (
                            <span title="Proof Required">
                              <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h5 className="font-semibold text-xs text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                        {task.title}
                      </h5>

                      {/* Due Date & Checklists */}
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {task.due_date ? format(new Date(task.due_date), 'MMM d') : 'No due'}
                          </span>
                        </span>

                        {/* Assignee Avatar */}
                        {task.assignees && task.assignees.length > 0 ? (
                          <div className="flex -space-x-1 rtl:space-x-reverse">
                            {task.assignees.map((a) => (
                              <div
                                key={a.user_id}
                                title={a.user?.name}
                                className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[9px] flex items-center justify-center border border-white dark:border-gray-800"
                              >
                                {a.user?.name?.charAt(0) || 'U'}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="italic text-gray-400">Unassigned</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 italic">No tasks</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Assignees</th>
                  <th className="py-3 px-4 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => selectTask(task)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: task.status?.color || '#3b82f6' }}
                      >
                        {task.status?.name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {task.assignees?.map((a) => a.user?.name).filter(Boolean).join(', ') || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
