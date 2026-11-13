import React from 'react';
import { useAppStore, removeEmojis } from '../store/useAppStore';
import { CalendarViewType, Task } from '../types';
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  setHours,
  setMinutes,
} from 'date-fns';
import { ru } from 'date-fns/locale';

export const CalendarPage: React.FC = () => {
  const {
    tasks,
    settings,
    calendarView,
    setCalendarView,
    calendarDate,
    setCalendarDate,
    setEditingTask,
    addTask,
    toggleTaskComplete,
  } = useAppStore();

  const handlePrev = () => {
    if (calendarView === 'day') setCalendarDate(subDays(calendarDate, 1));
    else if (calendarView === 'week') setCalendarDate(subWeeks(calendarDate, 1));
    else setCalendarDate(subMonths(calendarDate, 1));
  };

  const handleNext = () => {
    if (calendarView === 'day') setCalendarDate(addDays(calendarDate, 1));
    else if (calendarView === 'week') setCalendarDate(addWeeks(calendarDate, 1));
    else setCalendarDate(addMonths(calendarDate, 1));
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const [startHourNum] = settings.workingHoursStart.split(':').map(Number);
  const [endHourNum] = settings.workingHoursEnd.split(':').map(Number);
  const gridStartHour = Math.max(7, startHourNum - 1);
  const gridEndHour = Math.min(23, endHourNum + 2);
  const hoursArray = Array.from(
    { length: gridEndHour - gridStartHour + 1 },
    (_, i) => gridStartHour + i
  );

  const handleSlotClick = async (targetDay: Date, hour: number) => {
    const slotStart = setMinutes(setHours(new Date(targetDay), hour), 0);
    const slotEnd = setMinutes(setHours(new Date(targetDay), hour), settings.defaultTaskDuration);
    const newTask = await addTask(
      {
        title: 'Новая задача',
        duration: settings.defaultTaskDuration,
        scheduledStart: slotStart.toISOString(),
        scheduledEnd: slotEnd.toISOString(),
        status: 'scheduled',
        priority: 'medium',
      },
      false
    );
    setEditingTask(newTask);
  };

  let viewTitle = '';
  if (calendarView === 'day') {
    const dStr = format(calendarDate, 'EEEE, d MMMM', { locale: ru });
    viewTitle = dStr.charAt(0).toUpperCase() + dStr.slice(1);
  } else if (calendarView === 'week') {
    const weekStart = startOfWeek(calendarDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(calendarDate, { weekStartsOn: 1 });
    viewTitle = `${format(weekStart, 'd MMM', { locale: ru })} - ${format(weekEnd, 'd MMM', {
      locale: ru,
    })}`;
  } else {
    const mStr = format(calendarDate, 'LLLL yyyy', { locale: ru });
    viewTitle = mStr.charAt(0).toUpperCase() + mStr.slice(1);
  }

  return (
    <div className="space-y-3.5 w-full max-w-5xl mx-auto">
      {/* Top calendar navigation bar */}
      <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-2 border border-slate-200/80">
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Назад"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="min-h-[36px] px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Вперед"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate text-center tabular-nums">
          {viewTitle}
        </span>

        {/* View Switcher: Day, Week, Month */}
        <div className="flex items-center rounded-xl bg-slate-100 p-0.5 flex-shrink-0">
          {(['day', 'week', 'month'] as CalendarViewType[]).map((mode) => {
            const labels: Record<CalendarViewType, string> = {
              day: 'День',
              week: 'Нед',
              month: 'Мес',
            };
            const active = calendarView === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setCalendarView(mode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {calendarView === 'day' && (
        <DayScheduleView
          currentDate={calendarDate}
          hoursArray={hoursArray}
          tasks={tasks}
          onSlotClick={handleSlotClick}
          onTaskClick={(t) => setEditingTask(t)}
          onTaskComplete={(id) => toggleTaskComplete(id)}
        />
      )}

      {calendarView === 'week' && (
        <WeekScheduleView
          currentDate={calendarDate}
          hoursArray={hoursArray}
          tasks={tasks}
          onSlotClick={handleSlotClick}
          onTaskClick={(t) => setEditingTask(t)}
        />
      )}

      {calendarView === 'month' && (
        <MonthScheduleView
          currentDate={calendarDate}
          tasks={tasks}
          onDayClick={(d) => {
            setCalendarDate(d);
            setCalendarView('day');
          }}
          onTaskClick={(t) => setEditingTask(t)}
        />
      )}
    </div>
  );
};

const DayScheduleView: React.FC<{
  currentDate: Date;
  hoursArray: number[];
  tasks: Task[];
  onSlotClick: (d: Date, h: number) => void;
  onTaskClick: (t: Task) => void;
  onTaskComplete: (id: string) => void;
}> = ({ currentDate, hoursArray, tasks, onSlotClick, onTaskClick, onTaskComplete }) => {
  const dayTasks = tasks.filter((t) => {
    if (!t.scheduledStart) return false;
    return isSameDay(new Date(t.scheduledStart), currentDate);
  });

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
      {hoursArray.map((hour) => {
        const hourTasks = dayTasks.filter((t) => {
          const start = new Date(t.scheduledStart!);
          return start.getHours() === hour;
        });

        const isCurrentHour = isToday(currentDate) && new Date().getHours() === hour;

        return (
          <div
            key={hour}
            className={`flex items-stretch min-h-[54px] transition-colors ${
              isCurrentHour ? 'bg-emerald-50/40' : 'hover:bg-slate-50/50'
            }`}
          >
            <div className="w-14 py-3 px-2 text-right select-none border-r border-slate-100 flex-shrink-0">
              <span
                className={`text-xs tabular-nums font-semibold ${
                  isCurrentHour ? 'text-[#15803d] font-bold' : 'text-slate-400'
                }`}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>

            <div className="flex-1 p-1.5 flex flex-col gap-1.5 min-w-0">
              {hourTasks.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onSlotClick(currentDate, hour)}
                  className="group w-full h-full min-h-[40px] rounded-xl hover:bg-slate-50 flex items-center justify-start px-2.5 text-slate-300 hover:text-slate-500 text-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ) : (
                hourTasks.map((t) => {
                  const isCompleted = t.status === 'completed';
                  return (
                    <div
                      key={t.id}
                      onClick={() => onTaskClick(t)}
                      className={`px-3 py-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isCompleted
                          ? 'bg-slate-50 border-slate-200/70 opacity-60'
                          : 'bg-white border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskComplete(t.id);
                          }}
                          className="w-8 h-8 -ml-1.5 flex-shrink-0 flex items-center justify-center rounded-full cursor-pointer"
                          aria-label={isCompleted ? 'Вернуть задачу' : 'Завершить задачу'}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isCompleted
                                ? 'bg-[#7bd500] border-[#7bd500] text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </button>

                        <div className="min-w-0">
                          <div
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {removeEmojis(t.title)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium tabular-nums">
                            {format(new Date(t.scheduledStart!), 'HH:mm')} · {t.duration} мин
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const WeekScheduleView: React.FC<{
  currentDate: Date;
  hoursArray: number[];
  tasks: Task[];
  onSlotClick: (d: Date, h: number) => void;
  onTaskClick: (t: Task) => void;
}> = ({ currentDate, hoursArray, tasks, onSlotClick, onTaskClick }) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 overflow-x-auto">
      <div className="min-w-[650px]">
        <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 text-xs">
          <div className="py-2.5 text-center text-slate-400 font-semibold border-r border-slate-100">
            Время
          </div>
          {days.map((day) => {
            const isCurr = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`py-2 text-center border-r border-slate-100 last:border-r-0 ${
                  isCurr ? 'bg-emerald-50/50' : ''
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  {format(day, 'EEE', { locale: ru })}
                </div>
                <div
                  className={`text-xs font-bold mt-0.5 tabular-nums ${
                    isCurr
                      ? 'w-5 h-5 mx-auto rounded-full bg-[#7bd500] text-white flex items-center justify-center'
                      : 'text-slate-800'
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="divide-y divide-slate-100">
          {hoursArray.map((hour) => (
            <div key={hour} className="grid grid-cols-8 min-h-[48px]">
              <div className="py-1.5 px-1.5 text-right text-[11px] font-medium tabular-nums text-slate-400 border-r border-slate-100">
                {String(hour).padStart(2, '0')}:00
              </div>

              {days.map((day) => {
                const dayTasks = tasks.filter((t) => {
                  if (!t.scheduledStart) return false;
                  const start = new Date(t.scheduledStart);
                  return isSameDay(start, day) && start.getHours() === hour;
                });

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => onSlotClick(day, hour)}
                    className="p-1 border-r border-slate-100 last:border-r-0 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskClick(t);
                        }}
                        className="p-1 rounded-md bg-[#67d5f3]/25 border border-[#67d5f3]/50 text-slate-900 text-[10px] font-semibold truncate mb-1"
                      >
                        {removeEmojis(t.title)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MonthScheduleView: React.FC<{
  currentDate: Date;
  tasks: Task[];
  onDayClick: (d: Date) => void;
  onTaskClick: (t: Task) => void;
}> = ({ currentDate, tasks, onDayClick, onTaskClick }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((name) => (
          <div key={name} className="py-2 text-center text-xs font-bold text-slate-400">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
        {days.map((day) => {
          const isCurrMonth = day.getMonth() === currentDate.getMonth();
          const isCurrDay = isToday(day);
          const dayTasks = tasks.filter((t) => {
            if (!t.scheduledStart) return false;
            return isSameDay(new Date(t.scheduledStart), day);
          });

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-[82px] p-1.5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col ${
                !isCurrMonth ? 'bg-slate-50/50 opacity-40' : ''
              } ${isCurrDay ? 'bg-emerald-50/40' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold tabular-nums ${
                    isCurrDay
                      ? 'w-5 h-5 rounded-full bg-[#7bd500] text-white flex items-center justify-center'
                      : 'text-slate-800'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayTasks.length > 0 && (
                  <span className="text-[10px] font-bold text-[#15803d] tabular-nums">
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div className="space-y-1 flex-1 overflow-hidden">
                {dayTasks.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(t);
                    }}
                    className="px-1 py-0.5 rounded text-[10px] truncate font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    {removeEmojis(t.title)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
