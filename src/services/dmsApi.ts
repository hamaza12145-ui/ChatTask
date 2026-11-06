/**
 * DMS (Donor & Task Management System) API Integration Client
 * Single Source of Truth for Users, Departments, and Tasks.
 */

import { User, Task, TaskStatus, TaskPriority, Department, TaskComment, TaskActivityLog, Chat, ChatMessage, AppNotification } from '../types';

export const DMS_BASE_URL =
  (typeof window !== 'undefined' && (window as any).__DMS_API_URL__) ||
  (import.meta as any).env?.VITE_DMS_API_URL ||
  'http://localhost:3000';

// Known default credentials for DMS demo persona accounts
export const DMS_CREDENTIALS: Record<string, string> = {
  'admin@example.com': 'admin%1123',
  'store@example.com': 'store%1123',
  'procurements@example.com': 'procurements%1123',
  'program@example.com': 'program%1123',
  'finance@example.com': 'finance%1123',
  'anjam@example.com': 'admin%1123',
  'raza.ali36@mtjf.org': 'admin%1123',
};

// Department metadata & friendly labels for all official DMS departments
export interface DepartmentMeta {
  id: Department;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const DMS_DEPARTMENTS: DepartmentMeta[] = [
  {
    id: 'admin',
    label: 'Administration',
    description: 'Executive administration, policy, and compliance',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800/80',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
  {
    id: 'program',
    label: 'Program & Operations',
    description: 'Field execution, aid delivery, and welfare programs',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
  },
  {
    id: 'accounts_and_finance',
    label: 'Accounts & Finance',
    description: 'Financial accounting, audits, disbursements, and budgeting',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  {
    id: 'store',
    label: 'Store & Inventory',
    description: 'Inventory management, stock tracking, and warehousing',
    color: 'text-cyan-700 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderColor: 'border-cyan-200 dark:border-cyan-800/50',
  },
  {
    id: 'procurements',
    label: 'Procurements',
    description: 'Vendor procurement, requisition tracking, and purchase orders',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800/50',
  },
  {
    id: 'fund_raising',
    label: 'Fund Raising',
    description: 'Campaigns, donor outreach, and recurring pledges',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40',
    borderColor: 'border-rose-200 dark:border-rose-800/50',
  },
  {
    id: 'it',
    label: 'Information Technology',
    description: 'Software systems, network infrastructure, and DevOps',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderColor: 'border-indigo-200 dark:border-indigo-800/50',
  },
  {
    id: 'hr',
    label: 'Human Resources',
    description: 'Staff recruitment, performance, payroll, and benefits',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800/50',
  },
  {
    id: 'marketing',
    label: 'Marketing & PR',
    description: 'Public relations, social media, and digital campaigns',
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgColor: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    borderColor: 'border-fuchsia-200 dark:border-fuchsia-800/50',
  },
  {
    id: 'crd',
    label: 'Corporate Resource Dev (CRD)',
    description: 'Corporate partnerships, CSR grants, and institutional funding',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/40',
    borderColor: 'border-teal-200 dark:border-teal-800/50',
  },
  {
    id: 'health',
    label: 'Health & Medical',
    description: 'Medical camps, clinics, and health initiatives',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
  {
    id: 'meal',
    label: 'Food & Nutrition (Meal)',
    description: 'Ration distributions, food drives, and nutrition support',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
  },
];

export const getDepartmentMeta = (dept: string): DepartmentMeta => {
  const normalized = dept.toLowerCase().trim();
  const found = DMS_DEPARTMENTS.find((d) => d.id === normalized);
  if (found) return found;

  const prettyLabel = normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    id: normalized as Department,
    label: prettyLabel,
    description: `${prettyLabel} department`,
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800/80',
    borderColor: 'border-slate-200 dark:border-slate-700',
  };
};

export const formatDepartmentName = (dept: string): string => {
  return getDepartmentMeta(dept).label;
};

// Deterministic Tailwind avatar background generator
const AVATAR_BG_COLORS = [
  'bg-emerald-700',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-purple-700',
  'bg-amber-700',
  'bg-teal-700',
  'bg-rose-700',
  'bg-cyan-700',
];

export const getAvatarBg = (id: string | number): string => {
  const num = typeof id === 'number' ? id : parseInt(id, 10) || id.charCodeAt(0) || 0;
  return AVATAR_BG_COLORS[Math.abs(num) % AVATAR_BG_COLORS.length];
};

export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || 'DM').toUpperCase();
};

export const formatUserDesignation = (role: string, department: string): string => {
  const deptMeta = getDepartmentMeta(department);
  switch (role?.toLowerCase()) {
    case 'super_admin':
      return 'Super Administrator';
    case 'admin':
      return 'System Administrator';
    case 'manager':
      return `${deptMeta.label} Manager`;
    case 'dept_head':
      return `${deptMeta.label} Head`;
    case 'user':
    default:
      return `${deptMeta.label} Officer`;
  }
};

// ==========================================
// REAL-TIME DYNAMIC SYNCHRONIZATION TYPES
// ==========================================

export interface DmsSyncChangedFlags {
  users: boolean;
  tasks: boolean;
  conversations: boolean;
  messages: boolean;
  notifications: boolean;
}

export interface DmsSyncPayload {
  users?: User[];
  tasks?: Task[];
  conversations?: Chat[];
  messages?: ChatMessage[];
  notifications?: AppNotification[];
  changed: DmsSyncChangedFlags;
  timestamp: number;
}

export type DmsSyncListener = (payload: DmsSyncPayload) => void;

export interface LiveSyncOptions {
  intervalMs?: number;
  onDelta?: DmsSyncListener;
}

/**
 * Fast change-detection fingerprinting utilities
 */
function computeUsersFingerprint(users: User[]): string {
  return `${users.length}_` + users.map((u) => `${u.id}:${u.name}:${u.department}:${u.role}:${u.status}`).join('|');
}

function computeTasksFingerprint(tasks: Task[]): string {
  return (
    `${tasks.length}_` +
    tasks
      .map(
        (t) =>
          `${t.id}:${t.status}:${t.priority}:${t.updatedAt || ''}:${t.comments?.length || 0}:${t.activityLog?.length || 0}:${t.progress || 0}`
      )
      .join('|')
  );
}

function computeConversationsFingerprint(convs: Chat[]): string {
  return (
    `${convs.length}_` +
    convs
      .map(
        (c) =>
          `${c.id}:${c.lastMessage?.timestamp || ''}:${c.lastMessage?.text || ''}:${Object.entries(c.unreadCounts || {})
            .map(([k, v]) => `${k}=${v}`)
            .join(',')}`
      )
      .join('|')
  );
}

function computeMessagesFingerprint(msgs: ChatMessage[]): string {
  if (msgs.length === 0) return '0_empty';
  const latest = msgs[msgs.length - 1];
  const first = msgs[0];
  const reactionsCount = msgs.reduce((acc, m) => acc + (m.reactions?.length || 0), 0);
  return `${msgs.length}_${first?.id || ''}_${latest?.id || ''}_${latest?.timestamp || ''}_${reactionsCount}`;
}

function computeNotificationsFingerprint(notifs: AppNotification[]): string {
  if (notifs.length === 0) return '0_empty';
  const unreadCount = notifs.filter((n) => !n.read).length;
  return `${notifs.length}_${unreadCount}_${notifs[0]?.id || ''}_${notifs[0]?.read}`;
}

class DmsApiService {
  private token: string | null = null;
  public currentEmail: string | null = null;
  private currentUserId: string = '5';
  private activeChatId: string | null = null;

