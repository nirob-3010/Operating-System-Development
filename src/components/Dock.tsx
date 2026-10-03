import React from 'react';
import { Terminal, Trash2 } from 'lucide-react';

// The 8 app icons are the original artwork (assets/dock_icons/*.jpeg) with only the white backdrop cut to
// transparency and size/padding normalised - see tools/gen_dock_icons.py. They are never recoloured.
import filesIcon from '../assets/dock-icons/files.png';
import browserIcon from '../assets/dock-icons/browser.png';
import photosIcon from '../assets/dock-icons/photos.png';
import calendarIcon from '../assets/dock-icons/calendar.png';
import notesIcon from '../assets/dock-icons/notes.png';
import clockIcon from '../assets/dock-icons/clock.png';
import calculatorIcon from '../assets/dock-icons/calculator.png';
import settingsIcon from '../assets/dock-icons/settings.png';

interface DockProps {
  onOpenApp: (appName: string) => void;
  openApps: Record<string, boolean>;
}

interface DockApp {
  id: string;
  name: string;
  isRunning: boolean;
  renderIcon: () => React.ReactNode;
}

export const Dock: React.FC<DockProps> = ({ onOpenApp, openApps }) => {
  const imageIcon = (src: string, alt: string) => () => (
    <img src={src} alt={alt} draggable={false} className="w-14 h-14 select-none" />
  );

  const dockApps: DockApp[] = [
    { id: 'files',      name: 'File Manager', isRunning: openApps.files || false,    renderIcon: imageIcon(filesIcon, 'File Manager') },
    { id: 'browser',    name: 'Browser',      isRunning: false,                       renderIcon: imageIcon(browserIcon, 'Browser') },
    { id: 'photos',     name: 'Photos',       isRunning: openApps.photos || false,   renderIcon: imageIcon(photosIcon, 'Photos') },
    { id: 'calendar',   name: 'Calendar',     isRunning: false,                       renderIcon: imageIcon(calendarIcon, 'Calendar') },
    { id: 'notes',      name: 'Notes',        isRunning: false,                       renderIcon: imageIcon(notesIcon, 'Notes') },
    { id: 'clock',      name: 'Clock',        isRunning: false,                       renderIcon: imageIcon(clockIcon, 'Clock') },
    { id: 'calculator', name: 'Calculator',   isRunning: false,                       renderIcon: imageIcon(calculatorIcon, 'Calculator') },
    { id: 'settings',   name: 'Settings',     isRunning: openApps.settings || false, renderIcon: imageIcon(settingsIcon, 'Settings') }
  ];

  // Existing items that are not part of the 8 app icons stay to the right of a separator
  const extraApps: DockApp[] = [
    {
      id: 'terminal',
      name: 'Terminal',
      isRunning: openApps.terminal || false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-[13px] bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-md flex items-center justify-center text-white">
          <Terminal className="w-6 h-6 stroke-[2]" />
        </div>
      )
    },
    {
      id: 'trash',
      name: 'Trash',
      isRunning: false,
      renderIcon: () => (
        <div className="w-12 h-12 rounded-[13px] bg-white/70 backdrop-blur-md border border-white/80 shadow-md flex items-center justify-center text-slate-500">
          <Trash2 className="w-6 h-6 stroke-[1.8]" />
        </div>
      )
    }
  ];

  const renderItem = (app: DockApp) => (
    <div
      key={app.id}
      onClick={() => onOpenApp(app.id)}
      className="relative flex flex-col items-center cursor-pointer group"
    >
      <div className="w-14 h-14 flex items-center justify-center transform transition-all duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-110">
        {app.renderIcon()}
      </div>

      {/* Running App Indicator Dot */}
      <div className="h-1.5 flex items-center justify-center mt-0.5">
        {app.isRunning && <div className="w-1.5 h-1.5 rounded-full bg-slate-800 shadow-xs" />}
      </div>

      {/* Tooltip */}
      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800/90 text-white text-[11px] font-medium py-1 px-2.5 rounded-md backdrop-blur-xs whitespace-nowrap shadow-md pointer-events-none">
        {app.name}
      </div>
    </div>
  );

  return (
    <div
      style={{
        left: '402px',
        top: '920px',
        width: '732px',
        height: '83px'
      }}
      className="absolute bg-white/65 backdrop-blur-2xl border border-white/70 shadow-2xl rounded-[28px] px-6 flex items-center justify-center gap-2 select-none z-40 transition-all hover:bg-white/75"
    >
      {dockApps.map(renderItem)}

      <div className="w-px h-9 bg-slate-500/25 mx-2 self-center -mt-1.5" />

      {extraApps.map(renderItem)}
    </div>
  );
};
