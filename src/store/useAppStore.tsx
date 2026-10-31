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
import {
  SEED_USERS,
  SEED_TASKS,
  SEED_CHATS,
  SEED_MESSAGES,
  SEED_NOTIFICATIONS,
} from '../data/seedData';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppStoreContextType {
  // Current user & Users
  currentUser: User;
  users: User[];
  setCurrentUserId: (userId: string) => void;
  getUserById: (userId: string) => User | undefined;

  // Chats
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  setActiveChatId: (chatId: string | null) => void;
  createChat: (data: { name: string; type: 'direct' | 'group'; participantIds: string[]; department?: Department }) => string;

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

  // Tasks
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
  }) => Task;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  submitProof: (taskId: string, photoUrl: string, note: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, reason: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addCommentToTask: (taskId: string, text: string) => void;
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
}

const AppStoreContext = createContext<AppStoreContextType | null>(null);

export const AppStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
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

  // Users state
  const [users] = useState<User[]>(SEED_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>('user_rahat');

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];
  const getUserById = useCallback((userId: string) => users.find((u) => u.id === userId), [users]);

  // Chats state
  const [chats, setChats] = useState<Chat[]>(SEED_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<QuotedMessage | null>(null);
  const [taskQuoteForComposer, setTaskQuoteForComposer] = useState<Task | null>(null);

  // Typing simulator state
  const [typingStatus, setTypingStatus] = useState<Record<string, string>>({});

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState<boolean>(false);
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;
  const getTaskById = useCallback((taskId: string) => tasks.find((t) => t.id === taskId), [tasks]);

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

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(SEED_NOTIFICATIONS);

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
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === currentUserId ? { ...n, read: true } : n))
    );
    addToast('All notifications marked as read', 'info');
  }, [currentUserId, addToast]);

  // Task Drawer open/close
  const openTaskDrawer = useCallback((taskId: string) => {
    setActiveTaskId(taskId);
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
    setProofModalTaskId(taskId);
    setIsProofModalOpen(true);
  }, []);

  const closeProofModal = useCallback(() => {
    setIsProofModalOpen(false);
    setProofModalTaskId(null);
  }, []);

  // Plausible bot auto-reply simulator
  const triggerAutoReply = useCallback((chatId: string, userText: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat || chat.isReadOnly) return;

    // Pick a responding user who is not the currentUser
    const potentialResponders = chat.participantIds.filter((id) => id !== currentUserId);
    if (potentialResponders.length === 0) return;
    const responderId = potentialResponders[Math.floor(Math.random() * potentialResponders.length)];
    const responder = users.find((u) => u.id === responderId);
    if (!responder) return;

    // After 2.5s, show typing indicator
    const typingTimeout = setTimeout(() => {
      setTypingStatus((prev) => ({ ...prev, [chatId]: responder.name }));

      // After 2.5s more, send reply
      const replyTimeout = setTimeout(() => {
        setTypingStatus((prev) => {
          const updated = { ...prev };
          delete updated[chatId];
          return updated;
        });

        const replies = [
          `Ji Madam, bilkul note kar liya hai. Main abhi file check kar ke update karti hoon.`,
          `Walaikum Assalam Ma'am, details review kar ke task card update kar rahi hoon. جزاک اللہ!`,
          `Understood Headmistress Ma'am! Added this to my active task queue.`,
          `Ji Ma'am, work in progress hai. Short update task details mein submit kar rahi hoon.`,
          `Thanks for the guidance, Ma'am! Main abhi office se verify karwati hoon.`,
        ];

        let replyText = replies[Math.floor(Math.random() * replies.length)];
        if (
          userText.toLowerCase().includes('task') ||
          userText.toLowerCase().includes('ticket') ||
          userText.toLowerCase().includes('kaam')
        ) {
          replyText = `Understood Ma'am! I'll update progress directly on the task card.`;
        }

        const replyMsgId = 'msg_reply_' + Date.now();
        const now = new Date().toISOString();

        const autoMsg: ChatMessage = {
          id: replyMsgId,
          chatId,
          senderId: responder.id,
          text: replyText,
          type: 'text',
          timestamp: now,
          status: 'read',
        };

        setMessages((prev) => [...prev, autoMsg]);

        // Update last message in chat
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  lastMessage: {
                    text: replyText,
                    timestamp: now,
                    senderId: responder.id,
                    type: 'text',
                  },
                }
              : c
          )
        );
      }, 2500);

      return () => clearTimeout(replyTimeout);
    }, 2000);

    return () => clearTimeout(typingTimeout);
  }, [chats, currentUserId, currentUser, users]);

  // Send message action
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

      // Check for mentions like @Sarah or @Ali
      const mentionedUserIds: string[] = [];
      users.forEach((u) => {
        if (text.includes(`@${u.name}`) || text.includes(`@${u.name.split(' ')[0]}`)) {
          mentionedUserIds.push(u.id);
        }
      });

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
        taskId: options?.taskId,
        mentions: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      };

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
        }
      });

      // Clear composer quotes
      setReplyMessage(null);
      setTaskQuoteForComposer(null);

      // Trigger automatic reply if it's regular chat message
      if (type === 'text' || type === 'voice' || type === 'image' || type === 'document') {
        triggerAutoReply(chatId, text);
      }
    },
    [currentUser, users, triggerAutoReply]
  );

  // React to message
  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = msg.reactions || [];
        const existingReaction = currentReactions.find((r) => r.emoji === emoji);

        let updatedReactions;
        if (existingReaction) {
          if (existingReaction.userIds.includes(currentUser.id)) {
            // Remove user reaction
            const newUserIds = existingReaction.userIds.filter((id) => id !== currentUser.id);
            if (newUserIds.length === 0) {
              updatedReactions = currentReactions.filter((r) => r.emoji !== emoji);
            } else {
              updatedReactions = currentReactions.map((r) =>
                r.emoji === emoji ? { ...r, userIds: newUserIds } : r
              );
            }
          } else {
            // Add user to reaction
            updatedReactions = currentReactions.map((r) =>
              r.emoji === emoji ? { ...r, userIds: [...r.userIds, currentUser.id] } : r
            );
          }
        } else {
          // Add new emoji reaction
          updatedReactions = [...currentReactions, { emoji, userIds: [currentUser.id] }];
        }

        return { ...msg, reactions: updatedReactions };
      })
    );
  }, [currentUser.id]);

  // Create Task
  const createTask = useCallback(
    (data: {
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
    }) => {
      const now = new Date().toISOString();
      const codeNumber = 100 + tasks.length + 1;
      const code = `TASK-${codeNumber}`;
      const taskId = `task_${Date.now()}`;

      const checklist = data.checklistTitles
        .filter((t) => t.trim().length > 0)
        .map((t, index) => ({
          id: `chk_${Date.now()}_${index}`,
          title: t.trim(),
          completed: false,
        }));

      const newTask: Task = {
        id: taskId,
        code,
        title: data.title,
        description: data.description,
        department: data.department,
        status: 'todo',
        priority: data.priority,
        dueDate: data.dueDate,
        assigneeIds: data.assigneeIds.length > 0 ? data.assigneeIds : [currentUser.id],
        creatorId: currentUser.id,
        createdAt: now,
        updatedAt: now,
        checklist,
        requiresApproval: data.requiresApproval,
        proofRequired: data.proofRequired,
        sourceChatId: data.sourceChatId,
        sourceMessageId: data.sourceMessageId,
        attachments: data.attachments || [],
        comments: [],
        activityLog: [
          {
            id: 'act_' + Date.now(),
            userId: currentUser.id,
            action: `Created task ${code}`,
            timestamp: now,
          },
        ],
      };

      setTasks((prev) => [newTask, ...prev]);

      // If created from chat, inject card & system notification into chat
      if (data.sourceChatId) {
        // Link original message if exists
        if (data.sourceMessageId) {
          setMessages((prev) =>
            prev.map((m) => (m.id === data.sourceMessageId ? { ...m, linkedTaskId: taskId } : m))
          );
        }

        // Post task card message into the chat
        const cardMsg: ChatMessage = {
          id: 'msg_card_' + Date.now(),
          chatId: data.sourceChatId,
          senderId: 'system',
          text: `${currentUser.name} created task ${code}`,
          type: 'task_card',
          timestamp: now,
          status: 'read',
          taskId,
        };

        const sysMsg: ChatMessage = {
          id: 'msg_sys_' + (Date.now() + 1),
          chatId: data.sourceChatId,
          senderId: 'system',
          text: `Task ${code} (${data.title}) created by ${currentUser.name}`,
          type: 'system',
          timestamp: now,
          status: 'read',
        };

        setMessages((prev) => [...prev, cardMsg, sysMsg]);

        // Update chat's lastMessage
        setChats((prev) =>
          prev.map((c) =>
            c.id === data.sourceChatId
              ? {
                  ...c,
                  lastMessage: {
                    text: `📋 ${code}: ${data.title}`,
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
            title: `Assigned: ${code}`,
            body: `${currentUser.name} assigned you to "${newTask.title}"`,
            timestamp: now,
            read: false,
            taskId,
            chatId: data.sourceChatId,
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      });

      addToast(`Task ${code} created successfully`, 'success');
      return newTask;
    },
    [tasks.length, currentUser, addToast]
  );

  // Update Task Status
  const updateTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();

      // Check approval workflow: if requiresApproval and user tries to set to 'completed'
      let targetStatus = newStatus;
      if (newStatus === 'completed' && task.requiresApproval && task.creatorId !== currentUser.id) {
        targetStatus = 'under_review';
        addToast(`Submitted for review. Awaiting approval from ${getUserById(task.creatorId)?.name}`, 'info');
      }

      const statusLabels: Record<TaskStatus, string> = {
        todo: 'To Do',
        in_progress: 'In Progress',
        under_review: 'Under Review',
        completed: 'Completed',
        blocked: 'Blocked',
      };

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

      // Post system message to source chat
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
      }

      // If moved to under_review, notify creator
      if (targetStatus === 'under_review' && task.creatorId !== currentUser.id) {
        const notif: AppNotification = {
          id: 'notif_' + Date.now(),
          recipientId: task.creatorId,
          senderId: currentUser.id,
          type: 'approval_request',
          title: `Approval Required: ${task.code}`,
          body: `${currentUser.name} requested approval for "${task.title}"`,
          timestamp: now,
          read: false,
          taskId,
          chatId: task.sourceChatId,
        };
        setNotifications((prev) => [notif, ...prev]);
      }

      // If moved to completed, notify creator and assignees
      if (targetStatus === 'completed') {
        const recipients = [...new Set([task.creatorId, ...task.assigneeIds])].filter(
          (id) => id !== currentUser.id
        );
        recipients.forEach((recId) => {
          const notif: AppNotification = {
            id: 'notif_' + Date.now() + Math.random(),
            recipientId: recId,
            senderId: currentUser.id,
            type: 'status_change',
            title: `Task Completed: ${task.code}`,
            body: `${currentUser.name} marked "${task.title}" as completed`,
            timestamp: now,
            read: false,
            taskId,
            chatId: task.sourceChatId,
          };
          setNotifications((prev) => [notif, ...prev]);
        });
      }

      addToast(`Status updated to ${statusLabels[targetStatus]}`, 'success');
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

      // Post system message
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
      }

      // Notify creator if requires approval
      if (task.requiresApproval && task.creatorId !== currentUser.id) {
        const notif: AppNotification = {
          id: 'notif_' + Date.now(),
          recipientId: task.creatorId,
          senderId: currentUser.id,
          type: 'approval_request',
          title: `Proof Submitted: ${task.code}`,
          body: `${currentUser.name} submitted proof for "${task.title}". Review and approve.`,
          timestamp: now,
          read: false,
          taskId,
          chatId: task.sourceChatId,
        };
        setNotifications((prev) => [notif, ...prev]);
      }

      addToast('Proof submitted successfully!', 'success');
      setIsProofModalOpen(false);
    },
    [tasks, currentUser, addToast]
  );

  // Approve Task
  const approveTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const now = new Date().toISOString();
      const activityLogItem = {
        id: 'act_' + Date.now(),
        userId: currentUser.id,
        action: `Approved task completion`,
        timestamp: now,
      };

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
      }

      // Notify assignees
      task.assigneeIds.forEach((assigneeId) => {
        if (assigneeId !== currentUser.id) {
          const notif: AppNotification = {
            id: 'notif_' + Date.now() + Math.random(),
            recipientId: assigneeId,
            senderId: currentUser.id,
            type: 'status_change',
            title: `Approved: ${task.code}`,
            body: `${currentUser.name} approved "${task.title}". Great work!`,
            timestamp: now,
            read: false,
            taskId,
            chatId: task.sourceChatId,
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      });

      addToast(`Task ${task.code} approved!`, 'success');
    },
    [tasks, currentUser, addToast]
  );

  // Reject Task
  const rejectTask = useCallback(
    (taskId: string, reason: string) => {
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
      }

      // Notify assignees
      task.assigneeIds.forEach((assigneeId) => {
        if (assigneeId !== currentUser.id) {
          const notif: AppNotification = {
            id: 'notif_' + Date.now() + Math.random(),
            recipientId: assigneeId,
            senderId: currentUser.id,
            type: 'status_change',
            title: `Changes Requested: ${task.code}`,
            body: `${currentUser.name} rejected completion: "${reason}"`,
            timestamp: now,
            read: false,
            taskId,
            chatId: task.sourceChatId,
          };
          setNotifications((prev) => [notif, ...prev]);
        }
      });

      addToast(`Task rejected and moved to In Progress`, 'warning');
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

  // Add Comment to Task
  const addCommentToTask = useCallback(
    (taskId: string, text: string) => {
      if (!text.trim()) return;
      const now = new Date().toISOString();
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

      addToast('Comment added', 'info');
    },
    [currentUser.id, addToast]
  );

  // Create new chat
  const createChat = useCallback(
    (data: { name: string; type: 'direct' | 'group'; participantIds: string[]; department?: Department }) => {
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
      addToast(`Chat "${data.name}" created`, 'success');
      return chatId;
    },
    [currentUser, addToast]
  );

  // Navigation helpers
  const navigateToMessage = useCallback(
    (chatId: string, messageId: string) => {
      setActiveChatId(chatId);
      setActiveMobileTab('chats');
      setHighlightedMessageId(messageId);
      // Auto clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3500);
    },
    []
  );

  const navigateToTask = useCallback(
    (taskId: string) => {
      openTaskDrawer(taskId);
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
        chats,
        activeChatId,
        activeChat,
        setActiveChatId,
        createChat,
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
