import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TaskStatus } from '../../types';
import { formatDepartmentName } from '../../services/dmsApi';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldAlert,
  MessageSquare,
  ArrowRight,
  Send,
  Plus,
  Paperclip,
  UserCheck,
  UserX,
  History,
  MessageCircle,
  ListTodo,
  Lock,
  Loader2,
  User as UserIcon,
} from 'lucide-react';

export const TaskDrawer: React.FC = () => {
  const {
    isTaskDrawerOpen,
    closeTaskDrawer,
    activeTask,
    updateTaskStatus,
    openProofModal,
    approveTask,
    rejectTask,
    toggleChecklistItem,
    addCommentToTask,
    getUserById,
    currentUser,
    chats,
    navigateToMessage,
    openTaskChat,
  } = useAppStore();

  const [newComment, setNewComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  if (!isTaskDrawerOpen || !activeTask) return null;

  const currentUid = Number(currentUser.id);
  const creator = getUserById(activeTask.creatorId);
  const sourceChat = chats.find(
    (c) => c.id === activeTask.sourceChatId || c.linkedTaskId === activeTask.id || c.id === `task_chat_${activeTask.id}`
  );

  // Robust numeric ID checks matching ERP-Task backend & view rules
  const isCreator = Number(activeTask.creatorId) === currentUid;
  const isAssignee = activeTask.assigneeIds.some((id) => Number(id) === currentUid);
  const isSuperAdmin =
    currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'super_admin';
  const isTerminal = ['completed', 'closed', 'cancelled', 'rejected', 'pending_approval', 'approved'].includes(
    (activeTask.status || '').toLowerCase()
  );

  // Overall MoV checklist editing permission (matches ERP-Task index.jsx)
  const canEditMovChecklist =
    !isTerminal &&
    (isAssignee ||
      isSuperAdmin ||
      (isCreator && (!activeTask.movAssignments || activeTask.movAssignments.length === 0)));

  const isOverdue =
    new Date(activeTask.dueDate).getTime() < Date.now() && activeTask.status !== 'completed';

  const handleStatusChangeClick = async (targetStatus: TaskStatus) => {
    if (
      (targetStatus === 'completed' || targetStatus === 'under_review') &&
      activeTask.proofRequired &&
      !activeTask.proof
    ) {
      openProofModal(activeTask.id);
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateTaskStatus(activeTask.id, targetStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDiscussInChat = () => {
    openTaskChat(activeTask.id);
  };

  const handleGoToSourceMessage = () => {
    if (activeTask.sourceChatId && activeTask.sourceMessageId) {
      navigateToMessage(activeTask.sourceChatId, activeTask.sourceMessageId);
      closeTaskDrawer();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const text = newComment.trim();
    setNewComment('');
    await addCommentToTask(activeTask.id, text);
  };

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return;
    rejectTask(activeTask.id, rejectReason.trim());
    setShowRejectInput(false);
    setRejectReason('');
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] md:w-[460px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
            {activeTask.code}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
            {formatDepartmentName(activeTask.department)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Always allow jumping or starting task chat discussion */}
          <button
            onClick={handleDiscussInChat}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
            title="Open real-time team conversation for this task"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Discuss in Chat</span>
          </button>
          <button
            onClick={closeTaskDrawer}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Drawer Scroll Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title & Priority Badge */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                activeTask.priority === 'urgent'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : activeTask.priority === 'high'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
              }`}
            >
              {activeTask.priority} priority
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                activeTask.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : activeTask.status === 'under_review'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : activeTask.status === 'in_progress'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {activeTask.status.replace('_', ' ')}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {activeTask.title}
          </h2>

          {activeTask.description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              {activeTask.description}
            </p>
          )}
        </div>

        {/* Source Chat & Jump to message */}
        {sourceChat && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Associated Chat:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {sourceChat.name}
              </span>
            </div>
            {activeTask.sourceMessageId && (
              <button
                onClick={handleGoToSourceMessage}
                className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline shrink-0 cursor-pointer"
              >
                <span>Jump to msg</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Action Buttons: Status / Approval Flow */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Task Lifecycle</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Active</span>
          </div>

          {/* Under review banner */}
          {activeTask.status === 'under_review' && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Task is Pending Approval</span>
              </div>
              <p className="text-[11px] opacity-90">
                {isCreator
                  ? 'You are the creator. Review submitted deliverables and sign off below.'
                  : `Waiting for ${creator?.name || 'task manager'} to review.`}
              </p>
            </div>
          )}

          {/* Approve / Reject Flow for Creator */}
          {activeTask.status === 'under_review' && (isCreator || currentUser.role === 'admin' || currentUser.department === 'admin') ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approveTask(activeTask.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Approve &amp; Complete</span>
                </button>
                <button
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <UserX className="w-4 h-4" />
                  <span>Request Revisions</span>
                </button>
              </div>

              {/* Reject Reason input */}
              {showRejectInput && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in">
                  <label className="block text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                    Reason for Revision Note:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please verify dispatch receipt and recalculate total..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmReject}
                      disabled={!rejectReason.trim()}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* General Status Buttons */
            <div className="flex flex-wrap gap-2">
              {activeTask.status !== 'in_progress' && activeTask.status !== 'completed' && (
                <button
                  onClick={() => handleStatusChangeClick('in_progress')}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start Task</span>
                </button>
              )}

              {activeTask.status !== 'completed' && activeTask.status !== 'under_review' && (
                <button
                  onClick={() => {
                    if (activeTask.proofRequired && !activeTask.proof) {
                      openProofModal(activeTask.id);
                    } else if (activeTask.requiresApproval) {
                      handleStatusChangeClick('under_review');
                    } else {
                      handleStatusChangeClick('completed');
                    }
                  }}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {activeTask.requiresApproval
                      ? 'Submit for Approval'
                      : activeTask.proofRequired
                      ? 'Submit Proof & Complete'
                      : 'Mark Done'}
                  </span>
                </button>
              )}

              {activeTask.status === 'completed' && (
                <button
                  onClick={() => handleStatusChangeClick('in_progress')}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>Reopen Task</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Proof Submission Card (If proof submitted) */}
        {activeTask.proof && (
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-purple-600" />
                Verified Completion Proof
              </span>
              <span className="text-[10px] font-mono tabular-nums text-purple-600 dark:text-purple-400">
                {formatDateTime(activeTask.proof.submittedAt)}
              </span>
            </div>

            {activeTask.proof.photoUrl && (
              <div className="rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800 max-h-48 bg-black/10">
                <img
                  src={activeTask.proof.photoUrl}
                  alt="Proof submission"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <p className="text-xs text-purple-950 dark:text-purple-100 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900 leading-relaxed">
              "{activeTask.proof.note}"
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs border-y border-slate-100 dark:border-slate-800 py-4">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1">Due Date</span>
            <div
              className={`font-semibold font-mono tabular-nums flex items-center gap-1.5 ${
                isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDateTime(activeTask.dueDate)}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block mb-1">Created By</span>
            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                  creator ? creator.avatarBg : 'bg-slate-500'
                }`}
              >
                {creator ? creator.avatar : 'AD'}
              </div>
              <span>{creator ? creator.name : `User #${activeTask.creatorId}`}</span>
            </div>
          </div>

          <div className="col-span-2">
            <span className="text-slate-400 dark:text-slate-500 block mb-1.5">Assignees</span>
            <div className="flex flex-wrap gap-2">
              {activeTask.assigneeIds.map((userId) => {
                const assignee = getUserById(userId);
                return (
                  <div
                    key={userId}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                        assignee ? assignee.avatarBg : 'bg-emerald-600'
                      }`}
                    >
                      {assignee ? assignee.avatar : 'U'}
                    </div>
                    <span>{assignee ? assignee.name : `User #${userId}`}</span>
                  </div>
                );
              })}            </div>
          </div>

          {activeTask.reporterIds && activeTask.reporterIds.length > 0 && (
            <div className="col-span-2">
              <span className="text-slate-400 dark:text-slate-500 block mb-1.5">Reporting Manager / Supervisor</span>
              <div className="flex flex-wrap gap-2">
                {activeTask.reporterIds.map((userId) => {
                  const reporter = getUserById(userId);
                  return (
                    <div
                      key={userId}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-medium"
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                          reporter ? reporter.avatarBg : 'bg-amber-600'
                        }`}
                      >
                        {reporter ? reporter.avatar : 'M'}
                      </div>
                      <span>{reporter ? `${reporter.name} (${reporter.designation})` : `Manager #${userId}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Checklist / Means of Verification (MoV) */}
        {activeTask.checklist.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Means of Verification (MoV)</span>
              </h4>
              <span className="text-[11px] font-mono font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                {activeTask.checklist.filter((i) => i.completed).length} / {activeTask.checklist.length} ({activeTask.progress ?? 0}%)
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, activeTask.progress ?? 0))}%` }}
              />
            </div>

            {/* Terminal status notice */}
            {isTerminal && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Checklist is locked because task status is <strong>{activeTask.status.replace('_', ' ')}</strong>.</span>
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              {activeTask.checklist.map((item) => {
                const isChecked = Boolean(item.completed);
                const isCheckedByOther =
                  isChecked && item.completedById != null && Number(item.completedById) !== currentUid;
                const isCreatorOnAnotherUsersMov =
                  isCreator && item.assignedUserId != null && Number(item.assignedUserId) !== currentUid;
                const isAssignedToCurrentUser =
                  item.assignedUserId != null && Number(item.assignedUserId) === currentUid;
                const isItemDisabled =
                  isTerminal ||
                  isCheckedByOther ||
                  (!canEditMovChecklist && !isAssignedToCurrentUser) ||
                  isCreatorOnAnotherUsersMov;
                const isTogglingThis = togglingItemId === item.id;

                const completedUser = item.completedById
                  ? getUserById(String(item.completedById))
                  : item.completedBy
                  ? getUserById(String(item.completedBy))
                  : null;

                const assignedUser = item.assignedUserId != null ? getUserById(String(item.assignedUserId)) : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isItemDisabled && !isTogglingThis) {
                        setTogglingItemId(item.id);
                        toggleChecklistItem(activeTask.id, item.id).finally(() => {
                          setTogglingItemId(null);
                        });
                      }
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all ${
                      isItemDisabled
                        ? 'cursor-not-allowed bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-800/50 opacity-80'
                        : 'cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 shadow-sm'
                    } ${
                      isChecked
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="pt-0.5 flex-shrink-0">
                      {isTogglingThis ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                      ) : (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isItemDisabled}
                          onChange={() => {}}
                          className={`rounded text-emerald-600 focus:ring-emerald-500 ${
                            isItemDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs ${
                            isChecked
                              ? 'line-through text-slate-400 dark:text-slate-500 font-normal'
                              : 'text-slate-800 dark:text-slate-100 font-medium'
                          }`}
                        >
                          {item.title}
                        </span>

                        {/* Status badges */}
                        {isCheckedByOther && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            <Lock className="w-2.5 h-2.5" />
                            Locked
                          </span>
                        )}

                        {isCreatorOnAnotherUsersMov && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            <UserIcon className="w-2.5 h-2.5" />
                            Assigned to {assignedUser?.name || `User #${item.assignedUserId}`}
                          </span>
                        )}
                      </div>

                      {/* Detail row */}
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
                        {assignedUser && !isCreatorOnAnotherUsersMov && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-2.5 h-2.5 text-slate-400" />
                            For: <strong className="text-slate-600 dark:text-slate-300">{assignedUser.name}</strong>
                          </span>
                        )}

                        {isChecked && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                            Completed by:{' '}
                            <strong className="text-slate-700 dark:text-slate-200">
                              {completedUser?.name || (item.completedById ? `User #${item.completedById}` : (item.completedBy || 'Team member'))}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Attachments */}
        {activeTask.attachments.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-slate-400" />
              <span>Attachments ({activeTask.attachments.length})</span>
            </h4>
            <div className="space-y-1.5">
              {activeTask.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                    {att.name}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 ml-2">
                    {att.size || 'File'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments Thread */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Comments &amp; Discussion ({activeTask.comments.length})
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Live Thread</span>
          </div>

          <div className="space-y-2 mb-3">
            {activeTask.comments.map((comm) => {
              const commentAuthor = getUserById(comm.userId);
              return (
                <div
                  key={comm.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {commentAuthor ? commentAuthor.name : `User #${comm.userId}`}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400">
                      {formatDateTime(comm.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {comm.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Add remark to task..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Post
            </button>
          </form>
        </div>

        {/* Chronological Activity Log */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" />
            <span>Audit History</span>
          </h4>
          <div className="space-y-2 text-xs">
            {activeTask.activityLog.map((log) => {
              const actor = getUserById(log.userId);
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {actor ? actor.name : `User #${log.userId}`}:
                    </span>{' '}
                    <span>{log.action}</span>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums shrink-0">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
