import { create } from 'zustand';
import { Task, UserSettings, ViewTab, CalendarViewType, ParsedTaskQuery, Transaction } from '../types';
import { db, initDatabase, DEFAULT_SETTINGS } from '../services/database/db';
import { parseNaturalLanguageTask } from '../services/parser/taskParser';
import { scheduleTaskSmartly } from '../services/scheduler/smartScheduler';
import { soundManager, NotificationService } from '../services/notifications/notificationService';
import { addMinutes } from 'date-fns';
import { TaskStage } from '../utils/taskHelpers';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
}

const EMOJI_REGEX =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2934}-\u{2935}\u{25A0}-\u{25FF}\u{3297}\u{3299}]/gu;

export const removeEmojis = (text?: string): string => {
  if (!text) return '';
  return text.replace(EMOJI_REGEX, '').replace(/\s+/g, ' ').trim();
};

interface AppState {
  tasks: Task[];
  transactions: Transaction[];
  settings: UserSettings;
  isLoaded: boolean;

  currentTab: ViewTab;
  calendarView: CalendarViewType;
  calendarDate: Date;

  isQuickAddOpen: boolean;
  quickAddInitialText: string;
  editingTask: Task | null;
  toasts: ToastMessage[];

  setCurrentTab: (tab: ViewTab) => void;
  setCalendarView: (view: CalendarViewType) => void;
  setCalendarDate: (date: Date) => void;
  setQuickAddOpen: (open: boolean, initialText?: string) => void;
  setEditingTask: (task: Task | null) => void;
  addToast: (message: string, type?: 'info' | 'warning' | 'success') => void;
  removeToast: (id: string) => void;

  init: () => Promise<void>;
  addTask: (data: Partial<Task>, autoSchedule?: boolean) => Promise<Task>;
  quickAddTask: (input: string) => Promise<{ task: Task; parsed: ParsedTaskQuery; scheduleMessage?: string }>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  updateSettingsAction: (newSettings: Partial<UserSettings>) => Promise<void>;
  setTaskStage: (id: string, stage: TaskStage) => Promise<void>;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  loadSampleTasks: () => Promise<void>;
  clearAllTasks: () => Promise<void>;
}

