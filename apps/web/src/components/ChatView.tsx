'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useChatStore, ChatConversation, ChatMessage } from '../stores/chat.store';
import { useAuthStore } from '../stores/auth.store';
import { useSocketStore } from '../stores/socket.store';
import { useTaskStore } from '../stores/task.store';
import { api } from '../api/client';
import { translations } from '../i18n/translations';
import {
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  Mic,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Reply,
  Trash2,
  CheckSquare,
  ArrowRight,
  ArrowLeft,
  Clock,
  Building2,
  Users,
  Briefcase,
  Megaphone,
  TrendingUp,
  Laptop,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Mail,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';

interface ChatViewProps {
  onCreateTaskFromMsg: (msg: ChatMessage) => void;
  onOpenQuickTask: (convId?: string) => void;
}

interface OrgDepartment {
  id: string;
  name: string;
  parent_id?: string | null;
}

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar_url?: string | null;
  department_id?: string | null;
  department?: {
    id: string;
    name: string;
  };
  designation_id?: string | null;
  designation?: {
    id: string;
    title: string;
  };
  branch?: {
    id: string;
    name: string;
  };
}

export const ChatView: React.FC<ChatViewProps> = ({ onCreateTaskFromMsg, onOpenQuickTask }) => {
  const {
    conversations,
    activeConversation,
    messages,
    replyingTo,
    fetchConversations,
    selectConversation,
    startDirectChat,
    sendMessage,
    setReplyingTo,
    deleteMessage,
  } = useChatStore();

  const { user, locale } = useAuthStore();
  const { typingUsers, sendTyping } = useSocketStore();
  const { selectTask, tasks, fetchTasks } = useTaskStore();
  const t = translations[locale];

  // UI state
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'departments'>('chats');
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [inputContent, setInputContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);

  // Hover Tooltip States for employee and sender designation
  const [hoveredEmployee, setHoveredEmployee] = useState<{
    user: OrgUser;
    x: number;
    y: number;
  } | null>(null);

  const [hoveredSender, setHoveredSender] = useState<{
    name: string;
    designation: string;
    department: string;
    x: number;
    y: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchTasks();
    loadOrganizationDirectory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrganizationDirectory = async () => {
    try {
      const [deptsData, usersData] = await Promise.all([
        api.get<OrgDepartment[]>('/org/departments'),
        api.get<OrgUser[]>('/org/users'),
      ]);
      setDepartments(deptsData);
      setOrgUsers(usersData);

      // Default expand all departments so user can immediately view Pakistani staff
      const initialExpanded: Record<string, boolean> = {};
      deptsData.forEach((d) => {
        initialExpanded[d.id] = true;
      });
      setExpandedDepts(initialExpanded);
    } catch (err) {
      console.error('Failed to load organization directory:', err);
    }
  };

  const toggleDepartment = (deptId: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const handleSend = () => {
    if (!inputContent.trim()) return;
    sendMessage(inputContent);
    setInputContent('');
    if (activeConversation) {
      sendTyping(activeConversation.id, false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);
    if (activeConversation) {
      sendTyping(activeConversation.id, e.target.value.length > 0);
    }
  };

  // Start 1:1 chat with Pakistani team member
  const handleStartChatWithMember = async (targetUser: OrgUser) => {
    try {
      await startDirectChat(targetUser.id);
      setSidebarTab('chats');
    } catch (err) {
      console.error('Failed to initiate chat:', err);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    (c.title || 'Chat').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group users by department
  const getDepartmentMembers = (dept: OrgDepartment) => {
    return orgUsers.filter((u) => {
      const matchesDept =
        u.department_id === dept.id ||
        u.department?.id === dept.id ||
        u.department?.name?.toLowerCase() === dept.name?.toLowerCase();
      if (!matchesDept) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        (u.designation?.title || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  };

  // Department icon helper
  const getDepartmentIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('admin')) return <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    if (lower.includes('hr')) return <Users className="w-4 h-4 text-pink-600 dark:text-pink-400" />;
    if (lower.includes('account') || lower.includes('finance')) return <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
    if (lower.includes('market')) return <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    if (lower.includes('sale')) return <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    if (lower.includes('it') || lower.includes('engineer') || lower.includes('dev')) return <Laptop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />;
    return <Building2 className="w-4 h-4 text-gray-500" />;
  };

  const activeTypers = activeConversation ? typingUsers[activeConversation.id] || [] : [];

  // Determine active conversation partner info (for 1:1 chat designation display in header)
  const directPartner =
    activeConversation?.type === 'DIRECT'
      ? activeConversation.other_user ||
        activeConversation.members?.find((m: any) => m.user_id !== user?.id)?.user
      : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-white dark:bg-gray-950">
      {/* 
        ========================================================================
        Left Sidebar: WhatsApp Conversations & Interactive Department Accordion
        ========================================================================
      */}
      <div
        className={`${
          activeConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 border-r rtl:border-l rtl:border-r-0 border-gray-200 dark:border-gray-800 flex-col bg-white dark:bg-gray-900 shrink-0 select-none`}
      >
        {/* WhatsApp Sidebar Header */}
        <div className="p-3 bg-emerald-800 dark:bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900 shadow-sm">
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm text-white shadow-inner shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold truncate leading-tight">{user?.name}</h3>
              <p className="text-[10px] text-emerald-200 truncate">
                {user?.designation?.title || user?.role || 'TechPak Staff'} â€¢ {user?.department?.name || 'Pakistan'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
            <button
              onClick={() => onOpenQuickTask(activeConversation?.id)}
              title="Create New Task"
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition text-xs font-bold shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Task</span>
            </button>
          </div>
        </div>

        {/* WhatsApp-Style Navigation Tabs: Chats vs. Departments */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/90 text-xs font-semibold">
          <button
            onClick={() => setSidebarTab('chats')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition border-b-2 ${
              sidebarTab === 'chats'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold bg-white dark:bg-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{t.chats}</span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold ml-1">
              {conversations.length}
            </span>
          </button>

          <button
            onClick={() => setSidebarTab('departments')}
            className={`flex-1 py-2.5 text-center flex items-center justify-center space-x-1.5 rtl:space-x-reverse transition border-b-2 ${
              sidebarTab === 'departments'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold bg-white dark:bg-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments</span>
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded-full font-bold ml-1">
              {departments.length || 6}
            </span>
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="p-2.5 bg-gray-50/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={
                sidebarTab === 'chats'
                  ? 'Search chats or messages...'
                  : 'Search department or employee...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 pl-8 rtl:pl-3 rtl:pr-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Tab Content: CHATS VIEW */}
        {sidebarTab === 'chats' && (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600" />
                <p>No conversations found</p>
                <button
                  onClick={() => setSidebarTab('departments')}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  Browse Departments to start a chat â†’
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConversation?.id === conv.id;
                const isDirect = conv.type === 'DIRECT';
                const convPartner = isDirect
                  ? conv.other_user || conv.members?.find((m: any) => m.user_id !== user?.id)?.user
                  : null;

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3 flex items-center space-x-3 rtl:space-x-reverse cursor-pointer transition select-none ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-gray-800/90 border-l-4 rtl:border-l-0 rtl:border-r-4 border-emerald-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-11 h-11 rounded-full bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm shadow-inner">
                        {(conv.title || 'Chat').charAt(0)}
                      </div>
                      {isDirect && (
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 absolute bottom-0 right-0" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {conv.title || 'Chat'}
                        </h4>
                        {conv.last_message && (
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {format(new Date(conv.last_message.created_at), 'p')}
                          </span>
                        )}
                      </div>

                      {/* Designation preview for 1:1 direct chat */}
                      {isDirect && convPartner?.designation?.title && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mb-0.5">
                          {convPartner.designation.title}
                        </p>
                      )}

                      <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <p className="truncate pr-2 rtl:pr-0 rtl:pl-2">
                          {conv.last_message
                            ? (conv.last_message.type === 'TASK_CARD' ? 'ðŸ“‹ ' : '') +
                              conv.last_message.content
                            : 'No messages yet'}
                        </p>
                        {conv.unread_count && conv.unread_count > 0 ? (
                          <span className="bg-emerald-600 text-white rounded-full text-[10px] font-bold px-1.5 py-0.5 min-w-4 text-center shrink-0">
                            {conv.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 
          ========================================================================
          Tab Content: DEPARTMENTS ACCORDION & PAKISTANI EMPLOYEES DIRECTORY
          ========================================================================
        */}
        {sidebarTab === 'departments' && (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 p-2 space-y-1.5">
            {departments.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading departments...</div>
            ) : (
              departments.map((dept) => {
                const isExpanded = !!expandedDepts[dept.id];
                const members = getDepartmentMembers(dept);

                return (
                  <div
                    key={dept.id}
                    className="border border-gray-200/80 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-900/60 transition shadow-sm"
                  >
                    {/* 
                      Department Accordion Header:
                      Clicking expands / collapses relevant members dropdown
                    */}
                    <button
                      onClick={() => toggleDepartment(dept.id)}
                      className="w-full px-3 py-2.5 flex items-center justify-between text-left rtl:text-right bg-gray-50 hover:bg-emerald-50/60 dark:bg-gray-800/60 dark:hover:bg-gray-800 transition"
                    >
                      <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                        {getDepartmentIcon(dept.name)}
                        <span className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                          {dept.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                          {members.length} {members.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-emerald-600 transition" />
                        ) : (
                          <ChevronRight className="w-4 h-4 transition" />
                        )}
                      </div>
                    </button>

                    {/* Department Dropdown Members List */}
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800/50 bg-white dark:bg-gray-900">
                        {members.length === 0 ? (
                          <div className="p-3 text-[11px] text-gray-400 text-center italic">
                            No team members matched
                          </div>
                        ) : (
                          members.map((member) => {
                            const isMe = member.id === user?.id;
                            const designationTitle =
                              member.designation?.title || 'Professional Specialist';

                            return (
                              <div
                                key={member.id}
                                onClick={() => !isMe && handleStartChatWithMember(member)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredEmployee({
                                    user: member,
                                    x: rect.right + 10,
                                    y: Math.max(10, rect.top - 20),
                                  });
                                }}
                                onMouseLeave={() => setHoveredEmployee(null)}
                                className={`px-3 py-2 flex items-center justify-between transition cursor-pointer group ${
                                  isMe
                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                                    : 'hover:bg-emerald-50 dark:hover:bg-gray-800/80'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5 rtl:space-x-reverse min-w-0">
                                  {/* Avatar with Online Green Dot */}
                                  <div className="relative shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                      {member.name.charAt(0)}
                                    </div>
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 absolute bottom-0 right-0" />
                                  </div>

                                  {/* Pakistani Employee Details */}
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                                      <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">
                                        {member.name}
                                      </h5>
                                      {isMe && (
                                        <span className="text-[9px] bg-emerald-600 text-white px-1 py-0.2 rounded font-bold">
                                          You
                                        </span>
                                      )}
                                    </div>

                                    {/* Designation Label */}
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                      {designationTitle}
                                    </p>
                                  </div>
                                </div>

                                {/* Quick WhatsApp Message Action Button */}
                                {!isMe && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartChatWithMember(member);
                                    }}
                                    title={`Chat with ${member.name} on WhatsApp`}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full transition shrink-0"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        Right Main Area: WhatsApp Active Chat Window
        ========================================================================
      */}
      {activeConversation ? (
        <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
          {/* WhatsApp Chat Header */}
          <div className="h-14 px-3 sm:px-4 bg-[#075e54] dark:bg-gray-900 text-white flex items-center justify-between z-10 shadow-md">
            <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse min-w-0">
              {/* Mobile Back Button (returns to sidebar list on small devices) */}
              <button
                onClick={() => selectConversation(null as any)}
                className="md:hidden p-1.5 -ml-1 text-white/90 hover:bg-white/10 rounded-full transition"
                title="Back to Directory"
              >
                <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
              </button>

              {/* Chat Avatar */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-sm shrink-0 shadow-inner">
                {(activeConversation.title || 'Chat').charAt(0)}
              </div>

              {/* Active Chat Title & Realtime Designation Subtitle */}
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                  {activeConversation.title || 'Chat'}
                </h3>
                <div className="text-[10px] sm:text-[11px] text-emerald-100 flex items-center space-x-1.5 rtl:space-x-reverse truncate">
                  {activeTypers.length > 0 ? (
                    <span className="text-emerald-200 font-semibold animate-pulse">{t.typing}</span>
                  ) : directPartner ? (
                    <span>
                      {directPartner.designation?.title || 'Team Member'} â€¢ {directPartner.department?.name || 'TechPak'}
                    </span>
                  ) : (
                    <span>{activeConversation.type} Official Channel</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick "+ Task" Button in Header */}
            <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0">
              <button
                onClick={() => onOpenQuickTask(activeConversation.id)}
                className="flex items-center space-x-1 rtl:space-x-reverse text-xs bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-lg font-bold transition shadow"
              >
                <Plus className="w-4 h-4" />
                <span>+ Task</span>
              </button>
            </div>
          </div>

          {/* Messages Feed (WhatsApp background pattern) */}
          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 whatsapp-bg"
            onClick={() => setActiveMenuMsgId(null)}
          >
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              const isTaskCard = msg.type === 'TASK_CARD';
              const linkedTask = isTaskCard ? tasks.find((t) => t.id === msg.task_id) : null;
              const isMenuOpen = activeMenuMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}
                >
                  {/* WhatsApp Message Bubble */}
                  <div
                    className={`max-w-[88%] sm:max-w-md rounded-lg p-2.5 shadow text-xs relative ${
                      isMine
                        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-gray-100 rounded-tr-none'
                        : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-tl-none'
                    }`}
                  >
                    {/* Header: Sender Name with Designation Hover & Action Menu Trigger */}
                    <div className="flex items-center justify-between space-x-2 rtl:space-x-reverse mb-1">
                      {!isMine && msg.sender ? (
                        <div
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredSender({
                              name: msg.sender?.name || 'Team Member',
                              designation:
                                (msg.sender as any)?.designation?.title ||
                                'Pakistani Corporate Staff',
                              department:
                                (msg.sender as any)?.department?.name || 'Department Member',
                              x: rect.left,
                              y: rect.top - 10,
                            });
                          }}
                          onMouseLeave={() => setHoveredSender(null)}
                          className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300 truncate cursor-help flex items-center space-x-1"
                          title="Hover to view designation"
                        >
                          <span>{msg.sender.name}</span>
                          {(msg.sender as any)?.designation?.title && (
                            <span className="text-[9px] font-normal text-emerald-600 dark:text-emerald-400">
                              ({(msg.sender as any).designation.title})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div />
                      )}

                      {/* Dropdown Menu Trigger for this Message */}
                      {!isTaskCard && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuMsgId(isMenuOpen ? null : msg.id);
                          }}
                          className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded transition"
                          title="Message Options"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* WhatsApp Task Card in Chat (Section 6.5) */}
                    {isTaskCard && linkedTask ? (
                      <div
                        onClick={() => selectTask(linkedTask)}
                        className="bg-white/95 dark:bg-gray-800/95 rounded-lg p-3 border-2 border-emerald-500/50 my-1 cursor-pointer hover:border-emerald-600 transition shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>TASK CARD</span>
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
                            style={{ backgroundColor: linkedTask.status?.color || '#3b82f6' }}
                          >
                            {linkedTask.status?.name || 'In Progress'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 mb-1">
                          {linkedTask.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {linkedTask.due_date
                                ? format(new Date(linkedTask.due_date), 'MMM d')
                                : 'No due date'}
                            </span>
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                            <span>Open Task</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                        {msg.content}
                      </p>
                    )}

                    {/* Timestamp & Read Receipt */}
                    <div className="flex items-center justify-end space-x-1 rtl:space-x-reverse mt-1 text-[10px] text-gray-400">
                      <span>{format(new Date(msg.created_at), 'p')}</span>
                      {isMine && (
                        <span>
                          {msg.delivery_status === 'READ' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Dropdown Menu for this Message */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-7 rtl:right-auto rtl:left-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-1.5 border border-gray-200 dark:border-gray-700 z-30 min-w-44 text-xs font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Turn into Task */}
                        <button
                          onClick={() => {
                            setActiveMenuMsgId(null);
                            onCreateTaskFromMsg(msg);
                          }}
                          className="w-full px-3 py-2 text-left rtl:text-right flex items-center space-x-2 rtl:space-x-reverse hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold"
                        >
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                          <span>Turn into Task</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuMsgId(null);
                            setReplyingTo(msg);
                          }}
                          className="w-full px-3 py-1.5 text-left rtl:text-right flex items-center space-x-2 rtl:space-x-reverse hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        >
                          <Reply className="w-3.5 h-3.5 text-blue-500" />
                          <span>Reply</span>
                        </button>

                        {isMine && (
                          <button
                            onClick={() => {
                              setActiveMenuMsgId(null);
                              deleteMessage(msg.id);
                            }}
                            className="w-full px-3 py-1.5 text-left rtl:text-right flex items-center space-x-2 rtl:space-x-reverse hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying Banner */}
          {replyingTo && (
            <div className="bg-emerald-50 dark:bg-gray-800 px-4 py-2 border-t border-emerald-200 dark:border-gray-700 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 truncate">
                <Reply className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-gray-600 dark:text-gray-300 truncate">
                  Replying to: "{replyingTo.content}"
                </span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1"
              >
                âœ•
              </button>
            </div>
          )}

          {/* WhatsApp Bottom Chat Input Bar with "+ Task" button */}
          <div className="p-2 sm:p-3 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse z-10">
            <button
              onClick={() => onOpenQuickTask(activeConversation.id)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition shadow shrink-0"
              title="Create new task in this chat"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">+ Task</span>
            </button>

            <button className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
              <Smile className="w-5 h-5" />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              placeholder={t.type_message}
              value={inputContent}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 min-w-0 bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 text-xs rounded-full border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            {inputContent.trim().length > 0 ? (
              <button
                onClick={handleSend}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition shadow shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State on Desktop */
        <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
            <CheckSquare className="w-10 h-10" />
          </div>
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
            WhatsApp Team Chat & Corporate Task Management
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">
            Select a conversation on the left, expand any Department dropdown to start a 1:1 chat with Pakistani staff, or turn messages into tasks anytime.
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSidebarTab('departments')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center space-x-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>Browse 6 Departments</span>
            </button>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        FLOATING HOVER TOOLTIP: Employee Designation & Department Details
        (Positioned fixed to prevent being clipped by container overflow)
        ========================================================================
      */}
      {hoveredEmployee && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredEmployee.x}px`,
            top: `${hoveredEmployee.y}px`,
            zIndex: 9999,
          }}
          className="bg-white dark:bg-gray-900 border-2 border-emerald-500/60 rounded-xl shadow-2xl p-3.5 max-w-xs w-64 pointer-events-none transform -translate-y-2 transition-all duration-150 animate-in fade-in"
        >
          {/* Header */}
          <div className="flex items-center space-x-2.5 rtl:space-x-reverse mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold flex items-center justify-center text-sm shadow">
              {hoveredEmployee.user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                {hoveredEmployee.user.name}
              </h4>
              <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                Active & Online
              </span>
            </div>
          </div>

          {/* Key Employee Fields */}
          <div className="space-y-1.5 text-[11px] pt-1 border-t border-gray-100 dark:border-gray-800">
            {/* Designation Display */}
            <div className="flex items-start space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">DESIGNATION</span>
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  {hoveredEmployee.user.designation?.title || 'Corporate Member'}
                </span>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">DEPARTMENT</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {hoveredEmployee.user.department?.name || 'TechPak'}
                </span>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-1.5 text-gray-500 dark:text-gray-400">
              <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{hoveredEmployee.user.email}</span>
            </div>
          </div>

          {/* Click to Chat WhatsApp Prompt */}
          <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-emerald-600 font-bold">
            <span className="flex items-center space-x-1">
              <MessageSquare className="w-3 h-3" />
              <span>Click to open 1:1 chat</span>
            </span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        FLOATING HOVER TOOLTIP: Sender Designation in Message Bubbles
        ========================================================================
      */}
      {hoveredSender && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredSender.x}px`,
            top: `${hoveredSender.y}px`,
            zIndex: 9999,
          }}
          className="bg-gray-900 text-white rounded-lg shadow-xl px-2.5 py-1.5 text-[11px] pointer-events-none transform -translate-y-full mb-1 border border-emerald-500/40"
        >
          <div className="font-bold text-emerald-300">{hoveredSender.name}</div>
          <div className="text-[10px] text-gray-300">
            {hoveredSender.designation} â€¢ {hoveredSender.department}
          </div>
        </div>
      )}
    </div>
  );
};