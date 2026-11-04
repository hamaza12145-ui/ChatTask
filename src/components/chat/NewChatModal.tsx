import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Department, User } from '../../types';
import { formatDepartmentName } from '../../services/dmsApi';
import { X, Search, Check, Users, MessageSquare } from 'lucide-react';

export const NewChatModal: React.FC = () => {
  const {
    isNewChatModalOpen,
    setIsNewChatModalOpen,
    users,
    currentUser,
    createChat,
    chats,
    setActiveChatId,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  // Other users (excluding currentUser)
  const availableUsers = users.filter((u) => u.id !== currentUser.id);

  // Dynamically compute departments present in the users list
  const departments = useMemo(() => {
    const depts = new Set<string>();
    availableUsers.forEach((u) => {
      if (u.department) depts.add(u.department.toLowerCase());
    });
    return Array.from(depts);
  }, [availableUsers]);

  if (!isNewChatModalOpen) return null;

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleStartConversation = () => {
    if (selectedUserIds.length === 0) return;

    if (selectedUserIds.length === 1) {
      // Direct 1:1 chat
      const targetUser = users.find((u) => u.id === selectedUserIds[0]);
      if (!targetUser) return;

      const existing = chats.find(
        (c) =>
          c.type === 'direct' &&
          c.participantIds.includes(currentUser.id) &&
          c.participantIds.includes(targetUser.id)
      );

      if (existing) {
        setActiveChatId(existing.id);
        setIsNewChatModalOpen(false);
        return;
      }

      const newChatId = createChat({
        name: targetUser.name,
        type: 'direct',
        participantIds: [targetUser.id],
        department: targetUser.department,
      });
      setActiveChatId(newChatId);
    } else {
      // Group chat
      const finalName = groupName.trim() || `Team (${selectedUserIds.length + 1} members)`;
      const newChatId = createChat({
        name: finalName,
        type: 'group',
        participantIds: selectedUserIds,
        department: currentUser.department,
      });
      setActiveChatId(newChatId);
    }

    setIsNewChatModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              New DMS Conversation
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select one colleague for direct chat, or multiple for department group discussion.
            </p>
          </div>
          <button
            onClick={() => setIsNewChatModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Group Name input if > 1 selected */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search DMS users by name, designation, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {selectedUserIds.length > 1 && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Group Discussion Title
              </label>
              <input
                type="text"
                placeholder="e.g. Program Field Verification Team..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* User Directory Grouped by Real DMS Department */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {departments.map((dept) => {
            const deptUsers = availableUsers
              .filter((u) => u.department?.toLowerCase() === dept)
              .filter(
                (u) =>
                  u.name.toLowerCase().includes(search.toLowerCase()) ||
                  u.designation.toLowerCase().includes(search.toLowerCase()) ||
                  u.email.toLowerCase().includes(search.toLowerCase())
              );

            if (deptUsers.length === 0) return null;

            return (
              <div key={dept} className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden">
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider p-2.5 bg-slate-100/70 dark:bg-slate-800/60 flex items-center justify-between">
                  <span>{formatDepartmentName(dept)} Department</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 font-semibold">
                    {deptUsers.length}
                  </span>
                </div>
                <div className="p-1 space-y-1">
                  {deptUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);

                    return (
                      <div key={user.id} className="relative group">
                        <button
                          onClick={() => toggleSelectUser(user.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700'
                              : 'hover:bg-white dark:hover:bg-slate-800 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${user.avatarBg}`}
                              >
                                {user.avatar}
                              </div>
                              <span
                                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                                  user.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {user.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {user.designation}
                              </p>
                            </div>
                          </div>

                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {selectedUserIds.length === 0
              ? 'No colleagues selected'
              : `${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'colleague' : 'colleagues'} selected`}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewChatModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStartConversation}
              disabled={selectedUserIds.length === 0}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{selectedUserIds.length > 1 ? 'Start Group Discussion' : 'Start Chat'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
