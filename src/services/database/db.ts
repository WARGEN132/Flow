import Dexie, { type Table } from 'dexie';
import { Task, Category, UserSettings } from '../../types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'Работа', color: '#6366f1', icon: 'Briefcase', isDefault: true },
  { id: 'study', name: 'Учёба', color: '#06b6d4', icon: 'GraduationCap', isDefault: true },
  { id: 'personal', name: 'Личные дела', color: '#10b981', icon: 'User', isDefault: true },
  { id: 'projects', name: 'Проекты', color: '#f59e0b', icon: 'FolderKanban', isDefault: true },
  { id: 'sport', name: 'Спорт', color: '#ec4899', icon: 'Activity', isDefault: true },
  { id: 'other', name: 'Другое', color: '#8b5cf6', icon: 'Tag', isDefault: true },
];

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'user_settings',
  workingHoursStart: '09:00',
  workingHoursEnd: '19:00',
  workDays: [1, 2, 3, 4, 5], // Monday through Friday
  breakBetweenTasks: 10,
  defaultTaskDuration: 45,
  focusMorning: true,
  scheduleMode: 'auto',
  notificationsEnabled: true,
  soundEnabled: true,
  maxDailyWorkHours: 8,
  theme: 'dark',
  showDuration: true,
  compactCards: false,
  showStages: true,
  financeEnabled: true,
  currency: '₽',
  hideMobileScrollbar: true,
};

class ChronosDatabase extends Dexie {
  tasks!: Table<Task, string>;
  categories!: Table<Category, string>;
  settings!: Table<UserSettings, string>;
  transactions!: Table<import('../../types').Transaction, string>;

  constructor() {
    super('chronos_db');
    this.version(1).stores({
      tasks: 'id, categoryId, status, priority, scheduledStart, deadline, createdAt',
      categories: 'id, name',
      settings: 'id',
    });
    this.version(2).stores({
      tasks: 'id, categoryId, status, priority, scheduledStart, deadline, createdAt',
      categories: 'id, name',
      settings: 'id',
      transactions: 'id, type, date, createdAt',
    });
  }
}

export const db = new ChronosDatabase();

// Initialize defaults if first time
export async function initDatabase(): Promise<void> {
  const categoriesCount = await db.categories.count();
  if (categoriesCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  const existingSettings = await db.settings.get('user_settings');
  if (!existingSettings) {
    await db.settings.add(DEFAULT_SETTINGS);
  }
}
