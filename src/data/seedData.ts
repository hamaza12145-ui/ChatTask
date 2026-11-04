import { User, Chat, ChatMessage, Task, AppNotification } from '../types';

/**
 * DMS APIs are the single source of truth for Users and Tasks.
 * Real records are dynamically fetched via dmsApi at runtime.
 */
export const SEED_USERS: User[] = [];
export const SEED_TASKS: Task[] = [];

/**
 * Initial Communication Channels based on DMS Organizational Hierarchy.
 * Uses real DMS user IDs (1: store, 2: procurements, 3: program, 4: finance, 5: admin, 6: anjam/manager).
 */
export const SEED_CHATS: Chat[] = [
  {
    id: 'chat_dept_program',
    name: 'Program & Operations',
    type: 'channel',
    avatarBg: 'bg-emerald-600',
    participantIds: ['3', '6', '5'],
    adminIds: ['6'],
    department: 'program',
    isPinned: true,
    lastMessage: {
      text: 'Field team update: All task deliverables for the current cycle are on schedule.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      senderId: '6',
      type: 'text',
    },
    unreadCounts: { '5': 1, '3': 0 },
    description: 'Official department channel for MTJF Program, Operations & Field Work.',
  },
  {
    id: 'chat_dept_admin',
    name: 'Executive Administration',
    type: 'channel',
    avatarBg: 'bg-slate-700',
    participantIds: ['5', '6', '4', '2', '1', '3'],
    adminIds: ['5'],
    department: 'admin',
    isPinned: true,
    lastMessage: {
      text: 'Please ensure all monthly procurement audits and task time logs are submitted.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      senderId: '5',
      type: 'text',
    },
    unreadCounts: { '1': 1, '2': 1, '3': 1 },
    description: 'Central announcements & cross-departmental coordination.',
  },
  {
    id: 'chat_dept_store',
    name: 'Store & Warehouse Operations',
    type: 'channel',
    avatarBg: 'bg-cyan-600',
    participantIds: ['1', '2', '5'],
    adminIds: ['2'],
    department: 'store',
    lastMessage: {
      text: 'Verification of stock inventory completed. Updating task proof.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      senderId: '1',
      type: 'text',
    },
    unreadCounts: { '5': 0 },
    description: 'Inventory, supplies dispatch, and warehouse logistics.',
  },
  {
    id: 'chat_dept_finance',
    name: 'Accounts & Finance',
    type: 'channel',
    avatarBg: 'bg-amber-600',
    participantIds: ['4', '5'],
    adminIds: ['4'],
    department: 'accounts_and_finance',
    lastMessage: {
      text: 'Monthly reconciliation statement prepared. Task card attached.',
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      senderId: '4',
      type: 'text',
    },
    unreadCounts: { '5': 0 },
    description: 'Disbursements, donations accounting, and vendor invoices.',
  },
  {
    id: 'chat_direct_admin_manager',
    name: 'Raza Ali (Program Manager)',
    type: 'direct',
    avatarBg: 'bg-purple-600',
    participantIds: ['5', '6'],
    adminIds: ['5', '6'],
    department: 'program',
    lastMessage: {
      text: 'Assalam-o-Alaikum Sir, reviewed the latest task allocations in DMS.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      senderId: '6',
      type: 'text',
    },
    unreadCounts: { '5': 1 },
  },
  {
    id: 'chat_direct_store_procurement',
    name: 'Procurement Manager',
    type: 'direct',
    avatarBg: 'bg-blue-600',
    participantIds: ['1', '2'],
    adminIds: ['1', '2'],
    department: 'store',
    lastMessage: {
      text: 'Requisition order verified against DMS task.',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      senderId: '2',
      type: 'text',
    },
    unreadCounts: {},
  },
];

export const SEED_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_prog_1',
    chatId: 'chat_dept_program',
    senderId: '5',
    text: 'Good morning team. Please review the pending tasks in the DMS Tasking board.',
    type: 'text',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'read',
  },
  {
    id: 'msg_prog_2',
    chatId: 'chat_dept_program',
    senderId: '6',
    text: 'Walaikum Assalam Sir. We have synchronized the deliverable schedules with DMS.',
    type: 'text',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    status: 'read',
  },
  {
    id: 'msg_prog_3',
    chatId: 'chat_dept_program',
    senderId: '6',
    text: 'Field team update: All task deliverables for the current cycle are on schedule.',
    type: 'text',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'delivered',
  },
  {
    id: 'msg_adm_1',
    chatId: 'chat_dept_admin',
    senderId: '5',
    text: 'Please ensure all monthly procurement audits and task time logs are submitted.',
    type: 'text',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'delivered',
  },
  {
    id: 'msg_store_1',
    chatId: 'chat_dept_store',
    senderId: '2',
    text: 'Store team: Please verify stock count against the latest dispatch.',
    type: 'text',
    timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
    status: 'read',
  },
  {
    id: 'msg_store_2',
    chatId: 'chat_dept_store',
    senderId: '1',
    text: 'Verification of stock inventory completed. Updating task proof.',
    type: 'text',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'read',
  },
];

export const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_init_1',
    recipientId: '5',
    senderId: '6',
    type: 'status_change',
    title: 'DMS Task Synchronized',
    body: 'Task status updated directly through DMS Tasking API',
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    read: false,
    chatId: 'chat_dept_program',
  },
  {
    id: 'notif_init_2',
    recipientId: '1',
    senderId: '2',
    type: 'new_task',
    title: 'New DMS Task Assignment',
    body: 'You have been assigned to an inventory audit task in DMS',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: false,
    chatId: 'chat_dept_store',
  },
];
