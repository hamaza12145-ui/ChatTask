import * as dotenv from 'dotenv';
dotenv.config();

import { DataSource } from 'typeorm';
import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import { uuidv7 } from 'uuidv7';
import {
  ENTITIES,
  User,
  Role,
  Department,
  Branch,
  Designation,
  Conversation,
  ConversationMember,
  Message,
  Task,
  TaskStatus,
  TaskAssignee,
  TaskChecklist,
  TaskComment,
  TaskActivity,
} from '../entities';
import {
  UserRole,
  UserStatus,
  ConversationType,
  MessageType,
  MessageDeliveryStatus,
  TaskPriority,
  TaskStatusCategory,
} from '@saas/shared';

async function seed() {
  console.log('=== SEEDING GENERAL-PURPOSE APPLICATION (PAKISTANI EMPLOYEES & DEPARTMENTS) ===');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'root';
  const dbName = process.env.DB_NAME || 'taskcom';

  // 1. Ensure Database exists
  const pgClient = new Client({ host, port, user, password, database: 'postgres' });
  await pgClient.connect();
  const dbCheck = await pgClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (dbCheck.rowCount === 0) {
    console.log(`Creating database ${dbName}...`);
    await pgClient.query(`CREATE DATABASE "${dbName}"`);
  }
  await pgClient.end();

  // 2. Initialize DataSource directly with all entities
  const appDS = new DataSource({
    type: 'postgres',
    host,
    port,
    username: user,
    password,
    database: dbName,
    entities: ENTITIES,
    synchronize: true,
    logging: false,
  });
  await appDS.initialize();
  console.log(`Connected to Database: ${dbName}`);

  const roleRepo = appDS.getRepository(Role);
  const deptRepo = appDS.getRepository(Department);
  const branchRepo = appDS.getRepository(Branch);
  const desigRepo = appDS.getRepository(Designation);
  const statusRepo = appDS.getRepository(TaskStatus);
  const userRepo = appDS.getRepository(User);
  const convRepo = appDS.getRepository(Conversation);
  const memberRepo = appDS.getRepository(ConversationMember);
  const messageRepo = appDS.getRepository(Message);
  const taskRepo = appDS.getRepository(Task);
  const assigneeRepo = appDS.getRepository(TaskAssignee);
  const checklistRepo = appDS.getRepository(TaskChecklist);

  // 1. Seed Roles
  const defaultRoles = [
    { name: UserRole.OWNER, is_system: true, permissions: ['*'] },
    { name: UserRole.ADMIN, is_system: true, permissions: ['*'] },
    { name: UserRole.MANAGER, is_system: true, permissions: ['tasks:read', 'tasks:write', 'tasks:approve', 'chat:read', 'chat:write'] },
    { name: UserRole.MEMBER, is_system: true, permissions: ['tasks:read', 'tasks:write', 'chat:read', 'chat:write'] },
  ];
  for (const r of defaultRoles) {
    const exists = await roleRepo.findOne({ where: { name: r.name } });
    if (!exists) {
      await roleRepo.save(roleRepo.create(r));
    }
  }

  // 2. Seed Task Statuses
  const defaultStatuses = [
    { name: 'To Do', category: TaskStatusCategory.TODO, color: '#64748b', order: 0, is_closed: false, requires_approval: false },
    { name: 'In Progress', category: TaskStatusCategory.IN_PROGRESS, color: '#3b82f6', order: 1, is_closed: false, requires_approval: false },
    { name: 'On Hold', category: TaskStatusCategory.ON_HOLD, color: '#f59e0b', order: 2, is_closed: false, requires_approval: false },
    { name: 'Under Review', category: TaskStatusCategory.UNDER_REVIEW, color: '#8b5cf6', order: 3, is_closed: false, requires_approval: true },
    { name: 'Done', category: TaskStatusCategory.DONE, color: '#10b981', order: 4, is_closed: true, requires_approval: false },
    { name: 'Cancelled', category: TaskStatusCategory.CANCELLED, color: '#ef4444', order: 5, is_closed: true, requires_approval: false },
    { name: 'Reopened', category: TaskStatusCategory.REOPENED, color: '#ec4899', order: 6, is_closed: false, requires_approval: false },
  ];
  for (const s of defaultStatuses) {
    const exists = await statusRepo.findOne({ where: { name: s.name } });
    if (!exists) await statusRepo.save(statusRepo.create(s));
  }
  const todoStatus = (await statusRepo.findOne({ where: { name: 'To Do' } }))!;
  const inProgressStatus = (await statusRepo.findOne({ where: { name: 'In Progress' } }))!;
  const underReviewStatus = (await statusRepo.findOne({ where: { name: 'Under Review' } }))!;
  const doneStatus = (await statusRepo.findOne({ where: { name: 'Done' } }))!;

  // 3. Seed Departments
  const deptNames = [
    'Administration',
    'HR',
    'Accounts',
    'Marketing',
    'Sales',
    'IT',
  ];
  const depts: Record<string, Department> = {};
  for (const name of deptNames) {
    let d = await deptRepo.findOne({ where: { name } });
    if (!d) {
      d = await deptRepo.save(deptRepo.create({ name }));
    }
    depts[name] = d;
  }

  // 4. Seed Branches
  const branchData = [
    { name: 'Islamabad Blue Area (Head Office)', location: 'Blue Area, Jinnah Avenue, Islamabad' },
    { name: 'Lahore Gulberg Tech Branch', location: 'Main Boulevard, Gulberg III, Lahore' },
    { name: 'Karachi Shahrah-e-Faisal Office', location: 'Shahrah-e-Faisal, PECHS, Karachi' },
  ];
  const branches: Record<string, Branch> = {};
  for (const b of branchData) {
    let br = await branchRepo.findOne({ where: { name: b.name } });
    if (!br) {
      br = await branchRepo.save(branchRepo.create(b));
    }
    branches[b.name] = br;
  }
  const mainBranch = branches['Islamabad Blue Area (Head Office)'];

  // 5. Seed Designations
  const designationTitles = [
    'Chief Executive Officer (CEO)',
    'Head of Administration',
    'HR Director',
    'HR Specialist & Talent Acquisition',
    'Chief Accountant & Finance Manager',
    'Senior Tax & Audit Associate',
    'IT Infrastructure & DevOps Lead',
    'Senior Full-Stack Engineer',
    'Marketing Director',
    'Digital Marketing & SEO Lead',
    'Sales Manager',
    'Key Account Executive',
  ];
  const designations: Record<string, Designation> = {};
  for (const title of designationTitles) {
    let des = await desigRepo.findOne({ where: { title } });
    if (!des) {
      des = await desigRepo.save(desigRepo.create({ title }));
    }
    designations[title] = des;
  }

  // 6. Seed Employees
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
  const employeeData = [
    {
      name: 'Muhammad Tariq',
      email: 'tariq@acme.com',
      role: UserRole.OWNER,
      dept: 'Administration',
      desig: 'Chief Executive Officer (CEO)',
    },
    {
      name: 'Sana Javed',
      email: 'sana.javed@acme.com',
      role: UserRole.ADMIN,
      dept: 'Administration',
      desig: 'Head of Administration',
    },
    {
      name: 'Fatima Zahra',
      email: 'fatima.zahra@acme.com',
      role: UserRole.MANAGER,
      dept: 'HR',
      desig: 'HR Director',
    },
    {
      name: 'Usman Farooq',
      email: 'usman.farooq@acme.com',
      role: UserRole.MEMBER,
      dept: 'HR',
      desig: 'HR Specialist & Talent Acquisition',
    },
    {
      name: 'Bilal Ahmed',
      email: 'bilal.ahmed@acme.com',
      role: UserRole.MANAGER,
      dept: 'Accounts',
      desig: 'Chief Accountant & Finance Manager',
    },
    {
      name: 'Zainab Malik',
      email: 'zainab.malik@acme.com',
      role: UserRole.MEMBER,
      dept: 'Accounts',
      desig: 'Senior Tax & Audit Associate',
    },
    {
      name: 'Hamza Ali',
      email: 'hamza.ali@acme.com',
      role: UserRole.MANAGER,
      dept: 'IT',
      desig: 'IT Infrastructure & DevOps Lead',
    },
    {
      name: 'Ali Raza',
      email: 'ali.raza@acme.com',
      role: UserRole.MEMBER,
      dept: 'IT',
      desig: 'Senior Full-Stack Engineer',
    },
    {
      name: 'Ayesha Khan',
      email: 'ayesha.khan@acme.com',
      role: UserRole.MANAGER,
      dept: 'Marketing',
      desig: 'Marketing Director',
    },
    {
      name: 'Omer Sheikh',
      email: 'omer.sheikh@acme.com',
      role: UserRole.MEMBER,
      dept: 'Marketing',
      desig: 'Digital Marketing & SEO Lead',
    },
    {
      name: 'Kamran Akram',
      email: 'kamran.akram@acme.com',
      role: UserRole.MANAGER,
      dept: 'Sales',
      desig: 'Sales Manager',
    },
    {
      name: 'Mariam Siddiqui',
      email: 'mariam.siddiqui@acme.com',
      role: UserRole.MEMBER,
      dept: 'Sales',
      desig: 'Key Account Executive',
    },
    {
      name: 'Alice Adams (Backup Admin)',
      email: 'alice@acme.com',
      role: UserRole.OWNER,
      dept: 'Administration',
      desig: 'Chief Executive Officer (CEO)',
    },
  ];

  const userMap: Record<string, User> = {};
  for (const emp of employeeData) {
    let u = await userRepo.findOne({ where: { email: emp.email } });
    if (!u) {
      u = await userRepo.save(
        userRepo.create({
          name: emp.name,
          email: emp.email,
          password_hash: defaultPasswordHash,
          role: emp.role,
          status: UserStatus.ACTIVE,
          department_id: depts[emp.dept]?.id,
          branch_id: mainBranch?.id,
          designation_id: designations[emp.desig]?.id,
        }),
      );
    } else {
      u.name = emp.name;
      u.department_id = depts[emp.dept]?.id;
      u.designation_id = designations[emp.desig]?.id;
      await userRepo.save(u);
    }
    userMap[emp.email] = u;
  }

  const tariq = userMap['tariq@acme.com'];
  const fatima = userMap['fatima.zahra@acme.com'];
  const bilal = userMap['bilal.ahmed@acme.com'];
  const hamza = userMap['hamza.ali@acme.com'];
  const ayesha = userMap['ayesha.khan@acme.com'];
  const kamran = userMap['kamran.akram@acme.com'];
  const zainab = userMap['zainab.malik@acme.com'];
  const ali = userMap['ali.raza@acme.com'];
  const usman = userMap['usman.farooq@acme.com'];
  const omer = userMap['omer.sheikh@acme.com'];

  // 7. Seed Team & Department Conversations
  const conversationChannels = [
    { title: 'General Announcements', type: ConversationType.GROUP, desc: 'Official organization all-hands communication' },
    { title: 'Executive Management', type: ConversationType.GROUP, desc: 'CEO and Department Heads coordination' },
    { title: 'IT & Engineering Support', type: ConversationType.GROUP, desc: 'DevOps, infrastructure, and web portal sync' },
    { title: 'Finance & Accounts Team', type: ConversationType.GROUP, desc: 'Tax, invoicing, audits, and FBR filings' },
    { title: 'HR & Talent Operations', type: ConversationType.GROUP, desc: 'Recruitment, attendance, and employee welfare' },
    { title: 'Marketing & Brand Strategy', type: ConversationType.GROUP, desc: 'Social campaigns, ads, and event marketing' },
    { title: 'Corporate Sales & BD', type: ConversationType.GROUP, desc: 'Client deals, proposals, and lead conversion' },
  ];

  const convMap: Record<string, Conversation> = {};
  for (const c of conversationChannels) {
    let conv = await convRepo.findOne({ where: { title: c.title } });
    if (!conv) {
      conv = await convRepo.save(
        convRepo.create({
          type: c.type,
          title: c.title,
          description: c.desc,
          created_by: tariq.id,
        }),
      );

      for (const empUser of Object.values(userMap)) {
        await memberRepo.save(
          memberRepo.create({
            conversation_id: conv.id,
            user_id: empUser.id,
            is_admin: empUser.id === tariq.id,
          }),
        );
      }
    }
    convMap[c.title] = conv;
  }

  const itConv = convMap['IT & Engineering Support'];
  const accountsConv = convMap['Finance & Accounts Team'];
  const hrConv = convMap['HR & Talent Operations'];

  // 8. Seed Initial Messages
  const m1Id = uuidv7();
  let m1 = await messageRepo.findOne({ where: { id: m1Id } });
  if (!m1 && itConv) {
    await messageRepo.save([
      messageRepo.create({
        id: m1Id,
        conversation_id: itConv.id,
        sender_id: hamza.id,
        type: MessageType.TEXT,
        content: 'Assalam-o-Alaikum team! We need to upgrade the primary cloud database and setup automated daily backups before the weekend.',
        delivery_status: MessageDeliveryStatus.READ,
      }),
      messageRepo.create({
        id: uuidv7(),
        conversation_id: itConv.id,
        sender_id: ali.id,
        type: MessageType.TEXT,
        content: 'Walaikum Assalam Hamza bhai. The replication scripts are ready. Can you please create a task for tracking the downtime schedule?',
        delivery_status: MessageDeliveryStatus.READ,
      }),
    ]);
  }

  const mAccountsId = uuidv7();
  if (accountsConv) {
    const existingAccMsg = await messageRepo.findOne({ where: { conversation_id: accountsConv.id } });
    if (!existingAccMsg) {
      await messageRepo.save([
        messageRepo.create({
          id: mAccountsId,
          conversation_id: accountsConv.id,
          sender_id: bilal.id,
          type: MessageType.TEXT,
          content: 'Zainab, please finalize the withholding tax certificates and reconcile Annexure-C on the FBR Iris portal by Thursday.',
          delivery_status: MessageDeliveryStatus.READ,
        }),
        messageRepo.create({
          id: uuidv7(),
          conversation_id: accountsConv.id,
          sender_id: zainab.id,
          type: MessageType.TEXT,
          content: 'Noted Bilal Sahib. Working on the bank reconciliation and vendor challans right now.',
          delivery_status: MessageDeliveryStatus.READ,
        }),
      ]);
    }
  }

  // 9. Seed Corporate Tasks
  const corporateTasks = [
    {
      title: 'FBR Withholding Tax & Monthly Sales Tax Return Filing',
      description: 'Prepare monthly sales tax statement, verify vendor Active Taxpayer Status (ATL) on FBR portal, and submit Annexure-C on Iris before deadline.',
      creator: bilal,
      assignees: [bilal, zainab],
      dept: depts['Accounts'],
      priority: TaskPriority.URGENT,
      status: inProgressStatus,
      dueDays: 2,
      conv: accountsConv,
      sourceMsgId: mAccountsId,
      requiresApproval: true,
      proofRequired: true,
      labels: ['Finance', 'FBR', 'Taxation', 'Compliance'],
      checklist: [
        'Collect and audit all vendor withholding tax challans',
        'Verify NTN and ATL status on FBR online verification system',
        'Upload sales invoices on Iris e-filing portal',
        'Generate CPR (Computerized Payment Receipt) for tax deposit',
      ],
    },
    {
      title: 'Biometric Attendance Audit & Monthly Payroll Processing',
      description: 'Synchronize biometric machine punches from Islamabad and Lahore offices, process leave adjustments, and prepare salary bank transfer advice.',
      creator: fatima,
      assignees: [fatima, usman],
      dept: depts['HR'],
      priority: TaskPriority.HIGH,
      status: inProgressStatus,
      dueDays: 3,
      conv: hrConv,
      requiresApproval: true,
      proofRequired: false,
      labels: ['HR', 'Payroll', 'Attendance'],
      checklist: [
        'Sync ZKTeco biometric attendance logs from all branches',
        'Audit approved leave requests on HRMS portal',
        'Compute income tax deductions under Section 149',
        'Send salary advice letter to Bank Alfalah / Meezan Bank',
      ],
    },
    {
      title: 'Cloudflare Zero-Trust & Server SSL Certificate Renewal',
      description: 'Upgrade production PostgreSQL SSL certificates, configure Cloudflare WAF rate limiting rules, and audit failover standby replica.',
      creator: tariq,
      assignees: [hamza, ali],
      dept: depts['IT'],
      priority: TaskPriority.HIGH,
      status: underReviewStatus,
      dueDays: 4,
      conv: itConv,
      sourceMsgId: m1Id,
      requiresApproval: true,
      proofRequired: true,
      labels: ['DevOps', 'Security', 'Cloudflare', 'PostgreSQL'],
      checklist: [
        'Generate Let’s Encrypt wildcard certificates for *.app.com',
        'Configure PostgreSQL pg_hba.conf SCRAM authentication',
        'Verify zero-downtime healthcheck on Railway production',
      ],
    },
    {
      title: 'Q4 Digital Marketing Campaign for Lahore & Karachi Tech Hubs',
      description: 'Execute targeted LinkedIn and Meta B2B ad campaign targeting Chief Technology Officers and HR Heads in Islamabad, Lahore, and Karachi.',
      creator: ayesha,
      assignees: [ayesha, omer],
      dept: depts['Marketing'],
      priority: TaskPriority.MEDIUM,
      status: todoStatus,
      dueDays: 6,
      labels: ['Marketing', 'B2B', 'Campaign', 'Growth'],
      checklist: [
        'Design 10 creative carousel banners with Urdu and English copy',
        'Setup Google Analytics 4 conversion tracking events',
        'A/B test lead generation form for enterprise demo bookings',
      ],
    },
    {
      title: 'Enterprise Software SLA & Agreement for F-6 Islamabad Corporate Client',
      description: 'Draft customized SaaS enterprise licensing contract, schedule technical onboarding demo, and finalize annual maintenance terms.',
      creator: tariq,
      assignees: [kamran],
      dept: depts['Sales'],
      priority: TaskPriority.URGENT,
      status: inProgressStatus,
      dueDays: 1,
      labels: ['Sales', 'Contracts', 'Enterprise'],
      checklist: [
        'Review legal terms with corporate legal advisor',
        'Prepare technical SLA document with 99.9% uptime commitment',
        'Conduct executive demonstration for Board of Directors',
      ],
    },
  ];

  for (const tData of corporateTasks) {
    let existingT = await taskRepo.findOne({ where: { title: tData.title } });
    if (!existingT) {
      const tId = uuidv7();
      const task = await taskRepo.save(
        taskRepo.create({
          id: tId,
          title: tData.title,
          description: tData.description,
          creator_id: tData.creator.id,
          status_id: tData.status.id,
          priority: tData.priority,
          department_id: tData.dept.id,
          conversation_id: tData.conv?.id || null,
          source_message_id: tData.sourceMsgId || null,
          due_date: new Date(Date.now() + tData.dueDays * 24 * 60 * 60 * 1000),
          requires_approval: tData.requiresApproval,
          proof_required: tData.proofRequired,
          labels: tData.labels,
        }),
      );

      for (const aUser of tData.assignees) {
        await assigneeRepo.save(
          assigneeRepo.create({ task_id: task.id, user_id: aUser.id }),
        );
      }

      const clEntities = tData.checklist.map((item, idx) =>
        checklistRepo.create({
          task_id: task.id,
          title: item,
          is_completed: idx === 0,
          order: idx,
        }),
      );
      await checklistRepo.save(clEntities);

      if (tData.conv) {
        await messageRepo.save(
          messageRepo.create({
            id: uuidv7(),
            conversation_id: tData.conv.id,
            sender_id: tData.creator.id,
            type: MessageType.TASK_CARD,
            content: `Created task: ${task.title}`,
            task_id: task.id,
            delivery_status: MessageDeliveryStatus.SENT,
          }),
        );
      }
    }
  }

  await appDS.destroy();

  console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
  console.log('Pakistani Corporate Demo Accounts:');
  console.log('  CEO / Owner:       tariq@acme.com / Password123! (Muhammad Tariq)');
  console.log('  Administration:   sana.javed@acme.com (Sana Javed)');
  console.log('  HR Director:      fatima.zahra@acme.com (Fatima Zahra)');
  console.log('  Accounts Head:    bilal.ahmed@acme.com (Bilal Ahmed)');
  console.log('  IT DevOps Lead:   hamza.ali@acme.com (Hamza Ali)');
  console.log('  Marketing Head:   ayesha.khan@acme.com (Ayesha Khan)');
  console.log('  Sales Manager:    kamran.akram@acme.com (Kamran Akram)');
  console.log('  Backup / Alice:   alice@acme.com / Password123!');
  console.log('======================================\n');
}

seed().catch((err) => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