  // Real-time Dynamic Live Sync infrastructure
  private syncListeners = new Set<DmsSyncListener>();
  private syncTimer: any = null;
  private isLiveSyncActive = false;
  private isSyncing = false;
  private lastSyncTimestamp: number = 0;
  private broadcastChannel: BroadcastChannel | null = null;
  private tickCount: number = 0;

  // Change detection fingerprints
  private lastUsersHash = '';
  private lastTasksHash = '';
  private lastConversationsHash = '';
  private lastMessagesHash = '';
  private lastNotificationsHash = '';

  // Cached data snapshots
  private cachedUsers: User[] = [];
  private cachedTasks: Task[] = [];
  private cachedConversations: Chat[] = [];
  private cachedMessages: ChatMessage[] = [];
  private cachedNotifications: AppNotification[] = [];

  public getCurrentEmail(): string | null {
    return this.currentEmail;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('dms_token');
      this.currentEmail = localStorage.getItem('dms_user_email');
      this.currentUserId = localStorage.getItem('dmstask_persisted_user_id') || '5';

      // Setup Cross-Tab Dynamic Synchronization via BroadcastChannel
      try {
        if ('BroadcastChannel' in window) {
          this.broadcastChannel = new BroadcastChannel('dms_realtime_sync_channel');
          this.broadcastChannel.onmessage = (event) => {
            if (event.data?.type === 'DMS_SYNC_TRIGGER') {
              this.triggerSync(event.data.scope).catch(() => {});
            }
          };
        }
      } catch {
        // BroadcastChannel optional fallback
      }

      // Re-sync immediately on window focus, visibility, and network reconnect
      window.addEventListener('focus', () => {
        if (this.isLiveSyncActive) {
          this.triggerSync().catch(() => {});
        }
      });

      window.addEventListener('online', () => {
        if (this.isLiveSyncActive) {
          this.triggerSync().catch(() => {});
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isLiveSyncActive) {
          this.triggerSync().catch(() => {});
        }
      });
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isLoggedIn(): boolean {
    return Boolean(this.token);
  }

  public setToken(token: string | null, email?: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('dms_token', token);
      } else {
        localStorage.removeItem('dms_token');
      }
      if (email) {
        this.currentEmail = email;
        localStorage.setItem('dms_user_email', email);
      } else if (token === null) {
        this.currentEmail = null;
        localStorage.removeItem('dms_user_email');
      }
    }
    // Invalidate cached hashes to ensure immediate fresh sync
    this.lastUsersHash = '';
    this.lastTasksHash = '';
    this.lastConversationsHash = '';
    this.lastMessagesHash = '';
    this.lastNotificationsHash = '';
    if (token) {
      this.triggerSync('all').catch(() => {});
    }
  }

  /**
   * Broadcast local mutation across all browser tabs and trigger immediate sync
   */
  public broadcastMutation(scope: 'all' | 'messages' | 'tasks' | 'users' | 'conversations' | 'notifications' = 'all') {
    try {
      this.broadcastChannel?.postMessage({ type: 'DMS_SYNC_TRIGGER', scope });
    } catch {}
    // Trigger local immediate sync without waiting for next polling tick
    this.triggerSync(scope).catch(() => {});
  }

  /**
   * Start dynamic real-time live synchronization.
   * Returns an unsubscribe function to stop syncing.
   */
  public startLiveSync(listener?: DmsSyncListener, intervalMs: number = 2500): () => void {
    if (listener) {
      this.syncListeners.add(listener);
    }

    if (this.isLiveSyncActive) {
      // Already running, return unsubscribe for this listener
      return () => {
        if (listener) this.syncListeners.delete(listener);
      };
    }

    this.isLiveSyncActive = true;
    this.tickCount = 0;

    // Trigger initial sync immediately
    this.triggerSync('all').catch(() => {});

    // Schedule periodic adaptive polling
    this.syncTimer = setInterval(() => {
      if (!this.isLiveSyncActive) return;

      // Throttle when page is hidden / backgrounded
      if (typeof document !== 'undefined' && document.hidden) {
        this.tickCount++;
        // Run only every 6 ticks (15s) when tab is hidden
        if (this.tickCount % 6 !== 0) return;
      }

      this.tickCount++;
      const isEvery2Ticks = this.tickCount % 2 === 0; // ~5s
      const isEvery4Ticks = this.tickCount % 4 === 0; // ~10s

      if (isEvery4Ticks) {
        // Users & Directory check
        this.triggerSync('all').catch(() => {});
      } else if (isEvery2Ticks) {
        // Tasks & Notifications check + messages
        this.triggerSync('tasks').then(() => this.triggerSync('messages')).catch(() => {});
      } else {
        // High priority: real-time Messages & Conversations
        this.triggerSync('messages').catch(() => {});
      }
    }, intervalMs);

    return () => {
      if (listener) {
        this.syncListeners.delete(listener);
      }
      if (this.syncListeners.size === 0) {
        this.stopLiveSync();
      }
    };
  }

