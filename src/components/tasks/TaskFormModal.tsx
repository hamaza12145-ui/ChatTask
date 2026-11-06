import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Department, TaskPriority, User } from '../../types';
import { dmsApi } from '../../services/dmsApi';
import {
  Calendar,
  Clock,
  ClipboardList,
  Folder,
  GitBranch,
  Plus,
  Check,
  User as UserIcon,
  X,
  Paperclip,
} from 'lucide-react';
import './TaskFormModal.css';

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

// The "=" icon used on the priority pill
const EqualsIcon = ({ className = '' }: { className?: string }) => (
  <span className={`pill-equals-icon ${className}`} aria-hidden="true">=</span>
);

const formatPillDate = (value: string) => {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getInitials = (u: any) => {
  if (!u) return '?';
  const a = (u?.first_name || u?.name || '').trim()[0] || '';
  const parts = (u?.first_name ? [u.first_name, u.last_name] : (u?.name || '').split(' ')).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return a ? a.toUpperCase() : (u?.email || '?')[0].toUpperCase();
};

const userDisplayName = (u: any) => {
  if (!u) return '';
  if (u?.first_name || u?.last_name) {
    return `${u?.first_name || ''} ${u?.last_name || ''}`.trim();
  }
  return u?.name || u?.email || `User #${u?.id}`;
};

const formatDepartment = (dept: string) => {
  if (!dept) return '';
  return String(dept)
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
};

/* ------------------------------------------------------------------ */
/* DatePill Component                                                 */
/* ------------------------------------------------------------------ */
interface DatePillProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  title: string;
  showDot?: boolean;
}

