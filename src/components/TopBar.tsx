import React from 'react';
import { Wifi, Volume2, Battery, Search, Monitor, Terminal, FileCode, CheckCircle2 } from 'lucide-react';

interface TopBarProps {
  currentView: 'desktop' | 'serial' | 'source' | 'verification';
  onViewChange: (view: 'desktop' | 'serial' | 'source' | 'verification') => void;
  currentTimeString: string;
}

export const TopBar: React.FC<TopBarProps> = ({ currentView, onViewChange, currentTimeString }) => {
  return (
    <header className="h-[36px] w-full px-5 flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-white/40 shadow-xs z-50 text-slate-800 text-[13px] font-sans font-medium select-none">
      {/* Left: NSK OS Logo + Brand */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
          {/* Custom NSK geometric logo - dual orbital rings */}
          <div className="w-[18px] h-[18px] rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-xs">
            <div className="w-[8px] h-[8px] rounded-full bg-white/90"></div>
          </div>
          <span className="font-bold tracking-tight text-[14px] text-slate-900">NSK OS</span>
        </div>

        {/* View Switcher Tabs in Topbar */}
        <div className="hidden md:flex items-center ml-4 pl-3 border-l border-slate-300/60 gap-1">
          <button
            onClick={() => onViewChange('desktop')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'desktop'
                ? 'bg-blue-500/15 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop GUI</span>
          </button>

          <button
            onClick={() => onViewChange('serial')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'serial'
                ? 'bg-blue-500/15 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>QEMU COM1 Boot</span>
          </button>

          <button
            onClick={() => onViewChange('source')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'source'
                ? 'bg-blue-500/15 text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Kernel C/ASM Code</span>
          </button>

          <button
            onClick={() => onViewChange('verification')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              currentView === 'verification'
                ? 'bg-emerald-500/15 text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Phase 1 Verification</span>
          </button>
        </div>
      </div>

      {/* Center: Live Date and Time */}
      <div className="absolute left-1/2 -translate-x-1/2 text-slate-800 text-[13px] tracking-wide font-normal pointer-events-none">
        {currentTimeString}
      </div>

      {/* Right: System Tray Icons matching mockup exactly */}
      <div className="flex items-center gap-4 text-slate-700">
        <button className="hover:opacity-75 transition-opacity" title="Display: 1536x1024">
          <Monitor className="w-4 h-4" />
        </button>
        <button className="hover:opacity-75 transition-opacity" title="Wi-Fi: Connected (Host Bridge)">
          <Wifi className="w-4 h-4" />
        </button>
        <button className="hover:opacity-75 transition-opacity" title="Volume: 100%">
          <Volume2 className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium cursor-default">
          <Battery className="w-4 h-4 text-slate-700" />
          <span>85%</span>
        </div>
        <button className="hover:opacity-75 transition-opacity ml-1" title="Spotlight Search">
          <Search className="w-4 h-4 text-slate-700" />
        </button>
      </div>
    </header>
  );
};
