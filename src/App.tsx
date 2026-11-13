import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { AppLayout } from './components/layout/AppLayout';
import { TodayPage } from './pages/TodayPage';
import { InboxPage } from './pages/InboxPage';
import { CalendarPage } from './pages/CalendarPage';
import { CompletedPage } from './pages/CompletedPage';
import { SettingsPage } from './pages/SettingsPage';
import { FinancePage } from './pages/FinancePage';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { currentTab, isLoaded, init } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#f3f6f8] flex flex-col items-center justify-center text-slate-600 gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[#7bd500]">
          <Clock className="w-5 h-5 animate-spin" />
        </div>
        <div className="text-xs font-semibold tracking-wide text-slate-500">
          Загрузка задач...
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 28,
            mass: 0.8,
          }}
          className="w-full"
        >
          {currentTab === 'today' && <TodayPage />}
          {currentTab === 'inbox' && <InboxPage />}
          {currentTab === 'calendar' && <CalendarPage />}
          {currentTab === 'finance' && <FinancePage />}
          {currentTab === 'completed' && <CompletedPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </motion.div>
      </AnimatePresence>
    </AppLayout>
  );
}
