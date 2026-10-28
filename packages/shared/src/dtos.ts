import {
  UserRole,
  ConversationType,
  MessageType,
  TaskPriority,
  TaskStatusCategory,
  TaskRelationType,
  ExtensionRequestStatus,
  RecurrenceInterval,
} from './enums';
import { IMessageAttachment } from './interfaces';

// Auth DTOs
export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar_url?: string | null;
    department_id?: string | null;
    department?: any;
    designation?: any;
  };
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

export interface RefreshTokenRequestDto {
  refresh_token: string;
}

export interface SuperAdminLoginRequestDto {
  email: string;
  password: string;
}

export interface SuperAdminLoginResponseDto {
  access_token: string;
  admin: {
    id: string;
    email: string;
    name: string;
  };
}

// Tenant Provisioning DTOs
export interface CreateTenantDto {
  name: string;
  subdomain: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  plan_id?: string;
}

// User / Organization DTOs
export interface InviteUserDto {
  email: string;
  name: string;
  role: UserRole;
  department_id?: string;
  branch_id?: string;
  designation_id?: string;
}

export interface CreateDepartmentDto {
  name: string;
  parent_id?: string | null;
}

export interface CreateBranchDto {
  name: string;
  location: string;
}

export interface CreateDesignationDto {
  title: string;
}

// Chat DTOs
export interface CreateConversationDto {
  type: ConversationType;
  title?: string;
  member_ids: string[];
  department_id?: string;
  is_readonly?: boolean;
}

export interface SendMessageDto {
  id?: string; // UUIDv7 optionally client-generated
  conversation_id: string;
  type: MessageType;
  content: string;
  attachments?: IMessageAttachment[];
  parent_message_id?: string;
  task_id?: string;
}

export interface EditMessageDto {
  content: string;
}

export interface CursorPaginationDto {
  cursor?: string;
  limit?: number;
  direction?: 'before' | 'after';
}

// Task DTOs
export interface CreateTaskDto {
  id?: string; // Optional UUIDv7 client-generated
  title: string;
  description?: string;
  status_id?: string;
  priority?: TaskPriority;
  department_id?: string;
  assignee_ids?: string[];
  watcher_ids?: string[];
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  requires_approval?: boolean;
  proof_required?: boolean;
  source_message_id?: string | null;
  conversation_id?: string | null;
  parent_task_id?: string | null;
  labels?: string[];
  recurrence_rule?: string | null;
  checklist?: string[];
}

export interface QuickCreateTaskDto {
  title: string;
  assignee_id?: string;
  due_date?: string;
  conversation_id?: string;
  source_message_id?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status_id?: string;
  priority?: TaskPriority;
  department_id?: string;
  assignee_ids?: string[];
  watcher_ids?: string[];
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  requires_approval?: boolean;
  proof_required?: boolean;
  labels?: string[];
}

export interface SubmitTaskProofDto {
  proof_notes?: string;
  proof_attachments: IMessageAttachment[];
}

export interface ReviewTaskApprovalDto {
  approved: boolean;
  reason?: string;
}

export interface RequestExtensionDto {
  requested_date: string;
  reason: string;
}

export interface ReviewExtensionDto {
  approved: boolean;
  review_note?: string;
}

export interface CreateTaskCommentDto {
  content: string;
  attachments?: IMessageAttachment[];
}

export interface CreateChecklistItemDto {
  title: string;
}

export interface UpdateChecklistItemDto {
  title?: string;
  is_completed?: boolean;
  order?: number;
}

// Storage Presigned Upload DTO
export interface RequestUploadUrlDto {
  filename: string;
  content_type: string;
  file_size: number;
  folder?: string;
}

export interface UploadUrlResponseDto {
  upload_url: string;
  file_url: string;
  key: string;
  storage_driver: 'local' | 's3';
}
