import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Department, User } from '../../types';
import { getDepartmentMeta } from '../../services/dmsApi';
import {
  ChevronDown,
  ChevronRight,
  Shield,
  Building2,
  Users,
  CreditCard,
  Layers,
  Settings,
  MessageSquare,
  Mail,
  Phone,
  FolderKanban,
  Hash,
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

  // Dynamically compute departments that exist in the DMS user list
  const activeDepartments = useMemo(() => {
    const set = new Set<string>();
    // Priority core DMS departments
    ['admin', 'program', 'accounts_and_finance', 'store', 'procurements', 'fund_raising'].forEach((d) => set.add(d));
    users.forEach((u) => {
      if (u.department) set.add(u.department.toLowerCase());
    });
    return Array.from(set);
  }, [users]);

  // Open department states - default active departments to open
  const [openDepartments, setOpenDepartments] = useState<Record<string, boolean>>({
    program: true,
    admin: true,
    store: true,
    accounts_and_finance: true,
  });

  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

  const toggleDepartment = (deptId: string) => {
    setOpenDepartments((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  const getDepartmentIcon = (deptId: string) => {
    switch (deptId) {
      case 'admin':
        return Shield;
      case 'program':
        return FolderKanban;
      case 'accounts_and_finance':
        return CreditCard;
      case 'store':
      case 'procurements':
        return Layers;
      default:
        return Building2;
    }
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

  const handleOpenDeptChannel = (deptId: string, deptLabel: string, deptUsers: User[]) => {
    const existingChannel = chats.find(
      (c) => c.department === deptId && (c.type === 'channel' || c.type === 'group')
    );

    if (existingChannel) {
      setActiveChatId(existingChannel.id);
      setActiveMobileTab('chats');
      addToast(`Opened #${deptLabel} channel`, 'info');
    } else {
      const newChatId = createChat({
        name: `${deptLabel} Channel`,
        type: 'channel',
        participantIds: deptUsers.map((u) => u.id),
        department: deptId as Department,
      });
      setActiveChatId(newChatId);
      setActiveMobileTab('chats');
    }
  };

  return (
    <div className="w-full space-y-2 select-none">
      <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        <span>DMS Organizational Departments</span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Live Sync</span>
      </div>

      {activeDepartments.map((deptId) => {
        const meta = getDepartmentMeta(deptId);
        const deptUsers = users.filter((u) => u.department?.toLowerCase() === deptId.toLowerCase());
        const isOpen = !!openDepartments[deptId];
        const Icon = getDepartmentIcon(deptId);

        return (
          <div
            key={deptId}
            className={`rounded-xl border transition-all duration-150 overflow-hidden ${
              isOpen
                ? `${meta.borderColor} bg-white dark:bg-slate-900 shadow-2xs`
                : 'border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
            }`}
          >
            {/* Department Dropdown Header */}
            <div className="w-full flex items-center justify-between p-2.5 sm:p-3 transition-colors cursor-pointer group">
              <button
                type="button"
                onClick={() => toggleDepartment(deptId)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${meta.bgColor} ${meta.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate block">
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    {deptUsers.length} {deptUsers.length === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDeptChannel(deptId, meta.label, deptUsers);
                  }}
                  className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                  title={`Open #${meta.label} department channel`}
                >
                  <Hash className="w-3 h-3" />
                  <span>Channel</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleDepartment(deptId)}
                  className="p-1 text-slate-400 group-hover:text-slate-600 transition-transform"
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Department Members List */}
            {isOpen && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/30 p-1.5 space-y-1">
                {deptUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No users assigned to {meta.label} in DMS
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {user.designation}
                              </p>
                              {user.directReportIds && user.directReportIds.length > 0 && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold">
                                  Lead ({user.directReportIds.length})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Message CTA */}
                        <div className="shrink-0 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <span className="hidden sm:inline text-[10px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-medium">
                            Chat
                          </span>
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                        </div>

                        {/* Hover Preview Card */}
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

                            <div className="bg-slate-800/90 dark:bg-slate-900/90 rounded-lg p-2 border border-slate-700/60 mb-2">
                              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
                                DMS Role / Designation
                              </span>
                              <span className="text-xs font-bold text-amber-300 dark:text-amber-200 block mt-0.5 leading-snug">
                                {user.designation}
                              </span>
                              <span className="text-[10px] text-slate-300 mt-0.5 block">
                                Department: <span className="font-semibold text-white">{meta.label}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                DMS User ID: <span className="font-mono text-emerald-400">#{user.id}</span>
                              </span>
                              {user.managerName && (
                                <span className="text-[10px] text-slate-300 mt-0.5 block">
                                  Reports to: <span className="font-semibold text-amber-300">{user.managerName}</span>
                                </span>
                              )}
                              {user.directReportIds && user.directReportIds.length > 0 && (
                                <span className="text-[10px] text-slate-300 mt-0.5 block">
                                  Direct Reports: <span className="font-semibold text-emerald-400">{user.directReportIds.length} members</span>
                                </span>
                              )}
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-300 mb-1 truncate">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{user.phone}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-[10px] text-slate-300 truncate">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-slate-700/60 text-[10px] text-emerald-400 font-semibold flex items-center gap-1 justify-center">
                              <MessageSquare className="w-3 h-3" />
                              <span>Click to message this colleague</span>
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
