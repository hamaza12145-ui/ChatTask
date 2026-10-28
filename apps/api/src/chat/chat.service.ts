import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantConnectionService } from '../tenancy/tenant-connection.service';
import {
  Conversation,
  ConversationMember,
  Message,
  MessageReaction,
  User,
} from '../tenant-entities';
import {
  CreateConversationDto,
  SendMessageDto,
  EditMessageDto,
  ConversationType,
  MessageType,
  MessageDeliveryStatus,
} from '@saas/shared';
import { uuidv7 } from 'uuidv7';
import { LessThan, MoreThan } from 'typeorm';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly tenantConnectionService: TenantConnectionService) {}

  async getUserConversations(userId: string): Promise<any[]> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const memberRepo = ds.getRepository(ConversationMember);
    const messageRepo = ds.getRepository(Message);

    const memberships = await memberRepo.find({
      where: { user_id: userId },
      relations: [
        'conversation',
        'conversation.members',
        'conversation.members.user',
        'conversation.members.user.designation',
        'conversation.members.user.department',
      ],
      order: { joined_at: 'DESC' },
    });

    const result = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation!;
        // Fetch last message for snippet
        const lastMsg = await messageRepo.findOne({
          where: { conversation_id: conv.id, is_deleted: false },
          order: { created_at: 'DESC' },
          relations: ['sender'],
        });

        // Calculate unread count using last_read_message_id
        let unreadCount = 0;
        if (m.last_read_message_id) {
          const lastReadMsg = await messageRepo.findOne({ where: { id: m.last_read_message_id } });
          if (lastReadMsg) {
            unreadCount = await messageRepo.count({
              where: {
                conversation_id: conv.id,
                created_at: MoreThan(lastReadMsg.created_at),
              },
            });
          }
        } else {
          unreadCount = await messageRepo.count({
            where: { conversation_id: conv.id },
          });
        }

        let displayTitle = conv.title;
        let otherUser: any = null;
        if (conv.type === ConversationType.DIRECT) {
          const otherMember = conv.members?.find((mb: any) => mb.user_id !== userId);
          if (otherMember?.user) {
            displayTitle = otherMember.user.name;
            otherUser = otherMember.user;
          }
        }

        return {
          id: conv.id,
          type: conv.type,
          title: displayTitle || conv.title || 'Direct Chat',
          other_user: otherUser,
          description: conv.description,
          avatar_url: otherUser?.avatar_url || conv.avatar_url,
          is_readonly: conv.is_readonly,
          created_by: conv.created_by,
          created_at: conv.created_at,
          members: conv.members,
          last_message: lastMsg,
          unread_count: unreadCount,
          last_read_message_id: m.last_read_message_id,
        };
      }),
    );

    return result.sort((a, b) => {
      const aTime = a.last_message?.created_at?.getTime() || a.created_at.getTime();
      const bTime = b.last_message?.created_at?.getTime() || b.created_at.getTime();
      return bTime - aTime;
    });
  }

  async createConversation(dto: CreateConversationDto, creatorId: string): Promise<Conversation> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const convRepo = ds.getRepository(Conversation);
    const memberRepo = ds.getRepository(ConversationMember);

    // If 1:1 DIRECT chat, check if one already exists between these 2 users
    if (dto.type === ConversationType.DIRECT && dto.member_ids.length === 1) {
      const targetUserId = dto.member_ids[0];
      const existing = await convRepo
        .createQueryBuilder('c')
        .innerJoin('c.members', 'm1', 'm1.user_id = :u1', { u1: creatorId })
        .innerJoin('c.members', 'm2', 'm2.user_id = :u2', { u2: targetUserId })
        .where('c.type = :type', { type: ConversationType.DIRECT })
        .getOne();

      if (existing) {
        return (await convRepo.findOne({
          where: { id: existing.id },
          relations: ['members', 'members.user', 'members.user.designation', 'members.user.department'],
        }))!;
      }
    }

    const conv = await convRepo.save(
      convRepo.create({
        type: dto.type,
        title: dto.title,
        created_by: creatorId,
        department_id: dto.department_id,
        is_readonly: dto.is_readonly || false,
      }),
    );

    // Add creator as member
    const allMemberIds = Array.from(new Set([creatorId, ...dto.member_ids]));
    const memberEntities = allMemberIds.map((uid) =>
      memberRepo.create({
        conversation_id: conv.id,
        user_id: uid,
        is_admin: uid === creatorId,
      }),
    );

    await memberRepo.save(memberEntities);

    const fullConv = await convRepo.findOne({
      where: { id: conv.id },
      relations: ['members', 'members.user', 'members.user.designation', 'members.user.department'],
    });

    return fullConv!;
  }

  // Cursor Pagination ONLY (Spec: "indexed on (conversation_id, created_at); cursor pagination only, never OFFSET")
  async getMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 30,
    direction: 'before' | 'after' = 'before',
  ): Promise<{ messages: Message[]; nextCursor?: string; prevCursor?: string }> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const messageRepo = ds.getRepository(Message);

    const query = messageRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .leftJoinAndSelect('sender.designation', 'designation')
      .leftJoinAndSelect('sender.department', 'department')
      .where('m.conversation_id = :convId', { convId: conversationId });

    if (cursor) {
      const cursorMessage = await messageRepo.findOne({ where: { id: cursor } });
      if (cursorMessage) {
        if (direction === 'before') {
          query.andWhere('m.created_at < :cursorDate', { cursorDate: cursorMessage.created_at });
        } else {
          query.andWhere('m.created_at > :cursorDate', { cursorDate: cursorMessage.created_at });
        }
      }
    }

    query.orderBy('m.created_at', direction === 'before' ? 'DESC' : 'ASC');
    query.take(limit);

    let messages = await query.getMany();

    if (direction === 'before') {
      messages = messages.reverse(); // Return in chronological order
    }

    const nextCursor = messages.length > 0 ? messages[0].id : undefined;
    const prevCursor = messages.length > 0 ? messages[messages.length - 1].id : undefined;

    return {
      messages,
      nextCursor,
      prevCursor,
    };
  }

  // Send message (UUIDv7 client-generated or generated here for idempotency)
  async sendMessage(dto: SendMessageDto, senderId: string): Promise<Message> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const convRepo = ds.getRepository(Conversation);
    const memberRepo = ds.getRepository(ConversationMember);
    const messageRepo = ds.getRepository(Message);

    const conv = await convRepo.findOne({ where: { id: dto.conversation_id } });
    if (!conv) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify membership
    const membership = await memberRepo.findOne({
      where: { conversation_id: dto.conversation_id, user_id: senderId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    if (conv.is_readonly && !membership.is_admin) {
      throw new ForbiddenException('This channel is read-only for non-admins');
    }

    // Check idempotency if message ID is provided by client
    const messageId = dto.id || uuidv7();
    const existing = await messageRepo.findOne({ where: { id: messageId } });
    if (existing) {
      return existing; // Idempotent return
    }

    const message = messageRepo.create({
      id: messageId,
      conversation_id: dto.conversation_id,
      sender_id: senderId,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      attachments: dto.attachments || [],
      parent_message_id: dto.parent_message_id,
      task_id: dto.task_id,
      delivery_status: MessageDeliveryStatus.SENT,
    });

    const saved = await messageRepo.save(message);

    // Automatically advance sender's last_read_message_id
    await memberRepo.update(
      { conversation_id: dto.conversation_id, user_id: senderId },
      { last_read_message_id: saved.id },
    );

    return (await messageRepo.findOne({
      where: { id: saved.id },
      relations: ['sender', 'sender.designation', 'sender.department'],
    }))!;
  }

  async editMessage(messageId: string, dto: EditMessageDto, userId: string): Promise<Message> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const messageRepo = ds.getRepository(Message);

    const msg = await messageRepo.findOne({ where: { id: messageId } });
    if (!msg) {
      throw new NotFoundException('Message not found');
    }

    if (msg.sender_id !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // 15-minute edit window restriction per spec
    const ageMs = Date.now() - new Date(msg.created_at).getTime();
    if (ageMs > 15 * 60 * 1000) {
      throw new BadRequestException('Messages cannot be edited after 15 minutes');
    }

    msg.content = dto.content;
    msg.is_edited = true;
    return messageRepo.save(msg);
  }

  async deleteMessage(messageId: string, userId: string, forEveryone: boolean): Promise<void> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const messageRepo = ds.getRepository(Message);

    const msg = await messageRepo.findOne({ where: { id: messageId } });
    if (!msg) {
      throw new NotFoundException('Message not found');
    }

    if (forEveryone) {
      if (msg.sender_id !== userId) {
        throw new ForbiddenException('Only the sender can delete a message for everyone');
      }
      msg.is_deleted = true;
      msg.content = 'This message was deleted';
      msg.attachments = [];
      await messageRepo.save(msg);
    } else {
      // Delete for me
      // Could maintain a deleted_for_users array or delete if 1:1
      msg.is_deleted = true;
      await messageRepo.save(msg);
    }
  }

  async markAsRead(conversationId: string, messageId: string, userId: string): Promise<void> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const memberRepo = ds.getRepository(ConversationMember);

    await memberRepo.update(
      { conversation_id: conversationId, user_id: userId },
      { last_read_message_id: messageId },
    );
  }

  async searchMessages(query: string, userId: string): Promise<Message[]> {
    const ds = await this.tenantConnectionService.getDataSourceForCurrentRequest();
    const messageRepo = ds.getRepository(Message);

    return messageRepo
      .createQueryBuilder('m')
      .innerJoin('conversation_members', 'cm', 'cm.conversation_id = m.conversation_id')
      .leftJoinAndSelect('m.sender', 'sender')
      .where('cm.user_id = :userId', { userId })
      .andWhere('m.content ILIKE :q', { q: `%${query}%` })
      .andWhere('m.is_deleted = false')
      .orderBy('m.created_at', 'DESC')
      .take(50)
      .getMany();
  }
}