  public stopLiveSync(): void {
    this.isLiveSyncActive = false;
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  public subscribe(listener: DmsSyncListener): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  public setActiveChatId(chatId: string | null): void {
    this.activeChatId = chatId;
    if (chatId) {
      // Immediately trigger message sync for active chat
      this.triggerSync('messages').catch(() => {});
    }
  }

  public setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  public getSyncStatus(): { isLiveSyncing: boolean; lastSyncTime: number; isConnected: boolean } {
    return {
      isLiveSyncing: this.isLiveSyncActive,
      lastSyncTime: this.lastSyncTimestamp,
      isConnected: Boolean(this.token),
    };
  }

  public getCachedData() {
    return {
      users: this.cachedUsers,
      tasks: this.cachedTasks,
      conversations: this.cachedConversations,
      messages: this.cachedMessages,
      notifications: this.cachedNotifications,
      lastSyncTimestamp: this.lastSyncTimestamp,
    };
  }

  /**
   * Execute an immediate sync cycle for specified scope or all entities
   */
  public async triggerSync(
    scope: 'all' | 'messages' | 'tasks' | 'users' | 'conversations' | 'notifications' = 'all'
  ): Promise<DmsSyncPayload | null> {
    if (this.isSyncing) return null;
    if (!this.token) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('dms_token') : null;
      if (!stored) return null;
      this.token = stored;
    }

    this.isSyncing = true;
    try {
      const shouldFetchAll = scope === 'all';
      const shouldFetchMessages = shouldFetchAll || scope === 'messages';
      const shouldFetchTasks = shouldFetchAll || scope === 'tasks';
      const shouldFetchConvs = shouldFetchAll || scope === 'conversations' || scope === 'messages';
      const shouldFetchUsers = shouldFetchAll || scope === 'users';
      const shouldFetchNotifs = shouldFetchAll || scope === 'notifications';

      const promises: [
        Promise<User[] | null>,
        Promise<Task[] | null>,
        Promise<Chat[] | null>,
        Promise<ChatMessage[] | null>,
        Promise<AppNotification[] | null>,
      ] = [
        shouldFetchUsers ? this.fetchUsers().catch(() => null) : Promise.resolve(null),
        shouldFetchTasks ? this.fetchTasks().catch(() => null) : Promise.resolve(null),
        shouldFetchConvs ? this.fetchConversations(this.currentUserId).catch(() => null) : Promise.resolve(null),
        shouldFetchMessages ? this.fetchMessages(undefined, 2000, this.currentUserId).catch(() => null) : Promise.resolve(null),
        shouldFetchNotifs ? this.fetchNotifications(this.currentUserId).catch(() => null) : Promise.resolve(null),
      ];

      const [newUsers, newTasks, newConvs, newMsgs, newNotifs] = await Promise.all(promises);

      let usersChanged = false;
      let tasksChanged = false;
      let convsChanged = false;
      let msgsChanged = false;
      let notifsChanged = false;

      if (newUsers && newUsers.length > 0) {
        const hash = computeUsersFingerprint(newUsers);
        if (hash !== this.lastUsersHash) {
          this.lastUsersHash = hash;
          this.cachedUsers = newUsers;
          usersChanged = true;
        }
      }

      if (newTasks) {
        const hash = computeTasksFingerprint(newTasks);
        if (hash !== this.lastTasksHash) {
          this.lastTasksHash = hash;
          this.cachedTasks = newTasks;
          tasksChanged = true;
        }
      }

      if (newConvs) {
        const hash = computeConversationsFingerprint(newConvs);
        if (hash !== this.lastConversationsHash) {
          this.lastConversationsHash = hash;
          this.cachedConversations = newConvs;
          convsChanged = true;
        }
      }

      if (newMsgs) {
        const hash = computeMessagesFingerprint(newMsgs);
        if (hash !== this.lastMessagesHash) {
          this.lastMessagesHash = hash;
          this.cachedMessages = newMsgs;
          msgsChanged = true;
        }
      }

      if (newNotifs) {
        const hash = computeNotificationsFingerprint(newNotifs);
        if (hash !== this.lastNotificationsHash) {
          this.lastNotificationsHash = hash;
          this.cachedNotifications = newNotifs;
          notifsChanged = true;
        }
      }

      this.lastSyncTimestamp = Date.now();

      if (usersChanged || tasksChanged || convsChanged || msgsChanged || notifsChanged) {
        const payload: DmsSyncPayload = {
          users: usersChanged ? this.cachedUsers : undefined,
          tasks: tasksChanged ? this.cachedTasks : undefined,
          conversations: convsChanged ? this.cachedConversations : undefined,
          messages: msgsChanged ? this.cachedMessages : undefined,
          notifications: notifsChanged ? this.cachedNotifications : undefined,
          changed: {
            users: usersChanged,
            tasks: tasksChanged,
            conversations: convsChanged,
            messages: msgsChanged,
            notifications: notifsChanged,
          },
          timestamp: this.lastSyncTimestamp,
        };

        this.syncListeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error('Error in DMS sync listener:', e);
          }
        });

