import React from 'react';
import {
  Folder,
  Globe,
  FolderOpen,
  Image as ImageIcon,
  Music,
  Terminal,
  Settings,
  Trash2
} from 'lucide-react';

interface DockProps {
  onOpenApp: (appName: string) => void;
  openApps: Record<string, boolean>;
}

export const Dock: React.FC<DockProps> = ({ onOpenApp, openApps }) => {
  const dockApps = [
    {
      id: 'files',
      name: 'Files',
      isRunning: openApps.files || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 shadow-md flex items-center justify-center text-white relative">
          <Folder className="w-7 h-7 fill-white/20" />
        </div>
      )
    },
    {
      id: 'browser',
      name: 'Browser',
      isRunning: false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-teal-500 to-blue-600 shadow-md flex items-center justify-center text-white">
          <Globe className="w-7 h-7 stroke-[1.8]" />
        </div>
      )
    },
    {
      id: 'folder',
      name: 'Home',
      isRunning: openApps.files || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-400 to-indigo-600 shadow-md flex items-center justify-center text-white">
          <FolderOpen className="w-7 h-7" />
        </div>
      )
    },
    {
      id: 'photos',
      name: 'Photos',
      isRunning: openApps.photos || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center relative overflow-hidden">
          <div className="grid grid-cols-2 gap-0.5 p-2">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-sky-500"></div>
          </div>
        </div>
      )
    },
    {
      id: 'music',
      name: 'Music',
      isRunning: openApps.music || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 shadow-md flex items-center justify-center text-white">
          <Music className="w-7 h-7 stroke-[2]" />
        </div>
      )
    },
    {
      id: 'terminal',
      name: 'Terminal',
      isRunning: openApps.terminal || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-md flex items-center justify-center text-white font-mono font-bold text-base">
          <span>&gt;_</span>
        </div>
      )
    },
    {
      id: 'settings',
      name: 'Settings',
      isRunning: openApps.settings || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-400 border border-white/60 shadow-md flex items-center justify-center text-slate-700">
          <Settings className="w-7 h-7 stroke-[1.8]" />
        </div>
      )
    },
    {
      id: 'trash',
      name: 'Trash',
      isRunning: false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-center text-sky-600">
          <Trash2 className="w-6 h-6 stroke-[1.8]" />
        </div>
      )
    }
  ];

  return (
    <div
      style={{
        left: '402px',
        top: '920px',
        width: '732px',
        height: '83px'
      }}
      className="absolute bg-white/65 backdrop-blur-2xl border border-white/70 shadow-2xl rounded-[28px] px-6 flex items-center justify-between select-none z-40 transition-all hover:bg-white/75"
    >
      {dockApps.map((app) => (
        <div
          key={app.id}
          onClick={() => onOpenApp(app.id)}
          className="relative flex flex-col items-center cursor-pointer group"
        >
          <div className="transform transition-all duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-115">
            {app.renderIcon()}
          </div>

          {/* Running App Indicator Dot */}
          <div className="h-1.5 flex items-center justify-center mt-1">
            {app.isRunning && (
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-xs" />
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/90 text-white text-[11px] font-medium py-1 px-2.5 rounded-md backdrop-blur-xs whitespace-nowrap shadow-md pointer-events-none">
            {app.name}
          </div>
        </div>
      ))}
    </div>
  );
};
