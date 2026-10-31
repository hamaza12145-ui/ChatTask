import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Task } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { TaskCard } from '../tasks/TaskCard';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { AttachmentPreview } from './AttachmentPreview';
import {
  Check,
  CheckCheck,
  Reply,
  PlusSquare,
  Copy,
  MoreVertical,
  Calendar,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  isFirstInGroup?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
}) => {
  const {
    currentUser,
    getUserById,
    reactToMessage,
    openCreateTaskModal,
    openTaskDrawer,
    setReplyMessage,
    highlightedMessageId,
    getTaskById,
    addToast,
    activeChat,
  } = useAppStore();

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Long press refs for mobile touch interaction
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef<boolean>(false);

  const isOwn = message.senderId === currentUser.id;
  const isSystem = message.senderId === 'system' && message.type === 'system';
  const isTaskCard = message.type === 'task_card';
  const isHighlighted = highlightedMessageId === message.id;

  const sender = getUserById(message.senderId);
  const linkedTask: Task | undefined = message.linkedTaskId
    ? getTaskById(message.linkedTaskId)
    : undefined;
  const cardTask: Task | undefined = message.taskId
    ? getTaskById(message.taskId)
    : undefined;

  // Auto scroll and flash when highlighted
  useEffect(() => {
    if (isHighlighted && bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  // Click outside listener to dismiss options menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Long-press handling for mobile devices (450ms threshold)
  const handleTouchStart = () => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore if vibration not permitted
        }
      }
      setShowMenu(true);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    // If user is scrolling, cancel long-press immediately
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Right-click context menu handling on desktop
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
  };

  // Click handler for message bubble
  const handleBubbleClick = (e: React.MouseEvent) => {
    // If long press just fired, don't double toggle
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }
    // Toggle options menu
    setShowMenu((prev) => !prev);
  };

  const handleCopyText = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      addToast('Message copied to clipboard', 'info');
    }
    setShowMenu(false);
  };

  const handleReply = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setReplyMessage({
      id: message.id,
      senderName: sender ? sender.name : 'System',
      text: message.text || (message.type === 'voice' ? 'Voice note' : 'Attachment'),
      type: message.type,
    });
    setShowMenu(false);
  };

  const handleCreateTaskFromMessage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setShowMenu(false);

    // Clean a short title from message text
    const cleanTitle = message.text
      ? message.text.length > 55
        ? message.text.substring(0, 52) + '...'
        : message.text
      : 'Task from chat';

    openCreateTaskModal({
      title: cleanTitle,
      description: message.text || '',
      department: activeChat?.department || currentUser.department,
      sourceChatId: message.chatId,
      sourceMessageId: message.id,
      assigneeIds: activeChat
        ? activeChat.participantIds.filter((id) => id !== currentUser.id).slice(0, 2)
        : [currentUser.id],
      attachments: message.attachment ? [message.attachment] : [],
      checklist: [
        { id: '1', title: 'Review requirements and setup', completed: false },
        { id: '2', title: 'Execute deliverable and verify', completed: false },
      ],
      requiresApproval: true,
      proofRequired: false,
    });
  };

  const quickEmojis = ['👍', '❤️', '🙌', '🚀', '👀', '✅'];

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Render text with highlighted @mentions
  const renderMessageText = (text: string) => {
    const mentionRegex = /(@[a-zA-Z0-9_\s]+?)(?=[.,!?:;]|\s|$)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className={`font-semibold px-1 py-0.5 rounded ${
              isOwn
                ? 'bg-emerald-700 text-emerald-100'
                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
            }`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // System Message
  if (isSystem) {
    return (
      <div
        ref={bubbleRef}
        className="flex items-center justify-center my-3 text-center px-4"
      >
        <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-full px-3.5 py-1 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 shadow-xs">
          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{message.text}</span>
          <span className="text-[10px] opacity-60 font-mono tabular-nums ml-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  // Task Card Message
  if (isTaskCard) {
    if (!cardTask) return null;
    return (
      <div
        ref={bubbleRef}
        className={`flex my-2 justify-center px-2 animate-in fade-in duration-200 ${
          isHighlighted ? 'ring-2 ring-emerald-500 rounded-2xl p-1 bg-emerald-50/20' : ''
        }`}
      >
        <div className="max-w-md w-full">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between px-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Team Task</span>
            </span>
            <span className="text-[10px] font-mono tabular-nums">{formatTime(message.timestamp)}</span>
          </div>
          <TaskCard task={cardTask} variant="chat" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={bubbleRef}
      className={`group relative flex flex-col my-1 transition-all duration-300 ${
        isOwn ? 'items-end' : 'items-start'
      } ${
        isHighlighted
          ? 'bg-emerald-100/40 dark:bg-emerald-950/40 p-1.5 rounded-2xl ring-2 ring-emerald-500'
          : ''
      }`}
    >
      <div className={`flex items-end gap-1 max-w-[88%] sm:max-w-[78%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Counterpart Avatar */}
        {!isOwn && (
          <div
            title={sender?.name}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-1 ${
              sender ? sender.avatarBg : 'bg-slate-500'
            }`}
          >
            {sender ? sender.avatar : '??'}
          </div>
        )}

        {/* Message Container */}
        <div className="relative group/bubble min-w-[120px]">
          {/* Sender Name in Group Chat */}
          {!isOwn && sender && (
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5 ml-1">
              {sender.name}
              <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 ml-1.5">
                {sender.department}
              </span>
            </p>
          )}

          {/* Main Bubble Box with Click, Context Menu (Right-Click) and Touch (Long-Press) Handlers */}
          <div
            onClick={handleBubbleClick}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            role="button"
            tabIndex={0}
            aria-label="Chat message options"
            className={`relative rounded-2xl px-3.5 py-2 shadow-xs transition-all cursor-pointer select-none active:scale-[0.99] ${
              isOwn
                ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-br-xs border border-emerald-300/50 dark:border-emerald-700/40 hover:shadow-sm'
                : 'bg-white dark:bg-[#202c33] text-slate-900 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700/60 hover:shadow-sm'
            }`}
          >
            {/* Dedicated Three-Dot Menu Trigger inside the bubble (Accessible on hover & touch) */}
            <div className="absolute top-1 right-1 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu((prev) => !prev);
                }}
                className={`p-1 rounded-full transition-all ${
                  showMenu
                    ? 'bg-black/10 dark:bg-white/20 text-slate-800 dark:text-white opacity-100'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 opacity-70 sm:opacity-0 sm:group-hover/bubble:opacity-100'
                }`}
                title="Options: Create Task, Reply, Copy"
                aria-label="Message options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quoted / Reply Preview */}
            {message.replyTo && (
              <div
                className={`mb-2 p-2 rounded-lg text-xs border-l-3 ${
                  isOwn
                    ? 'bg-emerald-200/50 dark:bg-emerald-900/40 border-emerald-600 text-emerald-950 dark:text-emerald-100'
                    : 'bg-slate-100 dark:bg-slate-700/60 border-indigo-600 text-slate-700 dark:text-slate-200'
                }`}
              >
                <p className="font-bold text-[11px] mb-0.5">{message.replyTo.senderName}</p>
                <p className="line-clamp-1 italic text-[11px]">{message.replyTo.text}</p>
              </div>
            )}

            {/* Attachment preview if present */}
            {message.attachment && (
              <div onClick={(e) => e.stopPropagation()}>
                <AttachmentPreview attachment={message.attachment} isOwn={isOwn} />
              </div>
            )}

            {/* Voice Note if present */}
            {message.type === 'voice' && (
              <div onClick={(e) => e.stopPropagation()}>
                <VoiceNotePlayer duration={message.voiceDuration || 16} isOwn={isOwn} />
              </div>
            )}

            {/* Text content (with right padding so it doesn't overlap the 3-dots button) */}
            {message.text && (
              <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words pr-4">
                {renderMessageText(message.text)}
              </p>
            )}

            {/* Linked Task Chip (When this message spawned a task) */}
            {linkedTask && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openTaskDrawer(linkedTask.id);
                }}
                className={`mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  isOwn
                    ? 'bg-emerald-100/90 hover:bg-emerald-200/90 dark:bg-emerald-900/60 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 border border-emerald-300/70 dark:border-emerald-700/60'
                    : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <PlusSquare className="w-3.5 h-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <span className="font-mono font-bold">{linkedTask.code}:</span>
                <span className="truncate max-w-[160px] sm:max-w-[210px]">{linkedTask.title}</span>
                <span className="ml-1 text-[10px] opacity-75 font-semibold">({linkedTask.status.replace('_', ' ')})</span>
              </button>
            )}

            {/* Time & Read Status ticks */}
            <div
              className={`flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums select-none ${
                isOwn ? 'text-emerald-800/80 dark:text-emerald-200/80' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              <span>{formatTime(message.timestamp)}</span>
              {isOwn && (
                <span className="inline-flex">
                  {message.status === 'read' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                  ) : message.status === 'delivered' ? (
                    <CheckCheck className="w-3.5 h-3.5 opacity-60" />
                  ) : (
                    <Check className="w-3.5 h-3.5 opacity-60" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Emoji Reactions List below bubble */}
          {message.reactions && message.reactions.length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {message.reactions.map((reaction, i) => {
                const hasReacted = reaction.userIds.includes(currentUser.id);
                return (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      reactToMessage(message.id, reaction.emoji);
                    }}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                      hasReacted
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-[10px] font-semibold tabular-nums">
                      {reaction.userIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* WhatsApp-Style Action Popover Menu (Activated by click, 3-dots, right-click, or long press) */}
          {showMenu && (
            <div
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
              className={`absolute top-full sm:top-2 z-50 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              {/* Quick Emojis strip */}
              <div className="flex items-center justify-around px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 rounded-t-xl">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reactToMessage(message.id, emoji);
                      setShowMenu(false);
                    }}
                    className="hover:scale-130 transition-transform text-base p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* PRIMARY PROMINENT ACTION: Create Task from Message */}
              <button
                type="button"
                onClick={handleCreateTaskFromMessage}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors font-bold group/btn"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400 group-hover/btn:scale-110 transition-transform">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-tight">Create Task</span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-tight truncate">
                    Convert message into deliverable
                  </span>
                </div>
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

              {/* Reply Quote Action */}
              <button
                type="button"
                onClick={handleReply}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-300"
              >
                <Reply className="w-4 h-4 text-slate-400" />
                <span>Reply</span>
              </button>

              {/* Copy Message Action */}
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-300"
              >
                <Copy className="w-4 h-4 text-slate-400" />
                <span>Copy Message</span>
              </button>

              {/* If already linked to a task, provide 1-click jump */}
              {linkedTask && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    openTaskDrawer(linkedTask.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800"
                >
                  <ExternalLink className="w-4 h-4 text-emerald-600" />
                  <span className="truncate">View Task {linkedTask.code}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
