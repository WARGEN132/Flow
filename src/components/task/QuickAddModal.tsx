import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { QuickAddBar } from './QuickAddBar';
import { ModalSheet } from '../common/ModalSheet';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setQuickAddOpen } = useAppStore();

  return (
    <ModalSheet
      isOpen={isQuickAddOpen}
      onClose={() => setQuickAddOpen(false)}
      title="Новая задача"
      maxWidthClass="sm:max-w-lg"
    >
      <QuickAddBar autoFocus onAdded={() => setQuickAddOpen(false)} />
    </ModalSheet>
  );
};
