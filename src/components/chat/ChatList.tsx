import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DepartmentDirectory } from './DepartmentDirectory';
import { formatDepartmentName } from '../../services/dmsApi';
import {
  Search,
  Pin,
  Plus,
  Users,
  Radio,
  Lock,
  Filter,
  Building2,
  ChevronDown,
  Hash,
} from 'lucide-react';

export const ChatList: React.FC = () => {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    currentUser,
    getUserById,
    setIsNewChatModalOpen,
    typingStatus,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups' | 'direct' | 'departments'>('all');
  const [showQuickDepts, setShowQuickDepts] = useState(false);

  const filteredChats = chats.filter((chat) => {
    // Search query
    const matchesSearch =
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (chat.lastMessage?.text && chat.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter type
    const unreadCount = chat.unreadCounts[currentUser.id] || 0;
    if (filterType === 'unread') return unreadCount > 0;
    if (filterType === 'groups') return chat.type === 'group' || chat.type === 'channel' || chat.type === 'announcement';
    if (filterType === 'direct') return chat.type === 'direct';

    return true;
  });

  // Sort pinned first, then by last message timestamp
  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none">
      {/* Header with Title and New Chat button */}
      <div className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            DMS Communications
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Team Messenger &amp; Tasking Sync
          </p>
        </div>
        <button
          onClick={() => setIsNewChatModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          title="Start new conversation"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Bar & Department Quick Toggle */}
      <div className="p-3 pb-2 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations, colleagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'groups', label: 'Channels' },
              { id: 'direct', label: 'Direct' },
              { id: 'departments', label: 'Departments' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterType(tab.id);
                if (tab.id === 'departments') {
                  setShowQuickDepts(true);
                } else {
                  setShowQuickDepts(false);
                }
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Conversation List or Department Directory */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/60 dark:divide-slate-800/60 p-2">
        {showQuickDepts || filterType === 'departments' ? (
          <div className="p-1">
            <DepartmentDirectory />
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <p>No conversations found.</p>
            <p className="mt-1 text-[11px] text-slate-400">Click "+ New Chat" to start messaging.</p>
          </div>
        ) : (
          sortedChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const unreadCount = chat.unreadCounts[currentUser.id] || 0;
            const isTyping = !!typingStatus[chat.id];

            // Resolve target user if direct chat
            let chatDisplayName = chat.name;
            let chatAvatarBg = chat.avatarBg || 'bg-emerald-600';
            let chatAvatar = chat.name.slice(0, 2).toUpperCase();

            if (chat.type === 'direct') {
              const otherUserId = chat.participantIds.find((id) => id !== currentUser.id) || chat.participantIds[0];
              const otherUser = getUserById(otherUserId);
              if (otherUser) {
                chatDisplayName = otherUser.name;
                chatAvatarBg = otherUser.avatarBg;
                chatAvatar = otherUser.avatar;
              }
            } else if (chat.type === 'channel') {
              chatAvatar = '#';
            }

            return (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 p-3 text-left rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 text-slate-900 dark:text-slate-100 shadow-2xs border border-emerald-200/60 dark:border-emerald-800/50'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {/* Avatar with unread / channel badge */}
                <div className="relative shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-xs ${chatAvatarBg}`}
                  >
                    {chatAvatar}
                  </div>
                  {chat.type === 'channel' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold">
                      #
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                        {chatDisplayName}
                      </span>
                      {chat.isPinned && (
                        <Pin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    {chat.lastMessage && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                        {formatMessageTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <p className="truncate min-w-0 pr-2">
                      {isTyping ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium italic animate-pulse">
                          {typingStatus[chat.id]} is typing...
                        </span>
                      ) : (
                        chat.lastMessage?.text || 'No messages yet'
                      )}
                    </p>
                    {unreadCount > 0 && (
                      <span className="shrink-0 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold font-mono">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
