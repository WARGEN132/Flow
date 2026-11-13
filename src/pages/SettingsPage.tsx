import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { NotificationService, soundManager } from '../services/notifications/notificationService';
import {
  Clock,
  Bell,
  Volume2,
  Trash2,
  ListPlus,
  Calendar,
  Layout,
  Wallet,
} from 'lucide-react';

interface ToggleRowProps {
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ title, subtitle, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-3 py-3.5 px-4 sm:px-5">
    <div className="min-w-0">
      <div className="text-xs sm:text-sm font-bold text-slate-800">{title}</div>
      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{subtitle}</div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="min-h-[44px] min-w-[44px] flex items-center justify-end cursor-pointer flex-shrink-0"
    >
      <span
        className={`w-11 h-6 rounded-full transition-colors relative block ${
          checked ? 'bg-[#7bd500]' : 'bg-slate-300'
        }`}
      >
        <span
          className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { settings, updateSettingsAction, loadSampleTasks, clearAllTasks, addToast } =
    useAppStore();

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    NotificationService.getPermission()
  );
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const handleRequestNotif = async () => {
    const res = await NotificationService.requestPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      NotificationService.notify('Уведомления включены', {
        body: 'TimeManager пришлёт напоминания о задачах.',
      });
      addToast('Уведомления включены', 'success');
    } else {
      addToast('Уведомления отклонены в настройках браузера', 'warning');
    }
  };

  const handleTestSound = () => {
    soundManager.playNotificationSound();
    addToast('Звуковой сигнал проверен', 'info');
  };

  const weekDays = [
    { day: 1, label: 'Пн' },
    { day: 2, label: 'Вт' },
    { day: 3, label: 'Ср' },
    { day: 4, label: 'Чт' },
    { day: 5, label: 'Пт' },
    { day: 6, label: 'Сб' },
    { day: 0, label: 'Вс' },
  ];

  const toggleWorkDay = (dayIndex: number) => {
    let updated: number[];
    if (settings.workDays.includes(dayIndex)) {
      if (settings.workDays.length === 1) return;
      updated = settings.workDays.filter((d) => d !== dayIndex);
    } else {
      updated = [...settings.workDays, dayIndex].sort();
    }
    updateSettingsAction({ workDays: updated });
  };

  const showDuration = settings.showDuration !== false;
  const compactCards = Boolean(settings.compactCards);
  const showStages = settings.showStages !== false;
  const financeEnabled = settings.financeEnabled !== false;
  const currency = settings.currency || '₽';
  const hideMobileScrollbar = settings.hideMobileScrollbar !== false;

  return (
    <div className="space-y-4 w-full max-w-xl mx-auto">
      <div className="px-1">
        <h2 className="text-base font-bold text-slate-900">Настройки</h2>
      </div>

      {/* 1. Finance Module */}
      <section className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Wallet className="w-4 h-4 text-[#7bd500]" />
          <span>Модуль «Финансы»</span>
        </div>

        <ToggleRow
          title="Вкладка «Финансы» в меню"
          subtitle="Управление доходами, расходами и учёт сделок при закрытии задач"
          checked={financeEnabled}
          onToggle={() => updateSettingsAction({ financeEnabled: !financeEnabled })}
        />

        {financeEnabled && (
          <div className="py-3.5 px-4 sm:px-5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800">Валюта расчётов</span>
              <div className="flex items-center gap-1">
                {['₽', '$', '€', '₸', 'Br'].map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => updateSettingsAction({ currency: curr })}
                    className={`min-w-[36px] min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      currency === curr
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Сумма сделки из карточки задачи автоматически попадает в доходы при завершении.
            </p>
          </div>
        )}
      </section>

      {/* 2. Display Customizations */}
      <section className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Layout className="w-4 h-4 text-emerald-600" />
          <span>Отображение задач</span>
        </div>

        <ToggleRow
          title="Компактные карточки"
          subtitle="Уменьшенные отступы - больше задач помещается на экране"
          checked={compactCards}
          onToggle={() => updateSettingsAction({ compactCards: !compactCards })}
        />

        <ToggleRow
          title="Показывать длительность"
          subtitle="Отображение времени выполнения на карточке задачи"
          checked={showDuration}
          onToggle={() => updateSettingsAction({ showDuration: !showDuration })}
        />

        <ToggleRow
          title="Показывать стадию плана"
          subtitle="Кнопка быстрого переключения стадии справа на карточке"
          checked={showStages}
          onToggle={() => updateSettingsAction({ showStages: !showStages })}
        />

        <ToggleRow
          title="Скрыть ползунок на телефоне"
          subtitle="На сенсорном экране прокрутка выполняется пальцем без скроллбара"
          checked={hideMobileScrollbar}
          onToggle={() => updateSettingsAction({ hideMobileScrollbar: !hideMobileScrollbar })}
        />
      </section>

      {/* 3. Working Hours & Days */}
      <section className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Clock className="w-4 h-4 text-[#7bd500]" />
          <span>Рабочее время и дни</span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Начало дня
              </label>
              <input
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => updateSettingsAction({ workingHoursStart: e.target.value })}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold tabular-nums focus:outline-none focus:border-[#7bd500]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Конец дня</label>
              <input
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) => updateSettingsAction({ workingHoursEnd: e.target.value })}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold tabular-nums focus:outline-none focus:border-[#7bd500]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              Рабочие дни
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map(({ day, label }) => {
                const active = settings.workDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkDay(day)}
                    className={`min-h-[44px] py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#7bd500] border-[#7bd500] text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 4. Notifications & Sound */}
      <section className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Bell className="w-4 h-4 text-[#ff5b7f]" />
          <span>Звук и напоминания</span>
        </div>

        <div className="flex items-center justify-between gap-3 py-3.5 px-4 sm:px-5">
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-800">
              Уведомления браузера
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {notifPermission === 'granted' ? 'Активны' : 'Не включены'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRequestNotif}
            className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              notifPermission === 'granted'
                ? 'bg-[#7bd500] text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            {notifPermission === 'granted' ? 'Проверить' : 'Включить'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 py-3.5 px-4 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className="w-4 h-4 text-[#7bd500] flex-shrink-0" />
            <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
              Звуковой сигнал
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleTestSound}
              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100"
            >
              Тест
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={settings.soundEnabled}
              onClick={() => updateSettingsAction({ soundEnabled: !settings.soundEnabled })}
              className="min-h-[44px] min-w-[44px] flex items-center justify-end cursor-pointer"
            >
              <span
                className={`w-11 h-6 rounded-full transition-colors relative block ${
                  settings.soundEnabled ? 'bg-[#7bd500]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.soundEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. Quick Data Actions */}
      <section className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>Данные</span>
        </div>

        <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={loadSampleTasks}
            className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ListPlus className="w-4 h-4 text-[#7bd500]" />
            <span>Примеры задач</span>
          </button>

          {confirmClearAll ? (
            <div className="flex-1 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="min-h-[44px] px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearAllTasks();
                  setConfirmClearAll(false);
                }}
                className="flex-1 min-h-[44px] px-3 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer whitespace-nowrap"
              >
                Удалить все
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              <span>Очистить всё</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
