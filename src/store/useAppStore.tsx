import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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
import { dmsApi, DMS_CREDENTIALS, getDepartmentMeta } from '../services/dmsApi';
import { e2eeCrypto } from '../services/e2eeCrypto';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppStoreContextType {
  // Current user & Users (Fetched from DMS)
  currentUser: User;
  users: User[];
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
    department: Department;
    priority: TaskPriority;
    dueDate: string;
    assigneeIds: string[];
    checklistTitles: string[];
    requiresApproval: boolean;
    proofRequired: boolean;
    sourceChatId?: string;
    sourceMessageId?: string;
    attachments?: TaskAttachment[];
  }) => Promise<Task>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  submitProof: (taskId: string, photoUrl: string, note: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, reason: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addCommentToTask: (taskId: string, text: string) => Promise<void>;
  getTaskById: (taskId: string) => Task | undefined;

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

// Fallback initial admin user while DMS is syncing
const INITIAL_ADMIN_USER: User = {
  id: '5',
  name: 'Admin',
  designation: 'System Administrator',
  department: 'admin',
  avatar: 'AD',
  avatarBg: 'bg-slate-700',
  status: 'online',
  email: 'admin@example.com',
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
  const [users, setUsers] = useState<User[]>([INITIAL_ADMIN_USER]);
  const [currentUserId, setLocalCurrentUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dmstask_persisted_user_id') || '5';
    }
    return '5';
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
  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || INITIAL_ADMIN_USER;
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
      if (cached) {
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
      return localStorage.getItem('dmstask_persisted_active_chat_id') || 'chat_dept_program';
    }
    return 'chat_dept_program';
  });

  const setActiveChatId = useCallback((chatId: string | null) => {
    setActiveChatIdState(chatId);
    dmsApi.setActiveChatId(chatId);
    if (typeof window !== 'undefined') {
      if (chatId) {
        localStorage.setItem('dmstask_persisted_active_chat_id', chatId);
      } else {
        localStorage.removeItem('dmstask_persisted_active_chat_id');
      }
    }
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) || (chats.length > 0 ? chats[0] : null);

  // Messages state - Persistent from ERP-Task database + local storage cache
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('dmstask_persisted_messages');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [];
  });

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<QuotedMessage | null>(null);
  const [taskQuoteForComposer, setTaskQuoteForComposer] = useState<Task | null>(null);

  // Typing simulator state
  const [typingStatus, setTypingStatus] = useState<Record<string, string>>({});

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
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('dmstask_persisted_messages', JSON.stringify(messages));
    }
  }, [messages]);

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

  // Filter messages for active chat
  const chatMessages = messages.filter((m) => m.chatId === activeChatId);

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
      if (currentUserId) {
        await e2eeCrypto.initUser(currentUserId);
      }

      // Fetch Users, Tasks, Conversations, Messages, and Notifications concurrently from ERP-Task backend
      const [fetchedUsers, fetchedTasks, fetchedConversations, fetchedMessages, fetchedNotifications] = await Promise.all([
        dmsApi.fetchUsers(),
        dmsApi.fetchTasks(),
        dmsApi.fetchConversations(),
        dmsApi.fetchMessages(),
        dmsApi.fetchNotifications(currentUserId),
      ]);

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

      if (fetchedTasks.length > 0) {
        setTasks(fetchedTasks);
      }

      if (fetchedConversations.length > 0) {
        // Synchronize departmental channels with actual DMS users
        const syncedChats = fetchedConversations.map((c) => {
          if (c.type === 'channel' && c.department && fetchedUsers.length > 0) {
            const deptUserIds = fetchedUsers
              .filter((u) => u.department?.toLowerCase() === c.department?.toLowerCase())
              .map((u) => u.id);
            const adminUser = fetchedUsers.find((u) => u.department === 'admin');
            const allParticipants = [
              ...new Set([...c.participantIds, ...deptUserIds, adminUser?.id].filter(Boolean) as string[]),
            ];
            return { ...c, participantIds: allParticipants };
          }
          return c;
        });
        setChats(syncedChats);

        // Ensure activeChatId points to a valid conversation
        setActiveChatIdState((prev) => {
          if (prev && syncedChats.some((c) => c.id === prev)) {
            return prev;
          }
          return syncedChats[0]?.id || 'chat_dept_program';
        });
      }

      if (fetchedMessages.length > 0) {
        const decryptedMessages = await e2eeCrypto.decryptMessages(fetchedMessages);
        setMessages(decryptedMessages);
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
      if (!err?.message?.includes('permissions') && !err?.message?.includes('Forbidden')) {
        addToast(`DMS API Notice: ${err?.message || 'Connecting to DMS backend...'}`, 'warning');
      }
    } finally {
      setIsLoadingDms(false);
    }
  }, [currentUserId, addToast]);

  // Dynamic Real-Time Live Sync with ERP-Task & DMS without page refresh/reload
  useEffect(() => {
    // Initialize E2EE identity keypair for active user
    if (currentUserId) {
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
        setChats(delta.conversations);
      }

      // 4. Dynamic Messages update (Real-time live messaging without reload)
      if (delta.changed.messages && delta.messages) {
        e2eeCrypto.decryptMessages(delta.messages).then((decryptedDelta) => {
          setMessages((prev) => {
            // Reconcile server messages with any optimistic local messages
            const serverMsgIds = new Set(decryptedDelta.map((m) => m.id));
            const pendingLocalMsgs = prev.filter(
              (m) => m.id.startsWith('msg_') && !serverMsgIds.has(m.id)
            );
            if (pendingLocalMsgs.length === 0) {
              return decryptedDelta;
            }
            return [...decryptedDelta, ...pendingLocalMsgs];
          });
        }).catch((err) => {
          console.warn('Delta message decryption error:', err);
        });
      }

      // 5. Dynamic Notifications update (Bell counter & alerts)
      if (delta.changed.notifications && delta.notifications) {
        setNotifications(delta.notifications);
      }
    }, 2500);

    return () => {
      unsubscribe();
    };
  }, [refreshDmsData, currentUserId, activeChatId]);

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
        await e2eeCrypto.initUser(uid, email, password);
        await refreshDmsData();
        addToast(`Welcome back, ${loggedUser.name || 'User'}!`, 'success');
        return true;
      } catch (err: any) {
        addToast(err?.message || 'Login failed. Please check your credentials.', 'warning');
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
      const userEmail =
        targetUser?.email ||
        Object.keys(DMS_CREDENTIALS).find(
          (e) =>
            (uid === '1' && e.startsWith('store')) ||
            (uid === '2' && e.startsWith('procure')) ||
            (uid === '3' && e.startsWith('program')) ||
            (uid === '4' && e.startsWith('finance')) ||
            (uid === '5' && e.startsWith('admin')) ||
            (uid === '6' && (e.startsWith('anjam') || e.startsWith('raza')))
        );

      if (userEmail) {
        try {
          await dmsApi.login(userEmail);
        } catch (err: any) {
          console.warn('Persona login notice:', err?.message);
        }
      }

      // Reset previous in-memory session and initialize target persona's E2EE keys
      e2eeCrypto.clearSession();
      await e2eeCrypto.initUser(uid, userEmail);

      // Re-fetch all data and re-decrypt conversations and messages for this persona
      await refreshDmsData();

      const displayName = targetUser?.name || userEmail?.split('@')[0] || `User #${uid}`;
      addToast(`Active persona: ${displayName}`, 'info');
    },
    [users, refreshDmsData, addToast]
  );

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
        status: 'delivered',
        replyTo: options?.replyTo,
        attachment: options?.attachment,
        voiceDuration: options?.voiceDuration,
        taskId: options?.taskId ? String(options.taskId) : undefined,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
        isEncrypted: true,
        isDecrypted: true,
      };

      // Optimistic state update (Sender sees cleartext immediately)
      setMessages((prev) => [...prev, newMsg]);

      // Update chat's lastMessage
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                lastMessage: {
                  text: text || (options?.voiceDuration ? 'Voice message' : 'Shared an attachment'),
                  timestamp: now,
                  senderId: currentUser.id,
                  type,
                },
              }
            : c
        )
      );

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
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newMsgId
                ? { ...m, rawCiphertext: encResult.ciphertext, keyVersion: encResult.keyVersion }
                : m
            )
          );
          const wireMessage: Partial<ChatMessage> = {
            id: newMsgId,
            chatId,
            senderId: currentUser.id,
            text: encResult.ciphertext,
            type,
            timestamp: now,
            status: 'delivered',
            isEncrypted: encResult.isEncrypted,
            keyVersion: encResult.keyVersion,
            mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
            taskId: options?.taskId ? String(options.taskId) : undefined,
          };
          return dmsApi.sendChatMessage(wireMessage);
        })
        .catch((err) => {
          console.error('Failed to encrypt or persist message to ERP-Task database:', err?.message);
          dmsApi.sendChatMessage(newMsg).catch(() => {});
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
      department: Department;
      priority: TaskPriority;
      dueDate: string;
      assigneeIds: string[];
      checklistTitles: string[];
      requiresApproval: boolean;
      proofRequired: boolean;
      sourceChatId?: string;
      sourceMessageId?: string;
      attachments?: TaskAttachment[];
    }): Promise<Task> => {
      const now = new Date().toISOString();

      try {
        // Create in DMS backend via API
        const createdDmsTask = await dmsApi.createTask({
          title: data.title,
          description: data.description,
          department: data.department,
          priority: data.priority,
          dueDate: data.dueDate,
          assigneeIds: data.assigneeIds.length > 0 ? data.assigneeIds : [currentUser.id],
          requiresApproval: data.requiresApproval,
          checklistTitles: data.checklistTitles,
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
            text: `DMS Task ${newTask.code} created by ${currentUser.name}`,
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
              title: `DMS Assigned: ${newTask.code}`,
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

        addToast(`DMS Task ${newTask.code} created successfully`, 'success');
        return newTask;
      } catch (err: any) {
        addToast(`Failed to create task in DMS: ${err?.message}`, 'warning');
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
          action: `Changed status to ${statusLabels[targetStatus]} in DMS`,
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

        addToast(`DMS Task status updated to ${statusLabels[targetStatus]}`, 'success');
      } catch (err: any) {
        addToast(`DMS update note: ${err?.message}`, 'warning');
        // Still update local UI state with warning
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: now } : t))
        );
      }
    },
    [tasks, currentUser, getUserById, addToast]
  );

  // Submit Proof
  const submitProof = useCallback(
    (taskId: string, photoUrl: string, note: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();
      const targetStatus: TaskStatus = task.requiresApproval ? 'under_review' : 'completed';

      const proofItem = {
        photoUrl: photoUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
        note,
        submittedAt: now,
        submittedBy: currentUser.id,
      };

      const activityLogItem = {
        id: 'act_' + Date.now(),
        userId: currentUser.id,
        action: `Submitted completion proof & marked ${task.requiresApproval ? 'Under Review' : 'Completed'}`,
        timestamp: now,
      };

      // Also persist to DMS if possible
      dmsApi.addTaskComment(taskId, `[Completion Proof Submitted]: ${note}`).catch(() => {});
      dmsApi.updateTaskStatus(taskId, targetStatus).catch(() => {});

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: targetStatus,
                proof: proofItem,
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
          text: `${currentUser.name} submitted completion proof for ${task.code} (${task.title})`,
          type: 'system',
          timestamp: now,
          status: 'read',
        };
        setMessages((prev) => [...prev, sysMsg]);
        dmsApi.sendChatMessage(sysMsg).catch(() => {});
      }

      addToast('Proof submitted and recorded in DMS', 'success');
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
        action: `Approved task completion in DMS`,
        timestamp: now,
      };

      try {
        await dmsApi.updateTaskStatus(taskId, 'completed');
      } catch (err: any) {
        console.warn('DMS approve sync:', err?.message);
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

      addToast(`DMS Task ${task.code} approved!`, 'success');
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
        console.warn('DMS reject sync:', err?.message);
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

      addToast(`Task moved to In Progress in DMS`, 'warning');
    },
    [tasks, currentUser, addToast]
  );

  // Toggle checklist item
  const toggleChecklistItem = useCallback(
    (taskId: string, itemId: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const updatedChecklist = t.checklist.map((item) => {
            if (item.id !== itemId) return item;
            const completed = !item.completed;
            return {
              ...item,
              completed,
              completedBy: completed ? currentUser.id : undefined,
              completedAt: completed ? new Date().toISOString() : undefined,
            };
          });

          return {
            ...t,
            checklist: updatedChecklist,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    [currentUser.id]
  );

  // ========================================================
  // DMS TASK INTEGRATION: ADD COMMENT TO DMS TASK
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
        addToast('Comment synced with DMS task', 'info');
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
  const createChat = useCallback(
    (data: { name: string; type: 'direct' | 'group' | 'channel'; participantIds: string[]; department?: Department }) => {
      const chatId = 'chat_' + Date.now();
      const newChat: Chat = {
        id: chatId,
        name: data.name,
        type: data.type,
        avatarBg: data.type === 'direct' ? 'bg-indigo-600' : 'bg-emerald-600',
        participantIds: [...new Set([currentUser.id, ...data.participantIds])],
        adminIds: [currentUser.id],
        department: data.department || currentUser.department,
        unreadCounts: {},
      };

      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(chatId);
      setActiveMobileTab('chats');
      setIsNewChatModalOpen(false);

      // Pre-negotiate and distribute conversation AES key bundle to all participants
      e2eeCrypto.getOrCreateConversationKey(chatId, newChat.participantIds).catch((err) => {
        console.warn('E2EE key generation notice for new chat:', err);
      });

      // Persist conversation to ERP-Task backend
      dmsApi.saveConversation(newChat).catch((err) => {
        console.warn('Failed to persist conversation to DMS backend:', err?.message);
      });

      addToast(`Chat "${data.name}" created`, 'success');
      return chatId;
    },
    [currentUser, addToast]
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
        description: `Dedicated discussion channel for DMS Task ${task.code} (${task.title})`,
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
