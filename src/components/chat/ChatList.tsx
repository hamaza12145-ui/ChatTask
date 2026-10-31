import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DepartmentDirectory } from './DepartmentDirectory';
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
            WhatsApp Chats
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            AlHasanain School Staff Messenger
          </p>
        </div>
        <button
          onClick={() => setIsNewChatModalOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          title="Start new chat by department"
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
            placeholder="Search chats, colleagues, roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>

        {/* WhatsApp Filter Pills including Departments */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: 'All Chats' },
              { id: 'departments', label: '🏢 Departments' },
              { id: 'unread', label: 'Unread' },
              { id: 'groups', label: 'Groups' },
              { id: 'direct', label: '1:1' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterType(tab.id);
                if (tab.id === 'departments') setShowQuickDepts(false);
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap transition-colors ${
                filterType === tab.id
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Collapsible Department Dropdown Banner (when on All Chats) */}
        {filterType !== 'departments' && (
          <div>
            <button
              onClick={() => setShowQuickDepts((prev) => !prev)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/90 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">All Departments (Management, Admin, Accounts, Academics, Maintenance)</span>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                  5 Depts
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    showQuickDepts ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Quick Accordion Dropdown Container */}
            {showQuickDepts && (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-xl p-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 shadow-inner">
                <DepartmentDirectory compact />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content: Department Directory OR WhatsApp Chat List Items */}
      {filterType === 'departments' ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              School Departments &amp; Staff Directory
            </span>
            <span className="text-[10px] text-slate-400">
              Hover employee to view designation
            </span>
          </div>
          <DepartmentDirectory />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
          {sortedChats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              No conversations found
            </div>
          ) : (
            sortedChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const unreadCount = chat.unreadCounts[currentUser.id] || 0;
              const isTyping = typingStatus[chat.id];

              // Direct chat partner
              let directUser = null;
              if (chat.type === 'direct') {
                const otherUserId = chat.participantIds.find((id) => id !== currentUser.id) || chat.participantIds[0];
                directUser = getUserById(otherUserId);
              }

            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-3 border-indigo-600'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Chat Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                      chat.avatarBg || 'bg-slate-600'
                    }`}
                  >
                    {chat.type === 'direct' && directUser ? (
                      directUser.avatar
                    ) : chat.type === 'announcement' ? (
                      <Radio className="w-5 h-5 text-white" />
                    ) : chat.type === 'channel' ? (
                      '#'
                    ) : (
                      <Users className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Online dot for direct chats */}
                  {chat.type === 'direct' && directUser && (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        directUser.status === 'online'
                          ? 'bg-emerald-500'
                          : directUser.status === 'busy'
                          ? 'bg-rose-500'
                          : directUser.status === 'away'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {chat.type === 'direct' && directUser ? directUser.name : chat.name}
                      </span>
                      {chat.isReadOnly && (
                        <span title="Read only">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-slate-400 dark:text-slate-500 shrink-0">
                      {formatMessageTime(chat.lastMessage?.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Last message or typing indicator */}
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {isTyping ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium italic animate-pulse">
                          {isTyping} is typing...
                        </span>
                      ) : chat.lastMessage ? (
                        <span>{chat.lastMessage.text}</span>
                      ) : (
                        <span className="text-slate-400 italic">No messages yet</span>
                      )}
                    </div>

                    {/* Unread badge & Pin */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {chat.isPinned && <Pin className="w-3 h-3 text-slate-400 rotate-45 shrink-0" />}
                      {unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      )}

      {/* WhatsApp style Floating Action Button (FAB) on mobile */}
      <button
        onClick={() => setIsNewChatModalOpen(true)}
        className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg flex items-center justify-center transition-all z-20 group"
        title="Start new conversation"
        aria-label="New chat"
      >
        <Plus className="w-6 h-6 stroke-[2.5] transition-transform group-hover:rotate-90" />
      </button>
    </aside>
  );
};
