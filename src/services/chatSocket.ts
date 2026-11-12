import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';
import { getDmsBaseUrl } from './dmsApi';

export type SocketEventHandler = (...args: any[]) => void;

class ChatSocketService {
  private socket: Socket | null = null;
  private currentUserId: string | null = null;
  private currentChatId: string | null = null;
  private listeners: Map<string, Set<SocketEventHandler>> = new Map();
  private isConnecting: boolean = false;
  private isExplicitlyDisconnected: boolean = false;

  private getSocketUrl(): string {
    return getDmsBaseUrl();
  }

  public connect(token?: string, userId?: string): void {
    if (typeof window === 'undefined') return;

    const authToken = token || localStorage.getItem('dms_token') || '';
    const uid = userId || localStorage.getItem('dmstask_persisted_user_id') || '';
    this.currentUserId = uid;
    this.isExplicitlyDisconnected = false;

    if (this.socket?.connected) {
      // If already connected and userId changes/refreshes, ensure user's personal room is joined
      if (uid) {
        this.socket.emit('join_user', { userId: uid });
      }
      return;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.auth = { token: authToken, userId: uid };
      this.socket.connect();
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const baseUrl = this.getSocketUrl();
      this.socket = io(`${baseUrl}/ws_chat`, {
        transports: ['websocket', 'polling'],
        auth: {
          token: authToken,
          userId: uid,
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        this.isConnecting = false;
        // Ensure user joins their private room upon connection/reconnection
        if (this.currentUserId) {
          this.socket?.emit('join_user', { userId: this.currentUserId });
        }
        // Re-join active conversation room if one is currently open
        if (this.currentChatId) {
          this.socket?.emit('join_conversation', { conversationId: this.currentChatId });
        }
        this.triggerLocalEvent('connection_status', { connected: true });
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnecting = false;
        this.triggerLocalEvent('connection_status', { connected: false, reason });
      });

      this.socket.on('connect_error', (err) => {
        this.isConnecting = false;
        this.triggerLocalEvent('connection_status', { connected: false, error: err?.message });
      });

      // Server-emitted real-time events
      this.socket.on('new_message', (msg: any) => {
        this.triggerLocalEvent('new_message', msg);
      });

      this.socket.on('receipt_update', (payload: any) => {
        this.triggerLocalEvent('receipt_update', payload);
      });

      this.socket.on('conversation_updated', (payload: any) => {
        this.triggerLocalEvent('conversation_updated', payload);
      });

      // Real-time unread count updates emitted from backend ChatGateway
      this.socket.on('unread_count_updated', (payload: any) => {
        this.triggerLocalEvent('unread_count_updated', payload);
      });

      this.socket.on('conversation_saved', (conv: any) => {
        this.triggerLocalEvent('conversation_saved', conv);
      });

      this.socket.on('conversation_deleted', (payload: any) => {
        this.triggerLocalEvent('conversation_deleted', payload);
      });

      this.socket.on('typing_indicator', (payload: any) => {
        this.triggerLocalEvent('typing_indicator', payload);
      });

      this.socket.on('user_presence', (payload: any) => {
        this.triggerLocalEvent('user_presence', payload);
      });
    } catch (err) {
      this.isConnecting = false;
      console.warn('Socket connection initialization error:', err);
    }
  }

  public disconnect(): void {
    this.isExplicitlyDisconnected = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public joinConversation(conversationId: string): void {
    this.currentChatId = conversationId;
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  public leaveConversation(conversationId: string): void {
    if (this.currentChatId === conversationId) {
      this.currentChatId = null;
    }
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  public sendTyping(conversationId: string, isTyping: boolean, userId?: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing', {
        conversationId,
        isTyping,
        userId: userId || this.currentUserId,
      });
    }
  }

  // --- Pub/Sub listener registry ---

  public on(event: string, handler: SocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private triggerLocalEvent(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const fn of set) {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      }
    }
  }
}

export const chatSocket = new ChatSocketService();
