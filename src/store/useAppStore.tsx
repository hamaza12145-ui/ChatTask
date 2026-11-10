import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import {
  User,
  Chat,
  ChatMessage,
  Task,
  AppNotification,
  ActiveTab,
  TaskStatus,
  TaskPriority,
  Department,
  QuotedMessage,
  TaskAttachment,
  DeviceView,
} from '../types';
// SEED data completely removed - ERP-Task APIs and PostgreSQL database are the single source of truth.
import { dmsApi, getDepartmentMeta, DepartmentMeta } from '../services/dmsApi';
import { e2eeCrypto } from '../services/e2eeCrypto';
import { chatSocket } from '../services/chatSocket';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppStoreContextType {
  // Current user & Users (Fetched from DMS)
  currentUser: User;
  users: User[];
  departments: DepartmentMeta[];
  fetchDepartments: () => Promise<DepartmentMeta[]>;
  setCurrentUserId: (userId: string) => void;
  getUserById: (userId: string) => User | undefined;
  isLoadingDms: boolean;
  isDmsConnected: boolean;
  isLiveSyncing: boolean;
  lastSyncTimestamp: number | null;
  refreshDmsData: () => Promise<void>;

  // Chats
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  setActiveChatId: (chatId: string | null) => void;
  createChat: (data: { name: string; type: 'direct' | 'group' | 'channel'; participantIds: string[]; department?: Department }) => string;
  openTaskChat: (taskId: string) => void;

  // Messages
  messages: ChatMessage[];
  chatMessages: ChatMessage[];
  messagesByChatId: Record<string, ChatMessage[]>;
  hasMoreOlderMessages: Record<string, boolean>;
  isLoadingOlderMessages: boolean;
  loadOlderMessages: (chatId: string) => Promise<void>;
  sendTypingIndicator: (chatId: string, isTyping: boolean) => void;
  sendMessage: (
    chatId: string,
    text: string,
    options?: {
      replyTo?: QuotedMessage;
      attachment?: TaskAttachment;
      voiceDuration?: number;
      taskId?: string;
    }
  ) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  highlightedMessageId: string | null;
  setHighlightedMessageId: (id: string | null) => void;
  replyMessage: QuotedMessage | null;
  setReplyMessage: (msg: QuotedMessage | null) => void;
  taskQuoteForComposer: Task | null;
  setTaskQuoteForComposer: (task: Task | null) => void;

  // Typing simulator
  typingStatus: Record<string, string>; // chatId -> userName who is typing

  // Tasks (Fetched from DMS)
  tasks: Task[];
  activeTaskId: string | null;
  activeTask: Task | null;
  isTaskDrawerOpen: boolean;
  openTaskDrawer: (taskId: string) => void;
  closeTaskDrawer: () => void;
  createTask: (data: {
    title: string;
    description: string;
    department: Department | string;
    priority: TaskPriority | string;
    dueDate: string;
    startDate?: string;
    assigneeIds: string[];
    checklistTitles: string[];
    requiresApproval: boolean;
    proofRequired: boolean;
    sourceChatId?: string;
    sourceMessageId?: string;
    attachments?: TaskAttachment[];
    taskType?: string;
    workflowType?: string;
    projectName?: string;
    recurrenceRule?: string;
    recurrenceNextDate?: string;
    recurrenceEndType?: string;
    recurrenceEndDate?: string;
    recurrenceEndOccurrences?: number;
    approvalRequiredUserIds?: number[];
    movChecklist?: Array<{ text: string; checked?: boolean; checked_by_id?: number | null; checked_at?: string | null }>;
    movAssignments?: Array<{ mov_index: number; user_id: number | null }>;
    assignedUsersMeta?: Array<{ user_id: number; department: string }>;
  }) => Promise<Task>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  submitProof: (
    taskId: string,
    photoUrl: string,
    note: string,
    fileMeta?: {
      file?: File;
      fileName?: string;
      fileType?: string;
      fileSize?: string;
    }
  ) => Promise<void>;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, reason: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => Promise<boolean>;
  addCommentToTask: (taskId: string, text: string) => Promise<void>;
  getTaskById: (taskId: string) => Task | undefined;
  getTasksForChat: (chatId: string) => Task[];

  // Modals & Panels
  isCreateTaskModalOpen: boolean;
  taskModalInitialData: Partial<Task> | null;
  openCreateTaskModal: (initialData?: Partial<Task>) => void;
  closeCreateTaskModal: () => void;

  isProofModalOpen: boolean;
  proofModalTaskId: string | null;
  openProofModal: (taskId: string) => void;
  closeProofModal: () => void;

  isNewChatModalOpen: boolean;
  setIsNewChatModalOpen: (open: boolean) => void;
  isGroupInfoOpen: boolean;
  setIsGroupInfoOpen: (open: boolean) => void;
  isTasksInChatOpen: boolean;
  setIsTasksInChatOpen: (open: boolean) => void;

  // Navigation & Tabs
  activeMobileTab: ActiveTab;
  setActiveMobileTab: (tab: ActiveTab) => void;

  // Notifications
  notifications: AppNotification[];
  userNotifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;

  // Device View & Layout Mode
  deviceView: DeviceView;
  setDeviceView: (view: DeviceView) => void;

  // Helper actions
  navigateToMessage: (chatId: string, messageId: string) => void;
  navigateToTask: (taskId: string) => void;

  // Authentication & Session
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreContextType | null>(null);

// Fallback empty user while data is loading
const FALLBACK_EMPTY_USER: User = {
  id: '',
  name: 'User',
  designation: 'Staff',
  department: 'admin',
  avatar: 'US',
  avatarBg: 'bg-slate-700',
  status: 'online',
  email: '',
};

export const AppStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  // DMS Users & Connection state
  const [users, setUsers] = useState<User[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dmstask_persisted_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) return [parsed];
        } catch {}
      }
    }
    return [];
  });
  const [departments, setDepartments] = useState<DepartmentMeta[]>(() => dmsApi.getDepartments());
  const [currentUserId, setLocalCurrentUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dmstask_persisted_user_id') || '';
    }
    return '';
  });
  const [isLoadingDms, setIsLoadingDms] = useState<boolean>(true);
  const [isDmsConnected, setIsDmsConnected] = useState<boolean>(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(true);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(null);

  // Authentication & session state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('dms_token'));
    }
    return false;
  });

  // Active user resolver
  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || FALLBACK_EMPTY_USER;
  const getUserById = useCallback((userId: string) => users.find((u) => u.id === String(userId)), [users]);

  // Tasks state (Fetched from DMS)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;
  const getTaskById = useCallback((taskId: string) => tasks.find((t) => t.id === String(taskId)), [tasks]);

  // Chats state - Persistent from ERP-Task database + local storage cache
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('dmstask_persisted_chats');
      const cachedUid = localStorage.getItem('dmstask_persisted_user_id');
      if (cached && cachedUid === currentUserId) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [];
  });

  const [activeChatId, setActiveChatIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dmstask_persisted_active_chat_id') || null;
    }
    return null;
  });

  /**
   * Ref mirror for activeChatId:
   * Keeps the latest activeChatId value readily accessible inside long-lived
   * Socket.IO event listeners without needing to re-register listeners on every chat click.
   */
  const activeChatIdRef = useRef<string | null>(activeChatId);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const setActiveChatId = useCallback(
    (chatId: string | null) => {
      setActiveChatIdState((prevChatId) => {
        if (prevChatId && prevChatId !== chatId) {
          chatSocket.leaveConversation(prevChatId);
        }
        return chatId;
      });
      dmsApi.setActiveChatId(chatId);
      if (typeof window !== 'undefined') {
        if (chatId) {
          localStorage.setItem('dmstask_persisted_active_chat_id', chatId);
        } else {
          localStorage.removeItem('dmstask_persisted_active_chat_id');
        }
      }
      if (chatId) {
        chatSocket.joinConversation(chatId);

        // Fetch initial messages for active chat if empty
        setMessagesByChatId((currentMap) => {
          if (!currentMap[chatId] || currentMap[chatId].length === 0) {
            dmsApi.fetchMessages(chatId, 50, currentUserId).then(async (fetched) => {
              if (fetched && fetched.length > 0) {
                const decrypted = await e2eeCrypto.decryptMessages(fetched);
                setMessagesByChatId((prev) => ({
                  ...prev,
                  [chatId]: decrypted,
                }));
                setHasMoreOlderMessages((prev) => ({
                  ...prev,
                  [chatId]: fetched.length >= 50,
                }));
              }
            }).catch(() => {});
          }
          return currentMap;
        });

        if (currentUserId) {
          /**
           * Backend Read Confirmation:
           * Clear the unread count only after the backend successfully marks
           * the conversation as read, preventing optimistic drift if network fails.
           */
          dmsApi.markConversationRead(chatId, currentUserId)
            .then(() => {
              setChats((prev) =>
                prev.map((c) =>
                  c.id === chatId
                    ? {
                        ...c,
                        unreadCounts: {
                          ...(c.unreadCounts || {}),
                          [currentUserId]: 0,
                          [String(currentUserId)]: 0,
                        },
                      }
                    : c
                )
              );
            })
            .catch((err) => {
              console.warn('Backend markConversationRead warning:', err?.message);
            });
        }
      }
    },
    [currentUserId]
  );

  /**
   * Active Chat Resolver:
   * Returns null when no chat is explicitly selected.
   * NEVER fallback to `chats[0]` to ensure incoming messages do not automatically open chats.
   */
  const activeChat = activeChatId ? (chats.find((c) => c.id === activeChatId) || null) : null;

  // Messages state - Per-chat indexed store for fast retrieval and memory efficiency
  const [messagesByChatId, setMessagesByChatId] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('dmstask_persisted_messages_by_chat');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {}
      }
      // Migrate legacy flat messages array if present
      const legacy = localStorage.getItem('dmstask_persisted_messages');
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map: Record<string, ChatMessage[]> = {};
            for (const m of parsed) {
              if (!map[m.chatId]) map[m.chatId] = [];
              map[m.chatId].push(m);
            }
            return map;
          }
        } catch {}
      }
    }
    return {};
  });

  const [hasMoreOlderMessages, setHasMoreOlderMessages] = useState<Record<string, boolean>>({});
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState<boolean>(false);

  // Backward compatibility: chatMessages for currently active chat
  const chatMessages = useMemo(() => {
    return activeChatId ? (messagesByChatId[activeChatId] || []) : [];
  }, [activeChatId, messagesByChatId]);

  // Backward compatibility: flat messages array across all loaded chats
  const messages = useMemo(() => {
    return Object.values(messagesByChatId).flat();
  }, [messagesByChatId]);

  // Backward compatibility: setMessages adapter that preserves per-chat grouping
  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessagesByChatId((prevMap) => {
        const currentFlat = Object.values(prevMap).flat();
        const updatedList = typeof updater === 'function' ? updater(currentFlat) : updater;
        const newMap: Record<string, ChatMessage[]> = {};
        for (const m of updatedList) {
          if (!newMap[m.chatId]) newMap[m.chatId] = [];
          newMap[m.chatId].push(m);
        }
        return newMap;
      });
    },
    []
  );

  // Pagination: Load older message history for active conversation
  const loadOlderMessages = useCallback(
    async (chatId: string) => {
      if (!chatId || isLoadingOlderMessages) return;
      const currentList = messagesByChatId[chatId] || [];
      if (currentList.length === 0) return;

      const oldestMessage = currentList[0];
      const oldestTimestamp = oldestMessage?.timestamp;
      if (!oldestTimestamp) return;

      setIsLoadingOlderMessages(true);
      try {
        const older = await dmsApi.fetchMessages(chatId, 30, currentUserId, oldestTimestamp);
        if (!older || older.length === 0) {
          setHasMoreOlderMessages((prev) => ({ ...prev, [chatId]: false }));
        } else {
          const decrypted = await e2eeCrypto.decryptMessages(older);
          setMessagesByChatId((prev) => {
            const existing = prev[chatId] || [];
            const existingIds = new Set(existing.map((m) => m.id));
            const newUnique = decrypted.filter((m) => !existingIds.has(m.id));
            return {
              ...prev,
              [chatId]: [...newUnique, ...existing],
            };
          });
          if (older.length < 30) {
            setHasMoreOlderMessages((prev) => ({ ...prev, [chatId]: false }));
          }
        }
      } catch (err: any) {
        console.warn('Failed to load older messages:', err?.message);
      } finally {
        setIsLoadingOlderMessages(false);
      }
    },
    [messagesByChatId, isLoadingOlderMessages, currentUserId]
  );

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<QuotedMessage | null>(null);
  const [taskQuoteForComposer, setTaskQuoteForComposer] = useState<Task | null>(null);

  // Comprehensive tasks resolver for a chat conversation:
  // Resolves direct links, task cards/messages, department channel tasks, and participant involvement
  const getTasksForChat = useCallback(
    (chatId: string): Task[] => {
      const chat = chats.find((c) => c.id === chatId);
      if (!chat) return [];

      const msgs = messagesByChatId[chatId] || [];
      const mentionedTaskIds = new Set<string>();
      msgs.forEach((m) => {
        if (m.taskId) mentionedTaskIds.add(String(m.taskId));
        if (m.linkedTaskId) mentionedTaskIds.add(String(m.linkedTaskId));
      });

      return tasks.filter((t) => {
        const tid = String(t.id);

        // 1. Specifically linked task
        if (
          chat.linkedTaskId === tid ||
          chat.id === `task_chat_${tid}` ||
          t.sourceChatId === chat.id ||
          (t.rawTask?.source === 'chat' && String(t.rawTask?.source_id) === chat.id)
        ) {
          return true;
        }

        // 2. Referenced in chat messages (task cards, quotes, system links)
        if (mentionedTaskIds.has(tid)) {
          return true;
        }

        // 3. In a department channel, show tasks for that department
        if (chat.type === 'channel' && chat.department) {
          return chat.department.toLowerCase() === t.department?.toLowerCase();
        }

        // 4. In a direct chat, show tasks shared between participants
        if (chat.type === 'direct') {
          const pids = chat.participantIds?.map(String) || [];
          const isAssigneeInChat = t.assigneeIds?.some((uid) => pids.includes(String(uid)));
          const isCreatorInChat = pids.includes(String(t.creatorId));
          return isAssigneeInChat || isCreatorInChat;
        }

        // 5. In a group chat, show tasks for this group's department or involving participants
        if (chat.type === 'group') {
          if (chat.department && t.department && chat.department.toLowerCase() === t.department.toLowerCase()) {
            return true;
          }
          const pids = chat.participantIds?.map(String) || [];
          const isAssigneeInChat = t.assigneeIds?.some((uid) => pids.includes(String(uid)));
          const isCreatorInChat = pids.includes(String(t.creatorId));
          return isAssigneeInChat || isCreatorInChat;
        }

        return false;
      });
    },
    [chats, messagesByChatId, tasks]
  );

  // Typing simulator state
  const [typingStatus, setTypingStatus] = useState<Record<string, string>>({});

  const sendTypingIndicator = useCallback(
    (chatId: string, isTyping: boolean) => {
      chatSocket.sendTyping(chatId, isTyping, currentUserId);
    },
    [currentUserId]
  );

  // Modals state
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [taskModalInitialData, setTaskModalInitialData] = useState<Partial<Task> | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofModalTaskId, setProofModalTaskId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isTasksInChatOpen, setIsTasksInChatOpen] = useState(false);

  // Navigation & View Mode
  const [activeMobileTab, setActiveMobileTab] = useState<ActiveTab>('chats');
  const [deviceView, setDeviceView] = useState<DeviceView>('responsive');

  // Notifications - persistent
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('dmstask_persisted_notifications');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
    }
    return [];
  });

  // Local storage synchronization effects for persistent offline-first cache
  useEffect(() => {
    if (typeof window !== 'undefined' && chats.length > 0) {
      localStorage.setItem('dmstask_persisted_chats', JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(messagesByChatId).length > 0) {
      localStorage.setItem('dmstask_persisted_messages_by_chat', JSON.stringify(messagesByChatId));
    }
  }, [messagesByChatId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dmstask_persisted_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dmstask_persisted_user_id', currentUserId);
    }
  }, [currentUserId]);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);


  // Notifications filtered for current user
  const userNotifications = notifications.filter((n) => n.recipientId === currentUserId);
  const unreadNotificationCount = userNotifications.filter((n) => !n.read).length;

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    dmsApi.markNotificationRead(id).catch(() => {});
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === currentUserId ? { ...n, read: true } : n))
    );
    dmsApi.markAllNotificationsRead(currentUserId).catch(() => {});
    addToast('All notifications marked as read', 'info');
  }, [currentUserId, addToast]);

  // ========================================================
  // ERP-TASK & DMS SYNCHRONIZATION: USERS, TASKS, CHATS, MESSAGES, NOTIFICATIONS
  // ========================================================
  const refreshDmsData = useCallback(async () => {
    try {
      setIsLoadingDms(true);

      // Check if user has an active session token
      const currentToken = dmsApi.getToken();
      if (!currentToken) {
        setIsDmsConnected(false);
        setIsLoadingDms(false);
        setIsAuthenticated(false);
        return;
      }

      // Ensure authenticated with DMS
      await dmsApi.ensureAuthenticated();
      setIsAuthenticated(true);

      // Ensure active user E2EE identity key is ready BEFORE decrypting messages
      if (currentUserId && e2eeCrypto.isSupported()) {
        try {
          await e2eeCrypto.initUser(currentUserId);
        } catch (e2eErr) {
          console.warn('E2EE init warning:', e2eErr);
        }
      }

      // Fetch Departments, Users, Tasks, Conversations, Active Chat Messages, and Notifications concurrently from ERP-Task backend
      const [fetchedDepts, fetchedUsers, fetchedTasks, fetchedConversations, fetchedMessages, fetchedNotifications] = await Promise.all([
        dmsApi.fetchDepartments().catch(() => []),
        dmsApi.fetchUsers(),
        dmsApi.fetchTasks(),
        dmsApi.fetchConversations(currentUserId),
        activeChatId ? dmsApi.fetchMessages(activeChatId, 50, currentUserId).catch(() => []) : Promise.resolve([]),
        dmsApi.fetchNotifications(currentUserId),
      ]);

      if (fetchedDepts && fetchedDepts.length > 0) {
        setDepartments(fetchedDepts);
      }

      if (fetchedUsers.length > 0) {
        setUsers(fetchedUsers);
        // Ensure currentUserId points to the actual logged-in user if email is matched
        if (dmsApi.currentEmail) {
          const matched = fetchedUsers.find(
            (u) => u.email.toLowerCase() === dmsApi.currentEmail?.toLowerCase()
          );
          if (matched && matched.id !== currentUserId) {
            setLocalCurrentUserId(matched.id);
            if (typeof window !== 'undefined') {
              localStorage.setItem('dmstask_persisted_user_id', matched.id);
            }
          }
        }
      }

      if (fetchedTasks) {
        setTasks(fetchedTasks);
      }

      if (fetchedConversations && fetchedConversations.length > 0) {
        const uid = String(currentUserId);
        const authorizedConvs = fetchedConversations.filter((c) => {
          if (c.type === 'direct') {
            return c.participantIds?.map(String).includes(uid);
          }
          if (c.type === 'group') {
            return c.participantIds?.map(String).includes(uid) || c.adminIds?.map(String).includes(uid);
          }
          if (c.type === 'channel' || c.type === 'announcement') {
            if (!c.participantIds || c.participantIds.length === 0) return true;
            return c.participantIds.map(String).includes(uid);
          }
          return c.participantIds?.map(String).includes(uid);
        });

        setChats(authorizedConvs);

        /**
         * Preserve Active Conversation:
         * Keep the user's currently selected chat if it is still valid.
         * If no chat was previously selected (null), KEEP IT NULL.
         * Never auto-select or auto-open `authorizedConvs[0]`.
         */
        setActiveChatIdState((prev) => {
          if (prev && authorizedConvs.some((c) => c.id === prev)) {
            return prev;
          }
          return null;
        });
      } else {
        setChats([]);
        setActiveChatIdState(null);
      }

      if (fetchedMessages && fetchedMessages.length > 0 && activeChatId) {
        if (currentUserId) {
          const hasUndelivered = fetchedMessages.some(
            (m) => String(m.senderId) !== String(currentUserId) && (!m.deliveredTo || !m.deliveredTo[currentUserId])
          );
          if (hasUndelivered) {
            dmsApi.markConversationDelivered(activeChatId, currentUserId).catch(() => {});
          }
        }

        const decryptedMessages = e2eeCrypto.isSupported()
          ? await e2eeCrypto.decryptMessages(fetchedMessages)
          : fetchedMessages;
        setMessagesByChatId((prev) => ({
          ...prev,
          [activeChatId]: decryptedMessages,
        }));
        setHasMoreOlderMessages((prev) => ({
          ...prev,
          [activeChatId]: fetchedMessages.length >= 50,
        }));
      }

      if (fetchedNotifications && fetchedNotifications.length > 0) {
        setNotifications(fetchedNotifications);
      }

      setIsDmsConnected(true);
    } catch (err: any) {
      console.warn('DMS API sync warning:', err?.message);
      setIsDmsConnected(false);
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
      }
      if (
        !err?.message?.includes('permissions') &&
        !err?.message?.includes('Forbidden') &&
        !err?.message?.includes('crypto') &&
        !err?.message?.includes('Cryptography')
      ) {
        addToast(`System Notice: ${err?.message || 'Connecting to backend...'}`, 'warning');
      }
    } finally {
      setIsLoadingDms(false);
    }
  }, [currentUserId, addToast]);

  // Dynamic Real-Time Live Sync with ERP-Task & DMS without page refresh/reload
  useEffect(() => {
    // Initialize E2EE identity keypair for active user
    if (currentUserId && e2eeCrypto.isSupported()) {
      e2eeCrypto.initUser(currentUserId).catch((err) => {
        console.warn('Failed to initialize E2EE identity for user:', err);
      });
    }

    // Initial fetch on mount
    refreshDmsData();

    // Inform dmsApi of active user and chat
    dmsApi.setCurrentUserId(currentUserId);
    if (activeChatId) {
      dmsApi.setActiveChatId(activeChatId);
    }

    // Subscribe to real-time delta updates from dmsApi
    const unsubscribe = dmsApi.startLiveSync((delta) => {
      setIsDmsConnected(true);
      setIsLiveSyncing(true);
      setLastSyncTimestamp(delta.timestamp);

      // 1. Dynamic Users & Directory update
      if (delta.changed.users && delta.users && delta.users.length > 0) {
        setUsers(delta.users);
      }

      // 2. Dynamic Tasks & Kanban Board update (status, comments, checklists)
      if (delta.changed.tasks && delta.tasks) {
        setTasks(delta.tasks);
      }

      // 3. Dynamic Conversations & Channels update
      if (delta.changed.conversations && delta.conversations) {
        const uid = String(currentUserId);
        const authorizedDelta = delta.conversations.filter((c) => {
          if (c.type === 'direct') {
            return c.participantIds?.map(String).includes(uid);
          }
          if (c.type === 'group') {
            return c.participantIds?.map(String).includes(uid) || c.adminIds?.map(String).includes(uid);
          }
          if (c.type === 'channel' || c.type === 'announcement') {
            if (!c.participantIds || c.participantIds.length === 0) return true;
            return c.participantIds.map(String).includes(uid);
          }
          return c.participantIds?.map(String).includes(uid);
        });
        setChats(authorizedDelta);
      }

      // 4. Dynamic Messages update (Real-time live messaging without reload)
      if (delta.changed.messages && delta.messages) {
        // If incoming messages from other participants arrived, mark delivered
        if (currentUserId) {
          const undeliveredChatIds = new Set<string>();
          for (const m of delta.messages) {
            if (
              String(m.senderId) !== String(currentUserId) &&
              (!m.deliveredTo || !m.deliveredTo[currentUserId])
            ) {
              undeliveredChatIds.add(m.chatId);
            }
          }
          undeliveredChatIds.forEach((cid) => {
            dmsApi.markConversationDelivered(cid, currentUserId).catch(() => {});
          });
        }

        // If the user is currently viewing the conversation, mark incoming messages as read
        const currentActiveChat = activeChatIdRef.current;
        if (currentActiveChat && currentUserId) {
          const hasUnreadIncoming = delta.messages.some(
            (m) =>
              m.chatId === currentActiveChat &&
              String(m.senderId) !== String(currentUserId) &&
              (!m.readBy || !m.readBy[currentUserId])
          );
          if (hasUnreadIncoming) {
            dmsApi.markConversationRead(currentActiveChat, currentUserId).catch(() => {});
          }
        }

        const decryptPromise = e2eeCrypto.isSupported()
          ? e2eeCrypto.decryptMessages(delta.messages)
          : Promise.resolve(delta.messages);
        decryptPromise.then((decryptedDelta) => {
          setMessagesByChatId((prev) => {
            const next = { ...prev };
            for (const dm of decryptedDelta) {
              const list = next[dm.chatId] ? [...next[dm.chatId]] : [];
              const idx = list.findIndex((m) => m.id === dm.id);
              if (idx >= 0) {
                list[idx] = dm;
              } else {
                list.push(dm);
              }
              next[dm.chatId] = list;
            }
            return next;
          });
        }).catch((err) => {
          console.warn('Delta message decryption error:', err);
        });
      }

      // 5. Dynamic Notifications update (Bell counter & alerts)
      if (delta.changed.notifications && delta.notifications) {
        setNotifications(delta.notifications);
      }
    }, 30000);

    return () => {
      unsubscribe();
    };
  }, [refreshDmsData, currentUserId]);

  // Synchronize socket conversation room membership with activeChatId
  useEffect(() => {
    if (activeChatId) {
      chatSocket.joinConversation(activeChatId);
    }
  }, [activeChatId]);

  // Real-Time WebSocket Communication (Instant Messages, Delivery/Read Receipts, Typing, Online Presence)
  useEffect(() => {
    if (!isAuthenticated || !currentUserId) return;

    chatSocket.connect(dmsApi.getToken(), currentUserId);

    if (activeChatIdRef.current) {
      chatSocket.joinConversation(activeChatIdRef.current);
    }

    const unsubs: Array<() => void> = [];

    // 1. New Message received in real-time via Socket.IO
    unsubs.push(
      chatSocket.on('new_message', async (rawMsg: any) => {
        if (!rawMsg || !rawMsg.chatId) return;
        const msgChatId = rawMsg.chatId;

        // Decrypt incoming message
        const [decryptedMsg] = await e2eeCrypto.decryptMessages([rawMsg]);
        if (!decryptedMsg) return;

        // Append to messagesByChatId
        setMessagesByChatId((prev) => {
          const list = prev[msgChatId] || [];
          if (list.some((m) => m.id === decryptedMsg.id)) {
            return prev;
          }
          return {
            ...prev,
            [msgChatId]: [...list, decryptedMsg],
          };
        });

        const isOtherSender = String(decryptedMsg.senderId) !== String(currentUserId);
        const isCurrentChat = activeChatIdRef.current === msgChatId;

        /**
         * Real-time Conversation Preview & Unread Count Update:
         * 1. Do NOT auto-open the chat or change activeChatIdState; the user remains on their current screen.
         * 2. If the user is currently viewing this chat, unread count remains 0.
         * 3. If the user has a different conversation open (or Chat List), increment unread count for currentUserId.
         * 4. Messages sent by the current user never increment their own unread count.
         * 5. If this is the first message received for this conversation, immediately add it to the recipient's Chat List.
         */
        setChats((prev) => {
          const exists = prev.some((c) => c.id === msgChatId);
          if (!exists) {
            // New conversation dynamically arriving for recipient in real-time
            const newChatFromMessage: Chat = {
              id: msgChatId,
              name: rawMsg.conversationName || `Chat`,
              type: rawMsg.conversationType || (rawMsg.participantIds?.length > 2 ? 'group' : 'direct'),
              avatarBg: 'bg-indigo-600',
              participantIds: rawMsg.participantIds || [String(currentUserId), String(decryptedMsg.senderId)],
              adminIds: [String(decryptedMsg.senderId)],
              unreadCounts: {
                [currentUserId]: isOtherSender && !isCurrentChat ? 1 : 0,
                [String(currentUserId)]: isOtherSender && !isCurrentChat ? 1 : 0,
              },
              isDraft: false,
              lastMessage: {
                text: decryptedMsg.text || (decryptedMsg.voiceDuration ? 'Voice message' : 'Shared an attachment'),
                timestamp: decryptedMsg.timestamp,
                senderId: decryptedMsg.senderId,
                type: decryptedMsg.type,
                status: decryptedMsg.status,
              },
            };
            return [newChatFromMessage, ...prev];
          }

          return prev.map((c) => {
            if (c.id === msgChatId) {
              const currentUnread = c.unreadCounts || {};
              const prevCount = Number(
                currentUnread[currentUserId] ??
                currentUnread[String(currentUserId)] ??
                0
              );
              const nextCount = isOtherSender && !isCurrentChat ? prevCount + 1 : 0;
              const newUnread = {
                ...currentUnread,
                [currentUserId]: nextCount,
                [String(currentUserId)]: nextCount,
              };
              return {
                ...c,
                isDraft: false,
                lastMessage: {
                  text: decryptedMsg.text || (decryptedMsg.voiceDuration ? 'Voice message' : 'Shared an attachment'),
                  timestamp: decryptedMsg.timestamp,
                  senderId: decryptedMsg.senderId,
                  type: decryptedMsg.type,
                  status: decryptedMsg.status,
                },
                unreadCounts: newUnread,
              };
            }
            return c;
          });
        });

        // Auto receipts
        if (isOtherSender) {
          if (activeChatIdRef.current === msgChatId) {
            dmsApi.markConversationRead(msgChatId, currentUserId).catch(() => {});
          } else {
            dmsApi.markConversationDelivered(msgChatId, currentUserId).catch(() => {});
          }
        }
      })
    );

    // 2. Receipt Updates (delivered / read)
    unsubs.push(
      chatSocket.on('receipt_update', (payload: any) => {
        if (!payload) return;
        const { messageId, status, userId, timestamp } = payload;

        setMessagesByChatId((prev) => {
          let hasChange = false;
          const nextMap = { ...prev };
          for (const cid of Object.keys(nextMap)) {
            const list = nextMap[cid];
            let listChanged = false;
            const updatedList = list.map((m) => {
              if (messageId && m.id !== messageId) return m;
              if (status === 'read') {
                const readBy = { ...(m.readBy || {}), [userId]: timestamp };
                const deliveredTo = { ...(m.deliveredTo || {}), [userId]: timestamp };
                listChanged = true;
                return { ...m, status: 'read', deliveryStatus: 'read', readBy, deliveredTo };
              } else if (status === 'delivered') {
                const deliveredTo = { ...(m.deliveredTo || {}), [userId]: timestamp };
                listChanged = true;
                return { ...m, status: m.status === 'read' ? 'read' : 'delivered', deliveryStatus: 'delivered', deliveredTo };
              }
              return m;
            });
            if (listChanged) {
              nextMap[cid] = updatedList;
              hasChange = true;
            }
          }
          return hasChange ? nextMap : prev;
        });

        // Update chats last message status
        setChats((prev) =>
          prev.map((c) => {
            if (c.lastMessage && (status === 'read' || status === 'delivered')) {
              return {
                ...c,
                lastMessage: {
                  ...c.lastMessage,
                  status,
                },
              };
            }
            return c;
          })
        );
      })
    );

    // 3. Authoritative Unread Count Updates from Socket.IO (multi-session & multi-device sync)
    unsubs.push(
      chatSocket.on('unread_count_updated', (payload: any) => {
        if (!payload?.conversationId) return;
        const targetChatId = payload.conversationId;
        const targetUserId = String(payload.userId || currentUserId);
        const count = Number(payload.unreadCount ?? 0);

        setChats((prev) =>
          prev.map((c) => {
            if (c.id === targetChatId) {
              const isCurrentChat = activeChatIdRef.current === targetChatId;
              // If the user has this chat actively open on this screen, keep unread at 0
              const effectiveCount = isCurrentChat ? 0 : count;
              return {
                ...c,
                unreadCounts: {
                  ...(c.unreadCounts || {}),
                  ...(payload.unreadCounts || {}),
                  [targetUserId]: effectiveCount,
                  [String(targetUserId)]: effectiveCount,
                },
              };
            }
            return c;
          })
        );
      })
    );

    unsubs.push(
      chatSocket.on('conversation_updated', (payload: any) => {
        if (!payload?.conversationId) return;
        setChats((prev) =>
          prev.map((c) => {
            if (c.id === payload.conversationId) {
              const isCurrentChat = activeChatIdRef.current === payload.conversationId;
              let updatedUnread = c.unreadCounts || {};
              if (payload.unreadCounts) {
                updatedUnread = { ...updatedUnread, ...payload.unreadCounts };
                if (isCurrentChat && currentUserId) {
                  updatedUnread[currentUserId] = 0;
                  updatedUnread[String(currentUserId)] = 0;
                }
              }
              return {
                ...c,
                lastMessage: payload.lastMessage || c.lastMessage,
                unreadCounts: updatedUnread,
              };
            }
            return c;
          })
        );
      })
    );

    unsubs.push(
      chatSocket.on('conversation_saved', (conv: any) => {
        if (!conv?.id) return;

        // Direct and group conversations must have at least 1 message before appearing in Chat List
        const isChannelOrTask = conv.type === 'channel' || conv.type === 'announcement' || Boolean(conv.linkedTaskId);
        const hasMessages = Boolean(conv.lastMessage && (conv.lastMessage.text || conv.lastMessage.type));
        if (!isChannelOrTask && !hasMessages) return;

        // Current user must be a participant
        const uid = String(currentUserId);
        const isParticipant =
          !conv.participantIds ||
          conv.participantIds.length === 0 ||
          conv.participantIds.map(String).includes(uid);
        if (!isParticipant) return;

        setChats((prev) => {
          const exists = prev.some((c) => c.id === conv.id);
          if (exists) {
            return prev.map((c) =>
              c.id === conv.id
                ? {
                    ...c,
                    ...conv,
                    isDraft: false,
                    lastMessage: conv.lastMessage || c.lastMessage,
                    unreadCounts: conv.unreadCounts || c.unreadCounts,
                  }
                : c
            );
          }
          return [{ ...conv, isDraft: false }, ...prev];
        });
      })
    );

    // 4. Typing Indicator
    unsubs.push(
      chatSocket.on('typing_indicator', (payload: any) => {
        if (!payload?.conversationId || !payload?.userId) return;
        if (String(payload.userId) === String(currentUserId)) return;

        const typingUser = users.find((u) => String(u.id) === String(payload.userId));
        const displayName = typingUser?.name || 'Someone';

        if (payload.isTyping) {
          setTypingStatus((prev) => ({
            ...prev,
            [payload.conversationId]: displayName,
          }));
          setTimeout(() => {
            setTypingStatus((prev) => {
              const next = { ...prev };
              delete next[payload.conversationId];
              return next;
            });
          }, 3500);
        } else {
          setTypingStatus((prev) => {
            const next = { ...prev };
            delete next[payload.conversationId];
            return next;
          });
        }
      })
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [isAuthenticated, currentUserId, users]);

  /**
   * Dynamic Read Synchronizer:
   * Marks a conversation as read ONLY when the user explicitly clicks/opens or switches to it.
   * Unread count is reset to 0 only after backend confirms the read operation.
   */
  useEffect(() => {
    if (activeChatId && currentUserId) {
      dmsApi.markConversationRead(activeChatId, currentUserId)
        .then(() => {
          setChats((prev) =>
            prev.map((c) =>
              c.id === activeChatId
                ? {
                    ...c,
                    unreadCounts: {
                      ...(c.unreadCounts || {}),
                      [currentUserId]: 0,
                      [String(currentUserId)]: 0,
                    },
                  }
                : c
            )
          );
        })
        .catch(() => {});
    }
  }, [activeChatId, currentUserId]);

  // Dynamic Auto-Decryption: Ensure active conversation messages are decrypted when switching chats or personas
  useEffect(() => {
    if (!activeChatId || messages.length === 0) return;
    const undecryptedInActiveChat = messages.some(
      (m) =>
        m.chatId === activeChatId &&
        ((m.text && m.text.startsWith('e2ee:v1:')) || (m.rawCiphertext && !m.isDecrypted))
    );
    if (undecryptedInActiveChat) {
      e2eeCrypto.decryptMessages(messages).then((decrypted) => {
        setMessages(decrypted);
      }).catch((err) => {
        console.warn('Auto-decryption notice:', err?.message);
      });
    }
  }, [activeChatId, currentUserId, messages.length]);

  // Explicit Login action
  const login = useCallback(
    async (email: string, password?: string): Promise<boolean> => {
      try {
        setIsLoadingDms(true);
        const { token, user: loggedUser } = await dmsApi.login(email, password);
        setIsAuthenticated(true);
        const uid = String(loggedUser.id || '5');
        setLocalCurrentUserId(uid);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dmstask_persisted_user_id', uid);
          localStorage.setItem('dmstask_is_authenticated', 'true');
        }
        e2eeCrypto.clearSession();
        if (e2eeCrypto.isSupported()) {
          try {
            await e2eeCrypto.initUser(uid, email, password);
          } catch (e2eErr) {
            console.warn('E2EE init warning:', e2eErr);
          }
        }
        await refreshDmsData();
        addToast(`Welcome back, ${loggedUser.name || 'User'}!`, 'success');
        return true;
      } catch (err: any) {
        if (!err?.message?.includes('crypto') && !err?.message?.includes('Cryptography')) {
          addToast(err?.message || 'Login failed. Please check your credentials.', 'warning');
        }
        throw err;
      } finally {
        setIsLoadingDms(false);
      }
    },
    [refreshDmsData, addToast]
  );

  // Explicit Logout action
  const logout = useCallback(async () => {
    try {
      e2eeCrypto.clearSession();
      await dmsApi.logout();
    } finally {
      setIsAuthenticated(false);
      setLocalCurrentUserId('');
      setMessages([]);
      setChats([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dmstask_persisted_user_id');
        localStorage.removeItem('dmstask_persisted_messages');
        localStorage.removeItem('dmstask_persisted_chats');
        localStorage.removeItem('dmstask_is_authenticated');
      }
      addToast('Signed out of account.', 'info');
    }
  }, [addToast]);

  // Switch persona & authenticate as selected DMS user
  const setCurrentUserId = useCallback(
    async (userId: string) => {
      const uid = String(userId);
      setLocalCurrentUserId(uid);
      dmsApi.setCurrentUserId(uid);

      if (typeof window !== 'undefined') {
        localStorage.setItem('dmstask_persisted_user_id', uid);
      }

      const targetUser = users.find((u) => String(u.id) === uid);
      if (targetUser?.email) {
        dmsApi.currentEmail = targetUser.email;
        if (typeof window !== 'undefined') {
          localStorage.setItem('dms_user_email', targetUser.email);
        }
      }

      // Reset previous in-memory session and initialize target persona's E2EE keys
      e2eeCrypto.clearSession();
      setChats([]);
      setMessages([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dmstask_persisted_chats');
        localStorage.removeItem('dmstask_persisted_messages');
        localStorage.removeItem('dmstask_persisted_active_chat_id');
      }
      setActiveChatIdState(null);
      await e2eeCrypto.initUser(uid, targetUser?.email);

      // Re-fetch all data and re-decrypt conversations and messages for this persona
      await refreshDmsData();

      const displayName = targetUser?.name || targetUser?.email?.split('@')[0] || `User #${uid}`;
      addToast(`Active persona: ${displayName}`, 'info');
    },
    [users, refreshDmsData, addToast]
  );

  const fetchDepartments = useCallback(async () => {
    const depts = await dmsApi.fetchDepartments();
    setDepartments(depts);
    return depts;
  }, []);

  // Task Drawer open/close
  const openTaskDrawer = useCallback((taskId: string) => {
    setActiveTaskId(String(taskId));
    setIsTaskDrawerOpen(true);
  }, []);

  const closeTaskDrawer = useCallback(() => {
    setIsTaskDrawerOpen(false);
  }, []);

  const openCreateTaskModal = useCallback((initialData?: Partial<Task>) => {
    setTaskModalInitialData(initialData || null);
    setIsCreateTaskModalOpen(true);
  }, []);

  const closeCreateTaskModal = useCallback(() => {
    setIsCreateTaskModalOpen(false);
    setTaskModalInitialData(null);
  }, []);

  const openProofModal = useCallback((taskId: string) => {
    setProofModalTaskId(String(taskId));
    setIsProofModalOpen(true);
  }, []);

  const closeProofModal = useCallback(() => {
    setIsProofModalOpen(false);
    setProofModalTaskId(null);
  }, []);

  // Send message action (normal user messaging without automated replies)
  const sendMessage = useCallback(
    (
      chatId: string,
      text: string,
      options?: {
        replyTo?: QuotedMessage;
        attachment?: TaskAttachment;
        voiceDuration?: number;
        taskId?: string;
      }
    ) => {
      const now = new Date().toISOString();
      const newMsgId = 'msg_' + Date.now();
      let type: ChatMessage['type'] = 'text';

      if (options?.taskId) {
        type = 'task_card';
      } else if (options?.voiceDuration) {
        type = 'voice';
      } else if (options?.attachment) {
        type = options.attachment.type === 'image' ? 'image' : 'document';
      }

      // Check for mentions like @Raza or @Admin
      const mentionedUserIds: string[] = [];
      users.forEach((u) => {
        if (text.includes(`@${u.name}`) || text.includes(`@${u.name.split(' ')[0]}`)) {
          mentionedUserIds.push(u.id);
        }
      });

      // Find target chat participants for E2EE key distribution
      const targetChat = chats.find((c) => c.id === chatId);
      const isDraftChat = Boolean(targetChat?.isDraft || (!targetChat?.lastMessage && targetChat?.type !== 'channel'));
      const participantIds = targetChat?.participantIds && targetChat.participantIds.length > 0
        ? targetChat.participantIds
        : [currentUser.id];

      const newMsg: ChatMessage = {
        id: newMsgId,
        chatId,
        senderId: currentUser.id,
        text,
        type,
        timestamp: now,
        status: 'sent',
        replyTo: options?.replyTo,
        attachment: options?.attachment,
        voiceDuration: options?.voiceDuration,
        taskId: options?.taskId ? String(options.taskId) : undefined,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        isEncrypted: true,
        isDecrypted: true,
      };

      // Optimistic state update (Sender sees cleartext immediately with 1 grey tick)
      setMessagesByChatId((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []).filter((m) => m.id !== newMsgId), newMsg],
      }));

      // Update chat's lastMessage and transition from draft to active visible conversation
      const lastMsgSummary = {
        text: text || (options?.voiceDuration ? 'Voice message' : 'Shared an attachment'),
        timestamp: now,
        senderId: currentUser.id,
        type,
        status: 'sent' as const,
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                isDraft: false,
                lastMessage: lastMsgSummary,
              }
            : c
        )
      );

      // If this conversation was a local draft, persist the activated conversation to the backend
      if (isDraftChat && targetChat) {
        const activatedChat: Chat = {
          ...targetChat,
          isDraft: false,
          lastMessage: lastMsgSummary,
        };
        dmsApi.saveConversation(activatedChat).catch((err) => {
          console.warn('Failed to persist newly activated conversation to backend:', err?.message);
        });
      }

      // Create mention notifications
      mentionedUserIds.forEach((mentionedId) => {
        if (mentionedId !== currentUser.id) {
          const notif: AppNotification = {
            id: 'notif_' + Date.now() + Math.random(),
            recipientId: mentionedId,
            senderId: currentUser.id,
            type: 'mention',
            title: `${currentUser.name} mentioned you`,
            body: text,
            timestamp: now,
            read: false,
            chatId,
            messageId: newMsgId,
          };
          setNotifications((prev) => [notif, ...prev]);
          dmsApi.createNotification(notif).catch(() => {});
        }
      });

      // Clear composer quotes
      setReplyMessage(null);
      setTaskQuoteForComposer(null);

      // Client-Side End-to-End Encryption:
      // Encrypts payload with AES-GCM 256 and wraps the symmetric key with authorized recipients' RSA keys.
      // Database and server administrators only receive and store AES ciphertext (e2ee:v1:...).
      e2eeCrypto
        .encryptMessage(chatId, participantIds, {
          text,
          attachment: options?.attachment,
          voiceDuration: options?.voiceDuration,
          taskId: options?.taskId ? String(options.taskId) : undefined,
          replyTo: options?.replyTo,
        })
        .then((encResult) => {
          setMessagesByChatId((prev) => ({
            ...prev,
            [chatId]: (prev[chatId] || []).map((m) =>
              m.id === newMsgId
                ? { ...m, rawCiphertext: encResult.ciphertext, keyVersion: encResult.keyVersion }
                : m
            ),
          }));
          const wireMessage: any = {
            id: newMsgId,
            chatId,
            senderId: currentUser.id,
            text: encResult.ciphertext,
            type,
            timestamp: now,
            status: 'sent',
            isEncrypted: encResult.isEncrypted,
            keyVersion: encResult.keyVersion,
            mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
            taskId: options?.taskId ? String(options.taskId) : undefined,
            participantIds,
            conversationName: targetChat?.name || 'Chat',
            conversationType: targetChat?.type || 'direct',
          };
          return dmsApi.sendChatMessage(wireMessage).then((savedMsg) => {
            if (savedMsg) {
              setMessagesByChatId((prev) => ({
                ...prev,
                [chatId]: (prev[chatId] || []).map((m) =>
                  m.id === newMsgId
                    ? {
                        ...m,
                        id: savedMsg.id || m.id,
                        status: savedMsg.status || 'sent',
                        readAt: savedMsg.readAt,
                        readBy: savedMsg.readBy,
                        deliveredTo: savedMsg.deliveredTo,
                      }
                    : m
                ),
              }));
            }
          });
        })
        .catch((err) => {
          console.error('Failed to encrypt or persist message to ERP-Task database:', err?.message);
          dmsApi.sendChatMessage(newMsg).catch(() => {
            // If message sending fails, revert draft conversation status so it does not stay visible as an active chat
            if (isDraftChat) {
              setChats((prev) =>
                prev.map((c) => (c.id === chatId ? { ...c, isDraft: true, lastMessage: undefined } : c))
              );
            }
            addToast('Failed to send message. Please try again.', 'error');
          });
        });

      // If this conversation is associated with a specific DMS task, synchronize message as a task comment in DMS
      const linkedTaskId = options?.taskId || targetChat?.linkedTaskId;
      if (linkedTaskId && (type === 'text' || type === 'task_card')) {
        dmsApi
          .addTaskComment(linkedTaskId, `[Chat by ${currentUser.name}]: ${text}`)
          .catch((err) => {
            console.warn('Failed to sync chat message to DMS task comments:', err?.message);
          });
      }
    },
    [currentUser, users, chats]
  );

  // React to message
  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== messageId) return msg;

          const currentReactions = msg.reactions || [];
          const existingReaction = currentReactions.find((r) => r.emoji === emoji);

          let updatedReactions;
          if (existingReaction) {
            if (existingReaction.userIds.includes(currentUser.id)) {
              const newUserIds = existingReaction.userIds.filter((id) => id !== currentUser.id);
              if (newUserIds.length === 0) {
                updatedReactions = currentReactions.filter((r) => r.emoji !== emoji);
              } else {
                updatedReactions = currentReactions.map((r) =>
                  r.emoji === emoji ? { ...r, userIds: newUserIds } : r
                );
              }
            } else {
              updatedReactions = currentReactions.map((r) =>
                r.emoji === emoji ? { ...r, userIds: [...r.userIds, currentUser.id] } : r
              );
            }
          } else {
            updatedReactions = [...currentReactions, { emoji, userIds: [currentUser.id] }];
          }

          return { ...msg, reactions: updatedReactions };
        })
      );

      // Persist reaction to ERP-Task backend
      dmsApi.reactToChatMessage(messageId, emoji, currentUser.id).catch((err) => {
        console.error('Failed to persist reaction to DMS backend:', err?.message);
      });
    },
    [currentUser.id]
  );

  // ========================================================
  // DMS TASK INTEGRATION: CREATE TASK IN DMS API
  // ========================================================
  const createTask = useCallback(
    async (data: {
      title: string;
      description: string;
      department: Department | string;
      priority: TaskPriority | string;
      dueDate: string;
      startDate?: string;
      assigneeIds: string[];
      checklistTitles: string[];
      requiresApproval: boolean;
      proofRequired: boolean;
      sourceChatId?: string;
      sourceMessageId?: string;
      attachments?: TaskAttachment[];
      taskType?: string;
      workflowType?: string;
      projectName?: string;
      recurrenceRule?: string;
      recurrenceNextDate?: string;
      recurrenceEndType?: string;
      recurrenceEndDate?: string;
      recurrenceEndOccurrences?: number;
      approvalRequiredUserIds?: number[];
      movChecklist?: Array<{ text: string; checked?: boolean; checked_by_id?: number | null; checked_at?: string | null }>;
      movAssignments?: Array<{ mov_index: number; user_id: number | null }>;
      assignedUsersMeta?: Array<{ user_id: number; department: string }>;
    }): Promise<Task> => {
      const now = new Date().toISOString();

      try {
        // Create in DMS backend via API
        const createdDmsTask = await dmsApi.createTask({
          title: data.title,
          description: data.description,
          department: data.department,
          priority: data.priority,
          startDate: data.startDate,
          dueDate: data.dueDate,
          assigneeIds: data.assigneeIds.length > 0 ? data.assigneeIds : [currentUser.id],
          requiresApproval: data.requiresApproval,
          checklistTitles: data.checklistTitles,
          taskType: data.taskType,
          workflowType: data.workflowType,
          projectName: data.projectName,
          recurrenceRule: data.recurrenceRule,
          recurrenceNextDate: data.recurrenceNextDate,
          recurrenceEndType: data.recurrenceEndType,
          recurrenceEndDate: data.recurrenceEndDate,
          recurrenceEndOccurrences: data.recurrenceEndOccurrences,
          approvalRequiredUserIds: data.approvalRequiredUserIds,
          movChecklist: data.movChecklist,
          movAssignments: data.movAssignments,
          assignedUsersMeta: data.assignedUsersMeta,
        });

        // Attach local client metadata (sourceChatId, sourceMessageId)
        const newTask: Task = {
          ...createdDmsTask,
          sourceChatId: data.sourceChatId,
          sourceMessageId: data.sourceMessageId,
          attachments: data.attachments || createdDmsTask.attachments || [],
        };

        setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)]);

        // If created from chat, post task card & link message
        if (data.sourceChatId) {
          if (data.sourceMessageId) {
            setMessages((prev) =>
              prev.map((m) => (m.id === data.sourceMessageId ? { ...m, linkedTaskId: newTask.id } : m))
            );
          }

          const cardMsg: ChatMessage = {
            id: 'msg_card_' + Date.now(),
            chatId: data.sourceChatId,
            senderId: 'system',
            text: `${currentUser.name} created ${newTask.code}: ${newTask.title}`,
            type: 'task_card',
            timestamp: now,
            status: 'read',
            taskId: newTask.id,
          };

          const sysMsg: ChatMessage = {
            id: 'msg_sys_' + (Date.now() + 1),
            chatId: data.sourceChatId,
            senderId: 'system',
            text: `Task ${newTask.code} created by ${currentUser.name}`,
            type: 'system',
            timestamp: now,
            status: 'read',
          };

          setMessages((prev) => [...prev, cardMsg, sysMsg]);
          dmsApi.sendChatMessage(cardMsg).catch(() => {});
          dmsApi.sendChatMessage(sysMsg).catch(() => {});

          setChats((prev) =>
            prev.map((c) =>
              c.id === data.sourceChatId
                ? {
                    ...c,
                    lastMessage: {
                      text: `📋 ${newTask.code}: ${data.title}`,
                      timestamp: now,
                      senderId: currentUser.id,
                      type: 'task_card',
                    },
                  }
                : c
            )
          );
        }

        // Notify assignees
        newTask.assigneeIds.forEach((assigneeId) => {
          if (assigneeId !== currentUser.id) {
            const notif: AppNotification = {
              id: 'notif_' + Date.now() + Math.random(),
              recipientId: assigneeId,
              senderId: currentUser.id,
              type: 'new_task',
              title: `Task Assigned: ${newTask.code}`,
              body: `${currentUser.name} assigned you to "${newTask.title}"`,
              timestamp: now,
              read: false,
              taskId: newTask.id,
              chatId: data.sourceChatId,
            };
            setNotifications((prev) => [notif, ...prev]);
            dmsApi.createNotification(notif).catch(() => {});
          }
        });

        addToast(`Task ${newTask.code} created successfully`, 'success');
        return newTask;
      } catch (err: any) {
        addToast(`Failed to create task: ${err?.message}`, 'warning');
        throw err;
      }
    },
    [currentUser, addToast]
  );

  // ========================================================
  // DMS TASK INTEGRATION: UPDATE TASK STATUS
  // ========================================================
  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();
      let targetStatus = newStatus;

      if (newStatus === 'completed' && task.requiresApproval && task.creatorId !== currentUser.id) {
        targetStatus = 'under_review';
        addToast(`Submitted for review. Awaiting approval from ${getUserById(task.creatorId)?.name || 'Creator'}`, 'info');
      }

      const statusLabels: Record<TaskStatus, string> = {
        todo: 'To Do',
        in_progress: 'In Progress',
        under_review: 'Under Review',
        completed: 'Completed',
        blocked: 'Blocked',
      };

      try {
        // Transition status directly in DMS API
        await dmsApi.updateTaskStatus(taskId, targetStatus);

        const activityLogItem = {
          id: 'act_' + Date.now(),
          userId: currentUser.id,
          action: `Changed status to ${statusLabels[targetStatus]}`,
          timestamp: now,
        };

        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: targetStatus,
                  updatedAt: now,
                  activityLog: [activityLogItem, ...t.activityLog],
                }
              : t
          )
        );

        if (task.sourceChatId) {
          const sysMsg: ChatMessage = {
            id: 'msg_sys_' + Date.now(),
            chatId: task.sourceChatId,
            senderId: 'system',
            text: `Task ${task.code} marked ${statusLabels[targetStatus]} by ${currentUser.name}`,
            type: 'system',
            timestamp: now,
            status: 'read',
          };
          setMessages((prev) => [...prev, sysMsg]);
          dmsApi.sendChatMessage(sysMsg).catch(() => {});
        }

        addToast(`Task status updated to ${statusLabels[targetStatus]}`, 'success');
      } catch (err: any) {
        addToast(`Update note: ${err?.message}`, 'warning');
        // Still update local UI state with warning
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: now } : t))
        );
      }
    },
    [tasks, currentUser, getUserById, addToast]
  );

  // ========================================================
  // TASK INTEGRATION: SUBMIT PROOF WITH LOCAL FILE PERSISTENCE
  // ========================================================
  const submitProof = useCallback(
    async (
      taskId: string,
      photoUrl: string,
      note: string,
      fileMeta?: {
        file?: File;
        fileName?: string;
        fileType?: string;
        fileSize?: string;
      }
    ) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();
      const targetStatus: TaskStatus = task.requiresApproval ? 'under_review' : 'completed';

      const proofItem: ProofSubmission = {
        photoUrl: photoUrl || '',
        note,
        submittedAt: now,
        submittedBy: currentUser.id,
        fileName: fileMeta?.fileName,
        fileSize: fileMeta?.fileSize,
        fileType: fileMeta?.fileType,
      };

      const activityLogItem: TaskActivityLog = {
        id: 'act_' + Date.now(),
        userId: currentUser.id,
        action: `Submitted completion proof & marked ${task.requiresApproval ? 'Under Review' : 'Completed'}`,
        timestamp: now,
      };

      // Create new attachment item if a file was provided
      let newAttachments = [...task.attachments];
      if (photoUrl || fileMeta?.fileName) {
        const attId = 'att_' + Date.now();
        const isImg = fileMeta?.fileType ? fileMeta.fileType.startsWith('image/') : (photoUrl.startsWith('data:image') || photoUrl.includes('images.unsplash'));
        const attItem: TaskAttachment = {
          id: attId,
          name: fileMeta?.fileName || 'Completion Proof Photo',
          type: isImg ? 'image' : 'doc',
          url: photoUrl,
          size: fileMeta?.fileSize || 'Image',
        };
        newAttachments = [attItem, ...newAttachments];
      }

      // Optimistically update local state
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: targetStatus,
                proof: proofItem,
                attachments: newAttachments,
                updatedAt: now,
                activityLog: [activityLogItem, ...t.activityLog],
              }
            : t
        )
      );

      // Persist attachment to ERP backend
      if (fileMeta?.file) {
        try {
          await dmsApi.uploadTaskAttachment(taskId, fileMeta.file, fileMeta.fileName || 'Completion Proof', false);
        } catch (uploadErr) {
          console.warn('Could not upload file directly, attempting direct attachment:', uploadErr);
          if (photoUrl) {
            dmsApi.addTaskAttachment(taskId, {
              file_name: fileMeta.fileName || 'Completion Proof',
              file_url: photoUrl,
              file_type: fileMeta.fileType || 'image/jpeg',
              description: `Proof: ${note}`,
              is_initial: false,
            }).catch(() => {});
          }
        }
      } else if (photoUrl) {
        dmsApi.addTaskAttachment(taskId, {
          file_name: fileMeta?.fileName || 'Proof Image',
          file_url: photoUrl,
          file_type: fileMeta?.fileType || 'image/jpeg',
          description: `Proof: ${note}`,
          is_initial: false,
        }).catch(() => {});
      }

      // Persist status and comment
      dmsApi.addTaskComment(taskId, `[Completion Proof Submitted]: ${note}`).catch(() => {});
      dmsApi.updateTaskStatus(taskId, targetStatus).catch(() => {});

      if (task.sourceChatId) {
        const sysMsg: ChatMessage = {
          id: 'msg_sys_' + Date.now(),
          chatId: task.sourceChatId,
          senderId: 'system',
          text: `${currentUser.name} submitted completion proof for ${task.code} (${task.title})`,
          type: 'system',
          timestamp: now,
          status: 'read',
        };
        setMessages((prev) => [...prev, sysMsg]);
        dmsApi.sendChatMessage(sysMsg).catch(() => {});
      }

      addToast('Proof submitted and recorded successfully', 'success');
      setIsProofModalOpen(false);
    },
    [tasks, currentUser, addToast]
  );

  // Approve Task
  const approveTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();
      const activityLogItem = {
        id: 'act_' + Date.now(),
        userId: currentUser.id,
        action: `Approved task completion`,
        timestamp: now,
      };

      try {
        await dmsApi.updateTaskStatus(taskId, 'completed');
      } catch (err: any) {
        console.warn('Approve sync:', err?.message);
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'completed',
                approval: {
                  status: 'approved',
                  reviewedBy: currentUser.id,
                  reviewedAt: now,
                },
                updatedAt: now,
                activityLog: [activityLogItem, ...t.activityLog],
              }
            : t
        )
      );

      if (task.sourceChatId) {
        const sysMsg: ChatMessage = {
          id: 'msg_sys_' + Date.now(),
          chatId: task.sourceChatId,
          senderId: 'system',
          text: `Task ${task.code} approved and completed by ${currentUser.name}`,
          type: 'system',
          timestamp: now,
          status: 'read',
        };
        setMessages((prev) => [...prev, sysMsg]);
        dmsApi.sendChatMessage(sysMsg).catch(() => {});
      }

      addToast(`Task ${task.code} approved!`, 'success');
    },
    [tasks, currentUser, addToast]
  );

  // Reject Task
  const rejectTask = useCallback(
    async (taskId: string, reason: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();
      const activityLogItem = {
        id: 'act_' + Date.now(),
        userId: currentUser.id,
        action: `Rejected completion: "${reason}"`,
        timestamp: now,
      };

      const newComment = {
        id: 'comm_' + Date.now(),
        userId: currentUser.id,
        text: `[Approval Rejected]: ${reason}`,
        createdAt: now,
      };

      try {
        await dmsApi.addTaskComment(taskId, `[Approval Rejected]: ${reason}`);
        await dmsApi.updateTaskStatus(taskId, 'in_progress');
      } catch (err: any) {
        console.warn('Reject sync:', err?.message);
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'in_progress',
                approval: {
                  status: 'rejected',
                  reviewedBy: currentUser.id,
                  reason,
                  reviewedAt: now,
                },
                comments: [...t.comments, newComment],
                updatedAt: now,
                activityLog: [activityLogItem, ...t.activityLog],
              }
            : t
        )
      );

      if (task.sourceChatId) {
        const sysMsg: ChatMessage = {
          id: 'msg_sys_' + Date.now(),
          chatId: task.sourceChatId,
          senderId: 'system',
          text: `${currentUser.name} requested changes on ${task.code}: "${reason}"`,
          type: 'system',
          timestamp: now,
          status: 'read',
        };
        setMessages((prev) => [...prev, sysMsg]);
        dmsApi.sendChatMessage(sysMsg).catch(() => {});
      }

      addToast(`Task moved to In Progress`, 'warning');
    },
    [tasks, currentUser, addToast]
  );

  // ========================================================
  // TASK INTEGRATION: TOGGLE CHECKLIST ITEM (MOV) WITH ERP BACKEND PERSISTENCE
  // ========================================================
  const toggleChecklistItem = useCallback(
    async (taskId: string, itemId: string): Promise<boolean> => {
      const currentTask = tasks.find((t) => String(t.id) === String(taskId));
      if (!currentTask) {
        addToast('Task not found', 'warning');
        return false;
      }

      const itemIndex = currentTask.checklist.findIndex((i) => i.id === itemId);
      if (itemIndex === -1) {
        addToast('Checklist item not found', 'warning');
        return false;
      }

      const item = currentTask.checklist[itemIndex];
      const isTerminal = ['completed', 'closed', 'cancelled', 'rejected', 'pending_approval', 'approved'].includes(
        (currentTask.status || '').toLowerCase()
      );
      if (isTerminal) {
        addToast(`Cannot modify checklist for task with status '${currentTask.status}'`, 'warning');
        return false;
      }

      const currentUid = Number(currentUser.id);
      const isCurrentUserCreator = Number(currentTask.creatorId) === currentUid;
      const isCurrentUserAssignee = currentTask.assigneeIds.some((id) => Number(id) === currentUid);
      const isSuperAdmin =
        currentUser.role?.toLowerCase() === 'admin' || currentUser.role?.toLowerCase() === 'super_admin';

      // Check per-item assignment
      const isAssignedToThisItem = item.assignedUserId != null && Number(item.assignedUserId) === currentUid;

      // Creator cannot edit an item that is specifically assigned to another user
      const isCreatorOnAnotherUsersMov =
        isCurrentUserCreator && item.assignedUserId != null && Number(item.assignedUserId) !== currentUid;

      if (isCreatorOnAnotherUsersMov) {
        addToast('This checklist item is specifically assigned to another team member', 'warning');
        return false;
      }

      // Check ownership locking: another user's checked item cannot be modified
      const isChecked = Boolean(item.completed);
      const isCheckedByOther =
        isChecked && item.completedById != null && Number(item.completedById) !== currentUid;

      if (isCheckedByOther) {
        addToast('This checklist item was checked by another user and cannot be modified', 'warning');
        return false;
      }

      // General checklist edit permission check (matches ERP-Task index.jsx)
      const canEditMovChecklist =
        !isTerminal &&
        (isCurrentUserAssignee ||
          isSuperAdmin ||
          (isCurrentUserCreator && (!currentTask.movAssignments || currentTask.movAssignments.length === 0)));

      if (!canEditMovChecklist && !isAssignedToThisItem) {
        addToast('You do not have permission to modify this checklist item', 'warning');
        return false;
      }

      const newCompleted = !isChecked;
      const nowIso = new Date().toISOString();

      // Construct next checklist optimistically
      const nextChecklist = currentTask.checklist.map((it, idx) => {
        if (idx !== itemIndex) return it;
        return {
          ...it,
          completed: newCompleted,
          completedBy: newCompleted ? currentUser.name : undefined,
          completedById: newCompleted ? currentUid : null,
          completedAt: newCompleted ? nowIso : undefined,
        };
      });

      const completedCount = nextChecklist.filter((it) => it.completed).length;
      const totalCount = nextChecklist.length;
      const nextProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Construct notes payload matching ERP-Task backend expectations:
      // "Complete: X of Y checklist items completed. [indices:0,1][ownership:0=1,1=2]"
      const checkedIndices: number[] = [];
      const ownershipParts: string[] = [];
      nextChecklist.forEach((it, idx) => {
        const mIdx = it.movIndex !== undefined ? it.movIndex : idx;
        if (it.completed) {
          checkedIndices.push(mIdx);
          const ownerId = it.completedById != null ? it.completedById : currentUid;
          ownershipParts.push(`${mIdx}=${ownerId}`);
        }
      });

      const notes =
        `Complete: ${completedCount} of ${totalCount} checklist items completed.` +
        (checkedIndices.length > 0
          ? ` [indices:${checkedIndices.join(',')}][ownership:${ownershipParts.join(',')}]`
          : ' [indices:][ownership:]');

      // Optimistic update
      const previousTasks = [...tasks];
      setTasks((prev) =>
        prev.map((t) => {
          if (String(t.id) !== String(taskId)) return t;
          return {
            ...t,
            checklist: nextChecklist,
            progress: nextProgress,
            updatedAt: nowIso,
          };
        })
      );

      try {
        const updatedTask = await dmsApi.updateTaskProgress(taskId, nextProgress, notes);
        setTasks((prev) =>
          prev.map((t) => (String(t.id) === String(taskId) ? updatedTask : t))
        );
        addToast(
          newCompleted
            ? `Checked MoV (${completedCount}/${totalCount})`
            : `Unchecked MoV (${completedCount}/${totalCount})`,
          'success'
        );
        return true;
      } catch (err: any) {
        console.error('Failed to persist task progress:', err);
        // Rollback on error
        setTasks(previousTasks);
        addToast(err?.message || 'Failed to update checklist progress on backend', 'warning');
        return false;
      }
    },
    [tasks, currentUser, addToast]
  );

  // ========================================================
  // TASK INTEGRATION: ADD COMMENT TO TASK
  // ========================================================
  const addCommentToTask = useCallback(
    async (taskId: string, text: string) => {
      if (!text.trim()) return;
      const now = new Date().toISOString();

      try {
        const createdComment = await dmsApi.addTaskComment(taskId, text.trim());
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  comments: [...t.comments, createdComment],
                  updatedAt: now,
                }
              : t
          )
        );
        addToast('Comment added successfully', 'info');
      } catch (err: any) {
        // Fallback local update if network issue
        const newComment = {
          id: 'comm_' + Date.now(),
          userId: currentUser.id,
          text: text.trim(),
          createdAt: now,
        };
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  comments: [...t.comments, newComment],
                  updatedAt: now,
                }
              : t
          )
        );
        addToast(`Comment added (local): ${err?.message}`, 'info');
      }
    },
    [currentUser.id, addToast]
  );

  // Create new chat
  // Create new chat
  // Rule: Selecting a colleague creates a local draft chat. It must NOT appear in either user's Chat List
  // and must NOT be saved to the backend until the first message is sent and successfully persisted.
  const createChat = useCallback(
    (data: { name: string; type: 'direct' | 'group' | 'channel'; participantIds: string[]; department?: Department }) => {
      const isChannel = data.type === 'channel';

      // Deterministic conversation ID for direct chats (dm_min_max)
      let chatId = 'chat_' + Date.now();
      if (data.type === 'direct' && data.participantIds.length === 1) {
        const uids = [String(currentUser.id), String(data.participantIds[0])].sort();
        chatId = `dm_${uids[0]}_${uids[1]}`;
      }

      const newChat: Chat = {
        id: chatId,
        name: data.name,
        type: data.type,
        avatarBg: data.type === 'direct' ? 'bg-indigo-600' : 'bg-emerald-600',
        participantIds: [...new Set([currentUser.id, ...data.participantIds])],
        adminIds: [currentUser.id],
        department: data.department || currentUser.department,
        unreadCounts: {},
        isDraft: !isChannel, // Only channels are permanent immediately; direct and group chats start as drafts
      };

      setChats((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === chatId);
        if (existingIdx >= 0) {
          // If already in list, retain it without creating duplicates
          return prev;
        }
        return [newChat, ...prev];
      });

      setActiveChatId(chatId);
      setActiveMobileTab('chats');
      setIsNewChatModalOpen(false);

      // Pre-negotiate and distribute conversation AES key bundle to all participants
      e2eeCrypto.getOrCreateConversationKey(chatId, newChat.participantIds).catch((err) => {
        console.warn('E2EE key generation notice for new chat:', err);
      });

      // ONLY persist persistent channels immediately.
      // Direct and group chats must NOT be saved to backend or broadcast until the first message is sent!
      if (isChannel) {
        dmsApi.saveConversation(newChat).catch((err) => {
          console.warn('Failed to persist conversation to DMS backend:', err?.message);
        });
      }

      return chatId;
    },
    [currentUser]
  );

  // Open or create a discussion chat dedicated to a specific DMS task
  const openTaskChat = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Check if a dedicated chat already exists for this task
      const existingChat = chats.find(
        (c) => c.linkedTaskId === taskId || c.id === task.sourceChatId || c.id === `task_chat_${taskId}`
      );

      if (existingChat) {
        setActiveChatId(existingChat.id);
        setTaskQuoteForComposer(task);
        setActiveMobileTab('chats');
        closeTaskDrawer();
        return;
      }

      // Create a dedicated task discussion conversation
      const newChatId = `task_chat_${taskId}`;
      const participants = [
        ...new Set([
          currentUser.id,
          task.creatorId,
          ...task.assigneeIds,
          ...(task.reporterIds || []),
        ]),
      ];
      const newTaskChat: Chat = {
        id: newChatId,
        name: `${task.code}: ${task.title.slice(0, 32)}`,
        type: 'group',
        avatarBg: 'bg-indigo-700',
        participantIds: participants,
        adminIds: [currentUser.id, task.creatorId],
        department: task.department,
        linkedTaskId: taskId,
        unreadCounts: {},
        description: `Dedicated discussion channel for Task ${task.code} (${task.title})`,
      };

      setChats((prev) => [newTaskChat, ...prev]);
      setActiveChatId(newChatId);
      setTaskQuoteForComposer(task);
      setActiveMobileTab('chats');
      closeTaskDrawer();

      // Pre-negotiate and distribute conversation AES key bundle to task participants
      e2eeCrypto.getOrCreateConversationKey(newChatId, participants).catch((err) => {
        console.warn('E2EE key generation notice for task chat:', err);
      });

      // Persist task discussion conversation to ERP-Task backend
      dmsApi.saveConversation(newTaskChat).catch((err) => {
        console.warn('Failed to persist task chat to DMS backend:', err?.message);
      });

      addToast(`Opened discussion channel for ${task.code}`, 'info');
    },
    [tasks, chats, currentUser.id, closeTaskDrawer, addToast]
  );

  // Navigation helpers
  const navigateToMessage = useCallback(
    (chatId: string, messageId: string) => {
      setActiveChatId(chatId);
      setActiveMobileTab('chats');
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3500);
    },
    []
  );

  const navigateToTask = useCallback(
    (taskId: string) => {
      openTaskDrawer(String(taskId));
      setActiveMobileTab('tasks');
    },
    [openTaskDrawer]
  );

  return (
    <AppStoreContext.Provider
      value={{
        currentUser,
        users,
        departments,
        fetchDepartments,
        setCurrentUserId,
        getUserById,
        isLoadingDms,
        isDmsConnected,
        isLiveSyncing,
        lastSyncTimestamp,
        refreshDmsData,
        chats,
        activeChatId,
        activeChat,
        setActiveChatId,
        createChat,
        openTaskChat,
        messages,
        chatMessages,
        messagesByChatId,
        hasMoreOlderMessages,
        isLoadingOlderMessages,
        loadOlderMessages,
        sendTypingIndicator,
        sendMessage,
        reactToMessage,
        highlightedMessageId,
        setHighlightedMessageId,
        replyMessage,
        setReplyMessage,
        taskQuoteForComposer,
        setTaskQuoteForComposer,
        typingStatus,
        tasks,
        activeTaskId,
        activeTask,
        isTaskDrawerOpen,
        openTaskDrawer,
        closeTaskDrawer,
        createTask,
        updateTaskStatus,
        submitProof,
        approveTask,
        rejectTask,
        toggleChecklistItem,
        addCommentToTask,
        getTaskById,
        getTasksForChat,
        isCreateTaskModalOpen,
        taskModalInitialData,
        openCreateTaskModal,
        closeCreateTaskModal,
        isProofModalOpen,
        proofModalTaskId,
        openProofModal,
        closeProofModal,
        isNewChatModalOpen,
        setIsNewChatModalOpen,
        isGroupInfoOpen,
        setIsGroupInfoOpen,
        isTasksInChatOpen,
        setIsTasksInChatOpen,
        activeMobileTab,
        setActiveMobileTab,
        notifications,
        userNotifications,
        unreadNotificationCount,
        markNotificationRead,
        markAllNotificationsRead,
        isDark,
        toggleTheme,
        toasts,
        addToast,
        removeToast,
        deviceView,
        setDeviceView,
        navigateToMessage,
        navigateToTask,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppStoreProvider');
  }
  return context;
};
