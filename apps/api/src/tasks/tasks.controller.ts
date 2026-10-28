import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { SocketGateway } from '../realtime/socket.gateway';
import { JwtTenantGuard } from '../common/guards/jwt-tenant.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClsService } from 'nestjs-cls';
import {
  CreateTaskDto,
  QuickCreateTaskDto,
  SubmitTaskProofDto,
  ReviewTaskApprovalDto,
  RequestExtensionDto,
  ReviewExtensionDto,
  CreateTaskCommentDto,
  CreateChecklistItemDto,
  TaskPriority,
} from '@saas/shared';

@Controller('api/tasks')
@UseGuards(JwtTenantGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly socketGateway: SocketGateway,
    private readonly cls: ClsService,
  ) {}

  @Get()
  async getTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('view') view?: 'my_tasks' | 'assigned_by_me' | 'watching' | 'department' | 'all',
    @Query('status_id') status_id?: string,
    @Query('assignee_id') assignee_id?: string,
    @Query('creator_id') creator_id?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('department_id') department_id?: string,
    @Query('search') search?: string,
    @Query('overdue_only') overdue_only?: string,
  ) {
    return this.tasksService.getTasks(user.id, {
      view,
      status_id,
      assignee_id,
      creator_id,
      priority,
      department_id,
      search,
      overdue_only: overdue_only === 'true',
    });
  }

  @Post()
  async createTask(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.createTask(dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task, dto.conversation_id);
    return task;
  }

  @Post('quick')
  async quickCreate(
    @Body() dto: QuickCreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.quickCreate(dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task, dto.conversation_id);
    return task;
  }

  @Get('statuses')
  async getStatuses() {
    return this.tasksService.getTaskStatuses();
  }

  @Get(':id')
  async getTask(
    @Param('id') taskId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.getTaskById(taskId, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') taskId: string,
    @Body('status_id') statusId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.updateTaskStatus(taskId, statusId, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task);
    return task;
  }

  @Post(':id/proof')
  async submitProof(
    @Param('id') taskId: string,
    @Body() dto: SubmitTaskProofDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.submitProof(taskId, dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task);
    return task;
  }

  @Post(':id/review-approval')
  async reviewApproval(
    @Param('id') taskId: string,
    @Body() dto: ReviewTaskApprovalDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.reviewApproval(taskId, dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task);
    return task;
  }

  @Post(':id/reassign')
  async reassign(
    @Param('id') taskId: string,
    @Body() body: { assignee_ids: string[]; reason: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.reassignTask(taskId, body.assignee_ids, body.reason, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task);
    return task;
  }

  @Post(':id/extension-request')
  async requestExtension(
    @Param('id') taskId: string,
    @Body() dto: RequestExtensionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.requestExtension(taskId, dto, user.id);
  }

  @Post('extension-requests/:requestId/review')
  async reviewExtension(
    @Param('requestId') requestId: string,
    @Body() dto: ReviewExtensionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const task = await this.tasksService.reviewExtension(requestId, dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastTaskUpdate(tenantId, task);
    return task;
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.addComment(taskId, dto, user.id);
  }

  @Post(':id/checklists')
  async addChecklistItem(
    @Param('id') taskId: string,
    @Body() dto: CreateChecklistItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.addChecklistItem(taskId, dto, user.id);
  }

  @Patch('checklists/:itemId/toggle')
  async toggleChecklistItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tasksService.toggleChecklistItem(itemId, user.id);
  }
}
