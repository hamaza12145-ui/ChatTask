import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DepartmentDirectory } from './DepartmentDirectory';
import { formatDepartmentName } from '../../services/dmsApi';
import { User } from '../../types';
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
  Check,
  CheckCheck,
  MessageSquare,
  UserPlus,
} from 'lucide-react';

export const ChatList: React.FC = () => {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    currentUser,
    users,
    getUserById,
    setIsNewChatModalOpen,
    createChat,
    typingStatus,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups' | 'direct' | 'departments'>('all');
  const [showQuickDepts, setShowQuickDepts] = useState(false);

  const query = searchQuery.trim().toLowerCase();

  // 1. Filter existing conversations where currentUser is an authorized participant.
  // Rule: A conversation appears in Chat List ONLY after at least one message has been sent (or if it is a channel/linked task).
  // Empty draft conversations created when selecting a user must NEVER appear in the list.
  const filteredChats = useMemo(() => {
    const uid = String(currentUser.id);
    return chats.filter((chat) => {
      // Never display draft conversations in the visible Chat List
      if (chat.isDraft) return false;

      // Channels, announcements, and task-linked chats are permanent; direct/groups require at least 1 message
      const isChannelOrTask = chat.type === 'channel' || chat.type === 'announcement' || Boolean(chat.linkedTaskId);
      if (!isChannelOrTask && !chat.lastMessage) return false;

      // Must be an authorized participant
      const isParticipant =
        chat.participantIds?.map(String).includes(uid) ||
        chat.adminIds?.map(String).includes(uid) ||
        (chat.type === 'channel' && (!chat.participantIds || chat.participantIds.length === 0));

      if (!isParticipant) return false;

      // Resolve display name for direct chat
      let displayName = chat.name;
      if (chat.type === 'direct') {
        const otherUserId = chat.participantIds.find((id) => String(id) !== uid) || chat.participantIds[0];
        const otherUser = getUserById(otherUserId);
        if (otherUser) {
          displayName = otherUser.name;
        }
      }

      // Search query matching
      if (query) {
        const matchesName =
          displayName.toLowerCase().includes(query) || chat.name.toLowerCase().includes(query);
        const matchesMsg =
          chat.lastMessage?.text && chat.lastMessage.text.toLowerCase().includes(query);
        if (!matchesName && !matchesMsg) return false;
      }

      // Filter type: safely extract unread count for current user (handles string/number IDs and undefined counts)
      const unreadCount = Number(
        chat.unreadCounts?.[currentUser.id] ??
        chat.unreadCounts?.[String(currentUser.id)] ??
        chat.unreadCounts?.[Number(currentUser.id)] ??
        0
      );
      if (filterType === 'unread') return unreadCount > 0;
      if (filterType === 'groups') return chat.type === 'group' || chat.type === 'channel' || chat.type === 'announcement';
      if (filterType === 'direct') return chat.type === 'direct';

      return true;
    });
  }, [chats, currentUser.id, query, filterType, getUserById]);

  // Sort pinned first, then by last message timestamp
  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredChats]);

  // 2. Search colleagues (users without an existing 1:1 conversation)
  // Per requirement: "Show users without existing conversations only when the user explicitly searches for them or starts a new chat."
  const searchedColleagues = useMemo(() => {
    if (!query) return [];

    const uid = String(currentUser.id);
    const existingDirectUserIds = new Set<string>();
    chats.forEach((c) => {
      // Only treat as existing conversation if it has actually exchanged messages and is not a draft
      if (
        c.type === 'direct' &&
        !c.isDraft &&
        Boolean(c.lastMessage) &&
        c.participantIds?.map(String).includes(uid)
      ) {
        c.participantIds.forEach((pid) => {
          if (String(pid) !== uid) {
            existingDirectUserIds.add(String(pid));
          }
        });
      }
    });

    return users.filter((u) => {
      if (String(u.id) === uid) return false;
      if (existingDirectUserIds.has(String(u.id))) return false;
      return (
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.designation && u.designation.toLowerCase().includes(query)) ||
        (u.department && u.department.toLowerCase().includes(query))
      );
    });
  }, [query, users, chats, currentUser.id]);

  const handleStartChatWithUser = (user: User) => {
    // Check if active direct chat with messages already exists
    const existing = chats.find(
      (c) =>
        c.type === 'direct' &&
        !c.isDraft &&
        Boolean(c.lastMessage) &&
        c.participantIds?.map(String).includes(String(currentUser.id)) &&
        c.participantIds?.map(String).includes(String(user.id))
    );

    if (existing) {
      setActiveChatId(existing.id);
      setSearchQuery('');
      return;
    }

    // Check if a draft chat already exists with this user
    const existingDraft = chats.find(
      (c) =>
        c.type === 'direct' &&
        c.isDraft &&
        c.participantIds?.map(String).includes(String(currentUser.id)) &&
        c.participantIds?.map(String).includes(String(user.id))
    );

    if (existingDraft) {
      setActiveChatId(existingDraft.id);
      setSearchQuery('');
      return;
    }

    const newChatId = createChat({
      name: user.name,
      type: 'direct',
      participantIds: [user.id],
      department: user.department,
    });
    setActiveChatId(newChatId);
    setSearchQuery('');
  };

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
            MTJF Communications
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Team Messenger &amp; Tasks
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
        ) : sortedChats.length === 0 && searchedColleagues.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <p>{query ? `No conversations or colleagues found matching "${searchQuery}".` : 'No conversations found.'}</p>
            <p className="mt-1 text-[11px] text-slate-400">Click "+ New Chat" to start messaging.</p>
          </div>
        ) : (
          <>
            {sortedChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              // Safely extract unread count for current user (handles string/number IDs and undefined counts)
              const unreadCount = Number(
                chat.unreadCounts?.[currentUser.id] ??
                chat.unreadCounts?.[String(currentUser.id)] ??
                chat.unreadCounts?.[Number(currentUser.id)] ??
                0
              );
              const isTyping = !!typingStatus[chat.id];

              // Resolve target user if direct chat
              let chatDisplayName = chat.name;
              let chatAvatarBg = chat.avatarBg || 'bg-emerald-600';
              let chatAvatar = chat.name.slice(0, 2).toUpperCase();

              if (chat.type === 'direct') {
                const otherUserId = chat.participantIds.find((id) => String(id) !== String(currentUser.id)) || chat.participantIds[0];
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
                        <span
                          className={`text-[10px] font-mono shrink-0 ml-1 ${
                            unreadCount > 0
                              ? 'text-[#25d366] font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {formatMessageTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <div className="truncate min-w-0 pr-2 flex items-center">
                        {isTyping ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium italic animate-pulse">
                            {typingStatus[chat.id]} is typing...
                          </span>
                        ) : (
                          <>
                            {chat.lastMessage && String(chat.lastMessage.senderId) === String(currentUser.id) && (() => {
                              const isRead =
                                chat.lastMessage.status === 'read' ||
                                Boolean(
                                  chat.lastMessage.readBy &&
                                  Object.keys(chat.lastMessage.readBy).some((uid) => String(uid) !== String(currentUser.id))
                                );
                              const isDelivered =
                                isRead ||
                                chat.lastMessage.status === 'delivered' ||
                                Boolean(
                                  chat.lastMessage.deliveredTo &&
                                  Object.keys(chat.lastMessage.deliveredTo).some((uid) => String(uid) !== String(currentUser.id))
                                );

                              return (
                                <span
                                  className="inline-flex shrink-0 mr-1"
                                  title={
                                    isRead
                                      ? 'Read'
                                      : isDelivered
                                      ? 'Delivered'
                                      : 'Sent'
                                  }
                                >
                                  {isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                  ) : isDelivered ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  )}
                                </span>
                              );
                            })()}
                            <span className="truncate">
                              {chat.lastMessage?.text || 'No messages yet'}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Unread message count badge: shown in real time when conversation has unread messages and is not active */}
                      {unreadCount > 0 && !isActive && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#25d366] text-white text-[11px] font-bold flex items-center justify-center leading-none shadow-xs font-sans">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Colleagues Section on Explicit Search */}
            {query && searchedColleagues.length > 0 && (
              <div className="pt-3 pb-1 px-1">
                <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Colleagues (Start New Chat)</span>
                  </span>
                  <span className="text-[10px] font-mono">{searchedColleagues.length}</span>
                </div>
                <div className="space-y-0.5">
                  {searchedColleagues.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChatWithUser(user)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left cursor-pointer group border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${user.avatarBg}`}
                        >
                          {user.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {user.designation || formatDepartmentName(user.department)}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <MessageSquare className="w-3 h-3" />
                        <span>Message</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
