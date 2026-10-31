import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TaskStatus } from '../../types';
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
    setActiveChatId,
    setActiveMobileTab,
    setTaskQuoteForComposer,
  } = useAppStore();

  const [newComment, setNewComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isTaskDrawerOpen || !activeTask) return null;

  const creator = getUserById(activeTask.creatorId);
  const sourceChat = chats.find((c) => c.id === activeTask.sourceChatId);
  const isCreator = activeTask.creatorId === currentUser.id;
  const isAssignee = activeTask.assigneeIds.includes(currentUser.id);

  const isOverdue =
    new Date(activeTask.dueDate).getTime() < Date.now() && activeTask.status !== 'completed';

  const handleStatusChangeClick = (targetStatus: TaskStatus) => {
    // If setting to under_review or completed, check if proof is required first
    if (
      (targetStatus === 'completed' || targetStatus === 'under_review') &&
      activeTask.proofRequired &&
      !activeTask.proof
    ) {
      openProofModal(activeTask.id);
      return;
    }

    updateTaskStatus(activeTask.id, targetStatus);
  };

  const handleDiscussInChat = () => {
    if (activeTask.sourceChatId) {
      setActiveChatId(activeTask.sourceChatId);
      setTaskQuoteForComposer(activeTask);
      setActiveMobileTab('chats');
      closeTaskDrawer();
    }
  };

  const handleGoToSourceMessage = () => {
    if (activeTask.sourceChatId && activeTask.sourceMessageId) {
      navigateToMessage(activeTask.sourceChatId, activeTask.sourceMessageId);
      closeTaskDrawer();
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentToTask(activeTask.id, newComment.trim());
    setNewComment('');
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
          <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
            {activeTask.code}
          </span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {activeTask.department}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeTask.sourceChatId && (
            <button
              onClick={handleDiscussInChat}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-colors"
              title="Quote this task in chat"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Discuss in Chat</span>
            </button>
          )}
          <button
            onClick={closeTaskDrawer}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
        {activeTask.sourceChatId && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400">Created in:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {sourceChat ? sourceChat.name : 'Team Chat'}
              </span>
            </div>
            {activeTask.sourceMessageId && (
              <button
                onClick={handleGoToSourceMessage}
                className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline shrink-0"
              >
                <span>Go to message</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Action Buttons: Status / Approval Flow (Core Requirements #8 & #9) */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Task Actions &amp; Lifecycle
          </div>

          {/* Under review banner */}
          {activeTask.status === 'under_review' && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Task is Under Review</span>
              </div>
              <p className="text-[11px] opacity-90">
                {isCreator
                  ? 'You are the creator. Please review submitted deliverables and approve or reject below.'
                  : `Waiting for ${creator?.name || 'task creator'} to review and sign off.`}
              </p>
            </div>
          )}

          {/* If Creator and status is under_review: APPROVE / REJECT FLOW */}
          {activeTask.status === 'under_review' && (isCreator || currentUser.department === 'Management') ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approveTask(activeTask.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Approve &amp; Complete</span>
                </button>
                <button
                  onClick={() => setShowRejectInput(!showRejectInput)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-200 text-xs font-bold transition-colors"
                >
                  <UserX className="w-4 h-4" />
                  <span>Reject / Changes</span>
                </button>
              </div>

              {/* Reject Reason input */}
              {showRejectInput && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 space-y-2 animate-in fade-in">
                  <label className="block text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                    Reason for Rejection / Revision Note:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Please recalculate line item 4..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-2.5 py-1 text-xs text-slate-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmReject}
                      disabled={!rejectReason.trim()}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold disabled:opacity-40"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {activeTask.requiresApproval
                      ? 'Submit for Review'
                      : activeTask.proofRequired
                      ? 'Submit Proof & Complete'
                      : 'Mark Done'}
                  </span>
                </button>
              )}

              {activeTask.status === 'completed' && (
                <button
                  onClick={() => handleStatusChangeClick('in_progress')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
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
                {creator ? creator.avatar : '??'}
              </div>
              <span>{creator ? creator.name : 'Unknown'}</span>
            </div>
          </div>

          <div className="col-span-2">
            <span className="text-slate-400 dark:text-slate-500 block mb-1.5">Assignees</span>
            <div className="flex flex-wrap gap-2">
              {activeTask.assigneeIds.map((userId) => {
                const assignee = getUserById(userId);
                if (!assignee) return null;
                return (
                  <div
                    key={userId}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${assignee.avatarBg}`}
                    >
                      {assignee.avatar}
                    </div>
                    <span>{assignee.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Interactive Checklist */}
        {activeTask.checklist.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Checklist Items</span>
              </h4>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                {activeTask.checklist.filter((i) => i.completed).length} / {activeTask.checklist.length} completed
              </span>
            </div>

            <div className="space-y-1.5">
              {activeTask.checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(activeTask.id, item.id)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                    item.completed
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-xs block ${
                        item.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.completedBy && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        by {getUserById(item.completedBy)?.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
            Comments &amp; Updates ({activeTask.comments.length})
          </h4>

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
                      {commentAuthor ? commentAuthor.name : 'Team member'}
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
              placeholder="Add a remark or inquiry..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40"
            >
              Post
            </button>
          </form>
        </div>

        {/* Chronological Activity Log */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" />
            <span>Activity Log</span>
          </h4>
          <div className="space-y-2 text-xs">
            {activeTask.activityLog.map((log) => {
              const actor = getUserById(log.userId);
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {actor ? actor.name : 'System'}:
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