        return payload;
      }

      return null;
    } catch (err: any) {
      console.warn('Background sync error:', err?.message);
      return null;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Logout from DMS and clear all session data
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${DMS_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.token}`,
          },
        }).catch(() => {});
      }
    } finally {
      this.setToken(null, undefined);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dms_token');
        localStorage.removeItem('dms_user_email');
        localStorage.removeItem('dmstask_persisted_user_id');
        localStorage.removeItem('dmstask_is_authenticated');
      }
    }
  }

  /**
   * Login to DMS with credentials
   */
  async login(email: string, password?: string): Promise<{ token: string; user: any }> {
    const pwd = password || DMS_CREDENTIALS[email] || 'admin%1123';
    const response = await fetch(`${DMS_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pwd }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message || 'Authentication with DMS failed');
    }

    const data = await response.json();
    const user = data.user || {};
    if (!user.name) {
      user.name = user.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : (user.email ? user.email.split('@')[0] : 'User');
    }
    this.setToken(data.token, email);
    return { token: data.token, user };
  }

  /**
   * Ensure the API client is authenticated.
   * If a specific user email is requested, login as that user.
   */
  async ensureAuthenticated(preferredEmail?: string): Promise<string> {
    if (this.token) {
      if (!preferredEmail || this.currentEmail === preferredEmail) {
        return this.token;
      }
    }

    const targetEmail = preferredEmail || this.currentEmail || 'admin@example.com';
    try {
      const { token } = await this.login(targetEmail);
      return token;
    } catch {
      // Fallback to admin login
      if (targetEmail !== 'admin@example.com') {
        const { token } = await this.login('admin@example.com');
        return token;
      }
      throw new Error('Unable to authenticate with DMS APIs');
    }
  }

  /**
   * Authorized request helper
   */
  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let token = this.getToken();
    if (!token) {
      token = await this.ensureAuthenticated();
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as any),
    };

    if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let url = endpoint.startsWith('http') ? endpoint : `${DMS_BASE_URL}${endpoint}`;
    let response = await fetch(url, { ...options, headers });

    // Handle session expiration
    if (response.status === 401) {
      token = await this.ensureAuthenticated('admin@example.com');
      headers['Authorization'] = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers });
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || `DMS API error: ${response.status}`);
    }

    return response.json();
  }

  // ==========================================
  // USERS & DEPARTMENTS API
  // ==========================================

  /**
   * Fetch all registered DMS users from DMS API
   */
  async fetchUsers(): Promise<User[]> {
    let dmsUsers: any[] = [];

    // 1. First try /chat/users (accessible to all authenticated team members)
    try {
      const chatRes = await this.request<{ success?: boolean; data: any[] }>('/chat/users').catch(() => null);
      if (chatRes && Array.isArray(chatRes.data) && chatRes.data.length > 0) {
        dmsUsers = chatRes.data;
      }
    } catch {}

    // 2. Fallback to /users
    if (dmsUsers.length === 0) {
      try {
        const res = await this.request<{ success?: boolean; data: any[] }>('/users?page=1&pageSize=100');
        dmsUsers = res.data || [];
      } catch (err: any) {
        console.warn('Could not list users from /users:', err?.message);
        if (this.cachedUsers.length > 0) {
          return this.cachedUsers;
        }
        return [];
      }
    }

    return dmsUsers.map((u: any): User => {
      const rawFullName =
        [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
        (u.name && u.name.trim()) ||
        (u.email ? u.email.split('@')[0] : `User #${u.id}`);
      const fullName = capitalizeWords(rawFullName);

      const dept = (u.department_id || u.department || 'admin').toLowerCase() as Department;

      // Find reporting manager details from DMS users
      const managerUser = u.manager_id ? dmsUsers.find((m: any) => Number(m.id) === Number(u.manager_id)) : null;
      const managerName = managerUser
        ? capitalizeWords(
            [managerUser.first_name, managerUser.last_name].filter(Boolean).join(' ').trim() ||
              managerUser.email.split('@')[0]
          )
        : undefined;

      // Find direct reports from user relationships
      const directReports = dmsUsers
        .filter((d: any) => Number(d.manager_id) === Number(u.id))
        .map((d: any) => String(d.id));

      return {
        id: String(u.id),
        name: fullName,
        designation: formatUserDesignation(u.role, dept),
        department: dept,
        avatar: getInitials(fullName),
        avatarBg: getAvatarBg(u.id),
        status: u.isActive !== false ? 'online' : 'offline',
        email: u.email || '',
        phone: u.phone || undefined,
        role: u.role || 'user',
        managerId: u.manager_id ? String(u.manager_id) : undefined,
        managerName,
        directReportIds: directReports.length > 0 ? directReports : undefined,
      };
    });
  }

  /**
   * Fetch a single user by ID from DMS
   */
  async fetchUserById(id: string | number): Promise<User | null> {
    try {
      const u = await this.request<any>(`/users/${id}`);
      if (!u) return null;
      const rawFullName =
        [u.first_name, u.last_name].filter(Boolean).join(' ').trim() ||
        (u.email ? u.email.split('@')[0] : `User #${u.id}`);
      const fullName = capitalizeWords(rawFullName);
      const dept = (u.department || 'admin').toLowerCase() as Department;

      return {
        id: String(u.id),
        name: fullName,
        designation: formatUserDesignation(u.role, dept),
        department: dept,
        avatar: getInitials(fullName),
        avatarBg: getAvatarBg(u.id),
        status: u.isActive !== false ? 'online' : 'offline',
        email: u.email || '',
        phone: u.phone || undefined,
        role: u.role || 'user',
        managerId: u.manager_id ? String(u.manager_id) : undefined,
      };
    } catch {
      return null;
    }
  }

  // ==========================================
  // TASKS API
  // ==========================================

  /**
   * Convert DMS task status string to ChatTask TaskStatus
   */
  mapDmsStatusToApp(status: string): TaskStatus {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'draft':
        return 'todo';
      case 'in_progress':
        return 'in_progress';
      case 'pending_approval':
        return 'under_review';
      case 'blocked':
        return 'blocked';
      case 'completed':
      case 'closed':
      case 'approved':
        return 'completed';
      default:
        return 'todo';
    }
  }

  /**
   * Convert ChatTask TaskStatus to DMS task status string
   */
  mapAppStatusToDms(status: TaskStatus): string {
    switch (status) {
      case 'todo':
        return 'open';
      case 'in_progress':
        return 'in_progress';
      case 'under_review':
        return 'pending_approval';
      case 'completed':
        return 'completed';
      case 'blocked':
        return 'blocked';
      default:
        return 'open';
    }
  }

  /**
   * Convert DMS priority to ChatTask TaskPriority
   */
  mapDmsPriorityToApp(priority: string): TaskPriority {
    switch (priority?.toLowerCase()) {
      case 'low':
        return 'low';
      case 'medium':
        return 'medium';
      case 'high':
        return 'high';
      case 'critical':
      case 'urgent':
        return 'urgent';
      default:
        return 'medium';
    }
  }

  /**
   * Convert ChatTask TaskPriority to DMS priority
   */
  mapAppPriorityToDms(priority: TaskPriority | string): string {
    switch (priority) {
      case 'urgent':
        return 'critical';
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      case 'medium':
      default:
        return 'medium';
    }
  }

  /**
   * Fetch all tasks from DMS API
   */
  async fetchTasks(): Promise<Task[]> {
    const res = await this.request<{ success?: boolean; data: any[] }>('/tasks/list?page=1&pageSize=100');
    const dmsTasks = res.data || [];

    return dmsTasks.map((t: any): Task => {
      const code = `TASK-${t.id}`;
      const status = this.mapDmsStatusToApp(t.status);
      const priority = this.mapDmsPriorityToApp(t.priority);
      const dept = (t.department || 'admin').toLowerCase() as Department;

      // Map comments
      const comments: TaskComment[] = (t.comments || []).map((c: any) => ({
        id: String(c.id),
        userId: String(c.author?.id || c.created_by_id || c.user_id || '5'),
        text: c.content || c.comment || '',
        createdAt: c.created_at || new Date().toISOString(),
      }));

      // Map activities
      const activityLog: TaskActivityLog[] = (t.activities || []).map((a: any) => ({
        id: String(a.id),
        userId: String(a.performed_by?.id || a.user_id || '5'),
        action: a.action || 'Updated task',
        timestamp: a.created_at || new Date().toISOString(),
        details: typeof a.details === 'object' ? JSON.stringify(a.details) : String(a.details || ''),
      }));

      // Map attachments
      const attachments = (t.attachments || []).map((att: any) => ({
        id: String(att.id),
        name: att.file_name || 'attachment',
        type: (att.file_type?.includes('image') ? 'image' : 'doc') as any,
        url: att.file_url || '',
      }));

      // Map checklist items from mov_items
      const checklist = (t.mov_items || []).map((item: string, idx: number) => ({
        id: `chk_${t.id}_${idx}`,
        title: item,
        completed: false,
      }));

      const assigneeIds = (t.assigned_user_ids || []).map(String);
      const reporterIds = Array.isArray(t.reported_to_ids)
        ? t.reported_to_ids.map(String)
        : Array.isArray(t.reported_to)
        ? t.reported_to.map(String)
        : t.reported_to_id != null
        ? [String(t.reported_to_id)]
        : [];

      return {
        id: String(t.id),
        code,
        title: t.title || `Task #${t.id}`,
        description: t.description || '',
        department: dept,
        status,
        priority,
        dueDate: t.due_date ? String(t.due_date) : t.created_at || new Date().toISOString(),
        startDate: t.start_date ? String(t.start_date) : undefined,
        completedDate: t.completed_date ? String(t.completed_date) : undefined,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : ['1'],
        reporterIds: reporterIds.length > 0 ? reporterIds : undefined,
        progress: typeof t.progress === 'number' ? t.progress : 0,
        creatorId: String(t.created_by_id || '5'),
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.updated_at || new Date().toISOString(),
        checklist,
        requiresApproval: t.workflow_type === 'approval_required',
        approval: t.approved_by_id?.length
          ? {
              status: 'approved',
              reviewedBy: String(t.approved_by_id[0]),
              reviewedAt: t.updated_at,
            }
          : undefined,
        proofRequired: Boolean(t.proof_required || (t.mov_items && t.mov_items.length > 0)),
        attachments,
        comments,
        activityLog,
      };
    });
  }

  /**
   * Fetch a single task by ID from DMS
   */
  async fetchTaskById(id: string | number): Promise<Task | null> {
    try {
      const res = await this.request<{ success?: boolean; data: any }>(`/tasks/${id}`);
      const t = res.data;
      if (!t) return null;

      const code = `TASK-${t.id}`;
      const status = this.mapDmsStatusToApp(t.status);
      const priority = this.mapDmsPriorityToApp(t.priority);
      const dept = (t.department || 'admin').toLowerCase() as Department;

      const comments: TaskComment[] = (t.comments || []).map((c: any) => ({
        id: String(c.id),
        userId: String(c.author?.id || c.created_by_id || c.user_id || '5'),
        text: c.content || c.comment || '',
        createdAt: c.created_at || new Date().toISOString(),
      }));

      const activityLog: TaskActivityLog[] = (t.activities || []).map((a: any) => ({
        id: String(a.id),
        userId: String(a.performed_by?.id || a.user_id || '5'),
        action: a.action || 'Updated task',
        timestamp: a.created_at || new Date().toISOString(),
      }));

      const attachments = (t.attachments || []).map((att: any) => ({
        id: String(att.id),
        name: att.file_name || 'attachment',
        type: (att.file_type?.includes('image') ? 'image' : 'doc') as any,
        url: att.file_url || '',
      }));

      const checklist = (t.mov_items || []).map((item: string, idx: number) => ({
        id: `chk_${t.id}_${idx}`,
        title: item,
        completed: false,
      }));

      const assigneeIds = (t.assigned_user_ids || []).map(String);
      const reporterIds = Array.isArray(t.reported_to_ids)
        ? t.reported_to_ids.map(String)
        : Array.isArray(t.reported_to)
        ? t.reported_to.map(String)
        : t.reported_to_id != null
        ? [String(t.reported_to_id)]
        : [];

      return {
        id: String(t.id),
        code,
        title: t.title || `Task #${t.id}`,
        description: t.description || '',
        department: dept,
        status,
        priority,
        dueDate: t.due_date ? String(t.due_date) : t.created_at || new Date().toISOString(),
        startDate: t.start_date ? String(t.start_date) : undefined,
        completedDate: t.completed_date ? String(t.completed_date) : undefined,
        assigneeIds: assigneeIds.length > 0 ? assigneeIds : ['1'],
        reporterIds: reporterIds.length > 0 ? reporterIds : undefined,
        progress: typeof t.progress === 'number' ? t.progress : 0,
        creatorId: String(t.created_by_id || '5'),
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.updated_at || new Date().toISOString(),
        checklist,
        requiresApproval: t.workflow_type === 'approval_required',
        proofRequired: Boolean(t.proof_required || (t.mov_items && t.mov_items.length > 0)),
        attachments,
        comments,
        activityLog,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a new task in DMS through its API
   */
  async createTask(data: {
    title: string;
    description?: string;
    department: Department | string;
    priority: TaskPriority | string;
    dueDate: string;
    startDate?: string;
    assigneeIds: string[];
    requiresApproval?: boolean;
    checklistTitles?: string[];
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
  }): Promise<Task> {
    const assignedUsers = data.assigneeIds.map((id) => parseInt(String(id), 10)).filter((n) => !isNaN(n) && n > 0);
    const dmsPriority = this.mapAppPriorityToDms(data.priority);
    const dmsDept = data.department.toLowerCase();

    // Format due_date and start_date to YYYY-MM-DD
    let dueDateFormatted = data.dueDate;
    if (data.dueDate && data.dueDate.includes('T')) {
      dueDateFormatted = data.dueDate.split('T')[0];
    }
    let startDateFormatted = data.startDate;
    if (data.startDate && data.startDate.includes('T')) {
      startDateFormatted = data.startDate.split('T')[0];
    }

    const movChecklist = data.movChecklist || (data.checklistTitles || []).map((text) => ({
      text,
      checked: false,
      checked_by_id: null,
      checked_at: null,
    }));

    const payload: any = {
      title: data.title,
      description: data.description || '',
      department: dmsDept,
      priority: dmsPriority,
      start_date: startDateFormatted || undefined,
      due_date: dueDateFormatted,
      assigned_users: assignedUsers.length > 0 ? assignedUsers : [1],
      assigned_users_meta: data.assignedUsersMeta,
      workflow_type: data.workflowType || (data.requiresApproval ? 'approval_required' : 'standard'),
      task_type: data.taskType || 'one_time',
      project_name: data.projectName || undefined,
      recurrence_rule: data.recurrenceRule || undefined,
      recurrence_next_date: data.recurrenceNextDate || undefined,
      recurrence_end_type: data.recurrenceEndType || undefined,
      recurrence_end_date: data.recurrenceEndDate || undefined,
      recurrence_end_occurrences: data.recurrenceEndOccurrences ? Number(data.recurrenceEndOccurrences) : undefined,
      approval_required: data.workflowType === 'approval_required' || !!data.requiresApproval,
      approval_required_user_ids: data.approvalRequiredUserIds,
      mov_checklist: movChecklist,
      mov_assignments: data.movAssignments,
      mov_items: data.movChecklist ? data.movChecklist.map((m) => m.text) : (data.checklistTitles || []),
    };

    const res = await this.request<{ success?: boolean; data: any }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const created = res.data;
    const task = await this.fetchTaskById(created.id);
    if (!task) {
      throw new Error('Failed to retrieve created task from DMS');
    }
    this.broadcastMutation('tasks');
    return task;
  }

  /**
   * Upload an attachment for a task
   */
  async uploadTaskAttachment(
    taskId: string | number,
    file: File,
    name?: string,
    isInitial = true
  ): Promise<any> {
    const id = parseInt(String(taskId), 10);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('is_initial', isInitial ? 'true' : 'false');
    if (name) {
      formData.append('description', name);
      formData.append('name', name);
    }
    return this.request(`/tasks/${id}/attachments/upload`, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Approve or reject a task in DMS approval workflow
   */
  async approveTask(taskId: string, approve: boolean, note?: string): Promise<Task> {
    const id = parseInt(taskId, 10);
    await this.request(`/tasks/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        approve,
        note: note || (approve ? 'Approved in Chat' : 'Rejected in Chat'),
      }),
    });
    const updated = await this.fetchTaskById(taskId);
    if (!updated) {
      throw new Error(`Failed to retrieve task #${taskId} after approval`);
    }
    this.broadcastMutation('tasks');
    return updated;
  }

  /**
   * Update task status in DMS
   */
  async updateTaskStatus(taskId: string, newStatus: TaskStatus, notes?: string): Promise<Task> {
    const id = parseInt(taskId, 10);
    if (isNaN(id)) {
      throw new Error(`Invalid task ID: ${taskId}`);
    }

    const currentTask = await this.fetchTaskById(taskId);
    const oldDmsStatus = currentTask ? this.mapAppStatusToDms(currentTask.status) : 'open';
    const targetDmsStatus = this.mapAppStatusToDms(newStatus);

    if (oldDmsStatus === targetDmsStatus && currentTask) {
      return currentTask;
    }

    // DMS status transition rules:
    // 1. in_progress -> pending_approval: DMS requires transitioning in_progress -> completed first,
    //    and then completed -> pending_approval
    if (oldDmsStatus === 'in_progress' && targetDmsStatus === 'pending_approval') {
      try {
        await this.request(`/tasks/${id}/status-transition`, {
          method: 'POST',
          body: JSON.stringify({
            status: 'completed',
            force_complete: true,
            notes: notes || 'Work completed, submitting for approval',
          }),
        });
      } catch {
        await this.request(`/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        }).catch(() => {});
      }

      try {
        await this.request(`/tasks/${id}/status-transition`, {
          method: 'POST',
          body: JSON.stringify({
            status: 'pending_approval',
            notes: notes || 'Submitted for approval',
          }),
        });
      } catch {
        await this.request(`/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'pending_approval' }),
        }).catch(() => {});
      }
    } else if (targetDmsStatus === 'completed' && currentTask?.status === 'under_review') {
      // Approving from review: try approve endpoint first
      try {
        await this.approveTask(taskId, true, notes || 'Approved via Chat');
      } catch {
        await this.request(`/tasks/${id}/status-transition`, {
          method: 'POST',
          body: JSON.stringify({
            status: 'completed',
            force_complete: true,
            notes: notes || 'Approved and completed',
          }),
        }).catch(async () => {
          await this.request(`/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' }),
          });
        });
      }
    } else {
      // Direct status transition
      try {
        await this.request(`/tasks/${id}/status-transition`, {
          method: 'POST',
          body: JSON.stringify({
            status: targetDmsStatus,
            force_complete: true,
            notes: notes || `Status changed to ${newStatus} via ChatTask`,
          }),
        });
      } catch (err: any) {
        // Fallback to direct PATCH
        try {
          await this.request(`/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: targetDmsStatus }),
          });
        } catch (patchErr: any) {
          console.warn(`DMS status update error on task #${taskId}:`, patchErr?.message);
          throw patchErr;
        }
      }
    }

    const updated = await this.fetchTaskById(taskId);
    this.broadcastMutation('tasks');
    return updated || currentTask!;
  }

  /**
   * Add comment to a DMS task
   */
  async addTaskComment(taskId: string, text: string): Promise<TaskComment> {
    const id = parseInt(taskId, 10);
    const res = await this.request<{ success?: boolean; data: any }>(`/tasks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: text }),
    });

    const c = res.data;
    this.broadcastMutation('tasks');
    return {
      id: String(c.id),
      userId: String(c.author?.id || '5'),
      text: c.content || text,
      createdAt: c.created_at || new Date().toISOString(),
    };
  }

  // ==========================================
  // CHAT & CONVERSATIONS API
  // ==========================================

  /**
   * Fetch all persistent chat conversations from ERP-Task backend
   */
  async fetchConversations(userId?: string): Promise<Chat[]> {
    try {
      const activeUid = userId || this.currentUserId;
      const endpoint = activeUid ? `/chat/conversations?userId=${activeUid}` : '/chat/conversations';
      const res = await this.request<{ success?: boolean; data: any[] }>(endpoint);
      const convs = res.data || [];
      return convs.map((c: any): Chat => ({
        id: c.id,
        name: c.name,
        type: c.type || 'group',
        avatarBg: c.avatarBg || 'bg-slate-700',
        participantIds: (c.participantIds || []).map(String),
        adminIds: (c.adminIds || []).map(String),
        department: c.department || undefined,
        linkedTaskId: c.linkedTaskId || undefined,
        isPinned: Boolean(c.isPinned),
        description: c.description || undefined,
        lastMessage: c.lastMessage || undefined,
        unreadCounts: c.unreadCounts || {},
      }));
    } catch (err: any) {
      console.warn('Failed to fetch conversations:', err?.message);
      return [];
    }
  }

  /**
   * Create or update a conversation in ERP-Task backend
   */
  async saveConversation(chat: Partial<Chat>): Promise<Chat> {
    const res = await this.request<{ success?: boolean; data: any }>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(chat),
    });
    this.broadcastMutation('conversations');
    return res.data;
  }

  /**
   * Fetch persistent chat messages from ERP-Task backend
   */
  async fetchMessages(chatId?: string, limit: number = 2000, userId?: string): Promise<ChatMessage[]> {
    try {
      const activeUid = userId || this.currentUserId;
      let endpoint = chatId ? `/chat/messages/${chatId}?limit=${limit}` : `/chat/messages?limit=${limit}`;
      if (!chatId && activeUid) {
        endpoint += `&userId=${activeUid}`;
      }
      const res = await this.request<{ success?: boolean; data: any[] }>(endpoint);
      const msgs = res.data || [];
      return msgs.map((m: any): ChatMessage => ({
        id: m.id,
        chatId: m.chatId,
        senderId: String(m.senderId),
        text: m.text || '',
        rawCiphertext: (m.text && typeof m.text === 'string' && m.text.startsWith('e2ee:v1:')) ? m.text : undefined,
        type: m.type || 'text',
        timestamp: m.timestamp || new Date().toISOString(),
        status: m.status || 'sent',
        readAt: m.readAt || undefined,
        readBy: m.readBy || undefined,
        deliveredTo: m.deliveredTo || undefined,
        replyTo: m.replyTo || undefined,
        attachment: m.attachment || undefined,
        voiceDuration: m.voiceDuration ?? undefined,
        taskId: m.taskId ? String(m.taskId) : undefined,
        linkedTaskId: m.linkedTaskId ? String(m.linkedTaskId) : undefined,
        mentions: m.mentions || undefined,
        reactions: m.reactions || [],
        isEncrypted: Boolean(m.isEncrypted || m.is_encrypted),
        keyVersion: m.keyVersion || m.key_version || 1,
      }));
    } catch (err: any) {
      console.warn('Failed to fetch messages from DMS:', err?.message);
      return [];
    }
  }

  /**
   * Persist a new chat message to ERP-Task database
   */
  async sendChatMessage(msg: Partial<ChatMessage>): Promise<ChatMessage> {
    const res = await this.request<{ success?: boolean; data: any }>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        ...msg,
        status: msg.status || 'sent',
        isEncrypted: msg.isEncrypted ?? false,
        keyVersion: msg.keyVersion ?? 1,
      }),
    });
    this.broadcastMutation('messages');
    const m = res.data;
    return {
      id: m.id,
      chatId: m.chatId,
      senderId: String(m.senderId),
      text: m.text || '',
      type: m.type || 'text',
      timestamp: m.timestamp,
      status: m.status || 'sent',
      readAt: m.readAt || undefined,
      readBy: m.readBy || undefined,
      deliveredTo: m.deliveredTo || undefined,
      replyTo: m.replyTo,
      attachment: m.attachment,
      voiceDuration: m.voiceDuration,
      taskId: m.taskId,
      linkedTaskId: m.linkedTaskId,
      mentions: m.mentions,
      reactions: m.reactions || [],
      isEncrypted: Boolean(m.isEncrypted || m.is_encrypted),
      keyVersion: m.keyVersion || m.key_version || 1,
    };
  }

  // ==========================================
  // END-TO-END ENCRYPTION (E2EE) API
  // ==========================================

  /**
   * Publish user's public identity key to backend
   */
  async publishIdentityKey(
    userId: string,
    publicKey: string,
    keyType: string = 'RSA-OAEP',
    encryptedPrivateKey?: string,
    salt?: string
  ): Promise<void> {
    await this.request('/chat/keys/identity', {
      method: 'POST',
      body: JSON.stringify({ userId, publicKey, keyType, encryptedPrivateKey, salt }),
    });
  }

  /**
   * Fetch complete identity record for a user (including client-encrypted private key)
   */
  async fetchUserIdentityRecord(userId: string): Promise<any | null> {
    try {
      const res = await this.request<{ success: boolean; data: any }>(`/chat/keys/identity/${userId}`);
      return res?.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch public identity key for a user
   */
  async fetchUserPublicKey(userId: string): Promise<string | null> {
    try {
      const res = await this.request<{ success: boolean; data: any }>(`/chat/keys/identity/${userId}`);
      return res?.data?.public_key || null;
    } catch {
      return null;
    }
  }

  /**
   * Batch fetch public keys for multiple users
   */
  async fetchUsersPublicKeys(userIds: string[]): Promise<Record<string, string>> {
    try {
      const res = await this.request<{ success: boolean; data: Record<string, string> }>('/chat/keys/identities', {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      });
      return res?.data || {};
    } catch {
      return {};
    }
  }

  /**
   * Distribute conversation key bundles to authorized participants
   */
  async publishKeyBundle(
    conversationId: string,
    keyVersion: number,
    bundles: Array<{ userId: string; encryptedKey: string }>
  ): Promise<void> {
    await this.request('/chat/keys/bundle', {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        keyVersion,
        bundles,
      }),
    });
  }

  /**
   * Fetch conversation key bundle for user
   */
  async fetchConversationKeyBundle(conversationId: string, version?: number, userId?: string): Promise<any | null> {
    try {
      const queryParams = new URLSearchParams();
      if (version) queryParams.set('version', String(version));
      if (userId) queryParams.set('userId', String(userId));
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const res = await this.request<{ success: boolean; data: any }>(`/chat/keys/bundle/${conversationId}${qs}`);
      return res?.data || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch all conversation key bundles for current user
   */
  async fetchAllKeyBundles(): Promise<any[]> {
    try {
      const res = await this.request<{ success: boolean; data: any[] }>('/chat/keys/bundles');
      return res?.data || [];
    } catch {
      return [];
    }
  }

  /**
   * React to a message in ERP-Task database
   */
  async reactToChatMessage(messageId: string, emoji: string, userId: string): Promise<ChatMessage> {
    const res = await this.request<{ success?: boolean; data: any }>(`/chat/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji, userId }),
    });
    this.broadcastMutation('messages');
    return res.data;
  }

  /**
   * Mark a message as read in ERP-Task database
   */
  async markChatMessageRead(messageId: string): Promise<ChatMessage | null> {
    const res = await this.request<{ success?: boolean; data: any }>(`/chat/messages/${messageId}/read`, {
      method: 'PATCH',
    });
    this.broadcastMutation('messages');
    return res.data;
  }

  /**
   * Mark an entire conversation as read by the specified user
   * Resets unread counter in task_db and marks messages as read
   */
  async markConversationRead(conversationId: string, userId?: string): Promise<{ success: boolean; readCount?: number }> {
    try {
      const activeUid = userId || this.currentUserId;
      const res = await this.request<{ success: boolean; readCount?: number }>(
        `/chat/conversations/${conversationId}/read`,
        {
          method: 'POST',
          body: JSON.stringify({ userId: activeUid }),
        }
      );
      this.broadcastMutation('messages');
      this.broadcastMutation('conversations');
      return res;
    } catch (err: any) {
      console.warn('Failed to mark conversation read:', err?.message);
      return { success: false };
    }
  }

  /**
   * Mark conversation messages as delivered to the specified user
   */
  async markConversationDelivered(conversationId: string, userId?: string): Promise<{ success: boolean; deliveredCount?: number }> {
    try {
      const activeUid = userId || this.currentUserId;
      const res = await this.request<{ success: boolean; deliveredCount?: number }>(
        `/chat/conversations/${conversationId}/delivered`,
        {
          method: 'POST',
          body: JSON.stringify({ userId: activeUid }),
        }
      );
      this.broadcastMutation('messages');
      return res;
    } catch (err: any) {
      console.warn('Failed to mark conversation delivered:', err?.message);
      return { success: false };
    }
  }

  // ==========================================
  // NOTIFICATIONS API (PERSISTED IN task_db)
  // ==========================================

  /**
   * Fetch notifications for a user from task_db
   */
  async fetchNotifications(userId?: string): Promise<AppNotification[]> {
    try {
      const endpoint = userId ? `/chat/notifications?userId=${userId}` : '/chat/notifications';
      const res = await this.request<{ success?: boolean; data: any[] }>(endpoint);
      const notifs = res.data || [];
      return notifs.map((n: any): AppNotification => ({
        id: String(n.id),
        recipientId: String(n.recipientId || userId || '5'),
        senderId: String(n.senderId || 'system'),
        type: n.type || 'mention',
        title: n.title || 'Notification',
        body: n.body || '',
        timestamp: n.timestamp || new Date().toISOString(),
        read: Boolean(n.read),
        chatId: n.chatId || undefined,
        messageId: n.messageId || undefined,
        taskId: n.taskId ? String(n.taskId) : undefined,
      }));
    } catch (err: any) {
      console.warn('Failed to fetch notifications from task_db:', err?.message);
      return [];
    }
  }

  /**
   * Create and persist a notification in task_db
   */
  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification> {
    const res = await this.request<{ success?: boolean; data: any }>('/chat/notifications', {
      method: 'POST',
      body: JSON.stringify(notif),
    });
    this.broadcastMutation('notifications');
    const n = res.data;
    return {
      id: String(n.id),
      recipientId: String(n.recipientId),
      senderId: String(n.senderId),
      type: n.type,
      title: n.title,
      body: n.body,
      timestamp: n.timestamp,
      read: Boolean(n.read),
      chatId: n.chatId,
      messageId: n.messageId,
      taskId: n.taskId,
    };
  }

  /**
   * Mark a notification as read in task_db
   */
  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await this.request(`/chat/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      this.broadcastMutation('notifications');
    } catch (err: any) {
      console.warn('Failed to mark notification read in task_db:', err?.message);
    }
  }

  /**
   * Mark all notifications as read for a user in task_db
   */
  async markAllNotificationsRead(userId?: string): Promise<void> {
    try {
      await this.request('/chat/notifications/mark-all-read', {
        method: 'POST',
        body: JSON.stringify({ userId: userId || '5' }),
      });
      this.broadcastMutation('notifications');
    } catch (err: any) {
      console.warn('Failed to mark all notifications read in task_db:', err?.message);
    }
  }
}

export const dmsApi = new DmsApiService();