let reminderIntervalStarted = false;

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  transactions: [],
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  currentTab: 'today',
  calendarView: 'day',
  calendarDate: new Date(),

  isQuickAddOpen: false,
  quickAddInitialText: '',
  editingTask: null,
  toasts: [],

  setCurrentTab: (tab) => set({ currentTab: tab }),
  setCalendarView: (view) => set({ calendarView: view }),
  setCalendarDate: (date) => set({ calendarDate: date }),
  setQuickAddOpen: (open, initialText = '') =>
    set({ isQuickAddOpen: open, quickAddInitialText: initialText }),
  setEditingTask: (task) => set({ editingTask: task }),

  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  init: async () => {
    try {
      await initDatabase();
      const [allTasks, savedSettings, allTransactions] = await Promise.all([
        db.tasks.toArray(),
        db.settings.get('user_settings'),
        db.transactions ? db.transactions.toArray() : Promise.resolve([]),
      ]);

      let tasksUpdated = false;
      const cleanTasks = allTasks.map((t) => {
        const cleanTitle = removeEmojis(t.title);
        const cleanDesc = t.description ? removeEmojis(t.description) : undefined;
        if (cleanTitle !== t.title || cleanDesc !== t.description) {
          tasksUpdated = true;
          return { ...t, title: cleanTitle, description: cleanDesc };
        }
        return t;
      });

      if (tasksUpdated) {
        await db.tasks.bulkPut(cleanTasks);
      }

      let txUpdated = false;
      const cleanTx = (allTransactions || []).map((tx) => {
        const cleanTitle = removeEmojis(tx.title);
        if (cleanTitle !== tx.title) {
          txUpdated = true;
          return { ...tx, title: cleanTitle };
        }
        return tx;
      });

      if (txUpdated && db.transactions) {
        await db.transactions.bulkPut(cleanTx);
      }

      set({
        tasks: cleanTasks,
        transactions: cleanTx,
        settings: savedSettings || DEFAULT_SETTINGS,
        isLoaded: true,
      });

      if (typeof window !== 'undefined' && !reminderIntervalStarted) {
        reminderIntervalStarted = true;
        setInterval(() => {
          const { tasks, settings, addToast } = get();
          NotificationService.checkUpcomingReminders(tasks, settings.soundEnabled, (msg, type) => {
            addToast(msg, type);
          });
        }, 30000);
      }
    } catch (e) {
      console.error('Failed to init database:', e);
      set({ isLoaded: true });
    }
  },

  addTask: async (data, autoSchedule = true) => {
    const { settings, tasks } = get();
    const nowIso = new Date().toISOString();
    const id = crypto.randomUUID();

    let status = data.status || 'unplanned';
    let scheduledStart = data.scheduledStart;
    let scheduledEnd = data.scheduledEnd;
    let autoScheduled = false;

    const cleanTitle = removeEmojis(data.title) || 'Новая задача';
    const cleanDesc = data.description ? removeEmojis(data.description) : undefined;

    if (autoSchedule && !scheduledStart && settings.scheduleMode === 'auto') {
      const tempTask: Task = {
        id,
        title: cleanTitle,
        duration: data.duration || settings.defaultTaskDuration,
        priority: data.priority || 'medium',
        categoryId: data.categoryId || 'work',
        status: 'unplanned',
        deadline: data.deadline,
        reminders: data.reminders || [],
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const result = scheduleTaskSmartly(tempTask, tasks, settings);
      if (result.success && result.scheduledStart && result.scheduledEnd) {
        scheduledStart = result.scheduledStart.toISOString();
        scheduledEnd = result.scheduledEnd.toISOString();
        status = 'scheduled';
        autoScheduled = true;
      }
    } else if (scheduledStart && !scheduledEnd) {
      const dur = data.duration || settings.defaultTaskDuration;
      scheduledEnd = addMinutes(new Date(scheduledStart), dur).toISOString();
      status = 'scheduled';
    }

    const newTask: Task = {
      id,
      title: cleanTitle,
      description: cleanDesc,
      deadline: data.deadline,
      scheduledStart,
      scheduledEnd,
      duration: data.duration || settings.defaultTaskDuration,
      priority: data.priority || 'medium',
      categoryId: data.categoryId || 'work',
      status,
      stage: data.stage,
      price: data.price,
      reminders: data.reminders || [
        { id: crypto.randomUUID(), minutesBefore: 15, type: 'before_start' },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      autoScheduled,
      preferredTimeOfDay: data.preferredTimeOfDay || 'any',
      recurrence: data.recurrence,
    };

    await db.tasks.add(newTask);
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
    return newTask;
  },

  quickAddTask: async (input: string) => {
    const { settings, tasks, addToast } = get();
    const parsed = parseNaturalLanguageTask(
      input,
      new Date(),
      settings.workingHoursEnd,
      settings.defaultTaskDuration
    );

    let scheduledStart = parsed.scheduledStart ? parsed.scheduledStart.toISOString() : undefined;
    let scheduledEnd: string | undefined;
    let status: Task['status'] = 'unplanned';
    let scheduleMessage: string | undefined;
    let autoScheduled = false;

    const duration = parsed.duration || settings.defaultTaskDuration;

    if (scheduledStart) {
      scheduledEnd = addMinutes(new Date(scheduledStart), duration).toISOString();
      status = 'scheduled';
      scheduleMessage = `Запланировано на ${new Date(scheduledStart).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (settings.scheduleMode === 'auto') {
      const tempTask: Task = {
        id: 'temp',
        title: parsed.title,
        deadline: parsed.deadline ? parsed.deadline.toISOString() : undefined,
        duration,
        priority: parsed.priority || 'medium',
        categoryId: parsed.categoryId || 'work',
        status: 'unplanned',
        reminders: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = scheduleTaskSmartly(tempTask, tasks, settings);
      if (res.success && res.scheduledStart && res.scheduledEnd) {
        scheduledStart = res.scheduledStart.toISOString();
        scheduledEnd = res.scheduledEnd.toISOString();
        status = 'scheduled';
        autoScheduled = true;
        scheduleMessage = res.message;
      } else {
        scheduleMessage = res.message || 'Добавлено без срока';
      }
    }

    const cleanTitle = removeEmojis(parsed.title);

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      deadline: parsed.deadline ? parsed.deadline.toISOString() : undefined,
      scheduledStart,
      scheduledEnd,
      duration,
      priority: parsed.priority || 'medium',
      categoryId: parsed.categoryId || 'work',
      status,
      reminders: [{ id: crypto.randomUUID(), minutesBefore: 15, type: 'before_start' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoScheduled,
    };

    await db.tasks.add(newTask);
    set((state) => ({ tasks: [newTask, ...state.tasks] }));

    if (settings.soundEnabled) {
      soundManager.playNotificationSound();
    }

    addToast(
      scheduleMessage
        ? `«${newTask.title}» - ${scheduleMessage}`
        : `Задача «${newTask.title}» добавлена`,
      'success'
    );

    return { task: newTask, parsed, scheduleMessage };
  },

  updateTask: async (id, updates) => {
    const { tasks } = get();
    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;

    let scheduledEnd = updates.scheduledEnd ?? existing.scheduledEnd;
    if (updates.scheduledStart && (updates.duration || existing.duration)) {
      const dur = updates.duration ?? existing.duration;
      scheduledEnd = addMinutes(new Date(updates.scheduledStart), dur).toISOString();
    }

    const updatedTask: Task = {
      ...existing,
      ...updates,
      title: updates.title !== undefined ? removeEmojis(updates.title) : existing.title,
      description:
        updates.description !== undefined
          ? updates.description
            ? removeEmojis(updates.description)
            : undefined
          : existing.description,
      scheduledEnd,
      updatedAt: new Date().toISOString(),
    };

    await db.tasks.put(updatedTask);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
      editingTask: state.editingTask?.id === id ? updatedTask : state.editingTask,
    }));
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id);
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      editingTask: state.editingTask?.id === id ? null : state.editingTask,
    }));
    get().addToast('Задача удалена', 'info');
  },

  toggleTaskComplete: async (id) => {
    const { tasks, settings, addToast } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const isCompleting = task.status !== 'completed';
    const updated: Task = {
      ...task,
      status: isCompleting ? 'completed' : task.scheduledStart ? 'scheduled' : 'unplanned',
      completedAt: isCompleting ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    await db.tasks.put(updated);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
    }));

    if (isCompleting && settings.soundEnabled) {
      soundManager.playCompletionSound();
    }

    if (isCompleting && task.price && task.price > 0) {
      const formattedTitle = task.title.charAt(0).toLowerCase() + task.title.slice(1);
      await get().addTransaction({
        title: `Сделка: ${formattedTitle}`,
        amount: task.price,
        type: 'income',
        category: 'Сделки',
        date: new Date().toISOString(),
        taskId: task.id,
      });
    }

    addToast(
      isCompleting
        ? task.price
          ? `«${task.title}» выполнена (+${task.price.toLocaleString('ru-RU')} ${settings.currency || '₽'})`
          : `«${task.title}» выполнена`
        : `«${task.title}» возвращена в работу`,
      isCompleting ? 'success' : 'info'
    );
  },

  updateSettingsAction: async (newSettings) => {
    const { settings, addToast } = get();
    const updated = { ...settings, ...newSettings };
    await db.settings.put(updated);
    set({ settings: updated });
    addToast('Настройки сохранены', 'success');
  },

  setTaskStage: async (id, stage) => {
    const { tasks, updateTask, addToast } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const now = new Date();
    let updates: Partial<Task> = { stage };

    if (stage === 'today') {
      const todayDate = new Date();
      todayDate.setHours(12, 0, 0, 0);
      updates = { ...updates, status: 'scheduled', scheduledStart: todayDate.toISOString() };
      addToast(`«${task.title}» перенесена на сегодня`, 'success');
    } else if (stage === 'this_week') {
      updates = { ...updates, status: 'scheduled', priority: 'urgent' };
      addToast(`«${task.title}» на этой неделе`, 'success');
    } else if (stage === 'next_week') {
      updates = {
        ...updates,
        status: 'scheduled',
        scheduledStart: addMinutes(now, 60 * 24 * 7).toISOString(),
      };
      addToast(`«${task.title}» на следующей неделе`, 'info');
    } else if (stage === 'this_month') {
      updates = {
        ...updates,
        status: 'scheduled',
        scheduledStart: addMinutes(now, 60 * 24 * 20).toISOString(),
      };
      addToast(`«${task.title}» запланирована на месяц`, 'info');
    } else {
      updates = {
        ...updates,
        status: 'unplanned',
        scheduledStart: undefined,
        scheduledEnd: undefined,
      };
      addToast(`«${task.title}» перенесена в без срока`, 'info');
    }

    await updateTask(id, updates);
  },

  addTransaction: async (data) => {
    const newTx: Transaction = {
      ...data,
      title: removeEmojis(data.title),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.transactions.add(newTx);
    set((state) => ({ transactions: [newTx, ...state.transactions] }));
    return newTx;
  },

  deleteTransaction: async (id) => {
    await db.transactions.delete(id);
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }));
    get().addToast('Запись удалена', 'info');
  },

  loadSampleTasks: async () => {
    const now = new Date();
    const sampleList: Partial<Task>[] = [
      {
        title: 'Подготовить документы для квартального отчета',
        duration: 60,
        priority: 'high',
        categoryId: 'work',
        scheduledStart: addMinutes(now, 60 * 24 * 7).toISOString(),
        status: 'scheduled',
        stage: 'next_week',
        price: 45000,
      },
      {
        title: 'Отчетная сессия с командой',
        duration: 45,
        priority: 'medium',
        categoryId: 'work',
        scheduledStart: now.toISOString(),
        status: 'scheduled',
        stage: 'today',
      },
      {
        title: 'Подготовка к корпоративу и согласование сметы',
        duration: 30,
        priority: 'urgent',
        categoryId: 'work',
        scheduledStart: addMinutes(now, 60 * 24 * 3).toISOString(),
        status: 'scheduled',
        stage: 'this_week',
      },
      {
        title: 'Проверить входящие договоры и закрывающие акты',
        duration: 30,
        priority: 'medium',
        categoryId: 'work',
        status: 'unplanned',
        stage: 'unplanned',
        price: 25000,
      },
    ];

    for (const s of sampleList) {
      await get().addTask(s, false);
    }
    get().addToast('Примеры задач загружены', 'success');
  },

  clearAllTasks: async () => {
    await db.tasks.clear();
    set({ tasks: [] });
    get().addToast('Все задачи удалены', 'info');
  },
}));
