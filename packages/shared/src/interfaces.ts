import {
  TenantStatus,
  UserRole,
  UserStatus,
  ConversationType,
  MessageType,
  MessageDeliveryStatus,
  TaskPriority,
  TaskStatusCategory,
  TaskRelationType,
  ExtensionRequestStatus,
  RecurrenceInterval,
  NotificationType,
} from './enums';

export interface ITenant {
  id: string;
  name: string;
  subdomain: string;
  db_name: string;
  db_host: string;
  db_user: string;
  plan: string;
  status: TenantStatus;
  schema_version: number;
  storage_used_bytes: number;
  created_at: Date;
}

export interface ISuperAdmin {
  id: string;
  email: string;
  name: string;
  created_at: Date;
}

export interface IPlan {
  id: string;
  name: string;
  max_users: number;
  storage_limit_bytes: number;
  features: Record<string, any>;
}

export interface IDepartment {
  id: string;
  name: string;
  parent_id?: string | null;
  children?: IDepartment[];
  created_at: Date;
}

export interface IBranch {
  id: string;
  name: string;
  location: string;
  created_at: Date;
}

export interface IDesignation {
  id: string;
  title: string;
  created_at: Date;
}

export interface IUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  department_id?: string | null;
  branch_id?: string | null;
  designation_id?: string | null;
  created_at: Date;
  department?: IDepartment;
  branch?: IBranch;
  designation?: IDesignation;
}

export interface IConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  is_admin: boolean;
  last_read_message_id?: string | null;
  muted: boolean;
  user?: IUser;
  joined_at: Date;
}

export interface IConversation {
  id: string;
  type: ConversationType;
  title?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  department_id?: string | null;
  is_readonly: boolean;
  created_by?: string | null;
  created_at: Date;
  members?: IConversationMember[];
  last_message?: IMessage;
  unread_count?: number;
}

export interface IMessageAttachment {
  name: string;
  url: string;
  size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface IMessage {
  id: string; // UUIDv7
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  content: string;
  attachments?: IMessageAttachment[];
  parent_message_id?: string | null;
  task_id?: string | null;
  delivery_status: MessageDeliveryStatus;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  sender?: IUser;
  parent_message?: IMessage;
  task?: ITask;
}

export interface ITaskStatus {
  id: string;
  name: string;
  category: TaskStatusCategory;
  color: string;
  order: number;
  is_closed: boolean;
}

export interface IChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  order: number;
}

export interface ITaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  attachments?: IMessageAttachment[];
  created_at: Date;
  user?: IUser;
}

export interface ITaskActivity {
  id: string;
  task_id: string;
  actor_id: string;
  action: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  created_at: Date;
  actor?: IUser;
}

export interface ITaskExtensionRequest {
  id: string;
  task_id: string;
  requested_by: string;
  requested_date: Date;
  reason: string;
  status: ExtensionRequestStatus;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at: Date;
  requester?: IUser;
  reviewer?: IUser;
}

export interface ITaskLinkedTask {
  id: string;
  task_id: string;
  linked_task_id: string;
  relation_type: TaskRelationType;
  linked_task?: ITask;
}

export interface ITask {
  id: string;
  title: string;
  description?: string | null;
  creator_id: string;
  status_id: string;
  priority: TaskPriority;
  department_id?: string | null;
  parent_task_id?: string | null;
  source_message_id?: string | null;
  conversation_id?: string | null;
  start_date?: Date | null;
  due_date?: Date | null;
  estimated_hours?: number | null;
  requires_approval: boolean;
  proof_required: boolean;
  proof_attachments?: IMessageAttachment[];
  proof_notes?: string | null;
  recurrence_rule?: string | null;
  labels: string[];
  created_at: Date;
  updated_at: Date;

  creator?: IUser;
  status?: ITaskStatus;
  department?: IDepartment;
  assignees?: IUser[];
  watchers?: IUser[];
  checklist?: IChecklistItem[];
  subtasks?: ITask[];
  comments?: ITaskComment[];
  activities?: ITaskActivity[];
  extension_requests?: ITaskExtensionRequest[];
  linked_tasks?: ITaskLinkedTask[];
}

export interface INotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    task_id?: string;
    conversation_id?: string;
    message_id?: string;
    [key: string]: any;
  };
  is_read: boolean;
  created_at: Date;
}

export interface INotificationPreferences {
  mute_chats: boolean;
  mute_tasks: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // HH:mm
  quiet_hours_end?: string; // HH:mm
  email_notifications: boolean;
  push_notifications: boolean;
}

export interface IAuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}
