import React, { useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ViewTab } from '../../types';
import {
  Kanban,
  Zap,
  CalendarDays,
  CheckCheck,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';
import { isToday } from 'date-fns';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, tasks, settings } = useAppStore();

  const { todayCount, unplannedCount } = useMemo(() => {
    let today = 0;
    let unplanned = 0;
    for (const t of tasks) {
      if (t.status === 'completed') continue;
      if (t.status === 'unplanned') unplanned++;
      if (t.scheduledStart && isToday(new Date(t.scheduledStart))) today++;
    }
    return { todayCount: today, unplannedCount: unplanned };
  }, [tasks]);

  const isFinanceActive = settings.financeEnabled !== false;

  const tabs: Array<{
    id: ViewTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = isFinanceActive
    ? [
        { id: 'today', label: 'Задачи', icon: Kanban, badge: todayCount || undefined },
        { id: 'calendar', label: 'Календарь', icon: CalendarDays },
        { id: 'finance', label: 'Финансы', icon: Wallet },
        { id: 'completed', label: 'Сделано', icon: CheckCheck },
        { id: 'settings', label: 'Настройки', icon: SlidersHorizontal },
      ]
    : [
        { id: 'today', label: 'Задачи', icon: Kanban, badge: todayCount || undefined },
        { id: 'inbox', label: 'Входящие', icon: Zap, badge: unplannedCount || undefined },
        { id: 'calendar', label: 'Календарь', icon: CalendarDays },
        { id: 'completed', label: 'Сделано', icon: CheckCheck },
        { id: 'settings', label: 'Настройки', icon: SlidersHorizontal },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 grid grid-cols-5 items-center safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCurrentTab(tab.id)}
            className={`relative flex flex-col items-center justify-center h-full transition-colors cursor-pointer select-none active:scale-95 ${
              isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-6 h-0.5 rounded-full bg-[#7bd500]" />
            )}

            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] rounded-full text-[9px] font-bold tabular-nums text-white bg-[#ff5b7f] flex items-center justify-center px-1">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>

            <span
              className={`text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap ${
                isActive ? 'font-bold text-slate-900' : 'font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
