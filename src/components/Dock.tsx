import React from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import filesIcon from '../assets/dock-icons/files.png';
import browserIcon from '../assets/dock-icons/browser.png';
import photosIcon from '../assets/dock-icons/photos.png';
import calendarIcon from '../assets/dock-icons/calendar.png';
import notesIcon from '../assets/dock-icons/notes.png';
import clockIcon from '../assets/dock-icons/clock.png';
import calculatorIcon from '../assets/dock-icons/calculator.png';
import settingsIcon from '../assets/dock-icons/settings.png';

interface DockProps {
  onDockClick: (appId: string) => void;
  openApps: Record<string, boolean>;
  minimizedApps: Record<string, boolean>;
  activeAppId: string | null;
}

interface DockItem {
  id: string;
  name: string;
  renderIcon: () => React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({
  onDockClick,
  openApps,
  activeAppId,
}) => {
  const imageIcon = (src: string, alt: string) => () => (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className="w-13 h-13 object-contain select-none filter drop-shadow-sm transition-transform duration-200"
    />
  );

  // Strictly in the order requested by user:
  // File Manager, Browser, Photos, Calendar, Notes, Clock, Calculator, Settings, Terminal, Trash
  const dockApps: DockItem[] = [
    { id: 'files',      name: 'File Manager', renderIcon: imageIcon(filesIcon, 'File Manager') },
    { id: 'browser',    name: 'Browser',      renderIcon: imageIcon(browserIcon, 'Browser') },
    { id: 'photos',     name: 'Photos',       renderIcon: imageIcon(photosIcon, 'Photos') },
    { id: 'calendar',   name: 'Calendar',     renderIcon: imageIcon(calendarIcon, 'Calendar') },
    { id: 'notes',      name: 'Notes',        renderIcon: imageIcon(notesIcon, 'Notes') },
    { id: 'clock',      name: 'Clock',        renderIcon: imageIcon(clockIcon, 'Clock') },
    { id: 'calculator', name: 'Calculator',   renderIcon: imageIcon(calculatorIcon, 'Calculator') },
    { id: 'settings',   name: 'Settings',     renderIcon: imageIcon(settingsIcon, 'Settings') },
    {
      id: 'terminal',
      name: 'Terminal',
      renderIcon: () => (
        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/80 shadow-md flex items-center justify-center text-white">
          <Terminal className="w-6 h-6 stroke-[2]" />
        </div>
      ),
    },
    {
      id: 'trash',
      name: 'Trash',
      renderIcon: () => (
        <div className="w-12 h-12 rounded-[14px] bg-white/80 backdrop-blur-md border border-white/90 shadow-md flex items-center justify-center text-slate-600">
          <Trash2 className="w-6 h-6 stroke-[1.8]" />
        </div>
      ),
    },
  ];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 select-none">
      <div className="bg-white/60 hover:bg-white/70 backdrop-blur-2xl border border-white/75 shadow-2xl rounded-[26px] px-3.5 py-2 flex items-end gap-2.5 transition-all duration-300">
        {dockApps.map((app) => {
          const isRunning = openApps[app.id] || false;
          const isActive = activeAppId === app.id;

          return (
            <div
              key={app.id}
              onClick={() => onDockClick(app.id)}
              className="relative flex flex-col items-center cursor-pointer group pb-1"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-150 transform group-hover:-translate-y-1 bg-slate-900/85 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg backdrop-blur-md whitespace-nowrap shadow-lg pointer-events-none z-50">
                {app.name}
              </div>

              {/* Icon Container with smooth hover bounce/lift */}
              <div className="w-12 h-12 sm:w-13 sm:h-13 flex items-center justify-center transform transition-all duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-115">
                {app.renderIcon()}
              </div>

              {/* Running Indicator Dot */}
              <div className="h-1 flex items-center justify-center mt-1">
                {isRunning ? (
                  <div
                    className={`w-1.5 h-1.5 rounded-full shadow-xs transition-all ${
                      isActive ? 'bg-blue-600 scale-120' : 'bg-slate-700/80'
                    }`}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 opacity-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
