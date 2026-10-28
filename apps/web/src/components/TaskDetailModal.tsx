'use client';
import React, { useState, useEffect } from 'react';
import { useTaskStore, TaskItem } from '../stores/task.store';
import { useAuthStore } from '../stores/auth.store';
import { translations } from '../i18n/translations';
import { api } from '../api/client';
import {
  X,
  CheckCircle,
  Clock,
  User,
  ShieldCheck,
  FileCheck,
  Send,
  Plus,
  Upload,
  Calendar,
  AlertTriangle,
  History,
  MessageSquare,
  CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';

export const TaskDetailModal: React.FC = () => {
  const {
    selectedTask,
    selectTask,
    statuses,
    updateStatus,
    submitProof,
    reviewApproval,
    addComment,
    addChecklistItem,
    toggleChecklistItem,
    requestExtension,
  } = useTaskStore();

  const { user, locale } = useAuthStore();
  const t = translations[locale];

  const [commentText, setCommentText] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [extensionDate, setExtensionDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activities'>('details');

  if (!selectedTask) return null;

  const isCreatorOrManager =
    user?.id === selectedTask.creator_id || user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isUnderReview = selectedTask.status?.category === 'UNDER_REVIEW';

  const handleStatusChange = (statusId: string) => {
    updateStatus(selectedTask.id, statusId);
  };

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    addComment(selectedTask.id, commentText.trim());
    setCommentText('');
  };

  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    addChecklistItem(selectedTask.id, newChecklistText.trim());
    setNewChecklistText('');
  };

  const handleSubmitProof = () => {
    submitProof(selectedTask.id, proofNote, [
      { name: 'proof_document.png', url: 'https://example.com/proof.png', size: 1024, mime_type: 'image/png' },
    ]);
    setProofNote('');
    alert('Proof submitted! You can now mark the task completed.');
  };

  const handleRequestExtension = () => {
    if (!extensionDate || !extensionReason) return;
    requestExtension(selectedTask.id, extensionDate, extensionReason);
    setShowExtensionForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: selectedTask.status?.color || '#3b82f6' }}
            >
              {selectedTask.status?.name}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              {selectedTask.priority}
            </span>
          </div>

          <button
            onClick={() => selectTask(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-800 flex space-x-4 rtl:space-x-reverse text-xs font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2.5 border-b-2 transition ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Task Overview
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`py-2.5 border-b-2 transition flex items-center space-x-1 ${
              activeTab === 'comments'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.comments}</span>
            <span className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded-full text-[10px]">
              {selectedTask.comments?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`py-2.5 border-b-2 transition flex items-center space-x-1 ${
              activeTab === 'activities'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.activity_log}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {activeTab === 'details' && (
            <>
              {/* Title & Description */}
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {selectedTask.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  {selectedTask.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Status Update Control */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Change Workflow Status:
                  </span>
                  <select
                    value={selectedTask.status_id}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Due Date & Extension */}
                <div className="text-right rtl:text-left">
                  <span className="text-[10px] text-gray-400 block">Due Date:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedTask.due_date ? format(new Date(selectedTask.due_date), 'PPP') : 'None'}
                  </span>
                  <button
                    onClick={() => setShowExtensionForm(!showExtensionForm)}
                    className="block text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5"
                  >
                    {t.request_extension}
                  </button>
                </div>
              </div>

              {/* Extension Request Form */}
              {showExtensionForm && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 space-y-2">
                  <h4 className="font-bold text-amber-800 dark:text-amber-200">Request Due-Date Extension</h4>
                  <input
                    type="date"
                    value={extensionDate}
                    onChange={(e) => setExtensionDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-amber-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Reason for extension..."
                    value={extensionReason}
                    onChange={(e) => setExtensionReason(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border border-amber-300 rounded text-xs"
                  />
                  <button
                    onClick={handleRequestExtension}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium"
                  >
                    Submit Request
                  </button>
                </div>
              )}

              {/* Under Review Approval Banner */}
              {isUnderReview && isCreatorOrManager && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-purple-800 dark:text-purple-200 font-bold">
                    <ShieldCheck className="w-5 h-5 text-purple-600" />
                    <span>Approval Required</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    This task has been submitted for review. As creator/manager, please review deliverables and approve or reject.
                  </p>
                  <div className="flex space-x-2 rtl:space-x-reverse pt-1">
                    <button
                      onClick={() => reviewApproval(selectedTask.id, true)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold"
                    >
                      {t.approve} to Done
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection:');
                        if (reason) reviewApproval(selectedTask.id, false, reason);
                      }}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold"
                    >
                      {t.reject} back to In Progress
                    </button>
                  </div>
                </div>
              )}

              {/* Proof Required Submission Banner */}
              {selectedTask.proof_required && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 space-y-2">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse text-blue-800 dark:text-blue-200 font-bold">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <span>Proof of Work Required</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    You must submit proof of completion note or photo before this task can be marked Done.
                  </p>
                  <div className="flex space-x-2 rtl:space-x-reverse">
                    <input
                      type="text"
                      placeholder="Completion notes / link..."
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-300 rounded text-xs"
                    />
                    <button
                      onClick={handleSubmitProof}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center space-x-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t.submit_proof}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Checklists */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2">{t.checklists}</h4>
                <div className="space-y-1.5 mb-2">
                  {selectedTask.checklist?.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center space-x-2.5 rtl:space-x-reverse p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span className={`flex-1 ${item.is_completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <input
                    type="text"
                    placeholder={t.add_item}
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklist())}
                    className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
                  />
                  <button
                    onClick={handleAddChecklist}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {selectedTask.comments?.map((c) => (
                  <div key={c.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{c.user?.name || 'Team Member'}</span>
                      <span className="text-[10px] text-gray-400">{format(new Date(c.created_at), 'Pp')}</span>
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
                {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                  <div className="text-center py-6 text-gray-400 italic">No comments yet</div>
                )}
              </div>

              <div className="flex space-x-2 rtl:space-x-reverse pt-2">
                <input
                  type="text"
                  placeholder={t.write_comment}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlePostComment())}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none"
                />
                <button
                  onClick={handlePostComment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {/* Activity Log Tab (Immutable Audit Log) */}
          {activeTab === 'activities' && (
            <div className="space-y-2">
              {selectedTask.activities?.map((act) => (
                <div key={act.id} className="flex items-start space-x-2.5 rtl:space-x-reverse p-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg border border-gray-100 dark:border-gray-800">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{act.actor?.name || 'System'}</span>
                      <span className="text-[10px] text-gray-400">{format(new Date(act.created_at), 'Pp')}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-[11px] mt-0.5">
                      <span className="font-medium text-emerald-600">{act.action}</span>
                      {act.field_name && <span> on {act.field_name}</span>}
                      {act.old_value && <span>: from "{act.old_value}"</span>}
                      {act.new_value && <span> to "{act.new_value}"</span>}
                    </p>
                  </div>
                </div>
              ))}
              {(!selectedTask.activities || selectedTask.activities.length === 0) && (
                <div className="text-center py-6 text-gray-400 italic">No activity recorded yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
