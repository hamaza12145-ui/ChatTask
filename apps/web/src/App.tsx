'use client';
import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import { useSocketStore } from './stores/socket.store';
import { useChatStore, ChatMessage } from './stores/chat.store';
import { useTaskStore, TaskItem } from './stores/task.store';
import { Navbar } from './components/Navbar';
import { ChatView } from './components/ChatView';
import { TaskBoard } from './components/TaskBoard';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';
import { SuperAdminView } from './components/SuperAdminView';
import { LoginModal } from './components/LoginModal';
import { api } from './api/client';

export const App: React.FC = () => {
  const { user, activeTab, setAuth } = useAuthStore();
  const { connect } = useSocketStore();
  const { fetchConversations } = useChatStore();
  const { fetchTasks, fetchStatuses, isCreateModalOpen, createModalInitialData, openCreateModal, closeCreateModal } = useTaskStore();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Auto-login to demo tenant (Alice @ Acme) if first launch so user immediately sees live working system!
  useEffect(() => {
    if (!user) {
      api.post<any>('/auth/login', {
        email: 'alice@acme.com',
        password: 'Password123!',
      })
        .then((res) => {
          setAuth(res.user, res.tenant, res.access_token, res.refresh_token);
          connect();
          fetchConversations();
          fetchTasks();
          fetchStatuses();
        })
        .catch(() => {
          setIsLoginModalOpen(true);
        });
    } else {
      connect();
      fetchConversations();
      fetchTasks();
      fetchStatuses();
    }
  }, []);

  const handleTurnMsgToTask = (msg: ChatMessage) => {
    openCreateModal({
      title: `Task: ${msg.content.slice(0, 50)}...`,
      description: msg.content,
      conversation_id: msg.conversation_id,
      source_message_id: msg.id,
    });
  };

  const handleQuickCreate = (convId?: string) => {
    openCreateModal({
      conversation_id: convId,
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Top Navbar */}
      <Navbar onOpenLogin={() => setIsLoginModalOpen(true)} />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'chats' && (
          <ChatView
            onCreateTaskFromMsg={handleTurnMsgToTask}
            onOpenQuickTask={handleQuickCreate}
          />
        )}
        {activeTab === 'tasks' && (
          <TaskBoard onOpenCreate={() => openCreateModal()} />
        )}
        {activeTab === 'reports' && <ReportsView />}
        {activeTab === 'org_admin' && <AdminView />}
        {activeTab === 'super_admin' && <SuperAdminView />}
      </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        initialData={createModalInitialData}
      />
      <TaskDetailModal />
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};
