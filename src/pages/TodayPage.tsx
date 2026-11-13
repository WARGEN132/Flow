import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TaskItem } from '../components/task/TaskItem';
import { isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Flame } from 'lucide-react';
import { STAGE_LIST, TaskStage, resolveTaskStage } from '../utils/taskHelpers';

type StageFilter = 'all' | TaskStage;

export const TodayPage: React.FC = () => {
  const { tasks, settings, setQuickAddOpen } = useAppStore();
  const [filter, setFilter] = useState<StageFilter>('all');

  const currency = settings.currency || '₽';

  const metrics = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'completed');

    const todayCompleted = tasks.filter(
      (t) =>
        t.status === 'completed' &&
        ((t.completedAt && isToday(new Date(t.completedAt))) ||
          (t.scheduledStart && isToday(new Date(t.scheduledStart))))
    );

    const byStage: Record<TaskStage, typeof active> = {
      today: [],
      this_week: [],
      next_week: [],
      this_month: [],
      unplanned: [],
    };

    let urgentCount = 0;
    let activeDealsSum = 0;

    for (const task of active) {
      const stage = resolveTaskStage(task);
      if (stage !== 'completed') {
        byStage[stage].push(task);
      }
      if (task.priority === 'urgent' || task.priority === 'high') {
        urgentCount += 1;
      }
      if (task.price && task.price > 0) {
        activeDealsSum += task.price;
      }
    }

    const doneTodayCount = todayCompleted.length;
    const totalTodayCount = byStage.today.length + doneTodayCount;
    const progressPercent =
      totalTodayCount > 0 ? Math.round((doneTodayCount / totalTodayCount) * 100) : 0;

    return {
      active,
      byStage,
      doneTodayCount,
      totalTodayCount,
      progressPercent,
      urgentCount,
      activeDealsSum,
    };
  }, [tasks]);

  const displayedTasks = useMemo(() => {
    const list = filter === 'all' ? [...metrics.active] : [...metrics.byStage[filter]];
    return list.sort((a, b) => {
      const urgentA = a.priority === 'urgent' ? 0 : 1;
      const urgentB = b.priority === 'urgent' ? 0 : 1;
      if (urgentA !== urgentB) return urgentA - urgentB;
      const timeA = a.scheduledStart ? new Date(a.scheduledStart).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.scheduledStart ? new Date(b.scheduledStart).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    });
  }, [filter, metrics]);

  const filterOptions: Array<{
    id: StageFilter;
    label: string;
    count: number;
    dotColor?: string;
  }> = [
    { id: 'all', label: 'Все', count: metrics.active.length },
    ...STAGE_LIST.map((stage) => ({
      id: stage.id,
      label: stage.shortLabel,
      count: metrics.byStage[stage.id].length,
      dotColor: stage.dotColor,
    })),
  ];

  // Progress Ring geometry
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (metrics.progressPercent / 100) * ringCircumference;

  const remainingToday = metrics.byStage.today.length;
  const urgentShare =
    metrics.active.length > 0
      ? Math.round((metrics.urgentCount / metrics.active.length) * 100)
      : 0;

  return (
    <div className="space-y-4 w-full">
      {/* Daily Summary: 2 cohesive overview cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Daily Progress */}
        <button
          type="button"
          onClick={() => setFilter((prev) => (prev === 'today' ? 'all' : 'today'))}
          className={`p-3.5 sm:p-4 rounded-2xl bg-white border text-left transition-colors cursor-pointer flex items-center gap-3 ${
            filter === 'today'
              ? 'border-[#7bd500] bg-emerald-50/30'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 46 46" className="w-full h-full -rotate-90">
              <circle
                cx="23"
                cy="23"
                r={ringRadius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="4.5"
              />
              <circle
                cx="23"
                cy="23"
                r={ringRadius}
                fill="none"
                stroke="#7bd500"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-[11px] font-extrabold text-slate-900 tabular-nums">
              {metrics.progressPercent}%
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Прогресс дня
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
              {metrics.doneTodayCount} из {metrics.totalTodayCount}
            </div>
            <div className="text-[11px] font-medium text-slate-500 truncate mt-0.5 tabular-nums">
              {metrics.totalTodayCount === 0
                ? 'Нет задач на день'
                : remainingToday === 0
                ? 'Все выполнено'
                : `Осталось ${remainingToday}`}
            </div>
          </div>
        </button>

        {/* Card 2: Focus & Deals */}
        <button
          type="button"
          onClick={() => setFilter((prev) => (prev === 'this_week' ? 'all' : 'this_week'))}
          className={`p-3.5 sm:p-4 rounded-2xl bg-white border text-left transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
            filter === 'this_week'
              ? 'border-[#ff5b7f] bg-rose-50/30'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
              Фокус и сделки
            </span>
            {metrics.urgentCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#e11d48] tabular-nums whitespace-nowrap">
                <Flame className="w-3 h-3" />
                {metrics.urgentCount} срочн.
              </span>
            )}
          </div>

          <div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 tabular-nums leading-tight truncate">
              {metrics.activeDealsSum > 0
                ? `+${metrics.activeDealsSum.toLocaleString('ru-RU')} ${currency}`
                : `${metrics.active.length} в работе`}
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-[#ff5b7f] transition-all duration-300"
                style={{ width: `${Math.min(urgentShare, 100)}%` }}
              />
            </div>
          </div>
        </button>
      </div>

      {/* Single-line Stage Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar w-full">
        {filterOptions.map((opt) => {
          const isActive = filter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFilter(opt.id)}
              className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {opt.dotColor && !isActive && (
                <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
              )}
              <span>{opt.label}</span>
              <span
                className={`text-[11px] font-bold tabular-nums ${
                  isActive ? 'text-slate-300' : 'text-slate-400'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task Grid or Clean Empty State */}
      {displayedTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          className="p-10 rounded-2xl bg-white border border-slate-200/80 text-center"
        >
          <p className="text-sm font-bold text-slate-900">В этой стадии задач нет</p>
          <p className="text-xs text-slate-500 mt-1">
            Создайте новую задачу или переключите фильтр выше.
          </p>
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-[#7bd500] hover:bg-[#6ec200] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Добавить задачу</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <AnimatePresence mode="popLayout">
            {displayedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{
                  type: 'spring',
                  damping: 26,
                  stiffness: 280,
                }}
              >
                <TaskItem task={task} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
