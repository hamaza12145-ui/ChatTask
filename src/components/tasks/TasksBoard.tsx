import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Task, TaskStatus, Department } from '../../types';
import { TaskCard } from './TaskCard';
import { DMS_DEPARTMENTS, formatDepartmentName } from '../../services/dmsApi';
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
  RefreshCw,
  FolderKanban,
} from 'lucide-react';

export const TasksBoard: React.FC = () => {
  const {
    tasks,
    departments: storeDepartments,
    currentUser,
    openCreateTaskModal,
    activeChatId,
    refreshDmsData,
    isLoadingDms,
    isDmsConnected,
  } = useAppStore();

  const departmentList = storeDepartments && storeDepartments.length > 0 ? storeDepartments : DMS_DEPARTMENTS;

  const [activeFilterTab, setActiveFilterTab] = useState<'my' | 'assigned_by_me' | 'team' | 'overdue' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<'all' | Department>('all');

  // Filter tasks based on selected tab and search query
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Dept filter
    if (deptFilter !== 'all' && task.department?.toLowerCase() !== deptFilter.toLowerCase()) {
      return false;
    }

    const now = Date.now();
    const isOverdue = new Date(task.dueDate).getTime() < now && task.status !== 'completed';

    if (activeFilterTab === 'my') {
      return task.assigneeIds?.map(String).includes(String(currentUser.id));
    }
    if (activeFilterTab === 'assigned_by_me') {
      return String(task.creatorId) === String(currentUser.id);
    }
    if (activeFilterTab === 'team') {
      const isTeamReport = task.assigneeIds?.some((id) => currentUser.directReportIds?.map(String).includes(String(id)));
      const isReportedToMe = task.reporterIds && task.reporterIds.map(String).includes(String(currentUser.id));
      return isTeamReport || isReportedToMe;
    }
    if (activeFilterTab === 'overdue') {
      return isOverdue;
    }
    return true;
  });

  // Department-scoped base tasks for accurate tab metrics
  const deptTasks = deptFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.department?.toLowerCase() === deptFilter.toLowerCase());

  // KPI Metrics counts
  const totalTasksCount = deptTasks.length;
  const myTasksCount = deptTasks.filter((t) =>
    t.assigneeIds?.map(String).includes(String(currentUser.id))
  ).length;
  const createdByMeCount = deptTasks.filter((t) =>
    String(t.creatorId) === String(currentUser.id)
  ).length;
  const reviewCount = deptTasks.filter((t) => t.status === 'under_review').length;
  const overdueCount = deptTasks.filter(
    (t) => new Date(t.dueDate).getTime() < Date.now() && t.status !== 'completed'
  ).length;
  const teamTasksCount = deptTasks.filter(
    (t) =>
      t.assigneeIds?.some((id) => currentUser.directReportIds?.map(String).includes(String(id))) ||
      (t.reporterIds && t.reporterIds.map(String).includes(String(currentUser.id)))
  ).length;

  const kanbanColumns: { id: TaskStatus; title: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'todo', title: 'To Do / Open', icon: Clock },
    { id: 'in_progress', title: 'In Progress', icon: Clock },
    { id: 'under_review', title: 'Pending Approval', icon: AlertCircle },
    { id: 'completed', title: 'Completed / Closed', icon: CheckCircle2 },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/60 dark:bg-slate-950 overflow-hidden">
      {/* Top Controls & Metrics */}
      <div className="shrink-0 p-3 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 sm:space-y-3.5 shadow-2xs">
        {/* Title and Action */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                Tasking Board
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tabular-nums">
                {filteredTasks.length} tasks
              </span>
              <button
                onClick={() => refreshDmsData()}
                disabled={isLoadingDms}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                title="Refresh Tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDms ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tasking Module · Single source of truth for assignments &amp; deliverables
            </p>
          </div>

          <button
            onClick={() => openCreateTaskModal({ sourceChatId: activeChatId || undefined })}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>

        {/* Mobile Compact KPI Strip */}
        <div className="grid grid-cols-4 gap-1.5 sm:hidden">
          <div className="px-2 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">My Active</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums leading-none">
              {myTasksCount}
            </span>
          </div>
          <div className="px-2 py-1.5 rounded-lg border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">Total Tasks</span>
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

        {/* Desktop KPI Grid */}
        <div className="hidden sm:grid sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">My Active Tasks</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
              {myTasksCount}
            </p>
          </div>
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Tasks</span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums mt-0.5">
              {totalTasksCount}
            </p>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Needs Approval</span>
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
          {/* Tabs: All, My Tasks, Team, Created By Me, Overdue */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {(
              [
                { id: 'all' as const, label: 'All Tasks', count: totalTasksCount },
                { id: 'my' as const, label: 'My Tasks', count: myTasksCount },
                ...(currentUser.directReportIds && currentUser.directReportIds.length > 0
                  ? [{ id: 'team' as const, label: 'Team', count: teamTasksCount }]
                  : []),
                { id: 'assigned_by_me' as const, label: 'Created By Me', count: createdByMeCount },
                { id: 'overdue' as const, label: 'Overdue', count: overdueCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilterTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                  activeFilterTab === tab.id
                    ? 'bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums leading-none ${
                    activeFilterTab === tab.id
                      ? 'bg-emerald-900/60 text-emerald-100 dark:bg-emerald-800/80'
                      : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-emerald-500 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">All Departments</option>
              {departmentList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Kanban / List Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
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
                className={`p-1 rounded-md transition-colors cursor-pointer ${
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

      {/* Main Board View: List or Kanban */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No tasks found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No tasks matched the selected filter criteria or department filter.
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <div className="space-y-2.5 max-w-4xl mx-auto">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} variant="list" />
            ))}
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full items-start overflow-x-auto">
            {kanbanColumns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              const Icon = col.icon;
              return (
                <div
                  key={col.id}
                  className="bg-slate-100/60 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-full"
                >
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 dark:text-slate-300">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{col.title}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                    {colTasks.map((task) => (
                      <TaskCard key={task.id} task={task} variant="kanban" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
