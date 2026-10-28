import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';
import { useChatStore } from './chat.store';
import { useTaskStore } from './task.store';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Record<string, string>; // userId -> status
  typingUsers: Record<string, string[]>; // conversationId -> userIds

  connect: () => void;
  disconnect: () => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  onlineUsers: {},
  typingUsers: {},

  connect: () => {
    const { token, tenant } = useAuthStore.getState();
    if (!token || !tenant) return;

    // Disconnect existing if any
    if (get().socket) {
      get().socket?.disconnect();
    }

    const socket = io('http://localhost:4000', {
      auth: { token },
      query: { subdomain: tenant.subdomain },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('user_presence_change', (data: { userId: string; status: string }) => {
      set((state) => ({
        onlineUsers: { ...state.onlineUsers, [data.userId]: data.status },
      }));
    });

    socket.on('user_typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      set((state) => {
        const current = state.typingUsers[data.conversationId] || [];
        const updated = data.isTyping
          ? Array.from(new Set([...current, data.userId]))
          : current.filter((id) => id !== data.userId);
        return {
          typingUsers: { ...state.typingUsers, [data.conversationId]: updated },
        };
      });
    });

    // Real-time chat message delivery
    socket.on('new_message', (message: any) => {
      useChatStore.getState().handleIncomingMessage(message);
    });

    socket.on('message_edited', (message: any) => {
      useChatStore.getState().handleMessageEdited(message);
    });

    socket.on('message_deleted', (data: { messageId: string }) => {
      useChatStore.getState().handleMessageDeleted(data.messageId);
    });

    socket.on('read_receipt', (data: { conversationId: string; userId: string; messageId: string }) => {
      useChatStore.getState().handleReadReceipt(data.conversationId, data.userId, data.messageId);
    });

    // Real-time task update
    socket.on('task_card_updated', (task: any) => {
      useTaskStore.getState().handleLiveTaskUpdate(task);
    });

    socket.on('task_updated', (task: any) => {
      useTaskStore.getState().handleLiveTaskUpdate(task);
    });

    set({ socket });
  },

  disconnect: () => {
    get().socket?.disconnect();
    set({ socket: null, isConnected: false });
  },

  joinConversation: (conversationId: string) => {
    get().socket?.emit('join_conversation', { conversationId });
  },

  leaveConversation: (conversationId: string) => {
    get().socket?.emit('leave_conversation', { conversationId });
  },

  sendTyping: (conversationId: string, isTyping: boolean) => {
    if (isTyping) {
      get().socket?.emit('typing_start', { conversationId });
    } else {
      get().socket?.emit('typing_stop', { conversationId });
    }
  },
}));
