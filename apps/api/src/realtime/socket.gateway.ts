import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RealtimeService } from './realtime.service';
import { ControlService } from '../control/control.service';
import { ChatService } from '../chat/chat.service';
import { SendMessageDto } from '@saas/shared';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
    private readonly controlService: ControlService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      // 1. Extract Token and Subdomain
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      const subdomain = socket.handshake.query?.subdomain as string ||
        (socket.handshake.headers['x-tenant'] as string);

      if (!token) {
        this.logger.warn(`Socket connection rejected: No token provided (${socket.id})`);
        socket.disconnect();
        return;
      }

      // 2. Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
      });

      // 3. Resolve Tenant
      const tenant = await this.controlService.findTenantById(payload.tenant_id);
      if (!tenant) {
        this.logger.warn(`Socket connection rejected: Tenant ${payload.tenant_id} not found`);
        socket.disconnect();
        return;
      }

      // 4. Verify Subdomain Mismatch Check
      // Spec: "Every request and every socket handshake verifies that the JWT tenant matches the resolved subdomain; mismatch = 401."
      if (subdomain && subdomain !== tenant.subdomain && subdomain !== 'localhost') {
        this.logger.warn(
          `Socket connection rejected: Subdomain mismatch. JWT tenant=${tenant.subdomain}, Handshake subdomain=${subdomain}`,
        );
        socket.disconnect();
        return;
      }

      // Store context on socket
      socket.data = {
        userId: payload.sub,
        email: payload.email,
        tenantId: tenant.id,
        tenantSubdomain: tenant.subdomain,
      };

      // Join tenant-scoped user room: ${tenantId}:user:${userId}
      const userRoom = `${tenant.id}:user:${payload.sub}`;
      socket.join(userRoom);

      // Track online presence
      await this.realtimeService.setUserOnline(tenant.id, payload.sub, socket.id);

      this.logger.log(`User ${payload.sub} connected on tenant ${tenant.subdomain} (socket ${socket.id})`);

      // Broadcast user online event to tenant
      this.server.to(`${tenant.id}:presence`).emit('user_presence_change', {
        userId: payload.sub,
        status: 'online',
      });
    } catch (err: any) {
      this.logger.error(`Socket handshake failed: ${err.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const { userId, tenantId } = socket.data || {};
    if (userId && tenantId) {
      const isCompletelyOffline = await this.realtimeService.setUserOffline(tenantId, userId, socket.id);
      if (isCompletelyOffline) {
        this.server.to(`${tenantId}:presence`).emit('user_presence_change', {
          userId,
          status: 'offline',
          last_seen: Date.now(),
        });
      }
      this.logger.log(`User ${userId} disconnected from tenant ${tenantId}`);
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { tenantId } = socket.data;
    if (!tenantId || !data.conversationId) return;

    // Room prefix: ${tenantId}:conv:${conversationId}
    const room = `${tenantId}:conv:${data.conversationId}`;
    socket.join(room);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { tenantId } = socket.data;
    if (!tenantId || !data.conversationId) return;

    const room = `${tenantId}:conv:${data.conversationId}`;
    socket.leave(room);
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { tenantId, userId } = socket.data;
    if (!tenantId || !data.conversationId) return;

    await this.realtimeService.setTyping(tenantId, data.conversationId, userId);
    socket.to(`${tenantId}:conv:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { tenantId, userId } = socket.data;
    if (!tenantId || !data.conversationId) return;

    await this.realtimeService.clearTyping(tenantId, data.conversationId, userId);
    socket.to(`${tenantId}:conv:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    });
  }

  // Broadcast helper called by controllers & services
  broadcastNewMessage(tenantId: string, conversationId: string, message: any) {
    this.server.to(`${tenantId}:conv:${conversationId}`).emit('new_message', message);
  }

  broadcastMessageEdited(tenantId: string, conversationId: string, message: any) {
    this.server.to(`${tenantId}:conv:${conversationId}`).emit('message_edited', message);
  }

  broadcastMessageDeleted(tenantId: string, conversationId: string, messageId: string) {
    this.server.to(`${tenantId}:conv:${conversationId}`).emit('message_deleted', { messageId });
  }

  broadcastReadReceipt(tenantId: string, conversationId: string, userId: string, messageId: string) {
    this.server.to(`${tenantId}:conv:${conversationId}`).emit('read_receipt', {
      conversationId,
      userId,
      messageId,
    });
  }

  // Spec: "Status changes update the card in real time for everyone. Key task events post a system message in the source chat."
  broadcastTaskUpdate(tenantId: string, task: any, sourceChatId?: string | null) {
    // Broadcast to user notifications
    this.server.to(`${tenantId}:user:${task.creator_id}`).emit('task_updated', task);
    task.assignees?.forEach((a: any) => {
      this.server.to(`${tenantId}:user:${a.user_id}`).emit('task_updated', task);
    });

    // If linked to source chat, broadcast to chat room
    const convId = sourceChatId || task.conversation_id;
    if (convId) {
      this.server.to(`${tenantId}:conv:${convId}`).emit('task_card_updated', task);
    }
  }

  broadcastUserNotification(tenantId: string, userId: string, notification: any) {
    this.server.to(`${tenantId}:user:${userId}`).emit('notification', notification);
  }

  disconnectUser(tenantId: string, userId: string) {
    this.server.to(`${tenantId}:user:${userId}`).disconnectSockets();
  }
}
