import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { parseNaturalLanguageTask } from '../../services/parser/taskParser';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Props {
  className?: string;
  autoFocus?: boolean;
  onAdded?: () => void;
}

export const QuickAddBar: React.FC<Props> = ({ className = '', autoFocus = false, onAdded }) => {
  const [text, setText] = useState('');
  const { quickAddTask, settings } = useAppStore();

  const parsed = text.trim()
    ? parseNaturalLanguageTask(
        text,
        new Date(),
        settings.workingHoursEnd,
        settings.defaultTaskDuration
      )
    : null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const query = text;
    setText('');
    await quickAddTask(query);
    if (onAdded) onAdded();
  };

  const previewItems: Array<{ text: string; accent?: string }> = [];
  if (parsed && text.trim()) {
    if (parsed.scheduledStart) {
      previewItems.push({
        text: format(parsed.scheduledStart, 'd MMM, HH:mm', { locale: ru }),
        accent: 'text-[#15803d] font-bold',
      });
    } else if (parsed.deadline) {
      previewItems.push({
        text: `до ${format(parsed.deadline, 'd MMM', { locale: ru })}`,
        accent: 'text-[#e11d48] font-bold',
      });
    }
    if (parsed.duration) {
      previewItems.push({ text: `${parsed.duration} мин` });
    }
    if (parsed.priority === 'urgent') {
      previewItems.push({ text: 'Срочно', accent: 'text-[#e11d48] font-bold' });
    }
  }

  return (
    <div className={`w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 ${className}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Например: позвонить клиенту завтра в 14:00..."
            className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
            autoFocus={autoFocus}
          />

          <button
            type="submit"
            disabled={!text.trim()}
            className="px-4 py-2 text-xs font-bold text-white bg-[#7bd500] hover:bg-[#6ec200] disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Добавить</span>
          </button>
        </div>

        {previewItems.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 pt-2 border-t border-slate-200/70 text-[11px] font-medium text-slate-500 tabular-nums whitespace-nowrap overflow-x-auto no-scrollbar">
            {previewItems.map((item, idx) => (
              <React.Fragment key={item.text}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span className={item.accent || ''}>{item.text}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};
