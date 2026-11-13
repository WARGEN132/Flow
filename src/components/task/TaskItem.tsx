import React, { useState } from 'react';
import { Task } from '../../types';
import { useAppStore, removeEmojis } from '../../store/useAppStore';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { ModalSheet } from '../common/ModalSheet';
import {
  STAGE_LIST,
  STAGE_MAP,
  resolveTaskStage,
  formatTaskShortDate,
} from '../../utils/taskHelpers';

interface Props {
  task: Task;
}

export const TaskItem: React.FC<Props> = ({ task }) => {
  const { toggleTaskComplete, setEditingTask, setTaskStage, settings } = useAppStore();
  const [stageMenuOpen, setStageMenuOpen] = useState(false);

  const isCompleted = task.status === 'completed';
  const currentStage = resolveTaskStage(task);
  const stageInfo = STAGE_MAP[currentStage];
  const dateText = formatTaskShortDate(task);
  const isUrgent = !isCompleted && (task.priority === 'urgent' || task.priority === 'high');

  const showDuration = settings.showDuration !== false && task.duration > 0;
  const showStages = settings.showStages !== false;
  const isCompact = Boolean(settings.compactCards);

  const metaParts: string[] = [];
  if (dateText) metaParts.push(dateText);
  if (showDuration) metaParts.push(`${task.duration} мин`);
  if (isUrgent) metaParts.push('Срочно');

  return (
    <>
      <div
        onClick={() => setEditingTask(task)}
        className={`group rounded-2xl bg-white border transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
          isCompact ? 'py-2 px-3' : 'py-2.5 px-3.5'
        } ${
          isCompleted
            ? 'border-slate-100 opacity-60'
            : 'border-slate-200/80 hover:border-slate-300'
        }`}
      >
        {/* Left: 44px touch target checkmark + single-line title & clean metadata */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <motion.button
            type="button"
            whileTap={{ scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleTaskComplete(task.id);
            }}
            className="w-9 h-9 -ml-1.5 flex-shrink-0 flex items-center justify-center rounded-full cursor-pointer"
            title={isCompleted ? 'Вернуть задачу' : 'Завершить задачу'}
            aria-label={isCompleted ? 'Вернуть задачу' : 'Завершить задачу'}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                isCompleted
                  ? 'bg-[#7bd500] border-[#7bd500] text-white'
                  : 'border-slate-300 group-hover:border-[#7bd500] bg-white'
              }`}
            >
              {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
            </span>
          </motion.button>

          <div
            className={`min-w-0 flex-1 ${
              isCompact ? 'flex items-center gap-2' : 'flex flex-col justify-center'
            }`}
          >
            <div
              className={`text-sm font-semibold truncate leading-snug ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
              }`}
            >
              {removeEmojis(task.title)}
            </div>

            {metaParts.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 whitespace-nowrap truncate tabular-nums">
                {metaParts.map((part, idx) => (
                  <React.Fragment key={part}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span className={part === 'Срочно' ? 'text-[#e11d48] font-bold' : ''}>
                      {part}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Clean deal value + stage button */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {task.price && task.price > 0 && (
            <span className="text-xs font-extrabold text-[#15803d] tabular-nums whitespace-nowrap">
              +{task.price.toLocaleString('ru-RU')} {settings.currency || '₽'}
            </span>
          )}

          {showStages && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStageMenuOpen(true);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-opacity hover:opacity-90 active:scale-95 whitespace-nowrap ${stageInfo.badgeClass}`}
              title="Изменить стадию"
            >
              {stageInfo.label}
            </button>
          )}
        </div>
      </div>

      <ModalSheet
        isOpen={stageMenuOpen}
        onClose={() => setStageMenuOpen(false)}
        title="Стадия задачи"
        maxWidthClass="sm:max-w-sm"
      >
        <div className="space-y-1.5">
          {STAGE_LIST.map((s) => {
            const isSelected = currentStage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStageMenuOpen(false);
                  setTaskStage(task.id, s.id);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-50 border-slate-300'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor}`} />
                  <span className="text-sm font-semibold text-slate-800">{s.label}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#15803d]" />}
              </button>
            );
          })}
        </div>
      </ModalSheet>
    </>
  );
};
