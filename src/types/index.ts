export type Department =
  | 'admin'
  | 'program'
  | 'accounts_and_finance'
  | 'store'
  | 'procurements'
  | 'fund_raising'
  | 'it'
  | 'hr'
  | 'marketing'
  | 'audio_video'
  | 'meal'
  | 'health'
  | 'executive_office'
  | 'ceo'
  | 'internal_audit'
  | 'crd'
  | 'aas_lab'
  // Legacy compatibility fallbacks
  | 'Management'
  | 'Administration'
  | 'Accounts'
  | 'Academics'
  | 'Maintenance'
  | string;

export type UserStatus = 'online' | 'offline' | 'away' | 'busy';

export interface User {
  id: string;
  name: string;
  designation: string;
  department: Department;
  avatar: string; // initials or url
  avatarBg: string; // Tailwind color or hex
  status: UserStatus;
  lastSeen?: string;
  email: string;
  phone?: string;
  role?: string;
  managerId?: string;
  managerName?: string;
  directReportIds?: string[];
}

export type TaskStatus = 'todo' | 'in_progress' | 'under_review' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedById?: number | null;
  completedAt?: string;
  assignedUserId?: number | null;
  movIndex?: number;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: 'image' | 'doc' | 'pdf' | 'spreadsheet';
  url: string;
  size?: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

export interface TaskActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface ProofSubmission {
  photoUrl?: string;
  note: string;
  submittedAt: string;
  submittedBy: string;
}

export interface ApprovalRecord {
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reason?: string;
  reviewedAt?: string;
}

export interface Task {
  id: string;
  code: string; // e.g. "TASK-329"
  title: string;
  description: string;
  department: Department;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string; // ISO or date string
  startDate?: string;
  completedDate?: string;
  assigneeIds: string[];
  reporterIds?: string[];
  progress?: number;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  checklist: ChecklistItem[];
  requiresApproval: boolean;
  approval?: ApprovalRecord;
  proofRequired: boolean;
  proof?: ProofSubmission;
  sourceChatId?: string;
  sourceMessageId?: string;
  attachments: TaskAttachment[];
  comments: TaskComment[];
  activityLog: TaskActivityLog[];
  lastProgressNotes?: string;
  movItems?: string[];
  movAssignments?: Array<{ mov_index: number; user_id: number | null }>;
  rawTask?: any;
}

export type MessageType = 'text' | 'task_card' | 'system' | 'voice' | 'image' | 'document';

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface QuotedMessage {
  id: string;
  senderName: string;
  text: string;
  type: MessageType;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string; // user id or 'system'
  text: string;
  type: MessageType;
  timestamp: string; // ISO
  status: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  replyTo?: QuotedMessage;
  taskId?: string; // If this message is a task_card or spawned a task
  linkedTaskId?: string; // If original message spawned a task
  attachment?: TaskAttachment;
  voiceDuration?: number; // In seconds
  mentions?: string[]; // user IDs
  isEncrypted?: boolean;
  keyVersion?: number;
  isDecrypted?: boolean;
  rawCiphertext?: string;
  readAt?: string;
  readBy?: Record<string, string>;
  deliveredTo?: Record<string, string>;
}

export type ChatType = 'direct' | 'group' | 'channel' | 'announcement';

export interface Chat {
  id: string;
  name: string;
  type: ChatType;
  avatar?: string;
  avatarBg?: string;
  participantIds: string[];
  adminIds: string[];
  department?: Department;
  isReadOnly?: boolean; // For announcements
  isPinned?: boolean;
  linkedTaskId?: string; // Explicit DMS task linked to this conversation
  lastMessage?: {
    text: string;
    timestamp: string;
    senderId: string;
    type?: MessageType;
    status?: 'sent' | 'delivered' | 'read';
    readBy?: Record<string, string>;
    deliveredTo?: Record<string, string>;
  };
  unreadCounts: Record<string, number>; // userId -> count
  description?: string;
}

export type NotificationType = 
  | 'mention'
  | 'new_task'
  | 'status_change'
  | 'approval_request'
  | 'due_soon'
  | 'overdue';

export interface AppNotification {
  id: string;
  recipientId: string;
  senderId: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  chatId?: string;
  messageId?: string;
  taskId?: string;
}

export type ActiveTab = 'chats' | 'tasks' | 'notifications' | 'profile';

export type DeviceView = 'mobile' | 'desktop' | 'responsive';
