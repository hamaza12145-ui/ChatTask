import { create } from 'zustand';
import { api } from '../api/client';
import { useSocketStore } from './socket.store';
import { uuidv7 } from 'uuidv7';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: string;
  content: string;
  attachments?: any[];
  parent_message_id?: string | null;
  task_id?: string | null;
  delivery_status: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
    designation?: {
      id: string;
      title: string;
    };
    department?: {
      id: string;
      name: string;
    };
  };
}

export interface ChatConversation {
  id: string;
  type: string;
  title?: string;
  description?: string;
  avatar_url?: string;
  is_readonly: boolean;
  unread_count?: number;
  last_message?: ChatMessage;
  members?: any[];
  other_user?: any;
}

interface ChatState {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  replyingTo: ChatMessage | null;
  isLoadingMessages: boolean;

  fetchConversations: () => Promise<void>;
  selectConversation: (conversation: ChatConversation) => Promise<void>;
  startDirectChat: (targetUserId: string) => Promise<ChatConversation | undefined>;
  sendMessage: (content: string, type?: string, attachments?: any[], taskId?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string, forEveryone?: boolean) => Promise<void>;
  setReplyingTo: (message: ChatMessage | null) => void;
  markConversationAsRead: (conversationId: string, messageId: string) => Promise<void>;

  handleIncomingMessage: (message: ChatMessage) => void;
  handleMessageEdited: (message: ChatMessage) => void;
  handleMessageDeleted: (messageId: string) => void;
  handleReadReceipt: (conversationId: string, userId: string, messageId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  replyingTo: null,
  isLoadingMessages: false,

  fetchConversations: async () => {
    try {
      const data = await api.get<ChatConversation[]>('/chat/conversations');
      set({ conversations: data });
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  },

  selectConversation: async (conv) => {
    const prev = get().activeConversation;
    if (prev) {
      useSocketStore.getState().leaveConversation(prev.id);
    }

    set({ activeConversation: conv, messages: [], isLoadingMessages: true, replyingTo: null });
    useSocketStore.getState().joinConversation(conv.id);

    try {
      const res = await api.get<{ messages: ChatMessage[] }>(`/chat/conversations/${conv.id}/messages`);
      set({ messages: res.messages, isLoadingMessages: false });

      // Mark latest message as read
      if (res.messages.length > 0) {
        const latest = res.messages[res.messages.length - 1];
        get().markConversationAsRead(conv.id, latest.id);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  startDirectChat: async (targetUserId: string) => {
    try {
      const conv = await api.post<ChatConversation>('/chat/conversations', {
        type: 'DIRECT',
        member_ids: [targetUserId],
      });
      await get().fetchConversations();
      // Find the updated conversation in the list or use the created one
      const existing = get().conversations.find((c) => c.id === conv.id) || conv;
      await get().selectConversation(existing);
      return existing;
    } catch (err) {
      console.error('Error starting direct chat:', err);
    }
  },

  sendMessage: async (content: string, type = 'TEXT', attachments = [], taskId) => {
    const active = get().activeConversation;
    if (!active || !content.trim()) return;

    const replying = get().replyingTo;
    const clientGeneratedId = uuidv7();

    try {
      const newMsg = await api.post<ChatMessage>('/chat/messages', {
        id: clientGeneratedId,
        conversation_id: active.id,
        content: content.trim(),
        type,
        attachments,
        task_id: taskId,
        parent_message_id: replying?.id || null,
      });

      set((state) => ({
        messages: [...state.messages.filter((m) => m.id !== clientGeneratedId), newMsg],
        replyingTo: null,
      }));

      // Update conversation snippet
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === active.id ? { ...c, last_message: newMsg } : c,
        ),
      }));
    } catch (err) {
      console.error('Send message failed:', err);
    }
  },

  editMessage: async (messageId: string, content: string) => {
    try {
      const updated = await api.put<ChatMessage>(`/chat/messages/${messageId}`, { content });
      get().handleMessageEdited(updated);
    } catch (err) {
      console.error('Edit message failed:', err);
    }
  },

  deleteMessage: async (messageId: string, forEveryone = true) => {
    try {
      await api.delete(`/chat/messages/${messageId}`, { forEveryone });
      get().handleMessageDeleted(messageId);
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  },

  setReplyingTo: (message) => set({ replyingTo: message }),

  markConversationAsRead: async (conversationId: string, messageId: string) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/read`, { messageId });
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c,
        ),
      }));
    } catch {}
  },

  handleIncomingMessage: (msg) => {
    const active = get().activeConversation;
    if (active && active.id === msg.conversation_id) {
      set((state) => ({
        messages: state.messages.some((m) => m.id === msg.id) ? state.messages : [...state.messages, msg],
      }));
      get().markConversationAsRead(active.id, msg.id);
    }

    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id === msg.conversation_id) {
          const isCurrentActive = active?.id === c.id;
          return {
            ...c,
            last_message: msg,
            unread_count: isCurrentActive ? 0 : (c.unread_count || 0) + 1,
          };
        }
        return c;
      }),
    }));
  },

  handleMessageEdited: (edited) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === edited.id ? edited : m)),
    }));
  },

  handleMessageDeleted: (messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, is_deleted: true, content: 'This message was deleted' } : m,
      ),
    }));
  },

  handleReadReceipt: (conversationId, userId, messageId) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, delivery_status: 'READ' } : m,
      ),
    }));
  },
}));
