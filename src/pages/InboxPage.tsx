import React, { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TaskItem } from '../components/task/TaskItem';
import { scheduleTaskSmartly } from '../services/scheduler/smartScheduler';
import { CalendarPlus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const InboxPage: React.FC = () => {
  const { tasks, settings, updateTask, addToast, setQuickAddOpen } = useAppStore();

  const unplannedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'unplanned'),
    [tasks]
  );

  const handleAutoScheduleAll = async () => {
    if (unplannedTasks.length === 0) return;

    let scheduledCount = 0;
    const currentTasksList = [...tasks];

    for (const task of unplannedTasks) {
      const result = scheduleTaskSmartly(task, currentTasksList, settings);
      if (result.success && result.scheduledStart && result.scheduledEnd) {
        await updateTask(task.id, {
          scheduledStart: result.scheduledStart.toISOString(),
          scheduledEnd: result.scheduledEnd.toISOString(),
          status: 'scheduled',
          autoScheduled: true,
          stage: 'today',
        });

        const idx = currentTasksList.findIndex((t) => t.id === task.id);
        if (idx !== -1) {
          currentTasksList[idx] = {
            ...task,
            scheduledStart: result.scheduledStart.toISOString(),
            scheduledEnd: result.scheduledEnd.toISOString(),
            status: 'scheduled',
            stage: 'today',
          };
        }
        scheduledCount++;
      }
    }

    addToast(`Распределено: ${scheduledCount}`, scheduledCount > 0 ? 'success' : 'warning');
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900">Входящие</h2>
          <span className="text-xs font-bold text-slate-400 tabular-nums">
            {unplannedTasks.length}
          </span>
        </div>

        {unplannedTasks.length > 0 && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleAutoScheduleAll}
            className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#7bd500] hover:bg-[#6ec200] transition-colors cursor-pointer whitespace-nowrap"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>Распределить все</span>
          </motion.button>
        )}
      </div>

      {unplannedTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          className="p-10 rounded-2xl bg-white border border-slate-200/80 text-center"
        >
          <p className="text-sm font-bold text-slate-900">Входящие пусты</p>
          <p className="text-xs text-slate-500 mt-1">
            Все задачи распределены по датам или ещё не созданы.
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
            {unplannedTasks.map((task) => (
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
