import {
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
  completed_by?: string | null;
  completed_at?: Date | null;
  order: number;
}

export interface ITaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  attachments?: any[];
  user?: IUser;
  created_at: Date;
}

export interface ITaskActivity {
  id: string;
  task_id: string;
  actor_id: string;
  action: string;
  field_name?: string | null;
  old_value?: any;
  new_value?: any;
  created_at: Date;
  actor?: IUser;
}

export interface ITaskExtensionRequest {
  id: string;
  task_id: string;
  requester_id: string;
  requested_due_date: Date;
  reason: string;
  status: ExtensionRequestStatus;
  reviewed_by?: string | null;
  reviewed_at?: Date | null;
  reviewer_notes?: string | null;
  created_at: Date;
  requester?: IUser;
}

export interface ITaskLinkedTask {
  id: string;
  task_id: string;
  target_task_id: string;
  relation_type: TaskRelationType;
  target_task?: ITask;
}

export interface ITaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  user?: IUser;
  assigned_at: Date;
}

export interface ITask {
  id: string; // UUIDv7
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
  actual_hours?: number | null;
  requires_approval: boolean;
  proof_required: boolean;
  proof_data?: any;
  is_approved: boolean;
  labels?: string[];
  recurrence_rule?: string | null;
  created_at: Date;
  updated_at: Date;
  creator?: IUser;
  status?: ITaskStatus;
  department?: IDepartment;
  assignees?: ITaskAssignee[];
  watchers?: any[];
  checklists?: IChecklistItem[];
  comments?: ITaskComment[];
  activities?: ITaskActivity[];
  extension_requests?: ITaskExtensionRequest[];
  linked_tasks?: ITaskLinkedTask[];
  subtasks?: ITask[];
}

export interface INotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: Date;
}
