import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { SocketGateway } from '../realtime/socket.gateway';
import { JwtTenantGuard } from '../common/guards/jwt-tenant.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClsService } from 'nestjs-cls';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
} from '@saas/shared';

@Controller('api/chat')
@UseGuards(JwtTenantGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly socketGateway: SocketGateway,
    private readonly cls: ClsService,
  ) {}

  @Get('conversations')
  async getConversations(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.getUserConversations(user.id);
  }

  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.createConversation(dto, user.id);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('direction') direction?: 'before' | 'after',
  ) {
    const numLimit = limit ? parseInt(limit, 10) : 30;
    return this.chatService.getMessages(conversationId, cursor, numLimit, direction);
  }

  @Post('messages')
  async sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const message = await this.chatService.sendMessage(dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');

    // Broadcast in real-time to tenant's conversation room
    this.socketGateway.broadcastNewMessage(tenantId, dto.conversation_id, message);
    return message;
  }

  @Put('messages/:id')
  async editMessage(
    @Param('id') messageId: string,
    @Body() dto: EditMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const updated = await this.chatService.editMessage(messageId, dto, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastMessageEdited(tenantId, updated.conversation_id, updated);
    return updated;
  }

  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') messageId: string,
    @Query('forEveryone') forEveryone: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const isEveryone = forEveryone === 'true';
    await this.chatService.deleteMessage(messageId, user.id, isEveryone);
    return { success: true };
  }

  @Post('conversations/:id/read')
  async markRead(
    @Param('id') conversationId: string,
    @Body('messageId') messageId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.chatService.markAsRead(conversationId, messageId, user.id);
    const tenantId = this.cls.get<string>('tenantId');
    this.socketGateway.broadcastReadReceipt(tenantId, conversationId, user.id, messageId);
    return { success: true };
  }

  @Get('search')
  async search(
    @Query('q') q: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.searchMessages(q || '', user.id);
  }
}
