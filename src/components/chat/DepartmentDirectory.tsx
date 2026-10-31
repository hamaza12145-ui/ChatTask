import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Department, User } from '../../types';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Users,
  CreditCard,
  Megaphone,
  TrendingUp,
  Laptop,
  GraduationCap,
  Award,
  Settings,
  MessageSquare,
  Mail,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface DepartmentDirectoryProps {
  onSelectMember?: (userId: string) => void;
  compact?: boolean;
}

export const DepartmentDirectory: React.FC<DepartmentDirectoryProps> = ({
  onSelectMember,
  compact = false,
}) => {
  const { users, currentUser, chats, setActiveChatId, createChat, setActiveMobileTab, addToast } = useAppStore();

  // All requested school departments (Sales, Marketing, IT removed)
  const departmentConfig: {
    id: Department;
    label: string;
    icon: React.FC<{ className?: string }>;
    color: string;
    bgLight: string;
    borderLight: string;
  }[] = [
    {
      id: 'Management',
      label: 'School Management',
      icon: Award,
      color: 'text-emerald-700 dark:text-emerald-400',
      bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderLight: 'border-emerald-200 dark:border-emerald-800/50',
    },
    {
      id: 'Administration',
      label: 'Administration & Operations',
      icon: Shield,
      color: 'text-slate-700 dark:text-slate-300',
      bgLight: 'bg-slate-100 dark:bg-slate-800/80',
      borderLight: 'border-slate-200 dark:border-slate-700',
    },
    {
      id: 'Accounts',
      label: 'Accounts & Finance',
      icon: CreditCard,
      color: 'text-amber-600 dark:text-amber-400',
      bgLight: 'bg-amber-50 dark:bg-amber-950/40',
      borderLight: 'border-amber-200 dark:border-amber-800/50',
    },
    {
      id: 'Academics',
      label: 'Academics & Section Heads',
      icon: GraduationCap,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderLight: 'border-indigo-200 dark:border-indigo-800/50',
    },
    {
      id: 'Maintenance',
      label: 'Maintenance & Electrical',
      icon: Settings,
      color: 'text-orange-600 dark:text-orange-400',
      bgLight: 'bg-orange-50 dark:bg-orange-950/40',
      borderLight: 'border-orange-200 dark:border-orange-800/50',
    },
  ];

  // Open department state (defaults to open for quick discovery)
  const [openDepartments, setOpenDepartments] = useState<Record<string, boolean>>({
    Management: true,
    Administration: true,
    Academics: true,
  });

  // Hovered user state for rich floating card preview
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  const toggleDepartment = (deptId: string) => {
    setOpenDepartments((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const handleMemberClick = (user: User) => {
    if (onSelectMember) {
      onSelectMember(user.id);
      return;
    }

    if (user.id === currentUser.id) {
      addToast(`You are currently logged in as ${user.name}`, 'info');
      return;
    }

    // Find existing direct chat with this user
    const existingChat = chats.find(
      (c) =>
        c.type === 'direct' &&
        c.participantIds.includes(currentUser.id) &&
        c.participantIds.includes(user.id)
    );

    if (existingChat) {
      setActiveChatId(existingChat.id);
      setActiveMobileTab('chats');
      addToast(`Opened chat with ${user.name}`, 'info');
    } else {
      // Create new direct chat
      const newChatId = createChat({
        name: user.name,
        type: 'direct',
        participantIds: [user.id],
        department: user.department,
      });
      setActiveChatId(newChatId);
      setActiveMobileTab('chats');
    }
  };

  return (
    <div className="w-full space-y-1.5 select-none">
      {departmentConfig.map((dept) => {
        const deptUsers = users.filter((u) => u.department === dept.id);
        const isOpen = !!openDepartments[dept.id];
        const Icon = dept.icon;

        return (
          <div
            key={dept.id}
            className={`rounded-xl border transition-all duration-150 overflow-hidden ${
              isOpen
                ? `${dept.borderLight} bg-white dark:bg-slate-900 shadow-2xs`
                : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            {/* Department Dropdown Header Button */}
            <button
              onClick={() => toggleDepartment(dept.id)}
              className="w-full flex items-center justify-between p-2.5 sm:p-3 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${dept.bgLight} ${dept.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate block">
                    {dept.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {deptUsers.length} {deptUsers.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {deptUsers.length}
                </span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform" />
                )}
              </div>
            </button>

            {/* Dropdown Content with Relevant Department Members */}
            {isOpen && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30 p-1.5 space-y-1">
                {deptUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No members assigned to {dept.label}
                  </div>
                ) : (
                  deptUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isHovered = hoveredUserId === user.id;

                    return (
                      <div
                        key={user.id}
                        onMouseEnter={() => setHoveredUserId(user.id)}
                        onMouseLeave={() => setHoveredUserId(null)}
                        onClick={() => handleMemberClick(user)}
                        className={`relative group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                          isSelf
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60'
                            : 'hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-2xs border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80'
                        }`}
                      >
                        {/* Member Avatar & Details */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* WhatsApp-style avatar with status indicator */}
                          <div className="relative shrink-0">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${user.avatarBg}`}
                            >
                              {user.avatar}
                            </div>
                            <span
                              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                user.status === 'online'
                                  ? 'bg-emerald-500'
                                  : user.status === 'away'
                                  ? 'bg-amber-500'
                                  : user.status === 'busy'
                                  ? 'bg-rose-500'
                                  : 'bg-slate-400'
                              }`}
                              title={user.status}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                {user.name}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            {/* Designation subtitle (always visible) */}
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {user.designation}
                            </p>
                          </div>
                        </div>

                        {/* Right Quick Action Icon */}
                        <div className="shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <span className="hidden sm:inline text-[10px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium">
                            Chat
                          </span>
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                        </div>

                        {/* HOVER TOOLTIP / FLOATING CARD SHOWING DESIGNATION AS REQUESTED */}
                        {isHovered && (
                          <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl backdrop-blur-md border border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 ${user.avatarBg}`}
                              >
                                {user.avatar}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-white truncate">
                                  {user.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span className="capitalize">{user.status}</span>
                                </div>
                              </div>
                            </div>

                            {/* PROMINENT DESIGNATION DISPLAY */}
                            <div className="bg-slate-800/90 dark:bg-slate-900/90 rounded-lg p-2 border border-slate-700/60 mb-2">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                                Designation
                              </span>
                              <span className="text-xs font-bold text-amber-300 dark:text-amber-200 block mt-0.5 leading-snug">
                                {user.designation}
                              </span>
                              <span className="text-[10px] text-slate-300 mt-0.5 block">
                                Department: <span className="font-semibold text-white">{user.department}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] text-slate-300 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-slate-700/60 text-[10px] text-emerald-400 font-semibold flex items-center gap-1 justify-center">
                              <MessageSquare className="w-3 h-3" />
                              <span>Click to open WhatsApp conversation</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
