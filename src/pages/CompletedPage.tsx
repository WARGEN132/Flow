import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { TaskItem } from '../components/task/TaskItem';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CompletedPage: React.FC = () => {
  const { tasks, deleteTask, addToast } = useAppStore();
  const [confirmClear, setConfirmClear] = useState(false);

  const completedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'completed')
      .sort((a, b) => {
        const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [tasks]);

  const handleClearCompleted = async () => {
    for (const t of completedTasks) {
      await deleteTask(t.id);
    }
    setConfirmClear(false);
    addToast('Список очищен', 'info');
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900">Сделано</h2>
          <span className="text-xs font-bold text-slate-400 tabular-nums">
            {completedTasks.length}
          </span>
        </div>

        {completedTasks.length > 0 &&
          (confirmClear ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleClearCompleted}
                className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer whitespace-nowrap"
              >
                Удалить все ({completedTasks.length})
              </button>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setConfirmClear(true)}
              className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </motion.button>
          ))}
      </div>

      {completedTasks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          className="p-10 rounded-2xl bg-white border border-slate-200/80 text-center"
        >
          <p className="text-sm font-bold text-slate-900">Список пуст</p>
          <p className="text-xs text-slate-500 mt-1">Здесь появятся выполненные задачи.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <AnimatePresence mode="popLayout">
            {completedTasks.map((task) => (
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
