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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RealtimeService } from './realtime.service';
import { Message, ConversationMember } from '../entities';
import { MessageDeliveryStatus } from '@saas/shared';

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
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      // 1. Extract Token
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Socket connection rejected: No token provided (${socket.id})`);
        socket.disconnect();
        return;
      }

      // 2. Verify JWT
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'chat-task-jwt-access-secret-32-chars-long-secure',
      });

      // Store context on socket
      socket.data = {
        userId: payload.sub || payload.id,
        email: payload.email,
        name: payload.name,
      };

      const userId = socket.data.userId;

      // Join user room: user:${userId}
      socket.join(`user:${userId}`);
      socket.join('presence');

      // Track online presence
      await this.realtimeService.setUserOnline(userId, socket.id);

      this.logger.log(`User ${userId} connected (socket ${socket.id})`);

      // Broadcast user online event to all
      this.server.to('presence').emit('user_presence_change', {
        userId,
        status: 'online',
      });
    } catch (err: any) {
      this.logger.error(`Socket handshake failed: ${err.message}`);
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: Socket) {
    const { userId } = socket.data || {};
    if (userId) {
      const isCompletelyOffline = await this.realtimeService.setUserOffline(userId, socket.id);
      if (isCompletelyOffline) {
        this.server.to('presence').emit('user_presence_change', {
          userId,
          status: 'offline',
          last_seen: Date.now(),
        });
      }
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data.conversationId) return;
    const room = `conv:${data.conversationId}`;
    socket.join(room);
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!data.conversationId) return;
    const room = `conv:${data.conversationId}`;
    socket.leave(room);
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { userId } = socket.data || {};
    if (!userId || !data.conversationId) return;

    await this.realtimeService.setTyping(data.conversationId, userId);
    socket.to(`conv:${data.conversationId}`).emit('user_typing', {
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
    const { userId } = socket.data || {};
    if (!userId || !data.conversationId) return;

    await this.realtimeService.clearTyping(data.conversationId, userId);
    socket.to(`conv:${data.conversationId}`).emit('user_typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    });
  }

  // Delivery acknowledgement from recipient's device (Double Gray Tick: DELIVERED)
  @SubscribeMessage('message_delivered')
  async handleMessageDelivered(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    const { userId } = socket.data || {};
    if (!userId || !data.conversationId || !data.messageId) return;

    try {
      const messageRepo = this.dataSource.getRepository(Message);
      await messageRepo
        .createQueryBuilder()
        .update(Message)
        .set({ delivery_status: MessageDeliveryStatus.DELIVERED })
        .where('conversation_id = :conversationId', { conversationId: data.conversationId })
        .andWhere('id = :messageId', { messageId: data.messageId })
        .andWhere('delivery_status = :sentStatus', { sentStatus: MessageDeliveryStatus.SENT })
        .execute();

      // Broadcast delivery receipt to conversation room
      this.server.to(`conv:${data.conversationId}`).emit('message_delivered', {
        conversationId: data.conversationId,
        messageId: data.messageId,
        userId,
      });
    } catch (err: any) {
      this.logger.warn(`Error updating delivery status: ${err.message}`);
    }
  }

  // Read receipt acknowledgment from recipient's device (Double Blue Tick: READ)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    const { userId } = socket.data || {};
    if (!userId || !data.conversationId || !data.messageId) return;

    try {
      const memberRepo = this.dataSource.getRepository(ConversationMember);
      const messageRepo = this.dataSource.getRepository(Message);

      await memberRepo.update(
        { conversation_id: data.conversationId, user_id: userId },
        { last_read_message_id: data.messageId },
      );

      await messageRepo
        .createQueryBuilder()
        .update(Message)
        .set({ delivery_status: MessageDeliveryStatus.READ })
        .where('conversation_id = :conversationId', { conversationId: data.conversationId })
        .andWhere('sender_id != :userId', { userId })
        .andWhere('id <= :messageId', { messageId: data.messageId })
        .andWhere('delivery_status != :readStatus', { readStatus: MessageDeliveryStatus.READ })
        .execute();

      this.broadcastReadReceipt(data.conversationId, userId, data.messageId);
    } catch (err: any) {
      this.logger.warn(`Error handling mark_read: ${err.message}`);
    }
  }

  // Broadcast helper called by controllers & services
  broadcastNewMessage(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('new_message', message);
  }

  broadcastMessageDelivered(conversationId: string, messageId: string, userId: string) {
    this.server.to(`conv:${conversationId}`).emit('message_delivered', {
      conversationId,
      messageId,
      userId,
    });
  }

  broadcastMessageEdited(conversationId: string, message: any) {
    this.server.to(`conv:${conversationId}`).emit('message_edited', message);
  }

  broadcastMessageDeleted(conversationId: string, messageId: string) {
    this.server.to(`conv:${conversationId}`).emit('message_deleted', { messageId });
  }

  broadcastReadReceipt(conversationId: string, userId: string, messageId: string) {
    this.server.to(`conv:${conversationId}`).emit('read_receipt', {
      conversationId,
      userId,
      messageId,
    });
  }

  broadcastTaskUpdate(task: any, sourceChatId?: string | null) {
    // Broadcast to user notifications
    if (task.creator_id) {
      this.server.to(`user:${task.creator_id}`).emit('task_updated', task);
    }
    task.assignees?.forEach((a: any) => {
      this.server.to(`user:${a.user_id}`).emit('task_updated', task);
    });

    // If linked to source chat, broadcast to chat room
    const convId = sourceChatId || task.conversation_id;
    if (convId) {
      this.server.to(`conv:${convId}`).emit('task_card_updated', task);
    }
  }

  broadcastUserNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  disconnectUser(userId: string) {
    this.server.to(`user:${userId}`).disconnectSockets();
  }
}
