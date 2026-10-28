import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';
import {
  Task,
  TaskStatus,
  TaskAssignee,
  TaskWatcher,
  TaskChecklist,
  TaskComment,
  TaskActivity,
  TaskExtensionRequest,
  TaskLinkedTask,
  User,
  Message,
  Conversation,
} from '../tenant-entities';
import {
  CreateTaskDto,
  QuickCreateTaskDto,
  UpdateTaskDto,
  SubmitTaskProofDto,
  ReviewTaskApprovalDto,
  RequestExtensionDto,
  ReviewExtensionDto,
  CreateTaskCommentDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  TaskPriority,
  TaskStatusCategory,
  MessageType,
  MessageDeliveryStatus,
  UserRole,
  NotificationType,
} from '@saas/shared';
import { uuidv7 } from 'uuidv7';
import { In, LessThan } from 'typeorm';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly cls: ClsService,
  ) {}

  // 6.1 & 6.2 Create Task (Standalone, Quick-create, or from Chat Message)
  async createTask(dto: CreateTaskDto, creatorId: string): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);
    const statusRepo = ds.getRepository(TaskStatus);
    const assigneeRepo = ds.getRepository(TaskAssignee);
    const watcherRepo = ds.getRepository(TaskWatcher);
    const checklistRepo = ds.getRepository(TaskChecklist);
    const messageRepo = ds.getRepository(Message);
    const convRepo = ds.getRepository(Conversation);

    // Default status if not provided: find first TODO category status
    let statusId = dto.status_id;
    if (!statusId) {
      const defaultStatus = await statusRepo.findOne({
        where: { category: TaskStatusCategory.TODO },
        order: { order: 'ASC' },
      });
      statusId = defaultStatus ? defaultStatus.id : (await statusRepo.find({ take: 1 }))[0].id;
    }

    const taskId = dto.id || uuidv7();

    const task = taskRepo.create({
      id: taskId,
      title: dto.title,
      description: dto.description,
      creator_id: creatorId,
      status_id: statusId,
      priority: dto.priority || TaskPriority.MEDIUM,
      department_id: dto.department_id,
      parent_task_id: dto.parent_task_id,
      source_message_id: dto.source_message_id,
      conversation_id: dto.conversation_id,
      start_date: dto.start_date ? new Date(dto.start_date) : null,
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      estimated_hours: dto.estimated_hours,
      requires_approval: dto.requires_approval || false,
      proof_required: dto.proof_required || false,
      labels: dto.labels || [],
      recurrence_rule: dto.recurrence_rule,
    });

    const saved = await taskRepo.save(task);

    // Save Assignees
    if (dto.assignee_ids && dto.assignee_ids.length > 0) {
      const assignees = dto.assignee_ids.map((uid) =>
        assigneeRepo.create({
          task_id: saved.id,
          user_id: uid,
        }),
      );
      await assigneeRepo.save(assignees);
    }

    // Save Watchers
    if (dto.watcher_ids && dto.watcher_ids.length > 0) {
      const watchers = dto.watcher_ids.map((uid) =>
        watcherRepo.create({
          task_id: saved.id,
          user_id: uid,
        }),
      );
      await watcherRepo.save(watchers);
    }

    // Save Checklist items
    if (dto.checklist && dto.checklist.length > 0) {
      const items = dto.checklist.map((title, idx) =>
        checklistRepo.create({
          task_id: saved.id,
          title,
          is_completed: false,
          order: idx,
        }),
      );
      await checklistRepo.save(items);
    }

    // Record Activity
    await this.recordActivity(ds, saved.id, creatorId, 'TASK_CREATED', null, null, saved.title);

    // 6.5 Task card in chat:
    // "When a task is created from a chat, a task card message appears in that chat showing title, assignees, due date, live status and priority."
    if (dto.conversation_id) {
      const cardMsg = messageRepo.create({
        id: uuidv7(),
        conversation_id: dto.conversation_id,
        sender_id: creatorId,
        type: MessageType.TASK_CARD,
        content: `Created task: ${saved.title}`,
        task_id: saved.id,
        delivery_status: MessageDeliveryStatus.SENT,
      });
      await messageRepo.save(cardMsg);
    }

    return this.getTaskById(saved.id, creatorId);
  }

  async quickCreate(dto: QuickCreateTaskDto, creatorId: string): Promise<Task> {
    return this.createTask(
      {
        title: dto.title,
        assignee_ids: dto.assignee_id ? [dto.assignee_id] : [],
        due_date: dto.due_date,
        conversation_id: dto.conversation_id,
        source_message_id: dto.source_message_id,
      },
      creatorId,
    );
  }

  // 6.7 Views & Queries
  async getTasks(
    userId: string,
    filters: {
      view?: 'my_tasks' | 'assigned_by_me' | 'watching' | 'department' | 'all';
      status_id?: string;
      assignee_id?: string;
      creator_id?: string;
      priority?: TaskPriority;
      department_id?: string;
      search?: string;
      overdue_only?: boolean;
    },
  ): Promise<Task[]> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);

    const qb = taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.status', 'status')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('creator.designation', 'creator_designation')
      .leftJoinAndSelect('task.department', 'department')
      .leftJoinAndSelect('task.assignees', 'assignees')
      .leftJoinAndSelect('assignees.user', 'assignee_user')
      .leftJoinAndSelect('assignee_user.designation', 'assignee_designation')
      .leftJoinAndSelect('task.watchers', 'watchers')
      .leftJoinAndSelect('watchers.user', 'watcher_user')
      .leftJoinAndSelect('task.checklist', 'checklist')
      .leftJoinAndSelect('task.subtasks', 'subtasks');

    // View scope
    const view = filters.view || 'all';
    if (view === 'my_tasks') {
      qb.innerJoin('task_assignees', 'ta', 'ta.task_id = task.id AND ta.user_id = :userId', { userId });
    } else if (view === 'assigned_by_me') {
      qb.andWhere('task.creator_id = :userId', { userId });
    } else if (view === 'watching') {
      qb.innerJoin('task_watchers', 'tw', 'tw.task_id = task.id AND tw.user_id = :userId', { userId });
    } else if (view === 'department' && filters.department_id) {
      qb.andWhere('task.department_id = :deptId', { deptId: filters.department_id });
    }

    if (filters.status_id) {
      qb.andWhere('task.status_id = :statusId', { statusId: filters.status_id });
    }

    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.creator_id) {
      qb.andWhere('task.creator_id = :creatorId', { creatorId: filters.creator_id });
    }

    if (filters.search) {
      qb.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.overdue_only) {
      qb.andWhere('task.due_date < :now AND status.is_closed = false', { now: new Date() });
    }

    qb.orderBy('task.created_at', 'DESC');
    return qb.getMany();
  }

  async getTaskById(taskId: string, currentUserId: string): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);

    const task = await taskRepo.findOne({
      where: { id: taskId },
      relations: [
        'status',
        'creator',
        'creator.designation',
        'department',
        'assignees',
        'assignees.user',
        'assignees.user.designation',
        'watchers',
        'watchers.user',
        'checklist',
        'subtasks',
        'comments',
        'comments.user',
        'activities',
        'activities.actor',
        'extension_requests',
        'extension_requests.requester',
        'linked_tasks',
        'linked_tasks.linked_task',
      ],
      order: {
        activities: { created_at: 'DESC' },
        comments: { created_at: 'ASC' },
        checklist: { order: 'ASC' },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  // 6.3 Status Workflow & State Transitions
  async updateTaskStatus(taskId: string, targetStatusId: string, actorId: string): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);
    const statusRepo = ds.getRepository(TaskStatus);

    const task = await this.getTaskById(taskId, actorId);
    const newStatus = await statusRepo.findOne({ where: { id: targetStatusId } });

    if (!newStatus) {
      throw new NotFoundException('Target task status not found');
    }

    const oldStatusName = task.status?.name || 'Unknown';

    // 6.3 "Proof required" validation
    if (newStatus.is_closed && task.proof_required) {
      const hasProof = task.proof_attachments && task.proof_attachments.length > 0;
      if (!hasProof) {
        throw new BadRequestException(
          'This task requires proof of completion. Please upload at least one photo/file before marking done.',
        );
      }
    }

    // 6.3 "Requires approval" workflow
    if (newStatus.is_closed && task.requires_approval && actorId !== task.creator_id) {
      // Find "Under Review" status
      const reviewStatus = await statusRepo.findOne({
        where: { category: TaskStatusCategory.UNDER_REVIEW },
      });
      if (reviewStatus) {
        task.status_id = reviewStatus.id;
        await taskRepo.save(task);

        await this.recordActivity(
          ds,
          task.id,
          actorId,
          'SUBMITTED_FOR_APPROVAL',
          'status',
          oldStatusName,
          reviewStatus.name,
        );

        // Notify creator
        await this.postSystemMessageToChat(
          ds,
          task.conversation_id,
          `Task "${task.title}" was submitted for review by an assignee.`,
        );

        return this.getTaskById(taskId, actorId);
      }
    }

    task.status_id = newStatus.id;
    await taskRepo.save(task);

    await this.recordActivity(
      ds,
      task.id,
      actorId,
      'STATUS_CHANGED',
      'status',
      oldStatusName,
      newStatus.name,
    );

    // 6.5 "Key task events (completed, overdue, reopened) post a system message in the source chat."
    if (newStatus.is_closed) {
      await this.postSystemMessageToChat(
        ds,
        task.conversation_id,
        `Task "${task.title}" was marked as completed.`,
      );
    } else if (newStatus.category === TaskStatusCategory.REOPENED) {
      await this.postSystemMessageToChat(
        ds,
        task.conversation_id,
        `Task "${task.title}" was reopened.`,
      );
    }

    return this.getTaskById(taskId, actorId);
  }

  // 6.3 Submit Proof
  async submitProof(taskId: string, dto: SubmitTaskProofDto, actorId: string): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);

    const task = await this.getTaskById(taskId, actorId);
    task.proof_attachments = dto.proof_attachments;
    task.proof_notes = dto.proof_notes;
    await taskRepo.save(task);

    await this.recordActivity(ds, task.id, actorId, 'PROOF_SUBMITTED', 'proof', null, 'Proof attached');
    return this.getTaskById(taskId, actorId);
  }

  // 6.3 Approve or Reject task
  async reviewApproval(taskId: string, dto: ReviewTaskApprovalDto, actorId: string): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const taskRepo = ds.getRepository(Task);
    const statusRepo = ds.getRepository(TaskStatus);

    const task = await this.getTaskById(taskId, actorId);

    if (dto.approved) {
      // Find DONE status
      const doneStatus = await statusRepo.findOne({ where: { category: TaskStatusCategory.DONE } });
      if (doneStatus) {
        task.status_id = doneStatus.id;
        await taskRepo.save(task);
        await this.recordActivity(ds, task.id, actorId, 'APPROVAL_GRANTED', 'status', 'Under Review', 'Done');
        await this.postSystemMessageToChat(ds, task.conversation_id, `Task "${task.title}" approval was approved.`);
      }
    } else {
      // Reject back to IN_PROGRESS
      const inProgressStatus = await statusRepo.findOne({ where: { category: TaskStatusCategory.IN_PROGRESS } });
      if (inProgressStatus) {
        task.status_id = inProgressStatus.id;
        await taskRepo.save(task);
        await this.recordActivity(
          ds,
          task.id,
          actorId,
          'APPROVAL_REJECTED',
          'status',
          'Under Review',
          `Rejected: ${dto.reason || 'Needs revision'}`,
        );
        await this.postSystemMessageToChat(
          ds,
          task.conversation_id,
          `Task "${task.title}" was rejected back to In Progress: ${dto.reason || 'Needs revision'}`,
        );
      }
    }

    return this.getTaskById(taskId, actorId);
  }

  // 6.4 Collaboration: Reassign
  async reassignTask(
    taskId: string,
    assigneeIds: string[],
    reason: string,
    actorId: string,
  ): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const assigneeRepo = ds.getRepository(TaskAssignee);

    const task = await this.getTaskById(taskId, actorId);
    const oldAssignees = task.assignees?.map((a) => a.user?.name || a.user_id).join(', ') || 'Unassigned';

    await assigneeRepo.delete({ task_id: taskId });
    const newAssignees = assigneeIds.map((uid) =>
      assigneeRepo.create({
        task_id: taskId,
        user_id: uid,
      }),
    );
    await assigneeRepo.save(newAssignees);

    await this.recordActivity(
      ds,
      taskId,
      actorId,
      'REASSIGNED',
      'assignees',
      oldAssignees,
      `Reassigned with reason: ${reason}`,
    );

    return this.getTaskById(taskId, actorId);
  }

  // 6.4 Due-Date Extension Request
  async requestExtension(taskId: string, dto: RequestExtensionDto, actorId: string): Promise<TaskExtensionRequest> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const extRepo = ds.getRepository(TaskExtensionRequest);

    const ext = await extRepo.save(
      extRepo.create({
        task_id: taskId,
        requested_by: actorId,
        requested_date: new Date(dto.requested_date),
        reason: dto.reason,
      }),
    );

    await this.recordActivity(
      ds,
      taskId,
      actorId,
      'EXTENSION_REQUESTED',
      'due_date',
      null,
      `Requested extension to ${dto.requested_date}: ${dto.reason}`,
    );

    return ext;
  }

  async reviewExtension(requestId: string, dto: ReviewExtensionDto, actorId: string): Promise<Task> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const extRepo = ds.getRepository(TaskExtensionRequest);
    const taskRepo = ds.getRepository(Task);

    const req = await extRepo.findOne({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Extension request not found');
    }

    req.reviewed_by = actorId;
    req.review_note = dto.review_note;
    req.status = dto.approved ? ('APPROVED' as any) : ('REJECTED' as any);
    await extRepo.save(req);

    if (dto.approved) {
      await taskRepo.update(req.task_id, { due_date: req.requested_date });
      await this.recordActivity(
        ds,
        req.task_id,
        actorId,
        'EXTENSION_APPROVED',
        'due_date',
        null,
        req.requested_date.toISOString(),
      );
    } else {
      await this.recordActivity(
        ds,
        req.task_id,
        actorId,
        'EXTENSION_REJECTED',
        'due_date',
        null,
        dto.review_note || 'Rejected',
      );
    }

    return this.getTaskById(req.task_id, actorId);
  }

  // 6.4 Comments & Checklists
  async addComment(taskId: string, dto: CreateTaskCommentDto, actorId: string): Promise<TaskComment> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const commentRepo = ds.getRepository(TaskComment);

    const comment = await commentRepo.save(
      commentRepo.create({
        task_id: taskId,
        user_id: actorId,
        content: dto.content,
        attachments: dto.attachments || [],
      }),
    );

    await this.recordActivity(ds, taskId, actorId, 'COMMENT_ADDED', 'comment', null, 'Comment posted');
    return (await commentRepo.findOne({ where: { id: comment.id }, relations: ['user'] }))!;
  }

  async addChecklistItem(taskId: string, dto: CreateChecklistItemDto, actorId: string): Promise<TaskChecklist> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(TaskChecklist);
    const count = await repo.count({ where: { task_id: taskId } });

    const item = await repo.save(
      repo.create({
        task_id: taskId,
        title: dto.title,
        order: count,
      }),
    );

    await this.recordActivity(ds, taskId, actorId, 'CHECKLIST_ADDED', 'checklist', null, dto.title);
    return item;
  }

  async toggleChecklistItem(itemId: string, actorId: string): Promise<TaskChecklist> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const repo = ds.getRepository(TaskChecklist);
    const item = await repo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    item.is_completed = !item.is_completed;
    await repo.save(item);

    await this.recordActivity(
      ds,
      item.task_id,
      actorId,
      'CHECKLIST_TOGGLED',
      'checklist',
      item.title,
      item.is_completed ? 'Completed' : 'Uncompleted',
    );

    return item;
  }

  // Statuses management (Tenant Admin)
  async getTaskStatuses(): Promise<TaskStatus[]> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    return ds.getRepository(TaskStatus).find({ order: { order: 'ASC' } });
  }

  // Immutable Activity Logger
  private async recordActivity(
    ds: any,
    taskId: string,
    actorId: string,
    action: string,
    fieldName?: string | null,
    oldValue?: string | null,
    newValue?: string | null,
  ): Promise<void> {
    const actRepo = ds.getRepository(TaskActivity);
    await actRepo.save(
      actRepo.create({
        task_id: taskId,
        actor_id: actorId,
        action,
        field_name: fieldName,
        old_value: oldValue,
        new_value: newValue,
      }),
    );
  }

  // Helper to post a system message to source chat on key task events
  private async postSystemMessageToChat(ds: any, convId?: string | null, content?: string): Promise<void> {
    if (!convId || !content) return;
    const msgRepo = ds.getRepository(Message);
    await msgRepo.save(
      msgRepo.create({
        id: uuidv7(),
        conversation_id: convId,
        sender_id: '00000000-0000-0000-0000-000000000000', // System user UUID
        type: MessageType.SYSTEM,
        content: content,
        delivery_status: MessageDeliveryStatus.SENT,
      }),
    );
  }
}
