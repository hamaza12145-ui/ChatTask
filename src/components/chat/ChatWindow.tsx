import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MessageBubble } from './MessageBubble';
import { Task } from '../../types';
import {
  ArrowLeft,
  Info,
  Paperclip,
  Mic,
  Send,
  PlusSquare,
  ListTodo,
  Smile,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';

export const ChatWindow: React.FC = () => {
  const {
    activeChat,
    setActiveChatId,
    chatMessages,
    currentUser,
    getUserById,
    sendMessage,
    replyMessage,
    setReplyMessage,
    taskQuoteForComposer,
    setTaskQuoteForComposer,
    openCreateTaskModal,
    setIsGroupInfoOpen,
    setIsTasksInChatOpen,
    tasks,
    typingStatus,
    deviceView,
  } = useAppStore();

  const [inputText, setInputText] = useState('');
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  // Filter tasks created from this chat
  const chatTasks = tasks.filter((t) => t.sourceChatId === activeChat?.id);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, typingStatus]);

  // Handle voice recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecordingVoice) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Click outside attachment menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
          <ListTodo className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
          Select a Conversation
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Pick a team member or group channel from the list to collaborate, share deliverables, and manage tasks.
        </p>
      </div>
    );
  }

  // Check read-only permission for announcements
  const isReadOnly = activeChat.isReadOnly && !activeChat.adminIds.includes(currentUser.id);

  // Other party in 1:1 chat
  let otherUser = null;
  if (activeChat.type === 'direct') {
    const otherId = activeChat.participantIds.find((id) => id !== currentUser.id) || activeChat.participantIds[0];
    otherUser = getUserById(otherId);
  }

  // Handle input change & mention trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Check if cursor is right after an '@'
    const lastAtPos = value.lastIndexOf('@');
    if (lastAtPos !== -1 && lastAtPos === value.length - 1) {
      setShowMentionMenu(true);
      setMentionFilter('');
    } else if (lastAtPos !== -1 && !value.slice(lastAtPos).includes(' ')) {
      setShowMentionMenu(true);
      setMentionFilter(value.slice(lastAtPos + 1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (userName: string) => {
    const lastAtPos = inputText.lastIndexOf('@');
    const newText = inputText.substring(0, lastAtPos) + `@${userName} `;
    setInputText(newText);
    setShowMentionMenu(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    let fullText = inputText.trim();
    if (taskQuoteForComposer) {
      fullText = `[Ref: ${taskQuoteForComposer.code} - ${taskQuoteForComposer.title}]\n${fullText}`;
    }

    sendMessage(activeChat.id, fullText, {
      replyTo: replyMessage || undefined,
    });

    setInputText('');
    setReplyMessage(null);
    setTaskQuoteForComposer(null);
    setShowMentionMenu(false);
  };

  const handleSendVoiceNote = () => {
    setIsRecordingVoice(false);
    const duration = Math.max(3, recordingSeconds);
    sendMessage(activeChat.id, '', {
      voiceDuration: duration,
    });
  };

  const handleAttachDemoFile = (type: 'image' | 'doc') => {
    setShowAttachmentMenu(false);
    if (type === 'image') {
      sendMessage(activeChat.id, 'Attached photo inspection voucher', {
        attachment: {
          id: 'att_' + Date.now(),
          name: 'site-inspection-reading.jpg',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
          size: '1.8 MB',
        },
      });
    } else {
      sendMessage(activeChat.id, 'Attached official specification sheet', {
        attachment: {
          id: 'att_' + Date.now(),
          name: 'Operations_SOP_Q4_Revision.pdf',
          type: 'pdf',
          url: '#',
          size: '3.2 MB',
        },
      });
    }
  };

  const isCurrentChatTyping = typingStatus[activeChat.id];

  // Group messages by date for date dividers
  const renderMessagesWithDates = () => {
    let lastDateStr = '';
    return chatMessages.map((msg) => {
      const msgDate = new Date(msg.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let dateLabel = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      if (msgDate.toDateString() === today.toDateString()) {
        dateLabel = 'Today';
      } else if (msgDate.toDateString() === yesterday.toDateString()) {
        dateLabel = 'Yesterday';
      }

      const showDateDivider = dateLabel !== lastDateStr;
      lastDateStr = dateLabel;

      return (
        <React.Fragment key={msg.id}>
          {showDateDivider && (
            <div className="flex items-center justify-center my-3 select-none">
              <span className="px-3 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {dateLabel}
              </span>
            </div>
          )}
          <MessageBubble message={msg} />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2]/85 dark:bg-[#0b141a] relative min-w-0 overflow-hidden">
      {/* Top Chat Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-10 select-none">
        <div className="flex items-center gap-2 min-w-0">
          {/* Back button for mobile & mobile simulator */}
          <button
            onClick={() => setActiveChatId(null)}
            className={`${
              deviceView === 'desktop' ? 'hidden' : 'flex lg:hidden'
            } items-center gap-1 p-1.5 -ml-1 text-slate-700 hover:text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors`}
            aria-label="Back to chat list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div
            onClick={() => setIsGroupInfoOpen(true)}
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs cursor-pointer shrink-0 ${
              activeChat.avatarBg || 'bg-slate-600'
            }`}
          >
            {activeChat.type === 'direct' && otherUser ? otherUser.avatar : activeChat.name[0]}
          </div>

          {/* Title & subtitle */}
          <div
            onClick={() => setIsGroupInfoOpen(true)}
            className="min-w-0 cursor-pointer"
          >
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
              <span>{activeChat.type === 'direct' && otherUser ? otherUser.name : activeChat.name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isCurrentChatTyping ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium italic animate-pulse">
                  {isCurrentChatTyping} is typing...
                </span>
              ) : activeChat.type === 'direct' && otherUser ? (
                `${otherUser.designation} · ${otherUser.status}`
              ) : (
                `${activeChat.participantIds.length} members · ${activeChat.department || 'Operations'}`
              )}
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* "Tasks in this chat" Button (Requirement #6) */}
          <button
            onClick={() => setIsTasksInChatOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-all shadow-2xs"
            title="View tasks created in this chat"
          >
            <ListTodo className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Tasks</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold tabular-nums">
              {chatTasks.length}
            </span>
          </button>

          {/* Group Info Trigger */}
          <button
            onClick={() => setIsGroupInfoOpen(true)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Chat info & members"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
            <p>No messages yet in this conversation.</p>
            <p className="mt-1">Say hello or create a task using the buttons below!</p>
          </div>
        ) : (
          renderMessagesWithDates()
        )}

        {/* Live typing indicator bubble */}
        {isCurrentChatTyping && (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-1 px-2 animate-in fade-in">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
            </div>
            <span className="text-[11px] italic">{isCurrentChatTyping} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 sm:p-3 relative">
        {/* Reply Preview Bar */}
        {replyMessage && (
          <div className="mb-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-l-3 border-indigo-600 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-150">
            <div className="min-w-0 pr-2">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Replying to {replyMessage.senderName}
              </span>
              <p className="text-slate-600 dark:text-slate-300 truncate text-[11px]">
                {replyMessage.text}
              </p>
            </div>
            <button
              onClick={() => setReplyMessage(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Task Quote Bar (From "Discuss in chat") */}
        {taskQuoteForComposer && (
          <div className="mb-2 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <ListTodo className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                  {taskQuoteForComposer.code}:
                </span>{' '}
                <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                  {taskQuoteForComposer.title}
                </span>
              </div>
            </div>
            <button
              onClick={() => setTaskQuoteForComposer(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* @Mentions Autocomplete Popup */}
        {showMentionMenu && (
          <div className="absolute bottom-full left-4 mb-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-48 overflow-y-auto">
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
              Mention Team Member
            </div>
            {activeChat.participantIds
              .map((id) => getUserById(id))
              .filter((u): u is NonNullable<typeof u> => Boolean(u))
              .filter((u) => u.name.toLowerCase().includes(mentionFilter))
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectMention(u.name.split(' ')[0])}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${u.avatarBg}`}
                  >
                    {u.avatar}
                  </div>
                  <span className="font-medium truncate">{u.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto truncate max-w-[120px]" title={u.designation}>
                    {u.designation}
                  </span>
                </button>
              ))}
          </div>
        )}

        {/* Read-only announcement banner or active input */}
        {isReadOnly ? (
          <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl">
            Only channel administrators can post announcements.
          </div>
        ) : isRecordingVoice ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                Recording audio note... {recordingSeconds}s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecordingVoice(false)}
                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSendVoiceNote}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Core Feature #2: "+ Task" button right in composer */}
            <button
              onClick={() =>
                openCreateTaskModal({
                  sourceChatId: activeChat.id,
                  department: activeChat.department || currentUser.department,
                  assigneeIds: activeChat.participantIds.filter((id) => id !== currentUser.id),
                })
              }
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors shrink-0"
              title="Create task in this chat"
            >
              <PlusSquare className="w-4 h-4" />
              <span className="hidden sm:inline">+ Task</span>
            </button>

            {/* Attachment Button */}
            <div className="relative" ref={attachmentMenuRef}>
              <button
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                title="Attach file or photo"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Attachment popover */}
              {showAttachmentMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <button
                    onClick={() => handleAttachDemoFile('image')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>Attach Photo</span>
                  </button>
                  <button
                    onClick={() => handleAttachDemoFile('doc')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Attach Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Input Box */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message or use @ to mention..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none transition-all"
              />
            </div>

            {/* Voice note simulation trigger */}
            {!inputText.trim() && (
              <button
                onClick={() => setIsRecordingVoice(true)}
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
                title="Hold or click to record voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
              className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
              title="Send message"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
