import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { ActiveTab } from '../types';
import { MessageSquare, CheckSquare, Bell, User } from 'lucide-react';

export const BottomTabBar: React.FC = () => {
  const {
    activeMobileTab,
    setActiveMobileTab,
    unreadNotificationCount,
    chats,
    currentUser,
    activeChatId,
    deviceView,
  } = useAppStore();

  // In WhatsApp and mobile chat apps: when inside a chat, the bottom tab bar is HIDDEN so composer has full focus!
  if (activeMobileTab === 'chats' && activeChatId !== null) {
    return null;
  }

  // Calculate unread chat messages for current user
  const totalUnreadChats = chats.reduce(
    (acc, chat) => acc + (chat.unreadCounts[currentUser.id] || 0),
    0
  );

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    {
      id: 'chats',
      label: 'Chats',
      icon: MessageSquare,
      badge: totalUnreadChats > 0 ? totalUnreadChats : undefined,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
    },
    {
      id: 'notifications',
      label: 'Alerts',
      icon: Bell,
      badge: unreadNotificationCount > 0 ? unreadNotificationCount : undefined,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
    },
  ];

  // If in desktop view mode, don't show mobile tab bar
  const hideOnDesktopClass = deviceView === 'mobile' ? 'flex' : 'flex lg:hidden';

  return (
    <nav className={`${hideOnDesktopClass} shrink-0 items-center justify-around h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 select-none z-30`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeMobileTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => setActiveMobileTab(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors relative min-h-[44px] ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 bg-emerald-600 dark:bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums shadow-sm">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