const DatePill: React.FC<DatePillProps> = ({
  name,
  value,
  onChange,
  icon: Icon,
  placeholder,
  title,
  showDot = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === 'function') {
      try {
        (el as any).showPicker();
        return;
      } catch (_) {
        /* fall through */
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div
      className={`pill-input-wrapper task-pill-date ${value ? 'is-filled' : 'is-empty'}`}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={0}
      title={title}
    >
      <Icon className="pill-icon" />
      <span className={`pill-text ${value ? '' : 'is-placeholder'}`}>
        {value ? formatPillDate(value) : placeholder}
      </span>
      {!value && showDot && <span className="pill-dot" />}
      <input
        ref={inputRef}
        type="date"
        name={name}
        value={value}
        onChange={onChange}
        className="pill-native-date"
        tabIndex={-1}
        aria-label={title}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* TaskFormSelect Component                                           */
/* ------------------------------------------------------------------ */
interface TaskFormSelectProps {
  name: string;
  label?: string;
  value: string;
  options: Array<{ value: string; label: string } | string>;
  onChange: (e: { target: { name: string; value: string } }) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  showDefaultOption?: boolean;
  defaultOptionText?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
}

const TaskFormSelect: React.FC<TaskFormSelectProps> = ({
  name,
  label,
  value,
  options,
  onChange,
  error,
  required = false,
  disabled = false,
  showDefaultOption = false,
  defaultOptionText = null,
  icon: Icon,
  iconClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  const getDisplayLabel = () => {
    const selectedOption = options.find((opt) =>
      (typeof opt === 'string' ? opt : opt.value) === value
    );
    if (selectedOption) {
      return typeof selectedOption === 'string' ? selectedOption : selectedOption.label;
    }
    return defaultOptionText || `Select ${label || ''}`.trim();
  };

  return (
    <div className="task-custom-select-container" ref={containerRef}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      <div
        className={`task-custom-select-display ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={handleToggle}
      >
        <span className="task-custom-select-leading">
          {Icon && <Icon className={`task-custom-select-field-icon ${iconClassName}`} />}
          <span className={`task-custom-select-value ${!value ? 'is-placeholder' : ''}`}>
            {getDisplayLabel()}
          </span>
        </span>
        <span className="task-custom-select-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="task-custom-select-dropdown">
          {showDefaultOption && (
            <button
              type="button"
              className={`task-custom-select-option ${!value ? 'is-selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              {defaultOptionText || `Select ${label || ''}`.trim()}
            </button>
          )}
          {options.map((option) => {
            const optValue = typeof option === 'string' ? option : option.value;
            const optLabel = typeof option === 'string' ? option : option.label;
            return (
              <button
                key={optValue}
                type="button"
                className={`task-custom-select-option ${value === optValue ? 'is-selected' : ''}`}
                onClick={() => handleSelect(optValue)}
              >
                <span>{optLabel}</span>
                {value === optValue && <Check className="w-3.5 h-3.5 text-[#009966]" />}
              </button>
            );
          })}
        </div>
      )}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* ProjectProgramSelect Component                                     */
/* ------------------------------------------------------------------ */
interface ProjectProgramSelectProps {
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  error?: string;
}

const ProjectProgramSelect: React.FC<ProjectProgramSelectProps> = ({ value, onChange, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectionStep, setSelectionStep] = useState<'category' | 'item'>('category');
  const [projectCategory, setProjectCategory] = useState<'Projects' | 'Programs' | ''>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const projects = [
    'MTJ Foundation',
    'Al-Hassanain College',
    'Al-Hassanain School',
    'Al-Hassanain Mudrasa',
    'Aas Lab',
    'Aas Clinics',
  ];

  const programs = [
    'General',
    'Health',
    'Education',
    'Clean Water',
    'Apna Ghar',
    'Disaster Relief',
    'KASB Skill Development',
    'Seeds of Change',
    'Qurbani Barai Mustehqeen',
    'Aaslab',
    'Community Service',
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value) {
      setSelectionStep('category');
      setProjectCategory('');
    } else if (selectionStep === 'category') {
      if (projects.includes(value)) {
        setProjectCategory('Projects');
        setSelectionStep('item');
      } else if (programs.includes(value)) {
        setProjectCategory('Programs');
        setSelectionStep('item');
      }
    }
  }, [value]);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleCategorySelect = (category: 'Projects' | 'Programs') => {
    setProjectCategory(category);
    setSelectionStep('item');
    setIsOpen(true);
  };

  const handleItemSelect = (item: string) => {
    onChange({ target: { name: 'project_name', value: item } });
    setIsOpen(false);
  };

  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectionStep('category');
    setProjectCategory('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ target: { name: 'project_name', value: '' } });
    setSelectionStep('category');
    setProjectCategory('');
    setIsOpen(false);
  };

  const isProgramValue = !!value && !projects.includes(value);
  const LeadIcon = isProgramValue ? ClipboardList : Folder;

  return (
    <div className="task-custom-select-container" ref={containerRef}>
      <div
        className={`task-custom-select-display ${isOpen ? 'is-open' : ''} ${error ? 'has-error' : ''} ${
          value ? 'is-filled has-clear' : 'is-empty'
        }`}
        onClick={handleToggle}
      >
        <span className="task-custom-select-leading">
          <LeadIcon className="task-custom-select-field-icon" />
          <span className={`task-custom-select-value ${!value ? 'is-placeholder' : ''}`}>
            {value || 'Project'}
          </span>
        </span>
        {!value && <span className="pill-dot" />}
        <span className="task-custom-select-arrow">▼</span>
      </div>

      {value && (
        <button
          type="button"
          className="task-custom-select-clear-btn"
          onClick={handleClear}
          aria-label="Clear project"
        >
          ✕
        </button>
      )}

      {isOpen && (
        <div className="task-custom-select-dropdown">
          <div className="task-custom-select-dropdown-header">
            <span className="task-custom-select-dropdown-title">
              {selectionStep === 'category' ? 'Select Category' : projectCategory}
            </span>
            {selectionStep === 'item' && (
              <button type="button" className="task-custom-select-back-link" onClick={handleBack}>
                ← Back
              </button>
            )}
          </div>

          <div className="task-custom-select-options-list">
            {selectionStep === 'category' ? (
              <>
                <button
                  type="button"
                  className="task-custom-select-option"
                  onClick={() => handleCategorySelect('Projects')}
                >
                  <span className="task-custom-select-option-label">
                    <Folder className="w-4 h-4 text-slate-500" /> Projects
                  </span>
                  <span className="task-custom-select-option-arrow">›</span>
                </button>
                <button
                  type="button"
                  className="task-custom-select-option"
                  onClick={() => handleCategorySelect('Programs')}
                >
                  <span className="task-custom-select-option-label">
                    <ClipboardList className="w-4 h-4 text-slate-500" /> Programs
                  </span>
                  <span className="task-custom-select-option-arrow">›</span>
                </button>
              </>
            ) : (
              (projectCategory === 'Projects' ? projects : programs).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`task-custom-select-option ${value === item ? 'is-selected' : ''}`}
                  onClick={() => handleItemSelect(item)}
                >
                  <span>{item}</span>
                  {value === item && <Check className="w-3.5 h-3.5 text-[#009966]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* MovAssignmentPicker Component                                      */
/* ------------------------------------------------------------------ */
interface MovAssignmentPickerProps {
  assignedUsers: any[];
  userId: string | number | null;
  onChange: (userId: string | number | null) => void;
  onAssignAll?: (userId: string | number | null) => void;
  disabled?: boolean;
}

const MovAssignmentPicker: React.FC<MovAssignmentPickerProps> = ({
  assignedUsers = [],
  userId,
  onChange,
  onAssignAll,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'all'>('single');

  const selectedUser = useMemo(
    () => assignedUsers.find((u) => String(u.id) === String(userId)),
    [assignedUsers, userId]
  );

  useEffect(() => {
    if (assignedUsers.length === 1 && userId == null) {
      onChange(assignedUsers[0].id);
    }
  }, [assignedUsers, onChange, userId]);

  useEffect(() => {
    if (!isOpen) setMode('single');
  }, [isOpen]);

  const label = selectedUser ? userDisplayName(selectedUser) : 'Unassigned';
  const canAssignAll = typeof onAssignAll === 'function' && assignedUsers.length > 1;

  const handlePick = (id: string | number | null) => {
    if (mode === 'all' && canAssignAll && onAssignAll) {
      onAssignAll(id);
    } else {
      onChange(id);
    }
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="mov-assignment-button"
        onClick={() => setIsOpen(true)}
        disabled={disabled || assignedUsers.length === 0}
      >
        {selectedUser ? (
          selectedUser.avatar ? (
            <img className="mov-assignment-avatar" src={selectedUser.avatar} alt="" />
          ) : (
            <span className="mov-assignment-avatar mov-assignment-avatar--fallback">
              {getInitials(selectedUser)}
            </span>
          )
        ) : (
          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span className="truncate max-w-[120px]">{label}</span>
      </button>

      {isOpen && (
        <div
          className="mov-assignment-modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsOpen(false)}
        >
          <div
            className="mov-assignment-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Assign MOV user"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mov-assignment-modal-header">
              <h3>Assign MOV User</h3>
              <button
                type="button"
                className="mov-assignment-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {canAssignAll && (
              <div className="mov-assignment-mode-toggle">
                <button
                  type="button"
                  className={`mov-assignment-mode-btn ${mode === 'single' ? 'is-active' : ''}`}
                  onClick={() => setMode('single')}
                >
                  Assign this condition
                </button>
                <button
                  type="button"
                  className={`mov-assignment-mode-btn ${mode === 'all' ? 'is-active' : ''}`}
                  onClick={() => setMode('all')}
                >
                  Assign to all conditions
                </button>
              </div>
            )}

            <div className="mov-assignment-users">
              {assignedUsers.map((user) => {
                const isSelected = String(user.id) === String(userId);
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`mov-assignment-user ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handlePick(user.id)}
                  >
                    {user.avatar ? (
                      <img className="mov-assignment-avatar" src={user.avatar} alt="" />
                    ) : (
                      <span className="mov-assignment-avatar mov-assignment-avatar--fallback">
                        {getInitials(user)}
                      </span>
                    )}
                    <span className="mov-assignment-user-details">
                      <strong>{userDisplayName(user)}</strong>
                      {user.email && <small>{user.email}</small>}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#009966]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Searchable User Selector Component                                 */
/* ------------------------------------------------------------------ */
interface SearchableUserSelectProps {
  placeholder?: string;
  selectedUsers: any[];
  onSelectUser: (user: any) => void;
  onRemoveUser: (userId: string | number) => void;
  availableUsers: any[];
  isApprover?: boolean;
}

const SearchableUserSelect: React.FC<SearchableUserSelectProps> = ({
  placeholder = 'Assignee',
  selectedUsers = [],
  onSelectUser,
  onRemoveUser,
  availableUsers = [],
  isApprover = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiUsers, setApiUsers] = useState<any[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search users through backend options API if term >= 2 chars
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (!isOpen) setIsOpen(true);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (term.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsLoadingApi(true);
        try {
          const res = await dmsApi.request<{ success?: boolean; data?: any[] }>(
            `/users/options?search=${encodeURIComponent(term.trim())}&active=true`
          );
          const usersList = res.data || (Array.isArray(res) ? res : []);
          setApiUsers(usersList);
        } catch {
          // fallback to available users
        } finally {
          setIsLoadingApi(false);
        }
      }, 300);
    } else {
      setApiUsers([]);
    }
  };

  const filteredUsers = useMemo(() => {
    const mergedMap = new Map<string, any>();
    availableUsers.forEach((u) => mergedMap.set(String(u.id), u));
    apiUsers.forEach((u) => mergedMap.set(String(u.id), u));

    const list = Array.from(mergedMap.values());
    if (!searchTerm.trim()) return list;

    const query = searchTerm.toLowerCase();
    return list.filter((u) => {
      const name = userDisplayName(u).toLowerCase();
      const email = (u?.email || '').toLowerCase();
      const dept = (u?.department || '').toLowerCase();
      return name.includes(query) || email.includes(query) || dept.includes(query);
    });
  }, [availableUsers, apiUsers, searchTerm]);

  return (
    <div className="searchable-select-field" ref={containerRef}>
      <div
        className={`searchable-select-display ${selectedUsers.length === 0 ? 'is-empty' : 'is-filled'} ${
          isApprover ? 'has-icon' : selectedUsers.length > 0 ? 'has-avatar' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <input
          type="text"
          className="searchable-select-input"
          placeholder={
            selectedUsers.length === 0
              ? placeholder
              : selectedUsers.length === 1
              ? userDisplayName(selectedUsers[0])
              : `${selectedUsers.length} selected`
          }
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />
        <span className="task-custom-select-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="searchable-select-dropdown">
          {isLoadingApi && (
            <div className="p-2 text-xs text-slate-400 text-center">Searching colleagues...</div>
          )}
          {filteredUsers.length === 0 && !isLoadingApi && (
            <div className="p-2 text-xs text-slate-400 text-center">No colleagues found</div>
          )}
          {filteredUsers.map((user) => {
            const isSelected = selectedUsers.some((u) => String(u.id) === String(user.id));
            return (
              <div
                key={user.id}
                className={`searchable-user-option ${isSelected ? 'is-selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    onRemoveUser(user.id);
                  } else {
                    onSelectUser(user);
                  }
                }}
              >
                {user.avatar ? (
                  <img className="w-6 h-6 rounded-full object-cover" src={user.avatar} alt="" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#e6f5ef] dark:bg-emerald-950 text-[#009966] dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center">
                    {getInitials(user)}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="searchable-user-name truncate">{userDisplayName(user)}</div>
                  <div className="searchable-user-email truncate">
                    {user.email} • {formatDepartment(user.department)}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#009966]" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Main TaskFormModal Component                                       */
/* ------------------------------------------------------------------ */
export const TaskFormModal: React.FC = () => {
  const {
    isCreateTaskModalOpen,
    closeCreateTaskModal,
    taskModalInitialData,
    createTask,
    users,
    currentUser,
    activeChat,
    addToast,
  } = useAppStore();

  const departmentOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'program', label: 'Program' },
    { value: 'store', label: 'Store' },
    { value: 'procurements', label: 'Procurements' },
    { value: 'accounts_and_finance', label: 'Accounts & Finance' },
    { value: 'fund_raising', label: 'Fund Raising' },
    { value: 'it', label: 'I.T' },
    { value: 'hr', label: 'HR' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'audio_video', label: 'Audio Video' },
    { value: 'meal', label: 'Meal' },
  ];

  const isAdmin = useMemo(() => {
    const r = String(currentUser?.role || '').toLowerCase();
    return r === 'super_admin' || r === 'admin' || (currentUser as any)?.isSuperAdmin;
  }, [currentUser?.role]);

  // Default department
  const defaultDept = useMemo(() => {
    return (
      (taskModalInitialData?.department as string) ||
      (activeChat?.department as string) ||
      currentUser?.department ||
      'admin'
    );
  }, [taskModalInitialData, activeChat, currentUser]);

  const emptyForm = useCallback(
    () => ({
      title: '',
      description: '',
      department: defaultDept,
      priority: 'medium',
      workflow_type: 'standard',
      task_type: 'one_time',
      recurrence_frequency: '',
      custom_recurrence_days: '',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      project_name: '',
      recurrence_rule: '',
      recurrence_next_date: '',
      recurrence_end_type: 'never',
      recurrence_end_date: '',
      recurrence_end_occurrences: '',
      approval_required: false,
    }),
    [defaultDept]
  );

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [assignedUserDepartments, setAssignedUserDepartments] = useState<Record<string, string>>({});
  const [approverUsers, setApproverUsers] = useState<any[]>([]);
  const [movItems, setMovItems] = useState<Array<{ text: string; user_id: string | number | null }>>([
    { text: '', user_id: null },
  ]);
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ id: string; name: string; file: File }>
  >([]);
  const [createAnother, setCreateAnother] = useState(false);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const deptRef = useRef<HTMLDivElement>(null);

  // Close department dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prepopulate form when initialData changes or modal opens
  useEffect(() => {
    if (isCreateTaskModalOpen) {
      setError('');
      setSubmitting(false);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDueDate = tomorrow.toISOString().split('T')[0];
      const todayDate = new Date().toISOString().split('T')[0];

      if (taskModalInitialData) {
        setForm({
          title: taskModalInitialData.title || '',
          description: taskModalInitialData.description || '',
          department:
            (taskModalInitialData.department as string) ||
            (activeChat?.department as string) ||
            currentUser?.department ||
            'admin',
          priority: (taskModalInitialData.priority as string) || 'medium',
          workflow_type: taskModalInitialData.requiresApproval ? 'approval_required' : 'standard',
          task_type: 'one_time',
          recurrence_frequency: '',
          custom_recurrence_days: '',
          start_date: todayDate,
          due_date: taskModalInitialData.dueDate
            ? taskModalInitialData.dueDate.split('T')[0]
            : defaultDueDate,
          project_name: '',
          recurrence_rule: '',
          recurrence_next_date: '',
          recurrence_end_type: 'never',
          recurrence_end_date: '',
          recurrence_end_occurrences: '',
          approval_required: !!taskModalInitialData.requiresApproval,
        });

        // Prepopulate assignees
        if (taskModalInitialData.assigneeIds && taskModalInitialData.assigneeIds.length > 0) {
          const matched = users.filter((u) => taskModalInitialData.assigneeIds?.includes(u.id));
          setAssignedUsers(matched.length > 0 ? matched : [currentUser]);
        } else if (activeChat) {
          const otherMembers = activeChat.participantIds.filter((id) => id !== currentUser.id);
          const matched = users.filter((u) => otherMembers.includes(u.id));
          setAssignedUsers(matched.length > 0 ? [matched[0]] : [currentUser]);
        } else {
          setAssignedUsers([currentUser]);
        }

        // Prepopulate MOV checklist: allow user to put their own text in MOV
        const isDummyChecklistTitle = (t: string) => {
          const s = (t || '').toLowerCase().trim();
          return (
            s === 'review requirements and setup' ||
            s === 'execute deliverable and verify' ||
            s === 'verify specifications' ||
            s === 'execute implementation'
          );
        };

        const customChecklist = (taskModalInitialData.checklist || []).filter(
          (c) => c && c.title && !isDummyChecklistTitle(c.title)
        );

        if (customChecklist.length > 0) {
          setMovItems(
            customChecklist.map((c) => ({
              text: c.title,
              user_id: null,
            }))
          );
        } else {
          setMovItems([{ text: '', user_id: null }]);
        }
      } else {
        setForm({
          ...emptyForm(),
          start_date: todayDate,
          due_date: defaultDueDate,
        });
        setAssignedUsers([currentUser]);
        setMovItems([{ text: '', user_id: null }]);
      }

      setPendingAttachments([]);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [isCreateTaskModalOpen, taskModalInitialData, activeChat, currentUser, users, emptyForm]);

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter to submit
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!submitting) {
          formRef.current?.requestSubmit();
        }
      }
    };
    if (isCreateTaskModalOpen) {
      document.addEventListener('keydown', onKeyDown);
      return () => document.removeEventListener('keydown', onKeyDown);
    }
  }, [isCreateTaskModalOpen, submitting]);

  // Single task assignee → all MOVs belong to them
  useEffect(() => {
    if (assignedUsers.length !== 1) return;
    const soleId = assignedUsers[0].id;
    setMovItems((prev) =>
      prev.map((item) =>
        String(item.user_id) === String(soleId) ? item : { ...item, user_id: soleId }
      )
    );
  }, [assignedUsers]);

  // Auto-calculate due date based on recurrence frequency
  const calculateDueDate = (startDate: string, frequency: string, customDaysStr?: string) => {
    if (!startDate || !frequency) return '';

    const start = new Date(startDate);
    if (isNaN(start.getTime())) return '';

    const dueDate = new Date(start);

    switch (frequency) {
      case 'daily':
        dueDate.setDate(dueDate.getDate() + 1);
        break;
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + 1);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + 3);
        break;
      case 'annually':
        dueDate.setFullYear(dueDate.getFullYear() + 1);
        break;
      case 'other':
        const customDays = parseInt(customDaysStr || '1', 10) || 1;
        dueDate.setDate(dueDate.getDate() + customDays);
        break;
      default:
        return '';
    }

    return dueDate.toISOString().split('T')[0];
  };

  const syncFromTaskType = (next: typeof form) => {
    const tt = next.task_type;
    const freq = next.recurrence_frequency;
    let wt = next.workflow_type;
    let rr = next.recurrence_rule;
    if (tt === 'approval_based') wt = 'approval_required';
    if (tt === 'one_time' || tt === 'project_linked') {
      wt = 'standard';
      rr = '';
    }
    if (tt === 'recurring') {
      wt = 'standard';
      if (freq === 'other') {
        rr = next.custom_recurrence_days ? `${next.custom_recurrence_days} days` : '';
      } else {
        rr = freq || '';
      }
    }
    setForm((prev) => ({ ...prev, workflow_type: wt, recurrence_rule: rr }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const next = {
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    };

    // Auto-calculate due date when start_date or recurrence_frequency changes
    if ((name === 'start_date' || name === 'recurrence_frequency') && next.task_type === 'recurring') {
      const calculatedDueDate = calculateDueDate(
        next.start_date,
        next.recurrence_frequency,
        next.custom_recurrence_days
      );
      if (calculatedDueDate) {
        next.due_date = calculatedDueDate;
      }
    }

    setForm(next);

    if (name === 'custom_recurrence_days') {
      syncFromTaskType(next);
    }
  };

  const handleSelectChange = (e: { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    const next = { ...form, [name]: value };

    // If switching frequency to other, clear custom days
    if (name === 'recurrence_frequency' && value !== 'other') {
      next.custom_recurrence_days = '';
    }

    // Automatically set start_date to today if priority is 'critical'
    if (name === 'priority' && value === 'critical') {
      const today = new Date().toISOString().split('T')[0];
      next.start_date = today;
    }

    if (name === 'start_date' || name === 'recurrence_frequency') {
      if (next.task_type === 'recurring') {
        const calculatedDueDate = calculateDueDate(
          next.start_date,
          next.recurrence_frequency,
          next.custom_recurrence_days
        );
        if (calculatedDueDate) {
          next.due_date = calculatedDueDate;
        }
      }
    }

    setForm(next);
    if (name === 'task_type' || name === 'recurrence_frequency' || name === 'custom_recurrence_days') {
      syncFromTaskType(next);
    }
  };

  // MOV Handlers
  const handleMovChange = (index: number, val: string) => {
    setMovItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text: val };
      return next;
    });
  };

  const handleMovAdd = () => {
    const defaultUserId = assignedUsers.length === 1 ? assignedUsers[0].id : null;
    setMovItems((prev) => [...prev, { text: '', user_id: defaultUserId }]);
  };

  const handleMovRemove = (index: number) => {
    setMovItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMovUserChange = (index: number, userId: string | number | null) => {
    setMovItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, user_id: userId } : item))
    );
  };

  const handleMovAssignAll = (userId: string | number | null) => {
    setMovItems((prev) => prev.map((item) => ({ ...item, user_id: userId })));
  };

  // Attachments Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] || null;
    if (!next) return;

    if (next.size > 10 * 1024 * 1024) {
      setError('File must be 10MB or smaller');
      e.target.value = '';
      return;
    }

    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: next.name,
      file: next,
    };

    setPendingAttachments((prev) => [...prev, newItem]);
    setError('');
    e.target.value = '';
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const resetFormState = () => {
    setForm(emptyForm());
    setError('');
    setAssignedUsers([currentUser]);
    setAssignedUserDepartments({});
    setApproverUsers([]);
    setMovItems([{ text: '', user_id: null }]);
    setPendingAttachments([]);
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const department = isAdmin ? form.department || 'admin' : currentUser?.department || 'admin';
    const validationErrors: string[] = [];

    if (!form.title || !form.title.trim()) {
      validationErrors.push('Task title is required.');
    }
    if (!department) {
      validationErrors.push('Department is required.');
    }
    if (!form.task_type) {
      validationErrors.push('Task type is required.');
    }
    if (!form.workflow_type) {
      validationErrors.push('Workflow type is required.');
    }
    if (!form.priority) {
      validationErrors.push('Priority is required.');
    }
    if (!form.start_date) {
      validationErrors.push('Start date is required.');
    }
    if (!form.due_date) {
      validationErrors.push('Due date is required.');
    }
    if (!assignedUsers || assignedUsers.length === 0) {
      validationErrors.push('At least one assignee is required.');
    }

    const movItemsClean = movItems
      .map((item) => ({ ...item, text: String(item.text || '').trim() }))
      .filter((item) => item.text.length > 0);

    if (form.workflow_type === 'approval_required') {
      if (!approverUsers || approverUsers.length === 0) {
        validationErrors.push('At least one approver is required for approval-required tasks.');
      }
    }

    if (form.task_type === 'recurring') {
      if (!form.recurrence_frequency) {
        validationErrors.push('Recurring frequency is required for recurring tasks.');
      }
    }

    if (validationErrors.length > 0) {
      const msg = validationErrors.join(' ');
      setError(msg);
      addToast(msg, 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const titleTrimmed = String(form.title || '').trim();
      const descriptionTrimmed = String(form.description || '').trim();

      const createdTask = await createTask({
        title: titleTrimmed,
        description: descriptionTrimmed || titleTrimmed,
        department: department as Department,
        priority: form.priority as TaskPriority,
        startDate: form.start_date,
        dueDate: form.due_date,
        assigneeIds: assignedUsers.map((u) => String(u.id)),
        checklistTitles: movItemsClean.map((m) => m.text),
        requiresApproval: form.workflow_type === 'approval_required',
        proofRequired: false,
        sourceChatId: taskModalInitialData?.sourceChatId || activeChat?.id,
        sourceMessageId: taskModalInitialData?.sourceMessageId,
        taskType: form.task_type,
        workflowType: form.workflow_type,
        projectName: form.project_name || undefined,
        recurrenceRule: form.recurrence_rule || undefined,
        recurrenceNextDate: form.recurrence_next_date || undefined,
        recurrenceEndType: form.recurrence_end_type || undefined,
        recurrenceEndDate: form.recurrence_end_date || undefined,
        recurrenceEndOccurrences: form.recurrence_end_occurrences
          ? parseInt(form.recurrence_end_occurrences, 10)
          : undefined,
        approvalRequiredUserIds:
          approverUsers.length > 0 ? approverUsers.map((u) => parseInt(String(u.id), 10)) : undefined,
        movChecklist: movItemsClean.map((item) => ({
          text: item.text,
          checked: false,
          checked_by_id: null,
          checked_at: null,
        })),
        movAssignments: movItemsClean.map((item, index) => ({
          mov_index: index,
          user_id:
            assignedUsers.length === 1
              ? parseInt(String(assignedUsers[0].id), 10)
              : item.user_id
              ? parseInt(String(item.user_id), 10)
              : null,
        })),
        assignedUsersMeta: assignedUsers.map((u) => ({
          user_id: parseInt(String(u.id), 10),
          department:
            assignedUserDepartments[String(u.id)] ||
            u.department ||
            department ||
            'admin',
        })),
      });

      // Upload pending attachments if any
      if (createdTask?.id && pendingAttachments.length > 0) {
        let uploaded = 0;
        let failed = 0;
        for (const item of pendingAttachments) {
          try {
            await dmsApi.uploadTaskAttachment(createdTask.id, item.file, item.name, true);
            uploaded += 1;
          } catch {
            failed += 1;
          }
        }
        if (uploaded > 0) {
          addToast(
            uploaded === 1
              ? 'Attachment uploaded successfully.'
              : `${uploaded} attachments uploaded successfully.`,
            'success'
          );
        }
        if (failed > 0) {
          addToast(
            failed === 1
              ? 'Task created, but failed to upload 1 attachment.'
              : `Task created, but failed to upload ${failed} attachments.`,
            'warning'
          );
        }
      }

      addToast('Task created successfully.', 'success');

      if (createAnother) {
        resetFormState();
      } else {
        closeCreateTaskModal();
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to create task.';
      setError(msg);
      addToast(msg, 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCreateTaskModalOpen) return null;

  const currentDepartment = isAdmin ? form.department || 'admin' : currentUser?.department || 'admin';
  const currentDepartmentLabel =
    departmentOptions.find((d) => d.value === currentDepartment)?.label ||
    formatDepartment(currentDepartment);

  return (
    <div className="add-task-modal-backdrop" onClick={closeCreateTaskModal}>
      <div
        className="add-task-card add-task-card--popup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header: [Department chip] › New task */}
        <div className="task-form-modal-header">
          <div className="task-form-breadcrumb">
            <div className="relative" ref={deptRef}>
              <button
                type="button"
                className="task-form-dept-chip cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5"
                onClick={() => isAdmin && setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                title={isAdmin ? 'Change Department' : undefined}
              >
                <span>{currentDepartmentLabel} Department</span>
                {isAdmin && <span className="text-[10px] opacity-60">▼</span>}
              </button>

              {isAdmin && isDeptDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50">
                  {departmentOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                        form.department === opt.value
                          ? 'bg-[#e6f5ef] dark:bg-emerald-950/60 text-[#009966] dark:text-emerald-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, department: opt.value }));
                        setIsDeptDropdownOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="task-form-breadcrumb-sep">›</span>
            <h2 className="task-form-modal-title">New task</h2>
          </div>

          <button
            type="button"
            className="task-form-modal-close"
            onClick={closeCreateTaskModal}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && <div className="add-task-error">{error}</div>}

        {submitting && (
          <div className="add-task-submitting-overlay">Creating task, please wait...</div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="add-task-form">
          <div className="add-task-body">
            {/* Main Title & Description */}
            <div className="task-title-section">
              <input
                ref={titleRef}
                type="text"
                name="title"
                className="task-title-input add-task-title-input"
                placeholder="Enter task title..."
                value={form.title}
                onChange={handleChange}
                required
                autoFocus
              />
              <textarea
                name="description"
                className="task-desc-input"
                placeholder="Enter task description..."
                value={form.description}
                onChange={handleChange}
                rows={2}
              />
            </div>

            {/* Meta Pills Row */}
            <div className="task-meta-pills">
              {/* Assignee Field */}
              <div
                className={`add-task-assignee-field ${
                  assignedUsers.length > 0 ? 'is-filled' : 'is-empty'
                }`}
              >
                {assignedUsers.length > 0 && (
                  <span
                    className="assignee-avatar"
                    aria-hidden="true"
                    title={assignedUsers.map((u) => userDisplayName(u)).join(', ')}
                  >
                    {assignedUsers.length === 1 ? getInitials(assignedUsers[0]) : assignedUsers.length}
                  </span>
                )}
                <SearchableUserSelect
                  placeholder="Assignee"
                  selectedUsers={assignedUsers}
                  onSelectUser={(u) => setAssignedUsers((prev) => [...prev, u])}
                  onRemoveUser={(id) =>
                    setAssignedUsers((prev) => prev.filter((u) => String(u.id) !== String(id)))
                  }
                  availableUsers={users}
                />
              </div>

              {/* Project / Program Hierarchical Select */}
              <ProjectProgramSelect
                value={form.project_name}
                onChange={(e) => setForm((prev) => ({ ...prev, project_name: e.target.value }))}
              />

              {/* Priority Pill */}
              <div className={`task-pill-priority priority-${form.priority || 'medium'}`}>
                <TaskFormSelect
                  name="priority"
                  label=""
                  value={form.priority}
                  onChange={handleSelectChange}
                  icon={EqualsIcon}
                  defaultOptionText="Priority"
                  options={['low', 'medium', 'high', 'critical'].map((p) => ({
                    value: p,
                    label: p[0].toUpperCase() + p.slice(1),
                  }))}
                />
              </div>

              {/* Start Date Pill */}
              <DatePill
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                icon={Clock}
                placeholder="Start date"
                title="Start Date"
              />

              {/* Due Date Pill */}
              <DatePill
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                icon={Calendar}
                placeholder="Due date"
                title="Due Date"
                showDot
              />

              {/* Task Type Pill */}
              <TaskFormSelect
                name="task_type"
                label=""
                value={form.task_type}
                onChange={handleSelectChange}
                icon={Plus}
                defaultOptionText="Task Type"
                options={[
                  { value: 'one_time', label: 'One-time' },
                  { value: 'recurring', label: 'Recurring' },
                  { value: 'project_linked', label: 'Project-linked' },
                ]}
              />

              {/* Workflow Type Pill */}
              <TaskFormSelect
                name="workflow_type"
                label=""
                value={form.workflow_type}
                onChange={handleSelectChange}
                icon={GitBranch}
                defaultOptionText="Workflow"
                options={[
                  { value: 'standard', label: 'Standard workflow' },
                  { value: 'approval_required', label: 'Approval required' },
                ]}
              />

              {/* Approvers Pill (Conditional when approval_required) */}
              {form.workflow_type === 'approval_required' && (
                <div
                  className={`add-task-approver-field ${
                    approverUsers.length > 0 ? 'is-filled' : 'is-empty'
                  }`}
                >
                  <ClipboardList className="add-task-approver-icon" aria-hidden="true" />
                  <SearchableUserSelect
                    placeholder="Approvers"
                    selectedUsers={approverUsers}
                    onSelectUser={(u) => setApproverUsers((prev) => [...prev, u])}
                    onRemoveUser={(id) =>
                      setApproverUsers((prev) => prev.filter((u) => String(u.id) !== String(id)))
                    }
                    availableUsers={users}
                    isApprover={true}
                  />
                </div>
              )}
            </div>

            {/* Multiple Assignees Summary */}
            {assignedUsers.length > 1 && (
              <div className="popup-assignee-summary">
                <span className="popup-assignee-count">✓ {assignedUsers.length} users selected</span>
                {assignedUsers.map((u) => (
                  <span key={u.id} className="popup-assignee-chip">
                    <span className="chip-avatar">{getInitials(u)}</span>
                    <span className="chip-name">{userDisplayName(u)}</span>
                    <span className="chip-dept">
                      {formatDepartment(
                        assignedUserDepartments[String(u.id)] || u.department || form.department || ''
                      )}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {/* Recurring Conditional Block */}
            {form.task_type === 'recurring' && (
              <div className="add-task-recurring-fields">
                <div className="form-group">
                  <label className="form-label">Recurring frequency</label>
                  <select
                    name="recurrence_frequency"
                    value={form.recurrence_frequency}
                    onChange={(e) => handleSelectChange({ target: { name: 'recurrence_frequency', value: e.target.value } })}
                    className="form-input"
                  >
                    <option value="">Select Frequency</option>
                    {['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'other'].map((f) => (
                      <option key={f} value={f}>
                        {f[0].toUpperCase() + f.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {form.recurrence_frequency === 'other' && (
                  <div className="form-group">
                    <label className="form-label">Custom recurrence days</label>
                    <input
                      name="custom_recurrence_days"
                      type="number"
                      min="1"
                      className="form-input"
                      value={form.custom_recurrence_days}
                      onChange={handleChange}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">End after</label>
                  <select
                    name="recurrence_end_type"
                    value={form.recurrence_end_type}
                    onChange={(e) => handleSelectChange({ target: { name: 'recurrence_end_type', value: e.target.value } })}
                    className="form-input"
                  >
                    <option value="never">Indefinitely</option>
                    <option value="on_date">On specific date</option>
                    <option value="after_occurrences">After occurrences</option>
                  </select>
                </div>

                {form.recurrence_end_type === 'on_date' && (
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      name="recurrence_end_date"
                      type="date"
                      className="form-input"
                      value={form.recurrence_end_date}
                      onChange={handleChange}
                    />
                  </div>
                )}

                {form.recurrence_end_type === 'after_occurrences' && (
                  <div className="form-group">
                    <label className="form-label">Number of occurrences</label>
                    <input
                      name="recurrence_end_occurrences"
                      type="number"
                      min="1"
                      className="form-input"
                      value={form.recurrence_end_occurrences}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Done When Section (Means of Verification / MOV) */}
            <div className="done-when-section">
              <div className="done-when-header">
                Done when... <span>Means of verification the assignee must tick off</span>
              </div>

              {movItems.map((item, index) => (
                <div key={index} className="done-when-input-wrapper">
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleMovChange(index, e.target.value)}
                    placeholder="Define a clear, specific, and measurable verification point"
                  />
                  {assignedUsers.length > 1 && (
                    <MovAssignmentPicker
                      assignedUsers={assignedUsers}
                      userId={item.user_id}
                      onChange={(uid) => handleMovUserChange(index, uid)}
                      onAssignAll={handleMovAssignAll}
                      disabled={submitting}
                    />
                  )}
                  {movItems.length > 1 && (
                    <button
                      type="button"
                      className="done-when-remove-btn"
                      onClick={() => handleMovRemove(index)}
                      title="Remove"
                      aria-label="Remove condition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button type="button" className="done-when-add-btn" onClick={handleMovAdd}>
                <Plus className="w-4 h-4" /> Add condition
              </button>
            </div>

            {/* Attachments Dropzone */}
            <div className="attachment-dropzone">
              <label htmlFor="task-form-file-input" className="task-pending-attachments__dropzone-label">
                <Paperclip className="task-pending-attachments__dropzone-icon" />
                <span>
                  Drop files or <span className="task-pending-attachments__browse-link">browse</span>
                  <span className="task-pending-attachments__meta"> • up to 10 MB each</span>
                </span>
              </label>

              <input
                id="task-form-file-input"
                type="file"
                className="task-pending-attachments__file-input"
                onChange={handleFileChange}
                disabled={submitting}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/*"
              />

              {pendingAttachments.length > 0 && (
                <ul className="task-pending-attachments__list">
                  {pendingAttachments.map((item) => (
                    <li key={item.id} className="task-pending-attachments__item">
                      <span className="task-pending-attachments__file-name truncate">
                        {item.name}
                      </span>
                      <button
                        type="button"
                        className="task-pending-attachments__remove"
                        onClick={() => handleRemoveAttachment(item.id)}
                        disabled={submitting}
                        title="Remove"
                        aria-label={`Remove ${item.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="add-task-footer">
            <label className="footer-checkbox-label">
              <input
                type="checkbox"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
              />
              Create another after this
            </label>

            <div className="footer-actions">
              <button
                type="button"
                className="add-task-cancel-btn"
                onClick={closeCreateTaskModal}
              >
                Cancel
              </button>
              <button
                className="add-task-submit"
                type="submit"
                disabled={submitting}
                title="Create Task (Ctrl + Enter)"
              >
                <span>{submitting ? 'Creating...' : 'Create task'}</span>
                <kbd>Ctrl ↵</kbd>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
