import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Task, TaskStatus, Department } from '../../types';
import { TaskCard } from './TaskCard';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export const TasksBoard: React.FC = () => {
  const {
    tasks,
    currentUser,
    openCreateTaskModal,
    activeChatId,
    deviceView,
  } = useAppStore();

  const [activeFilterTab, setActiveFilterTab] = useState<'my' | 'assigned_by_me' | 'overdue' | 'all'>('my');
  // Default to list view on mobile or by default for optimal readability
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<'all' | Department>('all');

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter((task) => {
    // Search query
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Dept filter
    if (deptFilter !== 'all' && task.department !== deptFilter) return false;

    // Filter tab
    const now = Date.now();
    const isOverdue = new Date(task.dueDate).getTime() < now && task.status !== 'completed';

    if (activeFilterTab === 'my') {
      return task.assigneeIds.includes(currentUser.id);
    }
    if (activeFilterTab === 'assigned_by_me') {
      return task.creatorId === currentUser.id;
    }
    if (activeFilterTab === 'overdue') {
      return isOverdue;
    }
    return true;
  });

  // KPI Metrics counts
  const totalTasksCount = tasks.length;
  const myTasksCount = tasks.filter((t) => t.assigneeIds.includes(currentUser.id)).length;
  const reviewCount = tasks.filter((t) => t.status === 'under_review').length;
  const overdueCount = tasks.filter(
    (t) => new Date(t.dueDate).getTime() < Date.now() && t.status !== 'completed'
  ).length;

  const kanbanColumns: { id: TaskStatus; title: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'todo', title: 'To Do', icon: Clock },
    { id: 'in_progress', title: 'In Progress', icon: Clock },
    { id: 'under_review', title: 'Under Review', icon: AlertCircle },
    { id: 'completed', title: 'Completed', icon: CheckCircle2 },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/60 dark:bg-slate-950 overflow-hidden">
      {/* Top Controls & Metrics - Compact on mobile */}
      <div className="shrink-0 p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 sm:space-y-3.5 shadow-2xs">
        {/* Title and Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Tasks &amp; Deliverables
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tabular-nums">
                {filteredTasks.length}
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Synchronized work items across departments and chat channels
            </p>
          </div>

          <button
            onClick={() => openCreateTaskModal({ sourceChatId: activeChatId || undefined })}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>

        {/* Mobile Compact KPI Strip - 1 single sleek row taking only ~40px instead of 180px */}
        <div className="grid grid-cols-4 gap-1.5 sm:hidden">
          <div className="px-2 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">My Active</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums leading-none">
              {myTasksCount}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">Team Total</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums leading-none">
              {totalTasksCount}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg border border-amber-200/90 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/25 text-center">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium block truncate">Review</span>
            <span className="text-sm font-bold text-amber-900 dark:text-amber-300 font-mono tabular-nums leading-none">
              {reviewCount}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg border border-rose-200/90 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/25 text-center">
            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium block truncate">Overdue</span>
            <span className="text-sm font-bold text-rose-900 dark:text-rose-300 font-mono tabular-nums leading-none">
              {overdueCount}
            </span>
          </div>
        </div>

        {/* Desktop KPI Grid - shown on sm: screens */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">My Active Tasks</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
              {myTasksCount}
            </p>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Team Tasks</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
              {totalTasksCount}
            </p>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Needs Review</span>
            <p className="text-lg font-bold text-amber-900 dark:text-amber-300 font-mono tabular-nums mt-0.5">
              {reviewCount}
            </p>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">Overdue Alert</span>
            <p className="text-lg font-bold text-rose-900 dark:text-rose-300 font-mono tabular-nums mt-0.5">
              {overdueCount}
            </p>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Tabs: My Tasks, Assigned by Me, Overdue, All */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { id: 'my', label: 'My Tasks' },
                { id: 'assigned_by_me', label: 'Assigned' },
                { id: 'overdue', label: 'Overdue' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilterTab(tab.id)}
                className={`px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  activeFilterTab === tab.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
            >
              <option value="all">All Depts</option>
              <option value="Management">Management</option>
              <option value="Administration">Administration</option>
              <option value="Accounts">Accounts</option>
              <option value="Academics">Academics</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Kanban / List Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List View"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1 rounded-md transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Kanban Board View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Board View: Kanban or List - with clean scrolling and bottom tab spacing */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 pb-24 sm:pb-6">
        {filteredTasks.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-7 h-7 text-slate-300 dark:text-slate-700 mb-2" />
            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              No tasks found
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Try switching filters or search terms.
            </p>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban Columns */
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start min-w-[640px] lg:min-w-0">
              {kanbanColumns.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);
                const Icon = col.icon;

                return (
                  <div
                    key={col.id}
                    className="bg-slate-100/70 dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[calc(100vh-220px)]"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-1 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {col.title}
                        </span>
                      </div>
                      <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center tabular-nums">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Column Task Cards */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {colTasks.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-[10px] border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                          Empty
                        </div>
                      ) : (
                        colTasks.map((task) => (
                          <TaskCard key={task.id} task={task} variant="kanban" />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* List View - clean vertical feed optimized for mobile & desktop */
          <div className="space-y-2 max-w-3xl mx-auto">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} variant="list" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
