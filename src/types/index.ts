export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'unplanned' | 'scheduled' | 'in_progress' | 'completed' | 'overdue';

export type ReminderType = 'before_start' | 'before_deadline' | 'at_start';

export interface Reminder {
  id: string;
  minutesBefore: number; // e.g. 0, 5, 15, 30, 60, 1440
  type: ReminderType;
  triggered?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string; // ISO 8601
  scheduledStart?: string; // ISO 8601
  scheduledEnd?: string; // ISO 8601
  duration: number; // minutes (default 30 or 45)
  priority: Priority;
  categoryId: string;
  status: TaskStatus;
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  recurrence?: {
    freq: 'daily' | 'weekly' | 'monthly';
    interval: number;
    until?: string;
  };
  stage?: 'unplanned' | 'today' | 'this_week' | 'next_week' | 'this_month';
  isSplitPart?: boolean;
  parentTaskId?: string;
  partIndex?: number;
  totalParts?: number;
  price?: number; // Optional income/expense amount
  autoScheduled?: boolean;
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'any';
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

export interface UserSettings {
  id: string;
  workingHoursStart: string; // "09:00"
  workingHoursEnd: string; // "19:00"
  workDays: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  breakBetweenTasks: number; // minutes, default 10
  defaultTaskDuration: number; // minutes, default 45
  focusMorning: boolean; // schedule high/urgent tasks in 09:00 - 13:00
  scheduleMode: 'auto' | 'ask_confirmation' | 'inbox_only';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  maxDailyWorkHours: number; // e.g. 8
  theme: 'dark' | 'dim' | 'amoled';
  // Display customizations
  showDuration?: boolean;
  compactCards?: boolean;
  showStages?: boolean;
  financeEnabled?: boolean;
  currency?: string;
  hideMobileScrollbar?: boolean;
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string; // ISO string
  taskId?: string;
  createdAt: string;
}

export interface FreeTimeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface ParsedTaskQuery {
  title: string;
  deadline?: Date;
  scheduledStart?: Date;
  duration?: number;
  priority?: Priority;
  categoryId?: string;
  notes?: string;
  remindMe?: boolean;
  suggestedSlot?: {
    start: Date;
    end: Date;
  };
}

export type ViewTab = 'today' | 'inbox' | 'calendar' | 'finance' | 'completed' | 'settings';
export type CalendarViewType = 'day' | 'week' | 'month';
