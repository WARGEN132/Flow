import React, { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { FloatingAddButton } from './FloatingAddButton';
import { QuickAddModal } from '../task/QuickAddModal';
import { TaskEditModal } from '../task/TaskEditModal';
import { ToastContainer } from '../common/ToastContainer';

interface Props {
  children: React.ReactNode;
}

export const AppLayout: React.FC<Props> = ({ children }) => {
  const { settings } = useAppStore();
  const hideMobileScrollbar = settings.hideMobileScrollbar !== false;

  useEffect(() => {
    document.documentElement.classList.toggle('hide-mobile-scrollbar', hideMobileScrollbar);
  }, [hideMobileScrollbar]);

  return (
    <div
      className={`min-h-screen bg-[#f3f6f8] text-slate-900 flex flex-col antialiased ${
        hideMobileScrollbar ? 'hide-mobile-scrollbar' : ''
      }`}
    >
      <Header />

      <main className="flex-1 pb-32 sm:pb-24 pt-4 px-3.5 sm:px-6 md:px-8 w-full max-w-6xl mx-auto">
        {children}
      </main>

      <BottomNav />
      <FloatingAddButton />

      <QuickAddModal />
      <TaskEditModal />
      <ToastContainer />
    </div>
  );
};
