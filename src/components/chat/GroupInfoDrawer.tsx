import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { TaskCard } from '../tasks/TaskCard';
import {
  X,
  Users,
  Shield,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ListTodo,
  ExternalLink,
} from 'lucide-react';

export const GroupInfoDrawer: React.FC = () => {
  const {
    activeChat,
    isGroupInfoOpen,
    setIsGroupInfoOpen,
    currentUser,
    getUserById,
    tasks,
    chatMessages,
    setActiveChatId,
    chats,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'media'>('members');

  if (!isGroupInfoOpen || !activeChat) return null;

  // Tasks created in this chat
  const chatTasks = tasks.filter((t) => t.sourceChatId === activeChat.id);

  // Shared media from chat messages
  const sharedMedia = chatMessages.filter((m) => m.attachment);

  const isDirect = activeChat.type === 'direct';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {isDirect ? 'Contact Details' : 'Group Information'}
          </h3>
          <button
            onClick={() => setIsGroupInfoOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Section */}
        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-xl font-bold shadow-md mb-3 ${
              activeChat.avatarBg || 'bg-slate-600'
            }`}
          >
            {isDirect
              ? getUserById(activeChat.participantIds.find((id) => id !== currentUser.id) || '')?.avatar
              : activeChat.name[0]}
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {activeChat.name}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {activeChat.description || `${activeChat.department || 'Operations'} Department Channel`}
          </p>
        </div>

        {/* Segmented Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 pt-2 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Members ({activeChat.participantIds.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'tasks'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Tasks ({chatTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-all ${
              activeTab === 'media'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            Files ({sharedMedia.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-2">
              {activeChat.participantIds.map((userId) => {
                const user = getUserById(userId);
                if (!user) return null;
                const isAdmin = activeChat.adminIds.includes(userId);

                return (
                  <div
                    key={userId}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${user.avatarBg}`}
                        >
                          {user.avatar}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                            user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {user.name}
                          </p>
                          {user.id === currentUser.id && (
                            <span className="text-[10px] text-slate-400">(You)</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {user.designation} · {user.department}
                        </p>
                      </div>
                    </div>

                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {chatTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No tasks created in this chat yet.
                </div>
              ) : (
                chatTasks.map((task) => (
                  <TaskCard key={task.id} task={task} variant="list" />
                ))
              )}
            </div>
          )}

          {/* Shared Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-2">
              {sharedMedia.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No attachments shared yet.
                </div>
              ) : (
                sharedMedia.map((m) => {
                  if (!m.attachment) return null;
                  const isImg = m.attachment.type === 'image';

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 shrink-0 overflow-hidden">
                        {isImg ? (
                          <img
                            src={m.attachment.url}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {m.attachment.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {m.attachment.size || 'Attachment'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
