import { format, isPast, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Task } from '../types';

export type TaskStage = 'today' | 'this_week' | 'next_week' | 'this_month' | 'unplanned';
export type ResolvedStage = TaskStage | 'completed';

export interface StageMeta {
  id: TaskStage;
  label: string;
  shortLabel: string;
  dotColor: string;
  badgeClass: string;
  textColor: string;
}

export const STAGE_LIST: StageMeta[] = [
  {
    id: 'today',
    label: 'Сегодня',
    shortLabel: 'Сегодня',
    dotColor: 'bg-[#7bd500]',
    badgeClass: 'bg-[#7bd500] text-white',
    textColor: 'text-[#15803d]',
  },
  {
    id: 'this_week',
    label: 'Эта неделя',
    shortLabel: 'Эта нед.',
    dotColor: 'bg-[#ff5b7f]',
    badgeClass: 'bg-[#ff5b7f] text-white',
    textColor: 'text-[#e11d48]',
  },
  {
    id: 'next_week',
    label: 'След. неделя',
    shortLabel: 'След. нед.',
    dotColor: 'bg-[#67d5f3]',
    badgeClass: 'bg-[#67d5f3] text-slate-900',
    textColor: 'text-sky-700',
  },
  {
    id: 'this_month',
    label: 'На месяц',
    shortLabel: 'Месяц',
    dotColor: 'bg-[#10b981]',
    badgeClass: 'bg-[#7bd500] text-white',
    textColor: 'text-emerald-700',
  },
  {
    id: 'unplanned',
    label: 'Без срока',
    shortLabel: 'Без срока',
    dotColor: 'bg-slate-300',
    badgeClass: 'bg-slate-100 text-slate-700',
    textColor: 'text-slate-500',
  },
];

export const STAGE_MAP: Record<ResolvedStage, { label: string; dotColor: string; badgeClass: string }> = {
  today: {
    label: 'Сегодня',
    dotColor: 'bg-[#7bd500]',
    badgeClass: 'bg-[#7bd500] text-white',
  },
  this_week: {
    label: 'Эта неделя',
    dotColor: 'bg-[#ff5b7f]',
    badgeClass: 'bg-[#ff5b7f] text-white',
  },
  next_week: {
    label: 'След. неделя',
    dotColor: 'bg-[#67d5f3]',
    badgeClass: 'bg-[#67d5f3] text-slate-900',
  },
  this_month: {
    label: 'На месяц',
    dotColor: 'bg-[#10b981]',
    badgeClass: 'bg-[#7bd500] text-white',
  },
  unplanned: {
    label: 'Без срока',
    dotColor: 'bg-slate-300',
    badgeClass: 'bg-slate-100 text-slate-700',
  },
  completed: {
    label: 'Сделано',
    dotColor: 'bg-[#7bd500]',
    badgeClass: 'bg-[#7bd500] text-white',
  },
};

export function resolveTaskStage(task: Task): ResolvedStage {
  if (task.status === 'completed') return 'completed';
  if (task.stage) return task.stage;

  const isOverdue = Boolean(task.deadline && isPast(new Date(task.deadline)));
  if (isOverdue || task.priority === 'urgent') return 'this_week';

  if (task.scheduledStart) {
    return isToday(new Date(task.scheduledStart)) ? 'today' : 'next_week';
  }

  return 'unplanned';
}

export function formatTaskShortDate(task: Task): string {
  const raw = task.scheduledStart || task.deadline;
  if (!raw) return '';
  const d = new Date(raw);
  if (isToday(d)) return 'Сегодня';
  return format(d, 'd MMM', { locale: ru });
}

export function formatDateTimeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return `Сегодня, ${format(d, 'HH:mm')}`;
  if (isYesterday(d)) return `Вчера, ${format(d, 'HH:mm')}`;
  return format(d, 'd MMM, HH:mm', { locale: ru });
}
