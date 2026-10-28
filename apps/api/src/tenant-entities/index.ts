import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { Department } from './department.entity';
import { Branch } from './branch.entity';
import { Designation } from './designation.entity';
import { Role } from './role.entity';
import { Invitation } from './invitation.entity';
import { Conversation } from './conversation.entity';
import { ConversationMember } from './conversation-member.entity';
import { Message } from './message.entity';
import { MessageReaction } from './message-reaction.entity';
import { TaskStatus } from './task-status.entity';
import { Task } from './task.entity';
import { TaskAssignee } from './task-assignee.entity';
import { TaskWatcher } from './task-watcher.entity';
import { TaskChecklist } from './task-checklist.entity';
import { TaskComment } from './task-comment.entity';
import { TaskActivity } from './task-activity.entity';
import { TaskExtensionRequest } from './task-extension-request.entity';
import { TaskLinkedTask } from './task-linked-task.entity';
import { Notification } from './notification.entity';
import { UserNotificationSettings } from './user-notification-settings.entity';
import { AuditLog } from './audit-log.entity';

export * from './user.entity';
export * from './refresh-token.entity';
export * from './department.entity';
export * from './branch.entity';
export * from './designation.entity';
export * from './role.entity';
export * from './invitation.entity';
export * from './conversation.entity';
export * from './conversation-member.entity';
export * from './message.entity';
export * from './message-reaction.entity';
export * from './task-status.entity';
export * from './task.entity';
export * from './task-assignee.entity';
export * from './task-watcher.entity';
export * from './task-checklist.entity';
export * from './task-comment.entity';
export * from './task-activity.entity';
export * from './task-extension-request.entity';
export * from './task-linked-task.entity';
export * from './notification.entity';
export * from './user-notification-settings.entity';
export * from './audit-log.entity';

export const TENANT_ENTITIES = [
  User,
  RefreshToken,
  Department,
  Branch,
  Designation,
  Role,
  Invitation,
  Conversation,
  ConversationMember,
  Message,
  MessageReaction,
  TaskStatus,
  Task,
  TaskAssignee,
  TaskWatcher,
  TaskChecklist,
  TaskComment,
  TaskActivity,
  TaskExtensionRequest,
  TaskLinkedTask,
  Notification,
  UserNotificationSettings,
  AuditLog,
];
