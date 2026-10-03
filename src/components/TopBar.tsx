import React from 'react';
import { Wifi, Volume2, Battery, Bluetooth, Search, Monitor, Terminal, FileCode, CheckCircle2 } from 'lucide-react';

interface TopBarProps {
  currentView: 'desktop' | 'serial' | 'source' | 'verification';
  onViewChange: (view: 'desktop' | 'serial' | 'source' | 'verification') => void;
  currentTimeString: string;
  activeApp: string;
}

export const TopBar: React.FC<TopBarProps> = ({currentView,onViewChange,currentTimeString,activeApp}) => {
  const menu = activeApp === 'File Manager'
    ? ['File Manager','Edit','View','Window','Help']
    : activeApp === 'NSK Terminal'
    ? ['NSK Terminal','File','Edit','View','Window','Help']
    : [activeApp,'File','Edit','View','Window','Help'];

  return <header className="h-8 w-full px-3 flex items-center justify-between bg-white/75 backdrop-blur-xl border-b border-white/50 shadow-sm z-50 text-slate-800 text-[12px] font-medium select-none">
    <div className="flex items-center min-w-0">
      <div className="flex items-center gap-1.5 mr-3 font-bold text-[13px] text-slate-900 shrink-0">
        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-white"/></div>
        <span>NSK OS</span>
      </div>
      <div className="hidden sm:flex items-center gap-3 overflow-hidden">
        {menu.map((item,i)=><span key={item} className={i===0?'font-semibold text-slate-900':'text-slate-600 hover:text-slate-900'}>{item}</span>)}
      </div>
      <div className="hidden md:flex items-center ml-4 pl-3 border-l border-slate-300/50 gap-1">
        <button onClick={()=>onViewChange('desktop')} className={`px-1.5 py-0.5 rounded ${currentView==='desktop'?'bg-blue-500/10 text-blue-700':'text-slate-500'}`}><Monitor className="w-3 h-3 inline mr-1"/>Desktop</button>
        <button onClick={()=>onViewChange('serial')} className={`px-1.5 py-0.5 rounded ${currentView==='serial'?'bg-blue-500/10 text-blue-700':'text-slate-500'}`}><Terminal className="w-3 h-3 inline mr-1"/>COM1</button>
        <button onClick={()=>onViewChange('source')} className={`px-1.5 py-0.5 rounded ${currentView==='source'?'bg-blue-500/10 text-blue-700':'text-slate-500'}`}><FileCode className="w-3 h-3 inline mr-1"/>Source</button>
        <button onClick={()=>onViewChange('verification')} className={`px-1.5 py-0.5 rounded ${currentView==='verification'?'bg-emerald-500/10 text-emerald-700':'text-slate-500'}`}><CheckCircle2 className="w-3 h-3 inline mr-1"/>Verify</button>
      </div>
    </div>
    <div className="absolute left-1/2 -translate-x-1/2 text-slate-700 font-normal hidden sm:block">{currentTimeString}</div>
    <div className="flex items-center gap-3 text-slate-600">
      <Wifi className="w-3.5 h-3.5"/><Bluetooth className="w-3.5 h-3.5"/><Volume2 className="w-3.5 h-3.5"/>
      <Battery className="w-4 h-4"/><Search className="w-3.5 h-3.5"/>
    </div>
  </header>;
};
