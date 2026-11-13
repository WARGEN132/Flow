import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Plus } from 'lucide-react';
import { motion } from 'motion/react';

export const FloatingAddButton: React.FC = () => {
  const { setQuickAddOpen } = useAppStore();

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 450, damping: 24 }}
      onClick={() => setQuickAddOpen(true)}
      className="fixed right-4 bottom-20 sm:right-6 sm:bottom-20 z-40 w-14 h-14 rounded-2xl bg-[#7bd500] hover:bg-[#6ec200] text-white flex items-center justify-center shadow-lg shadow-[#7bd500]/30 cursor-pointer"
      title="Новая задача"
      aria-label="Новая задача"
    >
      <Plus className="w-7 h-7 stroke-[2.5]" />
    </motion.button>
  );
};
