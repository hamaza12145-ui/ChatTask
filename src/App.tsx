/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppStoreProvider, useAppStore } from './store/useAppStore';
import { TopBar } from './components/TopBar';
import { BottomTabBar } from './components/BottomTabBar';
import { ToastContainer } from './components/ToastContainer';
import { ChatList } from './components/chat/ChatList';
import { ChatWindow } from './components/chat/ChatWindow';
import { GroupInfoDrawer } from './components/chat/GroupInfoDrawer';
import { TasksInChatDrawer } from './components/chat/TasksInChatDrawer';
import { NewChatModal } from './components/chat/NewChatModal';
import { TaskFormModal } from './components/tasks/TaskFormModal';
import { ProofModal } from './components/tasks/ProofModal';
import { TaskDrawer } from './components/tasks/TaskDrawer';
import { TasksBoard } from './components/tasks/TasksBoard';
import { NotificationsList } from './components/notifications/NotificationsList';
import { ProfileView } from './components/profile/ProfileView';
import { MobileDeviceFrame } from './components/mobile/MobileDeviceFrame';

const WorkspaceContent: React.FC = () => {
  const {
    activeMobileTab,
    activeChatId,
    isTaskDrawerOpen,
    deviceView,
  } = useAppStore();

  const isForcedDesktop = deviceView === 'desktop';
  const isForcedMobile = deviceView === 'mobile';

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
      {/* Dynamic Viewport Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* === CHATS TAB === */}
        {activeMobileTab === 'chats' && (
          <div className="flex-1 flex w-full h-full overflow-hidden relative">
            {isForcedDesktop ? (
              /* Forced Desktop Split View */
              <>
                <div className="w-80 lg:w-96 h-full shrink-0 flex border-r border-slate-200 dark:border-slate-800">
                  <ChatList />
                </div>
                <div className="flex-1 h-full flex min-w-0">
                  <ChatWindow />
                </div>
              </>
            ) : isForcedMobile ? (
              /* Forced Mobile View (in phone frame) */
              activeChatId ? (
                <div className="w-full h-full flex">
                  <ChatWindow />
                </div>
              ) : (
                <div className="w-full h-full flex">
                  <ChatList />
                </div>
              )
            ) : (
              /* Responsive Auto View */
              <>
                {/* Chat list: visible if no chat selected on mobile, or always on desktop (lg:) */}
                <div
                  className={`h-full ${
                    activeChatId ? 'hidden lg:flex lg:w-80 xl:w-96 shrink-0' : 'flex w-full lg:w-80 xl:w-96 shrink-0'
                  }`}
                >
                  <ChatList />
                </div>

                {/* Open chat window: visible if chat selected on mobile, or always on desktop (lg:) */}
                <div
                  className={`h-full flex-1 min-w-0 ${
                    activeChatId ? 'flex w-full' : 'hidden lg:flex'
                  }`}
                >
                  <ChatWindow />
                </div>
              </>
            )}
          </div>
        )}

        {/* === TASKS TAB === */}
        {activeMobileTab === 'tasks' && <TasksBoard />}

        {/* === NOTIFICATIONS TAB === */}
        {activeMobileTab === 'notifications' && <NotificationsList />}

        {/* === PROFILE TAB === */}
        {activeMobileTab === 'profile' && <ProfileView />}

        {/* Task Detail Drawer */}
        {isTaskDrawerOpen && <TaskDrawer />}
      </div>

      {/* Mobile Bottom Tab Bar (shown when on list view or other tabs) */}
      <BottomTabBar />
    </div>
  );
};

const MainAppContent: React.FC = () => {
  const { deviceView } = useAppStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
      {/* Universal Top Bar */}
      <TopBar />

      {/* Main Workspace with Mobile Frame Support */}
      <main className="flex-1 flex overflow-hidden relative">
        {deviceView === 'mobile' ? (
          <MobileDeviceFrame>
            <WorkspaceContent />
          </MobileDeviceFrame>
        ) : (
          <WorkspaceContent />
        )}
      </main>

      {/* Global Modals & Drawers */}
      <TaskFormModal />
      <ProofModal />
      <NewChatModal />
      <GroupInfoDrawer />
      <TasksInChatDrawer />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppStoreProvider>
      <MainAppContent />
    </AppStoreProvider>
  );
}
