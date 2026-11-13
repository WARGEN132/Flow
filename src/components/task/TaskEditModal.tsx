import React, { useState, useEffect } from 'react';
import { useAppStore, removeEmojis } from '../../store/useAppStore';
import { Priority } from '../../types';
import { Trash2, Check, Flame, Wallet } from 'lucide-react';
import { addMinutes } from 'date-fns';
import { ModalSheet } from '../common/ModalSheet';
import { TaskStage } from '../../utils/taskHelpers';

const EDIT_STAGES: Array<{ id: TaskStage; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: 'this_week', label: 'Эта нед.' },
  { id: 'next_week', label: 'След. нед.' },
  { id: 'this_month', label: 'На месяц' },
];

export const TaskEditModal: React.FC = () => {
  const { editingTask, setEditingTask, updateTask, deleteTask, addToast, settings } =
    useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(45);
  const [isUrgent, setIsUrgent] = useState(false);
  const [stage, setStage] = useState<TaskStage>('today');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(removeEmojis(editingTask.title));
      setDescription(removeEmojis(editingTask.description || ''));
      setDuration(editingTask.duration || 45);
      setIsUrgent(editingTask.priority === 'urgent' || editingTask.priority === 'high');
      setStage(editingTask.stage || 'today');
      setPrice(editingTask.price ? String(editingTask.price) : '');
    }
  }, [editingTask]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !editingTask) return;

    const priority: Priority = isUrgent ? 'urgent' : 'medium';
    const now = new Date();
    let scheduledStart = editingTask.scheduledStart;

    if (stage === 'today') {
      const todayDate = new Date();
      todayDate.setHours(12, 0, 0, 0);
      scheduledStart = todayDate.toISOString();
    } else if (stage === 'this_week') {
      scheduledStart = editingTask.scheduledStart || addMinutes(now, 60 * 24 * 2).toISOString();
    } else if (stage === 'next_week') {
      scheduledStart = addMinutes(now, 60 * 24 * 7).toISOString();
    } else if (stage === 'this_month') {
      scheduledStart = addMinutes(now, 60 * 24 * 20).toISOString();
    }

    const priceNum = price.trim()
      ? parseFloat(price.replace(/\s+/g, '').replace(',', '.'))
      : undefined;

    await updateTask(editingTask.id, {
      title: removeEmojis(title.trim()),
      description: description.trim() ? removeEmojis(description.trim()) : undefined,
      duration: Number(duration),
      priority,
      stage,
      price: !isNaN(Number(priceNum)) && Number(priceNum) > 0 ? Number(priceNum) : undefined,
      scheduledStart: stage === 'unplanned' ? undefined : scheduledStart,
      scheduledEnd:
        stage === 'unplanned'
          ? undefined
          : scheduledStart
          ? addMinutes(new Date(scheduledStart), Number(duration)).toISOString()
          : undefined,
      status:
        stage === 'unplanned'
          ? 'unplanned'
          : editingTask.status === 'completed'
          ? 'completed'
          : 'scheduled',
    });

    addToast('Сохранено', 'success');
    setEditingTask(null);
  };

  return (
    <ModalSheet
      isOpen={Boolean(editingTask)}
      onClose={() => setEditingTask(null)}
      title="Редактирование задачи"
    >
      {editingTask && (
        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название задачи"
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm sm:text-base focus:outline-none focus:border-[#7bd500] font-semibold"
            required
            autoFocus
          />

          <button
            type="button"
            onClick={() => setIsUrgent(!isUrgent)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
              isUrgent
                ? 'bg-[#ff5b7f] hover:bg-[#f4476e] text-white border-[#ff5b7f]'
                : 'bg-rose-50/70 hover:bg-rose-100 text-[#e11d48] border-rose-200/80'
            }`}
          >
            <Flame className={`w-4 h-4 ${isUrgent ? 'text-white' : 'text-[#ff5b7f]'}`} />
            <span>{isUrgent ? 'Срочная задача' : 'Сделать срочной'}</span>
          </button>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Стадия плана</label>
            <div className="grid grid-cols-4 gap-1.5">
              {EDIT_STAGES.map((s) => {
                const active = stage === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStage(s.id)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
              <span>Время на задачу</span>
              <span className="text-[#15803d] tabular-nums">{duration} мин</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[15, 30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer tabular-nums ${
                    duration === m
                      ? 'bg-[#7bd500] border-[#7bd500] text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m}м
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
              <span className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[#7bd500]" />
                <span>Доход по задаче ({settings.currency || '₽'})</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">необязательно</span>
            </label>
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Например: 15000"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold tabular-nums focus:outline-none focus:border-[#7bd500]"
            />
          </div>

          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Заметки или детали..."
            className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-[#7bd500] resize-none"
          />

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                deleteTask(editingTask.id);
                setEditingTask(null);
              }}
              className="p-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
              title="Удалить задачу"
              aria-label="Удалить задачу"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#7bd500] hover:bg-[#6ec200] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </ModalSheet>
  );
};
