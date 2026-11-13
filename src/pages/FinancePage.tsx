import React, { useState, useMemo } from 'react';
import { useAppStore, removeEmojis } from '../store/useAppStore';
import { TransactionType } from '../types';
import { ModalSheet } from '../components/common/ModalSheet';
import { formatDateTimeLabel } from '../utils/taskHelpers';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  PieChart,
} from 'lucide-react';
import {
  format,
  isSameDay,
  isSameWeek,
  isSameMonth,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

type PeriodMode = 'day' | 'week' | 'month' | 'all';

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Сделки: '#7bd500',
  Зарплата: '#0ea5e9',
  Проекты: '#14b8a6',
  Инвестиции: '#3b82f6',
  Офис: '#f59e0b',
  Покупки: '#ff5b7f',
  Подписки: '#06b6d4',
  Сервисы: '#10b981',
  Транспорт: '#f97316',
  Прочее: '#94a3b8',
};

const PALETTE = [
  '#7bd500',
  '#0ea5e9',
  '#ff5b7f',
  '#f59e0b',
  '#14b8a6',
  '#3b82f6',
  '#f97316',
  '#06b6d4',
  '#10b981',
];

export const FinancePage: React.FC = () => {
  const { transactions, addTransaction, deleteTransaction, settings } = useAppStore();

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('income');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Сделки');

  const currency = settings.currency || '₽';

  const handlePrevPeriod = () => {
    if (periodMode === 'day') setSelectedDate((d) => subDays(d, 1));
    else if (periodMode === 'week') setSelectedDate((d) => subWeeks(d, 1));
    else if (periodMode === 'month') setSelectedDate((d) => subMonths(d, 1));
  };

  const handleNextPeriod = () => {
    if (periodMode === 'day') setSelectedDate((d) => addDays(d, 1));
    else if (periodMode === 'week') setSelectedDate((d) => addWeeks(d, 1));
    else if (periodMode === 'month') setSelectedDate((d) => addMonths(d, 1));
  };

  const handleResetToToday = () => {
    setSelectedDate(new Date());
  };

  const periodLabel = useMemo(() => {
    if (periodMode === 'all') return 'За всё время';
    if (periodMode === 'day') {
      if (isSameDay(selectedDate, new Date())) {
        return `Сегодня, ${format(selectedDate, 'd MMMM', { locale: ru })}`;
      }
      return format(selectedDate, 'd MMMM yyyy', { locale: ru });
    }
    if (periodMode === 'week') {
      const isCurrentWeek = isSameWeek(selectedDate, new Date(), { weekStartsOn: 1 });
      if (isCurrentWeek) return 'Эта неделя';
      const wStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(wStart, 'd MMM', { locale: ru })} - ${format(wEnd, 'd MMM', { locale: ru })}`;
    }
    if (periodMode === 'month') {
      const mLabel = format(selectedDate, 'LLLL yyyy', { locale: ru });
      return mLabel.charAt(0).toUpperCase() + mLabel.slice(1);
    }
    return '';
  }, [periodMode, selectedDate]);

  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = new Date(t.date);
      if (periodMode === 'day') return isSameDay(txDate, selectedDate);
      if (periodMode === 'week') return isSameWeek(txDate, selectedDate, { weekStartsOn: 1 });
      if (periodMode === 'month') return isSameMonth(txDate, selectedDate);
      return true;
    });
  }, [transactions, periodMode, selectedDate]);

  const totalIncome = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const totalExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; type: TransactionType; count: number }>();

    for (const t of periodTransactions) {
      if (typeFilter !== 'all' && t.type !== typeFilter) continue;
      const cat = t.category || 'Прочее';
      const existing = map.get(cat) || { total: 0, type: t.type, count: 0 };
      existing.total += t.amount;
      existing.count += 1;
      map.set(cat, existing);
    }

    const relevantTotal =
      typeFilter === 'income'
        ? totalIncome
        : typeFilter === 'expense'
        ? totalExpense
        : totalIncome + totalExpense;

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        total: data.total,
        type: data.type,
        count: data.count,
        percent: relevantTotal > 0 ? Math.round((data.total / relevantTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [periodTransactions, typeFilter, totalIncome, totalExpense]);

  const getCatColor = (name: string, index: number) => {
    return CATEGORY_COLOR_MAP[name] || PALETTE[index % PALETTE.length];
  };

  const donutData = useMemo(() => {
    const total = categoryStats.reduce((acc, c) => acc + c.total, 0);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    const slices = categoryStats.map((cat, idx) => {
      const color = getCatColor(cat.name, idx);
      const ratio = total > 0 ? cat.total / total : 0;
      const strokeLength = ratio * circumference;
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        name: cat.name,
        color,
        total: cat.total,
        percent: cat.percent,
        dash: strokeLength,
        gap: circumference - strokeLength,
        offset,
        isSelected: selectedCategory === cat.name,
      };
    });

    return { total, slices };
  }, [categoryStats, selectedCategory]);

  const centerAmount = useMemo(() => {
    if (selectedCategory) {
      const found = categoryStats.find((c) => c.name === selectedCategory);
      return found ? found.total : 0;
    }
    if (typeFilter === 'income') return totalIncome;
    if (typeFilter === 'expense') return totalExpense;
    return totalIncome + totalExpense;
  }, [selectedCategory, categoryStats, typeFilter, totalIncome, totalExpense]);

  const displayTransactions = useMemo(() => {
    return periodTransactions
      .filter((t) => {
        if (typeFilter === 'income' && t.type !== 'income') return false;
        if (typeFilter === 'expense' && t.type !== 'expense') return false;
        if (selectedCategory && t.category !== selectedCategory) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [periodTransactions, typeFilter, selectedCategory]);

  const modalCategories =
    txType === 'income'
      ? ['Сделки', 'Зарплата', 'Проекты', 'Инвестиции', 'Прочее']
      : ['Офис', 'Покупки', 'Подписки', 'Сервисы', 'Транспорт', 'Прочее'];

  const handleOpenAdd = (type: TransactionType) => {
    setTxType(type);
    setTxTitle('');
    setTxAmount('');
    setTxCategory(type === 'income' ? 'Сделки' : 'Покупки');
    setModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount.replace(/\s+/g, '').replace(',', '.'));
    if (!txTitle.trim() || isNaN(amountNum) || amountNum <= 0) return;

    await addTransaction({
      title: txTitle.trim(),
      amount: amountNum,
      type: txType,
      category: txCategory,
      date: new Date().toISOString(),
    });

    setModalOpen(false);
  };

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      {/* 1. Period Switcher */}
      <div className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-2.5">
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-center">
          {(
            [
              { id: 'day', label: 'Дни' },
              { id: 'week', label: 'Недели' },
              { id: 'month', label: 'Месяцы' },
              { id: 'all', label: 'Всё время' },
            ] as const
          ).map((tab) => {
            const isActive = periodMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setPeriodMode(tab.id);
                  setSelectedCategory(null);
                }}
                className={`py-2 px-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {periodMode !== 'all' && (
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Предыдущий период"
              aria-label="Предыдущий период"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResetToToday}
              className="min-h-[40px] px-3 text-xs sm:text-sm font-bold text-slate-800 hover:text-[#15803d] transition-colors cursor-pointer flex items-center gap-1.5 tabular-nums"
              title="Вернуться к текущей дате"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{periodLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleNextPeriod}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Следующий период"
              aria-label="Следующий период"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Income and Expense Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income Card */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex flex-col justify-between gap-3 ${
            typeFilter === 'income'
              ? 'bg-emerald-50/40 border-[#7bd500]'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            onClick={() => {
              setTypeFilter(typeFilter === 'income' ? 'all' : 'income');
              setSelectedCategory(null);
            }}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#15803d]">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#7bd500]" />
                <span>Доходы</span>
              </span>
              {typeFilter === 'income' && (
                <span className="text-[11px] font-semibold text-[#15803d] whitespace-nowrap">
                  выбрано
                </span>
              )}
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold text-[#15803d] tracking-tight tabular-nums">
              +{totalIncome.toLocaleString('ru-RU')}{' '}
              <span className="text-sm font-bold text-emerald-600">{currency}</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleOpenAdd('income')}
            className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#7bd500] hover:bg-[#6ec200] active:bg-[#63af00] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Доход</span>
          </motion.button>
        </div>

        {/* Expense Card */}
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex flex-col justify-between gap-3 ${
            typeFilter === 'expense'
              ? 'bg-rose-50/40 border-[#ff5b7f]'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <div
            onClick={() => {
              setTypeFilter(typeFilter === 'expense' ? 'all' : 'expense');
              setSelectedCategory(null);
            }}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1 text-xs font-bold text-[#e11d48]">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-[#ff5b7f]" />
                <span>Расходы</span>
              </span>
              {typeFilter === 'expense' && (
                <span className="text-[11px] font-semibold text-[#e11d48] whitespace-nowrap">
                  выбрано
                </span>
              )}
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-extrabold text-[#e11d48] tracking-tight tabular-nums">
              -{totalExpense.toLocaleString('ru-RU')}{' '}
              <span className="text-sm font-bold text-rose-500">{currency}</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => handleOpenAdd('expense')}
            className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-[#ff5b7f] hover:bg-[#f2476d] active:bg-[#e0375f] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Расход</span>
          </motion.button>
        </div>
      </div>

      {/* 3. Categories & Donut Chart Breakdown */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <PieChart className="w-3.5 h-3.5 text-slate-400" />
            <span>Категории</span>
          </div>

          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-bold text-[#15803d] hover:underline cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>

        {categoryStats.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 font-medium">
            В этом периоде нет операций
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-1">
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 130 130" className="w-full h-full -rotate-90">
                <circle
                  cx="65"
                  cy="65"
                  r="50"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                />
                {donutData.slices.map((slice) => (
                  <circle
                    key={slice.name}
                    cx="65"
                    cy="65"
                    r="50"
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={slice.isSelected ? '17' : '14'}
                    strokeDasharray={`${slice.dash} ${slice.gap}`}
                    strokeDashoffset={-slice.offset}
                    className="transition-all duration-300 cursor-pointer hover:opacity-85"
                    onClick={() => setSelectedCategory(slice.isSelected ? null : slice.name)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate max-w-[90px]">
                  {selectedCategory ||
                    (typeFilter === 'income'
                      ? 'Доходы'
                      : typeFilter === 'expense'
                      ? 'Расходы'
                      : 'Всего')}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight leading-tight mt-0.5 tabular-nums">
                  {centerAmount.toLocaleString('ru-RU')} {currency}
                </span>
              </div>
            </div>

            {/* Flat Interactive Category Rows (no nested card borders) */}
            <div className="flex-1 w-full divide-y divide-slate-100">
              {categoryStats.map((cat, idx) => {
                const isSelected = selectedCategory === cat.name;
                const isIncome = cat.type === 'income';
                const color = getCatColor(cat.name, idx);

                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                    className={`w-full text-left py-2.5 px-2.5 rounded-xl transition-colors cursor-pointer ${
                      isSelected ? 'bg-slate-100/90' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-bold text-slate-800 truncate">{cat.name}</span>
                        <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                          {cat.percent}%
                        </span>
                      </div>
                      <span
                        className={`font-extrabold ml-2 flex-shrink-0 tabular-nums ${
                          isIncome ? 'text-[#15803d]' : 'text-[#e11d48]'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {cat.total.toLocaleString('ru-RU')} {currency}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(cat.percent, 100)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Type Filter Segmented Control */}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 text-xs font-bold">
        {(['all', 'income', 'expense'] as const).map((m) => {
          const labels = { all: 'Все', income: 'Доходы', expense: 'Расходы' };
          const isActive = typeFilter === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                setTypeFilter(m);
                setSelectedCategory(null);
              }}
              className={`flex-1 py-2 rounded-xl transition-colors cursor-pointer text-center whitespace-nowrap ${
                isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {labels[m]}
            </button>
          );
        })}
      </div>

      {/* 5. Transaction List */}
      {displayTransactions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl bg-white border border-slate-200/80 text-center"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800">
            Нет записей за выбранный период
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Добавьте доход или расход с помощью кнопок выше.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 6, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-[#15803d]' : 'bg-rose-50 text-[#e11d48]'
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp className="w-4 h-4 stroke-[2.4]" />
                      ) : (
                        <TrendingDown className="w-4 h-4 stroke-[2.4]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate leading-snug">
                        {removeEmojis(tx.title)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 whitespace-nowrap truncate">
                        <span>{tx.category}</span>
                        {tx.taskId && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-sky-600 font-semibold">из задачи</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-extrabold tracking-tight tabular-nums whitespace-nowrap ${
                          isIncome ? 'text-[#15803d]' : 'text-[#e11d48]'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {tx.amount.toLocaleString('ru-RU')} {currency}
                      </div>
                      <div className="text-[11px] font-medium text-slate-400 tabular-nums whitespace-nowrap">
                        {formatDateTimeLabel(tx.date)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteTransaction(tx.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Удалить запись"
                      aria-label="Удалить запись"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Transaction ModalSheet */}
      <ModalSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={txType === 'income' ? 'Новый доход' : 'Новый расход'}
        maxWidthClass="sm:max-w-sm"
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Сумма ({currency})
            </label>
            <input
              type="number"
              step="any"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="Например: 25000"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-lg font-extrabold tabular-nums focus:outline-none focus:border-[#7bd500]"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Описание</label>
            <input
              type="text"
              value={txTitle}
              onChange={(e) => setTxTitle(e.target.value)}
              placeholder={
                txType === 'income' ? 'Оплата от клиента, проект...' : 'Подписка, офис...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-[#7bd500]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">Категория</label>
            <div className="flex flex-wrap gap-1.5">
              {modalCategories.map((cat) => {
                const isCatActive = txCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTxCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      isCatActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className={`min-h-[42px] px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer ${
                txType === 'income'
                  ? 'bg-[#7bd500] hover:bg-[#6ec200]'
                  : 'bg-[#ff5b7f] hover:bg-[#f2476d]'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Записать</span>
            </button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};
