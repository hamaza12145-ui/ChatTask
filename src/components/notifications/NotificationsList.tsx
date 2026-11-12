import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AppNotification, NotificationType } from '../../types';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  AtSign,
  Calendar,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export const NotificationsList: React.FC = () => {
  const {
    userNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUserById,
    navigateToMessage,
    navigateToTask,
  } = useAppStore();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const displayedNotifications = userNotifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const handleNotificationClick = (notif: AppNotification) => {
    markNotificationRead(notif.id);

    if (notif.taskId) {
      navigateToTask(notif.taskId);
    } else if (notif.chatId && notif.messageId) {
      navigateToMessage(notif.chatId, notif.messageId);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'mention':
        return <AtSign className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'new_task':
        return <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'approval_request':
        return <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'status_change':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'due_soon':
        return <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatNotificationTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/60 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Notifications &amp; Activity
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Action items, task assignments, approvals, and team mentions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter All/Unread */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All ({userNotifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'unread'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Unread ({userNotifications.filter((n) => !n.read).length})
            </button>
          </div>

          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-2.5">
        {displayedNotifications.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No notifications
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              You are all caught up on deliverables, mentions, and approvals.
            </p>
          </div>
        ) : (
          displayedNotifications.map((notif) => {
            const sender = getUserById(notif.senderId);

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group cursor-pointer p-4 rounded-xl border transition-all ${
                  notif.read
                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700'
                    : 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/80 hover:border-indigo-400'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Type Icon */}
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                        {formatNotificationTime(notif.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2">
                      {notif.body}
                    </p>

                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        {sender && (
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${sender.avatarBg}`}
                            >
                              {sender.avatar}
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{sender.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>{notif.taskId ? 'View Task' : 'Open Message'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
