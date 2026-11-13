import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-2.5 p-3 rounded-2xl border shadow-lg backdrop-blur-md transition-all animate-in slide-in-from-top-2 duration-150 ${
              isSuccess
                ? 'bg-white border-[#7bd500]/60 text-slate-800'
                : isWarning
                ? 'bg-white border-red-300 text-slate-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#7bd500] flex-shrink-0" />}
              {isWarning && <AlertTriangle className="w-4 h-4 text-[#ef4444] flex-shrink-0" />}
              {!isSuccess && !isWarning && <Info className="w-4 h-4 text-[#0284c7] flex-shrink-0" />}
              <span className="text-xs font-semibold leading-tight truncate">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
