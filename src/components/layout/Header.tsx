import React from 'react';
import { PWAInstallButton } from '../common/PWAInstallButton';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="h-full px-4 sm:px-6 max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-amber-300 bg-amber-100"
            title="TimeManager"
          >
            <svg
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <circle cx="50" cy="50" r="50" fill="#fef3c7" />
              <path d="M10 100 C15 74, 30 68, 50 70 C70 68, 85 74, 90 100 Z" fill="#0f172a" />
              <polygon points="50,68 38,60 46,78 50,73" fill="#ffffff" />
              <polygon points="50,68 62,60 54,78 50,73" fill="#f8fafc" />
              <polygon points="48,70 52,70 54,98 50,100 46,98" fill="#ef4444" />
              <rect x="44" y="52" width="12" height="15" rx="2" fill="#fed7aa" />
              <path
                d="M32 40 C32 28, 68 28, 68 40 C68 56, 58 64, 50 64 C42 64, 32 56, 32 40 Z"
                fill="#fdba74"
              />
              <path
                d="M30 38 C28 26, 35 15, 50 15 C65 15, 72 26, 70 38 C68 31, 64 24, 52 23 C40 24, 33 30, 30 38 Z"
                fill="#713f12"
              />
              <path d="M37 36 Q43 33 46 36" stroke="#451a03" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M54 36 Q57 33 63 36" stroke="#451a03" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="42" cy="40" r="2.2" fill="#1e3a8a" />
              <circle cx="58" cy="40" r="2.2" fill="#1e3a8a" />
              <circle cx="42.6" cy="39.4" r="0.7" fill="#ffffff" />
              <circle cx="58.6" cy="39.4" r="0.7" fill="#ffffff" />
              <path
                d="M50 39 L49 48 L52 48"
                stroke="#ea580c"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M43 53 Q50 59 57 53"
                stroke="#991b1b"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="#ffffff"
              />
              <circle cx="50" cy="50" r="48" stroke="#f59e0b" strokeWidth="2.5" />
            </svg>
          </div>

          <span className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight whitespace-nowrap select-none">
            TimeManager
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
