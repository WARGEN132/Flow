import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, Smartphone } from 'lucide-react';
import { ModalSheet } from './ModalSheet';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
        title="Установить приложение"
      >
        <Download className="w-3.5 h-3.5 text-[#7bd500]" />
        <span>Установить</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#7bd500]" />
          <span>На экран</span>
        </button>

        <ModalSheet
          isOpen={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Установка на iPhone"
          maxWidthClass="sm:max-w-sm"
        >
          <div className="space-y-3 text-sm text-slate-600">
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center font-bold text-xs tabular-nums">
                1
              </span>
              <span>Нажмите «Поделиться» в нижней панели Safari.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center font-bold text-xs tabular-nums">
                2
              </span>
              <span>Прокрутите вниз и выберите «На экран Домой».</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="mt-5 w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Понятно
          </button>
        </ModalSheet>
      </>
    );
  }

  return null;
};
