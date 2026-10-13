import React from 'react';
import { Wifi, Battery, Signal, ArrowLeft, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTitle?: string;
  onBack?: () => void;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeTitle = 'NoteCircle',
  onBack
}) => {
  const { toggleAndroidPreview } = useAuth();
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="py-6 px-4 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-[#FAF8F5]/50 dark:bg-black/30">
      
      {/* Top Banner explaining Android Preview Mode */}
      <div className="mb-4 flex items-center gap-3 bg-white/95 dark:bg-[#181C1A]/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-xs text-xs text-[#58635C] dark:text-[#9DAAA0]">
        <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>
          <strong className="text-[#191D1A] dark:text-[#F5F7F5]">Android Companion Mode</strong>: Simulating Pixel 8 Pro viewport (390×844px) & native mobile ergonomics.
        </span>
        <button
          onClick={toggleAndroidPreview}
          className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline ml-2 cursor-pointer"
        >
          Exit to Fullscreen
        </button>
      </div>

      {/* Android Device Shell */}
      <div className="w-[390px] h-[820px] bg-white dark:bg-[#181C1A] rounded-[44px] shadow-2xl border-[10px] border-[#191D1A] dark:border-[#222724] flex flex-col overflow-hidden relative ring-1 ring-black/10">
        
        {/* Android Punch Hole Camera */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-50 pointer-events-none" />

        {/* Android Status Bar */}
        <div className="h-8 bg-[#FAF8F5] dark:bg-[#151917] border-b border-black/[0.04] dark:border-white/[0.06] px-6 flex items-center justify-between text-[11px] font-semibold text-[#191D1A] dark:text-[#F5F7F5] select-none shrink-0 z-40">
          <span>{currentTime}</span>
          <div className="flex items-center gap-1.5 text-[#8A968F]">
            <Signal className="w-3 h-3" />
            <Wifi className="w-3 h-3" />
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Android App Bar */}
        <div className="h-12 bg-white dark:bg-[#181C1A] border-b border-black/[0.04] dark:border-white/[0.06] px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="p-1 -ml-1 text-[#58635C] dark:text-[#9DAAA0] hover:text-[#191D1A] dark:hover:text-white cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <span className="text-sm font-bold font-display text-[#191D1A] dark:text-[#F5F7F5]">{activeTitle}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
              Android Native
            </span>
          </div>
        </div>

        {/* Scrollable Screen Content */}
        <div className="flex-1 overflow-y-auto bg-[#FAF8F5] dark:bg-[#111413]">
          {children}
        </div>

        {/* Android Bottom Gesture Navigation Bar */}
        <div className="h-5 bg-white dark:bg-[#181C1A] flex items-center justify-center shrink-0 border-t border-black/[0.04] dark:border-white/[0.06]">
          <div className="w-28 h-1 bg-[#8A968F]/40 rounded-full" />
        </div>
      </div>
    </div>
  );
};
